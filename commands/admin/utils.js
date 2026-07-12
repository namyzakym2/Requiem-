import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "utils",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("utils")
    .setDescription("🛠️ أوامر مساعدة")
    .addSubcommand(sub => sub.setName("announce").setDescription("إعلان").addStringOption(o => o.setName("message").setRequired(true)))
    .addSubcommand(sub => sub.setName("say").setDescription("قول").addStringOption(o => o.setName("message").setRequired(true)))
    .addSubcommand(sub => sub.setName("poll").setDescription("تصويت").addStringOption(o => o.setName("question").setRequired(true)))
    .addSubcommand(sub => sub.setName("suggest").setDescription("اقتراح").addStringOption(o => o.setName("suggestion").setRequired(true)))
    .addSubcommand(sub => sub.setName("reminder").setDescription("تذكير").addStringOption(o => o.setName("time").setRequired(true)))
    .addSubcommand(sub => sub.setName("ticket").setDescription("فتح تذكرة")),

  async executeInteraction(interaction) {
    return interaction.reply({ content: "تم تنفيذ أمر المساعدة.", ephemeral: true });
  }
};
