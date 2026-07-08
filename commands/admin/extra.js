import { SlashCommandBuilder } from "discord.js";

export default {
  name: "extra",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("extra")
    .setDescription("⚙️ أوامر إضافية")
    .addSubcommand(sub => sub.setName("member-count").setDescription("عدد الأعضاء"))
    .addSubcommand(sub => sub.setName("channel-info").setDescription("معلومات روم"))
    .addSubcommand(sub => sub.setName("emoji-list").setDescription("قائمة الإيموجي"))
    .addSubcommand(sub => sub.setName("copy-role").setDescription("نسخ رتبة"))
    .addSubcommand(sub => sub.setName("clear-role").setDescription("مسح رتبة")),

  async executeInteraction(interaction) {
    return interaction.reply({ content: "تم تنفيذ أمر إضافي.", ephemeral: true });
  }
};
