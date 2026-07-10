import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Save, Shield, Hash, Settings } from 'lucide-react';

export default function CommandsTab({ onSave, lang }) {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    axios.get('/api/commands')
      .then(res => setCommands(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const updateCommandConfig = async (commandName) => {
    await axios.post(`/api/commands/${commandName}`, configs[commandName] || {});
    onSave('تم تحديث إعدادات الأمر');
  };

  const handleConfigChange = (commandName, field, value) => {
    setConfigs(prev => ({
      ...prev,
      [commandName]: {
        ...(prev[commandName] || {}),
        [field]: value
      }
    }));
  };

  if (loading) return <div className="p-4 text-center text-zinc-400">جاري تحميل الأوامر...</div>;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-3xl font-bold text-white flex items-center gap-2"><Settings /> إدارة الأوامر</h2>
      <div className="grid gap-4">
        {commands.map((cmd, idx) => (
          <div key={`${cmd.category}-${cmd.name}-${idx}`} className="p-5 border border-zinc-800 rounded-lg bg-zinc-950 text-white shadow-md">
            <h3 className="font-bold text-xl flex items-center gap-2 mb-2 text-blue-400"><Bot /> {cmd.name}</h3>
            <p className="text-sm text-zinc-400 mb-4">التصنيف: {cmd.category}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                <Hash size={18} className="text-zinc-500" />
                <input type="text" placeholder="اختصار (Alias)" className="bg-transparent w-full outline-none" onChange={(e) => handleConfigChange(cmd.name, 'alias', e.target.value)} />
              </div>
              <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                <Shield size={18} className="text-zinc-500" />
                <input type="text" placeholder="رتبة مسموح لها (Role ID)" className="bg-transparent w-full outline-none" onChange={(e) => handleConfigChange(cmd.name, 'allowedRoles', e.target.value)} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <input type="text" placeholder="رومات معطل فيها (Channel IDs, comma separated)" className="w-full p-2 bg-zinc-900 rounded border border-zinc-800 outline-none" onChange={(e) => handleConfigChange(cmd.name, 'disabledChannels', e.target.value)} />
              </div>
            </div>
            <button 
              className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
              onClick={() => updateCommandConfig(cmd.name)}
            >
              <Save size={16} /> حفظ التغييرات
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
