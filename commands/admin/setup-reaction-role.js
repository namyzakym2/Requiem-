import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "setup-reaction-role",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("setup-reaction-role")
    .setDescription("إعداد التفاعل للحصول على رتبة (Reaction Role)")
    .addStringOption(option => option.setName("message_id").setDescription("معرف الرسالة (Message ID)").setRequired(true))
    .addStringOption(option => option.setName("emoji").setDescription("الإيموجي").setRequired(true))
    .addRoleOption(option => option.setName("role").setDescription("الرتبة التي سيحصل عليها العضو").setRequired(true)),
    
  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild } = interaction;
    
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    const messageId = interaction.options.getString("message_id");
    const emoji = interaction.options.getString("emoji");
    const role = interaction.options.getRole("role");
    
    let targetMessage = null;
    const channels = await guild.channels.fetch();
    for (const [id, channel] of channels) {
      if (channel && channel.isTextBased()) {
        try {
          targetMessage = await channel.messages.fetch(messageId);
          if (targetMessage) break;
        } catch {}
      }
    }
    
    if (!targetMessage) {
      return interaction.editReply({ content: "❌ لم يتم العثور على الرسالة في أي روم. تأكد من صحة معرف الرسالة (Message ID)." });
    }
    
    try {
      db.prepare("INSERT INTO reaction_roles (guildId, messageId, emoji, roleId) VALUES (?, ?, ?, ?) ON CONFLICT(guildId, messageId, emoji) DO UPDATE SET roleId = excluded.roleId")
        .run(guild.id, messageId, emoji, role.id);
      
      await targetMessage.react(emoji).catch(() => {});
      
      return interaction.editReply({ content: `✅ تم إعداد رتبة التفاعل بنجاح!\nالرسالة: ${targetMessage.url}\nالإيموجي: ${emoji}\nالرتبة: ${role}` });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: "❌ حدث خطأ أثناء حفظ الإعدادات." });
    }
  },
  
  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ هذا الأمر للمسؤولين فقط.");
    }
    
    if (args.length < 3) {
      return message.reply(`❌ الاستخدام الصحيح: \`${PREFIX}setup-reaction-role <message_id> <emoji> <@role>\``);
    }
    
    const messageId = args[0];
    const emoji = args[1];
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
    
    if (!role) {
      return message.reply("❌ يرجى تحديد رتبة صالحة.");
    }
    
    let targetMessage = null;
    const channels = await message.guild.channels.fetch();
    for (const [id, channel] of channels) {
      if (channel && channel.isTextBased()) {
        try {
          targetMessage = await channel.messages.fetch(messageId);
          if (targetMessage) break;
        } catch {}
      }
    }
    
    if (!targetMessage) {
      return message.reply("❌ لم يتم العثور على الرسالة في أي روم. تأكد من صحة معرف الرسالة.");
    }
    
    try {
      db.prepare("INSERT INTO reaction_roles (guildId, messageId, emoji, roleId) VALUES (?, ?, ?, ?) ON CONFLICT(guildId, messageId, emoji) DO UPDATE SET roleId = excluded.roleId")
        .run(message.guild.id, messageId, emoji, role.id);
      
      await targetMessage.react(emoji).catch(() => {});
      
      return message.reply(`✅ تم إعداد رتبة التفاعل بنجاح!\nالرسالة: ${targetMessage.url}\nالإيموجي: ${emoji}\nالرتبة: ${role}`);
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء حفظ الإعدادات.");
    }
  }
};
