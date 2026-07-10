import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "loan",
  category: "economy",
  data: new SlashCommandBuilder().setName("loan").setDescription("طلب قرض").addIntegerOption(o => o.setName("amount").setDescription("المبلغ").setRequired(true)),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const amount = interaction.options.getInteger("amount");
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, amount, amount);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`💸 تم منحك قرض بقيمة **${amount.toLocaleString()}** رون!`)] });
  }
};
