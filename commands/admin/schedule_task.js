import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../src/lib/db.js";
import { scheduleTask } from "../../src/lib/taskScheduler.js";

export default {
  name: "schedule_task",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("📅 جدولة مهام إدارية")
    .addSubcommand(sub => sub
      .setName("announcement")
      .setDescription("جدولة إعلان")
      .addStringOption(o => o.setName("cron").setDescription("توقيت كرون").setRequired(true))
      .addStringOption(o => o.setName("message").setDescription("الرسالة").setRequired(true))
      .addChannelOption(o => o.setName("channel").setDescription("الروم").setRequired(true))
    ),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "ليس لديك صلاحية.", ephemeral: true });
    
    const sub = interaction.options.getSubcommand();
    if (sub === "announcement") {
        const cron = interaction.options.getString("cron");
        const message = interaction.options.getString("message");
        const channel = interaction.options.getChannel("channel");
        
        const data = JSON.stringify({ message, channelId: channel.id });
        db.prepare("INSERT INTO admin_tasks (guildId, taskType, cronSchedule, data) VALUES (?, ?, ?, ?)").run(interaction.guildId, "announcement", cron, data);
        
        scheduleTask(context.client, { guildId: interaction.guildId, taskType: "announcement", cronSchedule: cron, data });
        return interaction.reply({ content: "✅ تم جدولة الإعلان بنجاح.", ephemeral: true });
    }
  }
};
