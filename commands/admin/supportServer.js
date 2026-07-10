import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { config } from "../../config.js";
import fs from "fs";
import path from "path";
import db from "../../src/lib/db.js";

export default {
  name: "support-server",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("support-server")
    .setDescription("إعداد السيرفر بالكامل مع الاختصارات، القوانين، إخفاء رومات الإدارة، وصلاحيات Administrator (للأونر فقط)"),
  async executeInteraction(interaction) {
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: "❌ هذا الأمر للأونر فقط.", ephemeral: true });
    }

    const guild = interaction.guild;
    const configPath = path.join(process.cwd(), "commands", "admin", "support_config.json");
    const supportConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

    await interaction.deferReply({ ephemeral: true });

    // 1. Delete channels
    for (const channel of guild.channels.cache.values()) {
      if (channel.id !== interaction.channelId) {
        try { await channel.delete(); } catch (e) { console.error(`Error deleting channel ${channel.name}:`, e); }
      }
    }

    // 2. Delete custom deletable roles
    for (const role of guild.roles.cache.values()) {
      if (role.name !== "@everyone" && role.managed === false && role.editable) {
        try {
          await role.delete();
        } catch (e) {
          console.error(`Error deleting role ${role.name}:`, e);
        }
      }
    }

    // 3. Create roles from configuration with Administrator permission where necessary
    let supportRoleId = "";
    const createdRolesByName = {};
    if (supportConfig.roles && Array.isArray(supportConfig.roles)) {
      for (const r of supportConfig.roles) {
        try {
          const permissions = [];
          if (r.name.includes("Owner") || r.name.includes("Developer") || r.name.includes("Support Manager")) {
            permissions.push(PermissionFlagsBits.Administrator);
          }
          const createdRole = await guild.roles.create({
            name: r.name,
            color: r.color,
            hoist: r.hoist ?? false,
            permissions,
            reason: "Requiem Support Server Setup"
          });
          createdRolesByName[r.name] = createdRole.id;
          if (r.name.includes("Support Team")) {
            supportRoleId = createdRole.id;
          }
        } catch (e) {
          console.error(`Error creating role ${r.name}:`, e);
        }
      }
    }

    // 4. Create channels and hide management/admin channels from @everyone
    let bankChannelIds = [];
    let welcomeChannelId = "";
    let explanationChannelId = "";
    let ticketChannelId = "";
    let rulesChannelId = "";

    for (const ch of supportConfig.channels) {
      const isManagement = ch.name.includes("الإدارة") || ch.name.includes("الرقابة") || ch.name.includes("ادارة") || ch.name.includes("سجل");
      const permissionOverwrites = [];

      if (isManagement) {
        // Hide from everyone
        permissionOverwrites.push({
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });

        // Grant access to Owner, Developer, Support Manager, Support Team
        const adminRoleNames = ["👑 | Owner", "🛠️ | Developer", "👮 | Support Manager", "🛡️ | Support Team"];
        for (const name of adminRoleNames) {
          const rId = createdRolesByName[name];
          if (rId) {
            permissionOverwrites.push({
              id: rId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            });
          }
        }
      }

      const created = await guild.channels.create({
        name: ch.name,
        type: ch.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText,
        permissionOverwrites
      });

      if (ch.name === "💻-كوماند-بنك-ويب" || ch.name === "💳-شات-بنك-ويب") {
        bankChannelIds.push(created.id);
      } else if (ch.name === "👋-الترحيب") {
        welcomeChannelId = created.id;
      } else if (ch.name === "📖-شرح-البوت") {
        explanationChannelId = created.id;
      } else if (ch.name === "🎫-تذاكر-الدعم") {
        ticketChannelId = created.id;
      } else if (ch.name === "📜-القوانين") {
        rulesChannelId = created.id;
      }
    }

    // 5. Database & Config Updates
    if (bankChannelIds.length > 0) {
      const settingsPath = path.join(process.cwd(), "commands", "bank", "data", "settings.json");
      let settingsObj = {};
      if (fs.existsSync(settingsPath)) {
        try {
          settingsObj = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch (e) {
          settingsObj = {};
        }
      }
      settingsObj.bankRoom = bankChannelIds.join(",");
      fs.writeFileSync(settingsPath, JSON.stringify(settingsObj, null, 2));
    }

    if (welcomeChannelId) {
      try {
        db.prepare("INSERT OR REPLACE INTO welcome_configs (guildId, channelId, message) VALUES (?, ?, ?)")
          .run(guild.id, welcomeChannelId, "👋 أهلاً بك يا {user} في سيرفر الدعم الخاص بـ **Requiem**! نوّرت السيرفر يا بطل 💖");
        db.prepare("INSERT INTO welcome_settings (guildId, channelId, message, enabled) VALUES (?, ?, ?, 1) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, message = excluded.message, enabled = 1")
          .run(guild.id, welcomeChannelId, "👋 أهلاً بك يا {user} في سيرفر الدعم الخاص بـ **Requiem**! نوّرت السيرفر يا بطل 💖");
      } catch (e) {
        console.error("Error setting welcome config in SQLite:", e);
      }
    }

    if (supportRoleId) {
      try {
        db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId")
          .run(guild.id, supportRoleId);
      } catch (e) {
        console.error("Error setting support role in SQLite:", e);
      }
    }

    // 6. Setup command aliases for this guild (as requested)
    try {
      const defaultAliases = [
        { alias: "رصيد", cmd: "balance" },
        { alias: "فلوس", cmd: "balance" },
        { alias: "تحويل", cmd: "transfer" },
        { alias: "راتب", cmd: "salary" },
        { alias: "عمل", cmd: "amal" },
        { alias: "بريميوم", cmd: "premium" },
        { alias: "توب", cmd: "top" },
        { alias: "استثمار", cmd: "invest" },
        { alias: "مساعدة", cmd: "help" },
        { alias: "قروض", cmd: "loan" }
      ];

      for (const al of defaultAliases) {
        db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)")
          .run(guild.id, al.alias, al.cmd);
      }
    } catch (e) {
      console.error("Error setting default aliases:", e);
    }

    // 7. Send Beautiful Rules Embed to "📜-القوانين"
    if (rulesChannelId) {
      const rulesChan = guild.channels.cache.get(rulesChannelId);
      if (rulesChan) {
        try {
          const rulesEmbed = new EmbedBuilder()
            .setTitle("📜 قوانين وشروط استخدام سيرفر Requiem")
            .setDescription("مرحباً بكم في سيرفر الدعم الرسمي لـ **Requiem**.\nيرجى قراءة القوانين التالية والالتزام بها لضمان بيئة آمنة ومريحة للجميع:")
            .addFields(
              { name: "🤝 1. الاحترام المتبادل", value: "يجب احترام جميع الأعضاء وطاقم الإدارة، ويمنع منعاً باتاً الشتم أو الإساءة بأي شكل من الأشكال." },
              { name: "🚫 2. الإعلانات والروابط", value: "يمنع كلياً نشر الروابط الخارجية أو الإعلانات لسيرفرات أخرى سواء في الشات العام أو الخاص." },
              { name: "🛡️ 3. السبام والتكرار", value: "تجنب السبام وتكرار الرسائل أو عمل منشن عشوائي ومزعج لطاقم الدعم الفني." },
              { name: "🏦 4. شات البنك المخصص", value: "استخدام أوامر البنك والتحويل يجب أن يكون داخل الرومات المخصصة لذلك فقط حفاظاً على ترتيب الشات." },
              { name: "💡 5. الحسابات والتعاملات", value: "إدارة البوت غير مسؤولة عن أي اتفاقيات مالية خارجية، الرجاء الحفاظ على أمن حساباتكم." },
              { name: "🎫 6. الدعم الفني والمساعدة", value: `إذا واجهتك أي مشكلة أو كان لديك استفسار، يرجى التوجه لـ <#${ticketChannelId}> (تذاكر الدعم) وفتح تذكرة ليقوم طاقمنا بمساعدتك.` }
            )
            .setColor(0xd4af37)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: "إدارة سيرفر ريكويم - Requiem Support Team", iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
            
          await rulesChan.send({ embeds: [rulesEmbed] });
        } catch (e) {
          console.error("Error sending rules embed:", e);
        }
      }
    }

    // 8. Send Ticket Panel to "🎫-تذاكر-الدعم" with Dropdown Select Menu
    if (ticketChannelId) {
      const ticketChan = guild.channels.cache.get(ticketChannelId);
      if (ticketChan) {
        try {
          const ticketEmbed = new EmbedBuilder()
            .setTitle("🎫 مركز الدعم الفني والمساعدة - Requiem Support")
            .setDescription("أهلاً بك في نظام التذاكر المتطور الخاص بـ **Requiem**.\n\nيرجى تحديد القسم المناسب لمشكلتك من القائمة المنسدلة أدناه لفتح تذكرة جديدة وسيقوم فريقنا بمساعدتك فوراً.")
            .setColor(0x8a2be2)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: "نظام التذاكر الحديث - Requiem", iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select_menu")
            .setPlaceholder("👇 اختر القسم الذي تود فتح تذكرة فيه...")
            .addOptions(
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

          const ticketRow = new ActionRowBuilder().addComponents(selectMenu);
          await ticketChan.send({ embeds: [ticketEmbed], components: [ticketRow] });
        } catch (e) {
          console.error("Error sending ticket panel:", e);
        }
      }
    }

    // 9. Send Bot Explanation to "📖-شرح-البوت"
    if (explanationChannelId) {
      const explChan = guild.channels.cache.get(explanationChannelId);
      if (explChan) {
        try {
          const introEmbed = new EmbedBuilder()
            .setColor(0x27272f)
            .setTitle("📖 نبذة عن بوت Requiem وطريقة استخدامه")
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setDescription(
              "أهلاً بك في سيرفر الدعم الفني الرسمي لبوت **Requiem** (رييكويم).\n\n" +
              "**👤 مطور البوت:**\n" +
              "• تم تطوير هذا البوت وتصميمه بواسطة المطور **.mm.8**.\n\n" +
              "**⚙️ بريفكس البوت (البادئة):**\n" +
              "• البادئة الحالية لجميع الأوامر العادية هي البادئة الجديدة: **`'`** (علامة اقتباس مفردة).\n" +
              "• يمكنك أيضاً استخدام الأوامر التفاعلية (Slash Commands) بكتابة **`/`** مباشرة في أي روم!\n\n" +
              "**💼 الميزات والأقسام الرئيسية للبوت:**\n" +
              "• **🏦 نظام بنك متطور:** حسابات بنكية مخصصة، محفظة كاش، تداول أسهم وسلع، قروض ميسرة، وصناديق استثمارية.\n" +
              "• **🎲 قسم الترفيه والمقامرة:** رمي النرد والعملة، لعبة السلوتس (تذكرة اليانصيب اليومية) وألعاب الحظ.\n" +
              "• **🛠️ الرقابة والحماية (Protection):** أدوات قوية لحماية السيرفر من السبام والروابط، ونظام ترحيب تلقائي.\n" +
              "• **🎮 قسم الألعاب:** ألعاب مافيا،hangman،trivia، والمزيد.\n\n" +
              "**💡 أهم الأوامر للبدء:**\n" +
              "• `'اوامر` (أو `/commands`): لعرض قائمة أوامر البنك والتحويل بالتفصيل.\n" +
              "• `'help` (أو `/help`): لعرض قائمة مساعدة البوت العامة والتعليمات.\n" +
              "• `'ping` (أو `/ping`): للتحقق من سرعة استجابة البوت واتصاله بالخادم."
            )
            .setImage(guild.iconURL({ dynamic: true, size: 512 }))
            .setFooter({ text: "Requiem Bot - Developed by .mm.8", iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
            
          await explChan.send({ embeds: [introEmbed] });
        } catch (e) {
          console.error("Error sending bot explanation embed:", e);
        }
      }
    }

    // 10. Rename server
    if (supportConfig.serverSettings.name) {
      await guild.setName(supportConfig.serverSettings.name);
    }
    
    // 11. Update Icon
    if (supportConfig.serverSettings.iconPath && fs.existsSync(supportConfig.serverSettings.iconPath)) {
      await guild.setIcon(supportConfig.serverSettings.iconPath);
    }

    await interaction.editReply({ content: "✅ تم ضبط وإعداد السيرفر بالكامل 100% بنجاح! تم إنشاء رتب الإدارة بصلاحيات Administrator، وإخفاء قنوات الإدارة عن الأعضاء العاديين، وتهيئة قوانين السيرفر المتكاملة، وتثبيت الاختصارات التلقائية في قاعدة البيانات، وإرسال لوحة التذاكر الحديثة القائمة على الخيارات بنجاح وبدون مشاكل." });
  }
};
