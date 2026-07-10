import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "set-bank-channel",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("set-bank-channel")
    .setDescription("تحديد شات البنك المخصص")
    .addChannelOption(o => o.setName("channel").setDescription("الشات").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const channel = interaction.options.getChannel("channel");
    db.prepare("CREATE TABLE IF NOT EXISTS bank_settings (guildId TEXT PRIMARY KEY, channelId TEXT)").run();
    db.prepare("INSERT INTO bank_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = ?").run(interaction.guildId, channel.id, channel.id);
    await interaction.reply(`✅ تم تحديد شات البنك: ${channel}`);
  }
};
