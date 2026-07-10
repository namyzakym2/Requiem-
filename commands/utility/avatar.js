import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "avatar",
  category: "utility",
  data: new SlashCommandBuilder().setName("avatar").setDescription("عرض صورة المستخدم").addUserOption(o => o.setName("user").setDescription("الشخص")),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`صورة ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))] });
  }
};
