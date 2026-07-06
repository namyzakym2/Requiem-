import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "nick",
  category: "moderation",
  data: new SlashCommandBuilder().setName("nick").setDescription("Change your or another user's nickname").addStringOption((option) => option.setName("name").setDescription("The new nickname (leave empty to reset)")).addUserOption((option) => option.setName("user").setDescription("The user to change (requires Manage Nicknames)")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "nick") {
        const targetMember = interaction.options.getMember("user") || interaction.member;
        const newNick = interaction.options.getString("name");
        if (targetMember.id !== user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: "❌ ليس لديك صلاحية تغيير أسماء الآخرين.", ephemeral: true });
        }
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: "❌ البوت لا يملك صلاحية تغيير الأسماء.", ephemeral: true });
        }
        if (targetMember.id !== guild.ownerId && targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
          return interaction.reply({ content: "❌ لا يمكنني تغيير اسم هذا الشخص بسبب الرتب.", ephemeral: true });
        }
        try {
          await targetMember.setNickname(newNick);
          await interaction.reply({ content: newNick ? `✅ تم تغيير اسم ${targetMember.user.username} إلى **${newNick}**` : `✅ تم إزالة الاسم المستعار لـ ${targetMember.user.username}` });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة تغيير الاسم.", ephemeral: true });
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
    const commandName = "nick";
    if (commandName === "nick") {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild?.members.fetch(targetUser.id).catch(() => null);
          const newNick = args.slice(0).join(" ");
          if (!targetMember) return message.reply("❌ User not found.");
          if (targetMember.id !== message.author.id && !message.member?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("❌ ليس لديك صلاحية تغيير أسماء الآخرين.");
          }
          if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("❌ البوت لا يملك صلاحية تغيير الأسماء.");
          }
          if (targetMember.id !== message.guild?.ownerId && targetMember.roles.highest.position >= message.guild?.members.me.roles.highest.position) {
            return message.reply("❌ لا يمكنني تغيير اسم هذا الشخص بسبب الرتب.");
          }
          try {
            await targetMember.setNickname(newNick || null);
            return message.reply(newNick ? `✅ تم تغيير اسم ${targetMember.user.username} إلى **${newNick}**` : `✅ تم إزالة الاسم المستعار لـ ${targetMember.user.username}`);
          } catch (err) {
            return message.reply("❌ حدث خطأ أثناء محاولة تغيير الاسم.");
          }
        }
  }
};
