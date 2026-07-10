import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "kiss",
  category: "social",
  data: new SlashCommandBuilder().setName("kiss").setDescription("قبلة").addUserOption(o => o.setName("user").setDescription("الشخص").setRequired(true)),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user");
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`💋 ${interaction.user} يقبل ${user}!`)] });
  }
};
