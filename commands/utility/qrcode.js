import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "qrcode",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("qrcode")
    .setDescription("إنشاء رمز استجابة سريعة (QR Code) لأي نص أو رابط")
    .addStringOption(o => o.setName("text").setDescription("النص أو الرابط المراد تحويله إلى كود QR").setRequired(true)),

  async executeInteraction(interaction) {
    const text = interaction.options.getString("text");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle("📷 منشئ أكواد الـ QR")
      .setDescription("تم إنشاء كود الـ QR الخاص بك بنجاح!")
      .addFields({ name: "🔗 المحتوى:", value: `\`\`\`\n${text}\n\`\`\`` })
      .setImage(qrUrl)
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args) {
    const text = args.join(" ");
    if (!text) {
      return message.reply("❌ يرجى كتابة النص أو الرابط المراد تحويله إلى كود QR. مثال: `'qrcode https://google.com`.");
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle("📷 منشئ أكواد الـ QR")
      .setDescription("تم إنشاء كود الـ QR الخاص بك بنجاح!")
      .addFields({ name: "🔗 المحتوى:", value: `\`\`\`\n${text}\n\`\`\`` })
      .setImage(qrUrl)
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
