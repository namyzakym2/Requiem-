import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "kick",
  aliases: ["طرد"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("طرد عضو من السيرفر (Kick a member)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد طرده").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("السبب").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async executeInteraction(interaction, context) {
    const { guild, member: moderator } = interaction;
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "لا يوجد سبب محدد";

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية طرد الأعضاء (Kick Members).", ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية طرد الأعضاء (Kick Members).", ephemeral: true });
    }

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({ content: "❌ هذا العضو ليس متواجداً في السيرفر.", ephemeral: true });
      }
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا يمكنك طرد نفسك.", ephemeral: true });
      }
      if (targetUser.id === guild.ownerId) {
        return interaction.reply({ content: "❌ لا يمكنك طرد مالك السيرفر.", ephemeral: true });
      }

      if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.user.id !== guild.ownerId) {
        return interaction.reply({ content: "❌ لا يمكنك طرد عضو رتبته أعلى من رتبتك أو مساوية لها.", ephemeral: true });
      }
      if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({ content: "❌ لا يمكن للبوت طرد هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.", ephemeral: true });
      }
      if (!targetMember.kickable) {
        return interaction.reply({ content: "❌ لا يمكن طرد هذا العضو.", ephemeral: true });
      }

      // Try sending a DM to the user before kicking
      await targetUser.send(`⚠️ تم طردك من سيرفر **${guild.name}**\nالسبب: **${reason}**`).catch(() => {});

      await targetMember.kick(reason);

      const embed = new EmbedBuilder()
        .setColor("#ffaa00")
        .setTitle("👢 تم الطرد بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${interaction.user}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة طرد العضو.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply("❌ ليس لديك صلاحية طرد الأعضاء (Kick Members).");
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية طرد الأعضاء (Kick Members).");
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply("❌ يرجى منشن العضو أو كتابة الآيدي الخاص به لطرده.");
    }

    const reason = args.slice(1).join(" ") || "لا يوجد سبب محدد";
    const guild = message.guild;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return message.reply("❌ هذا العضو ليس متواجداً في السيرفر.");
      }
      if (targetUser.id === message.author.id) {
        return message.reply("❌ لا يمكنك طرد نفسك.");
      }
      if (targetUser.id === guild.ownerId) {
        return message.reply("❌ لا يمكنك طرد مالك السيرفر.");
      }

      if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) {
        return message.reply("❌ لا يمكنك طرد عضو رتبته أعلى من رتبتك أو مساوية لها.");
      }
      if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
        return message.reply("❌ لا يمكن للبوت طرد هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.");
      }
      if (!targetMember.kickable) {
        return message.reply("❌ لا يمكن طرد هذا العضو.");
      }

      await targetUser.send(`⚠️ تم طردك من سيرفر **${guild.name}**\nالسبب: **${reason}**`).catch(() => {});

      await targetMember.kick(reason);

      const embed = new EmbedBuilder()
        .setColor("#ffaa00")
        .setTitle("👢 تم الطرد بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${message.author}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة طرد العضو.");
    }
  }
};
