import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, Check, Image as ImageIcon, Sparkles, Hash, Users, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import DiscordPreview from '../DiscordPreview';

export default function WelcomeTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [welcome, setWelcome] = useState({
    status: 'on',
    channelId: '',
    title: 'أهلاً بك في السيرفر! 🎉',
    description: 'مرحباً بك {user} في {guild}! أنت العضو رقم #{memberCount}. نتمنى لك وقتاً ممتعاً!',
    embedColor: '#8b5cf6',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
  });

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [autoRoles, setAutoRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/welcome`)
        .then(res => {
          if (res.data) setWelcome(prev => ({ ...prev, ...res.data }));
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/channels`)
        .then(res => {
          if (Array.isArray(res.data)) setChannels(res.data);
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/roles`)
        .then(res => {
          if (Array.isArray(res.data)) setRoles(res.data);
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/auto-roles`)
        .then(res => {
          if (Array.isArray(res.data)) setAutoRoles(res.data);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleSaveWelcome = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      await axios.post(`/api/guilds/${guild.id}/welcome`, welcome);
      setSaved(true);
      onSave(isAr ? 'تم حفظ رسالة الترحيب بنجاح!' : 'Welcome settings saved!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onSave(isAr ? 'فشل حفظ إعدادات الترحيب' : 'Failed to save welcome settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAutoRole = async () => {
    if (!selectedRole || !guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/auto-roles`, { roleId: selectedRole });
      const roleObj = roles.find(r => r.id === selectedRole);
      setAutoRoles(prev => [...prev, { roleId: selectedRole, name: roleObj?.name || selectedRole }]);
      setSelectedRole('');
      onSave(isAr ? 'تم إضافة الرتبة التلقائية' : 'Auto role added');
    } catch (err) {
      onSave(isAr ? 'فشل إضافة الرتبة التلقائية' : 'Failed to add auto role', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-indigo-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare size={22} className="text-indigo-400" />
            <span>{isAr ? 'رسالة الترحيب والمغادرة' : 'Welcome & Farewell Engine'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'صمم بطاقة ترحيب جذابة باللغة العربية مع صورة مخصصة ورتب تلقائية للأعضاء الجدد' : 'Customize an embedded welcome card with custom images and auto roles.'}
          </p>
        </div>

        <button
          onClick={handleSaveWelcome}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all shrink-0"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ الرسالة' : 'Save Welcome')}</span>
        </button>
      </div>

      {/* Grid Layout: Builder & Live Discord Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Builder Form */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3">
            {isAr ? 'مُنشئ رسالة الترحيب' : 'Welcome Message Builder'}
          </h3>

          {/* Target Channel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'قناة الترحيب' : 'Welcome Channel'}</label>
            <select
              value={welcome.channelId}
              onChange={(e) => setWelcome({ ...welcome, channelId: e.target.value })}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">-- {isAr ? 'اختر القناة' : 'Select Channel'} --</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>

          {/* Embed Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'عنوان الرسالة' : 'Embed Title'}</label>
            <input
              type="text"
              value={welcome.title}
              onChange={(e) => setWelcome({ ...welcome, title: e.target.value })}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Embed Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'محتوى الرسالة' : 'Embed Description'}</label>
            <textarea
              rows={3}
              value={welcome.description}
              onChange={(e) => setWelcome({ ...welcome, description: e.target.value })}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-400 pt-1">
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-purple-300">{'{user}'}</span>
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-purple-300">{'{guild}'}</span>
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-purple-300">{'{memberCount}'}</span>
            </div>
          </div>

          {/* Embed Image URL & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">{isAr ? 'رابط الصورة' : 'Image URL'}</label>
              <input
                type="text"
                value={welcome.imageUrl}
                onChange={(e) => setWelcome({ ...welcome, imageUrl: e.target.value })}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">{isAr ? 'لون الشريط' : 'Embed Color'}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={welcome.embedColor}
                  onChange={(e) => setWelcome({ ...welcome, embedColor: e.target.value })}
                  className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-white/10"
                />
                <input
                  type="text"
                  value={welcome.embedColor}
                  onChange={(e) => setWelcome({ ...welcome, embedColor: e.target.value })}
                  className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview & Auto Roles */}
        <div className="space-y-6">
          
          {/* Live Discord Message Preview */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {isAr ? 'معاينة ديسكورد الحية' : 'Live Discord Embed Preview'}
            </div>
            <DiscordPreview
              title={welcome.title}
              description={welcome.description.replace('{user}', '@عضو جديد').replace('{guild}', guild?.name || 'السيرفر').replace('{memberCount}', '1,280')}
              embedColor={welcome.embedColor}
              imageUrl={welcome.imageUrl}
            />
          </div>

          {/* Auto Roles Panel */}
          <div className="pro-card p-5 space-y-3">
            <h4 className="font-bold text-xs text-white flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              <span>{isAr ? 'الرتب التلقائية الجدد' : 'Auto Roles on Join'}</span>
            </h4>

            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- {isAr ? 'اختر الرتبة' : 'Select Role'} --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddAutoRole}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {autoRoles.map((ar, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                  <span>@{ar.name || ar.roleId}</span>
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
