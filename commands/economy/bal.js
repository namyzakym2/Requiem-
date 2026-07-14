import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const formatNumber = (x) => {
  const num = Number(x);
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs >= 1e12) {
    return sign + (abs / 1e12).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'b';
  }
  if (abs >= 1e9) {
    return sign + (abs / 1e9).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'b';
  }
  if (abs >= 1e6) {
    return sign + (abs / 1e6).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'm';
  }
  if (abs >= 1e3) {
    return sign + (abs / 1e3).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'k';
  }
  return sign + abs.toLocaleString('en');
};

export default {
  name: "bal",
  category: "economy",
  data: new SlashCommandBuilder().setName("bal").setDescription("عرض رصيدك"),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const settings = db.prepare("SELECT channelId FROM bank_settings WHERE guildId = ?").get(interaction.guildId);
    if (settings && settings.channelId !== interaction.channelId) {
      return interaction.reply({ content: `❌ يمكنك استخدام هذا الأمر فقط في شات البنك: <#${settings.channelId}>`, ephemeral: true });
    }
    const userRow = db.prepare("SELECT xb, vault FROM leveling WHERE userId = ? AND guildId = ?").get(interaction.user.id, interaction.guildId);
    const handBal = userRow?.xb || 0;
    const vaultBal = userRow?.vault || 0;
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`💰 رصيد ${interaction.user.username}`).setDescription(`رصيد اليد: **${formatNumber(handBal)}** رون\nالرصيد البنكي: **${formatNumber(vaultBal)}** رون`).setTimestamp()] });
  }
};
