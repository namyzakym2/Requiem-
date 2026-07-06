import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "command-room",
  category: "admin",
  data: new SlashCommandBuilder().setName("command-room").setDescription("التحكم في غرف الأوامر (Admin Only)").addStringOption((option) => option.setName("command").setDescription("اسم الأمر").setRequired(true)).addChannelOption((option) => option.setName("channel").setDescription("القناة").setRequired(true)).addStringOption((option) => option.setName("type").setDescription("النوع (سماح أو منع)").setRequired(true).addChoices(
      { name: "سماح (Whitelist)", value: "allow" },
      { name: "منع (Blacklist)", value: "deny" },
      { name: "إزالة القيد (Remove)", value: "remove" }
    )),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "command-room") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const cmd = interaction.options.getString("command");
        const channel2 = interaction.options.getChannel("channel");
        const type = interaction.options.getString("type");
        if (type === "remove") {
          db.prepare("DELETE FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ?").run(guildId, cmd, channel2.id);
          return interaction.reply(`✅ تم إزالة جميع القيود عن الأمر \`${cmd}\` في القناة ${channel2}.`);
        }
        db.prepare("INSERT INTO command_permissions (guildId, commandName, channelId, type) VALUES (?, ?, ?, ?) ON CONFLICT(guildId, commandName, channelId) DO UPDATE SET type = ?").run(guildId, cmd, channel2.id, type, type);
        const typeText = type === "allow" ? "سماح (Whitelist)" : "منع (Blacklist)";
        await interaction.reply(`✅ تم ضبط القيد للأمر \`${cmd}\` في القناة ${channel2} كـ **${typeText}**.`);
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
    const commandName = "command-room";
    
  }
};
