import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "بيع_سهم",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("بيع_سهم")
    .setDescription("📉 بيع أسهمك الاستثمارية")
    .addStringOption(o => o.setName("الشركة").setDescription("اسم الشركة (مثل Apple)").setRequired(true))
    .addIntegerOption(o => o.setName("الكمية").setDescription("كمية الأسهم المراد بيعها").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const company = interaction.options.getString("الشركة");
    const qty = interaction.options.getInteger("الكمية");

    const market = load("market.json");
    const stock = market.stocks[company] || Object.values(market.stocks).find(s => s.symbol.toUpperCase() === company.toUpperCase());
    if (!stock) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذه الشركة غير موجودة في السوق.")], ephemeral: true });

    const uid = interaction.user.id;
    const users = load("users.json");
    const symbol = stock.symbol;

    if (!users[uid] || !users[uid].stocks || !users[uid].stocks[symbol] || users[uid].stocks[symbol].qty < qty) {
      const owned = users[uid]?.stocks?.[symbol]?.qty || 0;
      return interaction.reply({ embeds: [E("❌ كمية غير كافية").setDescription(`أنت تمتلك **${n(owned)}** سهم فقط في هذه الشركة.`)], ephemeral: true });
    }

    const price = Math.round(stock.price);
    const total = price * qty;
    const avg = users[uid].stocks[symbol].avgPrice;
    const profit = (price - avg) * qty;

    users[uid].stocks[symbol].qty -= qty;
    if (users[uid].stocks[symbol].qty === 0) {
      delete users[uid].stocks[symbol];
    }

    users[uid].balance = (users[uid].balance || 0) + total;
    save("users.json", users);
    logTx(uid, "بيع_أسهم", total, `بيع ${qty} سهم في ${company}`);

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(uid, interaction.guildId, total, total);

    const sign = profit >= 0 ? "+" : "";
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم البيع بنجاح")
      .setDescription(`لقد بعت **${n(qty)}** سهم من شركة **${company}** بسعر **${n(price)} رون** للسهم.`)
      .addFields(
        { name: "💵 العائد الكلي", value: `${n(total)} رون`, inline: true },
        { name: "📊 صافي الربح/الخسارة", value: `${sign}${n(profit)} رون`, inline: true },
        { name: "💳 رصيدك الحالي", value: `${n(users[uid].balance)} رون`, inline: false }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 2) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام: \`${PREFIX}بيع_سهم <الشركة/الرمز> <الكمية>\``)] });

    const company = args[0];
    const qty = parseInt(args[1]);
    if (!qty || isNaN(qty) || qty < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال كمية صحيحة.")] });

    const market = load("market.json");
    const stock = market.stocks[company] || Object.values(market.stocks).find(s => s.symbol.toUpperCase() === company.toUpperCase() || s.symbol.toUpperCase() === args[0].toUpperCase());
    if (!stock) return message.reply({ embeds: [E("❌ خطأ").setDescription("هذه الشركة غير موجودة في السوق.")] });

    const uid = message.author.id;
    const users = load("users.json");
    const symbol = stock.symbol;

    if (!users[uid] || !users[uid].stocks || !users[uid].stocks[symbol] || users[uid].stocks[symbol].qty < qty) {
      const owned = users[uid]?.stocks?.[symbol]?.qty || 0;
      return message.reply({ embeds: [E("❌ كمية غير كافية").setDescription(`أنت تمتلك **${n(owned)}** سهم فقط في هذه الشركة.`)] });
    }

    const price = Math.round(stock.price);
    const total = price * qty;
    const avg = users[uid].stocks[symbol].avgPrice;
    const profit = (price - avg) * qty;

    users[uid].stocks[symbol].qty -= qty;
    if (users[uid].stocks[symbol].qty === 0) {
      delete users[uid].stocks[symbol];
    }

    users[uid].balance = (users[uid].balance || 0) + total;
    save("users.json", users);
    logTx(uid, "بيع_أسهم", total, `بيع ${qty} سهم في ${company}`);

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(uid, message.guild.id, total, total);

    const sign = profit >= 0 ? "+" : "";
    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم البيع بنجاح")
      .setDescription(`لقد بعت **${n(qty)}** سهم من شركة **${company}** بسعر **${n(price)} رون** للسهم.`)
      .addFields(
        { name: "💵 العائد الكلي", value: `${n(total)} رون`, inline: true },
        { name: "📊 صافي الربح/الخسارة", value: `${sign}${n(profit)} رون`, inline: true },
        { name: "💳 رصيدك الحالي", value: `${n(users[uid].balance)} رون`, inline: false }
      ).setTimestamp()] });
  }
};
