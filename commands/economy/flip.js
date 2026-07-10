import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "flip",
  category: "economy",
  data: new SlashCommandBuilder().setName("flip").setDescription("رمي العملة للحصول على الرون"),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const isWin = Math.random() > 0.5;
    const amount = isWin ? 50 : -50;
    
    // Simple logic for demonstration
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, amount, amount);
    
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(isWin ? 0x22C55E : 0xEF4444).setDescription(isWin ? `🎉 ربحت **50** رون!` : `💸 خسرت **50** رون!`).setTimestamp()] });
  },
  async executeMessage(message, args, context) {
    const { db } = context;
    const isWin = Math.random() > 0.5;
    const amount = isWin ? 50 : -50;
    
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(message.author.id, message.guild.id, amount, amount);
    
    return message.reply({ embeds: [new EmbedBuilder().setColor(isWin ? 0x22C55E : 0xEF4444).setDescription(isWin ? `🎉 ربحت **50** رون!` : `💸 خسرت **50** رون!`).setTimestamp()] });
  }
};
