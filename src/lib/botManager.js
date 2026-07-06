import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import db from "./db.js";

const MESSAGE_QUOTA_PER_BOT = parseInt(process.env.MESSAGE_QUOTA_PER_BOT || "300", 10);
const LIVE_RECIPIENTS_LIMIT = 12;

class BotManager {
  constructor() {
    this.clients = new Map();
    this.status = "idle";
    this.currentBroadcast = null;
    this.recipientCache = new Set();
    this.recipientCacheLoaded = false;
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error("BotManager listener error:", e);
      }
    }
  }

  ensureRecipientCache() {
    if (this.recipientCacheLoaded) return;
    try {
      const rows = db.prepare("SELECT userId FROM recipients").all() || [];
      rows.forEach((r) => this.recipientCache.add(r.userId));
      this.recipientCacheLoaded = true;
    } catch (e) {
      console.error("Failed to load recipient cache:", e);
    }
  }

  recordRecipient(userId) {
    this.recipientCache.add(userId);
    try {
      db.prepare(`
        INSERT INTO recipients (userId, lastSentAt, sentCount)
        VALUES (?, ?, 1)
        ON CONFLICT(userId) DO UPDATE SET
          lastSentAt = EXCLUDED.lastSentAt,
          sentCount = sentCount + 1
      `).run(userId, new Date().toISOString());
    } catch (e) {
      console.error("Failed to record recipient:", e);
    }
  }

  logToDashboard(message, botId = null, isError = false) {
    const logItem = {
      message,
      botId,
      isError,
      timestamp: new Date().toISOString()
    };
    if (isError) {
      console.error(`[BotManager LOG] ${message}`);
    } else {
      console.log(`[BotManager LOG] ${message}`);
    }

    if (this.currentBroadcast) {
      if (!this.currentBroadcast.logs) this.currentBroadcast.logs = [];
      this.currentBroadcast.logs.unshift(logItem);
      if (this.currentBroadcast.logs.length > 100) {
        this.currentBroadcast.logs.pop();
      }
    }

    this.notifyListeners("liveLog", logItem);
  }

  async addBot(token) {
    if (!token) return { success: false, error: "Invalid token" };
    if (this.clients.has(token)) {
      return { success: true, message: "Bot already running" };
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
      ]
    });

    try {
      await client.login(token);

      client.user.setActivity("Requiem Broadcast", {
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/enzo"
      });

      this.clients.set(token, client);
      const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

      db.prepare(`
        INSERT INTO bots (token, username, clientId, inviteLink, status, lastUsed)
        VALUES (?, ?, ?, ?, 'active', ?)
        ON CONFLICT(token) DO UPDATE SET
          username = EXCLUDED.username,
          clientId = EXCLUDED.clientId,
          inviteLink = EXCLUDED.inviteLink,
          status = 'active',
          lastUsed = EXCLUDED.lastUsed
      `).run(token, client.user.username, client.user.id, inviteLink, new Date().toISOString());

      this.logToDashboard(`Bot logged in successfully: ${client.user.username}`);
      return { success: true, username: client.user.username, clientId: client.user.id, inviteLink };
    } catch (error) {
      console.error(`Failed to login bot with token (${token.substring(0, 10)}...):`, error.message);
      db.prepare(`
        INSERT INTO bots (token, status)
        VALUES (?, 'offline')
        ON CONFLICT(token) DO UPDATE SET status = 'offline'
      `).run(token);
      return { success: false, error: error.message };
    }
  }

  async removeBotClient(token) {
    const client = this.clients.get(token);
    if (client) {
      try {
        await client.destroy();
      } catch (e) {}
      this.clients.delete(token);
    }
    db.prepare("DELETE FROM bots WHERE token = ?").run(token);
    this.logToDashboard(`Bot token removed`);
  }

  getActiveBots() {
    return db.prepare("SELECT * FROM bots WHERE status = 'active'").all() || [];
  }

  getAllBots() {
    return db.prepare("SELECT * FROM bots").all() || [];
  }

  async startBroadcast(message, totalTarget = 100, guildId = null, options = {}) {
    if (this.status === "running") {
      throw new Error("Broadcast is already running");
    }

    const bots = this.getActiveBots();
    if (bots.length === 0) {
      throw new Error("No active bots available for broadcasting");
    }

    this.ensureRecipientCache();

    const speedMode = options.speedMode || "safe"; // safe, medium, fast
    const targetType = options.targetType || "all"; // all, online, offline

    this.status = "running";
    this.currentBroadcast = {
      id: Date.now(),
      message,
      totalTarget,
      guildId,
      speedMode,
      targetType,
      startTime: new Date().toISOString(),
      status: "running",
      successCount: 0,
      failCount: 0,
      processedUsers: [],
      liveRecipients: [],
      logs: []
    };

    this.logToDashboard(`Starting broadcast to ${totalTarget} targets (Speed: ${speedMode}, Target: ${targetType})...`);
    this.notifyListeners("broadcastProgress", this.currentBroadcast);

    this.broadcastLoop(guildId).catch((err) => {
      console.error("Error in broadcastLoop:", err);
      this.status = "stopped";
      if (this.currentBroadcast) this.currentBroadcast.status = "stopped";
      this.logToDashboard(`Broadcast failed: ${err.message}`, null, true);
    });

    return this.currentBroadcast;
  }

  async broadcastLoop(guildId) {
    const botsData = this.getActiveBots();
    let processedMembers = new Set(this.currentBroadcast.processedUsers || []);
    let sentCount = this.currentBroadcast.successCount || 0;
    let currentBotIndex = 0;

    let msgDelay = 1500;
    let burstDelay = 6000;
    if (this.currentBroadcast.speedMode === "medium") {
      msgDelay = 800;
      burstDelay = 3000;
    } else if (this.currentBroadcast.speedMode === "fast") {
      msgDelay = 300;
      burstDelay = 1000;
    }

    while (
      this.status === "running" &&
      sentCount < this.currentBroadcast.totalTarget &&
      currentBotIndex < botsData.length
    ) {
      const currentBotData = botsData[currentBotIndex];
      const client = this.clients.get(currentBotData.token);

      if (!client) {
        currentBotIndex++;
        continue;
      }

      this.logToDashboard(
        `Switched to Bot #${currentBotIndex + 1} (${client.user.username})`,
        currentBotData.id
      );

      let membersToMessage = [];
      let fetchSuccess = false;

      while (!fetchSuccess && this.status === "running") {
        try {
          if (guildId) {
            const guild = await client.guilds.fetch(guildId);
            const fetchedMembers = await guild.members.fetch({ withPresences: true }).catch(() => guild.members.cache);
            membersToMessage = Array.from(fetchedMembers.values()).filter(
              (m) =>
                !m.user.bot &&
                !processedMembers.has(m.id) &&
                !this.recipientCache.has(m.id)
            );
          } else {
            const seen = new Set();
            const guilds = client.guilds.cache;
            for (const [, guild] of guilds) {
              const fetchedMembers = await guild.members.fetch({ withPresences: true }).catch(() => guild.members.cache);
              fetchedMembers.forEach((m) => {
                if (
                  !m.user.bot &&
                  !processedMembers.has(m.id) &&
                  !this.recipientCache.has(m.id) &&
                  !seen.has(m.id)
                ) {
                  membersToMessage.push(m);
                  seen.add(m.id);
                }
              });
            }
          }

          // Filter by targetType
          if (this.currentBroadcast.targetType === "online") {
            membersToMessage = membersToMessage.filter(
              (m) => m.presence && m.presence.status !== "offline"
            );
          } else if (this.currentBroadcast.targetType === "offline") {
            membersToMessage = membersToMessage.filter(
              (m) => !m.presence || m.presence.status === "offline"
            );
          }

          fetchSuccess = true;
        } catch (err) {
          if (err.message && err.message.includes("rate limited")) {
            const retryAfter = 10;
            this.logToDashboard(`Rate limited while fetching members. Waiting ${retryAfter}s...`, currentBotData.id, true);
            await new Promise((res) => setTimeout(res, retryAfter * 1000));
          } else {
            this.logToDashboard(`Error fetching members: ${err.message}`, currentBotData.id, true);
            fetchSuccess = true;
          }
        }
      }

      let botSentThisRound = 0;
      let burstCounter = 0;
      let consecutiveFails = 0;

      for (const member of membersToMessage) {
        if (
          this.status !== "running" ||
          sentCount >= this.currentBroadcast.totalTarget ||
          botSentThisRound >= MESSAGE_QUOTA_PER_BOT
        ) {
          break;
        }

        if (processedMembers.has(member.id)) continue;

        try {
          const parsedMessage = this.currentBroadcast.message
            .replace(/{member}/g, `<@${member.id}>`)
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild?.name || "Server");

          await member.send({ content: parsedMessage, allowedMentions: { parse: [] } });

          sentCount++;
          botSentThisRound++;
          burstCounter++;
          consecutiveFails = 0;

          processedMembers.add(member.id);
          this.currentBroadcast.successCount = sentCount;
          this.currentBroadcast.processedUsers.push(member.id);

          this.recordRecipient(member.id);

          const liveEntry = {
            id: member.id,
            tag: member.user.tag,
            botUsername: client.user.username,
            timestamp: new Date().toLocaleTimeString('ar-EG')
          };

          this.currentBroadcast.liveRecipients.unshift(liveEntry);
          if (this.currentBroadcast.liveRecipients.length > LIVE_RECIPIENTS_LIMIT) {
            this.currentBroadcast.liveRecipients.pop();
          }

          try {
            db.prepare("UPDATE bots SET successCount = successCount + 1, lastUsed = ? WHERE token = ?")
              .run(new Date().toISOString(), currentBotData.token);
          } catch (e) {}

          this.notifyListeners("broadcastProgress", this.currentBroadcast);

          if (burstCounter >= 10) {
            await new Promise((res) => setTimeout(res, burstDelay));
            burstCounter = 0;
          } else {
            await new Promise((res) => setTimeout(res, msgDelay));
          }
        } catch (error) {
          consecutiveFails++;
          processedMembers.add(member.id);
          this.currentBroadcast.failCount++;
          this.currentBroadcast.processedUsers.push(member.id);

          try {
            db.prepare("UPDATE bots SET failCount = failCount + 1 WHERE token = ?").run(currentBotData.token);
          } catch (e) {}

          this.logToDashboard(`Failed to DM ${member.user.tag}: ${error.message}`, currentBotData.id, true);
          this.notifyListeners("broadcastProgress", this.currentBroadcast);

          if (
            error.code === 40004 ||
            (error.message && (error.message.includes("flagged") || error.message.includes("anti-spam"))) ||
            consecutiveFails >= 5
          ) {
            db.prepare("UPDATE bots SET status = 'banned' WHERE token = ?").run(currentBotData.token);
            this.logToDashboard(`Bot #${currentBotIndex + 1} flagged/banned. Switching to next bot.`, currentBotData.id, true);
            this.clients.delete(currentBotData.token);
            break;
          }
        }
      }

      if (botSentThisRound >= MESSAGE_QUOTA_PER_BOT) {
        this.logToDashboard(`Bot #${currentBotIndex + 1} reached quota of ${MESSAGE_QUOTA_PER_BOT} messages. Rotating.`, currentBotData.id);
      }

      currentBotIndex++;
    }

    if (sentCount >= this.currentBroadcast.totalTarget) {
      this.status = "completed";
      this.logToDashboard(`✅ Broadcast completed successfully! Sent ${sentCount} messages.`);
    } else if (this.status === "stopped") {
      this.logToDashboard(`🛑 Broadcast stopped manually. Sent ${sentCount} messages.`);
    } else {
      this.status = "finished";
      this.logToDashboard(`⚠️ Broadcast finished. Messaged all available targets (${sentCount} sent).`);
    }

    this.currentBroadcast.status = this.status;
    this.currentBroadcast.endTime = new Date().toISOString();
    this.notifyListeners("broadcastProgress", this.currentBroadcast);
  }

  stopBroadcast() {
    if (this.status === "running") {
      this.status = "stopped";
      if (this.currentBroadcast) {
        this.currentBroadcast.status = "stopped";
      }
      this.logToDashboard("Broadcast manually stopped by administrator.", null, true);
      this.notifyListeners("broadcastProgress", this.currentBroadcast);
    }
  }

  resetStats() {
    try {
      db.prepare("UPDATE bots SET successCount = 0, failCount = 0, messagesSent = 0").run();
      db.prepare("DELETE FROM recipients").run();
      this.recipientCache.clear();
      this.recipientCacheLoaded = false;
      this.currentBroadcast = null;
      this.status = "idle";
      this.logToDashboard("Statistics and recipient cache have been reset.");
      this.notifyListeners("broadcastProgress", null);
      return true;
    } catch (e) {
      console.error("Failed to reset stats:", e);
      throw e;
    }
  }

  checkGuildPresence(guildId) {
    const results = [];
    const bots = this.getAllBots();

    for (const bot of bots) {
      const client = this.clients.get(bot.token);
      let inGuild = false;
      if (client) {
        inGuild = client.guilds.cache.has(guildId);
      }
      results.push({
        botId: bot.id,
        username: bot.username,
        inGuild
      });
    }
    return results;
  }
}

export default new BotManager();
