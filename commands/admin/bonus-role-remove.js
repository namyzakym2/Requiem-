import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "bonus-role-remove",
  category: "admin",
  data: new SlashCommandBuilder().setName("bonus-role-remove").setDescription("إزالة رتبة ترقية تلقائية (Admin Only)").addRoleOption((option) => option.setName("role").setDescription("الرتبة").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "bonus-role-remove") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        const result = db.prepare("DELETE FROM bonus_roles WHERE guildId = ? AND roleId = ?").run(guildId, role.id);
        if (result.changes > 0) {
          await interaction.reply(`✅ تم إزالة الرتبة ${role} من قائمة الترقية التلقائية.`);
        } else {
          await interaction.reply({ content: "❌ هذه الرتبة ليست في قائمة الترقية التلقائية.", ephemeral: true });
        }
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
    const commandName = "bonus-role-remove";
    
  }
};
