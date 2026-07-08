import { SlashCommandBuilder } from "discord.js";
export default {
  name: "fish",
  category: "bank",
  data: new SlashCommandBuilder().setName("fish").setDescription("صيد"),
  async executeInteraction(interaction) { return interaction.reply({ content: "اصطدت سمكة!" }); }
};
