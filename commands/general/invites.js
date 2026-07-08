import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "invites",
  aliases: ["دعواتي", "دعوات", "inv"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("invites")
    .setDescription("عرض عدد دعواتك أو دعوات عضو آخر في السيرفر (View your server invites)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد عرض دعواته").setRequired(false)
    ),

  async executeInteraction(interaction, context) {
    const { guild, client } = interaction;
    const targetUser = interaction.options.getUser("target") || interaction.user;

    // Check if bot has Manage Guild permission to fetch invites
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: "❌ يفتقر البوت إلى صلاحية **إدارة السيرفر (Manage Server)** لقراءة رموز الدعوة.",
        ephemeral: true
      });
    }

    try {
      await interaction.deferReply();
      const invites = await guild.invites.fetch();
      const userInvites = invites.filter(inv => inv.inviter && inv.inviter.id === targetUser.id);
      
      let totalUses = 0;
      const inviteDetails = [];

      userInvites.forEach(inv => {
        totalUses += inv.uses || 0;
        inviteDetails.push(`• \`${inv.code}\` ➜ **${inv.uses || 0}** استخدام (${inv.channel ? `<#${inv.channel.id}>` : "قناة غير معروفة"})`);
      });

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`✉️ إحصائيات دعوات: ${targetUser.username}`)
        .setDescription(
          `👤 **العضو:** ${targetUser}\n` +
          `✨ **إجمالي الدعوات الناجحة:** \`${totalUses}\` عضو\n` +
          `🔗 **عدد الروابط النشطة:** \`${userInvites.size}\` رابط\n\n` +
          (inviteDetails.length > 0 
            ? `**تفاصيل الروابط النشطة:**\n${inviteDetails.slice(0, 10).join("\n")}${inviteDetails.length > 10 ? "\n...والمزيد" : ""}`
            : "*لا توجد روابط دعوة نشطة منشأة بواسطة هذا العضو حالياً.*")
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ حدث خطأ أثناء محاولة جلب الدعوات من السيرفر." });
    }
  },

  async executeMessage(message, args, context) {
    const { guild, client } = message;
    
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply("❌ يفتقر البوت إلى صلاحية **إدارة السيرفر (Manage Server)** لقراءة رموز الدعوة.");
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;

    try {
      const invites = await guild.invites.fetch();
      const userInvites = invites.filter(inv => inv.inviter && inv.inviter.id === targetUser.id);
      
      let totalUses = 0;
      const inviteDetails = [];

      userInvites.forEach(inv => {
        totalUses += inv.uses || 0;
        inviteDetails.push(`• \`${inv.code}\` ➜ **${inv.uses || 0}** استخدام (${inv.channel ? `<#${inv.channel.id}>` : "قناة غير معروفة"})`);
      });

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`✉️ إحصائيات دعوات: ${targetUser.username}`)
        .setDescription(
          `👤 **العضو:** ${targetUser}\n` +
          `✨ **إجمالي الدعوات الناجحة:** \`${totalUses}\` عضو\n` +
          `🔗 **عدد الروابط النشطة:** \`${userInvites.size}\` رابط\n\n` +
          (inviteDetails.length > 0 
            ? `**تفاصيل الروابط النشطة:**\n${inviteDetails.slice(0, 10).join("\n")}${inviteDetails.length > 10 ? "\n...والمزيد" : ""}`
            : "*لا توجد روابط دعوة نشطة منشأة بواسطة هذا العضو حالياً.*")
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة جلب الدعوات من السيرفر.");
    }
  }
};
