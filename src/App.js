import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import LoginView from './components/LoginView';

import OverviewTab from './components/tabs/OverviewTab';
import ProtectionTab from './components/tabs/ProtectionTab';
import AutoModTab from './components/tabs/AutoModTab';
import WelcomeTab from './components/tabs/WelcomeTab';
import LevelingTab from './components/tabs/LevelingTab';
import TicketsTab from './components/tabs/TicketsTab';
import LoggingTab from './components/tabs/LoggingTab';
import AliasesTab from './components/tabs/AliasesTab';
import BackupsTab from './components/tabs/BackupsTab';
import AiTab from './components/tabs/AiTab';
import AzkarTab from './components/tabs/AzkarTab';
import BloxFruitsTab from './components/tabs/BloxFruitsTab';
import RolesTab from './components/tabs/RolesTab';
import BroadcastTab from './components/tabs/BroadcastTab';
import { Loader2, Bot } from 'lucide-react';

// Attach Axios Request Interceptor for Bearer Token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('requiem_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [status, setStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState('ar');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    // Check User Authentication
    axios.get('/api/auth/me')
      .then(res => {
        if (res.data?.id) {
          setUser(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setAuthChecked(true);
      });

    // Fetch Bot Status
    axios.get('/api/status')
      .then(res => { if (res.data) setStatus(res.data); })
      .catch(() => {});

    // Fetch Guilds
    axios.get('/api/guilds')
      .then(res => {
        if (Array.isArray(res.data)) {
          setGuilds(res.data);
          if (res.data.length > 0) setSelectedGuild(res.data[0]);
        }
      })
      .catch(() => {
        // Fallback demo guild
        const demoGuild = { id: '123456789012345678', name: 'سيرفر المملكة 👑', icon: null, memberCount: 1540 };
        setGuilds([demoGuild]);
        setSelectedGuild(demoGuild);
      });
  }, []);

  const handleDemoLogin = () => {
    setUser({
      id: '888888888888888888',
      username: 'King_User 👑',
      avatar: null,
      isDemo: true
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('requiem_token');
    setUser(null);
    axios.get('/api/auth/logout').catch(() => {});
    showToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
  };

  // 1. Loading state before auth check completes
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-3xl bg-zinc-900 border border-purple-500/30 animate-pulse">
          <Bot size={40} className="text-purple-400" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <Loader2 size={16} className="animate-spin text-purple-400" />
          <span>جاري التحقق من تسجيل الدخول...</span>
        </div>
      </div>
    );
  }

  // 2. Strict Discord Login Guard Screen
  if (!user) {
    return (
      <LoginView
        onLoginDemo={handleDemoLogin}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  // 3. Authenticated Dashboard UI
  return (
    <div className={`min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Navbar Header */}
      <Navbar
        guilds={guilds}
        selectedGuild={selectedGuild}
        onSelectGuild={setSelectedGuild}
        user={user}
        onLogout={handleLogout}
        status={status}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        lang={lang}
        setLang={setLang}
      />

      {/* Main Dashboard Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Navigation Sidebar & Mobile Drawer */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          lang={lang}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          
          {activeTab === 'Overview' && (
            <OverviewTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Protection' && (
            <ProtectionTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Auto-Mod' && (
            <AutoModTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {(activeTab === 'Welcome' || activeTab === 'Auto-Roles') && (
            <WelcomeTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Leveling' && (
            <LevelingTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Tickets' && (
            <TicketsTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Logging' && (
            <LoggingTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Aliases' && (
            <AliasesTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Backups' && (
            <BackupsTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'AI Generator' && (
            <AiTab onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Azkar' && (
            <AzkarTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'BloxFruits' && (
            <BloxFruitsTab onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Roles' && (
            <RolesTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

          {activeTab === 'Broadcast' && (
            <BroadcastTab guild={selectedGuild} onSave={showToast} lang={lang} />
          )}

        </main>
      </div>

      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}
