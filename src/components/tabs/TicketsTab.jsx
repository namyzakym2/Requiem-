import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Save, Check, Shield, Hash, MessageSquare } from 'lucide-react';
import axios from 'axios';

export default function TicketsTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/tickets`)
        .then(res => {
          if (Array.isArray(res.data?.categories)) setCategories(res.data.categories);
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/roles`)
        .then(res => { if (Array.isArray(res.data)) setRoles(res.data); })
        .catch(() => {});
    }
  }, [guild?.id]);

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !selectedRole || !guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/tickets`, {
        name: newCatName.trim(),
        roleId: selectedRole
      });
      setCategories(prev => [...prev, { name: newCatName.trim(), roleId: selectedRole }]);
      setNewCatName('');
      setSelectedRole('');
      onSave(isAr ? 'تم إنشاء قسم التذاكر بنجاح!' : 'Ticket category created!');
    } catch (err) {
      onSave(isAr ? 'فشل إنشاء التذكرة' : 'Failed to create ticket category', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-purple-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ticket size={22} className="text-purple-400" />
            <span>{isAr ? 'نظام تذاكر الدعم الفني' : 'Ticket System Engine'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'إنشاء لوحات تذاكر تفاعلية بأزرار ديسكورد مع تخصيص رتبة الدعم الفني لكل قسم' : 'Create interactive ticket support panels with custom support roles.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Category */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3">
            {isAr ? 'إنشاء قسم تذاكر جديد' : 'New Ticket Category'}
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'اسم التذكرة' : 'Ticket Category Name'}</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={isAr ? 'مثال: الدعم الفني، الشكاوى، الشراء' : 'e.g. Support, Billing'}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{isAr ? 'رتبة الدعم المسؤول' : 'Support Team Role'}</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">-- {isAr ? 'اختر الرتبة' : 'Select Support Role'} --</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateCategory}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة قسم التذكرة' : 'Create Ticket Panel'}</span>
          </button>
        </div>

        {/* Existing Categories */}
        <div className="pro-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3">
            {isAr ? 'أقسام التذاكر المتاحة' : 'Active Ticket Categories'}
          </h3>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500">
                {isAr ? 'لا توجد أقسام تذاكر مفعلة حالياً' : 'No active ticket categories created.'}
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <Ticket size={16} className="text-purple-400" />
                    <span className="font-bold text-white">{cat.name}</span>
                  </div>
                  <span className="text-zinc-400 font-mono">Role ID: {cat.roleId}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
