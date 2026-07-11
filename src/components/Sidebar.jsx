import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Database, 
  Terminal, 
  MessageSquare, 
  Users, 
  Lock, 
  Ticket, 
  Shield, 
  Sparkles, 
  Clock, 
  Sliders, 
  Flame,
  ChevronRight,
  Bot,
  Radio,
  Server
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen, lang }) {
  const isAr = lang === 'ar';

  const menuGroups = [
    {
      title: isAr ? 'الرئيسية' : 'GENERAL',
      items: [
        { id: 'Overview', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: Activity, badge: 'Main' },
        { id: 'Settings', labelAr: 'الإعدادات العامة', labelEn: 'Settings', icon: Sliders },
      ]
    },
    {
      title: isAr ? 'الإشراف والحماية' : 'SECURITY & MOD',
      items: [
        { id: 'Protection', labelAr: 'الحماية الشاملة', labelEn: 'Protection', icon: ShieldCheck, badge: 'Pro' },
        { id: 'Auto-Mod', labelAr: 'الفلتر التلقائي', labelEn: 'Auto-Mod', icon: Lock },
        { id: 'Auto-Roles', labelAr: 'الرتب التلقائية', labelEn: 'Auto-Roles', icon: Users },
        { id: 'Roles', labelAr: 'إدارة الرتب', labelEn: 'Roles', icon: Shield },
      ]
    },
    {
      title: isAr ? 'التفاعل والترفيه' : 'ENGAGEMENT',
      items: [
        { id: 'Welcome', labelAr: 'الترحيب والمغادرة', labelEn: 'Welcome', icon: MessageSquare },
        { id: 'Leveling', labelAr: 'اللفل والخبرة', labelEn: 'Leveling & XP', icon: Flame, badge: 'XP' },
        { id: 'Tickets', labelAr: 'نظام التذاكر', labelEn: 'Tickets', icon: Ticket },
        { id: 'Azkar', labelAr: 'الأذكار والردود', labelEn: 'Azkar & Auto-Reply', icon: Clock },
        { id: 'Broadcast', labelAr: 'البرودكاست والمالتي كاست', labelEn: 'Broadcast & Multicast', icon: Radio, badge: 'Live' },
      ]
    },
    {
      title: isAr ? 'السجلات والنسخ' : 'LOGS & UTILITY',
      items: [
        { id: 'Logging', labelAr: 'السجلات واللوج', labelEn: 'Audit Logs', icon: Terminal },
        { id: 'Nodes', labelAr: 'عقد البوتات', labelEn: 'Server Nodes', icon: Server, badge: 'Nodes' },
        { id: 'Logs', labelAr: 'سجلات النشاط', labelEn: 'Activity Logs', icon: Activity },
        { id: 'Commands', labelAr: 'إدارة الأوامر', labelEn: 'Command Manager', icon: Bot },
        { id: 'Aliases', labelAr: 'الأوامر والغرف', labelEn: 'Commands & Rooms', icon: Sliders },
        { id: 'Backups', labelAr: 'النسخ الاحتياطي', labelEn: 'Backups', icon: Database },
      ]
    },
    {
      title: isAr ? 'الأدوات المتقدمة' : 'ADVANCED AI',
      items: [
        { id: 'AI Generator', labelAr: 'مولد الصور والذكاء', labelEn: 'AI Generator', icon: Sparkles, badge: 'AI' },
      ]
    }
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full py-4 px-3 space-y-6">
      {menuGroups.map((group, gIdx) => (
        <div key={gIdx} className="space-y-1">
          <div className="px-3 text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {group.title}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white border border-purple-500/40 shadow-lg shadow-purple-500/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-400 group-hover:text-purple-300'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <span className="truncate">{isAr ? item.labelAr : item.labelEn}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md tracking-wider ${
                        isActive
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 group-hover:bg-purple-500/20 group-hover:text-purple-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={14} className={`text-zinc-600 transition-transform ${
                      isActive ? 'text-purple-400 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                    }`} />
                  </div>

                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-full shadow-lg shadow-purple-500/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-[calc(100vh-61px)] sticky top-[61px] bg-[#0c0e17]/80 backdrop-blur-xl border-r border-indigo-500/10 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop tint */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer menu content */}
          <div className="relative w-80 max-w-[85vw] bg-[#0c0e17] border-r border-indigo-500/20 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base">قائمة التحكم</span>
                <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded font-bold">PRO</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
