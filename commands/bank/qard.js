import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "قرض",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("قرض")
    .setDescription("💳 خذ قرضاً من البنك (الحد الأقصى: 30% من إجمالي ممتلكاتك، بفائدة 10%)")
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ الذي تود اقتراضه").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const amount = interaction.options.getInteger("المبلغ");
    const uid = interaction.user.id;
    const users = load("users.json");
    const loans = load("loans.json");

    if (loans[uid]) {
      return interaction.reply({ embeds: [E("❌ قرض نشط").setDescription(`لديك قرض قائم بالفعل بقيمة **${n(loans[uid].amount)} دولار** (المستحق للسداد: **${n(loans[uid].due)} دولار**).\nيجب عليك سداد القرض الحالي أولاً باستخدام \`/سداد\`.`)], ephemeral: true });
    }

    // Sync from SQLite balance
    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    const totalAssets = (users[uid].balance || 0) + (users[uid].bank_vault || 0);
    const maxLoan = Math.max(5000, Math.floor(totalAssets * 0.30));

    if (amount > maxLoan) {
      return interaction.reply({ embeds: [E("❌ تجاوز الحد الأقصى").setDescription(`الحد الأقصى للاقتراض المتاح لك هو **${n(maxLoan)} دولار** (30% من إجمالي أصولك المقدرة بـ **${n(totalAssets)} دولار**).`)], ephemeral: true });
    }

    const due = Math.floor(amount * 1.10); // 10% interest rate
    loans[uid] = {
      amount,
      due,
      time: Date.now()
    };

    users[uid].balance = (users[uid].balance || 0) + amount;
    save("users.json", users);
    save("loans.json", loans);
    logTx(uid, "قرض", amount, "أخذ قرض من البنك");

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, interaction.guildId, amount, amount);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تمت الموافقة على القرض")
      .setDescription(`لقد تم إيداع مبلغ القرض في محفظتك بنجاح.\n\n💵 **مبلغ القرض:** +${n(amount)} دولار\n📈 **المبلغ المستحق للسداد (شاملاً الفائدة 10%):** **${n(due)} دولار**\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} دولار`)
      .setFooter({ text: "استخدم /سداد لتسوية ديونك لتجنب الفوائد الغيابية." })
      .setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام الصحيح: \`${PREFIX}قرض <المبلغ>\``)] });

    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount) || amount < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال مبلغ قرض صحيح.")] });

    const uid = message.author.id;
    const users = load("users.json");
    const loans = load("loans.json");

    if (loans[uid]) {
      return message.reply({ embeds: [E("❌ قرض نشط").setDescription(`لديك قرض قائم بالفعل بقيمة **${n(loans[uid].amount)} دولار** (المستحق للسداد: **${n(loans[uid].due)} دولار**).\nيجب عليك سداد القرض الحالي أولاً باستخدام \`!سداد\`.`)] });
    }

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    const totalAssets = (users[uid].balance || 0) + (users[uid].bank_vault || 0);
    const maxLoan = Math.max(5000, Math.floor(totalAssets * 0.30));

    if (amount > maxLoan) {
      return message.reply({ embeds: [E("❌ تجاوز الحد الأقصى").setDescription(`الحد الأقصى للاقتراض المتاح لك هو **${n(maxLoan)} دولار** (30% من إجمالي أصولك المقدرة بـ **${n(totalAssets)} دولار**).`)] });
    }

    const due = Math.floor(amount * 1.10); // 10% interest rate
    loans[uid] = {
      amount,
      due,
      time: Date.now()
    };

    users[uid].balance = (users[uid].balance || 0) + amount;
    save("users.json", users);
    save("loans.json", loans);
    logTx(uid, "قرض", amount, "أخذ قرض من البنك");

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, message.guild.id, amount, amount);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تمت الموافقة على القرض")
      .setDescription(`لقد تم إيداع مبلغ القرض في محفظتك بنجاح.\n\n💵 **مبلغ القرض:** +${n(amount)} دولار\n📈 **المبلغ المستحق للسداد (شاملاً الفائدة 10%):** **${n(due)} دولار**\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} دولار`)
      .setFooter({ text: "استخدم !سداد لتسوية ديونك لتجنب الفوائد الغيابية." })
      .setTimestamp()] });
  }
};
