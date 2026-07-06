import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "suggest",
  category: "general",
  data: new SlashCommandBuilder().setName("suggest").setDescription("إرسال اقتراح جديد").addStringOption((option) => option.setName("suggestion").setDescription("اكتب اقتراحك هنا").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "suggest") {
        const settings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ?").get(guild.id);
        if (!settings) return interaction.reply({ content: "❌ لم يتم إعداد نظام الاقتراحات في هذا السيرفر.", ephemeral: true });
        const channel2 = guild.channels.cache.get(settings.channelId);
        if (!channel2) return interaction.reply({ content: "❌ قناة الاقتراحات غير موجودة.", ephemeral: true });
        const suggestion = interaction.options.getString("suggestion", true);
        const embed = new EmbedBuilder().setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setTitle("💡 اقتراح جديد").setDescription(suggestion).setColor(16776960).setTimestamp();
        const msg = await channel2.send({ embeds: [embed] });
        await msg.react("✅");
        await msg.react("❌");
        await interaction.reply({ content: "✅ تم إرسال اقتراحك بنجاح!", ephemeral: true });
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
    const commandName = "suggest";
    
  }
};
