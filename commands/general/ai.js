import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "ai",
  category: "general",
  data: new SlashCommandBuilder().setName("ai").setDescription("التحدث مع الذكاء الاصطناعي").addStringOption((option) => option.setName("prompt").setDescription("سؤالك للذكاء الاصطناعي").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "ai") {
        const prompt = interaction.options.getString("prompt");
        await interaction.deferReply();
        return handleAIResponse(interaction, prompt);
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
    const commandName = "ai";
    if (commandName === "ai") {
          const prompt = args.join(" ");
          if (!prompt) return message.reply("❌ يرجى كتابة سؤال للذكاء الاصطناعي.");
          await handleAIResponse(message, prompt);
          return;
        }
  }
};
