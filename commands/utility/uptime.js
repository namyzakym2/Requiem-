import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "uptime",
  category: "utility",
  data: new SlashCommandBuilder().setName("uptime").setDescription("عرض وقت تشغيل البوت"),
  async executeInteraction(interaction) {
    const uptime = Math.floor(interaction.client.uptime / 1000 / 60);
    await interaction.reply({ content: `⏱️ البوت يعمل منذ ${uptime} دقيقة.` });
  }
};
