import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "coinflip",
  category: "games",
  data: new SlashCommandBuilder().setName("coinflip").setDescription("لعبة رمي العملة (ملك أو كتابة)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "coinflip") {
        const result = Math.random() < 0.5 ? "ملك (Heads)" : "كتابة (Tails)";
        const embed = new EmbedBuilder().setColor("#ffd700").setTitle("🪙 رمي العملة").setDescription(`<@${interaction.user.id}> النتيجة هي: **${result}**`).setThumbnail("https://i.imgur.com/vH9Ff5H.png").setTimestamp();
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
    const commandName = "coinflip";
    if (commandName === "coinflip") {
          const result = Math.random() < 0.5 ? "Heads" : "Tails";
          return message.reply(`🪙 استقرت العملة على: **${result}**`);
        }
  }
};
