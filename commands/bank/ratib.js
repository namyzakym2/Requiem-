import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom, isPremiumUser } from "./utils.js";

export default {
  name: "راتب",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("راتب")
    .setDescription("💵 استلم راتبك اليومي (مضاعف للمشتركين المميزين)"),

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
    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if (cools[`salary_${uid}`] && now - cools[`salary_${uid}`] < cd) {
      const rem = cd - (now - cools[`salary_${uid}`]);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return interaction.reply({ embeds: [E("⏳ انتظار").setDescription(`راتبك القادم بعد **${h}س ${m}د**`)], ephemeral: true });
    }

    let salary = Math.floor(Math.random() * (cfg.salaryMax - cfg.salaryMin + 1)) + cfg.salaryMin;
    const premium = isPremiumUser(uid);
    if (premium) {
      salary *= 2; // Double salary for premium users
    }

    users[uid].balance = (users[uid].balance || 0) + salary;
    cools[`salary_${uid}`] = now;
    save("users.json", users);
    save("cooldowns.json", cools);
    logTx(uid, "راتب", salary, premium ? "راتب يومي (مضاعف بريميوم)" : "راتب يومي");

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, interaction.guildId, salary, salary);

    const embed = new EmbedBuilder()
      .setColor(premium ? 0xd4af37 : C)
      .setTitle(premium ? "🌟 استلمت راتبك المميز (مضاعف بريميوم)!" : "💵 استلمت راتبك!")
      .addFields(
        { name: "💰 الراتب الأساسي", value: `${n(premium ? salary / 2 : salary)} دولار`, inline: true },
        { name: "✨ ميزة البريميوم", value: premium ? "➕ مضاعف نشط (2x)" : "❌ غير نشط (اكتب `'premium buy` للشراء)", inline: true },
        { name: "💸 الراتب المستلم", value: `**${n(salary)}** دولار`, inline: false },
        { name: "💳 رصيدك الإجمالي", value: `**${n(users[uid].balance)}** دولار`, inline: true }
      )
      .setTimestamp();

    if (premium) {
      embed.setDescription("شكراً لدعمك للبوت! تم تفعيل ميزة مضاعف الراتب اليومي الخاصة بالبريميوم بنجاح. 💖");
    }

    return interaction.reply({ embeds: [embed] });
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

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if (cools[`salary_${uid}`] && now - cools[`salary_${uid}`] < cd) {
      const rem = cd - (now - cools[`salary_${uid}`]);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return message.reply({ embeds: [E("⏳ انتظار").setDescription(`راتبك القادم بعد **${h}س ${m}د**`)] });
    }

    let salary = Math.floor(Math.random() * (cfg.salaryMax - cfg.salaryMin + 1)) + cfg.salaryMin;
    const premium = isPremiumUser(uid);
    if (premium) {
      salary *= 2;
    }

    users[uid].balance = (users[uid].balance || 0) + salary;
    cools[`salary_${uid}`] = now;
    save("users.json", users);
    save("cooldowns.json", cools);
    logTx(uid, "راتب", salary, premium ? "راتب يومي (مضاعف بريميوم)" : "راتب يومي");

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, message.guild.id, salary, salary);

    const embed = new EmbedBuilder()
      .setColor(premium ? 0xd4af37 : C)
      .setTitle(premium ? "🌟 استلمت راتبك المميز (مضاعف بريميوم)!" : "💵 استلمت راتبك!")
      .addFields(
        { name: "💰 الراتب الأساسي", value: `${n(premium ? salary / 2 : salary)} دولار`, inline: true },
        { name: "✨ ميزة البريميوم", value: premium ? "➕ مضاعف نشط (2x)" : "❌ غير نشط (اكتب `'premium buy` للشراء)", inline: true },
        { name: "💸 الراتب المستلم", value: `**${n(salary)}** دولار`, inline: false },
        { name: "💳 رصيدك الإجمالي", value: `**${n(users[uid].balance)}** دولار`, inline: true }
      )
      .setTimestamp();

    if (premium) {
      embed.setDescription("شكراً لدعمك للبوت! تم تفعيل ميزة مضاعف الراتب اليومي الخاصة بالبريميوم بنجاح. 💖");
    }

    return message.reply({ embeds: [embed] });
  }
};
