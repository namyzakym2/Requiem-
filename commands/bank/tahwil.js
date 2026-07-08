import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

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
    .setDescription("💸 حوّل فلوس لشخص ثاني مع خصم رسوم")
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

    const fee = Math.ceil(amount * (cfg.transferFee ?? 0.05));
    const total = amount + fee;
    const users = load("users.json");

    // Sync sender balance from SQLite
    const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const senderDbBal = senderRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: senderDbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, senderDbBal);
    }

    // Sync receiver balance from SQLite
    const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, interaction.guildId);
    const targetDbBal = targetRow?.xb || 0;
    if (!users[target.id]) {
      users[target.id] = { balance: targetDbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, targetDbBal);
    }

    if ((users[uid].balance || 0) < total) {
      return interaction.reply({ embeds: [E("❌ فلوسك مش كفاية").setDescription(`تحتاج **${n(total)} رون** (رسوم **${n(fee)} رون**)\nرصيدك الحالي: **${n(users[uid].balance || 0)} رون**`)], ephemeral: true });
    }

    users[uid].balance -= total;
    users[target.id].balance = (users[target.id].balance || 0) + amount;
    save("users.json", users);
    
    logTx(uid, "تحويل_صادر", -total, `إلى <@${target.id}>`);
    logTx(target.id, "تحويل_وارد", amount, `من <@${uid}>`);

    // Update SQLite database for both users
    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(total, uid, interaction.guildId);
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(target.id, interaction.guildId, amount, amount);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم التحويل بنجاح")
      .addFields(
        { name: "📤 المستلم",    value: `<@${target.id}>`,          inline: true },
        { name: "💵 المبلغ",    value: `${n(amount)} رون`,             inline: true },
        { name: "💳 الرسوم",    value: `${n(fee)} رون`,                inline: true },
        { name: "💳 رصيدك",     value: `${n(users[uid].balance)} رون`, inline: false }
      ).setTimestamp()] });
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

    const fee = Math.ceil(amount * (cfg.transferFee ?? 0.05));
    const total = amount + fee;
    const users = load("users.json");

    const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = senderRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const targetDbBal = targetRow?.xb || 0;
    if (!users[target.id]) {
      users[target.id] = { balance: targetDbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, targetDbBal);
    }

    if ((users[uid].balance || 0) < total) {
      return message.reply({ embeds: [E("❌ فلوسك مش كفاية").setDescription(`تحتاج **${n(total)} رون** (رسوم **${n(fee)} رون**)\nرصيدك الحالي: **${n(users[uid].balance || 0)} رون**`)] });
    }

    users[uid].balance -= total;
    users[target.id].balance = (users[target.id].balance || 0) + amount;
    save("users.json", users);

    logTx(uid, "تحويل_صادر", -total, `إلى <@${target.id}>`);
    logTx(target.id, "تحويل_وارد", amount, `من <@${uid}>`);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(total, uid, message.guild.id);
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(target.id, message.guild.id, amount, amount);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم التحويل بنجاح")
      .addFields(
        { name: "📤 المستلم",    value: `<@${target.id}>`,          inline: true },
        { name: "💵 المبلغ",    value: `${n(amount)} رون`,             inline: true },
        { name: "💳 الرسوم",    value: `${n(fee)} رون`,                inline: true },
        { name: "💳 رصيدك",     value: `${n(users[uid].balance)} رون`, inline: false }
      ).setTimestamp()] });
  }
};
