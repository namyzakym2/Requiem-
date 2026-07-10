import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export default {
  name: "warn",
  category: "admin",
  data: new SlashCommandBuilder().setName("warn").setDescription("تحذير عضو").addUserOption(o=>o.setName("user").setRequired(true)),
  async executeInteraction(interaction) { if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({content: "ليس لديك صلاحية.", ephemeral: true}); return interaction.reply({ content: "تم تحذير العضو." }); }
};
