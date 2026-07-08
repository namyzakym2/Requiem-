import { SlashCommandBuilder } from "discord.js";
export default {
  name: "pet",
  category: "bank",
  data: new SlashCommandBuilder().setName("pet").setDescription("حيوان أليف"),
  async executeInteraction(interaction) { return interaction.reply({ content: "اعتنيت بحيوانك الأليف!" }); }
};
