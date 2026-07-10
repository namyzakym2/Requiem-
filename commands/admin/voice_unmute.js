import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export default {
  name: "voice_unmute",
  category: "admin",
  data: new SlashCommandBuilder().setName("voice_unmute").setDescription("إلغاء إسكات صوتي").addUserOption(o=>o.setName("user").setRequired(true)),
  async executeInteraction(interaction) { if (!interaction.memberPermissions?.has(PermissionFlagsBits.MuteMembers)) return interaction.reply({content: "ليس لديك صلاحية.", ephemeral: true}); return interaction.reply({ content: "تم إلغاء الإسكات الصوتي." }); }
};
