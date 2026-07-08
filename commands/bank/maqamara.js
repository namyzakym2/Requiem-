import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, C, n, E } from "./utils.js";

export default {
  name: "مقامرة",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("مقامرة")
    .setDescription("🎲 لعبة نرد سريعة")
    .addIntegerOption(o => o.setName("المبلغ").setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const bet = interaction.options.getInteger("المبلغ");
    const uid = interaction.user.id;
    const users = load("users.json");
    
    // Check balance logic here...
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const win = dice1 + dice2 > 7;

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎲 نتيجة النرد")
      .setDescription(`حصلت على ${dice1} و ${dice2}.\n${win ? "🎉 فوز!" : "❌ خسارة"}`)] });
  },

  async executeMessage(message, args, context) {
      return message.reply("لعبة النرد...");
  }
};
