import { SlashCommandBuilder } from "discord.js";
export default {
  name: "slots",
  category: "bank",
  data: new SlashCommandBuilder().setName("slots").setDescription("لعبة السلوتس"),
  async executeInteraction(interaction) { return interaction.reply({ content: "لعبت السلوتس!" }); }
};
