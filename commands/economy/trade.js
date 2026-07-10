import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "trade",
  category: "economy",
  data: new SlashCommandBuilder().setName("trade").setDescription("تداول مع لاعب").addUserOption(o => o.setName("user").setDescription("الشخص").setRequired(true)).addIntegerOption(o => o.setName("amount").setDescription("المبلغ").setRequired(true)),
  async executeInteraction(interaction) {
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🤝 ${interaction.user} عرض تداول **${amount.toLocaleString()}** رون مع ${user}`)] });
  }
};
