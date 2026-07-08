import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, E } from "./utils.js";

export default {
  name: "ضبط_غرفة",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("ضبط_غرفة")
    .setDescription("⚙️ حدد الروم المخصص لمعاملات وألعاب البنك")
    .addChannelOption(o => o.setName("الروم").setDescription("الروم المطلوب تحديدها").setRequired(false)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const channel = interaction.options.getChannel("الروم");
    const s = load("settings.json");

    if (!channel) {
      s.bankRoom = "";
      save("settings.json", s);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الغرفة")
        .setDescription("✅ تم إلغاء تحديد روم البنك بنجاح. يمكن الآن تشغيل الأوامر في أي روم في السيرفر.")] });
    }

    s.bankRoom = channel.id;
    save("settings.json", s);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الغرفة")
      .setDescription(`✅ تم تحديد <#${channel.id}> كروم مخصصة لمعاملات البنك وألعابه بنجاح.`)] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    const channel = message.mentions.channels.first();
    const s = load("settings.json");

    if (!channel) {
      s.bankRoom = "";
      save("settings.json", s);
      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الغرفة")
        .setDescription("✅ تم إلغاء تحديد روم البنك بنجاح. يمكن الآن تشغيل الأوامر في أي روم في السيرفر.")] });
    }

    s.bankRoom = channel.id;
    save("settings.json", s);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إعدادات الغرفة")
      .setDescription(`✅ تم تحديد <#${channel.id}> كروم مخصصة لمعاملات البنك وألعابه بنجاح.`)] });
  }
};
