import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "daily",
  category: "economy",
  data: new SlashCommandBuilder().setName("daily").setDescription("احصل على مكافأتك اليومية"),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const amount = 500;
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, amount, amount);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`💰 لقد حصلت على **${amount}** رون كمكافأة يومية!`).setTimestamp()] });
  }
};
