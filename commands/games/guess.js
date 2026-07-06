import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "guess",
  category: "games",
  data: new SlashCommandBuilder().setName("guess").setDescription("لعبة تخمين الرقم (من 1 إلى 10)").addIntegerOption((option) => option.setName("number").setDescription("الرقم الذي تخمنه").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "guess") {
        const userNumber = interaction.options.getInteger("number");
        const botNumber = Math.floor(Math.random() * 10) + 1;
        if (userNumber < 1 || userNumber > 10) {
          return interaction.reply({ content: "الرجاء اختيار رقم بين 1 و 10.", ephemeral: true });
        }
        const embed = new EmbedBuilder().setColor(userNumber === botNumber ? "#00ff00" : "#ff0000").setTitle("🔢 لعبة تخمين الرقم").setDescription(userNumber === botNumber ? `<@${interaction.user.id}> تهانينا! لقد خمنت الرقم الصحيح: **${botNumber}** 🎉` : `<@${interaction.user.id}> للأسف، الرقم الصحيح كان: **${botNumber}**. حظاً موفقاً في المرة القادمة! 😢`).setTimestamp();
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
    const commandName = "guess";
    if (commandName === "guess") {
          const number = Math.floor(Math.random() * 10) + 1;
          const userGuess = parseInt(args[0]);
          if (isNaN(userGuess)) return message.reply("Usage: guess <number 1-10>");
          if (userGuess === number) return message.reply(`🎉 Correct! The number was **${number}**.`);
          else return message.reply(`❌ Wrong! The number was **${number}**.`);
        }
  }
};
