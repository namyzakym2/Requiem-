import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "mention-protection",
  category: "moderation",
  data: new SlashCommandBuilder().setName("mention-protection").setDescription("تفعيل أو تعطيل حماية المنشن").addStringOption((option) => option.setName("status").setDescription("on أو off").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "mention-protection") {
        const status = interaction.options.getString("status");
        const enabled = status === "on" ? 1 : 0;
        db.prepare("INSERT INTO mention_protection (guildId, userId, enabled) VALUES (?, ?, ?) ON CONFLICT(guildId, userId) DO UPDATE SET enabled = excluded.enabled").run(interaction.guildId, interaction.user.id, enabled);
        await interaction.reply({ content: `تم ${enabled ? "تفعيل" : "تعطيل"} حماية المنشن لك.`, ephemeral: true });
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
    const commandName = "mention-protection";
    
  }
};
