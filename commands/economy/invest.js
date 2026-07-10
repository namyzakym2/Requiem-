import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "invest",
  category: "economy",
  data: new SlashCommandBuilder().setName("invest").setDescription("استثمار الرون").addIntegerOption(o => o.setName("amount").setDescription("المبلغ").setRequired(true)),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const amount = interaction.options.getInteger("amount");
    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, interaction.user.id, interaction.guildId);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`📈 تم استثمار **${amount.toLocaleString()}** رون!`)] });
  }
};
