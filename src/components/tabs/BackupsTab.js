import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, Trash2, ShieldCheck, Download, Check } from 'lucide-react';
import axios from 'axios';

export default function BackupsTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/backups`)
        .then(res => {
          if (Array.isArray(res.data)) setBackups(res.data);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleCreateBackup = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      const res = await axios.post(`/api/guilds/${guild.id}/backups`);
      if (res.data) {
        setBackups(prev => [res.data, ...prev]);
        onSave(isAr ? 'تم إنشاء النسخة الاحتياطية بنجاح!' : 'Server backup created successfully!');
      }
    } catch (err) {
      onSave(isAr ? 'فشل إنشاء النسخة الاحتياطية' : 'Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!guild?.id) return;
    if (!confirm(isAr ? 'هل أنت تأكد من استعادة هذه النسخة؟ سيتم إعادة هيكلة القنوات والرتب.' : 'Are you sure you want to restore this backup?')) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/backups/${id}/restore`);
      onSave(isAr ? 'بدأت عملية الاستعادة بنجاح!' : 'Restore operation triggered!');
    } catch (err) {
      onSave(isAr ? 'فشل عملية الاستعادة' : 'Failed to restore backup', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database size={22} className="text-emerald-400" />
            <span>{isAr ? 'النسخ الاحتياطي واستعادة السيرفر' : 'Server Backups & Restore'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'حفظ نسخة كاملة من قنوات ورتب وإعدادات السيرفر واستعادتها بضغطة زر' : 'Create full snapshots of server layout, roles, and channels.'}
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all shrink-0"
        >
          <Plus size={16} />
          <span>{isAr ? 'إنشاء نسخة احتياطية الآن' : 'Create Backup Now'}</span>
        </button>
      </div>

      <div className="pro-card p-5 space-y-3">
        <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3">
          {isAr ? 'سجل النسخ الاحتياطية المتاحة' : 'Available Backup Snapshots'}
        </h3>

        <div className="space-y-2">
          {backups.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              {isAr ? 'لا توجد نسخ احتياطية محفوظة حالياً' : 'No backup snapshots found.'}
            </div>
          ) : (
            backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 text-xs">
                <div>
                  <div className="font-bold text-white font-mono">{b.id}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {new Date(b.createdAt || Date.now()).toLocaleString('ar-SA')}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(b.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg font-bold transition-all"
                >
                  <RefreshCw size={14} />
                  <span>{isAr ? 'استعادة' : 'Restore'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
