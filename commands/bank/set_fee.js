import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, E } from "./utils.js";

export default {
  name: "ضبط_فائدة",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("ضبط_فائدة")
    .setDescription("⚙️ حدد نسبة رسوم/عمولة تحويل الأموال")
    .addNumberOption(o => o.setName("النسبة").setDescription("النسبة المئوية لرسوم التحويل (مثال: 0.05 لـ 5%)").setMinValue(0).setMaxValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const val = interaction.options.getNumber("النسبة");
    const s = load("settings.json");
    s.transferFee = val;
    save("settings.json", s);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الرسوم")
      .setDescription(`✅ تم تحديث نسبة رسوم التحويل بنجاح لتصبح **${(val * 100).toFixed(1)}%**.`)] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    if (args.length < 1) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("الاستخدام: `!ضبط_فائدة <النسبة>` (مثال: 0.05 لـ 5%)")] });
    }

    const val = parseFloat(args[0]);
    if (isNaN(val) || val < 0 || val > 1) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال نسبة صحيحة بين 0.0 و 1.0 (مثال: 0.05 لـ 5%).")] });
    }

    const s = load("settings.json");
    s.transferFee = val;
    save("settings.json", s);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الرسوم")
      .setDescription(`✅ تم تحديث نسبة رسوم التحويل بنجاح لتصبح **${(val * 100).toFixed(1)}%**.`)] });
  }
};
