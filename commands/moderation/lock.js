import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "lock",
  aliases: ["قفل", "قفل-القناة"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("قفل القناة الحالية (Lock the current channel)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async executeInteraction(interaction, context) {
    const { commandName, guild, channel } = interaction;
    if (commandName === "lock") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة القنوات (Manage Channels).", ephemeral: true });
      }
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إدارة القنوات (Manage Channels).", ephemeral: true });
      }

      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false
        });
        const embed = new EmbedBuilder()
          .setColor("#ff3333")
          .setDescription(`🔒 **تم قفل القناة بنجاح** <#${channel.id}>\nبواسطة: ${interaction.user}`)
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ فشل قفل القناة.", ephemeral: true });
      }
    }
  },
  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ ليس لديك صلاحية إدارة القنوات (Manage Channels).");
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("❌ البوت يفتقر إلى صلاحية إدارة القنوات (Manage Channels).");
    }

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });
      const embed = new EmbedBuilder()
        .setColor("#ff3333")
        .setDescription(`🔒 **تم قفل القناة بنجاح** <#${message.channel.id}>\nبواسطة: ${message.author}`)
        .setTimestamp();
      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ فشل قفل القناة.");
    }
  }
};
