import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../src/lib/db.js";

export default {
  name: "greet",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("greet")
    .setDescription("👋 إدارة رسائل الترحيب")
    .addSubcommand(sub => sub
      .setName("set")
      .setDescription("ضبط رسالة الترحيب")
      .addChannelOption(o => o.setName("روم").setDescription("روم الترحيب").setRequired(true))
      .addStringOption(o => o.setName("رسالة").setDescription("نص الترحيب (استخدم {user} لذكر العضو)").setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName("remove")
      .setDescription("إزالة رسالة الترحيب")
    ),

  async executeInteraction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "ليس لديك صلاحية.", ephemeral: true });
    
    const sub = interaction.options.getSubcommand();
    
    if (sub === "set") {
      const channel = interaction.options.getChannel("روم");
      const message = interaction.options.getString("رسالة");
      
      db.prepare("INSERT OR REPLACE INTO welcome_configs (guildId, channelId, message) VALUES (?, ?, ?)").run(interaction.guildId, channel.id, message);
      return interaction.reply({ content: `✅ تم ضبط الترحيب في ${channel} برسالة: "${message}"` });
    } else if (sub === "remove") {
      db.prepare("DELETE FROM welcome_configs WHERE guildId = ?").run(interaction.guildId);
      return interaction.reply({ content: "✅ تم إزالة إعدادات الترحيب." });
    }
  }
};
