import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, UserX, Link2, AlertTriangle, Save, Plus, Trash2, Check, Shield } from 'lucide-react';
import axios from 'axios';

export default function ProtectionTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    antiBot: true,
    antiLink: true,
    antiSpam: true,
    antiMassBan: true,
    maxMentions: 5,
  });

  const [whitelistedBots, setWhitelistedBots] = useState([]);
  const [newBotId, setNewBotId] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/protection`)
        .then(res => {
          if (res.data) {
            setSettings(prev => ({ ...prev, ...res.data }));
          }
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/whitelisted-bots`)
        .then(res => {
          if (Array.isArray(res.data)) setWhitelistedBots(res.data);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleSaveProtection = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      await axios.post(`/api/guilds/${guild.id}/protection`, settings);
      setSaved(true);
      onSave(isAr ? 'تم حفظ إعدادات الحماية الشاملة!' : 'Protection settings saved successfully!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onSave(isAr ? 'فشل حفظ الحماية' : 'Failed to save protection settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async () => {
    if (!newBotId.trim() || !guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/whitelisted-bots`, { botId: newBotId.trim() });
      setWhitelistedBots(prev => [...prev, { botId: newBotId.trim() }]);
      setNewBotId('');
      onSave(isAr ? 'تم إضافة البوت للقائمة البيضاء' : 'Bot whitelisted successfully');
    } catch (err) {
      onSave(isAr ? 'فشل إضافة البوت' : 'Failed to whitelist bot', 'error');
    }
  };

  const handleRemoveBot = async (botId) => {
    if (!guild?.id) return;
    try {
      await axios.delete(`/api/guilds/${guild.id}/whitelisted-bots/${botId}`);
      setWhitelistedBots(prev => prev.filter(b => b.botId !== botId));
      onSave(isAr ? 'تم حذف البوت من القائمة البيضاء' : 'Bot removed from whitelist');
    } catch (err) {
      onSave(isAr ? 'فشل حذف البوت' : 'Failed to remove bot', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-purple-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-purple-400" />
            <span>{isAr ? 'نظام الحماية والأمان' : 'Protection & Security Engine'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'حماية السيرفر من البوتات الخبيثة، السپام، نشر الروابط والإشارة الجماعية' : 'Shield your server against malicious bots, spam, unwanted links, and mass raids.'}
          </p>
        </div>

        <button
          onClick={handleSaveProtection}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all shrink-0"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ التغييرات' : 'Save Protection')}</span>
        </button>
      </div>

      {/* Main Grid Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Anti-Bot & Anti-Mass Ban */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <UserX size={18} className="text-rose-400" />
            <span>{isAr ? 'حماية البوتات والبان الجماعي' : 'Anti-Bot & Anti-Raid'}</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">{isAr ? 'منع دخول البوتات غير الموثوقة' : 'Anti-Bot Protection'}</div>
                <div className="text-[11px] text-zinc-400">{isAr ? 'طرد البوتات غير المضافة عبر القائمة البيضاء تلقائياً' : 'Automatically kick unauthorized bot joins'}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.antiBot}
                onChange={(e) => setSettings({ ...settings, antiBot: e.target.checked })}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">{isAr ? 'حماية البان والتجميع الجماعي' : 'Anti-Mass Ban / Raid'}</div>
                <div className="text-[11px] text-zinc-400">{isAr ? 'حظر أي مشرف يقوم بجهد حظر جماعي غير طبيعي' : 'Prevent rogue admins from mass banning members'}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.antiMassBan}
                onChange={(e) => setSettings({ ...settings, antiMassBan: e.target.checked })}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Anti-Link & Anti-Spam */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Link2 size={18} className="text-indigo-400" />
            <span>{isAr ? 'منع الروابط وحظر المنشن' : 'Anti-Link & Mass Mention'}</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">{isAr ? 'حذف الروابط تلقائياً' : 'Anti-Link Filter'}</div>
                <div className="text-[11px] text-zinc-400">{isAr ? 'حذف روابط السيرفرات والمواقع غير المصرح بها' : 'Delete unapproved invite links and websites'}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.antiLink}
                onChange={(e) => setSettings({ ...settings, antiLink: e.target.checked })}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{isAr ? 'الحد الأقصى للإشارات (Mentions)' : 'Max Mentions Limit'}</span>
                <span className="text-xs font-mono font-bold text-purple-400">{settings.maxMentions}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.maxMentions}
                onChange={(e) => setSettings({ ...settings, maxMentions: parseInt(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Whitelisted Bots Section */}
      <div className="pro-card p-5 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Shield size={18} className="text-emerald-400" />
          <span>{isAr ? 'البوتات الموثوقة (القائمة البيضاء)' : 'Whitelisted Bots'}</span>
        </h3>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newBotId}
            onChange={(e) => setNewBotId(e.target.value)}
            placeholder={isAr ? 'أدخل ID البوت الموثوق...' : 'Enter Bot ID...'}
            className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleAddBot}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة' : 'Add Bot'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {whitelistedBots.length === 0 ? (
            <div className="col-span-full text-center py-4 text-xs text-zinc-500">
              {isAr ? 'لا توجد بوتات قائمة بيضاء حالياً' : 'No whitelisted bots added yet.'}
            </div>
          ) : (
            whitelistedBots.map((b) => (
              <div key={b.botId} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-white/5 text-xs">
                <span className="font-mono text-zinc-300 truncate">{b.botId}</span>
                <button
                  onClick={() => handleRemoveBot(b.botId)}
                  className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
