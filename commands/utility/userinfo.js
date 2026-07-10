import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "userinfo",
  category: "utility",
  data: new SlashCommandBuilder().setName("userinfo").setDescription("معلومات المستخدم").addUserOption(o => o.setName("user").setDescription("الشخص")),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`👤 معلومات ${user.username}`).setDescription(`تاريخ الانضمام: ${interaction.guild.members.cache.get(user.id)?.joinedAt.toDateString()}`)] });
  }
};
