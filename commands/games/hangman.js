import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "hangman",
  category: "games",
  data: new SlashCommandBuilder().setName("hangman").setDescription("لعبة المشنقة (تخمين الكلمات)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "hangman") {
        await interaction.deferReply();
        const aiData = await getAIHangmanWord();
        const word = aiData.word;
        const hint = aiData.hint;
        let guessedLetters = [];
        let mistakes = 0;
        const maxMistakes = 6;
        const getDisplayWord = () => {
          return word.split("").map((char) => guessedLetters.includes(char) ? char : " _ ").join("");
        };
        const embed = new EmbedBuilder().setTitle("😵 لعبة المشنقة (مدعومة بالذكاء الاصطناعي)").setDescription(`**التلميح:** ${hint}

الكلمة: \`${getDisplayWord()}\`
الأخطاء: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
        const msg = await interaction.editReply({ embeds: [embed] });
        const filter = (m) => m.author.id === interaction.user.id && m.content.length === 1;
        const collector = interaction.channel?.createMessageCollector({ filter, time: 6e4 });
        activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "Hangman", collector });
        collector?.on("collect", async (m) => {
          const char = m.content.toLowerCase();
          if (guessedLetters.includes(char)) {
            return m.reply("لقد اخترت هذا الحرف من قبل!");
          }
          guessedLetters.push(char);
          if (word.toLowerCase().includes(char)) {
            if (!getDisplayWord().includes("_")) {
              const xbReward = 40;
              db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, xbReward, xbReward);
              const winEmbed = new EmbedBuilder().setTitle("🎉 مبروك!").setDescription(`لقد فزت يا <@${interaction.user.id}>! الكلمة كانت: **${word}**

💰 لقد حصلت على **${xbReward}** XB!`).setColor(65280).setTimestamp();
              await interaction.followUp({ content: `مبروك للفائز! <@${interaction.user.id}>`, embeds: [winEmbed] });
              collector.stop();
            } else {
              const updateEmbed = new EmbedBuilder().setTitle("😵 لعبة المشنقة").setDescription(`**التلميح:** ${hint}

الكلمة: \`${getDisplayWord()}\`
الأخطاء: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
              await interaction.followUp({ embeds: [updateEmbed] });
            }
          } else {
            mistakes++;
            if (mistakes >= maxMistakes) {
              const loseEmbed = new EmbedBuilder().setTitle("💀 خسرت!").setDescription(`لقد تم شنقك! الكلمة كانت: **${word}**`).setColor(16711680).setTimestamp();
              await interaction.followUp({ embeds: [loseEmbed] });
              collector.stop();
            } else {
              const updateEmbed = new EmbedBuilder().setTitle("😵 لعبة المشنقة").setDescription(`**التلميح:** ${hint}

الكلمة: \`${getDisplayWord()}\`
الأخطاء: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
              await interaction.followUp({ embeds: [updateEmbed] });
            }
          }
        });
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
    const commandName = "hangman";
    if (commandName === "hangman") {
          const loadingMsg = await message.reply("⏳ جاري توليد كلمة ذكاء اصطناعي...");
          const aiData = await getAIHangmanWord();
          const word = aiData.word;
          const hint = aiData.hint;
          let guessedLetters = [];
          let mistakes = 0;
          const maxMistakes = 6;
          const getDisplayWord = () => {
            return word.split("").map((char) => guessedLetters.includes(char) ? char : " _ ").join("");
          };
          const embed = new EmbedBuilder().setTitle("😵 لعبة المشنقة (مدعومة بالذكاء الاصطناعي)").setDescription(`**التلميح:** ${hint}

الكلمة: \`${getDisplayWord()}\`
الأخطاء: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
          await loadingMsg.edit({ content: null, embeds: [embed] });
          const filter = (m) => m.author.id === message.author.id && m.content.length === 1;
          const collector = message.channel.createMessageCollector({ filter, time: 6e4 });
          collector.on("collect", async (m) => {
            const char = m.content.toLowerCase();
            if (guessedLetters.includes(char)) {
              return m.reply("لقد اخترت هذا الحرف من قبل!");
            }
            guessedLetters.push(char);
            if (word.toLowerCase().includes(char)) {
              if (!getDisplayWord().includes("_")) {
                const winEmbed = new EmbedBuilder().setTitle("🎉 مبروك!").setDescription(`لقد فزت يا <@${message.author.id}>! الكلمة كانت: **${word}**`).setColor(65280).setTimestamp();
                await message.channel.send({ content: `مبروك للفائز! <@${message.author.id}>`, embeds: [winEmbed] });
                collector.stop();
              } else {
                const updateEmbed = new EmbedBuilder().setTitle("😵 لعبة المشنقة").setDescription(`**التلميح:** ${hint}

الكلمة: \`${getDisplayWord()}\`
الأخطاء: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
                await message.channel.send({ embeds: [updateEmbed] });
              }
            } else {
              mistakes++;
              if (mistakes >= maxMistakes) {
                const loseEmbed = new EmbedBuilder().setTitle("💀 خسرت!").setDescription(`لقد تم شنقك! الكلمة كانت: **${word}**`).setColor(16711680).setTimestamp();
                await message.channel.send({ embeds: [loseEmbed] });
                collector.stop();
              } else {
                const updateEmbed = new EmbedBuilder().setTitle("😵 لعبة المشنقة").setDescription(`**التلميح:** ${hint}

الكلمة: \`${getDisplayWord()}\`
الأخطاء: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
                await message.channel.send({ embeds: [updateEmbed] });
              }
            }
          });
          return;
        }
  }
};
