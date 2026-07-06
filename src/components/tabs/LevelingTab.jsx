import React, { useState, useEffect } from 'react';
import { Flame, Save, Check, Trophy, Hash, Award, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function LevelingTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [leveling, setLeveling] = useState({
    status: 'on',
    channelId: '',
    message: '🎉 تهانينا {user}! لقد وصلت إلى المستوى **{level}**!',
  });

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/leveling`)
        .then(res => {
          if (res.data) {
            setLeveling({
              status: res.data.status || 'on',
              channelId: res.data.channelId || '',
              message: res.data.message || '🎉 تهانينا {user}! لقد وصلت إلى المستوى **{level}**!',
            });
            if (Array.isArray(res.data.rewards)) setRewards(res.data.rewards);
          }
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/channels`)
        .then(res => { if (Array.isArray(res.data)) setChannels(res.data); })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/roles`)
        .then(res => { if (Array.isArray(res.data)) setRoles(res.data); })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleSaveLeveling = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      await axios.post(`/api/guilds/${guild.id}/leveling`, leveling);
      setSaved(true);
      onSave(isAr ? 'تم حفظ إعدادات نظام اللفل بنجاح!' : 'Leveling settings saved!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onSave(isAr ? 'فشل حفظ نظام اللفل' : 'Failed to save leveling settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-amber-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame size={22} className="text-amber-400" />
            <span>{isAr ? 'نظام اللفل ورتب الترقية' : 'XP Leveling & Role Rewards'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'مكافأة الأعضاء بالتفاعل وتلقي رتب مميزة عند الوصول لمستويات محددة' : 'Reward members with XP and roles upon leveling up.'}
          </p>
        </div>

        <button
          onClick={handleSaveLeveling}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all shrink-0"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ النظام' : 'Save Leveling')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Settings */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3">
            {isAr ? 'تخصيص الرسالة والإشعار' : 'Level-Up Notifications'}
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5">
            <span className="text-xs font-semibold text-white">{isAr ? 'تفعيل نظام اللفل' : 'Enable Leveling System'}</span>
            <input
              type="checkbox"
              checked={leveling.status === 'on'}
              onChange={(e) => setLeveling({ ...leveling, status: e.target.checked ? 'on' : 'off' })}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'قناة الإشعار بالترقية' : 'Level-Up Announcement Channel'}</label>
            <select
              value={leveling.channelId}
              onChange={(e) => setLeveling({ ...leveling, channelId: e.target.value })}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- {isAr ? 'نفس القناة التي يتفاعل فيها العضو' : 'Current Chat Channel'} --</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'رسالة الترقية' : 'Level-Up Message'}</label>
            <textarea
              rows={3}
              value={leveling.message}
              onChange={(e) => setLeveling({ ...leveling, message: e.target.value })}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2 text-[10px] text-zinc-400">
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-amber-300">{'{user}'}</span>
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-amber-300">{'{level}'}</span>
            </div>
          </div>
        </div>

        {/* Level Role Rewards */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Award size={18} className="text-amber-400" />
            <span>{isAr ? 'رتب المكافآت عند اللفل' : 'Role Rewards'}</span>
          </h3>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
            {isAr ? 'عندما يصل العضو لمستوى محدد، سيحصل تلقائياً على الرتبة المحددة.' : 'Members unlock role rewards upon reaching configured levels.'}
          </div>

          <div className="space-y-2">
            {rewards.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500">
                {isAr ? 'لم يتم إضافة رتب مكافآت حتى الآن' : 'No role rewards created yet.'}
              </div>
            ) : (
              rewards.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" />
                    <span className="font-bold text-white">مستوى {r.level || r.lvl}</span>
                    <span className="text-zinc-400">← @{r.roleName || r.roleId}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
