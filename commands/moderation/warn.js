import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "warn",
  aliases: ["تحذير", "انذار", "إنذار"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("تحذير عضو وإضافة الإنذار للسجل (Warn a member)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد تحذيره").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("السبب").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild, member: moderator } = interaction;
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية تحذير الأعضاء (Moderate Members).", ephemeral: true });
    }

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا يمكنك تحذير نفسك.", ephemeral: true });
      }
      if (targetUser.bot) {
        return interaction.reply({ content: "❌ لا يمكنك تحذير البوتات.", ephemeral: true });
      }

      if (targetMember) {
        if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.user.id !== guild.ownerId) {
          return interaction.reply({ content: "❌ لا يمكنك تحذير عضو رتبته أعلى من رتبتك أو مساوية لها.", ephemeral: true });
        }
      }

      // Insert warning into database
      db.prepare("INSERT INTO warnings (guildId, userId, reason, moderatorId) VALUES (?, ?, ?, ?)")
        .run(guild.id, targetUser.id, reason, interaction.user.id);

      // Fetch total warnings for this user
      const countRow = db.prepare("SELECT COUNT(*) as count FROM warnings WHERE guildId = ? AND userId = ?").get(guild.id, targetUser.id);
      const warnCount = countRow ? countRow.count : 1;

      // Try sending a DM
      await targetUser.send(`⚠️ لقد تلقيت تحذيراً في سيرفر **${guild.name}**\nالسبب: **${reason}**\nإجمالي تحذيراتك الآن: **${warnCount}**`).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor("#ffa500")
        .setTitle("⚠️ تم تسجيل التحذير بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${interaction.user}\n**السبب:** ${reason}\n**عدد تحذيرات العضو الحالية:** \`${warnCount}\``)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء تسجيل التحذير.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ ليس لديك صلاحية تحذير الأعضاء (Moderate Members).");
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply("❌ يرجى منشن العضو أو كتابة الآيدي الخاص به لتحذيره.");
    }

    const reason = args.slice(1).join(" ");
    if (!reason) {
      return message.reply("❌ يرجى كتابة سبب التحذير. مثال: `warn @user سب وشتم`.");
    }

    const guild = message.guild;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (targetUser.id === message.author.id) {
        return message.reply("❌ لا يمكنك تحذير نفسك.");
      }
      if (targetUser.bot) {
        return message.reply("❌ لا يمكنك تحذير البوتات.");
      }

      if (targetMember) {
        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) {
          return message.reply("❌ لا يمكنك تحذير عضو رتبته أعلى من رتبتك أو مساوية لها.");
        }
      }

      // Insert warning into database
      db.prepare("INSERT INTO warnings (guildId, userId, reason, moderatorId) VALUES (?, ?, ?, ?)")
        .run(guild.id, targetUser.id, reason, message.author.id);

      // Fetch total warnings for this user
      const countRow = db.prepare("SELECT COUNT(*) as count FROM warnings WHERE guildId = ? AND userId = ?").get(guild.id, targetUser.id);
      const warnCount = countRow ? countRow.count : 1;

      // Try sending a DM
      await targetUser.send(`⚠️ لقد تلقيت تحذيراً في سيرفر **${guild.name}**\nالسبب: **${reason}**\nإجمالي تحذيراتك الآن: **${warnCount}**`).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor("#ffa500")
        .setTitle("⚠️ تم تسجيل التحذير بنجاح")
        .setDescription(`**المستهدف:** ${targetUser} (${targetUser.tag})\n**بواسطة:** ${message.author}\n**السبب:** ${reason}\n**عدد تحذيرات العضو الحالية:** \`${warnCount}\``)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء تسجيل التحذير.");
    }
  }
};
