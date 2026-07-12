import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { GoogleGenAI } from "@google/genai";

export default {
  name: "translate",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("ترجمة النصوص باستخدام الذكاء الاصطناعي")
    .addStringOption(o => o.setName("text").setDescription("النص المراد ترجمته").setRequired(true))
    .addStringOption(o => o.setName("to").setDescription("اللغة المراد الترجمة إليها (مثال: العربية، الإنجليزية، اليابانية)").setRequired(false)),

  async executeInteraction(interaction) {
    const text = interaction.options.getString("text");
    const targetLang = interaction.options.getString("to") || "العربية";
    await interaction.deferReply();

    try {
      const translation = await performTranslation(text, targetLang);
      
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("🌐 مترجم الذكاء الاصطناعي")
        .addFields(
          { name: "📥 النص الأصلي:", value: `\`\`\`\n${text}\n\`\`\`` },
          { name: `📤 الترجمة إلى (${targetLang}):`, value: `\`\`\`\n${translation}\n\`\`\`` }
        )
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Translation command error:", err);
      return interaction.editReply("❌ حدث خطأ أثناء محاولة ترجمة النص. يرجى المحاولة لاحقاً.");
    }
  },

  async executeMessage(message, args) {
    if (args.length === 0) {
      return message.reply("❌ يرجى كتابة النص المراد ترجمته. مثال: `'translate Hello, how are you?` أو `'translate Bonjour --to الإنجليزية`.");
    }

    // Support standard prefix: translate <text> --to <lang>
    let text = args.join(" ");
    let targetLang = "العربية";

    if (text.includes("--to ")) {
      const parts = text.split("--to ");
      text = parts[0].trim();
      targetLang = parts[1].trim() || "العربية";
    }

    try {
      const translation = await performTranslation(text, targetLang);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("🌐 مترجم الذكاء الاصطناعي")
        .addFields(
          { name: "📥 النص الأصلي:", value: `\`\`\`\n${text}\n\`\`\`` },
          { name: `📤 الترجمة إلى (${targetLang}):`, value: `\`\`\`\n${translation}\n\`\`\`` }
        )
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Translation message command error:", err);
      return message.reply("❌ حدث خطأ أثناء محاولة ترجمة النص. يرجى المحاولة لاحقاً.");
    }
  }
};

async function performTranslation(text, targetLang) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Translate the following text into ${targetLang}. Provide ONLY the translation itself without any extra explanation, intro, or markdown wrapper unless necessary.
Text to translate:
"${text}"`,
  });

  return response.text?.trim() || "تعذر الحصول على ترجمة.";
}
