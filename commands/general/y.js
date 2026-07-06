import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "y",
  category: "general",
  data: new SlashCommandBuilder().setName("y").setDescription("عرض تاريخ انضمام العضو للسيرفر").addUserOption((option) => option.setName("user").setDescription("العضو المراد عرض تاريخ انضمامه")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "y") {
        const targetUser = interaction.options.getUser("user") || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "❌ المستخدم غير موجود.", ephemeral: true });
        const joinedAt = targetMember.joinedAt;
        const embed = new EmbedBuilder().setTitle(`📅 تاريخ الانضمام`).setDescription(`${targetUser} انضم إلى السيرفر في:
**${joinedAt?.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**`).setColor(5793266);
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
    const commandName = "y";
    if (commandName === "y") {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) return message.reply("❌ المستخدم غير موجود.");
          const joinedAt = targetMember.joinedAt;
          const embed = new EmbedBuilder().setTitle(`📅 تاريخ الانضمام`).setDescription(`${targetUser} انضم إلى السيرفر في:
**${joinedAt?.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**`).setColor(5793266);
          return message.reply({ embeds: [embed] });
        }
  }
};
