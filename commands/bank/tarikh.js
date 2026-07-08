import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n, E, noRoom } from "./utils.js";

export default {
  name: "تاريخ",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("تاريخ")
    .setDescription("📅 عرض سجل معاملاتك المالية الأخيرة"),

  async executeInteraction(interaction, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const txs = load("transactions.json");

    if (!txs[uid] || txs[uid].length === 0) {
      return interaction.reply({ embeds: [E("📅 السجل فارغ").setDescription("لا توجد أي معاملات مالية مسجلة في حسابك حالياً.")], ephemeral: true });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle(`📅 سجل معاملات ${interaction.user.username}`)
      .setTimestamp();

    const items = txs[uid].slice(0, 10).map((tx, idx) => {
      const sign = tx.amount >= 0 ? "+" : "";
      const date = new Date(tx.t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      return `**${idx + 1}.** [${date}] **${tx.type}**: ${sign}${n(tx.amount)} رون ${tx.note ? `(*${tx.note}*)` : ""}`;
    });

    embed.setDescription(items.join("\n"));
    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const uid = message.author.id;
    const txs = load("transactions.json");

    if (!txs[uid] || txs[uid].length === 0) {
      return message.reply({ embeds: [E("📅 السجل فارغ").setDescription("لا توجد أي معاملات مالية مسجلة في حسابك حالياً.")] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle(`📅 سجل معاملات ${message.author.username}`)
      .setTimestamp();

    const items = txs[uid].slice(0, 10).map((tx, idx) => {
      const sign = tx.amount >= 0 ? "+" : "";
      const date = new Date(tx.t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      return `**${idx + 1}.** [${date}] **${tx.type}**: ${sign}${n(tx.amount)} رون ${tx.note ? `(*${tx.note}*)` : ""}`;
    });

    embed.setDescription(items.join("\n"));
    return message.reply({ embeds: [embed] });
  }
};
