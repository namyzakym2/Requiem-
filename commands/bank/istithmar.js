import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "استثمار",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("استثمار")
    .setDescription("📈 استثمر في الأسهم")
    .addStringOption(o => o.setName("الشركة").setDescription("اسم الشركة (مثال: Apple)").setRequired(false))
    .addIntegerOption(o => o.setName("الكمية").setDescription("عدد الأسهم المراد شراؤها").setRequired(false)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const company = interaction.options.getString("الشركة");
    const qty = interaction.options.getInteger("الكمية");

    const market = load("market.json");
    if (!company) {
      const embed = new EmbedBuilder().setColor(C).setTitle("📈 أسعار الأسهم الحالية")
        .setDescription("الأسعار تتغير تلقائياً كل 5 دقائق.")
        .setFooter({ text: "استخدم /استثمار <الشركة> <الكمية> للشراء" });
        
      for (const [name, s] of Object.entries(market.stocks)) {
        embed.addFields({ name: `${s.emoji} ${name} (${s.symbol})`, value: `**السعر:** ${n(s.price)} رون`, inline: true });
      }
      return interaction.reply({ embeds: [embed] });
    }

    const stock = market.stocks[company] || Object.values(market.stocks).find(s => s.symbol.toUpperCase() === company.toUpperCase());
    if (!stock) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذه الشركة غير مدرجة في السوق.")], ephemeral: true });

    if (!qty || qty < 1) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("يرجى تحديد كمية صحيحة للشراء.")], ephemeral: true });

    const price = Math.round(stock.price);
    const total = price * qty;
    const uid = interaction.user.id;
    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0, stocks: {} };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < total) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك: **${n(users[uid].balance || 0)} رون**\nالتكلفة الإجمالية: **${n(total)} رون**`)], ephemeral: true });
    }

    users[uid].balance -= total;
    if (!users[uid].stocks) users[uid].stocks = {};
    const symbol = stock.symbol;
    if (!users[uid].stocks[symbol]) {
      users[uid].stocks[symbol] = { qty: 0, avgPrice: 0 };
    }

    const currentQty = users[uid].stocks[symbol].qty;
    const currentAvg = users[uid].stocks[symbol].avgPrice;
    const newQty = currentQty + qty;
    const newAvg = ((currentAvg * currentQty) + (price * qty)) / newQty;

    users[uid].stocks[symbol] = { qty: newQty, avgPrice: Math.round(newAvg) };
    save("users.json", users);
    logTx(uid, "شراء_أسهم", -total, `شراء ${qty} سهم في ${company}`);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(total, uid, interaction.guildId);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم الشراء بنجاح")
      .setDescription(`لقد اشتريت **${n(qty)}** سهم من شركة **${company}** بسعر **${n(price)} رون** للسهم.`)
      .addFields(
        { name: "💵 التكلفة الكلية", value: `${n(total)} رون`, inline: true },
        { name: "📈 متوسط الشراء", value: `${n(users[uid].stocks[symbol].avgPrice)} رون`, inline: true },
        { name: "💳 رصيدك المتبقي", value: `${n(users[uid].balance)} رون`, inline: false }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const market = load("market.json");
    if (args.length < 2) {
      const embed = new EmbedBuilder().setColor(C).setTitle("📈 أسعار الأسهم الحالية")
        .setDescription("الأسعار تتغير تلقائياً كل 5 دقائق.")
        .setFooter({ text: "استخدم !استثمار <الشركة/الرمز> <الكمية> للشراء" });
        
      for (const [name, s] of Object.entries(market.stocks)) {
        embed.addFields({ name: `${s.emoji} ${name} (${s.symbol})`, value: `**السعر:** ${n(s.price)} رون`, inline: true });
      }
      return message.reply({ embeds: [embed] });
    }

    const company = args[0];
    const qty = parseInt(args[1]);

    const stock = market.stocks[company] || Object.values(market.stocks).find(s => s.symbol.toUpperCase() === company.toUpperCase() || s.symbol.toUpperCase() === args[0].toUpperCase());
    if (!stock) return message.reply({ embeds: [E("❌ خطأ").setDescription("هذه الشركة غير مدرجة في السوق.")] });

    if (!qty || isNaN(qty) || qty < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى تحديد كمية صحيحة للشراء.")] });

    const price = Math.round(stock.price);
    const total = price * qty;
    const uid = message.author.id;
    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0, stocks: {} };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < total) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك: **${n(users[uid].balance || 0)} رون**\nالتكلفة الإجمالية: **${n(total)} رون**`)] });
    }

    users[uid].balance -= total;
    if (!users[uid].stocks) users[uid].stocks = {};
    const symbol = stock.symbol;
    if (!users[uid].stocks[symbol]) {
      users[uid].stocks[symbol] = { qty: 0, avgPrice: 0 };
    }

    const currentQty = users[uid].stocks[symbol].qty;
    const currentAvg = users[uid].stocks[symbol].avgPrice;
    const newQty = currentQty + qty;
    const newAvg = ((currentAvg * currentQty) + (price * qty)) / newQty;

    users[uid].stocks[symbol] = { qty: newQty, avgPrice: Math.round(newAvg) };
    save("users.json", users);
    logTx(uid, "شراء_أسهم", -total, `شراء ${qty} سهم في ${company}`);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(total, uid, message.guild.id);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم الشراء بنجاح")
      .setDescription(`لقد اشتريت **${n(qty)}** سهم من شركة **${company}** بسعر **${n(price)} رون** للسهم.`)
      .addFields(
        { name: "💵 التكلفة الكلية", value: `${n(total)} رون`, inline: true },
        { name: "📈 متوسط الشراء", value: `${n(users[uid].stocks[symbol].avgPrice)} رون`, inline: true },
        { name: "💳 رصيدك المتبقي", value: `${n(users[uid].balance)} رون`, inline: false }
      ).setTimestamp()] });
  }
};
