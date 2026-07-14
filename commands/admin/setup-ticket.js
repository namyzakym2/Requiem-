import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "setup-ticket",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("setup-ticket")
    .setDescription("إنشاء لوحة نظام تذاكر الدعم الفني الحديثة (Select Menu)")
    .addRoleOption((option) => option.setName("role").setDescription("رتبة الدعم الفني التي سيتم الإشارة إليها").setRequired(true)),
  
  async executeInteraction(interaction, context) {
    const { client, db } = context;
    let { user, guild } = interaction;
    
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ يجب أن تمتلك صلاحيات Administrator لاستخدام هذا الأمر.", ephemeral: true });
    }
    
    const role = interaction.options.getRole("role");
    db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guild.id, role.id);
    
    const settings = db.prepare("SELECT * FROM ticket_settings WHERE guildId = ?").get(guild.id);
    const categories = db.prepare("SELECT * FROM ticket_categories WHERE guildId = ?").all(guild.id);

    const title = settings?.ticketTitle || "🎫 مركز الدعم الفني والمساعدة - Requiem Support";
    const description = settings?.ticketDescription || "أهلاً بك في نظام التذاكر المتطور الخاص بـ **Requiem**.\n\nيرجى تحديد القسم المناسب لمشكلتك من القائمة المنسدلة أدناه لفتح تذكرة جديدة وسيقوم فريقنا بمساعدتك فوراً.";
    const placeholder = settings?.ticketPlaceholder || "👇 اختر القسم الذي تود فتح تذكرة فيه...";

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x8a2be2)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: "نظام التذاكر الحديث - Requiem", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    if (settings?.imageUrl) {
      embed.setImage(settings.imageUrl);
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select_menu")
      .setPlaceholder(placeholder);

    if (categories && categories.length > 0) {
      const options = categories.map(cat => 
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.label || cat.categoryName || cat.name)
          .setDescription(cat.description || "قناة مخصصة لفتح تذكرة دعم")
          .setValue(cat.categoryName || cat.name)
          .setEmoji(cat.emoji || "🎫")
      );
      selectMenu.addOptions(options);
    } else {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("الدعم الفني والتقني")
          .setDescription("للمشاكل التقنية، الأخطاء، وحلول البوت والويب")
          .setValue("tech_support")
          .setEmoji("🛠️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("الحسابات والمبيعات والبريميوم")
          .setDescription("لشراء الرون، تفعيل البريميوم، والمشاكل المالية")
          .setValue("sales")
          .setEmoji("💳"),
        new StringSelectMenuOptionBuilder()
          .setLabel("الشكاوى والاقتراحات")
          .setDescription("لتقديم اقتراح لتطوير البوت أو شكوى بخصوص عضو/مشرف")
          .setValue("complaints")
          .setEmoji("🤝")
      );
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const botMember = guild.members.me;
    if (!botMember?.permissionsIn(interaction.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.", ephemeral: true });
    }
    await interaction.channel?.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ تم إرسال لوحة التذاكر المنسدلة بنجاح! وتم تعيين رتبة الدعم لـ <@&${role.id}>.`, ephemeral: true });
  },

  async executeMessage(message, args, context) {
    const { client, db } = context;
    const guildId = message.guild.id;
    
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ يجب أن تمتلك صلاحيات Administrator لاستخدام هذا الأمر.");
    }
    
    const role = message.mentions.roles.first();
    if (!role) return message.reply("الاستخدام الصحيح: setup-ticket <@role>");
    db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guildId, role.id);
    
    const settings = db.prepare("SELECT * FROM ticket_settings WHERE guildId = ?").get(guildId);
    const categories = db.prepare("SELECT * FROM ticket_categories WHERE guildId = ?").all(guildId);

    const title = settings?.ticketTitle || "🎫 مركز الدعم الفني والمساعدة - Requiem Support";
    const description = settings?.ticketDescription || "أهلاً بك في نظام التذاكر المتطور الخاص بـ **Requiem**.\n\nيرجى تحديد القسم المناسب لمشكلتك من القائمة المنسدلة أدناه لفتح تذكرة جديدة وسيقوم فريقنا بمساعدتك فوراً.";
    const placeholder = settings?.ticketPlaceholder || "👇 اختر القسم الذي تود فتح تذكرة فيه...";

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x8a2be2)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: "نظام التذاكر الحديث - Requiem", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    if (settings?.imageUrl) {
      embed.setImage(settings.imageUrl);
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select_menu")
      .setPlaceholder(placeholder);

    if (categories && categories.length > 0) {
      const options = categories.map(cat => 
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.label || cat.categoryName || cat.name)
          .setDescription(cat.description || "قناة مخصصة لفتح تذكرة دعم")
          .setValue(cat.categoryName || cat.name)
          .setEmoji(cat.emoji || "🎫")
      );
      selectMenu.addOptions(options);
    } else {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("الدعم الفني والتقني")
          .setDescription("للمشاكل التقنية، الأخطاء، وحلول البوت والويب")
          .setValue("tech_support")
          .setEmoji("🛠️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("الحسابات والمبيعات والبريميوم")
          .setDescription("لشراء الرون، تفعيل البريميوم، والمشاكل المالية")
          .setValue("sales")
          .setEmoji("💳"),
        new StringSelectMenuOptionBuilder()
          .setLabel("الشكاوى والاقتراحات")
          .setDescription("لتقديم اقتراح لتطوير البوت أو شكوى بخصوص عضو/مشرف")
          .setValue("complaints")
          .setEmoji("🤝")
      );
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const botMember = message.guild?.members.me;
    if (!botMember?.permissionsIn(message.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.");
    }
    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply(`✅ تم إرسال لوحة التذاكر المنسدلة بنجاح! وتم تعيين رتبة الدعم لـ <@&${role.id}>.`);
  }
};
