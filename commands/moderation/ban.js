import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "ban",
  aliases: ["طرد-نهائي", "باند", "حظر"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("حظر عضو من السيرفر (Ban a member)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد حظره").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("السبب").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async executeInteraction(interaction, context) {
    const { guild, member: moderator } = interaction;
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "لا يوجد سبب محدد";

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية حظر الأعضاء (Ban Members).", ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية حظر الأعضاء (Ban Members).", ephemeral: true });
    }

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا يمكنك حظر نفسك.", ephemeral: true });
      }
      if (targetUser.id === guild.ownerId) {
        return interaction.reply({ content: "❌ لا يمكنك حظر مالك السيرفر.", ephemeral: true });
      }

      if (targetMember) {
        if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.user.id !== guild.ownerId) {
          return interaction.reply({ content: "❌ لا يمكنك حظر عضو رتبته أعلى من رتبتك أو مساوية لها.", ephemeral: true });
        }
        if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
          return interaction.reply({ content: "❌ لا يمكن للبوت حظر هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.", ephemeral: true });
        }
        if (!targetMember.bannable) {
          return interaction.reply({ content: "❌ لا يمكن حظر هذا العضو.", ephemeral: true });
        }
      }

      // Try sending a DM to the user before banning
      await targetUser.send(`⚠️ تم حظرك من سيرفر **${guild.name}**\nالسبب: **${reason}**`).catch(() => {});

      await guild.members.ban(targetUser.id, { reason });

      const embed = new EmbedBuilder()
        .setColor("#ff3333")
        .setTitle("🔨 تم الحظر بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${interaction.user}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة حظر العضو.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply("❌ ليس لديك صلاحية حظر الأعضاء (Ban Members).");
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية حظر الأعضاء (Ban Members).");
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply("❌ يرجى منشن العضو أو كتابة الآيدي الخاص به.");
    }

    const reason = args.slice(1).join(" ") || "لا يوجد سبب محدد";
    const guild = message.guild;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (targetUser.id === message.author.id) {
        return message.reply("❌ لا يمكنك حظر نفسك.");
      }
      if (targetUser.id === guild.ownerId) {
        return message.reply("❌ لا يمكنك حظر مالك السيرفر.");
      }

      if (targetMember) {
        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) {
          return message.reply("❌ لا يمكنك حظر عضو رتبته أعلى من رتبتك أو مساوية لها.");
        }
        if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
          return message.reply("❌ لا يمكن للبوت حظر هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.");
        }
        if (!targetMember.bannable) {
          return message.reply("❌ لا يمكن حظر هذا العضو.");
        }
      }

      await targetUser.send(`⚠️ تم حظرك من سيرفر **${guild.name}**\nالسبب: **${reason}**`).catch(() => {});

      await guild.members.ban(targetUser.id, { reason });

      const embed = new EmbedBuilder()
        .setColor("#ff3333")
        .setTitle("🔨 تم الحظر بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${message.author}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة حظر العضو.");
    }
  }
};
