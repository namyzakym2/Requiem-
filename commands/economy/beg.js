import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "beg",
  category: "economy",
  data: new SlashCommandBuilder().setName("beg").setDescription("تسول للحصول على بعض الرون"),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const amount = Math.floor(Math.random() * 100) + 1;
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, amount, amount);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🎁 لقد تسولت وحصلت على **${amount.toLocaleString()}** رون!`).setTimestamp()] });
  },
  async executeMessage(message, args, context) {
    const { db } = context;
    const amount = Math.floor(Math.random() * 100) + 1;
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(message.author.id, message.guild.id, amount, amount);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🎁 لقد تسولت وحصلت على **${amount.toLocaleString()}** رون!`).setTimestamp()] });
  }
};
