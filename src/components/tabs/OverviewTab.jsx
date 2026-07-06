import React, { useState, useEffect } from 'react';
import { Activity, Hash, Users, Shield, Radio, Save, Check, Command, Sliders, ToggleLeft, ToggleRight, MessageSquare, Flame, Lock } from 'lucide-react';
import axios from 'axios';

export default function OverviewTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [prefix, setPrefix] = useState('Xb');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [toggles, setToggles] = useState({
    welcome: true,
    protection: true,
    leveling: true,
    automod: true,
    tickets: false,
    azkar: true,
  });

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/settings`)
        .then(res => {
          if (res.data?.prefix) setPrefix(res.data.prefix);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleSavePrefix = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      await axios.post(`/api/guilds/${guild.id}/settings`, { prefix });
      setSaved(true);
      onSave(isAr ? 'تم حفظ بادئة الأوامر بنجاح!' : 'Prefix saved successfully!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onSave(isAr ? 'فشل حفظ البادئة' : 'Failed to save prefix', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    onSave(isAr ? `تم تحديث حالة الوحدة (${key})` : `Module state updated (${key})`, 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Banner & Stats */}
      <div className="pro-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4">
            {guild?.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt={guild.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30 shadow-xl"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center font-black text-2xl text-white border-2 border-purple-500/30 shadow-xl">
                {guild?.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{guild?.name || 'اختر سيرفر'}</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isAr ? 'نشط' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                ID: <span className="font-mono text-zinc-300">{guild?.id || '00000000000'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl text-center">
              <Users size={16} className="mx-auto text-purple-400 mb-1" />
              <div className="text-sm font-bold text-white">{guild?.memberCount || 1280}</div>
              <div className="text-[10px] text-zinc-400">{isAr ? 'الأعضاء' : 'Members'}</div>
            </div>
            <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl text-center">
              <Activity size={16} className="mx-auto text-emerald-400 mb-1" />
              <div className="text-sm font-bold text-white">99.8%</div>
              <div className="text-[10px] text-zinc-400">{isAr ? 'حالة البوت' : 'Bot Status'}</div>
            </div>
            <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl text-center col-span-2 sm:col-span-1">
              <Command size={16} className="mx-auto text-indigo-400 mb-1" />
              <div className="text-sm font-mono font-bold text-purple-300">{prefix}</div>
              <div className="text-[10px] text-zinc-400">{isAr ? 'البادئة الحالية' : 'Current Prefix'}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Prefix & Command Settings */}
        <div className="pro-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders size={20} className="text-purple-400" />
            <h3 className="font-bold text-base text-white">
              {isAr ? 'إعدادات البادئة والأوامر' : 'Bot Prefix & Commands'}
            </h3>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {isAr ? 'يمكنك تغيير بادئة الأوامر الخاصة بالبوت لهذا السيرفر:' : 'Customize the command prefix for this server:'}
          </p>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="مثال: Xb أو !"
                className="w-full bg-zinc-950/80 border border-indigo-500/20 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleSavePrefix}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              <span>{saved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ' : 'Save')}</span>
            </button>
          </div>
        </div>

        {/* Quick Features Switcher */}
        <div className="pro-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Radio size={20} className="text-emerald-400" />
            <h3 className="font-bold text-base text-white">
              {isAr ? 'التفعيل السريع للخصائص' : 'Quick Feature Toggles'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'welcome', labelAr: 'رسالة الترحب', labelEn: 'Welcome Message', icon: MessageSquare },
              { key: 'protection', labelAr: 'نظام الحماية', labelEn: 'Protection System', icon: Shield },
              { key: 'leveling', labelAr: 'نظام الخبرة واللفل', labelEn: 'XP & Leveling', icon: Flame },
              { key: 'automod', labelAr: 'الفلتر التلقائي', labelEn: 'Auto-Mod Filter', icon: Lock },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  toggles[item.key]
                    ? 'bg-purple-950/20 border-purple-500/30 text-white'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon size={18} className={toggles[item.key] ? 'text-purple-400' : 'text-zinc-500'} />
                  <span className="text-xs font-semibold">{isAr ? item.labelAr : item.labelEn}</span>
                </div>

                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  toggles[item.key] ? 'bg-purple-600' : 'bg-zinc-700'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    toggles[item.key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
