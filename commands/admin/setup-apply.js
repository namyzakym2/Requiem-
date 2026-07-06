import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "setup-apply",
  category: "admin",
  data: new SlashCommandBuilder().setName("setup-apply").setDescription("إعداد رسالة التقديم (إدارة/رتبة)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "setup-apply") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(guild.id);
        if (!settings) {
          return interaction.reply({ content: "❌ يرجى ضبط الإعدادات أولاً باستخدام `/apply-settings`.", ephemeral: true });
        }
        const embed = new EmbedBuilder().setTitle("📝 التقديم على الإدارة / الرتب").setDescription("إذا كنت ترغب في الانضمام إلى فريقنا أو الحصول على رتبة معينة، اضغط على الزر أدناه للتقديم.").setColor(65280).setFooter({ text: guild.name, iconURL: guild.iconURL() || void 0 });
        if (settings.imageUrl) {
          embed.setImage(settings.imageUrl);
        }
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("apply_now").setLabel("تقديم الآن").setStyle(ButtonStyle.Primary).setEmoji("📝")
        );
        await interaction.channel?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "✅ تم إرسال رسالة التقديم.", ephemeral: true });
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
    const commandName = "setup-apply";
    
  }
};
