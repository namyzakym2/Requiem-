import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "azkar-list",
  category: "admin",
  data: new SlashCommandBuilder().setName("azkar-list").setDescription("عرض قائمة الأذكار المخصصة (Admin Only)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "azkar-list") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const customAzkar = db.prepare("SELECT * FROM custom_azkar WHERE guildId = ?").all(guildId);
        if (customAzkar.length === 0) {
          return interaction.reply({ content: "لا توجد أذكار مخصصة حالياً.", ephemeral: true });
        }
        const list = customAzkar.map((a) => `**#${a.id}**: ${a.content}`).join("\n");
        const embed = new EmbedBuilder().setTitle("📜 قائمة الأذكار المخصصة").setDescription(list).setColor(5793266);
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
    const commandName = "azkar-list";
    
  }
};
