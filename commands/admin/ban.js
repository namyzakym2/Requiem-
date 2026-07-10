import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "ban",
  category: "admin",
  data: new SlashCommandBuilder().setName("ban").setDescription("حظر عضو").addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user");
    await interaction.guild.members.ban(user);
    await interaction.reply({ content: `🚫 تم حظر ${user.tag}` });
  }
};
