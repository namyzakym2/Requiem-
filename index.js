import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import SQLiteStore from "better-sqlite3-session-store";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import nblox from "noblox.js";
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
  SlashCommandBuilder,
  AuditLogEvent,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { Canvas, createCanvas, loadImage } from "canvas";
import GIFEncoder from "gif-encoder-2";
import db from "./src/lib/db.js";
import dotenv from "dotenv";
import { config } from "./config.js";
import path from "path";
import { loadCommands } from "./src/lib/commandLoader.js";
import botManager from "./src/lib/botManager.js";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || config.discordToken;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || config.clientId;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || config.clientSecret;
const APP_URL = process.env.APP_URL || config.appUrl;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.geminiApiKey;
const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret;
const OWNER_ID = "1071164421222695042";
const OWNER_USERNAME = "j8rb";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = "#";

const spamMap = new Map();
const raidMap = new Map();
const mafiaGames = new Map();
const activeGames = new Map();
const lastAzkarSent = new Map();
const pendingTransfers = new Map();
const cooldowns = new Map();
const evaluationStates = new Map();

async function logCurrencyTransaction(guildId, userId, amount, reason, type) {
  try {
    const settings = db.prepare("SELECT channelId FROM currency_log_settings WHERE guildId = ?").get(guildId);
    if (!settings?.channelId) return;
    const channel = client.channels.cache.get(settings.channelId);
    if (!channel) return;

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
    const balance = userRow?.xb || 0;

    const embed = new EmbedBuilder()
      .setTitle(`💰 Currency Log: ${type.toUpperCase()}`)
      .setDescription(`User: <@${userId}>\nAmount: **${amount}** XB\nNew Balance: **${balance}** XB\nReason: ${reason}`)
      .setColor(type === "add" ? 5763719 : 15548997)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Failed to log currency transaction:", err);
  }
}

async function logEvent(guildId, eventType, data) {
  try {
    const settings = db.prepare("SELECT * FROM logging_settings WHERE guildId = ?").get(guildId);
    if (!settings) return;

    const columnMap = {
      messageDelete: "messageDeleteChannelId",
      messageUpdate: "messageUpdateChannelId",
      guildMemberAdd: "guildMemberAddChannelId",
      guildMemberRemove: "guildMemberRemoveChannelId",
      roleUpdate: "roleUpdateChannelId",
      channelUpdate: "channelUpdateChannelId",
      voiceStateUpdate: "voiceStateUpdateChannelId",
      interactionCreate: "messageDeleteChannelId"
    };

    const channelId = settings[columnMap[eventType]];
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(data.title)
      .setDescription(data.description)
      .setColor(data.color || 5793266)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

function isCommandAllowed(guildId, commandName, channelId) {
  try {
    const perm = db.prepare("SELECT type FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ?").get(guildId, commandName, channelId);
    if (!perm) {
      const anyAllow = db.prepare("SELECT 1 FROM command_permissions WHERE guildId = ? AND commandName = ? AND type = 'allow'").get(guildId, commandName);
      return !anyAllow;
    }
    return perm.type === "allow";
  } catch (err) {
    console.error("isCommandAllowed error:", err);
    return true;
  }
}

async function addXP(userId, guildId, amount, guild, author, member, channel) {
  try {
    const row = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
    if (!row) {
      db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, ?, 0, 0)").run(userId, guildId, amount);
      return;
    }

    let newXP = row.xp + amount;
    let newLevel = row.level;
    const nextLevelXP = (newLevel + 1) * 300;

    if (newXP >= nextLevelXP) {
      newLevel++;
      newXP -= nextLevelXP;

      db.prepare("UPDATE leveling SET xp = ?, level = ? WHERE userId = ? AND guildId = ?").run(newXP, newLevel, userId, guildId);

      const levelSettings = db.prepare("SELECT * FROM level_settings WHERE guildId = ?").get(guildId);
      if (levelSettings?.status === "off") return;

      const notifyChannel = levelSettings?.channelId ? client.channels.cache.get(levelSettings.channelId) : channel;
      if (notifyChannel) {
        const msg = levelSettings?.message || "🎉 مبروك يا {user}! لقد وصلت إلى المستوى **{level}**!";
        const formattedMsg = msg
          .replace(/{user}/g, `<@${userId}>`)
          .replace(/{level}/g, newLevel)
          .replace(/{xp}/g, newXP);
        await notifyChannel.send(formattedMsg).catch(() => {});
      }
    } else {
      db.prepare("UPDATE leveling SET xp = ? WHERE userId = ? AND guildId = ?").run(newXP, userId, guildId);
    }
  } catch (err) {
    console.error("addXP error:", err);
  }
}

function createBackup(guild) {
  try {
    const channels = guild.channels.cache.map(c => ({
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: c.position
    }));

    const roles = guild.roles.cache.map(r => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      permissions: r.permissions.bitfield.toString(),
      position: r.position
    }));

    const backupData = JSON.stringify({ channels, roles });
    const result = db.prepare("INSERT INTO backups (guildId, data) VALUES (?, ?)").run(guild.id, backupData);
    return result.lastInsertRowid;
  } catch (err) {
    console.error("createBackup error:", err);
    return null;
  }
}

async function restoreBackup(guild, backupId) {
  try {
    const row = db.prepare("SELECT data FROM backups WHERE id = ? AND guildId = ?").get(backupId, guild.id);
    if (!row) return false;

    const data = JSON.parse(row.data);

    for (const channel of guild.channels.cache.values()) {
      await channel.delete().catch(() => {});
    }

    for (const roleData of data.roles) {
      if (roleData.name !== "@everyone") {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist
        }).catch(() => {});
      }
    }

    for (const chanData of data.channels) {
      await guild.channels.create({
        name: chanData.name,
        type: chanData.type
      }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("restoreBackup error:", err);
    return false;
  }
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag || 'Bot'}!`);
  try {
    const { commands, slashCommandsData } = await loadCommands();
    client.commands = commands;

    console.log("Started refreshing application (/) commands.");
    if (client.application) {
      await client.application.commands.set(slashCommandsData);
      console.log(`Successfully reloaded ${slashCommandsData.length} global application (/) commands.`);
    }
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set([]);
        console.log(`Successfully cleared duplicate guild commands for: ${guild.name} (${guild.id})`);
      } catch (err) {
        console.error(`Failed to clear guild commands for ${guild.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error loading commands on ready:", err);
  }
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    const guildId = message.guild.id;

    // Bad words protection
    const badwordsRows = db.prepare("SELECT word FROM badwords WHERE guildId = ?").all(guildId);
    if (badwordsRows && badwordsRows.length > 0) {
      const words = badwordsRows.map(r => r.word.trim().toLowerCase()).filter(Boolean);
      const content = message.content.toLowerCase();
      if (words.some(w => w && content.includes(w))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⚠️ ${message.author}, هذه الكلمة غير مسموح بها!`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
    }

    const prefixSetting = db.prepare("SELECT value FROM settings WHERE key = ?").get(`prefix_${guildId}`);
    const currentPrefix = prefixSetting ? prefixSetting.value : PREFIX;
    const lowerContent = message.content.toLowerCase();
    const lowerPrefix = currentPrefix.toLowerCase();

    if (!lowerContent.startsWith(lowerPrefix)) {
      const xpToAdd = Math.floor(Math.random() * 10) + 5;
      await addXP(message.author.id, guildId, xpToAdd, message.guild, message.author, message.member, message.channel);
      return;
    }

    const args = message.content.slice(lowerPrefix.length).trim().split(/ +/);
    const firstWord = args.shift()?.toLowerCase();

    if (firstWord) {
      const alias = db.prepare("SELECT originalCommand FROM aliases WHERE guildId = ? AND aliasName = ?").get(guildId, firstWord);
      const commandName = alias ? alias.originalCommand : firstWord;

      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) && !isCommandAllowed(guildId, commandName, message.channelId)) {
        return;
      }

      const context = {
        client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
        OWNER_ID, OWNER_USERNAME, PREFIX: currentPrefix, logEvent, logCurrencyTransaction,
        isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
        pendingTransfers, lastAzkarSent, spamMap, raidMap, createBackup, restoreBackup
      };

      const command = client.commands?.get(commandName);
      if (command) {
        try {
          if (typeof command.executeMessage === 'function') {
            await command.executeMessage(message, args, context);
          } else if (typeof command.execute === 'function') {
            await command.execute(message, args, context);
          }
        } catch (err) {
          console.error(`Error executing prefix command ${commandName}:`, err);
          message.reply("❌ حدث خطأ أثناء تنفيذ هذا الأمر.").catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("Error in messageCreate handler:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    const prefixSetting = interaction.guildId ? db.prepare("SELECT value FROM settings WHERE key = ?").get(`prefix_${interaction.guildId}`) : null;
    const currentPrefix = prefixSetting ? prefixSetting.value : PREFIX;

    const context = {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX: currentPrefix, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap, createBackup, restoreBackup
    };

    if (interaction.isChatInputCommand()) {
      let { commandName, user, guildId, guild, channel } = interaction;
      if (!guild) return;

      const alias = db.prepare("SELECT originalCommand FROM aliases WHERE guildId = ? AND aliasName = ?").get(guildId, commandName);
      if (alias) {
        commandName = alias.originalCommand;
      }

      const isAuthorized = user.id === OWNER_ID || user.username === OWNER_USERNAME;
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !isAuthorized && !isCommandAllowed(guildId, commandName, interaction.channelId)) {
        return;
      }

      if (guildId) {
        logEvent(guildId, "interactionCreate", {
          title: "⌨️ Command Used",
          description: `**User:** <@${user.id}> (${user.tag})\n**Command:** \`/${commandName}\`\n**Channel:** <#${interaction.channelId}>`,
          color: 5793266
        });
      }

      const command = client.commands?.get(commandName);
      if (command) {
        try {
          if (typeof command.executeInteraction === 'function') {
            await command.executeInteraction(interaction, context);
          } else if (typeof command.execute === 'function') {
            await command.execute(interaction, context);
          }
        } catch (err) {
          console.error(`Error executing slash command ${commandName}:`, err);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "❌ حدث خطأ أثناء تنفيذ هذا الأمر.", ephemeral: true }).catch(() => {});
          } else {
            await interaction.reply({ content: "❌ حدث خطأ أثناء تنفيذ هذا الأمر.", ephemeral: true }).catch(() => {});
          }
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const { customId, user, guildId } = interaction;
      if (customId === "bc_subscribe_btn") {
        const COST = 10000000;
        const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        const balance = userRow?.xb || 0;
        if (balance < COST) {
          return interaction.reply({ content: `❌ رصيدك غير كافٍ. التكلفة: **10,000,000 XB**. رصيدك الحالي: **${balance.toLocaleString('ar-EG')} XB**.`, ephemeral: true });
        }
        db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(COST, user.id, guildId);
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare("INSERT OR REPLACE INTO broadcast_subscriptions (userId, expiresAt) VALUES (?, ?)").run(user.id, expires);
        return interaction.reply({ content: "🎉 تم الاشتراك بنجاح في خدمة البرودكاست والمالتي كاست لمدة 30 يوماً!", ephemeral: true });
      }

      if (customId === "bc_addbot_btn") {
        return interaction.reply({ content: "ℹ️ لإضافة بوت، استخدم الأمر: `/bc-control addbot name:<الاسم> webhook:<الرابط>` أو `bc addbot <الاسم> <الرابط>`", ephemeral: true });
      }

      if (customId === "bc_send_online_btn") {
        await interaction.deferReply({ ephemeral: true });
        const settings = db.prepare("SELECT message FROM broadcast_settings WHERE guildId = ?").get(guildId);
        const msg = settings?.message || "مرحباً {user}!";
        const members = await interaction.guild.members.fetch({ withPresences: true }).catch(() => interaction.guild.members.cache);
        const onlineMembers = members.filter(m => !m.user.bot && (m.presence?.status === 'online' || m.presence?.status === 'dnd' || m.presence?.status === 'idle'));
        let sent = 0;
        for (const [id, member] of onlineMembers) {
          const text = msg.replace(/{user}/g, `<@${member.id}>`);
          await member.send(text).then(() => sent++).catch(() => {});
          await new Promise(r => setTimeout(r, 800));
        }
        return interaction.editReply(`✅ تم إرسال البرودكاست إلى **${sent}** عضواً متصلاً.`);
      }
    }
  } catch (err) {
    console.error("Error in interactionCreate handler:", err);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const bots = db.prepare("SELECT * FROM broadcast_bots WHERE guildId = ?").all(member.guild.id);
    if (bots.length === 0) return;
    const settings = db.prepare("SELECT message FROM broadcast_settings WHERE guildId = ?").get(member.guild.id);
    const messageTemplate = settings?.message || "Hello {user}!";
    const message = messageTemplate.replace(/{user}/g, `<@${member.id}>`);
    
    for (const bot of bots) {
      axios.post(bot.webhookUrl, { content: message }).catch(console.error);
    }
  } catch (err) {
    console.error("Error in guildMemberAdd broadcast:", err);
  }
});

function setupDashboardRoutes(app, context) {
  const {
    client,
    db,
    OWNER_ID,
    OWNER_USERNAME,
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    APP_URL,
    JWT_SECRET,
    GEMINI_API_KEY,
    logEvent,
    logCurrencyTransaction,
    createBackup,
    restoreBackup
  } = context;

  const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET || 'requiem-super-secret-key-2026');
        req.user = decoded;
      } catch (err) {
        // Token invalid or expired
      }
    }
    next();
  });

  app.get("/api/diagnostic", (req, res) => {
    res.json({
      ready: client.isReady(),
      guilds: client.guilds.cache.size,
      user: client.user?.tag || "None",
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasToken: !!DISCORD_TOKEN,
        hasClientId: !!DISCORD_CLIENT_ID,
        hasAppUrl: !!APP_URL
      }
    });
  });

  app.get("/api/status", (req, res) => {
    try {
      res.json({
        status: client.isReady() ? "online" : "starting",
        ready: client.isReady(),
        clientId: DISCORD_CLIENT_ID,
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        uptime: client.uptime || 0,
        tag: client.user?.tag || "Bot Offline"
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  app.get("/api/ping", (req, res) => {
    res.json({ status: "pong", timestamp: Date.now() });
  });

  app.get("/api/guilds/:guildId/roles", async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      
      const roles = guild.roles.cache
        .filter((r) => r.name !== "@everyone" && !r.managed)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ 
          id: r.id, 
          name: r.name, 
          color: r.hexColor,
          position: r.position,
          permissions: r.permissions.toArray()
        }));
      res.json(roles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/guilds/:guildId/roles", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const { name, color, permissions } = req.body;
      const role = await guild.roles.create({
        name: name || "New Role",
        color: color || "#99AAB5",
        permissions: permissions || []
      });
      res.json({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.toArray(),
        managed: role.managed
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.patch("/api/guilds/:guildId/roles/:roleId", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const role = await guild.roles.fetch(req.params.roleId);
      if (!role) return res.status(404).json({ error: "Role not found" });
      const { name, color, permissions } = req.body;
      await role.edit({ name, color, permissions });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/guilds/:guildId/roles/:roleId", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const role = await guild.roles.fetch(req.params.roleId);
      if (!role) return res.status(404).json({ error: "Role not found" });
      await role.delete();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  app.get("/api/stats", (req, res) => {
    try {
      const totalMessages = db.prepare("SELECT COUNT(DISTINCT userId) as count FROM leveling").get();
      const topLevels = db.prepare("SELECT userId, MAX(level) as level, SUM(xp) as xp FROM leveling GROUP BY userId ORDER BY level DESC, xp DESC LIMIT 5").all();
      const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get();
      res.json({
        totalUsers: totalMessages?.count || 0,
        topLevels: topLevels || [],
        openTickets: openTickets?.count || 0
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/guilds/:guildId/stats", (req, res) => {
    try {
      const { guildId } = req.params;
      const totalUsers = db.prepare("SELECT COUNT(DISTINCT userId) as count FROM leveling WHERE guildId = ?").get(guildId);
      const topLevels = db.prepare("SELECT userId, level, xp FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT 5").all(guildId);
      const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guildId = ? AND status = 'open'").get(guildId);
      res.json({
        totalUsers: totalUsers?.count || 0,
        topLevels: topLevels || [],
        openTickets: openTickets?.count || 0
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch guild stats" });
    }
  });

  app.get("/api/guilds", async (req, res) => {
    try {
      if (!client.isReady()) {
        return res.status(503).json({ error: "الصبوت لا يزال قيد التشغيل... يرجى الانتظار", retryAfter: 5 });
      }
      const guilds = await Promise.all(client.guilds.cache.map(async (guild) => {
        let inviteUrl = null;
        try {
          const invites = await guild.invites.fetch();
          const invite = invites.first();
          if (invite) {
            inviteUrl = invite.url;
          } else {
            const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
            if (channel && channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)) {
              const newInvite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
              inviteUrl = newInvite.url;
            }
          }
        } catch (e) {
        }
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL(),
          memberCount: guild.memberCount,
          invite: inviteUrl
        };
      }));
      res.json(guilds);
    } catch (err) {
      console.error("Failed to fetch guilds:", err);
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });

  app.get("/api/guilds/:guildId/channels", async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const channels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).map((c) => ({ id: c.id, name: c.name }));
      res.json(channels);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.get("/api/guilds/:guildId/welcome", (req, res) => {
    try {
      const { guildId } = req.params;
      let welcome = db.prepare("SELECT * FROM welcome_settings WHERE guildId = ?").get(guildId);
      if (!welcome) {
        welcome = { guildId, channelId: null, message: "Welcome {user} to {server}!", imageEnabled: 1, dmEnabled: 0, dmMessage: "Welcome to {server}!" };
        db.prepare("INSERT INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage) VALUES (?, ?, ?, ?, ?, ?)").run(guildId, null, welcome.message, 1, 0, welcome.dmMessage);
      }
      res.json(welcome);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch welcome settings" });
    }
  });

  app.post("/api/guilds/:guildId/welcome", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { channelId, message, imageEnabled, dmEnabled, dmMessage } = req.body;
      db.prepare("INSERT OR REPLACE INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage) VALUES (?, ?, ?, ?, ?, ?)").run(guildId, channelId, message, imageEnabled ? 1 : 0, dmEnabled ? 1 : 0, dmMessage);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update welcome settings" });
    }
  });

  app.get("/api/guilds/:guildId/auto-roles", (req, res) => {
    try {
      const { guildId } = req.params;
      const roles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guildId);
      res.json(roles.map((r) => r.roleId));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch auto-roles" });
    }
  });

  app.post("/api/guilds/:guildId/auto-roles", express.json(), async (req, res) => {
    try {
      const { guildId } = req.params;
      const { roleIds } = req.body;
      db.prepare("DELETE FROM auto_roles WHERE guildId = ?").run(guildId);
      const insert = db.prepare("INSERT INTO auto_roles (guildId, roleId) VALUES (?, ?)");
      for (const roleId of roleIds) {
        insert.run(guildId, roleId);
      }
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        guild.members.fetch().then((members) => {
          members.forEach((member) => {
            for (const roleId of roleIds) {
              if (!member.roles.cache.has(roleId)) {
                member.roles.add(roleId).catch(() => {});
              }
            }
          });
        }).catch((err) => console.error("Failed to fetch members for auto-role update:", err));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update auto-roles" });
    }
  });

  app.get("/api/guilds/:guildId/badwords", (req, res) => {
    try {
      const { guildId } = req.params;
      const words = db.prepare("SELECT word FROM badwords WHERE guildId = ?").all(guildId);
      res.json(words.map((w) => w.word));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch badwords" });
    }
  });

  app.post("/api/guilds/:guildId/badwords", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { words } = req.body;
      db.prepare("DELETE FROM badwords WHERE guildId = ?").run(guildId);
      const insert = db.prepare("INSERT INTO badwords (guildId, word) VALUES (?, ?)");
      for (const word of words) {
        insert.run(guildId, word);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update badwords" });
    }
  });

  app.get("/api/guilds/:guildId/aliases", (req, res) => {
    try {
      const { guildId } = req.params;
      const aliases = db.prepare("SELECT * FROM aliases WHERE guildId = ?").all(guildId);
      res.json(aliases);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch aliases" });
    }
  });

  app.post("/api/guilds/:guildId/aliases", express.json(), async (req, res) => {
    try {
      const { guildId } = req.params;
      const { aliasName, originalCommand } = req.body;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const globalCommands = await client.application?.commands.fetch();
      const original = globalCommands?.find((c) => c.name === originalCommand);
      if (!original) return res.status(400).json({ error: "Original command not found" });
      await guild.commands.create({
        name: aliasName,
        description: `Shortcut for /${originalCommand}`,
        options: original.options
      });
      db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to create alias:", err);
      res.status(500).json({ error: "Failed to create alias" });
    }
  });

  app.delete("/api/guilds/:guildId/aliases/:aliasName", async (req, res) => {
    try {
      const { guildId, aliasName } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const commands = await guild.commands.fetch();
        const cmd = commands.find((c) => c.name === aliasName);
        if (cmd) await cmd.delete();
      }
      db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete alias" });
    }
  });

  app.get("/api/logs", (req, res) => {
    res.json({ logs: [] });
  });

  app.get("/api/guilds/:guildId/protection", (req, res) => {
    const { guildId } = req.params;
    const settings = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guildId) || {
      guildId,
      antiLink: 0,
      antiSpam: 0,
      antiRaid: 0,
      antiBot: 0,
      antiChannelControl: 0,
      logChannel: null
    };
    res.json(settings);
  });

  app.get("/api/guilds/:guildId/whitelisted-bots", (req, res) => {
    const { guildId } = req.params;
    const bots = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ?").all(guildId);
    res.json(bots);
  });

  app.post("/api/guilds/:guildId/whitelisted-bots", (req, res) => {
    const { guildId } = req.params;
    const { botId } = req.body;
    db.prepare("INSERT OR IGNORE INTO whitelisted_bots (guildId, botId) VALUES (?, ?)").run(guildId, botId);
    res.json({ status: "ok" });
  });

  app.delete("/api/guilds/:guildId/whitelisted-bots/:botId", (req, res) => {
    const { guildId, botId } = req.params;
    db.prepare("DELETE FROM whitelisted_bots WHERE guildId = ? AND botId = ?").run(guildId, botId);
    res.json({ status: "ok" });
  });

  app.get("/api/guilds/:guildId/backups", (req, res) => {
    const { guildId } = req.params;
    const backups = db.prepare("SELECT * FROM backups WHERE guildId = ? ORDER BY createdAt DESC").all(guildId);
    res.json(backups);
  });

  app.post("/api/guilds/:guildId/backups", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    try {
      const roles = guild.roles.cache.filter((r) => !r.managed && r.id !== guild.id)
        .sort((a, b) => a.position - b.position)
        .map((r) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          permissions: r.permissions.bitfield.toString(),
          mentionable: r.mentionable,
          position: r.position,
          icon: r.iconURL({ extension: "png" }) || null,
          unicodeEmoji: r.unicodeEmoji || null
        }));
      const channels = guild.channels.cache.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        topic: c.topic || null,
        nsfw: c.nsfw || false,
        position: c.position,
        rateLimitPerUser: c.rateLimitPerUser || 0,
        permissionOverwrites: c.permissionOverwrites?.cache.map((o) => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString()
        })) || []
      }));
      const backupData = JSON.stringify({ roles, channels });
      const name = `Backup ${new Date().toLocaleString("ar-EG")}`;
      db.prepare("INSERT INTO backups (guildId, name, data) VALUES (?, ?, ?)").run(guildId, name, backupData);
      res.json({ success: true });
    } catch (err) {
      console.error("Backup failed:", err);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.post("/api/guilds/:guildId/backups/:id/restore", async (req, res) => {
    const { guildId, id } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    const backup = db.prepare("SELECT * FROM backups WHERE guildId = ? AND id = ?").get(guildId, id);
    if (!backup) return res.status(404).json({ error: "Backup not found" });
    try {
      const data = JSON.parse(backup.data);
      const roleMap = new Map();
      const createdRoles = [];
      const sortedRoles = data.roles.sort((a, b) => a.position - b.position);
      for (const r of sortedRoles) {
        const roleData = {
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          permissions: BigInt(r.permissions),
          mentionable: r.mentionable,
          reason: "Backup Restore"
        };
        if (r.icon) {
          try {
            const response = await axios.get(r.icon, { responseType: "arraybuffer" });
            roleData.icon = Buffer.from(response.data);
          } catch (e) {
            console.error("Failed to restore role icon:", e);
          }
        } else if (r.unicodeEmoji) {
          roleData.unicodeEmoji = r.unicodeEmoji;
        }
        const newRole = await guild.roles.create(roleData).catch(console.error);
        if (newRole) {
          roleMap.set(r.id, newRole.id);
          createdRoles.push(newRole);
        }
      }
      if (createdRoles.length > 0) {
        const positions = createdRoles.map((role, index) => ({
          role: role.id,
          position: index + 1
        }));
        await guild.roles.setPositions(positions).catch(console.error);
      }
      const categoryMap = new Map();
      const categories = data.channels.filter((c) => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
      for (const cat of categories) {
        const newCat = await guild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: cat.permissionOverwrites?.map((o) => ({
            id: roleMap.get(o.id) || o.id,
            type: o.type,
            allow: BigInt(o.allow),
            deny: BigInt(o.deny)
          }))
        }).catch(console.error);
        if (newCat) categoryMap.set(cat.id, newCat.id);
      }
      const others = data.channels.filter((c) => c.type !== ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
      for (const c of others) {
        await guild.channels.create({
          name: c.name,
          type: c.type,
          topic: c.topic,
          nsfw: c.nsfw,
          parent: c.parentId ? categoryMap.get(c.parentId) : null,
          rateLimitPerUser: c.rateLimitPerUser,
          permissionOverwrites: c.permissionOverwrites?.map((o) => ({
            id: roleMap.get(o.id) || o.id,
            type: o.type,
            allow: BigInt(o.allow),
            deny: BigInt(o.deny)
          })),
          reason: "Backup Restore"
        }).catch(console.error);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Restore failed:", err);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  app.delete("/api/guilds/:guildId/backups/:id", (req, res) => {
    const { guildId, id } = req.params;
    db.prepare("DELETE FROM backups WHERE guildId = ? AND id = ?").run(guildId, id);
    res.json({ success: true });
  });

  app.get("/api/guilds/:guildId/logging", (req, res) => {
    const { guildId } = req.params;
    const settings = db.prepare("SELECT * FROM logging_settings WHERE guildId = ?").get(guildId);
    res.json(settings || {
      channelId: null,
      logMessageDelete: 0,
      logMessageEdit: 0,
      logMemberJoin: 0,
      logMemberLeave: 0,
      logRoleUpdate: 0,
      logChannelUpdate: 0,
      logVoiceState: 0,
      logCommandUsage: 0,
      logLevelUp: 0,
      logTicketEvents: 0,
      logProtectionEvents: 0
    });
  });

  app.post("/api/guilds/:guildId/logging", (req, res) => {
    const { guildId } = req.params;
    const {
      channelId,
      logMessageDelete,
      logMessageEdit,
      logMemberJoin,
      logMemberLeave,
      logRoleUpdate,
      logChannelUpdate,
      logVoiceState,
      logCommandUsage,
      logLevelUp,
      logTicketEvents,
      logProtectionEvents
    } = req.body;
    db.prepare(`
      INSERT INTO logging_settings (
        guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
        logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
        logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guildId) DO UPDATE SET 
        channelId = excluded.channelId,
        logMessageDelete = excluded.logMessageDelete,
        logMessageEdit = excluded.logMessageEdit,
        logMemberJoin = excluded.logMemberJoin,
        logMemberLeave = excluded.logMemberLeave,
        logRoleUpdate = excluded.logRoleUpdate,
        logChannelUpdate = excluded.logChannelUpdate,
        logVoiceState = excluded.logVoiceState,
        logCommandUsage = excluded.logCommandUsage,
        logLevelUp = excluded.logLevelUp,
        logTicketEvents = excluded.logTicketEvents,
        logProtectionEvents = excluded.logProtectionEvents
    `).run(
      guildId,
      channelId,
      logMessageDelete,
      logMessageEdit,
      logMemberJoin,
      logMemberLeave,
      logRoleUpdate,
      logChannelUpdate,
      logVoiceState,
      logCommandUsage,
      logLevelUp,
      logTicketEvents,
      logProtectionEvents
    );
    res.json({ status: "ok" });
  });

  app.get("/api/guilds/:guildId/custom-lists", (req, res) => {
    try {
      const { guildId } = req.params;
      const lists = db.prepare("SELECT * FROM custom_lists WHERE guildId = ?").all(guildId);
      res.json(lists.map((l) => ({ ...l, content: JSON.parse(l.content) })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch custom lists" });
    }
  });

  app.get("/api/blox/next-account", (req, res) => {
    const token = req.headers["x-worker-token"];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });
    const account = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();
    if (!account) return res.json({ status: "no_accounts" });
    db.prepare("UPDATE blox_fruits_requests SET status = 'processing' WHERE id = ?").run(account.id);
    res.json(account);
  });

  app.post("/api/blox/update-status", express.json(), (req, res) => {
    const token = req.headers["x-worker-token"];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });
    const { id, currentLevel, money, items, status } = req.body;
    db.prepare("UPDATE blox_fruits_requests SET currentLevel = ?, money = ?, items = ?, status = ?, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?").run(currentLevel, money, JSON.stringify(items), status, id);
    res.json({ success: true });
  });

  app.post("/api/blox/log", express.json(), (req, res) => {
    const token = req.headers["x-worker-token"];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });
    const { requestId, message } = req.body;
    db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(requestId, message);
    res.json({ success: true });
  });

  app.post("/api/guilds/:guildId/custom-lists", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { title, content } = req.body;
      db.prepare("INSERT INTO custom_lists (guildId, title, content) VALUES (?, ?, ?)").run(guildId, title, JSON.stringify(content));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create custom list" });
    }
  });

  app.delete("/api/guilds/:guildId/custom-lists/:id", (req, res) => {
    try {
      const { guildId, id } = req.params;
      db.prepare("DELETE FROM custom_lists WHERE guildId = ? AND id = ?").run(guildId, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete custom list" });
    }
  });

  app.post("/api/guilds/:guildId/protection", (req, res) => {
    const { guildId } = req.params;
    const { antiLink, antiSpam, antiRaid, antiBot, antiChannelControl, antiNuke, nukeLimit, logChannel, counterNuke } = req.body;
    db.prepare(`
      INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid, antiBot, antiChannelControl, antiNuke, nukeLimit, logChannel, counterNuke)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guildId) DO UPDATE SET
        antiLink = excluded.antiLink,
        antiSpam = excluded.antiSpam,
        antiRaid = excluded.antiRaid,
        antiBot = excluded.antiBot,
        antiChannelControl = excluded.antiChannelControl,
        antiNuke = excluded.antiNuke,
        nukeLimit = excluded.nukeLimit,
        logChannel = excluded.logChannel,
        counterNuke = excluded.counterNuke
    `).run(
      guildId,
      antiLink ? 1 : 0,
      antiSpam ? 1 : 0,
      antiRaid ? 1 : 0,
      antiBot ? 1 : 0,
      antiChannelControl ? 1 : 0,
      antiNuke ? 1 : 0,
      nukeLimit || 3,
      logChannel,
      counterNuke ? 1 : 0
    );
    res.json({ success: true });
  });

  app.get("/api/auth/login", (req, res) => {
    let appUrl = APP_URL || `${req.protocol}://${req.get('host')}`;
    const clientId = DISCORD_CLIENT_ID;
    if (!clientId) {
      console.error("Missing DISCORD_CLIENT_ID for auth login.");
      return res.status(500).send("Server configuration error: Missing DISCORD_CLIENT_ID in config.ts or environment variables.");
    }
    appUrl = appUrl.replace(/\/$/, "");
    const REDIRECT_URI = `${appUrl}/api/auth/callback/dashboard`;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    console.log(`Redirecting to Discord login: ${url}`);
    res.redirect(url);
  });

  app.get("/api/auth/callback/dashboard", async (req, res) => {
    const { code, error, error_description } = req.query;
    if (error) {
      console.error(`Discord OAuth Error: ${error} - ${error_description}`);
      return res.status(400).send(`Discord Error: ${error_description || error}`);
    }
    if (!code) {
      console.error("Missing code in OAuth callback. Query params:", req.query);
      return res.status(400).send("Missing code from Discord. Did you cancel the login?");
    }
    let appUrl = APP_URL || `${req.protocol}://${req.get('host')}`;
    const clientId = DISCORD_CLIENT_ID;
    const clientSecret = DISCORD_CLIENT_SECRET;
    if (!appUrl || !clientId || !clientSecret) {
      console.error("Missing APP_URL, DISCORD_CLIENT_ID, or DISCORD_CLIENT_SECRET for auth callback.");
      return res.status(500).send("Server configuration error: Missing environment variables or config.ts settings.");
    }
    appUrl = appUrl.replace(/\/$/, "");
    try {
      const REDIRECT_URI = `${appUrl}/api/auth/callback/dashboard`;
      console.log(`Exchanging code for token with redirect_uri: ${REDIRECT_URI}`);
      const response = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }).catch((err) => {
        console.error("Discord Token Exchange Error:", err.response?.data || err.message);
        throw err;
      });
      const { access_token } = response.data;
      const userResponse = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userGuildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userData = userResponse.data;
      const userGuilds = userGuildsResponse.data;
      const adminGuilds = userGuilds.filter((g) => (BigInt(g.permissions) & BigInt(32)) === BigInt(32) || g.owner);
      const userPayload = {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        guilds: adminGuilds.map((g) => g.id)
      };
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "30d" });
      console.log(`User ${userData.username} logged in. Token generated.`);
      res.send(`
        <html>
          <body>
            <script>
              localStorage.setItem('requiem_token', '${token}');
              window.location.href = '/';
            </script>
            <p>Logging you in... If you are not redirected, <a href="/">click here</a>.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("Dashboard OAuth error:", err);
      res.status(500).send("Authentication failed.");
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET || 'requiem-super-secret-key-2026');
        return res.json(decoded);
      } catch (err) {
        return res.json(null);
      }
    }
    const user = req.user || (req.session && req.session.user) || null;
    res.json(user);
  });

  app.get("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    const { code, state: guildId } = req.query;
    if (!code) return res.status(400).send("Missing code");
    let appUrl = APP_URL || "";
    appUrl = appUrl.replace(/\/$/, "");
    try {
      const REDIRECT_URI = `${appUrl}/api/auth/callback`;
      const response = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      const { access_token, refresh_token, expires_in } = response.data;
      const userResponse = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userId = userResponse.data.id;
      db.prepare("INSERT OR REPLACE INTO tokens (userId, guildId, accessToken, refreshToken, expiresAt) VALUES (?, ?, ?, ?, ?)").run(userId, guildId || "unknown", access_token, refresh_token, Date.now() + expires_in * 1e3);
      if (guildId) {
        const protection = db.prepare("SELECT verifiedRoleId FROM protection_settings WHERE guildId = ?").get(guildId);
        if (protection?.verifiedRoleId) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              const role = guild.roles.cache.get(protection.verifiedRoleId);
              if (role) {
                await member.roles.add(role).catch(console.error);
              }
            }
          }
        }
      }
      res.send(`
        <html>
          <body style="background: #1a1a2e; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; background: #16213e; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
              <h1 style="color: #5865f2;">✅ تم التحقق بنجاح!</h1>
              <p>يمكنك الآن العودة إلى ديسكورد وإغلاق هذه الصفحة.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.status(500).send("فشل التحقق. يرجى المحاولة مرة أخرى.");
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    const user = req.user || (req.session && req.session.user);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    if (!ai) return res.status(500).json({ error: "Gemini API key not configured" });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      res.status(500).json({ error: "No image generated" });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // Settings (Prefix, etc.)
  app.get("/api/guilds/:guildId/settings", (req, res) => {
    try {
      const { guildId } = req.params;
      const prefixRow = db.prepare("SELECT value FROM settings WHERE key = ?").get(`prefix_${guildId}`);
      const prefix = prefixRow ? prefixRow.value : "#";
      res.json({ prefix });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/guilds/:guildId/settings", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { prefix } = req.body;
      if (prefix) {
        db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?").run(`prefix_${guildId}`, prefix, prefix);
      }
      res.json({ success: true, prefix });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Leveling Settings
  app.get("/api/guilds/:guildId/leveling", (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = db.prepare("SELECT * FROM leveling_settings WHERE guildId = ?").get(guildId) || { status: "on", channelId: "", message: "🎉 Congratulations {user}! You reached level **{level}**!" };
      const rewards = db.prepare("SELECT * FROM rewards WHERE guildId = ?").all(guildId) || [];
      res.json({ ...settings, rewards });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/guilds/:guildId/leveling", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { status, channelId, message } = req.body;
      db.prepare("INSERT INTO leveling_settings (guildId, status, channelId, message) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET status = ?, channelId = ?, message = ?")
        .run(guildId, status || "on", channelId || "", message || "", status || "on", channelId || "", message || "");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ticket Settings
  app.get("/api/guilds/:guildId/tickets", (req, res) => {
    try {
      const { guildId } = req.params;
      const categories = db.prepare("SELECT * FROM ticket_categories WHERE guildId = ?").all(guildId) || [];
      const logs = db.prepare("SELECT * FROM ticket_logs WHERE guildId = ? ORDER BY createdAt DESC LIMIT 20").all(guildId) || [];
      res.json({ categories, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/guilds/:guildId/tickets", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { name, roleId, categoryId } = req.body;
      if (name && roleId) {
        db.prepare("INSERT INTO ticket_categories (guildId, name, roleId, categoryId) VALUES (?, ?, ?, ?)").run(guildId, name, roleId, categoryId || "");
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Azkar Settings
  app.get("/api/guilds/:guildId/azkar", (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = db.prepare("SELECT * FROM azkar_settings WHERE guildId = ?").get(guildId) || { status: "off", channelId: "", interval: 60 };
      const customAzkar = db.prepare("SELECT * FROM custom_azkar WHERE guildId = ?").all(guildId) || [];
      res.json({ ...settings, customAzkar });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/guilds/:guildId/azkar", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { status, channelId, interval } = req.body;
      db.prepare("INSERT INTO azkar_settings (guildId, status, channelId, interval) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET status = ?, channelId = ?, interval = ?")
        .run(guildId, status || "off", channelId || "", interval || 60, status || "off", channelId || "", interval || 60);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Command Room Permissions
  app.get("/api/guilds/:guildId/commands", (req, res) => {
    try {
      const { guildId } = req.params;
      const permissions = db.prepare("SELECT * FROM command_permissions WHERE guildId = ?").all(guildId) || [];
      res.json({ permissions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/guilds/:guildId/commands", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { commandName, channelId, type } = req.body;
      if (type === "remove") {
        db.prepare("DELETE FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ?").run(guildId, commandName, channelId);
      } else {
        db.prepare("INSERT INTO command_permissions (guildId, commandName, channelId, type) VALUES (?, ?, ?, ?) ON CONFLICT(guildId, commandName, channelId) DO UPDATE SET type = ?")
          .run(guildId, commandName, channelId, type, type);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/guilds/:guildId/broadcast/subscribe", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const credits = db.prepare("SELECT amount FROM credits WHERE userId = ?").get(user.id);
      if (!credits || credits.amount < 10000000) {
        return res.status(400).json({ error: "Insufficient credits" });
      }

      db.prepare("UPDATE credits SET amount = amount - 10000000 WHERE userId = ?").run(user.id);
      db.prepare("INSERT OR REPLACE INTO broadcast_subscriptions (userId, expiresAt) VALUES (?, ?)").run(user.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/guilds/:guildId/broadcast/bots", (req, res) => {
    const { guildId } = req.params;
    const bots = db.prepare("SELECT * FROM broadcast_bots WHERE guildId = ?").all(guildId);
    res.json(bots);
  });

  app.post("/api/guilds/:guildId/broadcast/bots", express.json(), (req, res) => {
    const { guildId } = req.params;
    const { name, webhookUrl } = req.body;
    db.prepare("INSERT INTO broadcast_bots (guildId, name, webhookUrl) VALUES (?, ?, ?)").run(guildId, name, webhookUrl);
    res.json({ success: true });
  });

  app.delete("/api/guilds/:guildId/broadcast/bots/:botId", (req, res) => {
    const { guildId, botId } = req.params;
    db.prepare("DELETE FROM broadcast_bots WHERE guildId = ? AND id = ?").run(guildId, botId);
    res.json({ success: true });
  });

  app.get("/api/guilds/:guildId/broadcast/settings", (req, res) => {
    const { guildId } = req.params;
    const settings = db.prepare("SELECT * FROM broadcast_settings WHERE guildId = ?").get(guildId) || { message: 'Hello {user}!' };
    res.json(settings);
  });

  app.post("/api/guilds/:guildId/broadcast/settings", express.json(), (req, res) => {
    const { guildId } = req.params;
    const { message } = req.body;
    db.prepare("INSERT OR REPLACE INTO broadcast_settings (guildId, message) VALUES (?, ?)").run(guildId, message);
    res.json({ success: true });
  });

  // Global Multicast Broadcast Manager Endpoints
  app.get("/api/broadcast/status", (req, res) => {
    res.json({
      status: botManager.status,
      currentBroadcast: botManager.currentBroadcast,
      activeBotsCount: botManager.getActiveBots().length,
      totalBotsCount: botManager.getAllBots().length
    });
  });

  app.post("/api/broadcast/start", express.json(), async (req, res) => {
    try {
      const { message, totalTarget, guildId, speedMode, targetType } = req.body;
      const broadcast = await botManager.startBroadcast(
        message || "مرحباً بكم!",
        totalTarget || 100,
        guildId || null,
        { speedMode, targetType }
      );
      res.json({ success: true, broadcast });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/broadcast/stop", (req, res) => {
    botManager.stopBroadcast();
    res.json({ success: true, status: botManager.status });
  });

  app.post("/api/broadcast/reset", (req, res) => {
    try {
      botManager.resetStats();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/broadcast/tokens", (req, res) => {
    res.json(botManager.getAllBots());
  });

  app.post("/api/broadcast/tokens", express.json(), async (req, res) => {
    try {
      const { token } = req.body;
      const result = await botManager.addBot(token);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/broadcast/tokens/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const row = db.prepare("SELECT token FROM bots WHERE id = ?").get(id);
      if (row) {
        await botManager.removeBotClient(row.token);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const context = {
    client, db, OWNER_ID, OWNER_USERNAME, DISCORD_TOKEN, DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET, APP_URL, JWT_SECRET, GEMINI_API_KEY, logEvent,
    logCurrencyTransaction, createBackup, restoreBackup
  };

  // Setup modular Dashboard API routes
  setupDashboardRoutes(app, context);

  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.error("Vite server creation failed. Falling back to static serving.", viteError);
      const distPath = path.resolve(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.resolve(distPath, "index.html"));
        });
      }
    }
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  if (DISCORD_TOKEN) {
    client.login(DISCORD_TOKEN).catch((err) => {
      console.error("Failed to login to Discord:", err);
    });
  } else {
    console.warn("DISCORD_TOKEN not found in environment variables or config.js.");
  }
}

startServer();
