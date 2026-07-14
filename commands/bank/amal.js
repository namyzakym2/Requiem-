import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { load, save, settings, logTx, C, n, E, noRoom, isPremiumUser } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOBS_PATH = path.join(__dirname, "data", "jobs.json");
const getJobs = () => JSON.parse(fs.readFileSync(JOBS_PATH, "utf8"));

function getTier(balance, tiers) {
  let tier = tiers[0];
  for (const t of tiers) {
    if (balance >= t.minBalance) tier = t;
  }
  return tier;
}

export default {
  name: "عمل",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("عمل")
    .setDescription("💼 اشتغل — وظيفتك تتحسن بزيادة ثروتك (مكافآت ووقت أقل للمشتركين المميزين)"),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const premium = isPremiumUser(uid);
    // Cooldown is halved for premium users (e.g., 3 hours instead of 6)
    const activeCdRate = premium ? 0.5 : 1.0;
    const cd = (cfg.cooldowns["عمل"] ?? 6) * activeCdRate * 3600000;
    
    const users = load("users.json");
    const now = Date.now();

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, lastJobTime: 0, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if (now - (users[uid].lastJobTime || 0) < cd) {
      const rem = cd - (now - users[uid].lastJobTime);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return interaction.reply({ embeds: [E("⏳ انتظر").setDescription(`يمكنك العمل مجدداً بعد **${h}س ${m}د**${premium ? " (ميزة وقت الانتظار النصفي للبريميوم مفعلة! ⚡)" : ""}`)], ephemeral: true });
    }

    const jobs = getJobs();
    const totalAssets = (users[uid].balance || 0) + (users[uid].bank_vault || 0);
    const tier = getTier(totalAssets, jobs.tiers);

    let salary = Math.floor(Math.random() * (tier.salary.max - tier.salary.min + 1)) + tier.salary.min;
    if (premium) {
      salary = Math.floor(salary * 1.5); // +50% income for premium
    }

    const msgs = jobs.workMessages[tier.id] || ["عملت وكسبت مالاً"];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    users[uid].balance = (users[uid].balance || 0) + salary;
    users[uid].lastJobTime = now;
    
    // Level stats
    users[uid].gamesPlayed = (users[uid].gamesPlayed || 0) + 1;
    users[uid].totalEarned = (users[uid].totalEarned || 0) + salary;

    save("users.json", users);
    logTx(uid, "عمل", salary, premium ? `${tier.id} (بريميوم): ${msg}` : `${tier.id}: ${msg}`);

    // Sync with SQLite db bank_wallet currency
    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, interaction.guildId, salary, salary);

    const nextTier = jobs.tiers.find(t => t.minBalance > (users[uid].balance + (users[uid].bank_vault || 0)));
    const needed = nextTier ? nextTier.minBalance - ((users[uid].balance || 0) + (users[uid].bank_vault || 0)) : null;

    const embed = new EmbedBuilder()
      .setColor(premium ? 0xd4af37 : C)
      .setTitle(`${premium ? "🌟 " : ""}${tier.color} عمل — ${tier.id}${premium ? " (بريميوم)" : ""}`)
      .setDescription(`*${msg}*`)
      .addFields(
        { name: "💵 الراتب المستلم", value: `+${n(salary)} دولار ${premium ? "✨(+50% بونص)✨" : ""}`, inline: true },
        { name: "💳 رصيدك", value: `${n(users[uid].balance)} دولار`, inline: true },
        { name: needed != null ? `⬆️ للترقي إلى ${nextTier.id}` : "🏆 أعلى مستوى",
          value: needed != null ? `تحتاج **${n(needed)} دولار** إضافية` : "وصلت للقمة!", inline: false }
      )
      .setTimestamp();

    if (premium) {
      embed.setFooter({ text: "ميزات البريميوم النشطة: +50% راتب | 50% وقت انتظار أقل" });
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const uid = message.author.id;
    const premium = isPremiumUser(uid);
    // Cooldown is halved for premium users (e.g., 3 hours instead of 6)
    const activeCdRate = premium ? 0.5 : 1.0;
    const cd = (cfg.cooldowns["عمل"] ?? 6) * activeCdRate * 3600000;

    const users = load("users.json");
    const now = Date.now();

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, lastJobTime: 0, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if (now - (users[uid].lastJobTime || 0) < cd) {
      const rem = cd - (now - users[uid].lastJobTime);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return message.reply({ embeds: [E("⏳ انتظر").setDescription(`يمكنك العمل مجدداً بعد **${h}س ${m}د**${premium ? " (ميزة وقت الانتظار النصفي للبريميوم مفعلة! ⚡)" : ""}`)] });
    }

    const jobs = getJobs();
    const totalAssets = (users[uid].balance || 0) + (users[uid].bank_vault || 0);
    const tier = getTier(totalAssets, jobs.tiers);

    let salary = Math.floor(Math.random() * (tier.salary.max - tier.salary.min + 1)) + tier.salary.min;
    if (premium) {
      salary = Math.floor(salary * 1.5);
    }

    const msgs = jobs.workMessages[tier.id] || ["عملت وكسبت مالاً"];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    users[uid].balance = (users[uid].balance || 0) + salary;
    users[uid].lastJobTime = now;
    
    users[uid].gamesPlayed = (users[uid].gamesPlayed || 0) + 1;
    users[uid].totalEarned = (users[uid].totalEarned || 0) + salary;

    save("users.json", users);
    logTx(uid, "عمل", salary, premium ? `${tier.id} (بريميوم): ${msg}` : `${tier.id}: ${msg}`);

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, message.guild.id, salary, salary);

    const nextTier = jobs.tiers.find(t => t.minBalance > (users[uid].balance + (users[uid].bank_vault || 0)));
    const needed = nextTier ? nextTier.minBalance - ((users[uid].balance || 0) + (users[uid].bank_vault || 0)) : null;

    const embed = new EmbedBuilder()
      .setColor(premium ? 0xd4af37 : C)
      .setTitle(`${premium ? "🌟 " : ""}${tier.color} عمل — ${tier.id}${premium ? " (بريميوم)" : ""}`)
      .setDescription(`*${msg}*`)
      .addFields(
        { name: "💵 الراتب المستلم", value: `+${n(salary)} دولار ${premium ? "✨(+50% بونص)✨" : ""}`, inline: true },
        { name: "💳 رصيدك", value: `${n(users[uid].balance)} دولار`, inline: true },
        { name: needed != null ? `⬆️ للترقي إلى ${nextTier.id}` : "🏆 أعلى مستوى",
          value: needed != null ? `تحتاج **${n(needed)} دولار** إضافية` : "وصلت للقمة!", inline: false }
      )
      .setTimestamp();

    if (premium) {
      embed.setFooter({ text: "ميزات البريميوم النشطة: +50% راتب | 50% وقت انتظار أقل" });
    }

    return message.reply({ embeds: [embed] });
  }
};
