import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "rate-staff",
  category: "general",
  data: new SlashCommandBuilder().setName("rate-staff").setDescription("تقييم أحد أعضاء الإدارة").addUserOption((option) => option.setName("staff").setDescription("العضو المراد تقييمه").setRequired(true)).addIntegerOption((option) => option.setName("rating").setDescription("التقييم من 1 إلى 5 نجوم").setRequired(true).setMinValue(1).setMaxValue(5)).addStringOption((option) => option.setName("feedback").setDescription("ملاحظاتك الإضافية").setRequired(false)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "rate-staff") {
        const settings = db.prepare("SELECT * FROM evaluation_settings WHERE guildId = ?").get(guild.id);
        if (!settings) return interaction.reply({ content: "❌ لم يتم إعداد نظام التقييم في هذا السيرفر.", ephemeral: true });
        const channel2 = guild.channels.cache.get(settings.channelId);
        if (!channel2) return interaction.reply({ content: "❌ قناة التقييمات غير موجودة.", ephemeral: true });
        const staff = interaction.options.getUser("staff", true);
        const rating = interaction.options.getInteger("rating", true);
        const feedback = interaction.options.getString("feedback") || "لا يوجد";
        const stars = "⭐".repeat(rating);
        const embed = new EmbedBuilder().setTitle("⭐ تقييم إداري جديد").addFields(
          { name: "الإداري", value: `${staff} (${staff.tag})`, inline: true },
          { name: "التقييم", value: stars, inline: true },
          { name: "المقيم", value: `${user} (${user.tag})`, inline: true },
          { name: "الملاحظات", value: feedback }
        ).setColor(65280).setTimestamp();
        await channel2.send({ embeds: [embed] });
        db.prepare("INSERT INTO evaluations (guildId, userId, staffId, rating, feedback) VALUES (?, ?, ?, ?, ?)").run(guild.id, user.id, staff.id, rating, feedback);
        await interaction.reply({ content: `✅ تم إرسال تقييمك لـ **${staff.tag}** بنجاح!`, ephemeral: true });
      }
  },
  async executeMessage(message, args, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    const guildId = message.guild.id;
    const commandName = "rate-staff";
    
  }
};
