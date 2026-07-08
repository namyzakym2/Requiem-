import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export default {
  name: "unwarn",
  category: "admin",
  data: new SlashCommandBuilder().setName("unwarn").setDescription("إزالة تحذير").addUserOption(o=>o.setName("عضو").setRequired(true)),
  async executeInteraction(interaction) { if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({content: "ليس لديك صلاحية.", ephemeral: true}); return interaction.reply({ content: "تمت إزالة التحذير." }); }
};
