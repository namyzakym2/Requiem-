import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "حماية",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("حماية")
    .setDescription("🛡️ اشترِ درع حماية لحماية محفظتك من اللصوص لمدة 24 ساعة (التكلفة: 5,000 دولار)"),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const cost = 5000;
    const users = load("users.json");

    // Sync from SQLite balance
    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < cost) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`سعر درع الحماية هو **5,000 دولار**.\nرصيدك الحالي: **${n(users[uid].balance || 0)} دولار**`)], ephemeral: true });
    }

    const now = Date.now();
    const duration = 24 * 3600000; // 24 hours

    let currentProt = users[uid].protectionUntil || 0;
    if (currentProt < now) currentProt = now;

    users[uid].protectionUntil = currentProt + duration;
    users[uid].balance -= cost;
    save("users.json", users);
    logTx(uid, "شراء_حماية", -cost, "شراء درع حماية 24 ساعة");

    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(cost, uid, interaction.guildId);

    const rem = users[uid].protectionUntil - now;
    const h = Math.floor(rem / 3600000);
    const m = Math.floor((rem % 3600000) / 60000);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🛡️ تم تفعيل درع الحماية!")
      .setDescription(`لقد اشتريت درع حماية بنجاح مقابل **5,000 دولار**.\n\n🔒 **رصيد محفظتك محمي تماماً من محاولات السرقة.**\n⏳ **الدرع فعال لمدة:** **${h} ساعة و ${m} دقيقة**.\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} دولار`)
      .setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const uid = message.author.id;
    const cost = 5000;
    const users = load("users.json");

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < cost) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`سعر درع الحماية هو **5,000 دولار**.\nرصيدك الحالي: **${n(users[uid].balance || 0)} دولار**`)] });
    }

    const now = Date.now();
    const duration = 24 * 3600000; // 24 hours

    let currentProt = users[uid].protectionUntil || 0;
    if (currentProt < now) currentProt = now;

    users[uid].protectionUntil = currentProt + duration;
    users[uid].balance -= cost;
    save("users.json", users);
    logTx(uid, "شراء_حماية", -cost, "شراء درع حماية 24 ساعة");

    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(cost, uid, message.guild.id);

    const rem = users[uid].protectionUntil - now;
    const h = Math.floor(rem / 3600000);
    const m = Math.floor((rem % 3600000) / 60000);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🛡️ تم تفعيل درع الحماية!")
      .setDescription(`لقد اشتريت درع حماية بنجاح مقابل **5,000 دولار**.\n\n🔒 **رصيد محفظتك محمي تماماً من محاولات السرقة.**\n⏳ **الدرع فعال لمدة:** **${h} ساعة و ${m} دقيقة**.\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} دولار`)
      .setTimestamp()] });
  }
};
