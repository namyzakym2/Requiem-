import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "kick",
  category: "admin",
  data: new SlashCommandBuilder().setName("kick").setDescription("طرد عضو").addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user");
    await interaction.guild.members.kick(user);
    await interaction.reply({ content: `👟 تم طرد ${user.tag}` });
  }
};
