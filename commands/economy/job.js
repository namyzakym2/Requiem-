import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "job",
  category: "economy",
  data: new SlashCommandBuilder().setName("job").setDescription("اختيار وظيفة"),
  async executeInteraction(interaction) {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription("اختر وظيفتك: (شرطي / مبرمج / طباخ)")] });
  }
};
