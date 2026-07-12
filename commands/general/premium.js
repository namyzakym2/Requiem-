import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../src/lib/db.js";
import { isPremiumUser, n, C, E } from "../bank/utils.js";

export default {
  name: "premium",
  aliases: ["بريميوم", "مميز"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("premium")
    .setDescription("🌟 اشتراك البريميوم والميزات الخاصة لبوت Requiem")
    .addSubcommand(sub => sub
      .setName("buy")
      .setDescription("شراء اشتراك البريميوم لمدة 30 يوم مقابل 100 مليون")
    )
    .addSubcommand(sub => sub
      .setName("status")
      .setDescription("فحص حالة اشتراك البريميوم الخاص بك أو بعضو آخر")
      .addUserOption(o => o.setName("user").setDescription("العضو المراد فحص اشتراكه"))
    )
    .addSubcommand(sub => sub
      .setName("benefits")
      .setDescription("عرض جميع مميزات اشتراك البريميوم الرائعة")
    )
    .addSubcommand(sub => sub
      .setName("grant")
      .setDescription("منح اشتراك بريميوم لعضو (Admins Only)")
      .addUserOption(o => o.setName("user").setDescription("العضو المراد منحه البريميوم").setRequired(true))
      .addIntegerOption(o => o.setName("days").setDescription("عدد الأيام (افتراضي 30)").setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName("remove")
      .setDescription("إلغاء اشتراك البريميوم من عضو (Admins Only)")
      .addUserOption(o => o.setName("user").setDescription("العضو المراد إلغاء اشتراكه").setRequired(true))
    ),

  async executeInteraction(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === "buy") {
      const userBankRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, interaction.guildId);
      const balance = userBankRow?.xb || 0;
      
      if (balance < 100000000) {
        return interaction.reply({ 
          embeds: [E("❌ رصيد غير كافٍ").setDescription(`لشراء البريميوم, تحتاج إلى **100,000,000 رون** كاش في محفظتك.\nرصيدك الحالي: **${n(balance)} رون**`)], 
          ephemeral: true 
        });
      }

      db.prepare("UPDATE leveling SET xb = xb - 100000000 WHERE userId = ? AND guildId = ?").run(userId, interaction.guildId);
      
      // Update premium expiresAt
      const existing = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(userId);
      let currentExpiry = Date.now();
      if (existing && existing.expiresAt && new Date(existing.expiresAt) > new Date()) {
        currentExpiry = new Date(existing.expiresAt).getTime();
      }
      const expiresAt = new Date(currentExpiry + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("INSERT OR REPLACE INTO premium_users (userId, expiresAt) VALUES (?, ?)").run(userId, expiresAt);
      
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle("🎉 ألف مبروك! تم شراء اشتراك البريميوم")
        .setDescription(`تم تفعيل اشتراك البريميوم الخاص بك بنجاح على حسابك!\n\n📅 **تاريخ انتهاء الاشتراك:** \`${new Date(expiresAt).toLocaleDateString("ar-EG")} ${new Date(expiresAt).toLocaleTimeString("ar-EG")}\``)
        .addFields(
          { name: "👑 رصيدك المستقطع", value: "100,000,000 رون", inline: true },
          { name: "⚡ الميزات النشطة", value: "اكتب `'premium benefits` لمعرفة جميع ميزاتك الحالية!", inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === "status") {
      const targetUser = interaction.options.getUser("user") || interaction.user;
      const premiumRow = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(targetUser.id);
      const isPremium = premiumRow && premiumRow.expiresAt && new Date(premiumRow.expiresAt) > new Date();

      if (!isPremium) {
        return interaction.reply({
          embeds: [E("🔍 حالة الاشتراك").setDescription(`العضو <@${targetUser.id}> ليس لديه اشتراك بريميوم نشط حالياً. ❌\n\nشراء الاشتراك متاح بمبلغ **100,000,000 رون** باستخدام:\n\`'premium buy\``)]
        });
      }

      const expiryDate = new Date(premiumRow.expiresAt);
      const remMs = expiryDate.getTime() - Date.now();
      const remDays = Math.ceil(remMs / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle(`🌟 اشتراك بريميوم نشط! — ${targetUser.username}`)
        .setDescription(`العضو لديه ميزات البريميوم الفاخرة مفعلة بالكامل. ✨`)
        .addFields(
          { name: "📅 ينتهي في", value: `\`${expiryDate.toLocaleDateString("ar-EG")}\` (\`${expiryDate.toLocaleTimeString("ar-EG")}\`)`, inline: true },
          { name: "⏳ الوقت المتبقي", value: `**${remDays} يوم**`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === "benefits") {
      const embed = this.getBenefitsEmbed();
      return interaction.reply({ embeds: [embed] });
    }

    // Admin commands: grant and remove
    const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                    interaction.user.id === interaction.guild?.ownerId;

    if (!isAdmin) {
      return interaction.reply({ content: "❌ هذا الأمر خاص بإداريي السيرفر فقط.", ephemeral: true });
    }

    if (subcommand === "grant") {
      const targetUser = interaction.options.getUser("user");
      const days = interaction.options.getInteger("days") || 30;

      const existing = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(targetUser.id);
      let currentExpiry = Date.now();
      if (existing && existing.expiresAt && new Date(existing.expiresAt) > new Date()) {
        currentExpiry = new Date(existing.expiresAt).getTime();
      }
      const expiresAt = new Date(currentExpiry + days * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("INSERT OR REPLACE INTO premium_users (userId, expiresAt) VALUES (?, ?)").run(targetUser.id, expiresAt);

      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle("🌟 تم منح اشتراك بريميوم")
        .setDescription(`تم منح العضو <@${targetUser.id}> اشتراك بريميوم بنجاح!`)
        .addFields(
          { name: "⏳ مدة المنح", value: `**${days} يوم**`, inline: true },
          { name: "📅 ينتهي في", value: `\`${new Date(expiresAt).toLocaleDateString("ar-EG")}\``, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === "remove") {
      const targetUser = interaction.options.getUser("user");
      db.prepare("DELETE FROM premium_users WHERE userId = ?").run(targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("🚫 تم إلغاء البريميوم")
        .setDescription(`تم إلغاء / منع اشتراك البريميوم بنجاح عن العضو <@${targetUser.id}>.`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },

  async executeMessage(message, args) {
    const sub = args[0]?.toLowerCase();
    const userId = message.author.id;

    if (sub === "buy") {
      const userBankRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, message.guild.id);
      const balance = userBankRow?.xb || 0;
      
      if (balance < 100000000) {
        return message.reply({ 
          embeds: [E("❌ رصيد غير كافٍ").setDescription(`لشراء البريميوم, تحتاج إلى **100,000,000 رون** كاش في محفظتك.\nرصيدك الحالي: **${n(balance)} رون**`)]
        });
      }

      db.prepare("UPDATE leveling SET xb = xb - 100000000 WHERE userId = ? AND guildId = ?").run(userId, message.guild.id);
      
      const existing = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(userId);
      let currentExpiry = Date.now();
      if (existing && existing.expiresAt && new Date(existing.expiresAt) > new Date()) {
        currentExpiry = new Date(existing.expiresAt).getTime();
      }
      const expiresAt = new Date(currentExpiry + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("INSERT OR REPLACE INTO premium_users (userId, expiresAt) VALUES (?, ?)").run(userId, expiresAt);
      
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle("🎉 ألف مبروك! تم شراء اشتراك البريميوم")
        .setDescription(`تم تفعيل اشتراك البريميوم الخاص بك بنجاح على حسابك!\n\n📅 **تاريخ انتهاء الاشتراك:** \`${new Date(expiresAt).toLocaleDateString("ar-EG")} ${new Date(expiresAt).toLocaleTimeString("ar-EG")}\``)
        .addFields(
          { name: "👑 رصيدك المستقطع", value: "100,000,000 رون", inline: true },
          { name: "⚡ الميزات النشطة", value: "اكتب `'premium benefits` لمعرفة جميع ميزاتك الحالية!", inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL())
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (sub === "status") {
      const targetUser = message.mentions.users.first() || message.author;
      const premiumRow = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(targetUser.id);
      const isPremium = premiumRow && premiumRow.expiresAt && new Date(premiumRow.expiresAt) > new Date();

      if (!isPremium) {
        return message.reply({
          embeds: [E("🔍 حالة الاشتراك").setDescription(`العضو <@${targetUser.id}> ليس لديه اشتراك بريميوم نشط حالياً. ❌\n\nشراء الاشتراك متاح بمبلغ **100,000,000 رون** باستخدام:\n\`'premium buy\``)]
        });
      }

      const expiryDate = new Date(premiumRow.expiresAt);
      const remMs = expiryDate.getTime() - Date.now();
      const remDays = Math.ceil(remMs / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle(`🌟 اشتراك بريميوم نشط! — ${targetUser.username}`)
        .setDescription(`العضو لديه ميزات البريميوم الفاخرة مفعلة بالكامل. ✨`)
        .addFields(
          { name: "📅 ينتهي في", value: `\`${expiryDate.toLocaleDateString("ar-EG")}\` (\`${expiryDate.toLocaleTimeString("ar-EG")}\`)`, inline: true },
          { name: "⏳ الوقت المتبقي", value: `**${remDays} يوم**`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Admin commands execution via text commands
    if (sub === "grant" || sub === "give" || sub === "منح" || sub === "اضافة" || sub === "إضافة") {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                      message.author.id === message.guild?.ownerId;

      if (!isAdmin) return;

      const targetUser = message.mentions.users.first() || 
                         (args[1] && args[1].match(/^\d+$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);
      
      if (!targetUser) {
        return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو المراد منحه البريميوم.")] });
      }

      // Check for days in args
      let days = 30;
      for (const arg of args.slice(1)) {
        const parsed = parseInt(arg);
        if (!isNaN(parsed) && !arg.includes("<@")) {
          days = parsed;
          break;
        }
      }

      const existing = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(targetUser.id);
      let currentExpiry = Date.now();
      if (existing && existing.expiresAt && new Date(existing.expiresAt) > new Date()) {
        currentExpiry = new Date(existing.expiresAt).getTime();
      }
      const expiresAt = new Date(currentExpiry + days * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("INSERT OR REPLACE INTO premium_users (userId, expiresAt) VALUES (?, ?)").run(targetUser.id, expiresAt);

      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle("🌟 تم منح اشتراك بريميوم")
        .setDescription(`تم منح العضو <@${targetUser.id}> اشتراك بريميوم بنجاح!`)
        .addFields(
          { name: "⏳ مدة المنح", value: `**${days} يوم**`, inline: true },
          { name: "📅 ينتهي في", value: `\`${new Date(expiresAt).toLocaleDateString("ar-EG")}\``, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (sub === "remove" || sub === "block" || sub === "إلغاء" || sub === "الغاء" || sub === "منع" || sub === "سحب") {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                      message.author.id === message.guild?.ownerId;

      if (!isAdmin) return;

      const targetUser = message.mentions.users.first() || 
                         (args[1] && args[1].match(/^\d+$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);
      
      if (!targetUser) {
        return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو المراد إلغاء اشتراكه.")] });
      }

      db.prepare("DELETE FROM premium_users WHERE userId = ?").run(targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("🚫 تم إلغاء البريميوم")
        .setDescription(`تم إلغاء / منع اشتراك البريميوم بنجاح عن العضو <@${targetUser.id}>.`)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Default to benefits
    const embed = this.getBenefitsEmbed();
    return message.reply({ embeds: [embed] });
  },

  getBenefitsEmbed() {
    return new EmbedBuilder()
      .setColor(0xd4af37)
      .setTitle("🌟 ميزات اشتراك البريميوم الفاخر - Requiem Premium")
      .setDescription("انضم إلى نخبة البنك الماليين واكسب أرباحاً هائلة بميزات وخصومات خارقة:\n\n" +
        "**💵 راتب يومي مضاعف (Double Salary):**\n" +
        "• بدلاً من الراتب العادي، يحصل المشترك المميز على **ضعف الراتب اليومي (2x)** عند استخدام أمر `'راتب`!\n\n" +
        "**💼 ميزات وأرباح العمل (Amal Boost):**\n" +
        "• مكافأة إضافية بنسبة **+50%** على كل راتب تكسبه من أمر `'عمل`.\n" +
        "• تقليص وقت انتظار العمل (Cooldown) **بنسبة 50% كاملة** (يمكنك العمل كل **3 ساعات فقط** بدلاً من 6 ساعات!).\n\n" +
        "**💸 خصم رسوم التحويل الخرافي (Low Fees):**\n" +
        "• رسوم التحويل العادية للأعضاء هي **5%**. للمشترك المميز يتم خفض الرسوم إلى **1% فقط**!\n\n" +
        "**🎨 المظهر والهوية المميزة:**\n" +
        "• واجهة إمبد وتفاصيل ذهبية مخصصة لك في جميع المعاملات.\n" +
        "• إطار وشعارات ذهبية فاخرة في الويب وإحصائيات لوحة التحكم.\n\n" +
        "**🛒 سعر الاشتراك:**\n" +
        "• **100,000,000** رون كاش في محفظتك لمدة 30 يوماً كاملة!\n" +
        "• اشترِ الآن باستخدام الأمر: ` 'premium buy ` أو `/premium buy`"
      )
      .setFooter({ text: "سيرفر دعم ريكويم - Requiem Support Server" });
  }
};
