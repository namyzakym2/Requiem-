import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "work",
  category: "economy",
  data: new SlashCommandBuilder().setName("work").setDescription("العمل للحصول على الرون"),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const amount = Math.floor(Math.random() * 500) + 100;
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, amount, amount);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`💼 لقد عملت وحصلت على **${amount.toLocaleString()}** رون!`).setTimestamp()] });
  }
};
