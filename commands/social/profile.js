import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "profile",
  category: "social",
  data: new SlashCommandBuilder().setName("profile").setDescription("عرض الملف الشخصي").addUserOption(o => o.setName("user").setDescription("الشخص")),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const user = interaction.options.getUser("user") || interaction.user;
    const userRow = db.prepare("SELECT xb, vault FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, interaction.guildId);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`👤 ملف ${user.username}`).setDescription(`💰 الرصيد: ${userRow?.xb || 0}\n🏦 الخزنة: ${userRow?.vault || 0}`)] });
  }
};
