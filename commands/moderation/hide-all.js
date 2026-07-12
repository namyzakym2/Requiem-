import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from "discord.js";

export default {
  name: "hide-all",
  aliases: ["hideall", "اخفاء-الكل", "إخفاء-الكل", "اخفاء_الكل", "إخفاء_الكل", "اغلاق-الكل", "اغلاق_الكل"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("hide-all")
    .setDescription("👁️ إخفاء جميع قنوات السيرفر عن الجميع (Hide all channels in the server)")
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
      const channelsToHide = channels.filter(c => c && targetTypes.includes(c.type));

      if (channelsToHide.size === 0) {
        return interaction.editReply("❌ لم يتم العثور على قنوات صالحة لإخفائها.");
      }

      await interaction.editReply(`⏳ جاري إخفاء **${channelsToHide.size}** قناة... قد يستغرق هذا بضع ثوانٍ بسبب قيود ديسكورد.`);

      let successCount = 0;
      let failCount = 0;

      for (const [id, channel] of channelsToHide) {
        // Verify bot has permissions to edit this specific channel's permissions
        const botPerms = channel.permissionsFor(botMember);
        if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
          failCount++;
          continue;
        }

        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: false
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to hide channel ${channel.name}:`, err.message);
          failCount++;
        }
      }

      const embed = new EmbedBuilder()
        .setColor("#ff3333")
        .setTitle("👁️ تم إخفاء جميع القنوات")
        .setDescription(`تم الانتهاء من عملية إخفاء قنوات السيرفر بنجاح.\n\n**القنوات التي تم إخفاؤها:** \`${successCount}\`\n**القنوات التي فشل إخفاؤها:** \`${failCount}\``)
        .addFields({ name: "بواسطة:", value: `${interaction.user}` })
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.editReply({ content: null, embeds: [embed] });
    } catch (err) {
      console.error("Error in hide-all interaction command:", err);
      return interaction.editReply("❌ حدث خطأ داخلي أثناء محاولة إخفاء القنوات.");
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

    const progressMsg = await message.reply("⏳ جاري جلب وإخفاء قنوات السيرفر... يرجى الانتظار.");

    try {
      const channels = await guild.channels.fetch();
      const targetTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice];
      const channelsToHide = channels.filter(c => c && targetTypes.includes(c.type));

      if (channelsToHide.size === 0) {
        return progressMsg.edit("❌ لم يتم العثور على قنوات صالحة لإخفائها.");
      }

      await progressMsg.edit(`⏳ جاري إخفاء **${channelsToHide.size}** قناة... قد يستغرق هذا بعض الوقت.`);

      let successCount = 0;
      let failCount = 0;

      for (const [id, channel] of channelsToHide) {
        const botPerms = channel.permissionsFor(botMember);
        if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
          failCount++;
          continue;
        }

        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: false
          });
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      const embed = new EmbedBuilder()
        .setColor("#ff3333")
        .setTitle("👁️ تم إخفاء جميع القنوات")
        .setDescription(`تم الانتهاء من عملية إخفاء قنوات السيرفر بنجاح.\n\n**القنوات التي تم إخفاؤها:** \`${successCount}\`\n**القنوات التي فشل إخفاؤها:** \`${failCount}\``)
        .addFields({ name: "بواسطة:", value: `${message.author}` })
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return progressMsg.edit({ content: null, embeds: [embed] });
    } catch (err) {
      console.error("Error in hide-all text command:", err);
      return progressMsg.edit("❌ حدث خطأ داخلي أثناء محاولة إخفاء القنوات.");
    }
  }
};
