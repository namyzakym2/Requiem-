import React from 'react';
import { ShieldCheck, Sparkles, LogIn, Disc as DiscordIcon, Bot, ArrowRight, Lock, Eye, Globe } from 'lucide-react';

export default function LoginView({ onLoginDemo, lang, setLang }) {
  const isAr = lang === 'ar';

  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className={`min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-between relative overflow-hidden ${isAr ? 'rtl' : 'ltr'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="p-6 max-w-7xl w-full mx-auto flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-purple-500/20 border border-purple-400/30">
            R
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
              <span>{isAr ? 'ريكوييم بريميوم' : 'Requiem Dashboard'}</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-purple-500/20 text-purple-300 font-bold rounded border border-purple-500/30">v4.0</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              {isAr ? 'لوحة الإدارة والحماية الشاملة' : 'Management & Protection Suite'}
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(isAr ? 'en' : 'ar')}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 rounded-xl text-xs text-zinc-300 transition-all"
        >
          <Globe size={14} />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Hero Body Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center relative z-10 text-center">
        
        {/* Requiem Icon Badge */}
        <div className="mb-6 p-4 rounded-3xl bg-zinc-900/80 border border-purple-500/30 shadow-2xl shadow-purple-500/10 backdrop-blur-xl animate-bounce duration-[3000ms]">
          <Bot size={48} className="text-purple-400" />
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl leading-tight">
          {isAr ? (
            <>إدارة سيرفرك في ديسكورد <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">بسهولة وأمان مطلق</span></>
          ) : (
            <>Manage Your Discord Server <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">With Supreme Power</span></>
          )}
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 mt-4 max-w-xl leading-relaxed">
          {isAr ? 'قم بتسجيل الدخول باستخدام حسابك في ديسكورد للتحكم الكامل في الحماية، التذاكر، الرتب، الأذكار، الذكاء الاصطناعي، وسجلات السيرفر.' : 'Log in with your Discord account to easily manage server protection, tickets, auto-roles, AI image generation, and backups.'}
        </p>

        {/* Login Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          
          {/* Main Discord OAuth Login Button */}
          <button
            onClick={handleDiscordLogin}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer group"
          >
            <DiscordIcon size={20} className="group-hover:rotate-12 transition-transform" />
            <span>{isAr ? 'تسجيل الدخول عبر ديسكورد' : 'Login with Discord'}</span>
            <ArrowRight size={16} className={`${isAr ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Demo Preview Button */}
          <button
            onClick={onLoginDemo}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs rounded-2xl border border-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <Eye size={16} className="text-purple-400" />
            <span>{isAr ? 'معاينة اللوحة (وضع الديمو)' : 'Explore Preview Mode'}</span>
          </button>

        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14 w-full text-left">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md">
            <ShieldCheck size={20} className="text-emerald-400 mb-2" />
            <div className="text-xs font-bold text-white">{isAr ? 'حماية ضد التهكير' : 'Anti-Nuke Protection'}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{isAr ? 'حماية قنوات ورتب السيرفر' : 'Full anti-raid & bot protection'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md">
            <Lock size={20} className="text-rose-400 mb-2" />
            <div className="text-xs font-bold text-white">{isAr ? 'فلتر الكلمات المحظورة' : 'Auto-Moderation'}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{isAr ? 'حظر الروابط والسبام تلقائياً' : 'Automated link & spam filter'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md">
            <Sparkles size={20} className="text-purple-400 mb-2" />
            <div className="text-xs font-bold text-white">{isAr ? 'توليد الصور بالـ AI' : 'Gemini AI Art'}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{isAr ? 'ابتكار شعارات ورسومات' : 'Studio-grade graphics generator'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md">
            <Bot size={20} className="text-indigo-400 mb-2" />
            <div className="text-xs font-bold text-white">{isAr ? 'تنعيم Blox Fruits' : 'Blox Fruits Leveling'}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{isAr ? 'طابور الأوتوميشن السريع' : 'Automated Roblox account queue'}</div>
          </div>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="p-6 text-center text-xs text-zinc-400 border-t border-white/5 relative z-10">
        <div>{isAr ? 'ريكوييم ديسكورد © 2026 - جميع الحقوق محفوظة' : 'Requiem Discord © 2026 - All Rights Reserved'}</div>
      </footer>
    </div>
  );
}
