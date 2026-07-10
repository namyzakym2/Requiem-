import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "withdraw",
  category: "economy",
  data: new SlashCommandBuilder().setName("سحب").setDescription("سحب رون من البنك").addIntegerOption(o => o.setName("amount").setDescription("المبلغ").setRequired(true)),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const settings = db.prepare("SELECT channelId FROM bank_settings WHERE guildId = ?").get(interaction.guildId);
    if (settings && settings.channelId !== interaction.channelId) {
      return interaction.reply({ content: `❌ يمكنك استخدام هذا الأمر فقط في شات البنك: <#${settings.channelId}>`, ephemeral: true });
    }
    const amount = interaction.options.getInteger("amount");
    db.prepare("UPDATE leveling SET xb = xb + ?, vault = vault - ? WHERE userId = ? AND guildId = ?").run(amount, amount, interaction.user.id, interaction.guildId);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x22C55E).setDescription(`🏦 تم سحب **${amount}** رون من البنك!`).setTimestamp()] });
  }
};
