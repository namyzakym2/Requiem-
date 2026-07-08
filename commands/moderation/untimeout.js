import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "untimeout",
  aliases: ["unmute", "فك-الكتم", "الغاء-الكتم"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("فك الكتم / العزل عن عضو (Untimeout/Unmute a member)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد فك كتمه").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("السبب").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeInteraction(interaction, context) {
    const { guild, member: moderator } = interaction;
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "لا يوجد سبب محدد";

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة الأعضاء / فك الكتم (Moderate Members).", ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إدارة الأعضاء / فك الكتم (Moderate Members).", ephemeral: true });
    }

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({ content: "❌ هذا العضو ليس متواجداً في السيرفر.", ephemeral: true });
      }

      if (!targetMember.communicationDisabledUntilTimestamp) {
        return interaction.reply({ content: "❌ هذا العضو ليس مكتوماً بالأساس.", ephemeral: true });
      }

      if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.user.id !== guild.ownerId) {
        return interaction.reply({ content: "❌ لا يمكنك تعديل عزل عضو رتبته أعلى من رتبتك أو مساوية لها.", ephemeral: true });
      }
      if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({ content: "❌ لا يمكن للبوت تعديل عزل هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.", ephemeral: true });
      }

      await targetMember.timeout(null, reason);

      await targetUser.send(`🔊 تم فك الكتم عنك في سيرفر **${guild.name}**\nبواسطة: **${interaction.user.tag}**`).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor("#33ff33")
        .setTitle("🔊 تم فك الكتم (Untimeout) بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${interaction.user}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة فك كتم العضو.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ ليس لديك صلاحية إدارة الأعضاء / فك الكتم (Moderate Members).");
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إدارة الأعضاء / فك الكتم (Moderate Members).");
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply("❌ يرجى منشن العضو أو كتابة الآيدي الخاص به لفك الكتم.");
    }

    const reason = args.slice(1).join(" ") || "لا يوجد سبب محدد";
    const guild = message.guild;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return message.reply("❌ هذا العضو ليس متواجداً في السيرفر.");
      }

      if (!targetMember.communicationDisabledUntilTimestamp) {
        return message.reply("❌ هذا العضو ليس مكتوماً بالأساس.");
      }

      if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) {
        return message.reply("❌ لا يمكنك تعديل عزل عضو رتبته أعلى من رتبتك أو مساوية لها.");
      }
      if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
        return message.reply("❌ لا يمكن للبوت تعديل عزل هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.");
      }

      await targetMember.timeout(null, reason);

      await targetUser.send(`🔊 تم فك الكتم عنك في سيرفر **${guild.name}**\nبواسطة: **${message.author.tag}**`).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor("#33ff33")
        .setTitle("🔊 تم فك الكتم (Untimeout) بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${message.author}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة فك كتم العضو.");
    }
  }
};
