import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "hug",
  category: "social",
  data: new SlashCommandBuilder().setName("hug").setDescription("عناق").addUserOption(o => o.setName("user").setDescription("الشخص").setRequired(true)),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user");
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🫂 ${interaction.user} يعانق ${user}!`)] });
  }
};
