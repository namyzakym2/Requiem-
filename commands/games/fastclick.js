import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "fastclick",
  category: "games",
  data: new SlashCommandBuilder().setName("fastclick").setDescription("لعبة أسرع ضغطة"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "fastclick") {
        const embed = new EmbedBuilder().setTitle("⚡ أسرع ضغطة").setDescription("استعد... اضغط على الزر عندما يظهر!").setColor(16776960).setTimestamp();
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "FastClick" });
        const delay = Math.floor(Math.random() * 5e3) + 2e3;
        setTimeout(async () => {
          const startTime = Date.now();
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("fast_click_btn").setLabel("اضغط هنا!").setStyle(ButtonStyle.Success)
          );
          const readyEmbed = new EmbedBuilder().setTitle("⚡ أسرع ضغطة").setDescription("**اضغط الآن!!!**").setColor(65280).setTimestamp();
          await interaction.editReply({ embeds: [readyEmbed], components: [row] });
          const filter = (i) => i.customId === "fast_click_btn";
          const collector = msg.createMessageComponentCollector({ filter, time: 5e3, max: 1 });
          collector.on("collect", async (i) => {
            const timeTaken = (Date.now() - startTime) / 1e3;
            const xbReward = 25;
            db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(i.user.id, interaction.guildId, xbReward, xbReward);
            const winEmbed = new EmbedBuilder().setTitle("🏆 فائز!").setDescription(`الفائز هو <@${i.user.id}>! لقد ضغط في **${timeTaken}** ثانية!

💰 لقد حصلت على **${xbReward}** XB!`).setColor(65280).setTimestamp();
            await i.update({ content: `مبروك للفائز! <@${i.user.id}>`, embeds: [winEmbed], components: [] });
          });
          collector.on("end", async (collected) => {
            activeGames.delete(msg.id);
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder().setTitle("⏰ انتهى الوقت!").setDescription("لم يضغط أحد في الوقت المناسب.").setColor(16711680).setTimestamp();
              await interaction.editReply({ embeds: [loseEmbed], components: [] });
            }
          });
        }, delay);
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
    const commandName = "fastclick";
    if (commandName === "fastclick") {
          return message.reply("FastClick game is best played via slash commands. Use `/fastclick` instead.");
        }
  }
};
