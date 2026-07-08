import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "راتب",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("راتب")
    .setDescription("💵 استلم راتبك اليومي"),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const cd = (cfg.cooldowns["راتب"] ?? 24) * 3600000;
    const users = load("users.json");
    const cools = load("cooldowns.json");
    const now = Date.now();

    // Sync from SQLite to JSON wallet balance if JSON has less or to initialize
    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if (cools[`salary_${uid}`] && now - cools[`salary_${uid}`] < cd) {
      const rem = cd - (now - cools[`salary_${uid}`]);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return interaction.reply({ embeds: [E("⏳ انتظار").setDescription(`راتبك القادم بعد **${h}س ${m}د**`)], ephemeral: true });
    }

    const salary = Math.floor(Math.random() * (cfg.salaryMax - cfg.salaryMin + 1)) + cfg.salaryMin;
    users[uid].balance = (users[uid].balance || 0) + salary;
    cools[`salary_${uid}`] = now;
    save("users.json", users);
    save("cooldowns.json", cools);
    logTx(uid, "راتب", salary, "راتب يومي");

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(uid, interaction.guildId, salary, salary);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("💵 استلمت راتبك!")
      .addFields(
        { name: "💰 الراتب", value: `+${n(salary)} رون`, inline: true },
        { name: "💳 رصيدك", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const uid = message.author.id;
    const cd = (cfg.cooldowns["راتب"] ?? 24) * 3600000;
    const users = load("users.json");
    const cools = load("cooldowns.json");
    const now = Date.now();

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if (cools[`salary_${uid}`] && now - cools[`salary_${uid}`] < cd) {
      const rem = cd - (now - cools[`salary_${uid}`]);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return message.reply({ embeds: [E("⏳ انتظار").setDescription(`راتبك القادم بعد **${h}س ${m}د**`)] });
    }

    const salary = Math.floor(Math.random() * (cfg.salaryMax - cfg.salaryMin + 1)) + cfg.salaryMin;
    users[uid].balance = (users[uid].balance || 0) + salary;
    cools[`salary_${uid}`] = now;
    save("users.json", users);
    save("cooldowns.json", cools);
    logTx(uid, "راتب", salary, "راتب يومي");

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(uid, message.guild.id, salary, salary);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("💵 استلمت راتبك!")
      .addFields(
        { name: "💰 الراتب", value: `+${n(salary)} رون`, inline: true },
        { name: "💳 رصيدك", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  }
};
