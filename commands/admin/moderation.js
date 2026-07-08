import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { C, E } from "./utils.js";

export default {
  name: "moderation",
  category: "admin",
  // هذا ملف يجمع عدة أوامر، سيتم استدعاؤه بناءً على اسم الأمر الفرعي
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("⚙️ أوامر الموديريشن")
    .addSubcommand(sub => sub.setName("ban").setDescription("حظر عضو").addUserOption(o => o.setName("عضو").setRequired(true)).addStringOption(o => o.setName("سبب").setRequired(false)))
    .addSubcommand(sub => sub.setName("kick").setDescription("طرد عضو").addUserOption(o => o.setName("عضو").setRequired(true)).addStringOption(o => o.setName("سبب").setRequired(false)))
    .addSubcommand(sub => sub.setName("mute").setDescription("إسكات عضو").addUserOption(o => o.setName("عضو").setRequired(true)))
    .addSubcommand(sub => sub.setName("unmute").setDescription("إلغاء إسكات عضو").addUserOption(o => o.setName("عضو").setRequired(true))),

  async executeInteraction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: "ليس لديك صلاحية.", ephemeral: true });
    
    const sub = interaction.options.getSubcommand();
    // تنفيذ المنطق الخاص بكل أمر بناءً على sub
    return interaction.reply({ content: `تم تنفيذ أمر ${sub}`, ephemeral: true });
  }
};
