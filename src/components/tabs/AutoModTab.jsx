import React, { useState, useEffect } from 'react';
import { Lock, Plus, Trash2, Shield, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function AutoModTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [badwords, setBadwords] = useState([]);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/badwords`)
        .then(res => {
          if (Array.isArray(res.data)) setBadwords(res.data);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleAddWord = async () => {
    if (!newWord.trim() || !guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/badwords`, { word: newWord.trim() });
      setBadwords(prev => [...prev, { word: newWord.trim() }]);
      setNewWord('');
      onSave(isAr ? 'تم إضافة الكلمة المحظورة بنجاح' : 'Badword added successfully');
    } catch (err) {
      onSave(isAr ? 'فشل إضافة الكلمة' : 'Failed to add word', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 border-l-4 border-l-rose-500">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Lock size={22} className="text-rose-400" />
          <span>{isAr ? 'الفلتر التلقائي والكلمات المحظورة' : 'Auto-Mod & Badwords Filter'}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {isAr ? 'حذف الرسائل المحتوية على كلمات بذيئة أو محظورة فور إرسالها تلقائياً' : 'Automatically purge messages containing blacklisted words.'}
        </p>
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder={isAr ? 'أدخل الكلمة المحظورة...' : 'Enter blacklisted word...'}
            className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
          />
          <button
            onClick={handleAddWord}
            className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة كلمة' : 'Add Word'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {badwords.length === 0 ? (
            <div className="text-xs text-zinc-500 py-4 w-full text-center">
              {isAr ? 'لا توجد كلمات محظورة مضافة' : 'No blacklisted words added.'}
            </div>
          ) : (
            badwords.map((b, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-center gap-2">
                <span>{b.word}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
