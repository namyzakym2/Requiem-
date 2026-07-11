import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Save, Image as ImageIcon, Shield } from 'lucide-react';
import axios from 'axios';

export default function TicketsTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // General Settings
  const [imageUrl, setImageUrl] = useState('');
  const [generalRole, setGeneralRole] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/tickets`)
        .then(res => {
          if (Array.isArray(res.data?.categories)) setCategories(res.data.categories);
          if (res.data?.settings) {
            setImageUrl(res.data.settings.imageUrl || '');
            setGeneralRole(res.data.settings.supportRoleId || '');
          }
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

  const handleSaveGeneralSettings = async () => {
    if (!guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/tickets`, {
        supportRoleId: generalRole,
        imageUrl: imageUrl.trim()
      });
      onSave(isAr ? 'تم حفظ الإعدادات العامة بنجاح!' : 'General settings saved successfully!');
    } catch (err) {
      onSave(isAr ? 'فشل حفظ الإعدادات العامة' : 'Failed to save general settings', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-purple-500">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ticket size={22} className="text-purple-400" />
            <span>{isAr ? 'نظام تذاكر الدعم الفني' : 'Ticket Support System'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'إنشاء لوحات تذاكر تفاعلية مع إمكانية تضمين صورة خلفية مميزة للتذكرة' : 'Create interactive ticket support panels with background image capabilities.'}
          </p>
        </div>
      </div>

      {/* General & Background Image Settings */}
      <div className="pro-card p-5 space-y-4">
        <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
          <ImageIcon size={18} className="text-purple-400" />
          <span>{isAr ? 'تخصيص اللوحة وصورة التذكرة' : 'Panel Customization & Ticket Image'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'رابط صورة اللوحة / البانر' : 'Panel Image / Banner URL'}
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-zinc-500">
                {isAr ? 'رابط مباشر للصورة ليتم عرضها داخل لوحة التذاكر الرئيسية' : 'Direct link to an image/banner to display inside the ticket panel.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'رتبة الدعم الفني الافتراضية' : 'Default Support Role'}
              </label>
              <select
                value={generalRole || ''}
                onChange={(e) => setGeneralRole(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- {isAr ? 'اختر الرتبة' : 'Select Support Role'} --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveGeneralSettings}
              className="py-2 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save size={14} />
              <span>{isAr ? 'حفظ إعدادات التذكرة' : 'Save Ticket Settings'}</span>
            </button>
          </div>

          {/* Banner Preview */}
          <div className="flex flex-col justify-center items-center bg-zinc-950/50 rounded-2xl p-4 border border-white/5 min-h-[150px]">
            {imageUrl ? (
              <div className="space-y-2 w-full text-center">
                <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400">
                  {isAr ? 'معاينة الصورة' : 'Image Preview'}
                </span>
                <img
                  src={imageUrl}
                  alt="Ticket Custom Panel"
                  referrerPolicy="no-referrer"
                  className="max-h-[140px] w-full object-contain rounded-lg border border-white/10"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-xs">
                <ImageIcon size={32} className="mx-auto text-zinc-600 mb-2" />
                <span>{isAr ? 'لم يتم تعيين صورة للوحة بعد' : 'No panel image assigned yet.'}</span>
              </div>
            )}
          </div>
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
              value={selectedRole || ''}
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
