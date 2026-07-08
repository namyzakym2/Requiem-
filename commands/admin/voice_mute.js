import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
export default {
  name: "voice_mute",
  category: "admin",
  data: new SlashCommandBuilder().setName("voice_mute").setDescription("إسكات صوتي").addUserOption(o=>o.setName("عضو").setRequired(true)),
  async executeInteraction(interaction) { if (!interaction.memberPermissions?.has(PermissionFlagsBits.MuteMembers)) return interaction.reply({content: "ليس لديك صلاحية.", ephemeral: true}); return interaction.reply({ content: "تم الإسكات الصوتي." }); }
};
