import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";

export default {
  name: "server",
  aliases: ["سيرفر", "معلومات-السيرفر", "serverinfo"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("عرض إحصائيات ومعلومات مفصلة عن السيرفر (View server information)"),

  async executeInteraction(interaction, context) {
    const { guild, client } = interaction;

    try {
      await guild.members.fetch(); // Cache all members for accurate stats
      const totalMembers = guild.memberCount;
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;

      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

      const rolesCount = guild.roles.cache.size;
      const emojisCount = guild.emojis.cache.size;
      const boostCount = guild.premiumSubscriptionCount || 0;
      const boostTier = guild.premiumTier;

      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`🏰 معلومات السيرفر | ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .setDescription(guild.description || "*لا يوجد وصف لهذا السيرفر.*")
        .addFields(
          { name: "👑 المالك | Owner", value: `${owner} (${owner.user.tag})`, inline: true },
          { name: "🆔 آيدي السيرفر | ID", value: `\`${guild.id}\``, inline: true },
          { name: "📅 تاريخ الإنشاء | Created At", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
          { name: "👥 الأعضاء | Members", value: `👤 الإجمالي: **${totalMembers}**\n👨 بشر: **${humans}**\n🤖 بوتات: **${bots}**`, inline: true },
          { name: "💬 القنوات | Channels", value: `📁 الفئات: **${categories}**\n📝 كتابية: **${textChannels}**\n🔊 صوتية: **${voiceChannels}**`, inline: true },
          { name: "✨ الرتب والإيموجي | Utilities", value: `🛡️ الرتب: **${rolesCount}**\n⭐ الإيموجي: **${emojisCount}**`, inline: true },
          { name: "💎 الدعم والتعزيز | Boosts", value: `📈 المستوى: **Level ${boostTier}**\n🔮 التعزيزات: **${boostCount}**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      if (guild.banner) {
        embed.setImage(guild.bannerURL({ size: 1024 }));
      }

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة جلب معلومات السيرفر.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { guild, client } = message;

    try {
      await guild.members.fetch();
      const totalMembers = guild.memberCount;
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;

      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

      const rolesCount = guild.roles.cache.size;
      const emojisCount = guild.emojis.cache.size;
      const boostCount = guild.premiumSubscriptionCount || 0;
      const boostTier = guild.premiumTier;

      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`🏰 معلومات السيرفر | ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .setDescription(guild.description || "*لا يوجد وصف لهذا السيرفر.*")
        .addFields(
          { name: "👑 المالك | Owner", value: `${owner} (${owner.user.tag})`, inline: true },
          { name: "🆔 آيدي السيرفر | ID", value: `\`${guild.id}\``, inline: true },
          { name: "📅 تاريخ الإنشاء | Created At", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
          { name: "👥 الأعضاء | Members", value: `👤 الإجمالي: **${totalMembers}**\n👨 بشر: **${humans}**\n🤖 بوتات: **${bots}**`, inline: true },
          { name: "💬 القنوات | Channels", value: `📁 الفئات: **${categories}**\n📝 كتابية: **${textChannels}**\n🔊 صوتية: **${voiceChannels}**`, inline: true },
          { name: "✨ الرتب والإيموجي | Utilities", value: `🛡️ الرتب: **${rolesCount}**\n⭐ الإيموجي: **${emojisCount}**`, inline: true },
          { name: "💎 الدعم والتعزيز | Boosts", value: `📈 المستوى: **Level ${boostTier}**\n🔮 التعزيزات: **${boostCount}**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

      if (guild.banner) {
        embed.setImage(guild.bannerURL({ size: 1024 }));
      }

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ حدث خطأ أثناء محاولة جلب معلومات السيرفر.");
    }
  }
};
