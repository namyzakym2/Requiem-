import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { C, E } from "./utils.js";

export default {
  name: "مساعدة_بنك",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("مساعدة_بنك")
    .setDescription("ℹ️ عرض جميع أوامر البنك"),

  async executeInteraction(interaction, context) {
    const embed = new EmbedBuilder().setColor(C).setTitle("ℹ️ أوامر البنك")
      .setDescription("هنا قائمة بجميع أوامر نظام البنك والاقتصاد...");
    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
      return message.reply("مساعدة البنك...");
  }
};
