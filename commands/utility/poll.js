import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "poll",
  category: "utility",
  data: new SlashCommandBuilder().setName("poll").setDescription("تصويت").addStringOption(o => o.setName("question").setDescription("سؤال التصويت").setRequired(true)),
  async executeInteraction(interaction) {
    const question = interaction.options.getString("question");
    const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle("📊 تصويت").setDescription(question)], fetchReply: true });
    await msg.react("👍");
    await msg.react("👎");
  }
};
