import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from "discord.js";

export default {
  name: "set_log",
  aliases: ["set-log", "سجل", "سجلات", "logs"],
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("set_log")
    .setDescription("🛡️ ضبط قناة السجلات الإدارية واللوقات (Configure moderation logs channel)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("القناة المراد إرسال السجلات إليها (The log channel)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild, member, options } = interaction;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الأمر مخصص لمدراء السيرفر فقط (Administrator).", ephemeral: true });
    }

    const channel = options.getChannel("channel", true);

    try {
      db.prepare(`
        INSERT INTO logging_settings (
          guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
          logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
          logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents, logBotAdd,
          logRoleCreate, logRoleDelete, logChannelCreate, logChannelDelete, logMemberBan,
          logMemberUnban, logNicknameChange
        ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
        ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId
      `).run(guild.id, channel.id);

      const embed = new EmbedBuilder()
        .setColor("#3b82f6")
        .setTitle("🛡️ تم ضبط نظام السجلات واللوقات بنجاح")
        .setDescription(`تم تحديد قناة السجلات لتكون: ${channel}\n\n**السجلات المفعلة حالياً:**\n• 🗑️ حذف الرسائل\n• 📝 تعديل الرسائل\n• 📥 دخول الأعضاء\n• 📤 خروج الأعضاء\n• 🛡️ تحديث الرتب والقنوات\n• 🔊 الحالات الصوتية\n• 🏷️ تغيير الألقاب`)
        .setTimestamp()
        .setFooter({ text: `تم الضبط بواسطة: ${interaction.user.tag}` });

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error setting logs channel:", err);
      return interaction.reply({ content: "❌ حدث خطأ داخلي أثناء محاولة ضبط قناة السجلات.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const { guild, member } = message;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ هذا الأمر مخصص لمدراء السيرفر فقط (Administrator).");
    }

    const channel = message.mentions.channels.first();

    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply("❌ يرجى منشن قناة كتابية صالحة! مثال: `set_log #logs`.");
    }

    try {
      db.prepare(`
        INSERT INTO logging_settings (
          guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
          logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
          logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents, logBotAdd,
          logRoleCreate, logRoleDelete, logChannelCreate, logChannelDelete, logMemberBan,
          logMemberUnban, logNicknameChange
        ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
        ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId
      `).run(guild.id, channel.id);

      const embed = new EmbedBuilder()
        .setColor("#3b82f6")
        .setTitle("🛡️ تم ضبط نظام السجلات واللوقات بنجاح")
        .setDescription(`تم تحديد قناة السجلات لتكون: ${channel}\n\n**السجلات المفعلة حالياً:**\n• 🗑️ حذف الرسائل\n• 📝 تعديل الرسائل\n• 📥 دخول الأعضاء\n• 📤 خروج الأعضاء\n• 🛡️ تحديث الرتب والقنوات\n• 🔊 الحالات الصوتية\n• 🏷️ تغيير الألقاب`)
        .setTimestamp()
        .setFooter({ text: `تم الضبط بواسطة: ${message.author.tag}` });

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error setting logs channel text:", err);
      return message.reply("❌ حدث خطأ داخلي أثناء محاولة ضبط قناة السجلات.");
    }
  }
};
