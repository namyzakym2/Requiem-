import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import axios from "axios";

export default {
  name: "weather",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("عرض حالة الطقس لمدينة معينة")
    .addStringOption(o => o.setName("city").setDescription("اسم المدينة (بالإنجليزية أو العربية)").setRequired(true)),

  async executeInteraction(interaction) {
    const city = interaction.options.getString("city");
    await interaction.deferReply();

    try {
      const response = await fetchWeatherData(city);
      if (!response) {
        return interaction.editReply("❌ لم يتم العثور على المدينة أو حدث خطأ في الاتصال.");
      }

      const embed = createWeatherEmbed(response, city, interaction.user);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply("❌ حدث خطأ غير متوقع أثناء جلب بيانات الطقس.");
    }
  },

  async executeMessage(message, args) {
    const city = args.join(" ");
    if (!city) {
      return message.reply("❌ يرجى كتابة اسم المدينة. مثال: `'weather الرياض` أو `'weather London`.");
    }

    try {
      const response = await fetchWeatherData(city);
      if (!response) {
        return message.reply("❌ لم يتم العثور على المدينة أو حدث خطأ في الاتصال.");
      }

      const embed = createWeatherEmbed(response, city, message.author);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply("❌ حدث خطأ غير متوقع أثناء جلب بيانات الطقس.");
    }
  }
};

async function fetchWeatherData(city) {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ar`;
    const res = await axios.get(url, { timeout: 5000 });
    return res.data;
  } catch (err) {
    return null;
  }
}

function createWeatherEmbed(data, cityQuery, requester) {
  const current = data.current_condition?.[0];
  const nearestArea = data.nearest_area?.[0];
  
  if (!current) {
    throw new Error("Invalid weather data");
  }

  const tempC = current.temp_C;
  const feelsLikeC = current.FeelsLikeC;
  const humidity = current.humidity;
  const windSpeed = current.windspeedKmph;
  
  // Get Arabic description from wttr.in
  let desc = current.lang_ar?.[0]?.value || current.weatherDesc?.[0]?.value || "غير متوفر";
  
  const cityName = nearestArea?.areaName?.[0]?.value || cityQuery;
  const country = nearestArea?.country?.[0]?.value || "";

  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`🌦️ طقس مدينة: ${cityName} ${country ? `(${country})` : ""}`)
    .setDescription(`الحالة الجوية الحالية في **${cityName}**:`)
    .addFields(
      { name: "🌡️ درجة الحرارة:", value: `**${tempC}°C** (المحسوسة: ${feelsLikeC}°C)`, inline: true },
      { name: "💧 الرطوبة:", value: `**${humidity}%**`, inline: true },
      { name: "💨 سرعة الرياح:", value: `**${windSpeed} كم/ساعة**`, inline: true },
      { name: "📝 حالة الجو:", value: `**${desc}**`, inline: false }
    )
    .setFooter({ text: `طلب بواسطة: ${requester.tag}`, iconURL: requester.displayAvatarURL() })
    .setTimestamp();

  return embed;
}
