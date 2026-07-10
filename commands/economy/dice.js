import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "dice",
  category: "economy",
  data: new SlashCommandBuilder().setName("dice").setDescription("رمي النرد"),
  async executeInteraction(interaction, context) {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🎲 لقد رميت النرد وحصلت على **${diceRoll}**!`).setTimestamp()] });
  },
  async executeMessage(message, args, context) {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🎲 لقد رميت النرد وحصلت على **${diceRoll}**!`).setTimestamp()] });
  }
};
