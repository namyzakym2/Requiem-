import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "avatar",
  aliases: ["av", "صورة"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("عرض صورة ملف الشخصي الخاص بك أو لمستخدم آخر")
    .addUserOption((option) =>
      option.setName("target").setDescription("المستخدم الذي تريد رؤية صورته")
    ),
  async executeInteraction(interaction, context) {
    const user = interaction.options.getUser("target") || interaction.user;
    const avatarEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`صورة ملف الشخصي لـ ${user.username}`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}` });

    await interaction.reply({ embeds: [avatarEmbed] });
  },
  async executeMessage(message, args, context) {
    const user = message.mentions.users.first() || message.author;
    const avatarEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`صورة ملف الشخصي لـ ${user.username}`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}` });

    await message.reply({ embeds: [avatarEmbed] });
  },
};
