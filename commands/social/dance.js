import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "dance",
  category: "social",
  data: new SlashCommandBuilder().setName("dance").setDescription("رقص"),
  async executeInteraction(interaction) {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`💃 ${interaction.user} يرقص!`)] });
  }
};
