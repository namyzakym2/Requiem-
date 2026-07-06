import React, { useState } from 'react';
import { Menu, X, Shield, ChevronDown, LogOut, Sparkles, Server, User, Globe, Activity, Check } from 'lucide-react';

export default function Navbar({
  guilds,
  selectedGuild,
  onSelectGuild,
  user,
  onLogout,
  status,
  mobileOpen,
  setMobileOpen,
  lang,
  setLang
}) {
  const [guildDropdown, setGuildDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const t = {
    ar: {
      botTitle: 'ريكوييم',
      online: 'متصل',
      offline: 'غير متصل',
      switchGuild: 'اختر السيرفر',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      guildsCount: 'سيرفر',
      selectServer: 'تغيير السيرفر',
    },
    en: {
      botTitle: 'REQUIEM',
      online: 'Online',
      offline: 'Offline',
      switchGuild: 'Select Server',
      login: 'Login',
      logout: 'Logout',
      guildsCount: 'Servers',
      selectServer: 'Switch Server',
    }
  }[lang || 'ar'];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0c12]/90 backdrop-blur-md border-b border-indigo-500/10 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left Section: Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2.5 rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo Badge */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
                <Shield size={22} className="fill-white/20" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status?.ready !== false ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${status?.ready !== false ? 'bg-emerald-500' : 'bg-amber-500'} border-2 border-[#0a0c12]`}></span>
              </span>
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wide bg-gradient-to-r from-white via-indigo-100 to-purple-300 bg-clip-text text-transparent">
                  REQUIEM
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  Dashboard
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse-dot"></span>
                {status?.tag || 'Bot Online'} • {status?.guilds || guilds.length || 0} {t.guildsCount}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Server Switcher Dropdown (Responsive) */}
        <div className="relative">
          <button
            onClick={() => setGuildDropdown(!guildDropdown)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-indigo-500/20 hover:border-indigo-500/40 text-zinc-200 hover:text-white transition-all text-sm font-medium shadow-inner"
          >
            {selectedGuild?.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
                alt={selectedGuild.name}
                className="w-6 h-6 rounded-lg object-cover border border-white/10"
              />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                {selectedGuild?.name?.[0] || <Server size={14} />}
              </div>
            )}
            <span className="max-w-[110px] sm:max-w-[160px] truncate text-xs sm:text-sm">
              {selectedGuild?.name || t.selectServer}
            </span>
            <ChevronDown size={16} className={`text-zinc-400 transition-transform ${guildDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Server Switcher Dropdown Menu */}
          {guildDropdown && (
            <div
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 w-72 max-h-80 overflow-y-auto p-2 bg-[#121624]/95 border border-indigo-500/20 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setGuildDropdown(false)}
            >
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/5 mb-1">
                {t.selectServer} ({guilds.length})
              </div>

              {guilds.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  No servers found
                </div>
              ) : (
                guilds.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onSelectGuild(g);
                      setGuildDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      selectedGuild?.id === g.id
                        ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 font-medium'
                        : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {g.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`}
                          alt={g.name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">
                          {g.name[0]}
                        </div>
                      )}
                      <span className="truncate text-xs font-medium">{g.name}</span>
                    </div>
                    {selectedGuild?.id === g.id && (
                      <Check size={16} className="text-purple-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Section: Language & User Profile */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-indigo-500/30 text-xs text-zinc-300 hover:text-white transition-all font-semibold"
            title="Switch Language"
          >
            <Globe size={14} className="text-indigo-400" />
            <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
          </button>

          {/* User Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-indigo-500/30 transition-all"
              >
                <img
                  src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-7 h-7 rounded-lg object-cover border border-purple-500/30"
                />
                <span className="hidden md:inline text-xs font-semibold text-zinc-200 truncate max-w-[100px]">
                  {user.username}
                </span>
                <ChevronDown size={14} className="text-zinc-400 hidden md:inline" />
              </button>

              {userDropdown && (
                <div className="absolute top-full mt-2 right-0 w-52 p-2 bg-[#121624]/95 border border-indigo-500/20 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in">
                  <div className="p-3 border-b border-white/5 mb-1">
                    <div className="text-xs font-bold text-white truncate">{user.username}</div>
                    <div className="text-[10px] text-zinc-400 truncate">ID: {user.id}</div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('requiem_token');
                      if (onLogout) {
                        onLogout();
                      } else {
                        window.location.href = '/api/auth/logout';
                      }
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>{t.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/api/auth/login"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              <User size={14} />
              <span>{t.login}</span>
            </a>
          )}
        </div>

      </div>
    </header>
  );
}
