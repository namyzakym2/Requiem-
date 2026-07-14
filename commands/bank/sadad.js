import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "سداد",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("سداد")
    .setDescription("💳 سدد قرضك النشط للبنك")
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المراد سداده (اتركه فارغاً لسداد القرض كاملاً)").setRequired(false)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const loans = load("loans.json");

    if (!loans[uid]) {
      return interaction.reply({ embeds: [E("❌ لا توجد ديون").setDescription("أنت لا تمتلك أي قروض نشطة لسدادها حالياً. وضعك المالي ممتاز! 🎉")], ephemeral: true });
    }

    const inputAmount = interaction.options.getInteger("المبلغ");
    const due = loans[uid].due;
    const amountToPay = inputAmount ? Math.min(inputAmount, due) : due;

    if (amountToPay < 1) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال مبلغ سداد صحيح.")], ephemeral: true });
    }

    const users = load("users.json");

    // Sync from SQLite balance
    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amountToPay) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`المبلغ المراد سداده: **${n(amountToPay)} دولار**\nرصيدك في المحفظة: **${n(users[uid].balance || 0)} دولار**`)], ephemeral: true });
    }

    users[uid].balance -= amountToPay;
    loans[uid].due -= amountToPay;

    let isFullyPaid = false;
    if (loans[uid].due <= 0) {
      delete loans[uid];
      isFullyPaid = true;
    }

    save("users.json", users);
    save("loans.json", loans);
    logTx(uid, "سداد_قرض", -amountToPay, isFullyPaid ? "تسديد كامل القرض" : "تسديد جزء من القرض");

    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(amountToPay, uid, interaction.guildId);

    if (isFullyPaid) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎉 تم سداد القرض بالكامل")
        .setDescription(`تهانينا! لقد قمت بتسوية كامل ديونك للبنك.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} دولار\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    } else {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم سداد جزء من القرض")
        .setDescription(`لقد قمت بسداد جزء من قرضك بنجاح.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} دولار\n📉 **المبلغ المتبقي للسداد:** **${n(loans[uid].due)} دولار**\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    }
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const uid = message.author.id;
    const loans = load("loans.json");

    if (!loans[uid]) {
      return message.reply({ embeds: [E("❌ لا توجد ديون").setDescription("أنت لا تمتلك أي قروض نشطة لسدادها حالياً. وضعك المالي ممتاز! 🎉")] });
    }

    const due = loans[uid].due;
    let amountToPay = due;

    if (args.length >= 1) {
      const inputAmount = parseInt(args[0]);
      if (!inputAmount || isNaN(inputAmount) || inputAmount < 1) {
        return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال مبلغ سداد صحيح.")] });
      }
      amountToPay = Math.min(inputAmount, due);
    }

    const users = load("users.json");

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amountToPay) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`المبلغ المراد سداده: **${n(amountToPay)} دولار**\nرصيدك في المحفظة: **${n(users[uid].balance || 0)} دولار**`)] });
    }

    users[uid].balance -= amountToPay;
    loans[uid].due -= amountToPay;

    let isFullyPaid = false;
    if (loans[uid].due <= 0) {
      delete loans[uid];
      isFullyPaid = true;
    }

    save("users.json", users);
    save("loans.json", loans);
    logTx(uid, "سداد_قرض", -amountToPay, isFullyPaid ? "تسديد كامل القرض" : "تسديد جزء من القرض");

    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(amountToPay, uid, message.guild.id);

    if (isFullyPaid) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎉 تم سداد القرض بالكامل")
        .setDescription(`تهانينا! لقد قمت بتسوية كامل ديونك للبنك.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} دولار\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    } else {
      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم سداد جزء من القرض")
        .setDescription(`لقد قمت بسداد جزء من قرضك بنجاح.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} دولار\n📉 **المبلغ المتبقي للسداد:** **${n(loans[uid].due)} دولار**\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} دولار`)
        .setTimestamp()] });
    }
  }
};
