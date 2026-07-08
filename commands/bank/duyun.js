import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n, E, noRoom } from "./utils.js";

export default {
  name: "ديون",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("ديون")
    .setDescription("💳 عرض قائمة الديون والقروض النشطة في السيرفر"),

  async executeInteraction(interaction, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const loans = load("loans.json");
    if (Object.keys(loans).length === 0) {
      return interaction.reply({ embeds: [E("💳 لا توجد ديون").setDescription("لا توجد أي قروض نشطة مسجلة في السيرفر حالياً. السيرفر خالٍ من الديون! 🎉")] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle("📈 قائمة الديون والقروض النشطة")
      .setDescription("قائمة الأعضاء الذين لديهم قروض معلقة والمبالغ المستحقة للبنك:")
      .setTimestamp();

    let totalDebt = 0;
    const lines = [];

    for (const [uid, info] of Object.entries(loans)) {
      totalDebt += info.due;
      lines.push(`• <@${uid}>: المقترض **${n(info.amount)} رون** | المستحق **${n(info.due)} رون**`);
    }

    embed.addFields({ name: `📊 إجمالي الديون المعلقة: ${n(totalDebt)} رون`, value: lines.join("\n") });

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const loans = load("loans.json");
    if (Object.keys(loans).length === 0) {
      return message.reply({ embeds: [E("💳 لا توجد ديون").setDescription("لا توجد أي قروض نشطة مسجلة في السيرفر حالياً. السيرفر خالٍ من الديون! 🎉")] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle("📈 قائمة الديون والقروض النشطة")
      .setDescription("قائمة الأعضاء الذين لديهم قروض معلقة والمبالغ المستحقة للبنك:")
      .setTimestamp();

    let totalDebt = 0;
    const lines = [];

    for (const [uid, info] of Object.entries(loans)) {
      totalDebt += info.due;
      lines.push(`• <@${uid}>: المقترض **${n(info.amount)} رون** | المستحق **${n(info.due)} رون**`);
    }

    embed.addFields({ name: `📊 إجمالي الديون المعلقة: ${n(totalDebt)} رون`, value: lines.join("\n") });

    return message.reply({ embeds: [embed] });
  }
};
