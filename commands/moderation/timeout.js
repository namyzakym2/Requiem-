import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

function parseDuration(str) {
  if (!str) return 10 * 60 * 1000; // Default 10 mins
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
  }
  return null;
}

export default {
  name: "timeout",
  aliases: ["mute", "كتم", "ميوت", "اسكات"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("كتم / عزل عضو لفترة معينة (Timeout/Mute a member)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد كتمه").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("duration")
        .setDescription("المدة (أمثلة: 10m, 1h, 1d) أو اختر من القائمة")
        .setRequired(true)
        .addChoices(
          { name: "60 ثانية", value: "60s" },
          { name: "5 دقائق", value: "5m" },
          { name: "10 دقائق", value: "10m" },
          { name: "1 ساعة", value: "1h" },
          { name: "1 يوم", value: "1d" },
          { name: "1 أسبوع", value: "7d" }
        )
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("السبب").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeInteraction(interaction, context) {
    const { guild, member: moderator } = interaction;
    const targetUser = interaction.options.getUser("target");
    const durationStr = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "لا يوجد سبب محدد";

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة الأعضاء / الكتم (Moderate Members).", ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إدارة الأعضاء / الكتم (Moderate Members).", ephemeral: true });
    }

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({ content: "❌ هذا العضو ليس متواجداً في السيرفر.", ephemeral: true });
      }
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا يمكنك كتم نفسك.", ephemeral: true });
      }
      if (targetUser.id === guild.ownerId) {
        return interaction.reply({ content: "❌ لا يمكنك كتم مالك السيرفر.", ephemeral: true });
      }

      if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.user.id !== guild.ownerId) {
        return interaction.reply({ content: "❌ لا يمكنك كتم عضو رتبته أعلى من رتبتك أو مساوية لها.", ephemeral: true });
      }
      if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({ content: "❌ لا يمكن للبوت كتم هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.", ephemeral: true });
      }

      const durationMs = parseDuration(durationStr);
      if (!durationMs || durationMs <= 0) {
        return interaction.reply({ content: "❌ صيغة الوقت غير صحيحة. استخدم صيغة مثل: 10m, 1h, 1d.", ephemeral: true });
      }

      // Try sending a DM
      await targetUser.send(`⚠️ تم كتمك مؤقتاً في سيرفر **${guild.name}** لمدة **${durationStr}**\nالسبب: **${reason}**`).catch(() => {});

      await targetMember.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🔇 تم الكتم (Timeout) بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**المدة:** ${durationStr}\n**بواسطة:** ${interaction.user}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة كتم العضو.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ ليس لديك صلاحية إدارة الأعضاء / الكتم (Moderate Members).");
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إدارة الأعضاء / الكتم (Moderate Members).");
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply("❌ يرجى منشن العضو أو كتابة الآيدي الخاص به لكتمه.");
    }

    const durationStr = args[1] || "10m";
    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs <= 0) {
      return message.reply("❌ صيغة الوقت غير صحيحة. أمثلة: `10m` لدقائق، `1h` لساعات، `1d` لأيام.");
    }

    const reason = args.slice(2).join(" ") || "لا يوجد سبب محدد";
    const guild = message.guild;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return message.reply("❌ هذا العضو ليس متواجداً في السيرفر.");
      }
      if (targetUser.id === message.author.id) {
        return message.reply("❌ لا يمكنك كتم نفسك.");
      }
      if (targetUser.id === guild.ownerId) {
        return message.reply("❌ لا يمكنك كتم مالك السيرفر.");
      }

      if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) {
        return message.reply("❌ لا يمكنك كتم عضو رتبته أعلى من رتبتك أو مساوية لها.");
      }
      if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
        return message.reply("❌ لا يمكن للبوت كتم هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها.");
      }

      await targetUser.send(`⚠️ تم كتمك مؤقتاً في سيرفر **${guild.name}** لمدة **${durationStr}**\nالسبب: **${reason}**`).catch(() => {});

      await targetMember.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🔇 تم الكتم (Timeout) بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**المدة:** ${durationStr}\n**بواسطة:** ${message.author}\n**السبب:** ${reason}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة كتم العضو.");
    }
  }
};
