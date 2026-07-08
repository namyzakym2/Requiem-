import { SlashCommandBuilder } from "discord.js";
export default {
  name: "work",
  category: "bank",
  data: new SlashCommandBuilder().setName("work").setDescription("العمل"),
  async executeInteraction(interaction) { return interaction.reply({ content: "لقد عملت وحصلت على مكافأة!" }); }
};
