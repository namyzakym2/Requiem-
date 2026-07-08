import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Save } from 'lucide-react';

export default function CommandsTab({ onSave, lang }) {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/commands')
      .then(res => setCommands(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const updateCommand = async (commandName, newConfig) => {
    await axios.post(`/api/commands/${commandName}`, newConfig);
    onSave('تم تحديث إعدادات الأمر');
  };

  if (loading) return <div className="p-4 text-center">جاري تحميل الأوامر...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الأوامر</h2>
      <div className="grid gap-4">
        {commands.map((cmd, idx) => (
          <div key={`${cmd.category}-${cmd.name}-${idx}`} className="p-4 border rounded bg-zinc-900 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2"><Bot /> {cmd.name}</h3>
            <p className="text-sm text-zinc-400 mb-4">{cmd.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="اختصار (Alias)" className="p-2 bg-zinc-800 rounded" />
              <input type="text" placeholder="رتبة مسموح لها" className="p-2 bg-zinc-800 rounded" />
            </div>
            <button className="mt-4 flex items-center gap-2 bg-blue-600 px-4 py-2 rounded">
              <Save size={16} /> حفظ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
