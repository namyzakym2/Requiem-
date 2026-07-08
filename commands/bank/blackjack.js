import { SlashCommandBuilder } from "discord.js";
export default {
  name: "blackjack",
  category: "bank",
  data: new SlashCommandBuilder().setName("blackjack").setDescription("بلاك جاك"),
  async executeInteraction(interaction) { return interaction.reply({ content: "لعبت بلاك جاك!" }); }
};
