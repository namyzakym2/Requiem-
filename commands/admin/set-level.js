import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "set-level",
  category: "admin",
  data: new SlashCommandBuilder().setName("set-level").setDescription("إعدادات نظام اللفل (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("قناة التنبيهات")).addStringOption((option) => option.setName("message").setDescription("رسالة الترقية ({user}, {level}, {xp} هي رموز بديلة)")).addStringOption((option) => option.setName("status").setDescription("تفعيل أو تعطيل النظام").addChoices(
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
    if (commandName === "set-level") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const ch = interaction.options.getChannel("channel");
        const message = interaction.options.getString("message");
        const status = interaction.options.getString("status");
        if (ch) {
          if (ch.type !== ChannelType.GuildText) return interaction.reply({ content: "Must be a text channel.", ephemeral: true });
          db.prepare("INSERT INTO leveling_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
        }
        if (message) {
          db.prepare("INSERT INTO leveling_settings (guildId, message) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET message = excluded.message").run(guildId, message);
        }
        if (status) {
          const enabled = status === "on" ? 1 : 0;
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        }
        await interaction.reply(`✅ تم تحديث إعدادات اللفل بنجاح.`);
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
    const commandName = "set-level";
    if (commandName === "set-level") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const subCommand = args[0];
          if (subCommand === "channel") {
            const ch = message.mentions.channels.first();
            if (!ch || ch.type !== ChannelType.GuildText) return message.reply("Usage: set-level channel <#channel>");
            db.prepare("INSERT INTO leveling_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
          } else if (subCommand === "message") {
            const msg = args.slice(1).join(" ");
            if (!msg) return message.reply("Usage: set-level message <message>");
            db.prepare("INSERT INTO leveling_settings (guildId, message) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET message = excluded.message").run(guildId, msg);
          } else if (subCommand === "status") {
            const status = args[1];
            if (status !== "on" && status !== "off") return message.reply("Usage: set-level status <on/off>");
            const enabled = status === "on" ? 1 : 0;
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else {
            return message.reply("Usage: set-level <channel/message/status> <value>");
          }
          return message.reply(`✅ تم تحديث إعدادات اللفل بنجاح.`);
        }
  }
};
