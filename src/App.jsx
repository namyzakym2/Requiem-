import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Ticket, 
  Users, 
  Activity, 
  ShieldCheck,
  Shield,
  Trophy,
  Terminal,
  Lock,
  Plus,
  Trash2,
  ChevronRight,
  Search,
  Download,
  Database,
  Bot,
  Layout,
  Clock,
  RefreshCw,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [protection, setProtection] = useState(null);
  const [welcome, setWelcome] = useState(null);
  const [autoRoles, setAutoRoles] = useState([]);
  const [badwords, setBadwords] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);
  const [guildStats, setGuildStats] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [isSelectingServer, setIsSelectingServer] = useState(true);
  const [newAlias, setNewAlias] = useState({ name: '', original: '' });
  const [customLists, setCustomLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [newListContent, setNewListContent] = useState('');
  const [ticketCategories, setTicketCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImageUrl, setAiImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logging, setLogging] = useState(null);
  const [whitelistedBots, setWhitelistedBots] = useState([]);
  const [newBotId, setNewBotId] = useState('');
  const [backups, setBackups] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(null);

  const [guildRolesFull, setGuildRolesFull] = useState([]);
  const [newRole, setNewRole] = useState({ name: '', color: '#99AAB5' });

  const fetchData = async () => {
    try {
      console.log("Fetching dashboard data from:", window.location.origin);
      
      const [statusRes, statsRes, guildsRes] = await Promise.all([
        fetch('/api/status').catch(e => { console.error("Status fetch failed:", e); throw e; }),
        fetch('/api/stats').catch(e => { console.error("Stats fetch failed:", e); throw e; }),
        fetch('/api/guilds').catch(e => { console.error("Guilds fetch failed:", e); throw e; })
      ]);
      
      if (statusRes.ok) setStatus(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (guildsRes.ok) {
        const guildsData = await guildsRes.json();
        setGuilds(guildsData);
        if (guildsData.length > 0 && !selectedGuildId) {
          setSelectedGuildId(guildsData[0].id);
        }
      }
      
      // Mock user for dashboard functionality
      setUser({
        id: 'system-admin',
        username: 'System Admin',
        avatar: null,
        guilds: [] // Not used anymore for filtering
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProtection = async (guildId) => {
    const [protRes, chanRes] = await Promise.all([
      fetch(`/api/guilds/${guildId}/protection`),
      fetch(`/api/guilds/${guildId}/channels`)
    ]);
    if (protRes.ok) setProtection(await protRes.json());
    if (chanRes.ok) setChannels(await chanRes.json());
  };

  const fetchGuildSettings = async (guildId) => {
    const [welcomeRes, autoRolesRes, badwordsRes, rolesRes, aliasesRes, statsRes] = await Promise.all([
      fetch(`/api/guilds/${guildId}/welcome`),
      fetch(`/api/guilds/${guildId}/auto-roles`),
      fetch(`/api/guilds/${guildId}/badwords`),
      fetch(`/api/guilds/${guildId}/roles`),
      fetch(`/api/guilds/${guildId}/aliases`),
      fetch(`/api/guilds/${guildId}/stats`)
    ]);

    if (welcomeRes.ok) setWelcome(await welcomeRes.json());
    if (autoRolesRes.ok) setAutoRoles(await autoRolesRes.json());
    if (badwordsRes.ok) setBadwords(await badwordsRes.json());
    if (rolesRes.ok) {
      const rolesData = await rolesRes.json();
      setGuildRoles(rolesData);
      setGuildRolesFull(rolesData);
    }
    if (aliasesRes.ok) setAliases(await aliasesRes.json());
    if (statsRes.ok) setGuildStats(await statsRes.json());
    
    const listsRes = await fetch(`/api/guilds/${guildId}/custom-lists`);
    if (listsRes.ok) setCustomLists(await listsRes.json());

    const categoriesRes = await fetch(`/api/guilds/${guildId}/ticket-categories`);
    if (categoriesRes.ok) setTicketCategories(await categoriesRes.json());

    const loggingRes = await fetch(`/api/guilds/${guildId}/logging`);
    if (loggingRes.ok) setLogging(await loggingRes.json());

    const botsRes = await fetch(`/api/guilds/${guildId}/whitelisted-bots`);
    if (botsRes.ok) setWhitelistedBots(await botsRes.json());

    const backupsRes = await fetch(`/api/guilds/${guildId}/backups`);
    if (backupsRes.ok) setBackups(await backupsRes.json());
  };

  useEffect(() => {
    if (selectedGuildId) {
      fetchProtection(selectedGuildId);
      fetchGuildSettings(selectedGuildId);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-blue-500 font-mono animate-pulse">Initializing System...</div>
      </div>
    );
  }

  const userAdminGuilds = guilds;

  if (isSelectingServer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-[#0d0d0d] border border-white/5 rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-6">
              <LayoutDashboard className="text-black w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Select a Server</h2>
            <p className="text-zinc-500">Choose the server you want to manage today.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {userAdminGuilds.map(guild => (
              <button
                key={guild.id}
                onClick={() => {
                  setSelectedGuildId(guild.id);
                  setIsSelectingServer(false);
                }}
                className="group p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
              >
                {guild.icon ? (
                  <img src={guild.icon} alt={guild.name} className="w-12 h-12 rounded-xl" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-xl">
                    {guild.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate group-hover:text-blue-400 transition-colors">{guild.name}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">{guild.memberCount} Members</p>
                </div>
                <ChevronRight size={20} className="text-zinc-700 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>

          {userAdminGuilds.length === 0 && (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <p className="text-zinc-500 mb-4">No servers found where you have permissions.</p>
              <a 
                href={`https://discord.com/api/oauth2/authorize?client_id=${status?.tag.split('#')[0]}&permissions=8&scope=bot%20applications.commands`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 font-bold hover:underline"
              >
                Invite Bot to a Server
              </a>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#0d0d0d] hidden lg:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <LayoutDashboard className="text-black w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Requiem <span className="text-blue-500">Bot</span></h1>
        </div>

        <nav className="space-y-2">
          <NavItem icon={<Activity size={20} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <NavItem icon={<ShieldCheck size={20} />} label="Protection" active={activeTab === 'Protection'} onClick={() => setActiveTab('Protection')} />
          <NavItem icon={<Database size={20} />} label="Backups" active={activeTab === 'Backups'} onClick={() => setActiveTab('Backups')} />
          <NavItem icon={<Terminal size={20} />} label="Logging" active={activeTab === 'Logging'} onClick={() => setActiveTab('Logging')} />
          <NavItem icon={<MessageSquare size={20} />} label="Welcome" active={activeTab === 'Welcome'} onClick={() => setActiveTab('Welcome')} />
          <NavItem icon={<Users size={20} />} label="Auto-Roles" active={activeTab === 'Auto-Roles'} onClick={() => setActiveTab('Auto-Roles')} />
          <NavItem icon={<Lock size={20} />} label="Auto-Mod" active={activeTab === 'Auto-Mod'} onClick={() => setActiveTab('Auto-Mod')} />
          <NavItem icon={<Terminal size={20} />} label="Aliases" active={activeTab === 'Aliases'} onClick={() => setActiveTab('Aliases')} />
          <NavItem icon={<Ticket size={20} />} label="Tickets" active={activeTab === 'Tickets'} onClick={() => setActiveTab('Tickets')} />
          <NavItem icon={<Shield size={20} />} label="Roles" active={activeTab === 'Roles'} onClick={() => setActiveTab('Roles')} />
          <NavItem icon={<Activity size={20} />} label="AI Generator" active={activeTab === 'AI Generator'} onClick={() => setActiveTab('AI Generator')} />
          <NavItem icon={<Activity size={20} />} label="Automation" active={activeTab === 'Automation'} onClick={() => setActiveTab('Automation')} />
          <NavItem icon={<LayoutDashboard size={20} />} label="Custom Lists" active={activeTab === 'Custom Lists'} onClick={() => setActiveTab('Custom Lists')} />
          <NavItem icon={<Terminal size={20} />} label="Commands" active={activeTab === 'Commands'} onClick={() => setActiveTab('Commands')} />
        </nav>

        <button 
          onClick={() => setIsSelectingServer(true)}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold uppercase tracking-widest"
        >
          Switch Server
        </button>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Bot Status</p>
              <p className="text-sm text-white font-medium">{status?.status === 'online' ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-8">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">System Overview</h2>
            <p className="text-zinc-500">Real-time monitoring and management for your Discord community.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-500 font-bold">
                S
              </div>
              <span className="text-sm font-medium text-white">System Admin</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        {activeTab === 'Overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard 
                icon={<Users className="text-blue-400" />} 
                label="Total Guilds" 
                value={status?.guilds || 0} 
                trend="+2 this week"
              />
              <StatCard 
                icon={<Trophy className="text-yellow-400" />} 
                label="Active Users" 
                value={guildStats?.totalUsers || 0} 
                trend="Leveling active"
              />
              <StatCard 
                icon={<Ticket className="text-blue-400" />} 
                label="Open Tickets" 
                value={guildStats?.openTickets || 0} 
                trend="Average response: 5m"
              />
              <StatCard 
                icon={<Activity className="text-purple-400" />} 
                label="Uptime" 
                value={status ? `${Math.floor(status.uptime / 3600000)}h` : "0h"} 
                trend="99.9% reliability"
              />
            </div>

            {/* Leaderboard & Guilds */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                <section className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <LayoutDashboard size={20} className="text-blue-500" />
                      Active Servers
                    </h3>
                    <span className="text-xs text-zinc-500 font-mono">{guilds.length} Guilds</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userAdminGuilds.map((guild) => (
                      <div 
                        key={guild.id} 
                        onClick={() => setSelectedGuildId(guild.id)}
                        className={`p-4 bg-white/[0.02] rounded-xl border flex items-center justify-between hover:border-white/10 transition-all cursor-pointer ${selectedGuildId === guild.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          {guild.icon ? (
                            <img src={guild.icon} alt={guild.name} className="w-10 h-10 rounded-lg" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
                              {guild.name[0]}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium text-sm truncate max-w-[120px]">{guild.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{guild.memberCount} Members</p>
                          </div>
                        </div>
                        {guild.invite && (
                          <a 
                            href={guild.invite} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-black transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Join
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Trophy size={20} className="text-yellow-500" />
                      Top Ranked Members
                    </h3>
                    <button className="text-xs text-blue-500 font-bold uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  
                  <div className="space-y-4">
                    {guildStats?.topLevels.map((user, idx) => {
                      const nextLevelXp = (user.level + 1) * 300;
                      const currentLevelXp = user.level * 300;
                      const progress = ((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
                      
                      return (
                        <div key={user.userId} className="p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-600 font-mono w-4">{idx + 1}</span>
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-white font-bold border border-white/5">
                                {user.userId.slice(-2)}
                              </div>
                              <div>
                                <p className="text-white font-medium group-hover:text-blue-400 transition-colors">User ID: {user.userId}</p>
                                <p className="text-xs text-zinc-500">
                                  <span className="text-zinc-300 font-medium">{user.xp}</span> / {nextLevelXp} XP
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-blue-500 font-bold text-lg">Lvl {user.level}</p>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Terminal size={20} className="text-blue-500" />
                    Quick Commands
                  </h3>
                  <div className="space-y-3">
                    <CommandItem cmd="setup-ticket" desc="Create ticket interface" />
                    <CommandItem cmd="rank" desc="Check your level & XP" />
                    <CommandItem cmd="top" desc="View leaderboard" />
                    <CommandItem cmd="id [@user]" desc="View profile card" />
                    <CommandItem cmd="nick [@user] [name]" desc="Change nickname" />
                    <CommandItem cmd="clear <amount>" desc="Purge messages" />
                    <CommandItem cmd="bonus" desc="Check XP bonuses" />
                    <CommandItem cmd="rewards" desc="View level rewards" />
                    <CommandItem cmd="ping" desc="Check bot latency" />
                    <CommandItem cmd="reset-server" desc="Reset server (Owner Only)" />
                    <CommandItem cmd="setxp <user> <xp>" desc="Set user XP (Admin)" />
                    <CommandItem cmd="set-reward <lvl> <role>" desc="Set reward (Admin)" />
                    <CommandItem cmd="set-level-channel <#ch>" desc="Set level channel (Admin)" />
                  </div>
                </section>

                <section className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                  <h3 className="text-blue-500 font-bold mb-2">Pro Tip</h3>
                  <p className="text-sm text-blue-500/80 leading-relaxed">
                    Use the <code className="bg-blue-500/20 px-1 rounded text-blue-400">setup-ticket</code> command in an admin channel to create a permanent ticket opening interface for your users.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}

        {activeTab === 'Protection' && (
          <section className="max-w-4xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Protection System</h2>
                <p className="text-zinc-500">Advanced security modules inspired by ProBot technology.</p>
              </div>
              <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                <Lock size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProtectionCard 
                icon={<ShieldCheck className="text-blue-500" />}
                title="Anti-Link"
                description="Automatically removes unauthorized links from your server."
                enabled={protection?.antiLink === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiLink: protection.antiLink === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
              <ProtectionCard 
                icon={<Activity className="text-blue-500" />}
                title="Anti-Spam"
                description="Detects and stops rapid message spamming."
                enabled={protection?.antiSpam === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiSpam: protection.antiSpam === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
              <ProtectionCard 
                icon={<Lock className="text-red-500" />}
                title="Anti-Raid"
                description="Prevents mass-join attacks by locking the server."
                enabled={protection?.antiRaid === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiRaid: protection.antiRaid === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
              <ProtectionCard 
                icon={<Bot className="text-purple-500" />}
                title="Anti-Bot"
                description="Automatically kicks unauthorized bots that join the server."
                enabled={protection?.antiBot === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiBot: protection.antiBot === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
              <ProtectionCard 
                icon={<Layout className="text-orange-500" />}
                title="Anti-Channel-Control"
                description="Prevents bots from creating, deleting, or modifying channels."
                enabled={protection?.antiChannelControl === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiChannelControl: protection.antiChannelControl === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
              <ProtectionCard 
                icon={<ShieldCheck className="text-pink-500" />}
                title="Anti-Role-Control"
                description="Prevents bots from creating, deleting, or modifying roles."
                enabled={protection?.antiRoleControl === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiRoleControl: protection.antiRoleControl === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
              <ProtectionCard 
                icon={<Shield className="text-yellow-500" />}
                title="Anti-Nuke (Audit Log)"
                description="Monitors audit log for mass deletions/kicks and punishes perpetrators."
                enabled={protection?.antiNuke === 1}
                onToggle={async () => {
                  await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...protection, antiNuke: protection.antiNuke === 1 ? 0 : 1 })
                  });
                  fetchProtection(selectedGuildId);
                }}
              />
            </div>

            {protection?.antiNuke === 1 && (
              <div className="mt-6 p-6 bg-[#0d0d0d] border border-white/5 rounded-2xl">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-yellow-500" />
                  Anti-Nuke Threshold
                </h4>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={protection?.nukeLimit || 3}
                    onChange={async (e) => {
                      const limit = parseInt(e.target.value);
                      await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...protection, nukeLimit: limit })
                      });
                      fetchProtection(selectedGuildId);
                    }}
                    className="flex-1 h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                  <span className="text-white font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    {protection?.nukeLimit || 3} Actions
                  </span>
                </div>
                <p className="text-zinc-500 text-xs mt-4 italic">
                  * If a user performs this many sensitive actions (Delete Channel/Role, Kick/Ban) within 60 seconds, their roles will be removed.
                </p>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Zap size={18} className="text-red-500" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">Counter-Nuke (Revenge Mode)</h4>
                        <p className="text-zinc-500 text-xs">Automatically bans the user from all shared servers and destroys their servers if they are an admin.</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...protection, counterNuke: protection.counterNuke === 1 ? 0 : 1 })
                        });
                        fetchProtection(selectedGuildId);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        protection?.counterNuke === 1 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {protection?.counterNuke === 1 ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Whitelisted Bots */}
              <div className="p-6 bg-[#0d0d0d] border border-white/5 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-blue-500" />
                  Whitelisted Bots
                </h3>
                <p className="text-zinc-500 text-sm mb-6">Bots listed here bypass all protection modules.</p>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Bot ID (e.g. 123456789...)"
                      value={newBotId}
                      onChange={(e) => setNewBotId(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500/50 transition-all font-mono text-sm"
                    />
                    <button 
                      onClick={async () => {
                        if (!newBotId) return;
                        await fetch(`/api/guilds/${selectedGuildId}/whitelisted-bots`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ botId: newBotId })
                        });
                        setNewBotId('');
                        const botsRes = await fetch(`/api/guilds/${selectedGuildId}/whitelisted-bots`);
                        if (botsRes.ok) setWhitelistedBots(await botsRes.json());
                      }}
                      className="px-4 py-2 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-all"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {whitelistedBots.map(bot => (
                      <div key={bot.botId} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group">
                        <code className="text-xs text-blue-400">{bot.botId}</code>
                        <button 
                          onClick={async () => {
                            await fetch(`/api/guilds/${selectedGuildId}/whitelisted-bots/${bot.botId}`, {
                              method: 'DELETE'
                            });
                            const botsRes = await fetch(`/api/guilds/${selectedGuildId}/whitelisted-bots`);
                            if (botsRes.ok) setWhitelistedBots(await botsRes.json());
                          }}
                          className="text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {whitelistedBots.length === 0 && (
                      <p className="text-center py-4 text-zinc-600 text-xs italic">No bots whitelisted yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Protection Logs Settings */}
              <div className="p-6 bg-[#0d0d0d] border border-white/5 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare size={20} className="text-blue-500" />
                  Protection Logs
                </h3>
                <p className="text-zinc-500 text-sm mb-6">Select a channel where protection events (deletions, kicks) will be logged.</p>
                
                <div className="space-y-4">
                  <select 
                    value={protection?.logChannel || ''}
                    onChange={async (e) => {
                      const newLogChannel = e.target.value || null;
                      await fetch(`/api/guilds/${selectedGuildId}/protection`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ...protection, logChannel: newLogChannel })
                      });
                      fetchProtection(selectedGuildId);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="">Select Channel</option>
                    {channels.map(channel => (
                      <option key={channel.id} value={channel.id}>#{channel.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-600 font-mono italic">Recommended: #bot-logs</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Backups' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Database size={24} className="text-blue-500" />
                    Server Backups
                  </h3>
                  <p className="text-zinc-500 text-sm">Create and restore snapshots of your server's roles and channels.</p>
                </div>
                <button 
                  disabled={isBackingUp}
                  onClick={async () => {
                    setIsBackingUp(true);
                    const res = await fetch(`/api/guilds/${selectedGuildId}/backups`, { method: 'POST' });
                    if (res.ok) {
                      const backupsRes = await fetch(`/api/guilds/${selectedGuildId}/backups`);
                      if (backupsRes.ok) setBackups(await backupsRes.json());
                    }
                    setIsBackingUp(false);
                  }}
                  className={`px-6 py-3 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-all flex items-center gap-2 ${isBackingUp ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus size={18} />
                  {isBackingUp ? 'Creating Backup...' : 'Create New Backup'}
                </button>
              </div>

              <div className="space-y-4">
                {backups.map(backup => (
                  <div key={backup.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                        <Database size={24} />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{backup.name}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-2">
                          <Clock size={12} />
                          {new Date(backup.createdAt).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        disabled={isRestoring !== null}
                        onClick={async () => {
                          if (!confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم إنشاء الرتب والرومات من جديد.')) return;
                          setIsRestoring(backup.id);
                          const res = await fetch(`/api/guilds/${selectedGuildId}/backups/${backup.id}/restore`, { method: 'POST' });
                          if (res.ok) {
                            alert('تمت استعادة النسخة بنجاح!');
                          }
                          setIsRestoring(null);
                        }}
                        className={`px-4 py-2 bg-zinc-800 text-white text-sm font-bold rounded-lg hover:bg-zinc-700 transition-all flex items-center gap-2 ${isRestoring === backup.id ? 'opacity-50' : ''}`}
                      >
                        <RefreshCw size={14} className={isRestoring === backup.id ? 'animate-spin' : ''} />
                        {isRestoring === backup.id ? 'Restoring...' : 'Restore'}
                      </button>
                      
                      <button 
                        onClick={async () => {
                          if (!confirm('هل أنت متأكد من حذف هذه النسخة؟')) return;
                          const res = await fetch(`/api/guilds/${selectedGuildId}/backups/${backup.id}`, { method: 'DELETE' });
                          if (res.ok) {
                            setBackups(backups.filter(b => b.id !== backup.id));
                          }
                        }}
                        className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {backups.length === 0 && (
                  <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database size={32} className="text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 italic">No backups found. Create your first snapshot today!</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Logging' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Terminal size={24} className="text-blue-500" />
                    Logging System
                  </h3>
                  <p className="text-zinc-500 text-sm">Monitor all server activities in a dedicated channel.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Log Channel</label>
                  <select 
                    value={logging?.channelId || ''}
                    onChange={async (e) => {
                      const newLogging = { ...logging, channelId: e.target.value || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="">Disabled</option>
                    {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <LoggingChannelSelect 
                    label="Message Deletions" 
                    value={logging?.logMessageDelete} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logMessageDelete: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Message Edits" 
                    value={logging?.logMessageEdit} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logMessageEdit: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Member Joins" 
                    value={logging?.logMemberJoin} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logMemberJoin: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Member Leaves" 
                    value={logging?.logMemberLeave} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logMemberLeave: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Role Updates" 
                    value={logging?.logRoleUpdate} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logRoleUpdate: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Channel Updates" 
                    value={logging?.logChannelUpdate} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logChannelUpdate: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Voice State" 
                    value={logging?.logVoiceState} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logVoiceState: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Command Usage" 
                    value={logging?.logCommandUsage} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logCommandUsage: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Level Ups" 
                    value={logging?.logLevelUp} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logLevelUp: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Protection Events" 
                    value={logging?.logProtectionEvents} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logProtectionEvents: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Bot Additions" 
                    value={logging?.logBotAdd} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logBotAdd: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Role Created" 
                    value={logging?.logRoleCreate} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logRoleCreate: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Role Deleted" 
                    value={logging?.logRoleDelete} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logRoleDelete: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Channel Created" 
                    value={logging?.logChannelCreate} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logChannelCreate: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Channel Deleted" 
                    value={logging?.logChannelDelete} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logChannelDelete: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Member Banned" 
                    value={logging?.logMemberBan} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logMemberBan: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Member Unbanned" 
                    value={logging?.logMemberUnban} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logMemberUnban: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                  <LoggingChannelSelect 
                    label="Nickname Changes" 
                    value={logging?.logNicknameChange} 
                    channels={channels}
                    onChange={async (val) => {
                      const newLogging = { ...logging, logNicknameChange: val || null };
                      await fetch(`/api/guilds/${selectedGuildId}/logging`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLogging)
                      });
                      setLogging(newLogging);
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Welcome' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <MessageSquare size={24} className="text-blue-500" />
                Welcome System
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Welcome Channel</label>
                  <select 
                    value={welcome?.channelId || ''}
                    onChange={async (e) => {
                      await fetch(`/api/guilds/${selectedGuildId}/welcome`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...welcome, channelId: e.target.value || null })
                      });
                      fetchGuildSettings(selectedGuildId);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="">Disabled</option>
                    {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Welcome Message</label>
                  <textarea 
                    value={welcome?.message || ''}
                    onChange={(e) => setWelcome({ ...welcome, message: e.target.value })}
                    onBlur={async () => {
                      await fetch(`/api/guilds/${selectedGuildId}/welcome`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(welcome)
                      });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all min-h-[100px]"
                    placeholder="Welcome {user} to {server}!"
                  />
                  <p className="text-[10px] text-zinc-600 mt-2 font-mono uppercase tracking-widest">
                    Placeholders: {'{user}'}, {'{user_tag}'}, {'{server}'}, {'{member_count}'}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5">
                  <div>
                    <p className="text-white font-medium">DM Welcome</p>
                    <p className="text-xs text-zinc-500">Send a private message to new members.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      const newDmEnabled = welcome?.dmEnabled === 1 ? 0 : 1;
                      await fetch(`/api/guilds/${selectedGuildId}/welcome`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...welcome, dmEnabled: newDmEnabled })
                      });
                      fetchGuildSettings(selectedGuildId);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${welcome?.dmEnabled === 1 ? 'bg-blue-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${welcome?.dmEnabled === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {welcome?.dmEnabled === 1 && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">DM Message</label>
                    <textarea 
                      value={welcome?.dmMessage || ''}
                      onChange={(e) => setWelcome({ ...welcome, dmMessage: e.target.value })}
                      onBlur={async () => {
                        await fetch(`/api/guilds/${selectedGuildId}/welcome`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(welcome)
                        });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Auto-Roles' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Users size={24} className="text-blue-500" />
                Auto-Roles
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Roles that will be automatically assigned to new members when they join.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {guildRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={async () => {
                      const newRoles = autoRoles.includes(role.id) 
                        ? autoRoles.filter(id => id !== role.id)
                        : [...autoRoles, role.id];
                      
                      await fetch(`/api/guilds/${selectedGuildId}/auto-roles`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roleIds: newRoles })
                      });
                      fetchGuildSettings(selectedGuildId);
                    }}
                    className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                      autoRoles.includes(role.id)
                        ? 'bg-blue-500/10 border-blue-500/50 text-white'
                        : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {autoRoles.includes(role.id) && <ShieldCheck size={16} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Auto-Mod' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Lock size={24} className="text-red-500" />
                Auto-Mod (Badwords)
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Messages containing these words will be automatically deleted.</p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <input 
                    type="text"
                    placeholder="Add a forbidden word..."
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        const word = input.value.trim();
                        if (word && !badwords.includes(word)) {
                          const newWords = [...badwords, word];
                          await fetch(`/api/guilds/${selectedGuildId}/badwords`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ words: newWords })
                          });
                          fetchGuildSettings(selectedGuildId);
                          input.value = '';
                        }
                      }
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500/50 transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {badwords.map(word => (
                    <div key={word} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                      <span>{word}</span>
                      <button 
                        onClick={async () => {
                          const newWords = badwords.filter(w => w !== word);
                          await fetch(`/api/guilds/${selectedGuildId}/badwords`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ words: newWords })
                          });
                          fetchGuildSettings(selectedGuildId);
                        }}
                        className="hover:text-white transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {badwords.length === 0 && (
                    <p className="text-zinc-600 italic text-sm">No forbidden words added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Aliases' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Terminal size={24} className="text-blue-500" />
                    Command Aliases
                  </h3>
                  <p className="text-zinc-500 text-sm">Create shortcuts for your most used commands.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Alias Form */}
                <div className="lg:col-span-1 space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <Plus size={18} className="text-blue-500" />
                    New Shortcut
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Alias Name</label>
                      <input 
                        type="text"
                        placeholder="e.g., r"
                        value={newAlias.name}
                        onChange={(e) => setNewAlias({ ...newAlias, name: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Original Command</label>
                      <select 
                        value={newAlias.original}
                        onChange={(e) => setNewAlias({ ...newAlias, original: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                      >
                        <option value="">Select Command</option>
                        <option value="rank">rank</option>
                        <option value="top">top</option>
                        <option value="ping">ping</option>
                        <option value="id">id</option>
                        <option value="bonus">bonus</option>
                        <option value="rewards">rewards</option>
                        <option value="nick">nick</option>
                        <option value="clear">clear</option>
                      </select>
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newAlias.name || !newAlias.original) return;
                        const res = await fetch(`/api/guilds/${selectedGuildId}/aliases`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ aliasName: newAlias.name, originalCommand: newAlias.original })
                        });
                        if (res.ok) {
                          fetchGuildSettings(selectedGuildId);
                          setNewAlias({ name: '', original: '' });
                        }
                      }}
                      className="w-full py-4 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Create Shortcut
                    </button>
                  </div>
                </div>

                {/* Aliases List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    <Terminal size={14} />
                    Active Shortcuts
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aliases.map(alias => (
                      <div key={alias.aliasName} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 font-mono font-bold">
                            {alias.aliasName}
                          </div>
                          <div>
                            <p className="text-white font-bold">{alias.aliasName}</p>
                            <p className="text-xs text-zinc-500">Runs <span className="text-blue-500/70">{alias.originalCommand}</span></p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            await fetch(`/api/guilds/${selectedGuildId}/aliases/${alias.aliasName}`, {
                              method: 'DELETE'
                            });
                            fetchGuildSettings(selectedGuildId);
                          }}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {aliases.length === 0 && (
                      <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-2xl">
                        <p className="text-zinc-600 italic">No shortcuts created yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Tickets' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Ticket size={24} className="text-blue-500" />
                    Ticket Categories
                  </h3>
                  <p className="text-zinc-500 text-sm">Define categories for support tickets and assign moderation roles.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Category Form */}
                <div className="lg:col-span-1 space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <Plus size={18} className="text-blue-500" />
                    New Category
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Category Name</label>
                      <input 
                        type="text"
                        placeholder="e.g., Technical Support"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Moderation Role</label>
                      <select 
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                      >
                        <option value="">Select Role</option>
                        {guildRoles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newCategoryName || !selectedRoleId) return;
                        const res = await fetch(`/api/guilds/${selectedGuildId}/ticket-categories`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ categoryName: newCategoryName, roleId: selectedRoleId })
                        });
                        if (res.ok) {
                          const categoriesRes = await fetch(`/api/guilds/${selectedGuildId}/ticket-categories`);
                          if (categoriesRes.ok) setTicketCategories(await categoriesRes.json());
                          setNewCategoryName('');
                          setSelectedRoleId('');
                        }
                      }}
                      className="w-full py-4 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Add Category
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticketCategories.map(category => (
                      <div key={category.categoryName} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 font-bold">
                            {category.categoryName[0]}
                          </div>
                          <div>
                            <p className="text-white font-bold">{category.categoryName}</p>
                            <p className="text-xs text-zinc-500">Role: <span className="text-blue-500/70">{guildRoles.find(r => r.id === category.roleId)?.name || 'Unknown Role'}</span></p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            await fetch(`/api/guilds/${selectedGuildId}/ticket-categories/${category.categoryName}`, {
                              method: 'DELETE'
                            });
                            const categoriesRes = await fetch(`/api/guilds/${selectedGuildId}/ticket-categories`);
                            if (categoriesRes.ok) setTicketCategories(await categoriesRes.json());
                          }}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {ticketCategories.length === 0 && (
                      <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-2xl">
                        <p className="text-zinc-600 italic">No ticket categories defined yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Roles' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Shield size={24} className="text-blue-500" />
                    Role Management
                  </h3>
                  <p className="text-zinc-500 text-sm">Create, edit and manage server roles and permissions.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <Plus size={18} className="text-blue-500" />
                    Create Role
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Role Name</label>
                      <input 
                        type="text"
                        placeholder="e.g., Moderator"
                        value={newRole.name}
                        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Role Color</label>
                      <input 
                        type="color"
                        value={newRole.color}
                        onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-2 py-1 cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newRole.name) return;
                        const res = await fetch(`/api/guilds/${selectedGuildId}/roles`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(newRole)
                        });
                        if (res.ok) {
                          const createdRole = await res.json();
                          setGuildRolesFull([...guildRolesFull, createdRole]);
                          setNewRole({ name: '', color: '#99AAB5' });
                        }
                      }}
                      className="w-full py-4 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Create Role
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    <input 
                      type="text"
                      placeholder="Search roles..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {guildRolesFull.sort((a, b) => b.position - a.position).map(role => (
                      <div key={role.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: role.color }} />
                          <div>
                            <p className="text-white font-bold">{role.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">ID: {role.id} • Pos: {role.position}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!role.managed && (
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
                                  const res = await fetch(`/api/guilds/${selectedGuildId}/roles/${role.id}`, {
                                    method: 'DELETE'
                                  });
                                  if (res.ok) {
                                    setGuildRolesFull(guildRolesFull.filter(r => r.id !== role.id));
                                  }
                                }
                              }}
                              className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          {role.managed && (
                            <span className="px-2 py-1 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded uppercase tracking-tighter">Managed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'AI Generator' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-[#0d0d0d] border border-white/5 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Activity className="text-black w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">AI Image Generator</h3>
                  <p className="text-zinc-500">Generate unique images using Gemini AI.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Image Prompt</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe the image you want to generate..."
                      className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <button
                      onClick={async () => {
                        if (!aiPrompt || isGenerating) return;
                        setIsGenerating(true);
                        try {
                          const res = await fetch('/api/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: aiPrompt })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setAiImageUrl(data.imageUrl);
                          }
                        } catch (e) {
                          console.error("Generation failed:", e);
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={isGenerating || !aiPrompt}
                      className="px-8 py-4 bg-blue-500 text-black font-bold rounded-2xl hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>

                {aiImageUrl && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square max-w-xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                  >
                    <img src={aiImageUrl} alt="Generated" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = aiImageUrl;
                          link.download = 'generated-image.png';
                          link.click();
                        }}
                        className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2"
                      >
                        <Download size={18} />
                        Download Image
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'Automation' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity size={40} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Keep Your Bot Alive</h3>
              <p className="text-zinc-400 max-w-md mx-auto mb-8">
                Use n8n or any uptime service to ping your bot's API endpoint every few minutes to ensure it stays active 24/7.
              </p>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 max-w-xl mx-auto text-left">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Your Ping Endpoint</label>
                <div className="flex gap-2">
                  <input 
                    readOnly
                    value={`${window.location.origin}/api/ping`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-blue-400 font-mono text-sm outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/ping`);
                      alert('Copied to clipboard!');
                    }}
                    className="px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                  >
                    Copy
                  </button>
                </div>
                
                <div className="mt-8 space-y-4">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    How to use with n8n:
                  </h4>
                  <ol className="text-sm text-zinc-500 space-y-3 list-decimal list-inside">
                    <li>Create a new workflow in <a href="https://n8n.io" target="_blank" className="text-blue-500 hover:underline">n8n</a>.</li>
                    <li>Add a <span className="text-zinc-300 font-bold">Schedule Trigger</span> (every 5 minutes).</li>
                    <li>Add an <span className="text-zinc-300 font-bold">HTTP Request</span> node.</li>
                    <li>Set the Method to <span className="text-zinc-300 font-bold">GET</span> and URL to your endpoint above.</li>
                    <li>Activate the workflow!</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Custom Lists' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <LayoutDashboard size={24} className="text-blue-500" />
                Custom Lists
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Create and manage custom lists of information for your server.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create List Form */}
                <div className="space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <Plus size={18} className="text-blue-500" />
                    Create New List
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">List Title</label>
                      <input 
                        type="text"
                        placeholder="e.g., Server Rules"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Content (One item per line)</label>
                      <textarea 
                        placeholder="Rule 1\nRule 2\nRule 3"
                        value={newListContent}
                        onChange={(e) => setNewListContent(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all min-h-[150px]"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newListName || !newListContent) return;
                        const content = newListContent.split('\n').filter(line => line.trim() !== '');
                        const res = await fetch(`/api/guilds/${selectedGuildId}/custom-lists`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: newListName, content })
                        });
                        if (res.ok) {
                          setNewListName('');
                          setNewListContent('');
                          const listsRes = await fetch(`/api/guilds/${selectedGuildId}/custom-lists`);
                          if (listsRes.ok) setCustomLists(await listsRes.json());
                        }
                      }}
                      className="w-full py-4 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Save List
                    </button>
                  </div>
                </div>

                {/* Existing Lists */}
                <div className="space-y-4">
                  {customLists.map(list => (
                    <div key={list.id} className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 group">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold">{list.title}</h4>
                        <button 
                          onClick={async () => {
                            const res = await fetch(`/api/guilds/${selectedGuildId}/custom-lists/${list.id}`, {
                              method: 'DELETE'
                            });
                            if (res.ok) {
                              const listsRes = await fetch(`/api/guilds/${selectedGuildId}/custom-lists`);
                              if (listsRes.ok) setCustomLists(await listsRes.json());
                            }
                          }}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {list.content.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {customLists.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-zinc-500">No custom lists created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer / Copyright */}
        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <div className="flex items-center justify-center gap-3 mb-6 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="text-black w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Requiem <span className="text-blue-500">Bot</span></span>
          </div>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">
            © 2026 Requiem Bot • All Rights Reserved
          </p>
          <div className="flex items-center justify-center gap-6 text-[10px] text-zinc-700 font-medium uppercase tracking-widest">
            <a href="#" className="hover:text-blue-500 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Developer API</a>
          </div>
          <p className="mt-8 text-zinc-800 text-[9px] font-mono">
            Powered by Requiem Core Engine • v2.4.0-stable
          </p>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
        : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, trend }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d0d0d] border border-white/5 p-6 rounded-2xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/5 rounded-lg">
          {icon}
        </div>
        <span className="text-sm text-zinc-500 font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">{trend}</span>
      </div>
    </motion.div>
  );
}

function CommandItem({ cmd, desc }) {
  return (
    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5 flex items-center justify-between">
      <code className="text-blue-400 text-sm">{cmd}</code>
      <span className="text-xs text-zinc-500">{desc}</span>
    </div>
  );
}

function ProtectionCard({ icon, title, description, enabled, onToggle }) {
  return (
    <div className="p-6 bg-[#0d0d0d] border border-white/5 rounded-2xl hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/5 rounded-xl">
          {icon}
        </div>
        <button 
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <h3 className="text-white font-bold mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function LoggingChannelSelect({ label, value, channels, onChange }) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/30 transition-all">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50 transition-all"
      >
        <option value="">Disabled (Use Global)</option>
        <option value="0">❌ Fully Disabled</option>
        {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
      </select>
    </div>
  );
}

function LoggingToggle({ label, enabled, onToggle }) {
  return (
    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-all">
      <span className="text-zinc-300 font-medium">{label}</span>
      <button 
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
