import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "azkar-remove",
  category: "admin",
  data: new SlashCommandBuilder().setName("azkar-remove").setDescription("حذف ذكر مخصص (Admin Only)").addIntegerOption((option) => option.setName("id").setDescription("رقم الذكر المراد حذفه").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "azkar-remove") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const id = interaction.options.getInteger("id");
        const result = db.prepare("DELETE FROM custom_azkar WHERE id = ? AND guildId = ?").run(id, guildId);
        if (result.changes > 0) {
          await interaction.reply(`✅ تم حذف الذكر رقم **#${id}** بنجاح.`);
        } else {
          await interaction.reply({ content: "❌ لم يتم العثور على ذكر بهذا الرقم.", ephemeral: true });
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
    const commandName = "azkar-remove";
    
  }
};
