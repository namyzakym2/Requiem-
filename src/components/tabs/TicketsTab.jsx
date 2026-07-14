import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Save, Image as ImageIcon, Trash2, Folder, Tag, Smile, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function TicketsTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  
  // Data States
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);

  // General Panel Customization
  const [imageUrl, setImageUrl] = useState('');
  const [generalRole, setGeneralRole] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPlaceholder, setTicketPlaceholder] = useState('');

  // New Category States
  const [newCatName, setNewCatName] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🎫');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCategoryChannel, setSelectedCategoryChannel] = useState('');

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/tickets`)
        .then(res => {
          if (Array.isArray(res.data?.categories)) setCategories(res.data.categories);
          if (res.data?.settings) {
            setImageUrl(res.data.settings.imageUrl || '');
            setGeneralRole(res.data.settings.supportRoleId || '');
            setTicketTitle(res.data.settings.ticketTitle || '');
            setTicketDescription(res.data.settings.ticketDescription || '');
            setTicketPlaceholder(res.data.settings.ticketPlaceholder || '');
          }
        })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/roles`)
        .then(res => { if (Array.isArray(res.data)) setRoles(res.data); })
        .catch(() => {});

      axios.get(`/api/guilds/${guild.id}/channels`)
        .then(res => { if (Array.isArray(res.data)) setChannels(res.data); })
        .catch(() => {});
    }
  }, [guild?.id]);

  // Handle Save Embed & Placeholder Customization
  const handleSaveGeneralSettings = async () => {
    if (!guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/tickets`, {
        supportRoleId: generalRole,
        imageUrl: imageUrl.trim(),
        ticketTitle: ticketTitle.trim(),
        ticketDescription: ticketDescription.trim(),
        ticketPlaceholder: ticketPlaceholder.trim()
      });
      onSave(isAr ? 'تم حفظ إعدادات لوحة التذاكر بنجاح!' : 'Ticket panel settings saved successfully!');
    } catch (err) {
      onSave(isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings', 'error');
    }
  };

  // Handle Creating custom ticket option (Category)
  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !newCatLabel.trim() || !selectedRole || !guild?.id) return;
    
    // Check key is valid alphanumeric/underscore
    const cleanKey = newCatName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanKey) {
      onSave(isAr ? 'معرف القسم يجب أن يحتوي على أحرف وأرقام فقط' : 'Category ID must be alphanumeric', 'error');
      return;
    }

    try {
      const payload = {
        name: cleanKey,
        roleId: selectedRole,
        categoryId: selectedCategoryChannel,
        label: newCatLabel.trim(),
        description: newCatDesc.trim(),
        emoji: newCatEmoji.trim()
      };

      await axios.post(`/api/guilds/${guild.id}/tickets`, payload);
      
      // Update local state
      setCategories(prev => {
        // If exists, replace, else append
        const filtered = prev.filter(c => (c.categoryName || c.name) !== cleanKey);
        return [...filtered, {
          categoryName: cleanKey,
          name: cleanKey,
          roleId: selectedRole,
          categoryId: selectedCategoryChannel,
          label: newCatLabel.trim(),
          description: newCatDesc.trim(),
          emoji: newCatEmoji.trim()
        }];
      });

      // Reset fields
      setNewCatName('');
      setNewCatLabel('');
      setNewCatDesc('');
      setNewCatEmoji('🎫');
      setSelectedRole('');
      setSelectedCategoryChannel('');
      
      onSave(isAr ? 'تم إنشاء قسم التذاكر بنجاح!' : 'Ticket category created successfully!');
    } catch (err) {
      onSave(isAr ? 'فشل إنشاء قسم التذاكر' : 'Failed to create ticket category', 'error');
    }
  };

  // Handle Deleting custom ticket option (Category)
  const handleDeleteCategory = async (catName) => {
    if (!guild?.id) return;
    try {
      await axios.post(`/api/guilds/${guild.id}/tickets/delete-category`, { categoryName: catName });
      setCategories(prev => prev.filter(c => (c.categoryName || c.name) !== catName));
      onSave(isAr ? 'تم حذف قسم التذكرة بنجاح!' : 'Ticket category deleted successfully!');
    } catch (err) {
      onSave(isAr ? 'فشل حذف قسم التذكرة' : 'Failed to delete ticket category', 'error');
    }
  };

  // Filter channels to only show Discord Categories (type === 4)
  const discordCategories = channels.filter(c => c.type === 4);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-purple-500 bg-zinc-900/40 border border-white/5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ticket size={22} className="text-purple-400" />
            <span>{isAr ? 'نظام تذاكر الدعم الفني المطور' : 'Advanced Ticket Support System'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr ? 'تخصيص اللوحة، تعديل النصوص بالكامل، التحكم بخيارات القائمة المنسدلة، وربطها برتب ورومات معينة' : 'Fully customize the ticket embed panel, text, options dropdown, support roles, and destination category.'}
          </p>
        </div>
      </div>

      {/* Main Panel Customization */}
      <div className="pro-card p-5 space-y-5 bg-zinc-900/40 border border-white/5 rounded-2xl">
        <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
          <ImageIcon size={18} className="text-purple-400" />
          <span>{isAr ? 'تعديل نصوص اللوحة والصورة' : 'Customize Embed Texts & Image'}</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Ticket Embed Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'عنوان لوحة التذاكر (Embed Title)' : 'Ticket Panel Embed Title'}
              </label>
              <input
                type="text"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder={isAr ? "🎫 مركز الدعم الفني والمساعدة - Requiem Support" : "🎫 Support & Help Center"}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Ticket Embed Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'وصف لوحة التذاكر (Embed Description)' : 'Ticket Panel Embed Description'}
              </label>
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                rows={3}
                placeholder={isAr ? "أهلاً بك في نظام التذاكر... يرجى اختيار القسم المناسب من القائمة أدناه" : "Welcome to our support... please choose the correct department below"}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Dropdown Menu Placeholder */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'النص المؤقت للقائمة (Dropdown Placeholder)' : 'Dropdown Menu Placeholder'}
              </label>
              <input
                type="text"
                value={ticketPlaceholder}
                onChange={(e) => setTicketPlaceholder(e.target.value)}
                placeholder={isAr ? "👇 اختر القسم الذي تود فتح تذكرة فيه..." : "👇 Choose a department to open a ticket..."}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Support Role */}
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

              {/* Banner URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {isAr ? 'رابط بانر/صورة اللوحة' : 'Panel Banner/Image URL'}
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveGeneralSettings}
              className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save size={14} />
              <span>{isAr ? 'حفظ إعدادات لوحة التذاكر' : 'Save Ticket Embed Settings'}</span>
            </button>
          </div>

          {/* Banner / Visual Preview */}
          <div className="flex flex-col justify-between bg-zinc-950/50 rounded-2xl p-4 border border-white/5 min-h-[220px]">
            <div className="space-y-2 w-full">
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400">
                {isAr ? 'معاينة البانر والصورة' : 'Banner & Image Preview'}
              </span>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Ticket Banner Preview"
                  referrerPolicy="no-referrer"
                  className="max-h-[140px] w-full object-contain rounded-lg border border-white/10"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="text-center text-zinc-600 text-xs py-8 border border-dashed border-white/5 rounded-lg">
                  <ImageIcon size={32} className="mx-auto text-zinc-700 mb-2" />
                  <span>{isAr ? 'لا توجد صورة مضافة حالياً' : 'No image assigned yet.'}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 mt-4 text-[11px] text-zinc-400 flex items-start gap-2 bg-purple-950/10 p-3 rounded-xl">
              <AlertCircle size={14} className="text-purple-400 shrink-0 mt-0.5" />
              <span>
                {isAr 
                  ? 'بعد تعديل الإعدادات والنصوص أعلاه، تذكر استخدام الأمر /setup-ticket في ديسكورد لتحديث اللوحة وإرسالها.' 
                  : 'After saving your custom texts, use the /setup-ticket slash command in Discord to generate or update the panel.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Create Custom Category / Dropdown Option */}
        <div className="pro-card p-5 space-y-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
          <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
            <Plus size={16} className="text-purple-400" />
            <span>{isAr ? 'إضافة قسم / خيار تذكرة جديد' : 'Add New Department / Dropdown Option'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Unique ID / Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'معرف القسم (Key - أحرف إنجليزية فقط)' : 'Department Key (e.g. support, billing)'}
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. tech_support"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {/* Option Emoji */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'الإيموجي (Emoji)' : 'Option Emoji'}
              </label>
              <input
                type="text"
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                placeholder="🎫"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 text-center"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            {/* Option Title / Label */}
            <label className="text-xs font-semibold text-zinc-300">
              {isAr ? 'اسم القسم / الخيار (Label)' : 'Department Title / Label'}
            </label>
            <input
              type="text"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder={isAr ? "الدعم الفني والبرمجي" : "Technical & Coding Support"}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            {/* Option Description */}
            <label className="text-xs font-semibold text-zinc-300">
              {isAr ? 'وصف القسم (Description)' : 'Department Description'}
            </label>
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder={isAr ? "للمشاكل البرمجية، وحلول البوت والموقع" : "For bot development issues and server support"}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Support Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">{isAr ? 'رتبة الدعم المسؤول لهذا القسم' : 'Support Team Role'}</label>
              <select
                value={selectedRole || ''}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- {isAr ? 'اختر الرتبة' : 'Select Role'} --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Discord Category Folder channel */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'فئة القنوات بالديسكورد (Category Channel)' : 'Discord Category Channel'}
              </label>
              <select
                value={selectedCategoryChannel || ''}
                onChange={(e) => setSelectedCategoryChannel(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- {isAr ? 'بدون تحديد (افتراضي)' : 'No category (Default)'} --</option>
                {discordCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateCategory}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة هذا القسم لقائمة الخيارات' : 'Add Department Option'}</span>
          </button>
        </div>

        {/* Existing Departments / Custom Categories */}
        <div className="pro-card p-5 space-y-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <Tag size={16} className="text-purple-400" />
              <span>{isAr ? 'أقسام الخيارات المفعلة حالياً' : 'Active Department Options'}</span>
            </h3>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-xs text-zinc-500 border border-dashed border-white/5 rounded-xl">
                  {isAr ? 'لا توجد أقسام تذاكر مخصصة، سيتم استخدام الأقسام الافتراضية للبوت.' : 'No custom ticket departments added. Default options will be active.'}
                </div>
              ) : (
                categories.map((cat, idx) => {
                  const matchedRole = roles.find(r => r.id === cat.roleId);
                  const matchedChan = channels.find(c => c.id === cat.categoryId);
                  const key = cat.categoryName || cat.name;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 text-xs gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat.emoji || '🎫'}</span>
                          <span className="font-bold text-white">{cat.label || key}</span>
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-semibold">
                            {key}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-zinc-400">{cat.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                          {matchedRole && (
                            <span className="flex items-center gap-1">
                              <Shield size={10} className="text-purple-400" />
                              {matchedRole.name}
                            </span>
                          )}
                          {matchedChan && (
                            <span className="flex items-center gap-1">
                              <Folder size={10} className="text-purple-400" />
                              {matchedChan.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteCategory(key)}
                        className="p-2 bg-red-950/30 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all shrink-0 self-end sm:self-center"
                        title={isAr ? 'حذف هذا القسم' : 'Delete department'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
