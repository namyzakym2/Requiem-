import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "server_roles",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("⚙️ إعدادات السيرفر والرتب")
    .addSubcommand(sub => sub.setName("add-role").setDescription("إضافة رتبة").addUserOption(o => o.setName("user").setRequired(true)).addRoleOption(o => o.setName("role").setRequired(true)))
    .addSubcommand(sub => sub.setName("remove-role").setDescription("إزالة رتبة").addUserOption(o => o.setName("user").setRequired(true)).addRoleOption(o => o.setName("role").setRequired(true)))
    .addSubcommand(sub => sub.setName("set-welcome").setDescription("ترحيب").addChannelOption(o => o.setName("channel").setRequired(true)))
    .addSubcommand(sub => sub.setName("set-leave").setDescription("مغادرة").addChannelOption(o => o.setName("channel").setRequired(true)))
    .addSubcommand(sub => sub.setName("set-modlog").setDescription("سجل المود").addChannelOption(o => o.setName("channel").setRequired(true)))
    .addSubcommand(sub => sub.setName("set-prefix").setDescription("تغيير بريفكس").addStringOption(o => o.setName("prefix").setRequired(true))),

  async executeInteraction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "ليس لديك صلاحية.", ephemeral: true });
    return interaction.reply({ content: "تم تنفيذ أمر السيرفر.", ephemeral: true });
  }
};
