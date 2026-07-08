import { SlashCommandBuilder } from "discord.js";
export default {
  name: "crime",
  category: "bank",
  data: new SlashCommandBuilder().setName("crime").setDescription("جريمة"),
  async executeInteraction(interaction) { return interaction.reply({ content: "قمت بجريمة!" }); }
};
