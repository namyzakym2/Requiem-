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
    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amountToPay) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`المبلغ المراد سداده: **${n(amountToPay)} رون**\nرصيدك في المحفظة: **${n(users[uid].balance || 0)} رون**`)], ephemeral: true });
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

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amountToPay, uid, interaction.guildId);

    if (isFullyPaid) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎉 تم سداد القرض بالكامل")
        .setDescription(`تهانينا! لقد قمت بتسوية كامل ديونك للبنك.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} رون\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    } else {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم سداد جزء من القرض")
        .setDescription(`لقد قمت بسداد جزء من قرضك بنجاح.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} رون\n📉 **المبلغ المتبقي للسداد:** **${n(loans[uid].due)} رون**\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} رون`)
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

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amountToPay) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`المبلغ المراد سداده: **${n(amountToPay)} رون**\nرصيدك في المحفظة: **${n(users[uid].balance || 0)} رون**`)] });
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

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amountToPay, uid, message.guild.id);

    if (isFullyPaid) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎉 تم سداد القرض بالكامل")
        .setDescription(`تهانينا! لقد قمت بتسوية كامل ديونك للبنك.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} رون\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    } else {
      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم سداد جزء من القرض")
        .setDescription(`لقد قمت بسداد جزء من قرضك بنجاح.\n\n💵 **المبلغ المدفوع:** ${n(amountToPay)} رون\n📉 **المبلغ المتبقي للسداد:** **${n(loans[uid].due)} رون**\n💳 **رصيدك المالي المتبقي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    }
  }
};
