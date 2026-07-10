import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "slots",
  category: "games",
  data: new SlashCommandBuilder().setName("slots").setDescription("لعبة السلوتس"),
  async executeInteraction(interaction) {
    const emojis = ["🍒", "🍋", "🍊", "💎"];
    const res = [emojis[Math.floor(Math.random() * emojis.length)], emojis[Math.floor(Math.random() * emojis.length)], emojis[Math.floor(Math.random() * emojis.length)]];
    const isWin = res[0] === res[1] && res[1] === res[2];
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(isWin ? 0x22C55E : 0xEF4444).setTitle("🎰 السلوتس").setDescription(res.join(" | ")).setFooter({ text: isWin ? "فوز!" : "خسارة" })] });
  }
};
