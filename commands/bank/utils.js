import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

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
    return {
        bankRoom:    s.bankRoom    || '',
        salaryMin:   s.salaryMin   ?? 500,
        salaryMax:   s.salaryMax   ?? 20000,
        transferFee: s.transferFee ?? 0.05,
        cooldowns:   s.cooldowns   || {}
    };
};

export const n = (x) => Number(x).toLocaleString('en');
export const C = 0x27272f;

export const E = (title) => {
    return new EmbedBuilder().setColor(C).setTitle(title);
};

export const noRoom  = (i) => i.reply({ embeds: [E('❌ خطأ').setDescription('هذا الأمر يعمل فقط في غرفة البنك.')], ephemeral: true });
export const noAdmin = (i) => i.reply({ embeds: [E('❌ خطأ').setDescription('هذا الأمر للمسؤولين فقط.')], ephemeral: true });
