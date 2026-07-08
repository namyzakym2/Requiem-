import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "slowmode",
  aliases: ["الوضع-البطيء", "بطيء", "سلومود"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("تعيين الوضع البطيء للقناة الحالية (Set channel slowmode)")
    .addIntegerOption((option) =>
      option.setName("seconds").setDescription("عدد الثواني (0 لإيقافه)").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executeInteraction(interaction, context) {
    const { channel, guild } = interaction;
    const seconds = interaction.options.getInteger("seconds");

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة القنوات (Manage Channels).", ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إدارة القنوات (Manage Channels).", ephemeral: true });
    }

    try {
      await channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setColor(seconds > 0 ? "#ffa500" : "#33ff33")
        .setDescription(
          seconds > 0
            ? `⏳ **تم تفعيل الوضع البطيء بنجاح**\nالمدة: \`${seconds}\` ثانية بين الرسائل.\nبواسطة: ${interaction.user}`
            : `✅ **تم إيقاف الوضع البطيء بنجاح**\nبواسطة: ${interaction.user}`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ فشل تعيين الوضع البطيء للقناة.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ ليس لديك صلاحية إدارة القنوات (Manage Channels).");
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إدارة القنوات (Manage Channels).");
    }

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0) {
      return message.reply("❌ يرجى تحديد عدد ثوانٍ صحيح. مثال: `slowmode 5` أو `slowmode 0` لإيقافه.");
    }

    try {
      await message.channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setColor(seconds > 0 ? "#ffa500" : "#33ff33")
        .setDescription(
          seconds > 0
            ? `⏳ **تم تفعيل الوضع البطيء بنجاح**\nالمدة: \`${seconds}\` ثانية بين الرسائل.\nبواسطة: ${message.author}`
            : `✅ **تم إيقاف الوضع البطيء بنجاح**\nبواسطة: ${message.author}`
        )
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ فشل تعيين الوضع البطيء للقناة.");
    }
  }
};
