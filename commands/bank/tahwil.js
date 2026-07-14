import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { settings, logTx, C, n, E, noRoom } from "./utils.js";
import { createCanvas } from "canvas";

const SELF_MSGS = [
  "انتا سكران ولا عبيط؟ 😂 مش هتحول لنفسك!",
  "يا عم الحاج، الفلوس مش هتتضاعف بالتحويل لنفسك 😭",
  "ده مش ATM يا بطل، روح نام كويس 🙄",
  "البنك مش مسؤول عن القرارات بعد 12 بالليل 🌙",
];

// Box Blur algorithm to create a beautiful fuzzy/blurry security look
function boxBlur(canvas, radius = 1) {
  const ctx = canvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const out = new Uint8ClampedArray(data.length);
  
  // Horizontal blur pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width) {
          const idx = (y * width + nx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }
      const oidx = (y * width + x) * 4;
      out[oidx] = r / count;
      out[oidx + 1] = g / count;
      out[oidx + 2] = b / count;
      out[oidx + 3] = a / count;
    }
  }
  
  // Vertical blur pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < height) {
          const idx = (ny * width + x) * 4;
          r += out[idx];
          g += out[idx + 1];
          b += out[idx + 2];
          a += out[idx + 3];
          count++;
        }
      }
      const oidx = (y * width + x) * 4;
      data[oidx] = r / count;
      data[oidx + 1] = g / count;
      data[oidx + 2] = b / count;
      data[oidx + 3] = a / count;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
}

// High-quality CAPTCHA Generator using canvas
function drawCaptcha(code) {
  const width = 340;
  const height = 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Modern dark space gradient background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#080514");
  grad.addColorStop(0.5, "#1a0d32");
  grad.addColorStop(1, "#080514");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Styling grids for high-tech look
  ctx.strokeStyle = "rgba(168, 85, 247, 0.15)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 10, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + 5);
    ctx.stroke();
  }

  // Draw cyber-dots in the background
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100) + 155}, 100, 255, 0.25)`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 4 + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Laser diagonal/wavy lines in foreground
  ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height / 2 + (Math.random() * 30 - 15));
  ctx.bezierCurveTo(
    width / 3, Math.random() * height,
    (width / 3) * 2, Math.random() * height,
    width, height / 2 + (Math.random() * 30 - 15)
  );
  ctx.stroke();

  // Write digits with glowing neon colors
  ctx.textBaseline = "middle";
  const startX = 42;
  const spacing = 48;
  const colors = ["#ff007f", "#00ffff", "#a855f7", "#ffffff", "#39ff14", "#ffa500"];

  for (let i = 0; i < code.length; i++) {
    const digit = code[i];
    const angle = (Math.random() * 24 - 12) * Math.PI / 180; // random tilt between -12 and +12 degrees
    const yOffset = Math.random() * 16 - 8; // random vertical variance
    const color = colors[i % colors.length];

    ctx.save();
    ctx.translate(startX + (i * spacing), (height / 2) + yOffset);
    ctx.rotate(angle);

    ctx.font = "bold 38px 'Arial', sans-serif";
    ctx.fillStyle = color;
    
    // Glowing neon shadow
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    
    ctx.fillText(digit, -10, 0);
    ctx.restore();
  }

  // Apply beautiful blur effect to the CAPTCHA image
  boxBlur(canvas, 1);

  return canvas.toBuffer("image/png");
}

export default {
  name: "تحويل",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("تحويل")
    .setDescription("💸 حوّل فلوس لشخص ثاني مع خصم رسوم (رسوم أقل للمشتركين المميزين)")
    .addUserOption(o => o.setName("المستلم").setDescription("العضو المستلم").setRequired(true))
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المراد تحويله").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const target = interaction.options.getUser("المستلم");
    const amount = interaction.options.getInteger("المبلغ");
    if (!amount || amount < 1) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("يرجى كتابة مبلغ صحيح للتحويل.")], ephemeral: true });
    }
    const uid = interaction.user.id;

    if (uid === target.id) {
      const msg = SELF_MSGS[Math.floor(Math.random() * SELF_MSGS.length)];
      return interaction.reply({ embeds: [E("🤦 يا عم!").setDescription(msg)], ephemeral: true });
    }

    const activeFeeRate = amount >= 1000000 ? 0.05 : 0;
    const fee = Math.ceil(amount * activeFeeRate);
    const total = amount + fee;

    // Fetch sender balance
    const senderRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const senderBalance = senderRow?.bank_wallet || 0;

    if (senderBalance < total) {
      return interaction.reply({
        embeds: [
          E("❌ رصيدك غير كافٍ")
            .setDescription(`عذراً، لا تمتلك رصيداً كافياً لإتمام هذه المعاملة.\n\n` +
                         `• **المبلغ المطلوب:** \`${n(amount)} دولار\`\n` +
                         `• **رسوم التحويل (5%):** \`${n(fee)} دولار\`\n` +
                         `• **المجموع الإجمالي المطلوب:** \`${n(total)} دولار\`\n` +
                         `• **رصيدك الحالي:** \`${n(senderBalance)} دولار\``)
            .setColor("#ff3333")
        ],
        ephemeral: true
      });
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const buffer = drawCaptcha(code);
    const attachment = new AttachmentBuilder(buffer, { name: "verify.png" });

    const verificationEmbed = new EmbedBuilder()
      .setColor("#8a2be2")
      .setTitle("🔐 التحقق البشري والأمني | Security Verification")
      .setDescription(
        `عزيزي <@${uid}>، يرجى كتابة الرمز المكون من **6 أرقام** الموضح بالصورة أدناه لإكمال عملية التحويل.\n\n` +
        `• ⚠️ **لديك محاولة واحدة فقط (6/6).**\n` +
        `• ⏱️ **المهلة المحددة:** 45 ثانية.\n\n` +
        `• **المستلم:** <@${target.id}>\n` +
        `• **المبلغ:** \`${n(amount)} دولار\`\n` +
        `• **رسوم الخدمة:** \`${n(fee)} دولار\``
      )
      .setImage("attachment://verify.png")
      .setFooter({ text: "نظام حماية الحوالات المطور", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [verificationEmbed], files: [attachment] });

    // Collect response
    const filter = m => m.author.id === uid;
    const collector = interaction.channel.createMessageCollector({ filter, time: 45000, max: 1 });

    collector.on("collect", async (msg) => {
      // Clean target content
      const userText = msg.content.trim();
      
      // Attempt to delete user verification message for clean chat (if bot has permission)
      try {
        if (msg.deletable) await msg.delete().catch(() => {});
      } catch (e) {}

      if (userText === code) {
        // Success: Perform Database transactions
        // Check balance again to avoid race conditions
        const latestRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
        const latestBal = latestRow?.bank_wallet || 0;

        if (latestBal < total) {
          return interaction.followUp({
            embeds: [E("❌ فشلت العملية").setDescription("تغير رصيدك أثناء عملية التحقق. تم إلغاء المعاملة.")],
            ephemeral: true
          });
        }

        // Apply deduction & deposit
        db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(total, uid, interaction.guildId);
        db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
          .run(target.id, interaction.guildId, amount, amount);

        logTx(uid, "تحويل_صادر", -total, `إلى <@${target.id}> (ضريبة ${activeFeeRate * 100}%)`);
        logTx(target.id, "تحويل_وارد", amount, `من <@${uid}>`);

        // Create success receipt embed
        const successEmbed = new EmbedBuilder()
          .setColor("#39ff14")
          .setTitle("✅ تم إرسال الحوالة بنجاح")
          .setDescription("تم التحقق من هويتك بنجاح وإرسال الدولار فوراً.")
          .addFields(
            { name: "📤 المرسل", value: `<@${uid}>`, inline: true },
            { name: "📥 المستلم", value: `<@${target.id}>`, inline: true },
            { name: "💵 المبلغ المحوّل", value: `**${n(amount)} دولار**`, inline: true },
            { name: "💳 الرسوم المستقطعة", value: `**${n(fee)} دولار (${activeFeeRate * 100}%)**`, inline: true },
            { name: "💰 رصيدك المتبقي", value: `**${n(latestBal - total)} دولار**`, inline: true }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: "إيصال التحويل الرقمي - Requiem Bank", iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed], files: [] });

        // Send beautiful DM receipt to recipient
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ffa500")
            .setTitle("🧾 إيصال تحويل وارد | Incoming Transfer Receipt")
            .setDescription(`أهلاً بك! لقد تم إيداع حوالة مالية جديدة في محفظتك بنجاح.`)
            .addFields(
              { name: "👤 يوزر الي حولك (المرسل)", value: `**${interaction.user.tag}** (<@${uid}>)`, inline: false },
              { name: "💰 الكمية (المبلغ المستلم)", value: `**${n(amount)} دولار**`, inline: true },
              { name: "📅 تاريخ المعاملة", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL())
            .setFooter({ text: `البنك المركزي - ${interaction.guild.name}`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

          await target.send({ embeds: [dmEmbed] });
        } catch (e) {
          // If DM is locked, fallback beautifully
          await interaction.followUp({
            content: `⚠️ <@${target.id}>، تم تحويل المبلغ لك ولكن لم نتمكن من إرسال إيصال الحوالة في الخاص لأن حسابك مغلق (DMs Closed).`,
            ephemeral: false
          }).catch(() => {});
        }

      } else {
        // Verification failed (one attempt only!)
        const failEmbed = new EmbedBuilder()
          .setColor("#ff3333")
          .setTitle("❌ فشل التحقق الأمني")
          .setDescription(`عذراً <@${uid}>، لقد أدخلت رمز تحقق خاطئ (\`0/6\` مطابق).\n\n• **تم إلغاء عملية التحويل بالكامل فوراً لحماية حسابك.**`)
          .setFooter({ text: "Requiem Bank Security", iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [failEmbed], files: [] });
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        const timeoutEmbed = new EmbedBuilder()
          .setColor("#ffcc00")
          .setTitle("⏳ انتهت مهلة التحقق")
          .setDescription(`عذراً <@${uid}>، لقد انتهت المهلة المحددة (45 ثانية) دون كتابة الرمز.\n\n• **تم إلغاء عملية التحويل تلقائياً.**`)
          .setFooter({ text: "Requiem Bank Security", iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed], files: [] }).catch(() => {});
      }
    });
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 2) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام الصحيح: \`${PREFIX}تحويل <@user> <المبلغ>\``)] });
    }
    
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو المستلم.")] });
    if (!amount || isNaN(amount) || amount < 1) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى كتابة مبلغ صحيح للتحويل.")] });
    }

    const uid = message.author.id;
    if (uid === target.id) {
      const msg = SELF_MSGS[Math.floor(Math.random() * SELF_MSGS.length)];
      return message.reply({ embeds: [E("🤦 يا عم!").setDescription(msg)] });
    }

    const activeFeeRate = amount >= 1000000 ? 0.05 : 0;
    const fee = Math.ceil(amount * activeFeeRate);
    const total = amount + fee;

    // Fetch sender balance
    const senderRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const senderBalance = senderRow?.bank_wallet || 0;

    if (senderBalance < total) {
      return message.reply({
        embeds: [
          E("❌ رصيدك غير كافٍ")
            .setDescription(`عذراً، لا تمتلك رصيداً كافياً لإتمام هذه المعاملة.\n\n` +
                         `• **المبلغ المطلوب:** \`${n(amount)} دولار\`\n` +
                         `• **رسوم التحويل (5%):** \`${n(fee)} دولار\`\n` +
                         `• **المجموع الإجمالي المطلوب:** \`${n(total)} دولار\`\n` +
                         `• **رصيدك الحالي:** \`${n(senderBalance)} دولار\``)
            .setColor("#ff3333")
        ]
      });
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const buffer = drawCaptcha(code);
    const attachment = new AttachmentBuilder(buffer, { name: "verify.png" });

    const verificationEmbed = new EmbedBuilder()
      .setColor("#8a2be2")
      .setTitle("🔐 التحقق البشري والأمني | Security Verification")
      .setDescription(
        `عزيزي <@${uid}>، يرجى كتابة الرمز المكون من **6 أرقام** الموضح بالصورة أدناه لإكمال عملية التحويل.\n\n` +
        `• ⚠️ **لديك محاولة واحدة فقط (6/6).**\n` +
        `• ⏱️ **المهلة المحددة:** 45 ثانية.\n\n` +
        `• **المستلم:** <@${target.id}>\n` +
        `• **المبلغ:** \`${n(amount)} دولار\`\n` +
        `• **رسوم الخدمة:** \`${n(fee)} دولار\``
      )
      .setImage("attachment://verify.png")
      .setFooter({ text: "نظام حماية الحوالات المطور", iconURL: message.client.user.displayAvatarURL() })
      .setTimestamp();

    const promptMsg = await message.reply({ embeds: [verificationEmbed], files: [attachment] });

    // Collect response
    const filter = m => m.author.id === uid;
    const collector = message.channel.createMessageCollector({ filter, time: 45000, max: 1 });

    collector.on("collect", async (msg) => {
      const userText = msg.content.trim();
      
      try {
        if (msg.deletable) await msg.delete().catch(() => {});
      } catch (e) {}

      if (userText === code) {
        // Double check balance
        const latestRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
        const latestBal = latestRow?.bank_wallet || 0;

        if (latestBal < total) {
          return message.reply({
            embeds: [E("❌ فشلت العملية").setDescription("تغير رصيدك أثناء عملية التحقق. تم إلغاء المعاملة.")]
          });
        }

        // Apply deduction & deposit
        db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(total, uid, message.guild.id);
        db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
          .run(target.id, message.guild.id, amount, amount);

        logTx(uid, "تحويل_صادر", -total, `إلى <@${target.id}> (ضريبة ${activeFeeRate * 100}%)`);
        logTx(target.id, "تحويل_وارد", amount, `من <@${uid}>`);

        // Success receipt
        const successEmbed = new EmbedBuilder()
          .setColor("#39ff14")
          .setTitle("✅ تم إرسال الحوالة بنجاح")
          .setDescription("تم التحقق من هويتك بنجاح وإرسال الدولار فوراً.")
          .addFields(
            { name: "📤 المرسل", value: `<@${uid}>`, inline: true },
            { name: "📥 المستلم", value: `<@${target.id}>`, inline: true },
            { name: "💵 المبلغ المحوّل", value: `**${n(amount)} دولار**`, inline: true },
            { name: "💳 الرسوم المستقطعة", value: `**${n(fee)} دولار (${activeFeeRate * 100}%)**`, inline: true },
            { name: "💰 رصيدك المتبقي", value: `**${n(latestBal - total)} دولار**`, inline: true }
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: "إيصال التحويل الرقمي - Requiem Bank", iconURL: message.client.user.displayAvatarURL() })
          .setTimestamp();

        await promptMsg.edit({ embeds: [successEmbed], files: [] });

        // Send beautiful DM receipt to recipient
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ffa500")
            .setTitle("🧾 إيصال تحويل وارد | Incoming Transfer Receipt")
            .setDescription(`أهلاً بك! لقد تم إيداع حوالة مالية جديدة في محفظتك بنجاح.`)
            .addFields(
              { name: "👤 يوزر الي حولك (المرسل)", value: `**${message.author.tag}** (<@${uid}>)`, inline: false },
              { name: "💰 الكمية (المبلغ المستلم)", value: `**${n(amount)} دولار**`, inline: true },
              { name: "📅 تاريخ المعاملة", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(message.guild.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL())
            .setFooter({ text: `البنك المركزي - ${message.guild.name}`, iconURL: message.client.user.displayAvatarURL() })
            .setTimestamp();

          await target.send({ embeds: [dmEmbed] });
        } catch (e) {
          await message.channel.send({
            content: `⚠️ <@${target.id}>، تم تحويل المبلغ لك ولكن لم نتمكن من إرسال إيصال الحوالة في الخاص لأن حسابك مغلق (DMs Closed).`
          }).catch(() => {});
        }

      } else {
        const failEmbed = new EmbedBuilder()
          .setColor("#ff3333")
          .setTitle("❌ فشل التحقق الأمني")
          .setDescription(`عذراً <@${uid}>، لقد أدخلت رمز تحقق خاطئ (\`0/6\` مطابق).\n\n• **تم إلغاء عملية التحويل بالكامل فوراً لحماية حسابك.**`)
          .setFooter({ text: "Requiem Bank Security", iconURL: message.client.user.displayAvatarURL() })
          .setTimestamp();

        await promptMsg.edit({ embeds: [failEmbed], files: [] });
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        const timeoutEmbed = new EmbedBuilder()
          .setColor("#ffcc00")
          .setTitle("⏳ انتهت مهلة التحقق")
          .setDescription(`عذراً <@${uid}>، لقد انتهت المهلة المحددة (45 ثانية) دون كتابة الرمز.\n\n• **تم إلغاء عملية التحويل تلقائياً.**`)
          .setFooter({ text: "Requiem Bank Security", iconURL: message.client.user.displayAvatarURL() })
          .setTimestamp();

        await promptMsg.edit({ embeds: [timeoutEmbed], files: [] }).catch(() => {});
      }
    });
  }
};
