import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Trash2, Command, Hash, Check } from 'lucide-react';
import axios from 'axios';

export default function AliasesTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [aliases, setAliases] = useState([]);
  const [aliasName, setAliasName] = useState('');
  const [commandName, setCommandName] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/aliases`)
        .then(res => {
          if (Array.isArray(res.data)) setAliases(res.data);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleAddAlias = async () => {
    if (!aliasName.trim() || !commandName.trim() || !guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/aliases`, {
        alias: aliasName.trim(),
        commandName: commandName.trim()
      });
      setAliases(prev => [...prev, { alias: aliasName.trim(), commandName: commandName.trim() }]);
      setAliasName('');
      setCommandName('');
      onSave(isAr ? 'تم إضافة اختصار الأمر بنجاح' : 'Command alias created!');
    } catch (err) {
      onSave(isAr ? 'فشل إضافة الاختصار' : 'Failed to create alias', 'error');
    }
  };

  const handleDeleteAlias = async (alias) => {
    if (!guild?.id) return;
    try {
      await axios.delete(`/api/guilds/${guild.id}/aliases/${alias}`);
      setAliases(prev => prev.filter(a => a.alias !== alias));
      onSave(isAr ? 'تم حذف الاختصار' : 'Alias deleted');
    } catch (err) {
      onSave(isAr ? 'فشل حذف الاختصار' : 'Failed to delete alias', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 border-l-4 border-l-purple-500">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders size={22} className="text-purple-400" />
          <span>{isAr ? 'اختصارات الأوامر المخصصة' : 'Command Aliases'}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {isAr ? 'إنشاء كلمات مختصرة لاستدعاء الأوامر الطويلة بسلاسة' : 'Create short aliases for frequent bot commands.'}
        </p>
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={aliasName}
            onChange={(e) => setAliasName(e.target.value)}
            placeholder={isAr ? 'اسم الاختصار (مثال: p)' : 'Alias Name (e.g. p)'}
            className="bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            value={commandName}
            onChange={(e) => setCommandName(e.target.value)}
            placeholder={isAr ? 'الأمر الأصلي (مثال: profile)' : 'Target Command (e.g. profile)'}
            className="bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          onClick={handleAddAlias}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          <span>{isAr ? 'إضافة الاختصار' : 'Create Alias'}</span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {aliases.length === 0 ? (
            <div className="col-span-full text-center py-6 text-xs text-zinc-500">
              {isAr ? 'لا توجد اختصارات أوامر مضافة' : 'No aliases created yet.'}
            </div>
          ) : (
            aliases.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-purple-300 font-bold">{a.alias}</span>
                  <span className="text-zinc-500 mx-1">→</span>
                  <span className="text-zinc-300">{a.commandName}</span>
                </div>
                <button
                  onClick={() => handleDeleteAlias(a.alias)}
                  className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
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
