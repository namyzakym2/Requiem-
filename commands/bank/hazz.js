import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "حظ",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("حظ")
    .setDescription("🪙 لعبة الحظ (رمي العملة) — جرب حظك وضاعف مبلغه!")
    .addIntegerOption(o => o.setName("الرهان").setDescription("المبلغ الذي تود المراهنة به").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const bet = interaction.options.getInteger("الرهان");
    const uid = interaction.user.id;
    const users = load("users.json");

    // Sync from SQLite balance
    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < bet) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك في المحفظة: **${n(users[uid].balance || 0)} دولار**`)], ephemeral: true });
    }

    const win = Math.random() < 0.5;
    users[uid].gamesPlayed = (users[uid].gamesPlayed || 0) + 1;

    if (win) {
      users[uid].balance += bet;
      users[uid].gamesWon = (users[uid].gamesWon || 0) + 1;
      users[uid].totalEarned = (users[uid].totalEarned || 0) + bet;
      save("users.json", users);
      logTx(uid, "حظ_فوز", bet, "ربح في لعبة الحظ");

      db.prepare("UPDATE leveling SET bank_wallet = bank_wallet + ? WHERE userId = ? AND guildId = ?").run(bet, uid, interaction.guildId);

      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🪙 لعبة الحظ — فوز!")
        .setDescription(`لقد ابتسم لك الحظ! ظهرت العملة على وجه **الفوز** وضاعفت رهانك.\n\n💰 **الأرباح:** +${n(bet)} دولار\n💳 **رصيدك الجديد:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    } else {
      users[uid].balance -= bet;
      save("users.json", users);
      logTx(uid, "حظ_خسارة", -bet, "خسارة في لعبة الحظ");

      db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(bet, uid, interaction.guildId);

      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🪙 لعبة الحظ — خسارة!")
        .setDescription(`للأسف خاب الحظ وظهرت العملة على وجه **الخسارة**.\n\n📉 **الخسارة:** -${n(bet)} دولار\n💳 **رصيدك الجديد:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    }
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام الصحيح: \`${PREFIX}حظ <المبلغ>\``)] });

    const bet = parseInt(args[0]);
    if (!bet || isNaN(bet) || bet < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى كتابة مبلغ رهان صحيح.")] });

    const uid = message.author.id;
    const users = load("users.json");

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < bet) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك في المحفظة: **${n(users[uid].balance || 0)} دولار**`)] });
    }

    const win = Math.random() < 0.5;
    users[uid].gamesPlayed = (users[uid].gamesPlayed || 0) + 1;

    if (win) {
      users[uid].balance += bet;
      users[uid].gamesWon = (users[uid].gamesWon || 0) + 1;
      users[uid].totalEarned = (users[uid].totalEarned || 0) + bet;
      save("users.json", users);
      logTx(uid, "حظ_فوز", bet, "ربح في لعبة الحظ");

      db.prepare("UPDATE leveling SET bank_wallet = bank_wallet + ? WHERE userId = ? AND guildId = ?").run(bet, uid, message.guild.id);

      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🪙 لعبة الحظ — فوز!")
        .setDescription(`لقد ابتسم لك الحظ! ظهرت العملة على وجه **الفوز** وضاعفت رهانك.\n\n💰 **الأرباح:** +${n(bet)} دولار\n💳 **رصيدك الجديد:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    } else {
      users[uid].balance -= bet;
      save("users.json", users);
      logTx(uid, "حظ_خسارة", -bet, "خسارة في لعبة الحظ");

      db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(bet, uid, message.guild.id);

      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🪙 لعبة الحظ — خسارة!")
        .setDescription(`للأسف خاب الحظ وظهرت العملة على وجه **الخسارة**.\n\n📉 **الخسارة:** -${n(bet)} دولار\n💳 **رصيدك الجديد:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    }
  }
};
