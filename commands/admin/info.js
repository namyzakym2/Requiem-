import { SlashCommandBuilder } from "discord.js";

export default {
  name: "info",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("ℹ️ أوامر المعلومات")
    .addSubcommand(sub => sub.setName("userinfo").setDescription("معلومات عضو").addUserOption(o => o.setName("user").setRequired(true)))
    .addSubcommand(sub => sub.setName("serverinfo").setDescription("معلومات السيرفر"))
    .addSubcommand(sub => sub.setName("roleinfo").setDescription("معلومات رتبة").addRoleOption(o => o.setName("role").setRequired(true)))
    .addSubcommand(sub => sub.setName("avatar").setDescription("صورة عضو").addUserOption(o => o.setName("user").setRequired(true)))
    .addSubcommand(sub => sub.setName("ping").setDescription("سرعة البوت")),

  async executeInteraction(interaction) {
    return interaction.reply({ content: "تم تنفيذ أمر المعلومات.", ephemeral: true });
  }
};
