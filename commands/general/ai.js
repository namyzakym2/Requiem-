import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { GoogleGenAI } from "@google/genai";

export default {
  name: "ai",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("التحدث مع الذكاء الاصطناعي")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("سؤالك للذكاء الاصطناعي")
        .setRequired(true)
    ),

  async executeInteraction(interaction, context) {
    const prompt = interaction.options.getString("prompt");
    await interaction.deferReply();

    try {
      const responseText = await generateAIResponse(prompt);
      const chunks = splitMessage(responseText, 1900);

      // Edit the initial deferred reply with the first chunk
      await interaction.editReply({ content: chunks[0] });

      // Follow up with remaining chunks if any
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i] });
      }
    } catch (err) {
      console.error("AI command interaction error:", err);
      return interaction.editReply({
        content: "❌ حدث خطأ أثناء التحدث مع الذكاء الاصطناعي. يرجى المحاولة لاحقاً."
      });
    }
  },

  async executeMessage(message, args, context) {
    const prompt = args.join(" ");
    if (!prompt) {
      return message.reply("❌ يرجى كتابة سؤال للذكاء الاصطناعي. مثال: `'ai ما هي عاصمة فرنسا؟`");
    }

    const tempMsg = await message.reply("🤖 جاري التفكير والكتابة...");

    try {
      const responseText = await generateAIResponse(prompt);
      const chunks = splitMessage(responseText, 1900);

      // Edit the temporary message with the first chunk
      await tempMsg.edit({ content: chunks[0] });

      // Send remaining chunks if any
      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send({ content: chunks[i] });
      }
    } catch (err) {
      console.error("AI command message error:", err);
      return tempMsg.edit({
        content: "❌ حدث خطأ أثناء التحدث مع الذكاء الاصطناعي. يرجى المحاولة لاحقاً."
      });
    }
  }
};

async function generateAIResponse(prompt) {
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
    contents: prompt,
  });

  return response.text?.trim() || "لم أتمكن من توليد إجابة.";
}

function splitMessage(text, maxLength = 1900) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLength));
    i += maxLength;
  }
  return chunks;
}
