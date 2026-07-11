import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from "discord.js";

export default {
  name: "unlock",
  aliases: ["فتح", "فتح-القناة"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("🔓 فتح القناة الحالية أو قناة محددة (Unlock the current channel or a specific channel)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("القناة المراد فتحها (The channel to unlock)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async executeInteraction(interaction, context) {
    const { guild, member } = interaction;
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

    // Check member permissions in the target channel
    const memberPerms = targetChannel.permissionsFor(member);
    if (!memberPerms || !memberPerms.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة القنوات في القناة المحددة.", ephemeral: true });
    }

    // Check bot permissions in the target channel
    const botMember = guild.members.me;
    const botPerms = targetChannel.permissionsFor(botMember);
    if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إدارة القنوات في القناة المحددة.", ephemeral: true });
    }

    try {
      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null,
        SendMessagesInThreads: null,
        CreatePublicThreads: null
      });

      const embed = new EmbedBuilder()
        .setColor("#10b981")
        .setTitle("🔓 تم فتح القناة بنجاح")
        .setDescription(`تم إلغاء قفل القناة ${targetChannel} بنجاح ويمكن للجميع الكتابة الآن.\n\n**بواسطة:** ${interaction.user}`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in unlock command:", err);
      return interaction.reply({ content: "❌ حدث خطأ داخلي أثناء محاولة فتح القناة.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { guild, member } = message;
    
    // Check if a channel is mentioned
    let targetChannel = message.mentions.channels.first();
    if (!targetChannel) {
      targetChannel = message.channel;
    }

    // Support getting channel by ID if provided
    if (args[0] && !targetChannel) {
      const channelId = args[0].replace(/[<#>]/g, "");
      const foundChannel = guild.channels.cache.get(channelId);
      if (foundChannel && (foundChannel.type === ChannelType.GuildText || foundChannel.type === ChannelType.GuildAnnouncement)) {
        targetChannel = foundChannel;
      }
    }

    // Check member permissions in the target channel
    const memberPerms = targetChannel.permissionsFor(member);
    if (!memberPerms || !memberPerms.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ ليس لديك صلاحية إدارة القنوات في القناة المحددة.");
    }

    // Check bot permissions in the target channel
    const botMember = guild.members.me;
    const botPerms = targetChannel.permissionsFor(botMember);
    if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إدارة القنوات في القناة المحددة.");
    }

    try {
      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null,
        SendMessagesInThreads: null,
        CreatePublicThreads: null
      });

      const embed = new EmbedBuilder()
        .setColor("#10b981")
        .setTitle("🔓 تم فتح القناة بنجاح")
        .setDescription(`تم إلغاء قفل القناة ${targetChannel} بنجاح ويمكن للجميع الكتابة الآن.\n\n**بواسطة:** ${message.author}`)
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Error in unlock text command:", err);
      return message.reply("❌ حدث خطأ داخلي أثناء محاولة فتح القناة.");
    }
  }
};
