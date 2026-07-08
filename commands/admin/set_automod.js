import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export default {
  name: "set_automod",
  category: "admin",
  data: new SlashCommandBuilder().setName("set_automod").setDescription("ضبط الحماية"),
  async executeInteraction(interaction) { if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content: "ليس لديك صلاحية.", ephemeral: true}); return interaction.reply({ content: "تم ضبط الحماية." }); }
};
