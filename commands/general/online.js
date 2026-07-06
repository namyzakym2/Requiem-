import { SlashCommandBuilder } from "discord.js";

export default {
  name: "online",
  data: new SlashCommandBuilder()
    .setName("online")
    .setDescription("Bot is online!"),
  async execute(interaction) {
    await interaction.reply("Bot is online and ready!");
  }
};
