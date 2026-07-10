import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "misc",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("misc")
    .setDescription("⚙️ أوامر متنوعة")
    .addSubcommand(sub => sub.setName("nick").setDescription("تغيير اسم").addUserOption(o => o.setName("user").setRequired(true)).addStringOption(o => o.setName("nickname").setRequired(true)))
    .addSubcommand(sub => sub.setName("hide").setDescription("إخفاء روم"))
    .addSubcommand(sub => sub.setName("show").setDescription("إظهار روم"))
    .addSubcommand(sub => sub.setName("move-all").setDescription("نقل الكل"))
    .addSubcommand(sub => sub.setName("ban-list").setDescription("قائمة الحظر"))
    .addSubcommand(sub => sub.setName("report").setDescription("تبليغ").addUserOption(o => o.setName("user").setRequired(true))),

  async executeInteraction(interaction) {
    return interaction.reply({ content: "تم تنفيذ أمر متنوع.", ephemeral: true });
  }
};
