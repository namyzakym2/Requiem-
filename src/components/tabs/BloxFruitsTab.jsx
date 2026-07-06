import React, { useState, useEffect } from 'react';
import { Bot, RefreshCw, CheckCircle2, Clock, Activity } from 'lucide-react';
import axios from 'axios';

export default function BloxFruitsTab({ onSave, lang }) {
  const isAr = lang === 'ar';
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    axios.get('/api/blox/next-account')
      .then(res => {
        if (res.data) setRequests([res.data]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 border-l-4 border-l-indigo-500">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bot size={22} className="text-indigo-400" />
          <span>{isAr ? 'لوحة تحكم أوتوميشن Blox Fruits' : 'Blox Fruits Leveling Automation'}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {isAr ? 'متابعة حسابات وطابور التنعيم والتلفيل التلقائي لروبلوكس Blox Fruits' : 'Monitor Roblox accounts queue and automated leveling status.'}
        </p>
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-xs font-bold text-white">{isAr ? 'طابور الحسابات الحالي' : 'Current Account Queue'}</span>
          <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold rounded">Live Status</span>
        </div>

        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              {isAr ? 'لا توجد طلبات تلفيل نشطة حالياً' : 'No active leveling requests in queue.'}
            </div>
          ) : (
            requests.map((req, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{req.username || 'Roblox User'}</div>
                  <div className="text-[10px] text-zinc-400">Target Level: {req.targetLevel || 2550}</div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-bold">
                  {req.status || 'Processing'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
