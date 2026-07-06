import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "auto-role-list",
  category: "admin",
  data: new SlashCommandBuilder().setName("auto-role-list").setDescription("عرض قائمة الرتب التلقائية"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "auto-role-list") {
        const roles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guildId);
        if (roles.length === 0) {
          return interaction.reply({ content: "لا توجد رتب تلقائية مضافة حالياً.", ephemeral: true });
        }
        const list = roles.map((r) => `<@&${r.roleId}>`).join("\n");
        const embed = new EmbedBuilder().setTitle("📋 قائمة الرتب التلقائية").setDescription(list).setColor(5793266);
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
    const commandName = "auto-role-list";
    
  }
};
