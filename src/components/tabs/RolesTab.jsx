import React, { useState, useEffect } from 'react';
import { Shield, Users, Plus, Trash2, Check } from 'lucide-react';
import axios from 'axios';

export default function RolesTab({ guild, onSave, lang }) {
  const isAr = lang === 'ar';
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (guild?.id) {
      axios.get(`/api/guilds/${guild.id}/roles`)
        .then(res => {
          if (Array.isArray(res.data)) setRoles(res.data);
        })
        .catch(() => {});
    }
  }, [guild?.id]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 border-l-4 border-l-purple-500">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield size={22} className="text-purple-400" />
          <span>{isAr ? 'رتب السيرفر والصلاحيات' : 'Server Roles & Permissions'}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {isAr ? 'عرض وتنسيق رتب السيرفر المسجلة في البوت' : 'Manage and view server roles.'}
        </p>
      </div>

      <div className="pro-card p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {roles.length === 0 ? (
            <div className="col-span-full text-center py-8 text-xs text-zinc-500">
              {isAr ? 'لم يتم العثور على رتب بالسيرفر' : 'No roles found.'}
            </div>
          ) : (
            roles.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-3">
                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: r.color ? `#${r.color.toString(16)}` : '#8b5cf6' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-white truncate">@{r.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">ID: {r.id}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
