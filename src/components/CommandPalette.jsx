import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Terminal,
  RefreshCw,
  Sliders,
  Database,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Download,
  Cpu,
  FileText,
  Activity,
  X,
  Sparkles,
  Command,
  ArrowRight,
  ShieldCheck,
  Copy,
  Info
} from 'lucide-react';
import axios from 'axios';

export default function CommandPalette({
  isOpen,
  onClose,
  selectedGuild,
  setActiveTab,
  showToast,
  lang = 'ar'
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, executing, success, error
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const inputRef = useRef(null);
  const terminalEndRef = useRef(null);

  const t = {
    ar: {
      placeholder: 'اكتب أمراً إدارياً (مثال: /system-diagnostic)...',
      noResults: 'لا توجد نتائج مطابقة لبحثك',
      executing: 'جاري تنفيذ الأمر...',
      shortcutHint: 'اضغط Esc للإغلاق • ↵ للتنفيذ • ↑↓ للتنقل',
      terminalHeader: 'مخرجات التحكم بالنظام',
      closeBtn: 'إغلاق',
      clearTerminal: 'مسح المخرجات',
      copySuccess: 'تم نسخ المخرجات',
      downloadBlueprint: 'تحميل ملف البنية',
      copied: 'تم النسخ!',
      searchCategory: 'الفئة',
      cats: {
        All: 'الكل',
        Admin: 'إدارة السيرفر',
        Dev: 'تطوير البوت',
        Nav: 'التنقل في لوحة التحكم',
        Util: 'أدوات عامة'
      }
    },
    en: {
      placeholder: 'Type an admin command (e.g., /system-diagnostic)...',
      noResults: 'No commands matching your query found',
      executing: 'Executing command...',
      shortcutHint: 'Press Esc to close • ↵ to run • ↑↓ to navigate',
      terminalHeader: 'System Control Terminal',
      closeBtn: 'Close',
      clearTerminal: 'Clear Terminal',
      copySuccess: 'Terminal output copied',
      downloadBlueprint: 'Download Architecture Blueprint',
      copied: 'Copied!',
      searchCategory: 'Category',
      cats: {
        All: 'All',
        Admin: 'Server Admin',
        Dev: 'Bot Development',
        Nav: 'Dashboard Nav',
        Util: 'General Utilities'
      }
    }
  }[lang || 'ar'];

  const commands = [
    {
      name: '/system-diagnostic',
      description: lang === 'ar' ? 'تشخيص حالة النظام الكاملة وفحص استهلاك الموارد وحالة قاعدة البيانات' : 'Gathers complete system diagnostics, resource consumption, and database statistics.',
      category: 'Dev',
      icon: Cpu,
      danger: false,
      color: 'text-indigo-400 bg-indigo-500/10'
    },
    {
      name: '/reload-commands',
      description: lang === 'ar' ? 'إعادة تحميل موديولات وأوامر البوت البرمجية ديناميكياً بدون إيقافه' : 'Force reloads the bot commands dynamically from the workspace files.',
      category: 'Dev',
      icon: RefreshCw,
      danger: false,
      color: 'text-purple-400 bg-purple-500/10'
    },
    {
      name: '/toggle-maintenance',
      description: lang === 'ar' ? 'تفعيل أو إلغاء وضع الصيانة العام للبوت ومراقبة تأثير الاستجابة' : 'Toggles maintenance mode state inside the database config.',
      category: 'Dev',
      icon: Sliders,
      danger: true,
      color: 'text-amber-400 bg-amber-500/10'
    },
    {
      name: '/clone-architecture',
      description: lang === 'ar' ? 'أخذ نسخة احتياطية من بنية وتفضيلات السيرفر الحالي وتنزيل ملف الإعدادات' : 'Clones server configurations and downloads the architectural schema blueprint.',
      category: 'Admin',
      icon: Database,
      danger: false,
      color: 'text-emerald-400 bg-emerald-500/10'
    },
    {
      name: '/reset-server',
      description: lang === 'ar' ? 'تصفير وإعادة تعيين كافة إعدادات السيرفر المختار إلى الإعدادات الافتراضية' : 'Resets all configuration modules for the selected server to defaults.',
      category: 'Admin',
      icon: AlertTriangle,
      danger: true,
      color: 'text-rose-400 bg-rose-500/10'
    },
    {
      name: '/view-logs',
      description: lang === 'ar' ? 'الانتقال المباشر لتبويب عارض سجلات العمليات والأحداث الخاصة بالبوت' : 'Navigates directly to the system activity log viewer tab.',
      category: 'Nav',
      icon: FileText,
      danger: false,
      color: 'text-sky-400 bg-sky-500/10'
    },
    {
      name: '/show-status',
      description: lang === 'ar' ? 'عرض تفصيلي وسريع لحالة البوت الحالية والاتصال وسيرفرات الديسكورد' : 'Displays quick info about current bot status, latency, and guilds.',
      category: 'Nav',
      icon: Activity,
      danger: false,
      color: 'text-blue-400 bg-blue-500/10'
    },
    {
      name: '/clear-cache',
      description: lang === 'ar' ? 'مسح التخزين المؤقت لمتصفح الويب لضمان مزامنة البيانات فورا' : 'Clears local session storage and resets cached state.',
      category: 'Util',
      icon: Terminal,
      danger: false,
      color: 'text-teal-400 bg-teal-500/10'
    },
    {
      name: '/help',
      description: lang === 'ar' ? 'عرض قائمة المساعدة والدليل المرجعي لكافة العمليات والأوامر الإدارية' : 'Displays help and reference manual for all palette commands.',
      category: 'Util',
      icon: Info,
      danger: false,
      color: 'text-zinc-400 bg-zinc-500/10'
    }
  ];

  // Filter commands based on query and active category
  const filteredCommands = commands.filter((cmd) => {
    const matchesQuery = cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === 'All' || cmd.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  // Keep selected index within boundaries
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setStatus('idle');
      setTerminalOutput([]);
      setResultData(null);
    }
  }, [isOpen]);

  // Handle outside click / Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // Handled by App.js to open
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const addLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput((prev) => [...prev, { text, type, timestamp }]);
  };

  const handleCommandExecution = async (command) => {
    setStatus('executing');
    setResultData(null);
    setTerminalOutput([]);
    addLog(`Initiating system execution sequence for command: ${command.name}`, 'info');

    if (command.name === '/clear-cache') {
      addLog('Scanning client-side session cache...', 'info');
      setTimeout(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          addLog('Local state caches fully flushed.', 'success');
          addLog('Session storage registers fully cleared.', 'success');
          setStatus('success');
          showToast(lang === 'ar' ? 'تم مسح التخزين المؤقت بنجاح' : 'Local caches successfully cleared', 'success');
        } catch (e) {
          addLog(`Cache flush failed: ${e.message}`, 'error');
          setStatus('error');
        }
      }, 800);
      return;
    }

    if (command.name === '/view-logs') {
      addLog('Resolving target dashboard tab index...', 'info');
      setTimeout(() => {
        setActiveTab('Logs');
        addLog('Dashboard viewport redirection complete.', 'success');
        setStatus('success');
        showToast(lang === 'ar' ? 'تم الانتقال لسجل العمليات' : 'Redirected to Logs', 'success');
        onClose();
      }, 500);
      return;
    }

    if (command.name === '/show-status') {
      addLog('Querying bot main core process status...', 'info');
      try {
        const response = await axios.get('/api/status');
        addLog('Response code: 200 OK', 'success');
        addLog(`Bot Tag: ${response.data?.tag || 'N/A'}`, 'info');
        addLog(`Bot Status: ${response.data?.ready ? 'Ready / Connected' : 'Disconnected'}`, 'success');
        addLog(`Guild Count: ${response.data?.guilds || 0}`, 'info');
        addLog(`Shard ID: ${response.data?.shardId || 0}`, 'info');
        setResultData(response.data);
        setStatus('success');
      } catch (err) {
        addLog(`Status query returned exception: ${err.message}`, 'error');
        setStatus('error');
      }
      return;
    }

    if (command.name === '/help') {
      addLog('Displaying Help Manifest v1.4.0', 'success');
      addLog('Available command palette operations:', 'info');
      commands.forEach((c) => {
        addLog(`- ${c.name}: ${c.description}`, 'info');
      });
      setStatus('success');
      return;
    }

    // Backend Execution commands (/reset-server, /clone-architecture, /reload-commands, /system-diagnostic, /toggle-maintenance)
    try {
      addLog('Dispatching POST payload to secure administration endpoint...', 'info');
      const response = await axios.post('/api/admin/execute', {
        command: command.name,
        guildId: selectedGuild?.id
      });

      addLog(`Secure connection established. Executing backend routines...`, 'info');

      if (response.data?.success) {
        addLog('Routine compiled with success status.', 'success');
        addLog(response.data.message || 'Operation succeeded.', 'success');

        if (response.data.diagnostics) {
          const diag = response.data.diagnostics;
          addLog(`Node.js Engine Version: ${diag.nodeVersion}`, 'info');
          addLog(`Server Uptime: ${diag.uptime}`, 'info');
          addLog(`Heap Allocation: ${diag.memory}`, 'info');
          addLog(`Database Storage Footprint: ${diag.dbSize}`, 'info');
          addLog(`Discord Client Ping: ${diag.ping}`, 'info');
          addLog(`Total Leveling Records: ${diag.levelingCount}`, 'info');
          addLog(`Open Support Tickets: ${diag.ticketsCount}`, 'info');
          addLog(`Active Mod Warnings: ${diag.warningsCount}`, 'info');
          addLog(`Available Saved Backups: ${diag.backupsCount}`, 'info');
        }

        if (response.data.blueprint) {
          setResultData(response.data.blueprint);
          addLog('Server Configuration Blueprint fetched successfully.', 'success');
        }

        setStatus('success');
        showToast(response.data.message || 'Success', 'success');
      } else {
        addLog(`Server returned non-success result: ${response.data?.error || 'Unknown error'}`, 'error');
        setStatus('error');
      }
    } catch (err) {
      addLog(`Payload transmission failed: ${err.response?.data?.error || err.message}`, 'error');
      setStatus('error');
    }
  };

  const handleKeyDown = (e) => {
    if (status === 'executing') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleCommandExecution(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const downloadBlueprintFile = () => {
    if (!resultData) return;
    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guild-${selectedGuild?.id || 'backup'}-architecture.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(lang === 'ar' ? 'تم تحميل ملف البنية بنجاح' : 'Blueprint downloaded', 'success');
  };

  const copyTerminalOutput = () => {
    const rawText = terminalOutput.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(rawText);
    showToast(t.copySuccess, 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 md:px-0">
      {/* Dark Overlay Background with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Command Palette Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#0b0c13] border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10">
        
        {/* Decorative Ambient Aura Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

        {/* Input Bar Section */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-indigo-500/10">
          <Search size={20} className="text-zinc-400 animate-pulse shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm text-white placeholder-zinc-500 w-full"
            placeholder={t.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={status === 'executing'}
          />
          {status === 'executing' ? (
            <Loader2 size={18} className="animate-spin text-purple-400 shrink-0" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold shrink-0">
              <Command size={10} />
              K
            </kbd>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category Tabs Bar */}
        {status === 'idle' && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-indigo-500/5 overflow-x-auto select-none no-scrollbar">
            {Object.entries(t.cats).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === key
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Inner Panel Viewport */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[45vh] custom-scrollbar">
          
          {status === 'idle' && (
            <>
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                  <Terminal size={32} className="text-zinc-600" />
                  <p className="text-xs text-zinc-500 font-medium">{t.noResults}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={cmd.name}
                        onClick={() => handleCommandExecution(cmd)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-right cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-500/10 border border-indigo-500/30'
                            : 'hover:bg-zinc-900/40 border border-transparent'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${cmd.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {cmd.name}
                            </span>
                            {cmd.danger && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-500/20 border border-rose-500/30 text-rose-300">
                                DANGER
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-zinc-800 text-zinc-400 mr-auto">
                              {t.cats[cmd.category] || cmd.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                            {cmd.description}
                          </p>
                        </div>
                        <div className={`self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${lang === 'ar' ? 'rotate-180' : ''}`}>
                          <ArrowRight size={14} className="text-indigo-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Interactive Terminal Execution / Result Console */}
          {status !== 'idle' && (
            <div className="flex flex-col h-full bg-black/40 border border-indigo-500/15 rounded-xl overflow-hidden p-3 font-mono text-[11px] leading-relaxed">
              <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span className="text-zinc-400 font-bold ml-2">{t.terminalHeader}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyTerminalOutput}
                    className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Output"
                  >
                    <Copy size={13} />
                  </button>
                  {resultData && (
                    <button
                      onClick={downloadBlueprintFile}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-bold transition-colors cursor-pointer"
                    >
                      <Download size={11} />
                      <span>JSON</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Console Logs List */}
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[30vh] pr-2 custom-scrollbar">
                {terminalOutput.map((log, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`shrink-0 select-none font-bold ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400' :
                      'text-indigo-400'
                    }`}>
                      {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : 'ℹ'}
                    </span>
                    <span className={
                      log.type === 'success' ? 'text-zinc-300' :
                      log.type === 'error' ? 'text-rose-300' :
                      'text-zinc-400'
                    }>
                      {log.text}
                    </span>
                  </div>
                ))}
                {status === 'executing' && (
                  <div className="flex items-center gap-1.5 text-zinc-500 animate-pulse mt-1">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Executing server subprocess...</span>
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>

              {/* Terminal Footer Controls */}
              {status !== 'executing' && (
                <div className="mt-3 pt-2.5 border-t border-indigo-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                    <ShieldCheck size={12} />
                    <span>Operation terminated {status === 'success' ? 'successfully' : 'with error'}</span>
                  </div>
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer font-sans text-xs font-semibold"
                  >
                    {t.clearTerminal}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-indigo-500/10 flex items-center justify-between text-[10px] text-zinc-500 font-medium">
          <span>{t.shortcutHint}</span>
          <span className="text-indigo-400/80 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
            REQUIEM Admin Console
          </span>
        </div>

      </div>
    </div>
  );
}
