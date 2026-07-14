import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, Download, Send } from 'lucide-react';
import axios from 'axios';

export default function AiTab({ onSave, lang }) {
  const isAr = lang === 'ar';
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/generate-image', { prompt: prompt.trim() });
      if (res.data?.imageUrl) {
        setGeneratedImg(res.data.imageUrl);
        onSave(isAr ? 'تم توليد الصورة بالذكاء الاصطناعي بنجاح!' : 'AI Image generated successfully!');
      }
    } catch (err) {
      onSave(isAr ? 'فشل توليد الصورة بالذكاء الاصطناعي' : 'Failed to generate image', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="pro-card p-6 border-l-4 border-l-purple-500">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles size={22} className="text-purple-400" />
          <span>{isAr ? 'مولد الصور المتقدم بالذكاء الاصطناعي' : 'AI Image Generator Engine'}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {isAr ? 'توليد أشكال وشعارات وصور احترافية باستخدام أحدث نماذج Gemini AI' : 'Generate studio-grade Discord icons, banners, and art with Gemini AI.'}
        </p>
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isAr ? 'صف الصورة التي تريد ابتكارها (مثال: شعار ديسكورد ذئب بنفسجي نيون)...' : 'Describe your vision...'}
            className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{loading ? (isAr ? 'جاري الابتكار...' : 'Generating...') : (isAr ? 'توليد الصورة' : 'Generate Art')}</span>
          </button>
        </div>

        {generatedImg && (
          <div className="pt-4 border-t border-white/5 flex flex-col items-center space-y-3">
            <div className="rounded-2xl overflow-hidden border border-purple-500/30 max-w-md shadow-2xl">
              <img src={generatedImg} alt="AI Generated" className="w-full h-auto" />
            </div>
            <a
              href={generatedImg}
              download="requiem-ai.png"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Download size={14} />
              <span>{isAr ? 'تحميل الصورة' : 'Download Image'}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
