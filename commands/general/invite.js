import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "invite",
  aliases: ["دعوة", "انفايت"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("الحصول على رابط دعوة البوت (Get the bot's invite link)"),

  async executeInteraction(interaction, context) {
    const { client } = context;
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle("🥀 دعوة البوت | Invite Bot")
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(
        "**شكراً لاهتمامك بدعوة البوت الخاص بنا!**\nاضغط على الزر أدناه لإضافة البوت إلى سيرفرك وصنع مجتمع رائع ومتكامل.\n\n" +
        "**Thank you for wanting to invite our bot!**\nClick the button below to add the bot to your server and build an elegant community."
      )
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("دعوة البوت | Add to Server")
        .setURL(inviteLink)
        .setStyle(ButtonStyle.Link)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async executeMessage(message, args, context) {
    const { client } = context;
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle("🥀 دعوة البوت | Invite Bot")
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(
        "**شكراً لاهتمامك بدعوة البوت الخاص بنا!**\nاضغط على الزر أدناه لإضافة البوت إلى سيرفرك وصنع مجتمع رائع ومتكامل.\n\n" +
        "**Thank you for wanting to invite our bot!**\nClick the button below to add the bot to your server and build an elegant community."
      )
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("دعوة البوت | Add to Server")
        .setURL(inviteLink)
        .setStyle(ButtonStyle.Link)
    );

    await message.reply({ embeds: [embed], components: [row] });
  }
};
