import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';
import db from '../../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA = path.join(__dirname, 'data');
if (!fs.existsSync(DATA)) {
    fs.mkdirSync(DATA, { recursive: true });
}

export const load = (file, fb = {}) => {
    const p = path.join(DATA, file);
    if (!fs.existsSync(p)) { 
        fs.writeFileSync(p, JSON.stringify(fb, null, 2)); 
        return fb; 
    }
    try { 
        return JSON.parse(fs.readFileSync(p, 'utf8')); 
    } catch { 
        return fb; 
    }
};

export const save = (file, d) => {
    fs.writeFileSync(path.join(DATA, file), JSON.stringify(d, null, 2));
};

export const logTx = (uid, type, amount, note = '') => {
    const txs = load('transactions.json');
    if (!txs[uid]) txs[uid] = [];
    txs[uid].unshift({ type, amount, note, t: Date.now() });
    if (txs[uid].length > 50) txs[uid].length = 50;
    save('transactions.json', txs);
};

export const isBanned = (uid) => !!load('bans.json')[uid];

export const settings = () => {
    const s = load('settings.json');
    let bankRoom = s.bankRoom || '';
    
    if (global.currentChannelId && bankRoom) {
        // Support splitting by comma, space, or vertical bar
        const allowedRooms = bankRoom.split(/[,\s|]+/).map(id => id.trim()).filter(Boolean);
        if (allowedRooms.includes(global.currentChannelId)) {
            bankRoom = global.currentChannelId;
        }
    }

    return {
        bankRoom,
        salaryMin:   s.salaryMin   ?? 500,
        salaryMax:   s.salaryMax   ?? 20000,
        transferFee: s.transferFee ?? 0.05,
        cooldowns:   s.cooldowns   || {}
    };
};

export const n = (x) => {
    const num = Number(x);
    if (isNaN(num)) return '0';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (abs >= 1e12) {
        return sign + (abs / 1e12).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'b';
    }
    if (abs >= 1e9) {
        return sign + (abs / 1e9).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'b';
    }
    if (abs >= 1e6) {
        return sign + (abs / 1e6).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'm';
    }
    if (abs >= 1e3) {
        return sign + (abs / 1e3).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'k';
    }
    return sign + abs.toLocaleString('en');
};
export const C = 0x27272f;

export const E = (title) => {
    return new EmbedBuilder().setColor(C).setTitle(title);
};

export const noRoom  = (i) => i.reply({ embeds: [E('❌ خطأ').setDescription('هذا الأمر يعمل فقط في غرفة البنك.')], ephemeral: true });
export const noAdmin = (i) => i.reply({ embeds: [E('❌ خطأ').setDescription('هذا الأمر للمسؤولين فقط.')], ephemeral: true });

export const isPremiumUser = (userId) => {
    try {
        const row = db.prepare("SELECT expiresAt FROM premium_users WHERE userId = ?").get(userId);
        if (row && row.expiresAt) {
            return new Date(row.expiresAt) > new Date();
        }
    } catch (e) {
        console.error("Error checking premium status in bank utils:", e);
    }
    return false;
};
