import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, settings, C, E, noRoom } from "./utils.js";

export default {
  name: "محظورين",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("محظورين")
    .setDescription("⚙️ قائمة الأعضاء المحظورين من نظام وألعاب البنك"),

  async executeInteraction(interaction, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const bans = load("bans.json");
    if (Object.keys(bans).length === 0) {
      return interaction.reply({ embeds: [E("⚙️ المحظودولار").setDescription("لا يوجد أي أعضاء محظورين في نظام البنك حالياً. الجميع يمتلك حق الوصول! 🎉")] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle("⚙️ قائمة المحظورين من البنك")
      .setDescription("الأعضاء المحظودولار من ألعاب ومعاملات البنك:")
      .setTimestamp();

    const lines = [];
    for (const [uid, info] of Object.entries(bans)) {
      const date = new Date(info.time).toLocaleDateString("ar-EG");
      lines.push(`• <@${uid}>: محظور بواسطة <@${info.bannedBy}> بتاريخ **${date}** | السبب: *${info.reason}*`);
    }

    embed.setDescription(lines.join("\n"));
    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const bans = load("bans.json");
    if (Object.keys(bans).length === 0) {
      return message.reply({ embeds: [E("⚙️ المحظودولار").setDescription("لا يوجد أي أعضاء محظورين في نظام البنك حالياً. الجميع يمتلك حق الوصول! 🎉")] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle("⚙️ قائمة المحظورين من البنك")
      .setDescription("الأعضاء المحظودولار من ألعاب ومعاملات البنك:")
      .setTimestamp();

    const lines = [];
    for (const [uid, info] of Object.entries(bans)) {
      const date = new Date(info.time).toLocaleDateString("ar-EG");
      lines.push(`• <@${uid}>: محظور بواسطة <@${info.bannedBy}> بتاريخ **${date}** | السبب: *${info.reason}*`);
    }

    embed.setDescription(lines.join("\n"));
    return message.reply({ embeds: [embed] });
  }
};
