import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "unban",
  category: "moderation",
  data: new SlashCommandBuilder().setName("unban").setDescription("Unban a user from a specific server (Authorized Only)").addStringOption((option) => option.setName("server_id").setDescription("ID of the server").setRequired(true)).addStringOption((option) => option.setName("user_id").setDescription("ID of the user to unban").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "unban") {
        if (user.id !== OWNER_ID && user.username !== OWNER_USERNAME) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        const targetGuildId = interaction.options.getString("server_id");
        const targetUserId = interaction.options.getString("user_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) return interaction.reply({ content: "❌ البوت ليس موجوداً في هذا السيرفر.", ephemeral: true });
        await interaction.deferReply();
        try {
          await targetGuild.members.unban(targetUserId);
          await interaction.editReply(`✅ تم فك البان عن <@${targetUserId}> في سيرفر **${targetGuild.name}**.`);
        } catch (error) {
          await interaction.editReply({ content: `❌ فشل فك البان: ${error.message}` });
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
    const commandName = "unban";
    if (commandName === "unban") {
          if (message.author.id !== OWNER_ID && message.author.username !== OWNER_USERNAME) return;
          const targetGuildId = args[0];
          const targetUserId = args[1];
          if (!targetGuildId || !targetUserId) return message.reply("Usage: unban <guildId> <userId>");
          const targetGuild = client.guilds.cache.get(targetGuildId);
          if (!targetGuild) return message.reply("❌ البوت ليس موجوداً في هذا السيرفر.");
          try {
            await targetGuild.members.unban(targetUserId);
            return message.reply(`✅ تم فك البان عن <@${targetUserId}> في سيرفر **${targetGuild.name}**.`);
          } catch (error) {
            return message.reply(`❌ فشل فك البان: ${error.message}`);
          }
        }
  }
};
