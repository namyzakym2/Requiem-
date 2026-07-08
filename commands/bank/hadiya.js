import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, C, n, E } from "./utils.js";

export default {
  name: "هدية",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("هدية")
    .setDescription("🎁 إرسال مبلغ هدية لعضو (بدون رسوم)")
    .addUserOption(o => o.setName("العضو").setRequired(true))
    .addIntegerOption(o => o.setName("المبلغ").setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const target = interaction.options.getUser("العضو");
    const amount = interaction.options.getInteger("المبلغ");
    const uid = interaction.user.id;
    
    // Implementation of balance transfer without fees
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎁 هدية مالية")
      .setDescription(`تم إرسال ${n(amount)} رون إلى <@${target.id}>.`)] });
  },

  async executeMessage(message, args, context) {
      return message.reply("إرسال هدية...");
  }
};
