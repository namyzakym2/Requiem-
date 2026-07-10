import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "shop",
  category: "economy",
  data: new SlashCommandBuilder().setName("shop").setDescription("متجر العناصر"),
  async executeInteraction(interaction) {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle("🛒 المتجر").setDescription("1. سيف (1000 رون)\n2. درع (2000 رون)")] });
  }
};
