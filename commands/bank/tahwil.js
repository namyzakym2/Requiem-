import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom, isPremiumUser } from "./utils.js";

const SELF_MSGS = [
  "انتا سكران ولا عبيط؟ 😂 مش هتحول لنفسك!",
  "يا عم الحاج، الفلوس مش هتتضاعف بالتحويل لنفسك 😭",
  "ده مش ATM يا بطل، روح نام كويس 🙄",
  "البنك مش مسؤول عن القرارات بعد 12 بالليل 🌙",
];

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
    if (!amount || amount < 1) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("اكتب مبلغ صحيح")], ephemeral: true });
    const uid = interaction.user.id;

    if (uid === target.id) {
      const msg = SELF_MSGS[Math.floor(Math.random() * SELF_MSGS.length)];
      return interaction.reply({ embeds: [E("🤦 يا عم!").setDescription(msg)], ephemeral: true });
    }

    const activeFeeRate = amount >= 1000000 ? 0.05 : 0;
    const fee = Math.ceil(amount * activeFeeRate);
    const total = amount + fee;

    // Use SQLite as the single source of truth
    const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const senderBalance = senderRow?.xb || 0;

    const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, interaction.guildId);
    const targetBalance = targetRow?.xb || 0;

    if (senderBalance < total) {
      return interaction.reply({ embeds: [E("❌ فلوسك مش كفاية").setDescription(`تحتاج **${n(total)} رون** (رسوم **${n(fee)} رون**)\nرصيدك الحالي: **${n(senderBalance)} رون**`)], ephemeral: true });
    }

    // Update SQLite database for both users
    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(total, uid, interaction.guildId);
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(target.id, interaction.guildId, amount, amount);
    
    logTx(uid, "تحويل_صادر", -total, `إلى <@${target.id}> (ضريبة ${activeFeeRate * 100}%)`);
    logTx(target.id, "تحويل_وارد", amount, `من <@${uid}>`);

    const embed = new EmbedBuilder()
      .setColor(C)
      .setTitle("✅ تم التحويل بنجاح")
      .addFields(
        { name: "📤 المستلم",    value: `<@${target.id}>`,          inline: true },
        { name: "💵 المبلغ",    value: `${n(amount)} رون`,             inline: true },
        { name: "💳 الرسوم المستقطعة", value: `${n(fee)} رون (${activeFeeRate * 100}%)`, inline: true },
        { name: "💳 رصيدك المتبقي",     value: `${n(senderBalance - total)} رون`, inline: false }
      )
      .setTimestamp();

    if (activeFeeRate > 0) {
      embed.setDescription("⚠️ تم تطبيق ضريبة تحويل بنسبة **5%** لأن المبلغ المُراد تحويله 1 مليون رون أو أكثر.");
    } else {
      embed.setDescription("✨ هذا التحويل معفى من الرسوم لأن المبلغ أقل من 1 مليون رون.");
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 2) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام الصحيح: \`${PREFIX}تحويل <@user> <المبلغ>\``)] });
    
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو المستلم.")] });
    if (!amount || isNaN(amount) || amount < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى كتابة مبلغ صحيح.")] });

    const uid = message.author.id;
    if (uid === target.id) {
      const msg = SELF_MSGS[Math.floor(Math.random() * SELF_MSGS.length)];
      return message.reply({ embeds: [E("🤦 يا عم!").setDescription(msg)] });
    }

    const activeFeeRate = amount >= 1000000 ? 0.05 : 0;
    const fee = Math.ceil(amount * activeFeeRate);
    const total = amount + fee;

    // Use SQLite as the single source of truth
    const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const senderBalance = senderRow?.xb || 0;

    const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const targetBalance = targetRow?.xb || 0;

    if (senderBalance < total) {
      return message.reply({ embeds: [E("❌ فلوسك مش كفاية").setDescription(`تحتاج **${n(total)} رون** (رسوم **${n(fee)} رون**)\nرصيدك الحالي: **${n(senderBalance)} رون**`)] });
    }

    // Update SQLite database for both users
    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(total, uid, message.guild.id);
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(target.id, message.guild.id, amount, amount);

    logTx(uid, "تحويل_صادر", -total, `إلى <@${target.id}> (ضريبة ${activeFeeRate * 100}%)`);
    logTx(target.id, "تحويل_وارد", amount, `من <@${uid}>`);

    const embed = new EmbedBuilder()
      .setColor(C)
      .setTitle("✅ تم التحويل بنجاح")
      .addFields(
        { name: "📤 المستلم",    value: `<@${target.id}>`,          inline: true },
        { name: "💵 المبلغ",    value: `${n(amount)} رون`,             inline: true },
        { name: "💳 الرسوم المستقطعة", value: `${n(fee)} رون (${activeFeeRate * 100}%)`, inline: true },
        { name: "💳 رصيدك المتبقي",     value: `${n(senderBalance - total)} رون`, inline: false }
      )
      .setTimestamp();

    if (activeFeeRate > 0) {
      embed.setDescription("⚠️ تم تطبيق ضريبة تحويل بنسبة **5%** لأن المبلغ المُراد تحويله 1 مليون رون أو أكثر.");
    } else {
      embed.setDescription("✨ هذا التحويل معفى من الرسوم لأن المبلغ أقل من 1 مليون رون.");
    }

    return message.reply({ embeds: [embed] });
  }
};
