import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "trivia",
  category: "games",
  data: new SlashCommandBuilder().setName("trivia").setDescription("لعبة معلومات عامة"),
  async executeInteraction(interaction) {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle("❓ معلومات عامة").setDescription("ما هو عاصمة السعودية؟ (الرياض / جدة)")] });
  }
};
