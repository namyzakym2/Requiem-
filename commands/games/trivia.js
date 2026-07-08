import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "trivia",
  category: "games",
  data: new SlashCommandBuilder().setName("trivia").setDescription("لعبة أسئلة وأجوبة"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "trivia") {
        await interaction.deferReply();
        const question = await getAITrivia();
        const embed = new EmbedBuilder().setTitle("❓ سؤال وجواب (مدعوم بالذكاء الاصطناعي)").setDescription(`**السؤال:**
${question.q}`).setColor(65280).setThumbnail("https://i.imgur.com/XyXyXyX.png").setFooter({ text: "لديك 15 ثانية للإجابة!" }).setTimestamp();
        const msg = await interaction.editReply({ embeds: [embed] });
        const filter = (m) => m.content.toLowerCase().trim() === question.a.toLowerCase().trim();
        const collector = interaction.channel?.createMessageCollector({ filter, time: 15e3, max: 1 });
        activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "Trivia", collector });
        collector?.on("collect", (m) => {
          const xbReward = 30;
          db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(m.author.id, interaction.guildId, xbReward, xbReward);
          const winEmbed = new EmbedBuilder().setTitle("✅ إجابة صحيحة!").setDescription(`مبروك يا ${m.author}! الإجابة هي: **${question.a}**

💰 لقد حصلت على **${xbReward}** رون!`).setColor(65280).setTimestamp();
          interaction.followUp({ embeds: [winEmbed] });
        });
        collector?.on("end", (collected) => {
          if (collected.size === 0) {
            const loseEmbed = new EmbedBuilder().setTitle("⏰ انتهى الوقت!").setDescription(`الإجابة الصحيحة كانت: **${question.a}**`).setColor(16711680).setTimestamp();
            interaction.followUp({ embeds: [loseEmbed] });
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
    const commandName = "trivia";
    if (commandName === "trivia") {
          const loadingMsg = await message.reply("⏳ جاري توليد سؤال ذكاء اصطناعي...");
          const question = await getAITrivia();
          const embed = new EmbedBuilder().setTitle("❓ سؤال وجواب (مدعوم بالذكاء الاصطناعي)").setDescription(`**السؤال:**
${question.q}`).setColor(65280).setThumbnail("https://i.imgur.com/XyXyXyX.png").setFooter({ text: "لديك 15 ثانية للإجابة!" }).setTimestamp();
          await loadingMsg.edit({ content: null, embeds: [embed] });
          const filter = (m) => m.content.toLowerCase().trim() === question.a.toLowerCase().trim();
          const collector = message.channel.createMessageCollector({ filter, time: 15e3, max: 1 });
          collector.on("collect", (m) => {
            const winEmbed = new EmbedBuilder().setTitle("✅ إجابة صحيحة!").setDescription(`مبروك يا ${m.author}! الإجابة هي: **${question.a}**`).setColor(65280).setTimestamp();
            message.channel.send({ embeds: [winEmbed] });
          });
          collector.on("end", (collected) => {
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder().setTitle("⏰ انتهى الوقت!").setDescription(`الإجابة الصحيحة كانت: **${question.a}**`).setColor(16711680).setTimestamp();
              message.channel.send({ embeds: [loseEmbed] });
            }
          });
          return;
        }
  }
};
