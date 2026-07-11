import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "suggest",
  category: "general",
  data: new SlashCommandBuilder().setName("suggest").setDescription("إرسال اقتراح جديد").addStringOption((option) => option.setName("suggestion").setDescription("اكتب اقتراحك هنا").setRequired(true)),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const { user, guild, options } = interaction;

    const settings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ?").get(guild.id);
    if (!settings || !settings.enabled) return interaction.reply({ content: "❌ نظام الاقتراحات معطل في هذا السيرفر.", ephemeral: true });

    const suggestionChannel = guild.channels.cache.get(settings.channelId);
    if (!suggestionChannel) return interaction.reply({ content: "❌ قناة الاقتراحات غير موجودة. يرجى إعدادها مرة أخرى.", ephemeral: true });

    const suggestionText = options.getString("suggestion", true);

    const embed = new EmbedBuilder()
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle("💡 اقتراح جديد")
      .setDescription(suggestionText)
      .addFields(
        { name: "الحالة", value: "⏳ قيد الانتظار", inline: true },
        { name: "صاحب الاقتراح", value: `<@${user.id}>`, inline: true }
      )
      .setColor(16776960)
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("suggest_approve").setLabel("قبول ✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggest_decline").setLabel("رفض ❌").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("suggest_reset").setLabel("إعادة تعيين 🔄").setStyle(ButtonStyle.Secondary)
    );

    const msg = await suggestionChannel.send({ embeds: [embed], components: [row] });
    // Still add reactions for legacy support or just for show
    await msg.react("👍").catch(() => {});
    await msg.react("👎").catch(() => {});

    await interaction.reply({ content: "✅ تم إرسال اقتراحك بنجاح إلى قناة الاقتراحات!", ephemeral: true });
  },
  async executeMessage(message, args, context) {
    const { db } = context;
    const { author, guild, channel } = message;

    const settings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ?").get(guild.id);
    if (!settings || !settings.enabled) return;

    if (args.length === 0) return message.reply("❌ يرجى كتابة الاقتراح.");

    const suggestionChannel = guild.channels.cache.get(settings.channelId);
    if (!suggestionChannel) return;

    const suggestionText = args.join(" ");

    const embed = new EmbedBuilder()
      .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTitle("💡 اقتراح جديد")
      .setDescription(suggestionText)
      .addFields(
        { name: "الحالة", value: "⏳ قيد الانتظار", inline: true },
        { name: "صاحب الاقتراح", value: `<@${author.id}>`, inline: true }
      )
      .setColor(16776960)
      .setFooter({ text: `ID: ${author.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("suggest_approve").setLabel("قبول ✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggest_decline").setLabel("رفض ❌").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("suggest_reset").setLabel("إعادة تعيين 🔄").setStyle(ButtonStyle.Secondary)
    );

    const msg = await suggestionChannel.send({ embeds: [embed], components: [row] });
    await msg.react("👍").catch(() => {});
    await msg.react("👎").catch(() => {});

    if (channel.id !== suggestionChannel.id) {
        await message.reply("✅ تم إرسال اقتراحك بنجاح!");
    }
  }
};
