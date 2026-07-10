import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "serverinfo",
  category: "utility",
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("معلومات السيرفر"),
  async executeInteraction(interaction) {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 معلومات ${interaction.guild.name}`).setDescription(`عدد الأعضاء: ${interaction.guild.memberCount}`)] });
  }
};
