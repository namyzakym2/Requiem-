import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import axios from "axios";

export default {
  name: "prayer",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("prayer")
    .setDescription("عرض مواقيت الصلاة لمدينة معينة")
    .addStringOption(o => o.setName("city").setDescription("اسم المدينة (مثال: الرياض، القاهرة، مكة)").setRequired(true)),

  async executeInteraction(interaction) {
    const city = interaction.options.getString("city");
    await interaction.deferReply();

    try {
      const data = await fetchPrayerTimes(city);
      if (!data) {
        return interaction.editReply("❌ لم يتم العثور على المدينة أو حدث خطأ أثناء جلب البيانات.");
      }

      const embed = createPrayerEmbed(data, city, interaction.user);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Prayer command error:", err);
      return interaction.editReply("❌ حدث خطأ غير متوقع أثناء جلب مواقيت الصلاة.");
    }
  },

  async executeMessage(message, args) {
    const city = args.join(" ");
    if (!city) {
      return message.reply("❌ يرجى كتابة اسم المدينة لمعرفة مواقيت الصلاة فيها. مثال: `'prayer دبي`.");
    }

    try {
      const data = await fetchPrayerTimes(city);
      if (!data) {
        return message.reply("❌ لم يتم العثور على المدينة أو حدث خطأ أثناء جلب البيانات.");
      }

      const embed = createPrayerEmbed(data, city, message.author);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Prayer message command error:", err);
      return message.reply("❌ حدث خطأ غير متوقع أثناء جلب مواقيت الصلاة.");
    }
  }
};

async function fetchPrayerTimes(city) {
  try {
    // Aladhan API accepts city and country. We can pass country as empty or let the API auto-resolve
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=`;
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data && response.data.code === 200) {
      return response.data.data;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function createPrayerEmbed(data, cityQuery, requester) {
  const timings = data.timings;
  const dateInfo = data.date;

  const hijri = dateInfo.hijri;
  const gregorian = dateInfo.gregorian;

  const hijriDateStr = `${hijri.day} ${hijri.month.ar} ${hijri.year} هـ`;
  const gregorianDateStr = `${gregorian.day} ${gregorian.month.en} ${gregorian.year} م`;

  const embed = new EmbedBuilder()
    .setColor(0x1ABC9C)
    .setTitle(`🕌 مواقيت الصلاة في مدينة: ${cityQuery}`)
    .setDescription(`اليوم: **${hijri.weekday.ar}**\n📅 التاريخ الهجري: **${hijriDateStr}**\n📅 التاريخ الميلادي: **${gregorianDateStr}**`)
    .addFields(
      { name: "🕋 الفجر (Fajr):", value: `**${timings.Fajr}**`, inline: true },
      { name: "🌅 الشروق (Sunrise):", value: `**${timings.Sunrise}**`, inline: true },
      { name: "☀️ الظهر (Dhuhr):", value: `**${timings.Dhuhr}**`, inline: true },
      { name: "🌇 العصر (Asr):", value: `**${timings.Asr}**`, inline: true },
      { name: "🌆 المغرب (Maghrib):", value: `**${timings.Maghrib}**`, inline: true },
      { name: "🌃 العشاء (Isha):", value: `**${timings.Isha}**`, inline: true }
    )
    .setFooter({ text: `طلب بواسطة: ${requester.tag} | التوقيت المحلي للمدينة`, iconURL: requester.displayAvatarURL() })
    .setTimestamp();

  return embed;
}
