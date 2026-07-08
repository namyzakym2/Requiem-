import { SlashCommandBuilder } from "discord.js";
export default {
  name: "daily",
  category: "bank",
  data: new SlashCommandBuilder().setName("daily").setDescription("راتب يومي"),
  async executeInteraction(interaction) { return interaction.reply({ content: "تم استلام راتبك اليومي!" }); }
};
