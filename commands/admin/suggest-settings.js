import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "suggest-settings",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("suggest-settings")
    .setDescription("إعدادات الاقتراحات (Admin Only)")
    .addChannelOption((option) => option.setName("channel").setDescription("القناة التي ستظهر فيها الاقتراحات").setRequired(true))
    .addBooleanOption((option) => option.setName("enabled").setDescription("تفعيل أو تعطيل نظام الاقتراحات").setRequired(false)),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild, options, memberPermissions } = interaction;

    if (!memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
    }

    const suggestionChannel = options.getChannel("channel", true);
    const isEnabled = options.getBoolean("enabled") ?? true;

    db.prepare("INSERT OR REPLACE INTO suggestion_settings (guildId, channelId, enabled) VALUES (?, ?, ?)")
      .run(guild.id, suggestionChannel.id, isEnabled ? 1 : 0);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ إعدادات الاقتراحات")
      .setDescription(`تم تحديث إعدادات الاقتراحات بنجاح.`)
      .addFields(
        { name: "القناة", value: `${suggestionChannel}`, inline: true },
        { name: "الحالة", value: isEnabled ? "✅ مفعل" : "❌ معطل", inline: true }
      )
      .setColor(isEnabled ? 5763719 : 15548997)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const { guild, member, channel, mentions } = message;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const targetChannel = mentions.channels.first();
    if (!targetChannel) {
        return message.reply(`❌ يرجى منشن القناة. مثال: \`${PREFIX}suggest-settings #suggestions\``);
    }

    db.prepare("INSERT OR REPLACE INTO suggestion_settings (guildId, channelId, enabled) VALUES (?, ?, ?)")
      .run(guild.id, targetChannel.id, 1);

    await message.reply(`✅ تم تحديد قناة الاقتراحات: ${targetChannel} وتفعيل النظام.`);
  }
};
