import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "toggle",
  category: "admin",
  data: new SlashCommandBuilder().setName("toggle").setDescription("تفعيل أو تعطيل ميزات البوت (Admin Only)").addStringOption((option) => option.setName("feature").setDescription("الميزة المراد تغيير حالتها").setRequired(true).addChoices(
      { name: "نظام اللفل", value: "leveling" },
      { name: "نظام الترحيب", value: "welcome" },
      { name: "الحماية", value: "protection" }
    )).addStringOption((option) => option.setName("status").setDescription("الحالة").setRequired(true).addChoices(
      { name: "تفعيل", value: "on" },
      { name: "تعطيل", value: "off" }
    )),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "toggle") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const feature = interaction.options.getString("feature");
        const status = interaction.options.getString("status");
        const enabled = status === "on" ? 1 : 0;
        if (feature === "leveling") {
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        } else if (feature === "welcome") {
          db.prepare("INSERT INTO welcome_settings (guildId, enabled, status) VALUES (?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled, status = excluded.status").run(guildId, enabled, status);
        } else if (feature === "protection") {
          db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET antiLink = excluded.antiLink, antiSpam = excluded.antiSpam, antiRaid = excluded.antiRaid").run(guildId, enabled, enabled, enabled);
        }
        await interaction.reply(`✅ تم ${status === "on" ? "تفعيل" : "تعطيل"} ${feature} بنجاح.`);
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
    const commandName = "toggle";
    if (commandName === "toggle") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const feature = args[0];
          const status = args[1];
          if (!["leveling", "welcome", "protection"].includes(feature) || !["on", "off"].includes(status)) return message.reply("Usage: toggle <leveling/welcome/protection> <on/off>");
          const enabled = status === "on" ? 1 : 0;
          if (feature === "leveling") {
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else if (feature === "welcome") {
            db.prepare("INSERT INTO welcome_settings (guildId, enabled, status) VALUES (?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled, status = excluded.status").run(guildId, enabled, status);
          } else if (feature === "protection") {
            db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET antiLink = excluded.antiLink, antiSpam = excluded.antiSpam, antiRaid = excluded.antiRaid").run(guildId, enabled, enabled, enabled);
          }
          return message.reply(`✅ تم ${status === "on" ? "تفعيل" : "تعطيل"} ${feature} بنجاح.`);
        }
  }
};
