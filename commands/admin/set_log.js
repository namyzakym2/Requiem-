import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export default {
  name: "set_log",
  category: "admin",
  data: new SlashCommandBuilder().setName("set_log").setDescription("ضبط سجلات"),
  async executeInteraction(interaction) { if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content: "ليس لديك صلاحية.", ephemeral: true}); return interaction.reply({ content: "تم ضبط السجلات." }); }
};
