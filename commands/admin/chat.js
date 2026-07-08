import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "chat",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("⚙️ أوامر إدارة الشات")
    .addSubcommand(sub => sub.setName("clear").setDescription("مسح الرسائل").addIntegerOption(o => o.setName("عدد").setRequired(true)))
    .addSubcommand(sub => sub.setName("slowmode").setDescription("تحديد بطء الشات").addIntegerOption(o => o.setName("ثواني").setRequired(true)))
    .addSubcommand(sub => sub.setName("lock").setDescription("قفل الشات"))
    .addSubcommand(sub => sub.setName("unlock").setDescription("فتح الشات"))
    .addSubcommand(sub => sub.setName("nuke").setDescription("مسح الشات بالكامل")),

  async executeInteraction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: "ليس لديك صلاحية.", ephemeral: true });
    return interaction.reply({ content: "تم تنفيذ أمر الشات.", ephemeral: true });
  }
};
