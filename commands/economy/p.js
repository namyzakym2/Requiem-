import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "p",
  category: "economy",
  data: new SlashCommandBuilder().setName("p").setDescription("عرض بروفايلك وعملات XB الخاصة بك").addUserOption((option) => option.setName("user").setDescription("العضو المراد عرض بروفايله (اختياري)")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "p" || commandName === "xbp") {
        const targetUser = interaction.options.getUser("user") || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
        const level = userRow?.level || 0;
        const xb = userRow?.xb || 0;
        const xp = userRow?.xp || 0;
        const nextLevelXp = (level + 1) * 300;
        try {
          const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
          const attachment = new AttachmentBuilder(buffer, { name: "profile.gif" });
          await interaction.reply({ files: [attachment] });
        } catch (err) {
          console.error("Profile image generation failed:", err);
          await interaction.reply({ content: "❌ فشل في إنشاء صورة البروفايل.", ephemeral: true });
        }
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
    const commandName = "p";
    if (commandName === "p" || commandName === "xbp") {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          try {
            const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
            const attachment = new AttachmentBuilder(buffer, { name: "profile.gif" });
            return message.reply({ files: [attachment] });
          } catch (err) {
            console.error("Profile image generation failed:", err);
            return message.reply("❌ فشل في إنشاء صورة البروفايل.");
          }
        }
  }
};
