import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "remind",
  category: "utility",
  data: new SlashCommandBuilder().setName("remind").setDescription("تذكير").addStringOption(o => o.setName("text").setDescription("ماذا تريد أن تتذكر").setRequired(true)).addIntegerOption(o => o.setName("time").setDescription("الوقت بالدقائق").setRequired(true)),
  async executeInteraction(interaction) {
    const text = interaction.options.getString("text");
    const time = interaction.options.getInteger("time");
    await interaction.reply({ content: `⏰ سأذكرك بـ: **${text}** بعد **${time}** دقيقة.` });
    setTimeout(() => {
        interaction.user.send(`⏰ تذكير: ${text}`);
    }, time * 60000);
  }
};
