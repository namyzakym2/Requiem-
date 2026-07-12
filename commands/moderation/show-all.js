import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from "discord.js";

export default {
  name: "show-all",
  aliases: ["showall", "اظهار-الكل", "إظهار-الكل", "اظهار_الكل", "إظهار_الكل", "فتح-الكل", "فتح_الكل"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("show-all")
    .setDescription("👁️ إظهار جميع قنوات السيرفر للجميع (Show all channels in the server)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executeInteraction(interaction, context) {
    const { guild, member } = interaction;

    // Check user permissions
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة القنوات (Manage Channels) لاستخدام هذا الأمر.", ephemeral: true });
    }

    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إدارة القنوات (Manage Channels).", ephemeral: true });
    }

    await interaction.deferReply();

    try {
      // Fetch all channels
      const channels = await guild.channels.fetch();
      const targetTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice];
      const channelsToShow = channels.filter(c => c && targetTypes.includes(c.type));

      if (channelsToShow.size === 0) {
        return interaction.editReply("❌ لم يتم العثور على قنوات صالحة لإظهارها.");
      }

      await interaction.editReply(`⏳ جاري إظهار **${channelsToShow.size}** قناة... قد يستغرق هذا بضع ثوانٍ بسبب قيود ديسكورد.`);

      let successCount = 0;
      let failCount = 0;

      for (const [id, channel] of channelsToShow) {
        // Verify bot has permissions to edit this specific channel's permissions
        const botPerms = channel.permissionsFor(botMember);
        if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
          failCount++;
          continue;
        }

        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: true
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to show channel ${channel.name}:`, err.message);
          failCount++;
        }
      }

      const embed = new EmbedBuilder()
        .setColor("#33ff33")
        .setTitle("👁️ تم إظهار جميع القنوات")
        .setDescription(`تم الانتهاء من عملية إظهار قنوات السيرفر بنجاح.\n\n**القنوات التي تم إظهارها:** \`${successCount}\`\n**القنوات التي فشل إظهارها:** \`${failCount}\``)
        .addFields({ name: "بواسطة:", value: `${interaction.user}` })
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.editReply({ content: null, embeds: [embed] });
    } catch (err) {
      console.error("Error in show-all interaction command:", err);
      return interaction.editReply("❌ حدث خطأ داخلي أثناء محاولة إظهار القنوات.");
    }
  },

  async executeMessage(message, args, context) {
    const { guild, member } = message;

    // Check user permissions
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ ليس لديك صلاحية إدارة القنوات (Manage Channels) لاستخدام هذا الأمر.");
    }

    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إدارة القنوات (Manage Channels).");
    }

    const progressMsg = await message.reply("⏳ جاري جلب وإظهار قنوات السيرفر... يرجى الانتظار.");

    try {
      const channels = await guild.channels.fetch();
      const targetTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice];
      const channelsToShow = channels.filter(c => c && targetTypes.includes(c.type));

      if (channelsToShow.size === 0) {
        return progressMsg.edit("❌ لم يتم العثور على قنوات صالحة لإظهارها.");
      }

      await progressMsg.edit(`⏳ جاري إظهار **${channelsToShow.size}** قناة... قد يستغرق هذا بعض الوقت.`);

      let successCount = 0;
      let failCount = 0;

      for (const [id, channel] of channelsToShow) {
        const botPerms = channel.permissionsFor(botMember);
        if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
          failCount++;
          continue;
        }

        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: true
          });
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      const embed = new EmbedBuilder()
        .setColor("#33ff33")
        .setTitle("👁️ تم إظهار جميع القنوات")
        .setDescription(`تم الانتهاء من عملية إظهار قنوات السيرفر بنجاح.\n\n**القنوات التي تم إظهارها:** \`${successCount}\`\n**القنوات التي فشل إظهارها:** \`${failCount}\``)
        .addFields({ name: "بواسطة:", value: `${message.author}` })
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return progressMsg.edit({ content: null, embeds: [embed] });
    } catch (err) {
      console.error("Error in show-all text command:", err);
      return progressMsg.edit("❌ حدث خطأ داخلي أثناء محاولة إظهار القنوات.");
    }
  }
};
