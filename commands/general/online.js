import { SlashCommandBuilder } from "discord.js";

export default {
  name: "online",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("online")
    .setDescription("Check if the bot is online"),
  async executeInteraction(interaction, context) {
    await interaction.reply({ content: "🟢 البوت متصل ويعمل بنجاح!", ephemeral: false });
  },
  async executeMessage(message, args, context) {
    await message.reply("🟢 البوت متصل ويعمل بنجاح!");
  },
  async execute(interactionOrMessage) {
    if (interactionOrMessage.reply) {
      await interactionOrMessage.reply("🟢 البوت متصل ويعمل بنجاح!");
    }
  }
};

