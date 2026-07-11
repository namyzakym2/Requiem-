import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { config } from "../../config.js";
import fs from "fs";
import path from "path";
import db from "../../src/lib/db.js";

async function setupSupportServer(guild, targetChannelId, senderId, feedbackFn) {
  if (senderId !== config.ownerId) {
    return feedbackFn({ error: "❌ هذا الأمر للأونر فقط." });
  }

  const configPath = path.join(process.cwd(), "commands", "admin", "support_config.json");
  if (!fs.existsSync(configPath)) {
    return feedbackFn({ error: "❌ ملف الإعدادات support_config.json غير موجود." });
  }
  const supportConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

  await feedbackFn({ status: "start" });

  // 1. Delete channels (except the setup channel itself)
  for (const channel of guild.channels.cache.values()) {
    if (channel.id !== targetChannelId) {
      try { 
        await channel.delete(); 
      } catch (e) { 
        console.error(`Error deleting channel ${channel.name}:`, e); 
      }
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
      db.prepare(`
        INSERT INTO welcome_settings (guildId, channelId, message, enabled, title, description, embedColor, imageUrl, status)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?, 'on')
        ON CONFLICT(guildId) DO UPDATE SET
          channelId = excluded.channelId,
          message = excluded.message,
          enabled = 1,
          title = excluded.title,
          description = excluded.description,
          embedColor = excluded.embedColor,
          imageUrl = excluded.imageUrl,
          status = 'on'
      `).run(
        guild.id,
        welcomeChannelId,
        "👋 أهلاً بك يا {user} في سيرفر الدعم الخاص بـ **Requiem**! نوّرت السيرفر يا بطل 💖",
        "أهلاً بك في سيرفر ريكويم! 🎉",
        "مرحباً بك {user} في سيرفر الدعم الرسمي لـ **Requiem**! أنت العضو رقم #{memberCount}. نتمنى لك وقتاً ممتعاً! 💖",
        "#8b5cf6",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"
      );
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

  // 6. Setup command aliases for this guild
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
          .setFooter({ text: "إدارة سيرفر ريكويم - Requiem Support Team", iconURL: guild.client.user.displayAvatarURL() })
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
          .setFooter({ text: "نظام التذاكر الحديث - Requiem", iconURL: guild.client.user.displayAvatarURL() })
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
          .setThumbnail(guild.client.user.displayAvatarURL())
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
          .setFooter({ text: "Requiem Bot - Developed by .mm.8", iconURL: guild.client.user.displayAvatarURL() })
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
  
  // 11. Update Icon (passing File Buffer directly to avoid [IMAGE_RESOLVE_FAILED] errors)
  if (supportConfig.serverSettings.iconPath && fs.existsSync(supportConfig.serverSettings.iconPath)) {
    try {
      await guild.setIcon(fs.readFileSync(supportConfig.serverSettings.iconPath));
    } catch (e) {
      console.error("Error setting guild icon:", e);
    }
  }

  await feedbackFn({ success: true });
}

export default {
  name: "support-server",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("support-server")
    .setDescription("إعداد السيرفر بالكامل: اختصارات، قوانين، إخفاء رومات الإدارة، وصلاحيات (للأونر فقط)"),
    
  async executeInteraction(interaction) {
    await setupSupportServer(
      interaction.guild,
      interaction.channelId,
      interaction.user.id,
      async (result) => {
        if (result.error) {
          return interaction.reply({ content: result.error, ephemeral: true }).catch(() => {});
        }
        if (result.status === "start") {
          return interaction.deferReply({ ephemeral: true }).catch(() => {});
        }
        if (result.success) {
          return interaction.editReply({ 
            content: "✅ تم ضبط وإعداد السيرفر بالكامل 100% بنجاح! تم إنشاء رتب الإدارة بصلاحيات Administrator، وإخفاء قنوات الإدارة عن الأعضاء العاديين، وتهيئة قوانين السيرفر المتكاملة، وتثبيت الاختصارات التلقائية في قاعدة البيانات، وإرسال لوحة التذاكر الحديثة القائمة على الخيارات بنجاح وبدون مشاكل." 
          }).catch(() => {});
        }
      }
    );
  },

  async executeMessage(message, args, context) {
    let statusMsg = null;
    await setupSupportServer(
      message.guild,
      message.channelId,
      message.author.id,
      async (result) => {
        if (result.error) {
          return message.reply(result.error).catch(() => {});
        }
        if (result.status === "start") {
          statusMsg = await message.reply("⏳ جاري بدء إعداد السيرفر وتجهيز القنوات والرتب... يرجى الانتظار.").catch(() => {});
          return;
        }
        if (result.success) {
          const successContent = "✅ تم ضبط وإعداد السيرفر بالكامل 100% بنجاح! تم إنشاء رتب الإدارة بصلاحيات Administrator، وإخفاء قنوات الإدارة عن الأعضاء العاديين، وتهيئة قوانين السيرفر المتكاملة، وتثبيت الاختصارات التلقائية في قاعدة البيانات، وإرسال لوحة التذاكر الحديثة القائمة على الخيارات بنجاح وبدون مشاكل.";
          if (statusMsg) {
            await statusMsg.edit(successContent).catch(() => {});
          } else {
            await message.reply(successContent).catch(() => {});
          }
        }
      }
    );
  }
};
