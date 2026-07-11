import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity,
  User,
  ShieldCheck,
  RefreshCcw,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';

const NodesTab = ({ lang }) => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resettingNode, setResettingNode] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNodes = async () => {
    try {
      setIsRefreshing(true);
      const res = await axios.get('/api/nodes');
      setNodes(res.data);
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleReset = async (nodeId) => {
    try {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'resetting' } : n));
      await axios.post(`/api/nodes/${nodeId}/reset`);
      await fetchNodes();
      setResettingNode(null);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to reset node:', err);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'error' } : n));
    }
  };

  const filteredNodes = nodes.filter(node => 
    node.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.clientId?.includes(searchQuery)
  );

  const isAr = lang === 'ar';

  const t = {
    title: isAr ? 'عقد السيرفر (Nodes)' : 'Server Nodes',
    description: isAr ? 'إدارة ومراقبة حالات البوتات المتصلة بالشبكة' : 'Manage and monitor connected bot instances',
    refresh: isAr ? 'تحديث' : 'Refresh',
    search: isAr ? 'بحث عن عقدة...' : 'Search nodes...',
    reset: isAr ? 'إعادة ضبط' : 'Reset',
    confirmTitle: isAr ? 'تأكيد إعادة الضبط' : 'Confirm Reset',
    confirmDesc: isAr ? 'هل أنت متأكد من رغبتك في إعادة تشغيل هذه العقدة؟ سيتم فصل البوت وإعادة ربطه فوراً.' : 'Are you sure you want to restart this node? The bot will be disconnected and reconnected immediately.',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    status: isAr ? 'الحالة' : 'Status',
    success: isAr ? 'نجاح' : 'Success',
    fail: isAr ? 'فشل' : 'Fail',
    lastUsed: isAr ? 'آخر استخدام' : 'Last Used',
    active: isAr ? 'نشط' : 'Active',
    offline: isAr ? 'غير متصل' : 'Offline',
    resetting: isAr ? 'جاري إعادة الضبط...' : 'Resetting...',
    noNodes: isAr ? 'لا توجد عقد متصلة حالياً' : 'No nodes currently connected',
  };

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <RotateCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="text-indigo-400" />
            {t.title}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">{t.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              id="node-search-input"
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 w-full md:w-64"
            />
          </div>
          <button 
            id="refresh-nodes-btn"
            onClick={fetchNodes}
            disabled={isRefreshing}
            className="p-2 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-5 h-5 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.length > 0 ? (
          filteredNodes.map((node) => (
            <motion.div 
              layout
              id={`node-card-${node.id}`}
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/20 transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-all ${
                    node.status === 'active' ? 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/20 to-red-600/5 border-red-500/20'
                  } border`}>
                    <Activity className={`w-6 h-6 ${node.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white truncate max-w-[140px]">{node.username}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${node.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {node.status === 'active' ? t.active : node.status === 'resetting' ? t.resetting : t.offline}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  id={`node-reset-btn-${node.id}`}
                  onClick={() => {
                    setResettingNode(node);
                    setShowModal(true);
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-indigo-400 transition-all opacity-0 group-hover:opacity-100"
                  title={t.reset}
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div id={`node-stats-success-${node.id}`} className="bg-white/2 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {t.success}
                  </div>
                  <div className="text-lg font-mono font-bold text-white leading-none">
                    {node.successCount.toLocaleString()}
                  </div>
                </div>
                <div id={`node-stats-fail-${node.id}`} className="bg-white/2 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-400" />
                    {t.fail}
                  </div>
                  <div className="text-lg font-mono font-bold text-white leading-none">
                    {node.failCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">
                    {node.lastUsed ? new Date(node.lastUsed).toLocaleTimeString() : '---'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium truncate max-w-[80px]">
                    {node.clientId || 'ID Unavailable'}
                  </span>
                </div>
              </div>

              {/* Decorative background element */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.02] transform rotate-12 transition-transform group-hover:scale-110">
                <Server size={120} />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-white/5">
            <Server className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">{t.noNodes}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && resettingNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full relative shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                <RotateCw className="w-8 h-8 text-indigo-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white text-center mb-2">{t.confirmTitle}</h3>
              <p className="text-zinc-400 text-center text-sm leading-relaxed mb-8">
                {t.confirmDesc}
                <br />
                <span className="text-indigo-400 font-bold mt-2 block">{resettingNode.username}</span>
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  id="modal-confirm-reset-btn"
                  onClick={() => handleReset(resettingNode.id)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  {t.reset}
                </button>
                <button 
                  id="modal-cancel-reset-btn"
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NodesTab;
