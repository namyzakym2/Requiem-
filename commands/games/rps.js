import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "rps",
  category: "games",
  data: new SlashCommandBuilder().setName("rps").setDescription("لعبة حجر ورقة مقص").addStringOption((option) => option.setName("choice").setDescription("اختر حجر أو ورقة أو مقص").setRequired(true).addChoices(
      { name: "حجر", value: "rock" },
      { name: "ورقة", value: "paper" },
      { name: "مقص", value: "scissors" }
    )),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "rps") {
        const choice = interaction.options.getString("choice");
        const choices = ["rock", "paper", "scissors"];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const emojis = { rock: "🪨", paper: "📄", scissors: "✂️" };
        const translate = { rock: "حجر", paper: "ورقة", scissors: "مقص" };
        const result = {
          win: "لقد فزت! 🎉",
          lose: "لقد خسرت! 😢",
          draw: "تعادل! 🤝"
        };
        let outcome = "";
        let color = 39423;
        if (choice === botChoice) {
          outcome = result.draw;
          color = 16776960;
        } else if (choice === "rock" && botChoice === "scissors" || choice === "paper" && botChoice === "rock" || choice === "scissors" && botChoice === "paper") {
          outcome = result.win;
          color = 65280;
        } else {
          outcome = result.lose;
          color = 16711680;
        }
        const embed = new EmbedBuilder().setColor(color).setTitle("🎮 لعبة حجر ورقة مقص").setDescription(`<@${interaction.user.id}>`).addFields(
          { name: "اختيارك", value: `${emojis[choice]} ${translate[choice]}`, inline: true },
          { name: "اختيار البوت", value: `${emojis[botChoice]} ${translate[botChoice]}`, inline: true },
          { name: "النتيجة", value: `**${outcome}**` }
        ).setTimestamp();
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
    const commandName = "rps";
    if (commandName === "rps") {
          const choices = ["rock", "paper", "scissors"];
          const userChoice = args[0]?.toLowerCase();
          if (!choices.includes(userChoice)) return message.reply("Usage: rps <rock/paper/scissors>");
          const botChoice = choices[Math.floor(Math.random() * choices.length)];
          let result = "";
          if (userChoice === botChoice) result = "It's a tie!";
          else if (userChoice === "rock" && botChoice === "scissors" || userChoice === "paper" && botChoice === "rock" || userChoice === "scissors" && botChoice === "paper") result = "You win!";
          else result = "I win!";
          return message.reply(`🎮 **${message.author.username}** اختار **${userChoice}**
🤖 **البوت** اختار **${botChoice}**

${result === "You win!" ? "🎉 لقد فزت!" : result === "It's a tie!" ? "🤝 تعادل!" : "💀 لقد خسرت!"}`);
        }
  }
};
