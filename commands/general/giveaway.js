import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "giveaway",
  category: "general",
  data: new SlashCommandBuilder().setName("giveaway").setDescription("إنشاء مسابقة (Giveaway)").addStringOption((option) => option.setName("prize").setDescription("الجائزة").setRequired(true)).addIntegerOption((option) => option.setName("duration").setDescription("المدة بالدقائق").setRequired(true)).addIntegerOption((option) => option.setName("winners").setDescription("عدد الفائزين").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "giveaway") {
        const prize = interaction.options.getString("prize");
        const duration = interaction.options.getInteger("duration");
        const winnersCount = interaction.options.getInteger("winners");
        const endTime = Date.now() + duration * 60 * 1e3;
        const embed = new EmbedBuilder().setTitle("🎉 مسابقة جديدة (Giveaway)").setDescription(`الجائزة: **${prize}**
تنتهي المسابقة في: <t:${Math.floor(endTime / 1e3)}:R>
عدد الفائزين: **${winnersCount}**`).setColor(65280);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("join_giveaway").setLabel("انضم للمسابقة").setStyle(ButtonStyle.Primary)
        );
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        db.prepare("INSERT INTO giveaways (messageId, channelId, guildId, prize, endTime, winnersCount) VALUES (?, ?, ?, ?, ?, ?)").run(msg.id, interaction.channelId, interaction.guildId, prize, endTime, winnersCount);
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
    const commandName = "giveaway";
    
  }
};
