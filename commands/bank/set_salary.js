import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, E, n } from "./utils.js";

export default {
  name: "ضبط_راتب",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("ضبط_راتب")
    .setDescription("⚙️ حدد نطاق الراتب اليومي الأدنى والأقصى")
    .addIntegerOption(o => o.setName("الأدنى").setDescription("الحد الأدنى للراتب").setMinValue(1).setRequired(true))
    .addIntegerOption(o => o.setName("الأقصى").setDescription("الحد الأقصى للراتب").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const min = interaction.options.getInteger("الأدنى");
    const max = interaction.options.getInteger("الأقصى");

    if (min > max) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("يجب أن يكون الحد الأدنى أصغر من أو يساوي الحد الأقصى.")], ephemeral: true });
    }

    const s = load("settings.json");
    s.salaryMin = min;
    s.salaryMax = max;
    save("settings.json", s);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الراتب")
      .setDescription(`✅ تم تحديث حدود الراتب اليومي بنجاح:\n\n• **الحد الأدنى:** ${n(min)} دولار\n• **الحد الأقصى:** ${n(max)} دولار`)] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    if (args.length < 2) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("الاستخدام: `!ضبط_راتب <الأدنى> <الأقصى>`")] });
    }

    const min = parseInt(args[0]);
    const max = parseInt(args[1]);

    if (isNaN(min) || isNaN(max) || min < 1 || min > max) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال قيم صحيحة للراتب (الأدنى يجب أن يكون أصغر من الأقصى).")] });
    }

    const s = load("settings.json");
    s.salaryMin = min;
    s.salaryMax = max;
    save("settings.json", s);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الراتب")
      .setDescription(`✅ تم تحديث حدود الراتب اليومي بنجاح:\n\n• **الحد الأدنى:** ${n(min)} دولار\n• **الحد الأقصى:** ${n(max)} دولار`)] });
  }
};
