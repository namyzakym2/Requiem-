import { SlashCommandBuilder } from "discord.js";
export default {
  name: "mine",
  category: "bank",
  data: new SlashCommandBuilder().setName("mine").setDescription("تعدين"),
  async executeInteraction(interaction) { return interaction.reply({ content: "قمت بالتعدين!" }); }
};
