import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n, E, noRoom } from "./utils.js";

export default {
  name: "محفظة",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("محفظة")
    .setDescription("📈 عرض محفظتك الاستثمارية من الأسهم"),

  async executeInteraction(interaction, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const users = load("users.json");
    const market = load("market.json");

    if (!users[uid] || !users[uid].stocks || Object.keys(users[uid].stocks).length === 0) {
      return interaction.reply({ embeds: [E("💼 المحفظة فارغة").setDescription("لا تمتلك أي أسهم في محفظتك الاستثمارية حالياً. استخدم `/استثمار` للبدء في الاستثمار.")], ephemeral: true });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle(`📈 محفظة ${interaction.user.username} الاستثمارية`)
      .setTimestamp();

    let totalVal = 0;
    let totalInvested = 0;

    for (const [symbol, info] of Object.entries(users[uid].stocks)) {
      const stockKey = Object.keys(market.stocks).find(k => market.stocks[k].symbol === symbol);
      const stock = market.stocks[stockKey];
      if (!stock) continue;

      const currentPrice = Math.round(stock.price);
      const value = currentPrice * info.qty;
      const cost = info.avgPrice * info.qty;
      const gain = value - cost;
      const pct = cost > 0 ? ((gain / cost) * 100).toFixed(1) : 0;
      const sign = gain >= 0 ? "+" : "";

      totalVal += value;
      totalInvested += cost;

      embed.addFields({
        name: `${stock.emoji} ${stockKey} (${symbol})`,
        value: `**الكمية:** ${n(info.qty)}\n**متوسط الشراء:** ${n(info.avgPrice)} دولار\n**السعر الحالي:** ${n(currentPrice)} دولار\n**القيمة الحالية:** ${n(value)} دولار\n**الربح/الخسارة:** ${sign}${n(gain)} دولار (${sign}${pct}%)`,
        inline: true
      });
    }

    const totalGain = totalVal - totalInvested;
    const totalPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;
    const totalSign = totalGain >= 0 ? "+" : "";

    embed.setDescription(`📊 **ملخص الأداء:**\nإجمالي المستثمر: **${n(totalInvested)} دولار**\nالقيمة السوقية الحالية: **${n(totalVal)} دولار**\nالربح الإجمالي: **${totalSign}${n(totalGain)} دولار (${totalSign}${totalPct}%)**`);

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const uid = message.author.id;
    const users = load("users.json");
    const market = load("market.json");

    if (!users[uid] || !users[uid].stocks || Object.keys(users[uid].stocks).length === 0) {
      return message.reply({ embeds: [E("💼 المحفظة فارغة").setDescription("لا تمتلك أي أسهم في محفظتك الاستثمارية حالياً. استخدم `!استثمار` للبدء في الاستثمار.")] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle(`📈 محفظة ${message.author.username} الاستثمارية`)
      .setTimestamp();

    let totalVal = 0;
    let totalInvested = 0;

    for (const [symbol, info] of Object.entries(users[uid].stocks)) {
      const stockKey = Object.keys(market.stocks).find(k => market.stocks[k].symbol === symbol);
      const stock = market.stocks[stockKey];
      if (!stock) continue;

      const currentPrice = Math.round(stock.price);
      const value = currentPrice * info.qty;
      const cost = info.avgPrice * info.qty;
      const gain = value - cost;
      const pct = cost > 0 ? ((gain / cost) * 100).toFixed(1) : 0;
      const sign = gain >= 0 ? "+" : "";

      totalVal += value;
      totalInvested += cost;

      embed.addFields({
        name: `${stock.emoji} ${stockKey} (${symbol})`,
        value: `**الكمية:** ${n(info.qty)}\n**متوسط الشراء:** ${n(info.avgPrice)} دولار\n**السعر الحالي:** ${n(currentPrice)} دولار\n**القيمة الحالية:** ${n(value)} دولار\n**الربح/الخسارة:** ${sign}${n(gain)} دولار (${sign}${pct}%)`,
        inline: true
      });
    }

    const totalGain = totalVal - totalInvested;
    const totalPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;
    const totalSign = totalGain >= 0 ? "+" : "";

    embed.setDescription(`📊 **ملخص الأداء:**\nإجمالي المستثمر: **${n(totalInvested)} دولار**\nالقيمة السوقية الحالية: **${n(totalVal)} دولار**\nالربح الإجمالي: **${totalSign}${n(totalGain)} دولار (${totalSign}${totalPct}%)**`);

    return message.reply({ embeds: [embed] });
  }
};
