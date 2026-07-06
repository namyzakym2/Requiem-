import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "allbans",
  aliases: ["banslist"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("allbans")
    .setDescription("عرض قائمة الأعضاء المحظورين في السيرفر"),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية حظر الأعضاء.", ephemeral: true });
    }
    await interaction.deferReply();
    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans || bans.size === 0) {
      return interaction.editReply("ℹ️ لا يوجد أعضاء محظورون في هذا السيرفر.");
    }

    let list = "";
    let count = 1;
    bans.forEach(ban => {
      if (count <= 25) {
        list += `\`${count}\` - <@${ban.user.id}> - السبب: ${ban.reason || "غير محدد"}\n`;
        count++;
      }
    });

    const embed = new EmbedBuilder()
      .setTitle(`📋 قائمة الأعضاء المحظورين (${bans.size})`)
      .setColor("#FF4500")
      .setDescription(list)
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}` });

    return interaction.editReply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply("❌ ليس لديك صلاحية حظر الأعضاء.");
    }
    const bans = await message.guild.bans.fetch().catch(() => null);
    if (!bans || bans.size === 0) {
      return message.reply("ℹ️ لا يوجد أعضاء محظورون في هذا السيرفر.");
    }

    let list = "";
    let count = 1;
    bans.forEach(ban => {
      if (count <= 25) {
        list += `\`${count}\` - <@${ban.user.id}> - السبب: ${ban.reason || "غير محدد"}\n`;
        count++;
      }
    });

    const embed = new EmbedBuilder()
      .setTitle(`📋 قائمة الأعضاء المحظورين (${bans.size})`)
      .setColor("#FF4500")
      .setDescription(list)
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}` });

    return message.reply({ embeds: [embed] });
  }
};
