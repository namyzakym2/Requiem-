import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "eval-settings",
  category: "admin",
  data: new SlashCommandBuilder().setName("eval-settings").setDescription("إعدادات تقييم الإدارة (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("القناة التي ستصل إليها التقييمات").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "eval-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel", true);
        db.prepare("INSERT OR REPLACE INTO evaluation_settings (guildId, channelId, enabled) VALUES (?, ?, ?)").run(guild.id, channel2.id, 1);
        await interaction.reply({ content: `✅ تم تحديد قناة التقييمات: ${channel2}`, ephemeral: true });
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
    const commandName = "eval-settings";
    
  }
};
