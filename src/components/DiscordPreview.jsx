import React from 'react';
import { Bot, Hash, MessageSquare, Image as ImageIcon } from 'lucide-react';

export default function DiscordPreview({ 
  title, 
  description, 
  embedColor = '#8b5cf6', 
  imageUrl, 
  authorName = 'Server Bot', 
  authorAvatar,
  channelName = 'welcome',
  fields = []
}) {
  return (
    <div className="w-full rounded-2xl bg-[#313338] border border-[#2b2d31] p-4 text-zinc-100 shadow-2xl font-sans overflow-hidden">
      {/* Discord Channel Header */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#3f4147]/50 text-xs text-zinc-400 font-semibold">
        <Hash size={16} className="text-zinc-500" />
        <span>{channelName}</span>
        <span className="text-[10px] bg-[#2b2d31] px-2 py-0.5 rounded text-zinc-400 ml-auto">معاينة ديسكورد المباشرة</span>
      </div>

      {/* Message Row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold overflow-hidden shrink-0 border border-purple-500/30">
          {authorAvatar ? (
            <img src={authorAvatar} alt="bot" className="w-full h-full object-cover" />
          ) : (
            <Bot size={22} />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">{authorName}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-[#5865f2] text-white tracking-wider">
              BOT
            </span>
            <span className="text-[11px] text-zinc-400">اليوم الساعة 12:00 م</span>
          </div>

          {/* Text Message */}
          <p className="text-sm text-zinc-200 leading-relaxed font-normal">
            مرحباً بك في السيرفر! يسعدنا انضمامك إلينا.
          </p>

          {/* Embed Card */}
          <div 
            className="rounded-lg bg-[#2b2d31] p-3.5 border-l-4 space-y-2 shadow-sm"
            style={{ borderLeftColor: embedColor || '#8b5cf6' }}
          >
            {title && (
              <h4 className="font-bold text-sm text-white leading-snug">{title}</h4>
            )}
            
            {description && (
              <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{description}</p>
            )}

            {fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                {fields.map((f, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="text-[11px] font-bold text-zinc-400">{f.name}</div>
                    <div className="text-xs text-zinc-200">{f.value}</div>
                  </div>
                ))}
              </div>
            )}

            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-56">
                <img 
                  src={imageUrl} 
                  alt="embed media" 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
