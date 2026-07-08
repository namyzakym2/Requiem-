import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, E } from "./utils.js";

export default {
  name: "ضبط_كولداون",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("ضبط_كولداون")
    .setDescription("⚙️ حدد مدة الانتظار (Cooldown) للأوامر")
    .addStringOption(o => o.setName("الأمر").setDescription("اسم الأمر المطلوب").addChoices(
      { name: "راتب", value: "راتب" },
      { name: "عمل", value: "عمل" },
      { name: "سرقة", value: "سرقة" }
    ).setRequired(true))
    .addIntegerOption(o => o.setName("الساعات").setDescription("عدد ساعات الانتظار المطلوب").setMinValue(0).setRequired(true)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const cmd = interaction.options.getString("الأمر");
    const hours = interaction.options.getInteger("الساعات");

    const s = load("settings.json");
    if (!s.cooldowns) s.cooldowns = {};
    s.cooldowns[cmd] = hours;
    save("settings.json", s);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الانتظار")
      .setDescription(`✅ تم تحديث مدة انتظار أمر **${cmd}** لتصبح **${hours}** ساعة.`)] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    if (args.length < 2) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("الاستخدام: `!ضبط_كولداون <راتب/عمل/سرقة> <الساعات>`")] });
    }

    const cmd = args[0];
    const hours = parseInt(args[1]);

    if (cmd !== "راتب" && cmd !== "عمل" && cmd !== "سرقة") {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("الأمر المحدد غير صحيح. اختر بين: راتب، عمل، سرقة.")] });
    }

    if (isNaN(hours) || hours < 0) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى إدخال عدد ساعات صحيح.")] });
    }

    const s = load("settings.json");
    if (!s.cooldowns) s.cooldowns = {};
    s.cooldowns[cmd] = hours;
    save("settings.json", s);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الانتظار")
      .setDescription(`✅ تم تحديث مدة انتظار أمر **${cmd}** لتصبح **${hours}** ساعة.`)] });
  }
};
