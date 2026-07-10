import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "slap",
  category: "social",
  data: new SlashCommandBuilder().setName("slap").setDescription("صفعة").addUserOption(o => o.setName("user").setDescription("الشخص").setRequired(true)),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user");
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`👋 ${interaction.user} يصفع ${user}!`)] });
  }
};
