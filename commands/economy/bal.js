import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "bal",
  category: "economy",
  data: new SlashCommandBuilder().setName("رصيد").setDescription("عرض رصيدك"),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const settings = db.prepare("SELECT channelId FROM bank_settings WHERE guildId = ?").get(interaction.guildId);
    if (settings && settings.channelId !== interaction.channelId) {
      return interaction.reply({ content: `❌ يمكنك استخدام هذا الأمر فقط في شات البنك: <#${settings.channelId}>`, ephemeral: true });
    }
    const userRow = db.prepare("SELECT xb, vault FROM leveling WHERE userId = ? AND guildId = ?").get(interaction.user.id, interaction.guildId);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`💰 رصيد ${interaction.user.username}`).setDescription(`رصيد اليد: ${userRow?.xb || 0}\nالرصيد البنكي: ${userRow?.vault || 0}`).setTimestamp()] });
  }
};
