import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Radio, Send, Plus, Trash2, CheckCircle, AlertCircle, Sparkles, ExternalLink,
  RefreshCw, Bot, MessageSquare, Play, Square, RotateCcw, Zap, Users, ShieldCheck, Activity, Info
} from 'lucide-react';

export default function BroadcastTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const guildId = guild?.id;

  // Form & Message state
  const [message, setMessage] = useState('مرحباً {user} نتمنى لك وقتاً ممتعاً في {server}!');
  const [loading, setLoading] = useState(false);

  // Global Broadcast Engine State
  const [broadcastStatus, setBroadcastStatus] = useState('idle');
  const [currentBroadcast, setCurrentBroadcast] = useState(null);
  const [targetCount, setTargetCount] = useState(100);
  const [targetType, setTargetType] = useState('all'); // all, online, offline
  const [speedMode, setSpeedMode] = useState('safe'); // safe, medium, fast
  const [botTokens, setBotTokens] = useState([]);
  const [newToken, setNewToken] = useState('');
  const [addingToken, setAddingToken] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch initial data & status interval
  useEffect(() => {
    fetchGuildSettings();
    fetchBroadcastStatus();
    fetchTokens();

    const interval = setInterval(() => {
      fetchBroadcastStatus();
      fetchTokens();
    }, 2500);

    return () => clearInterval(interval);
  }, [guildId]);

  const fetchGuildSettings = () => {
    if (!guildId) return;
    axios.get(`/api/guilds/${guildId}/broadcast/settings`)
      .then(res => { if (res.data?.message) setMessage(res.data.message); })
      .catch(() => {});
  };

  const fetchBroadcastStatus = () => {
    axios.get('/api/broadcast/status')
      .then(res => {
        setBroadcastStatus(res.data.status || 'idle');
        setCurrentBroadcast(res.data.currentBroadcast || null);
      })
      .catch(() => {});
  };

  const fetchTokens = () => {
    axios.get('/api/broadcast/tokens')
      .then(res => { if (Array.isArray(res.data)) setBotTokens(res.data); })
      .catch(() => {});
  };

  const handleSaveMessage = () => {
    if (!message || !guildId) return;
    setLoading(true);
    axios.post(`/api/guilds/${guildId}/broadcast/settings`, { message })
      .then(() => {
        onSave(isAr ? 'تم حفظ قالب رسالة البرودكاست بنجاح' : 'Broadcast message template saved', 'success');
      })
      .catch(() => {
        onSave(isAr ? 'حدث خطأ أثناء حفظ القالب' : 'Error saving message template', 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleStartBroadcast = () => {
    if (!message) {
      onSave(isAr ? 'يرجى إدخال نص الرسالة أولاً' : 'Please enter message content first', 'error');
      return;
    }
    if (botTokens.length === 0) {
      onSave(isAr ? 'يرجى إضافة توكن بوت واحد على الأقل لإطلاق البرودكاست' : 'Please add at least one bot token first', 'error');
      return;
    }

    setActionLoading(true);
    axios.post('/api/broadcast/start', {
      message,
      totalTarget: parseInt(targetCount, 10) || 100,
      guildId: guildId || null,
      speedMode,
      targetType
    })
      .then(res => {
        setBroadcastStatus('running');
        setCurrentBroadcast(res.data.broadcast);
        onSave(isAr ? 'تم انطلاق عملية البرودكاست عبر شبكة البوتات بنجاح!' : 'Broadcast started via bot network successfully!', 'success');
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || err.message;
        onSave(isAr ? `فشل تشغيل البرودكاست: ${errorMsg}` : `Failed to start: ${errorMsg}`, 'error');
      })
      .finally(() => setActionLoading(false));
  };

  const handleStopBroadcast = () => {
    setActionLoading(true);
    axios.post('/api/broadcast/stop')
      .then(() => {
        setBroadcastStatus('stopped');
        onSave(isAr ? 'تم إيقاف عملية البرودكاست' : 'Broadcast stopped', 'success');
      })
      .catch(() => {})
      .finally(() => setActionLoading(false));
  };

  const handleResetStats = () => {
    if (!window.confirm(isAr ? 'هل أنت تأكد من إعادة ضبط جميع الإحصائيات وسجل الإرسال؟' : 'Are you sure you want to reset stats and log?')) return;
    axios.post('/api/broadcast/reset')
      .then(() => {
        setCurrentBroadcast(null);
        setBroadcastStatus('idle');
        fetchTokens();
        onSave(isAr ? 'تم إعادة ضبط الإحصائيات والسجل' : 'Stats reset', 'success');
      })
      .catch(() => {});
  };

  const handleAddToken = (e) => {
    e.preventDefault();
    if (!newToken.trim()) return;
    setAddingToken(true);
    axios.post('/api/broadcast/tokens', { token: newToken.trim() })
      .then(res => {
        if (res.data.success) {
          onSave(isAr ? `تم تسجيل البوت ${res.data.username || ''} بنجاح` : `Bot ${res.data.username || ''} connected`, 'success');
          setNewToken('');
          fetchTokens();
        } else {
          onSave(isAr ? `فشل الربط: ${res.data.error || 'توكن غير صالح'}` : `Connection failed: ${res.data.error || 'Invalid Token'}`, 'error');
        }
      })
      .catch(err => {
        onSave(isAr ? 'خطأ في الاتصال بالسيرفر أو توكن غير صحيح' : 'Connection error or invalid token', 'error');
      })
      .finally(() => setAddingToken(false));
  };

  const handleDeleteToken = (id) => {
    axios.delete(`/api/broadcast/tokens/${id}`)
      .then(() => {
        setBotTokens(botTokens.filter(t => t.id !== id));
        onSave(isAr ? 'تم إزالة توكن البوت بنجاح' : 'Bot token removed', 'success');
      })
      .catch(() => {});
  };

  const progressPercentage = currentBroadcast?.totalTarget 
    ? Math.min(100, Math.round(((currentBroadcast.successCount + currentBroadcast.failCount) / currentBroadcast.totalTarget) * 100))
    : 0;

  const activeBotsCount = botTokens.filter(b => b.status === 'active').length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="pro-card p-6 border-l-4 border-l-purple-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio size={22} className="text-purple-400 animate-pulse" />
            <span>{isAr ? 'نظام البرودكاست عبر شبكة بوتات الديسكورد (Bot Network)' : 'Discord Bot Broadcast System'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAr 
              ? 'إرسال رسائل خاصة (DMs) لأعضاء السيرفر تلقائياً عبر شبكة من بوتات الديسكورد (Bot Tokens) بالتناوب لمنع الحظر والسبام.' 
              : 'Automatically send Direct Messages (DMs) to members using a network of Discord Bot tokens.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            broadcastStatus === 'running' 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
              : broadcastStatus === 'completed'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-zinc-800/80 text-zinc-400 border-white/10'
          }`}>
            <Activity size={14} />
            <span>
              {broadcastStatus === 'running' && (isAr ? 'جاري الإرسال...' : 'Broadcasting...')}
              {broadcastStatus === 'completed' && (isAr ? 'مكتمل' : 'Completed')}
              {broadcastStatus === 'stopped' && (isAr ? 'متوقف' : 'Stopped')}
              {broadcastStatus === 'idle' && (isAr ? 'جاهز' : 'Idle')}
            </span>
          </span>

          <button
            onClick={handleResetStats}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-white/10"
            title={isAr ? 'إعادة ضبط الإحصائيات' : 'Reset Stats'}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Info Box explaining Bot Tokens */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
        <Info size={18} className="text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-200/90 leading-relaxed">
          {isAr ? (
            <>
              <strong>كيف يعمل نظام البرودكاست؟</strong> يقوم النظام بالاتصال ببوتات الديسكورد الخاصة بك عبر <strong>Bot Tokens</strong>. عند بدء الإرسال، تقوم البوتات بإرسال رسائل خاصة (DMs) للأعضاء بالتناوب. أضف توكن البوت أدناه وقم بدعوته لسيرفرك لإطلاق الحملة!
            </>
          ) : (
            <>
              <strong>How Broadcast Works:</strong> The system connects to your Discord bots using <strong>Bot Tokens</strong>. When triggered, the bots rotate to send Direct Messages (DMs) to server members safely.
            </>
          )}
        </div>
      </div>

      {/* Live Broadcast Progress Panel if running or completed */}
      {currentBroadcast && (
        <div className="pro-card p-5 space-y-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-emerald-400" />
              <h3 className="text-xs font-bold text-white">
                {isAr ? 'مؤشر الإرسال الحي (Live DM Progress)' : 'Live DM Progress Meter'}
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-300 font-bold">
              {currentBroadcast.successCount + currentBroadcast.failCount} / {currentBroadcast.totalTarget} ({progressPercentage}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-950/80 rounded-full h-3 overflow-hidden border border-white/10 p-0.5">
            <div
              className="bg-gradient-to-r from-purple-600 to-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400">{isAr ? 'رسائل ناجحة' : 'Successful DMs'}</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{currentBroadcast.successCount || 0}</div>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400">{isAr ? 'فشل الإرسال' : 'Failed DMs'}</div>
              <div className="text-sm font-bold text-red-400 font-mono mt-0.5">{currentBroadcast.failCount || 0}</div>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400">{isAr ? 'الهدف المخطط' : 'Total Target'}</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">{currentBroadcast.totalTarget || 0}</div>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400">{isAr ? 'نمط السرعة' : 'Speed Mode'}</div>
              <div className="text-sm font-bold text-purple-300 font-mono mt-0.5 capitalize">{currentBroadcast.speedMode || 'Safe'}</div>
            </div>
          </div>

          {/* Recent Live Feed */}
          {currentBroadcast.liveRecipients && currentBroadcast.liveRecipients.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <Users size={12} className="text-emerald-400" />
                <span>{isAr ? 'أحدث الأعضاء المستلمين للرسائل (DMs) الآن:' : 'Recent DM Recipients:'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentBroadcast.liveRecipients.map((rec, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-zinc-950/80 border border-white/10 rounded-lg text-[10px] font-mono text-zinc-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="font-bold text-white">{rec.tag || rec.id}</span>
                    <span className="text-zinc-500">({rec.botUsername})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Broadcast Message & Settings */}
        <div className="pro-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-purple-400" />
              <span>{isAr ? 'إطلاق البرودكاست وتعديل الرسالة' : 'Broadcast Message & Launcher'}</span>
            </h3>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">
              {isAr ? 'التاغات: {user} {server} {username}' : 'Tags: {user} {server} {username}'}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">
              {isAr ? 'نص رسالة البرودكاست (DM Message)' : 'DM Message Content'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={isAr ? 'مرحبا {user} نتمنى لك وقتاً ممتعاً في {server}...' : 'Hello {user} welcome to {server}!'}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">{isAr ? 'العدد المستهدف' : 'Target Count'}</label>
              <input
                type="number"
                min="1"
                max="5000"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">{isAr ? 'فلتر حالة الأعضاء' : 'Presence Filter'}</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">{isAr ? 'الجميع (All)' : 'All Members'}</option>
                <option value="online">{isAr ? 'المتصلين فقط (Online)' : 'Online Only'}</option>
                <option value="offline">{isAr ? 'غير المتصلين (Offline)' : 'Offline Only'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">{isAr ? 'نمط السرعة' : 'Speed Mode'}</label>
              <select
                value={speedMode}
                onChange={(e) => setSpeedMode(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="safe">{isAr ? 'آمن (Safe 1.5s)' : 'Safe (1.5s)'}</option>
                <option value="medium">{isAr ? 'متوسط (Medium 0.8s)' : 'Medium (0.8s)'}</option>
                <option value="fast">{isAr ? 'سريع (Fast 0.3s)' : 'Fast (0.3s)'}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSaveMessage}
              disabled={loading}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              <span>{isAr ? 'حفظ الرسالة' : 'Save Template'}</span>
            </button>

            {broadcastStatus === 'running' ? (
              <button
                onClick={handleStopBroadcast}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Square size={14} />}
                <span>{isAr ? 'إيقاف البرودكاست' : 'Stop Broadcast'}</span>
              </button>
            ) : (
              <button
                onClick={handleStartBroadcast}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>{isAr ? 'إطلاق البرودكاست الآن (DM)' : 'Start Broadcast (DM)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Discord Bot Tokens Manager */}
        <div className="pro-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Bot size={16} className="text-indigo-400" />
              <span>{isAr ? 'شبكة توكنات بوتات الديسكورد (Discord Bot Tokens)' : 'Discord Bot Tokens Network'}</span>
            </h3>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
              {activeBotsCount} / {botTokens.length} {isAr ? 'نشط' : 'Active'}
            </span>
          </div>

          <form onSubmit={handleAddToken} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isAr ? 'توكن بوت ديسكورد جديد (Bot Token)' : 'New Discord Bot Token'}
              </label>
              <input
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="OTM4..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={addingToken}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              {addingToken ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{isAr ? 'ربط وتشغيل البوت (Connect Bot)' : 'Connect & Online Bot'}</span>
            </button>
          </form>

          {/* Connected Bot Tokens List */}
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-semibold text-zinc-400">
              {isAr ? 'البوتات المتصلة حالياً بالشبكة:' : 'Connected Bots Network:'}
            </div>
            {botTokens.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-white/5">
                {isAr ? 'لا توجد بوتات مسجلة بعد. أضف توكن البوت أعلاه لتجهيز شبكة الإرسال.' : 'No bot tokens added yet.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {botTokens.map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300 font-bold">
                        <Bot size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${b.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span className="font-bold text-white truncate">{b.username || `Bot #${b.id}`}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>DMs: <strong className="text-emerald-400">{b.successCount || 0}</strong></span>
                          <span>Fails: <strong className="text-red-400">{b.failCount || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {b.inviteLink && (
                        <a
                          href={b.inviteLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>{isAr ? 'دعوة للسيرفر' : 'Invite Bot'}</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteToken(b.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={isAr ? 'حذف البوت' : 'Delete Bot'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
