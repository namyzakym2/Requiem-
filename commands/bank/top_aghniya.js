import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n } from "./utils.js";

export default {
  name: "توب_اغنياء",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("توب_اغنياء")
    .setDescription("🏆 عرض قائمة أغنى 10 أعضاء"),

  async executeInteraction(interaction, context) {
    const users = load("users.json");
    const sorted = Object.entries(users)
      .map(([id, u]) => ({ id, total: (u.balance || 0) + (u.bank_vault || 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const embed = new EmbedBuilder().setColor(C).setTitle("🏆 قائمة أغنى 10 أعضاء");
    
    for (let i = 0; i < sorted.length; i++) {
        const u = await interaction.guild.members.fetch(sorted[i].id).catch(() => ({user: {username: "مستخدم" + sorted[i].id}}));
        embed.addFields({ name: `${i+1}. ${u.user?.username || "مستخدم"}`, value: `${n(sorted[i].total)} دولار` });
    }
    
    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
      // Similar implementation for text
      return message.reply("قائمة الأغنياء...");
  }
};
