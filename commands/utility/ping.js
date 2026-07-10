import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "ping",
  category: "utility",
  data: new SlashCommandBuilder().setName("ping").setDescription("فحص سرعة البوت"),
  async executeInteraction(interaction) {
    await interaction.reply({ content: `🏓 بونغ! السرعة: ${interaction.client.ws.ping}ms` });
  }
};
