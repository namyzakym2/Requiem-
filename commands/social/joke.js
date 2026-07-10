import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "joke",
  category: "social",
  data: new SlashCommandBuilder().setName("joke").setDescription("نكتة عشوائية"),
  async executeInteraction(interaction) {
    const jokes = ["مرة واحد بخيل راح يزور امه في المستشفى لقى مكتوب على الباب ادفع، قال خليني ارجع ازورها في البيت احسن.", "مرة محشش سألوه ايش رأيك في الزحمة؟ قال والله هي كويسة بس المشكلة في الناس.", "نكتة.."];
    await interaction.reply({ content: jokes[Math.floor(Math.random() * jokes.length)] });
  }
};
