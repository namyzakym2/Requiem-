import React from 'react';
import { Activity, Users, Shield, Radio, Command, Flame, Lock, Server } from 'lucide-react';

export default function Dashboard({ guild, lang, isPremium }) {
  const isAr = lang === 'ar';

  const stats = [
    { labelAr: 'إجمالي الأعضاء', labelEn: 'Total Members', value: guild?.memberCount || 1280, icon: Users, color: 'text-purple-400' },
    { labelAr: 'حالة النظام', labelEn: 'System Status', value: '99.8%', icon: Activity, color: 'text-emerald-400' },
    { labelAr: 'الأوامر النشطة', labelEn: 'Active Commands', value: '45', icon: Command, color: 'text-indigo-400' },
    { labelAr: 'مستوى الحماية', labelEn: 'Protection Level', value: isPremium ? 'Extreme' : 'High', icon: Shield, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-8 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-white/5 rounded-3xl">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isAr ? 'أهلاً بك في لوحة تحكم ريكويم' : 'Welcome to Requirime Dashboard'}
        </h1>
        <p className="text-zinc-400 text-sm">
          {isAr ? 'إليك نظرة عامة على أداء سيرفرك' : 'Here is a quick overview of your server performance'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="pro-card p-6 rounded-2xl bg-zinc-900/50 border border-white/5 flex flex-col gap-4">
              <div className={"p-3 rounded-xl bg-zinc-950/50 w-fit " + stat.color}>
                <Icon size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-zinc-500 font-medium">{isAr ? stat.labelAr : stat.labelEn}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pro-card p-6 bg-zinc-900/30 border border-white/5 rounded-2xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Server size={20} className="text-purple-400" />
          {isAr ? 'النشاط الأخير' : 'Recent Activity'}
        </h3>
        <div className="text-zinc-500 text-sm italic">
          {isAr ? 'لا يوجد نشاط مسجل حالياً...' : 'No recent activity recorded...'}
        </div>
      </div>
      
      {isPremium && (
        <div className="pro-card p-6 bg-amber-900/10 border border-amber-500/20 rounded-2xl">
          <h3 className="font-bold text-amber-500 mb-4 flex items-center gap-2">
            <Flame size={20} />
            {isAr ? 'مميزات البريميوم النشطة' : 'Active Premium Features'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-zinc-950/50 rounded-xl border border-white/5">
                <p className="text-white text-sm font-semibold">{isAr ? 'دعم أسرع 24/7' : 'Priority 24/7 Support'}</p>
             </div>
             <div className="p-4 bg-zinc-950/50 rounded-xl border border-white/5">
                <p className="text-white text-sm font-semibold">{isAr ? 'إحصائيات متقدمة' : 'Advanced Analytics'}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
