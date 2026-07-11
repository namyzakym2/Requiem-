import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "set_automod",
  aliases: ["set-automod", "حماية", "الحماية", "automod"],
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("set_automod")
    .setDescription("🛡️ إعداد نظام الحماية التلقائي والأنلوك (Configure AutoMod & protection settings)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(option => 
      option.setName("anti_link")
        .setDescription("منع الروابط غير المصرح بها (Block links)")
        .setRequired(true)
    )
    .addBooleanOption(option => 
      option.setName("anti_spam")
        .setDescription("منع السبام والتكرار السريع للرسائل (Block message spam)")
        .setRequired(true)
    )
    .addBooleanOption(option => 
      option.setName("anti_raid")
        .setDescription("حماية السيرفر من هجمات الانضمام المكثف (Anti-Raid join protection)")
        .setRequired(true)
    )
    .addBooleanOption(option => 
      option.setName("anti_bot")
        .setDescription("منع البوتات الغريبة من الدخول (Anti-Bot entry)")
        .setRequired(true)
    )
    .addBooleanOption(option => 
      option.setName("anti_nuke")
        .setDescription("حماية من تخريب السيرفر وحذف الرومات/الرتب (Anti-Nuke channel/role delete)")
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName("nuke_limit")
        .setDescription("الحد الأقصى لحذف الرومات/الرتب قبل الحظر التلقائي (Nuke limit count, default 3)")
        .setRequired(false)
    ),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild, member, options } = interaction;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الأمر مخصص لمدراء السيرفر فقط (Administrator).", ephemeral: true });
    }

    const antiLink = options.getBoolean("anti_link") ? 1 : 0;
    const antiSpam = options.getBoolean("anti_spam") ? 1 : 0;
    const antiRaid = options.getBoolean("anti_raid") ? 1 : 0;
    const antiBot = options.getBoolean("anti_bot") ? 1 : 0;
    const antiNuke = options.getBoolean("anti_nuke") ? 1 : 0;
    const nukeLimit = options.getInteger("nuke_limit") || 3;

    try {
      db.prepare(`
        INSERT INTO protection_settings (
          guildId, antiLink, antiSpam, antiRaid, antiBot, antiNuke, nukeLimit, antiChannelControl, antiRoleControl, counterNuke
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET 
          antiLink = excluded.antiLink,
          antiSpam = excluded.antiSpam,
          antiRaid = excluded.antiRaid,
          antiBot = excluded.antiBot,
          antiNuke = excluded.antiNuke,
          nukeLimit = excluded.nukeLimit,
          antiChannelControl = excluded.antiNuke,
          antiRoleControl = excluded.antiNuke,
          counterNuke = excluded.antiNuke
      `).run(guild.id, antiLink, antiSpam, antiRaid, antiBot, antiNuke, nukeLimit, antiNuke, antiNuke, antiNuke);

      const embed = new EmbedBuilder()
        .setColor("#10b981")
        .setTitle("🛡️ تم تحديث إعدادات الحماية والـ AutoMod")
        .addFields(
          { name: "🔗 منع الروابط (Anti-Link)", value: antiLink === 1 ? "🟢 مفعل (Enabled)" : "🔴 معطل (Disabled)", inline: true },
          { name: "💬 منع السبام (Anti-Spam)", value: antiSpam === 1 ? "🟢 مفعل (Enabled)" : "🔴 معطل (Disabled)", inline: true },
          { name: "🚀 حماية الهجمات (Anti-Raid)", value: antiRaid === 1 ? "🟢 مفعل (Enabled)" : "🔴 معطل (Disabled)", inline: true },
          { name: "🤖 حماية البوتات (Anti-Bot)", value: antiBot === 1 ? "🟢 مفعل (Enabled)" : "🔴 معطل (Disabled)", inline: true },
          { name: "💥 حماية التخريب (Anti-Nuke)", value: antiNuke === 1 ? `🟢 مفعل (حد الحذف: ${nukeLimit})` : "🔴 معطل (Disabled)", inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `تم التحديث بواسطة: ${interaction.user.tag}` });

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in set_automod:", err);
      return interaction.reply({ content: "❌ حدث خطأ داخلي أثناء حفظ إعدادات الحماية.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const { guild, member } = message;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ هذا الأمر مخصص لمدراء السيرفر فقط (Administrator).");
    }

    const printHelp = () => {
      const embed = new EmbedBuilder()
        .setColor("#3b82f6")
        .setTitle("🛡️ دليل استخدام أمر الحماية (AutoMod Help)")
        .setDescription("الرجاء تحديد نوع الحماية لتفعيلها/تعطيلها:\nاستخدم `on` للتفعيل أو `off` للتعطيل.")
        .addFields(
          { name: "🔗 منع الروابط", value: `\`set_automod link [on/off]\``, inline: true },
          { name: "💬 منع السبام", value: `\`set_automod spam [on/off]\``, inline: true },
          { name: "🚀 حماية الهجمات", value: `\`set_automod raid [on/off]\``, inline: true },
          { name: "🤖 منع البوتات", value: `\`set_automod bot [on/off]\``, inline: true },
          { name: "💥 حماية التخريب", value: `\`set_automod nuke [on/off] [حد الحذف]\``, inline: true }
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    };

    if (args.length < 2) {
      return printHelp();
    }

    const type = args[0].toLowerCase();
    const state = args[1].toLowerCase();
    const isEnable = state === "on" || state === "yes" || state === "true" || state === "1" || state === "تفعيل";

    try {
      // Get current protection settings or defaults
      let current = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id);
      if (!current) {
        current = { guildId: guild.id, antiLink: 0, antiSpam: 0, antiRaid: 0, antiBot: 0, antiNuke: 0, nukeLimit: 3, antiChannelControl: 0, antiRoleControl: 0, counterNuke: 0 };
      }

      if (type === "link") {
        current.antiLink = isEnable ? 1 : 0;
      } else if (type === "spam") {
        current.antiSpam = isEnable ? 1 : 0;
      } else if (type === "raid") {
        current.antiRaid = isEnable ? 1 : 0;
      } else if (type === "bot") {
        current.antiBot = isEnable ? 1 : 0;
      } else if (type === "nuke") {
        current.antiNuke = isEnable ? 1 : 0;
        current.antiChannelControl = isEnable ? 1 : 0;
        current.antiRoleControl = isEnable ? 1 : 0;
        current.counterNuke = isEnable ? 1 : 0;
        if (args[2] && !isNaN(args[2])) {
          current.nukeLimit = parseInt(args[2]);
        }
      } else {
        return printHelp();
      }

      db.prepare(`
        INSERT INTO protection_settings (
          guildId, antiLink, antiSpam, antiRaid, antiBot, antiNuke, nukeLimit, antiChannelControl, antiRoleControl, counterNuke
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET 
          antiLink = excluded.antiLink,
          antiSpam = excluded.antiSpam,
          antiRaid = excluded.antiRaid,
          antiBot = excluded.antiBot,
          antiNuke = excluded.antiNuke,
          nukeLimit = excluded.nukeLimit,
          antiChannelControl = excluded.antiChannelControl,
          antiRoleControl = excluded.antiRoleControl,
          counterNuke = excluded.counterNuke
      `).run(
        guild.id,
        current.antiLink,
        current.antiSpam,
        current.antiRaid,
        current.antiBot,
        current.antiNuke,
        current.nukeLimit,
        current.antiChannelControl,
        current.antiRoleControl,
        current.counterNuke
      );

      const stateStr = isEnable ? "🟢 تم التفعيل" : "🔴 تم التعطيل";
      return message.reply(`✅ تم تحديث إعدادات الحماية: **${type}** ليكون **${stateStr}**.`);
    } catch (err) {
      console.error("Error in set_automod text command:", err);
      return message.reply("❌ حدث خطأ داخلي أثناء معالجة الأمر.");
    }
  }
};
