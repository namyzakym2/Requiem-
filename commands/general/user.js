import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "user",
  aliases: ["عضو", "معلومات-العضو", "userinfo"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("عرض تفاصيل ومعلومات عن عضو معين (View member information)")
    .addUserOption((option) =>
      option.setName("target").setDescription("العضو المراد عرض معلوماته").setRequired(false)
    ),

  async executeInteraction(interaction, context) {
    const { guild, client } = interaction;
    const targetUser = interaction.options.getUser("target") || interaction.user;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`👤 معلومات العضو | ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
          { name: "🏷️ الاسم والتاغ | Name", value: `**${targetUser.tag}**`, inline: true },
          { name: "🆔 آيدي العضو | ID", value: `\`${targetUser.id}\``, inline: true },
          { name: "📅 إنشاء الحساب | Created At", value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      if (targetMember) {
        const roles = targetMember.roles.cache
          .filter(r => r.id !== guild.id)
          .map(r => r.toString())
          .slice(0, 15);

        embed.addFields(
          { name: "📥 انضم للسيرفر | Joined At", value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:D> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`, inline: false },
          { name: "🛡️ أعلى رتبة | Highest Role", value: `${targetMember.roles.highest}`, inline: true },
          { name: `🔖 الرتب (${targetMember.roles.cache.size - 1}) | Roles`, value: roles.length > 0 ? roles.join(", ") : "لا توجد رتب", inline: false }
        );
      } else {
        embed.addFields({ name: "⚠️ حالة السيرفر", value: "هذا العضو ليس منضماً إلى هذا السيرفر حالياً.", inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة جلب معلومات العضو.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { guild, client } = message;
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`👤 معلومات العضو | ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
          { name: "🏷️ الاسم والتاغ | Name", value: `**${targetUser.tag}**`, inline: true },
          { name: "🆔 آيدي العضو | ID", value: `\`${targetUser.id}\``, inline: true },
          { name: "📅 إنشاء الحساب | Created At", value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

      if (targetMember) {
        const roles = targetMember.roles.cache
          .filter(r => r.id !== guild.id)
          .map(r => r.toString())
          .slice(0, 15);

        embed.addFields(
          { name: "📥 انضم للسيرفر | Joined At", value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:D> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`, inline: false },
          { name: "🛡️ أعلى رتبة | Highest Role", value: `${targetMember.roles.highest}`, inline: true },
          { name: `🔖 الرتب (${targetMember.roles.cache.size - 1}) | Roles`, value: roles.length > 0 ? roles.join(", ") : "لا توجد رتب", inline: false }
        );
      } else {
        embed.addFields({ name: "⚠️ حالة السيرفر", value: "هذا العضو ليس منضماً إلى هذا السيرفر حالياً.", inline: false });
      }

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة جلب معلومات العضو.");
    }
  }
};
