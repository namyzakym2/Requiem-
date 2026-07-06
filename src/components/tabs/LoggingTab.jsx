import React, { useState, useEffect } from 'react';
import { Terminal, Save, Check, Hash, Activity } from 'lucide-react';
import axios from 'axios';

export default function LoggingTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [channels, setChannels] = useState([]);

  const [logs, setLogs] = useState({
    messageLog: '',
    voiceLog: '',
    roleLog: '',
    memberLog: '',
    modLog: '',
  });

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/logging`)
        .then(res => {
          if (res.data) setLogs(prev => ({ ...prev, ...res.data }));
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/channels`)
        .then(res => { if (Array.isArray(res.data)) setChannels(res.data); })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleSaveLogs = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      await axios.post(`/api/guilds/${guild.id}/logging`, logs);
      setSaved(true);
      onSave(isAr ? 'تم حفظ قنوات السجلات واللوج بنجاح!' : 'Audit log channels saved!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onSave(isAr ? 'فشل حفظ قنوات السجلات' : 'Failed to save log channels', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-indigo-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal size={22} className="text-indigo-400" />
            <span>{isAr ? 'سجلات السيرفر واللوج الشامل' : 'Audit Log Channels'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'تحديد قنوات مخصصة لتتبع تعديل الرسائل، الصوتي، الرتب، ودخول/خروج الأعضاء' : 'Assign dedicated channels to track message deletes, voice activity, and role edits.'}
          </p>
        </div>

        <button
          onClick={handleSaveLogs}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shrink-0"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ السجلات' : 'Save Logs')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'messageLog', labelAr: 'سجل الرسائل (تعديل وحذف)', labelEn: 'Message Edit & Delete Log' },
          { key: 'voiceLog', labelAr: 'سجل القنوات الصوتية', labelEn: 'Voice Channel Activity Log' },
          { key: 'roleLog', labelAr: 'سجل تغيير الرتب والصلاحيات', labelEn: 'Role & Permission Log' },
          { key: 'memberLog', labelAr: 'سجل انضمام ومغادرة الأعضاء', labelEn: 'Member Join & Leave Log' },
          { key: 'modLog', labelAr: 'سجل الإجراءات الإدارية (كيك/بان)', labelEn: 'Moderation Actions Log' },
        ].map((item) => (
          <div key={item.key} className="pro-card p-4 space-y-2">
            <label className="text-xs font-semibold text-zinc-200">{isAr ? item.labelAr : item.labelEn}</label>
            <select
              value={logs[item.key] || ''}
              onChange={(e) => setLogs({ ...logs, [item.key]: e.target.value })}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- {isAr ? 'بدون قناة (معطل)' : 'Disabled'} --</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
