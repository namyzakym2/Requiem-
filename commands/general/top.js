import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "top",
  category: "general",
  data: new SlashCommandBuilder().setName("top").setDescription("View the leaderboard").addStringOption((option) => option.setName("timeframe").setDescription("The timeframe for the leaderboard").addChoices(
      { name: "Daily", value: "day" },
      { name: "Weekly", value: "week" },
      { name: "Monthly", value: "month" },
      { name: "Yearly", value: "year" },
      { name: "All-Time", value: "all" }
    )).addStringOption((option) => option.setName("type").setDescription("The type of XP (Text or Voice)").addChoices(
      { name: "Text", value: "text" },
      { name: "Voice", value: "voice" }
    )).addRoleOption((option) => option.setName("role").setDescription("Filter by role")).addIntegerOption((option) => option.setName("limit").setDescription("Number of users to show (1-25)")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "top") {
        const role = interaction.options.getRole("role");
        const limit = interaction.options.getInteger("limit") || 10;
        const timeframe = interaction.options.getString("timeframe");
        const type = interaction.options.getString("type");
        let query = "";
        let params = [guildId];
        let title = "Global Leaderboard";
        let isTimeBased = false;
        if (timeframe === "day") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-1 day')";
          title = "Daily Leaderboard";
          isTimeBased = true;
        } else if (timeframe === "week") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-7 days')";
          title = "Weekly Leaderboard";
          isTimeBased = true;
        } else if (timeframe === "month") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-30 days')";
          title = "Monthly Leaderboard";
          isTimeBased = true;
        } else if (timeframe === "year") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-365 days')";
          title = "Yearly Leaderboard";
          isTimeBased = true;
        } else {
          query = "SELECT userId, xp as totalXp, level FROM leveling WHERE guildId = ?";
          title = "All-Time Leaderboard";
        }
        if (isTimeBased) {
          if (type === "voice") {
            query += " AND type = 'voice'";
            title += " (Voice)";
          } else if (type === "text") {
            query += " AND type = 'text'";
            title += " (Text)";
          }
          query += " GROUP BY userId ORDER BY totalXp DESC";
        } else {
          query += " ORDER BY level DESC, xp DESC";
        }
        let leaderboard = db.prepare(query).all(...params);
        if (role) {
          const roleMemberIds = role.members.map((m) => m.id);
          leaderboard = leaderboard.filter((u) => roleMemberIds.includes(u.userId));
        }
        const topUsers = leaderboard.slice(0, Math.min(Math.max(limit, 1), 25));
        const embed = new EmbedBuilder().setTitle(role ? `Leaderboard for ${role.name} (${title})` : `${title} (Top ${topUsers.length})`).setColor(5793266).setTimestamp();
        if (topUsers.length === 0) {
          embed.setDescription("No users found in the leaderboard.");
        } else {
          const list = topUsers.map((u, index) => {
            const levelStr = u.level !== void 0 ? ` - Level ${u.level}` : "";
            return `**#${index + 1}** | <@${u.userId}>${levelStr} (${u.totalXp} XP)`;
          }).join("\n");
          embed.setDescription(list);
        }
        await interaction.reply({ embeds: [embed] });
      }
  },
  async executeMessage(message, args, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    const guildId = message.guild.id;
    const commandName = "top";
    if (commandName === "top") {
          const timeframe = args[0]?.toLowerCase();
          const type = args[1]?.toLowerCase();
          let query = "";
          let params = [guildId];
          let title = "Global Leaderboard";
          let isTimeBased = false;
          if (["day", "daily", "يوم"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-1 day')";
            title = "Daily Leaderboard";
            isTimeBased = true;
          } else if (["week", "weekly", "اسبوع"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-7 days')";
            title = "Weekly Leaderboard";
            isTimeBased = true;
          } else if (["month", "monthly", "شهر"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-30 days')";
            title = "Monthly Leaderboard";
            isTimeBased = true;
          } else if (["year", "yearly", "سنة"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-365 days')";
            title = "Yearly Leaderboard";
            isTimeBased = true;
          } else {
            query = "SELECT userId, xp as totalXp, level FROM leveling WHERE guildId = ?";
            title = "All-Time Leaderboard";
          }
          if (isTimeBased) {
            if (["voice", "صوت"].includes(type)) {
              query += " AND type = 'voice'";
              title += " (Voice)";
            } else if (["text", "كتابي"].includes(type)) {
              query += " AND type = 'text'";
              title += " (Text)";
            }
            query += " GROUP BY userId ORDER BY totalXp DESC LIMIT 10";
          } else {
            query += " ORDER BY level DESC, xp DESC LIMIT 10";
          }
          const topUsers = db.prepare(query).all(...params);
          const embed = new EmbedBuilder().setTitle(`${title} (Top ${topUsers.length})`).setColor(5793266).setTimestamp();
          if (topUsers.length === 0) {
            embed.setDescription("No users found in the leaderboard.");
          } else {
            const list = topUsers.map((u, index) => {
              const levelStr = u.level !== void 0 ? ` - Level ${u.level}` : "";
              return `**#${index + 1}** | <@${u.userId}>${levelStr} (${u.totalXp} XP)`;
            }).join("\n");
            embed.setDescription(list);
          }
          return message.reply({ embeds: [embed] });
        }
  }
};
