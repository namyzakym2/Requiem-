import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "list",
  category: "general",
  data: new SlashCommandBuilder().setName("list").setDescription("عرض القوائم المخصصة").addStringOption((option) => option.setName("name").setDescription("اسم القائمة").setRequired(false)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "list") {
        const listName = interaction.options.getString("name");
        if (listName) {
          const list = db.prepare("SELECT * FROM custom_lists WHERE guildId = ? AND title = ?").get(guild.id, listName);
          if (!list) return interaction.reply({ content: "❌ لم يتم العثور على قائمة بهذا الاسم.", ephemeral: true });
          const content = JSON.parse(list.content);
          const embed = new EmbedBuilder().setTitle(`📋 ${list.title}`).setDescription(content.join("\n")).setColor(5793266).setTimestamp();
          return interaction.reply({ embeds: [embed] });
        } else {
          const lists = db.prepare("SELECT title FROM custom_lists WHERE guildId = ?").all(guild.id);
          if (lists.length === 0) return interaction.reply({ content: "❌ لا توجد قوائم مخصصة في هذا السيرفر.", ephemeral: true });
          const embed = new EmbedBuilder().setTitle("📋 القوائم المخصصة").setDescription(lists.map((l) => `• ${l.title}`).join("\n")).setColor(5793266).setTimestamp();
          return interaction.reply({ embeds: [embed] });
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
    const commandName = "list";
    
  }
};
