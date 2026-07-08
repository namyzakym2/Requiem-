import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "warnings",
  aliases: ["انذارات", "تحذيرات", "infractions", "warns"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("عرض أو مسح تحذيرات عضو معين (View or clear member warnings)")
    .addSubcommand((sub) =>
      sub
        .setName("show")
        .setDescription("عرض تحذيرات العضو")
        .addUserOption((option) =>
          option.setName("target").setDescription("العضو المراد عرض تحذيراته").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("clear")
        .setDescription("مسح جميع تحذيرات العضو")
        .addUserOption((option) =>
          option.setName("target").setDescription("العضو المراد مسح تحذيراته").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild } = interaction;
    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("target");

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة التحذيرات (Moderate Members).", ephemeral: true });
    }

    if (sub === "show") {
      try {
        const rows = db.prepare("SELECT * FROM warnings WHERE guildId = ? AND userId = ? ORDER BY createdAt DESC").all(guild.id, targetUser.id);

        if (rows.length === 0) {
          return interaction.reply({ content: `✅ العضو **${targetUser.tag}** ليس لديه أي تحذيرات مسجلة.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor("#ffa500")
          .setTitle(`⚠️ سجل التحذيرات لـ ${targetUser.username}`)
          .setDescription(`إجمالي التحذيرات: **${rows.length}**`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        rows.forEach((row, index) => {
          embed.addFields({
            name: `الإنذار #${rows.length - index}`,
            value: `**بواسطة:** <@${row.moderatorId}>\n**السبب:** ${row.reason || "بدون سبب"}\n**التاريخ:** <t:${Math.floor(new Date(row.createdAt).getTime() / 1000)}:R>`,
            inline: false
          });
        });

        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ فشل جلب سجل التحذيرات.", ephemeral: true });
      }
    } else if (sub === "clear") {
      try {
        const deleted = db.prepare("DELETE FROM warnings WHERE guildId = ? AND userId = ?").run(guild.id, targetUser.id);

        if (deleted.changes === 0) {
          return interaction.reply({ content: `❌ هذا العضو ليس لديه أي تحذيرات لمسحها.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor("#33ff33")
          .setDescription(`✅ **تم مسح جميع التحذيرات بنجاح لـ ${targetUser}**\nإجمالي التحذيرات الممسوحة: \`${deleted.changes}\`\nبواسطة: ${interaction.user}`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ حدث خطأ أثناء مسح التحذيرات.", ephemeral: true });
      }
    }
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ ليس لديك صلاحية إدارة التحذيرات (Moderate Members).");
    }

    const isClear = args[0] === "clear" || args[0] === "مسح" || args[0] === "delete";
    let targetUser = null;

    if (isClear) {
      // syntax: warnings clear @user
      targetUser = message.mentions.users.first() || (args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : null);
    } else {
      // syntax: warnings @user
      targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    }

    if (!targetUser) {
      return message.reply("❌ يرجى منشن العضو أو كتابة الآيدي الخاص به. أمثلة:\n`warnings @user` - لعرض التحذيرات\n`warnings clear @user` - لمسح التحذيرات");
    }

    const guild = message.guild;

    if (isClear) {
      try {
        const deleted = db.prepare("DELETE FROM warnings WHERE guildId = ? AND userId = ?").run(guild.id, targetUser.id);

        if (deleted.changes === 0) {
          return message.reply(`❌ هذا العضو ليس لديه أي تحذيرات لمسحها.`);
        }

        const embed = new EmbedBuilder()
          .setColor("#33ff33")
          .setDescription(`✅ **تم مسح جميع التحذيرات بنجاح لـ ${targetUser}**\nإجمالي التحذيرات الممسوحة: \`${deleted.changes}\`\nبواسطة: ${message.author}`)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return message.reply("❌ حدث خطأ أثناء مسح التحذيرات.");
      }
    } else {
      try {
        const rows = db.prepare("SELECT * FROM warnings WHERE guildId = ? AND userId = ? ORDER BY createdAt DESC").all(guild.id, targetUser.id);

        if (rows.length === 0) {
          return message.reply(`✅ العضو **${targetUser.tag}** ليس لديه أي تحذيرات مسجلة.`);
        }

        const embed = new EmbedBuilder()
          .setColor("#ffa500")
          .setTitle(`⚠️ سجل التحذيرات لـ ${targetUser.username}`)
          .setDescription(`إجمالي التحذيرات: **${rows.length}**`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        rows.forEach((row, index) => {
          embed.addFields({
            name: `الإنذار #${rows.length - index}`,
            value: `**بواسطة:** <@${row.moderatorId}>\n**السبب:** ${row.reason || "بدون سبب"}\n**التاريخ:** <t:${Math.floor(new Date(row.createdAt).getTime() / 1000)}:R>`,
            inline: false
          });
        });

        await message.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return message.reply("❌ فشل جلب سجل التحذيرات.");
      }
    }
  }
};
