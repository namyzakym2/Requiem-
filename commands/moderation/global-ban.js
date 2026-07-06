import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "global-ban",
  category: "moderation",
  data: new SlashCommandBuilder().setName("global-ban").setDescription("Ban a specific user from ALL servers the bot is in (Authorized Only)").addStringOption((option) => option.setName("user_id").setDescription("ID of the user to ban").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "global-ban") {
        if (user.id !== OWNER_ID && user.username !== OWNER_USERNAME) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        const targetUserId = interaction.options.getString("user_id");
        await interaction.deferReply({ ephemeral: true });
        let successCount = 0;
        let failCount = 0;
        for (const guild of client.guilds.cache.values()) {
          try {
            await guild.members.ban(targetUserId, { reason: "Global ban by owner" });
            successCount++;
          } catch (e) {
            failCount++;
          }
        }
        await interaction.editReply({ content: `✅ تم البند الشامل لـ <@${targetUserId}>:\n- نجح في: **${successCount}** سيرفر\n- فشل في: **${failCount}** سيرفر` });
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
    const commandName = "global-ban";
    if (commandName === "globalban" || commandName === "global-ban") {
          if (message.author.id !== OWNER_ID && message.author.username !== OWNER_USERNAME) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: globalban <userId>");
          let success = 0;
          let fail = 0;
          for (const guild of client.guilds.cache.values()) {
            try {
              await guild.members.ban(targetId, { reason: "Global ban by owner" });
              success++;
            } catch (e) {
              fail++;
            }
          }
          return message.reply(`✅ تم البند الشامل لـ <@${targetId}> في **${success}** سيرفر.`);
        }
  }
};
