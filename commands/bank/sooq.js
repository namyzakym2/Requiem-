import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n, noRoom } from "./utils.js";

export default {
  name: "سوق",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("سوق")
    .setDescription("🛒 تصفح سوق العقارات والمركبات والسلع الفاخرة"),

  async executeInteraction(interaction, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const market = load("market.json");
    const embed = new EmbedBuilder().setColor(C)
      .setTitle("🛒 سوق الدولار المركزي")
      .setDescription("اشترِ العقارات والمركبات والأصول الفاخرة لزيادة إجمالي ثروتك والترقي!\nالأسعار تتقلب تلقائياً كل 5 دقائق.\nاستخدم `/شراء <الاسم>` للشراء أو `/بيع <الاسم>` للبيع.")
      .setTimestamp();

    const cats = {};
    for (const [name, p] of Object.entries(market.properties)) {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push({ name, price: Math.round(p.price) });
    }

    for (const [cat, items] of Object.entries(cats)) {
      const val = items.map(i => `• **${i.name}**: ${n(i.price)} دولار`).join("\n");
      embed.addFields({ name: cat, value: val, inline: true });
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const market = load("market.json");
    const embed = new EmbedBuilder().setColor(C)
      .setTitle("🛒 سوق الدولار المركزي")
      .setDescription("اشترِ العقارات والمركبات والأصول الفاخرة لزيادة إجمالي ثروتك والترقي!\nالأسعار تتقلب تلقائياً كل 5 دقائق.\nاستخدم `!شراء <الاسم>` للشراء أو `!بيع <الاسم>` للبيع.")
      .setTimestamp();

    const cats = {};
    for (const [name, p] of Object.entries(market.properties)) {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push({ name, price: Math.round(p.price) });
    }

    for (const [cat, items] of Object.entries(cats)) {
      const val = items.map(i => `• **${i.name}**: ${n(i.price)} دولار`).join("\n");
      embed.addFields({ name: cat, value: val, inline: true });
    }

    return message.reply({ embeds: [embed] });
  }
};
