import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "u",
  category: "general",
  data: new SlashCommandBuilder().setName("u").setDescription("عرض مستوى تفاعل العضو").addUserOption((option) => option.setName("user").setDescription("العضو المراد عرض تفاعله")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "u") {
        const targetUser = interaction.options.getUser("user") || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
        const xp = userRow?.xp || 0;
        const level = userRow?.level || 0;
        const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
        const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
        const embed = new EmbedBuilder().setTitle(`📊 نشاط ${targetUser.username}`).setThumbnail(targetUser.displayAvatarURL()).addFields(
          { name: "المستوى", value: level.toString(), inline: true },
          { name: "الخبرة (XP)", value: xp.toString(), inline: true },
          { name: "الترتيب", value: `#${rank}`, inline: true }
        ).setColor(44678);
        return interaction.reply({ embeds: [embed] });
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
    const commandName = "u";
    if (commandName === "u") {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const xp = userRow?.xp || 0;
          const level = userRow?.level || 0;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
          const embed = new EmbedBuilder().setTitle(`📊 نشاط ${targetUser.username}`).setThumbnail(targetUser.displayAvatarURL()).addFields(
            { name: "المستوى", value: level.toString(), inline: true },
            { name: "الخبرة (XP)", value: xp.toString(), inline: true },
            { name: "الترتيب", value: `#${rank}`, inline: true }
          ).setColor(44678);
          return message.reply({ embeds: [embed] });
        }
  }
};
