import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import axios from "axios";

export default {
  name: "wiki",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("wiki")
    .setDescription("البحث في موسوعة ويكيبيديا")
    .addStringOption(o => o.setName("query").setDescription("الموضوع أو الكلمة المراد البحث عنها").setRequired(true)),

  async executeInteraction(interaction) {
    const query = interaction.options.getString("query");
    await interaction.deferReply();

    try {
      const info = await fetchWikipediaSummary(query);
      if (!info) {
        return interaction.editReply("❌ لم يتم العثور على نتائج لهذا الموضوع في ويكيبيديا.");
      }

      const embed = createWikiEmbed(info, interaction.user);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Wikipedia command error:", err);
      return interaction.editReply("❌ حدث خطأ أثناء الاتصال بموسوعة ويكيبيديا.");
    }
  },

  async executeMessage(message, args) {
    const query = args.join(" ");
    if (!query) {
      return message.reply("❌ يرجى كتابة الكلمة أو الموضوع المراد البحث عنه. مثال: `'wiki مكة المكرمة`.");
    }

    try {
      const info = await fetchWikipediaSummary(query);
      if (!info) {
        return message.reply("❌ لم يتم العثور على نتائج لهذا الموضوع في ويكيبيديا.");
      }

      const embed = createWikiEmbed(info, message.author);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Wikipedia message command error:", err);
      return message.reply("❌ حدث خطأ أثناء الاتصال بموسوعة ويكيبيديا.");
    }
  }
};

async function fetchWikipediaSummary(query) {
  try {
    // Try Arabic Wikipedia first
    const arUrl = `https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const arRes = await axios.get(arUrl, { timeout: 4000 });
    if (arRes.data && arRes.data.extract) {
      return {
        title: arRes.data.title,
        extract: arRes.data.extract,
        url: arRes.data.content_urls?.desktop?.page || `https://ar.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        thumbnail: arRes.data.thumbnail?.source || null,
        lang: "ar"
      };
    }
  } catch (err) {
    // If not found in Arabic, try English Wikipedia as fallback
    try {
      const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const enRes = await axios.get(enUrl, { timeout: 4000 });
      if (enRes.data && enRes.data.extract) {
        return {
          title: enRes.data.title,
          extract: enRes.data.extract,
          url: enRes.data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          thumbnail: enRes.data.thumbnail?.source || null,
          lang: "en"
        };
      }
    } catch (innerErr) {
      return null;
    }
  }
  return null;
}

function createWikiEmbed(info, requester) {
  const embed = new EmbedBuilder()
    .setColor(0x7F8C8D)
    .setTitle(`📖 ويكيبيديا: ${info.title}`)
    .setURL(info.url)
    .setDescription(info.extract.length > 1000 ? info.extract.slice(0, 1000) + "..." : info.extract)
    .setFooter({ text: `طلب بواسطة: ${requester.tag} | المصدر: ويكيبيديا ${info.lang === "ar" ? "العربية" : "الإنجليزية"}`, iconURL: requester.displayAvatarURL() })
    .setTimestamp();

  if (info.thumbnail) {
    embed.setThumbnail(info.thumbnail);
  }

  return embed;
}
