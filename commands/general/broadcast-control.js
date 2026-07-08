import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";

export default {
  name: "bc-control",
  aliases: ["bc", "multicast"],
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("bc-control")
    .setDescription("غرفة التحكم في البرودكاست والمالتي كاست البث المباشر")
    .addSubcommand(sub =>
      sub.setName("panel")
        .setDescription("فتح لوحة وغرفة التحكم بالبرودكاست")
    )
    .addSubcommand(sub =>
      sub.setName("subscribe")
        .setDescription("الاشتراك في ميزة المالتي كاست مقابل 10,000,000 رون شهرياً")
    )
    .addSubcommand(sub =>
      sub.setName("online")
        .setDescription("إرسال برودكاست للأعضاء المتصلين (Online) فقط")
        .addStringOption(opt => opt.setName("message").setDescription("الرسالة (استخدم {user} لمنشن العضو)").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("addbot")
        .setDescription("إضافة بوت/ويب هوك للبرودكاست")
        .addStringOption(opt => opt.setName("name").setDescription("اسم البوت").setRequired(true))
        .addStringOption(opt => opt.setName("webhook").setDescription("رابط الويب هوك (Webhook URL)").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("setmessage")
        .setDescription("تحديد رسالة البرودكاست الافتراضية")
        .addStringOption(opt => opt.setName("message").setDescription("الرسالة المراد تعيينها (استخدم {user} لمنشن الشخص)").setRequired(true))
    ),

  async executeInteraction(interaction, context) {
    const { db, OWNER_ID } = context;
    const { guild, user, guildId } = interaction;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && user.id !== OWNER_ID) {
      return interaction.reply({ content: "❌ هذا الأمر مخصص لإداريي السيرفر فقط.", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand() || "panel";

    if (subcommand === "subscribe") {
      return handleSubscribe(interaction, db, user.id, guildId);
    }

    if (subcommand === "addbot") {
      const name = interaction.options.getString("name");
      const webhookUrl = interaction.options.getString("webhook");
      db.prepare("INSERT INTO broadcast_bots (guildId, webhookUrl, name) VALUES (?, ?, ?)").run(guildId, name, webhookUrl);
      return interaction.reply({ content: `✅ تم إضافة البوت **${name}** بنجاح إلى شبكة البرودكاست!`, ephemeral: true });
    }

    if (subcommand === "setmessage") {
      const msg = interaction.options.getString("message");
      db.prepare("INSERT OR REPLACE INTO broadcast_settings (guildId, message) VALUES (?, ?)").run(guildId, msg);
      return interaction.reply({ content: `✅ تم تحديث نص البرودكاست الافتراضي إلى:\n\`\`\`\n${msg}\n\`\`\``, ephemeral: true });
    }

    if (subcommand === "online") {
      const msg = interaction.options.getString("message");
      await interaction.deferReply({ ephemeral: true });
      return handleOnlineBroadcast(interaction, db, guild, msg);
    }

    if (subcommand === "panel") {
      return sendControlPanel(interaction, db, guildId, user.id);
    }
  },

  async executeMessage(message, args, context) {
    const { db, OWNER_ID, PREFIX } = context;
    const { guild, author, guildId } = message;

    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) && author.id !== OWNER_ID) {
      return message.reply("❌ هذا الأمر مخصص لإداريي السيرفر فقط.");
    }

    const action = args[0]?.toLowerCase();

    if (action === "sub" || action === "subscribe") {
      return handleSubscribe(message, db, author.id, guildId, true);
    }

    if (action === "online") {
      const msg = args.slice(1).join(" ");
      if (!msg) return message.reply("❌ يرجى كتابة الرسالة المراد إرسالها. مثال: `bc online مرحبا {user}`");
      return handleOnlineBroadcast(message, db, guild, msg, true);
    }

    if (action === "addbot") {
      const name = args[1];
      const webhook = args[2];
      if (!name || !webhook) return message.reply(`❌ الاستخدام: \`${PREFIX}bc addbot <الاسم> <رابط_الويب_هوك>\``);
      db.prepare("INSERT INTO broadcast_bots (guildId, webhookUrl, name) VALUES (?, ?, ?)").run(guildId, name, webhook);
      return message.reply(`✅ تم إضافة البوت **${name}** بنجاح إلى البرودكاست.`);
    }

    if (action === "setmsg") {
      const msg = args.slice(1).join(" ");
      if (!msg) return message.reply("❌ يرجى كتابة الرسالة المراد تعيينها.");
      db.prepare("INSERT OR REPLACE INTO broadcast_settings (guildId, message) VALUES (?, ?)").run(guildId, msg);
      return message.reply(`✅ تم حفظ رسالة البرودكاست:\n\`\`\`\n${msg}\n\`\`\``);
    }

    return sendControlPanel(message, db, guildId, author.id, true);
  },

  async execute(interactionOrMessage, context) {
    if (interactionOrMessage.isChatInputCommand?.()) {
      return this.executeInteraction(interactionOrMessage, context);
    } else {
      return this.executeMessage(interactionOrMessage, [], context);
    }
  }
};

async function sendControlPanel(target, db, guildId, userId, isMsg = false) {
  const sub = db.prepare("SELECT * FROM broadcast_subscriptions WHERE userId = ?").get(userId);
  const isSubscribed = sub && new Date(sub.expiresAt) > new Date();
  const bots = db.prepare("SELECT * FROM broadcast_bots WHERE guildId = ?").all(guildId) || [];
  const settings = db.prepare("SELECT message FROM broadcast_settings WHERE guildId = ?").get(guildId);
  const currentMsg = settings?.message || "مرحباً {user} في السيرفر!";

  const embed = new EmbedBuilder()
    .setTitle("🎛️ غرفة التحكم في البرودكاست والمالتي كاست")
    .setColor(isSubscribed ? "#00FF7F" : "#FF4500")
    .setDescription(`أهلاً بك في غرفة التحكم ببرودكاست البوت والمالتي كاست.`)
    .addFields(
      { name: "👑 حالة الاشتراك بالخدمة", value: isSubscribed ? `🟢 مفعل (ينتهي في ${new Date(sub.expiresAt).toLocaleDateString('ar-EG')})` : "🔴 غير مفعل (تكلفة الاشتراك: **10,000,000 رون / شهرياً**)", inline: false },
      { name: "🤖 البوتات/الويب هوك المضافة", value: `${bots.length} بوتات متصلة`, inline: true },
      { name: "📝 الرسالة الحالية", value: `\`\`\`${currentMsg}\`\`\`\n*(تذكير: **{user}** يتم استبدالها بمنشن الشخص تلقائياً)*`, inline: false }
    )
    .setFooter({ text: "يمكنك استخدام الأوامر أيضاً: /bc-control أو prefix 'bc'" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bc_subscribe_btn").setLabel("💳 اشتراك / تجديد (10M رون)").setStyle(ButtonStyle.Success).setDisabled(isSubscribed),
    new ButtonBuilder().setCustomId("bc_addbot_btn").setLabel("➕ إضافة بوت (Webhook)").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("bc_send_online_btn").setLabel("🟢 إرسال للمتصلين (Online)").setStyle(ButtonStyle.Secondary)
  );

  if (isMsg) {
    return target.reply({ embeds: [embed], components: [row1] });
  } else {
    return target.reply({ embeds: [embed], components: [row1], ephemeral: true });
  }
}

async function handleSubscribe(target, db, userId, guildId, isMsg = false) {
  const COST = 10000000;
  const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
  const balance = userRow?.xb || 0;

  if (balance < COST) {
    const msg = `❌ رصيدك غير كافٍ للاشتراك. التكلفة: **10,000,000 رون**. رصيدك الحالي: **${balance.toLocaleString('ar-EG')} رون**.`;
    return isMsg ? target.reply(msg) : target.reply({ content: msg, ephemeral: true });
  }

  // Deduct
  db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(COST, userId, guildId);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT OR REPLACE INTO broadcast_subscriptions (userId, expiresAt) VALUES (?, ?)").run(userId, expires);

  const successMsg = `🎉 تم الاشتراك بنجاح في ميزة البرودكاست والمالتي كاست لمدة 30 يوماً! تم خصم **10,000,000 رون**.`;
  return isMsg ? target.reply(successMsg) : target.reply({ content: successMsg, ephemeral: true });
}

async function handleOnlineBroadcast(target, db, guild, messageTemplate, isMsg = false) {
  try {
    const members = await guild.members.fetch({ withPresences: true }).catch(() => guild.members.cache);
    const onlineMembers = members.filter(m => !m.user.bot && (m.presence?.status === 'online' || m.presence?.status === 'dnd' || m.presence?.status === 'idle'));

    let sent = 0;
    let failed = 0;

    const bots = db.prepare("SELECT webhookUrl FROM broadcast_bots WHERE guildId = ?").all(guild.id) || [];

    for (const [id, member] of onlineMembers) {
      const formattedMessage = messageTemplate.replace(/{user}/g, `<@${member.id}>`);

      // Send via bot DMs or Webhooks
      let success = false;
      try {
        await member.send(formattedMessage);
        success = true;
      } catch (e) {
        // Fallback or send via webhooks if configured
      }

      if (!success && bots.length > 0) {
        const bot = bots[sent % bots.length];
        try {
          const axios = (await import('axios')).default;
          await axios.post(bot.webhookUrl, { content: formattedMessage });
          success = true;
        } catch (e) {
          // ignore
        }
      }

      if (success) sent++; else failed++;
      await new Promise(r => setTimeout(r, 1000));
    }

    const resMsg = `✅ تم إرسال البرودكاست للأعضاء المتصلين:\n- 🟢 تم الإرسال بنجاح: **${sent}**\n- 🔴 فشل الإرسال (الخاص مغلق): **${failed}**`;
    return isMsg ? target.reply(resMsg) : target.editReply({ content: resMsg });
  } catch (err) {
    const errText = `❌ حدث خطأ أثناء إرسال البرودكاست: ${err.message}`;
    return isMsg ? target.reply(errText) : target.editReply({ content: errText });
  }
}
