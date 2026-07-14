import React, { useState, useEffect } from 'react';
import { Clock, Save, Check, Hash, MessageSquare } from 'lucide-react';
import axios from 'axios';

export default function AzkarTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [channels, setChannels] = useState([]);

  const [azkar, setAzkar] = useState({
    status: 'off',
    channelId: '',
    interval: 60,
  });

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/azkar`)
        .then(res => {
          if (res.data) setAzkar(prev => ({ ...prev, ...res.data }));
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/channels`)
        .then(res => { if (Array.isArray(res.data)) setChannels(res.data); })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleSaveAzkar = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      await axios.post(`/api/guilds/${guild.id}/azkar`, azkar);
      setSaved(true);
      onSave(isAr ? 'تم حفظ إعدادات الأذكار التلقائية!' : 'Azkar settings saved!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onSave(isAr ? 'فشل حفظ الأذكار' : 'Failed to save azkar settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={22} className="text-emerald-400" />
            <span>{isAr ? 'نظام نشر الأذكار والردود التلقائية' : 'Islamic Azkar Auto-Publisher'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'نشر الأذكار والأدعية الشريفة في القناة المحددة بفترات زمنية دقيقة' : 'Automatically publish periodic Azkar and remembrance messages in designated channels.'}
          </p>
        </div>

        <button
          onClick={handleSaveAzkar}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shrink-0"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ الأذكار' : 'Save Azkar')}</span>
        </button>
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5">
          <span className="text-xs font-semibold text-white">{isAr ? 'تفعيل الأذكار التلقائية' : 'Enable Periodic Azkar'}</span>
          <input
            type="checkbox"
            checked={azkar.status === 'on'}
            onChange={(e) => setAzkar({ ...azkar, status: e.target.checked ? 'on' : 'off' })}
            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">{isAr ? 'قناة نشر الأذكار' : 'Target Channel'}</label>
          <select
            value={azkar.channelId || ''}
            onChange={(e) => setAzkar({ ...azkar, channelId: e.target.value })}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- {isAr ? 'اختر القناة' : 'Select Channel'} --</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">{isAr ? 'الفترة الزمنية بين كل ذكر (بالدقائق)' : 'Time Interval (Minutes)'}</label>
          <input
            type="number"
            min="5"
            max="1440"
            value={azkar.interval}
            onChange={(e) => setAzkar({ ...azkar, interval: parseInt(e.target.value) || 60 })}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
