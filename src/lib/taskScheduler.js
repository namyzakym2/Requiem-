import cron from "node-cron";
import db from "./db.js";

export function startTaskScheduler(client) {
  console.log("Starting task scheduler...");
  const tasks = db.prepare("SELECT * FROM admin_tasks").all();
  
  tasks.forEach(task => {
    scheduleTask(client, task);
  });
}

export function scheduleTask(client, task) {
  cron.schedule(task.cronSchedule, async () => {
    console.log(`Executing scheduled task: ${task.taskType} in guild ${task.guildId}`);
    const guild = client.guilds.cache.get(task.guildId);
    if (!guild) return;

    if (task.taskType === "announcement") {
        const data = JSON.parse(task.data);
        const channel = guild.channels.cache.get(data.channelId);
        if (channel && channel.isTextBased()) {
            await channel.send(data.message).catch(console.error);
        }
    } else if (task.taskType === "cleanup") {
        // Simple cleanup: delete messages in a channel? 
        // Need more info in data for cleanup.
        // For now, maybe just log it.
        console.log("Cleanup task placeholder.");
    }
  });
}
