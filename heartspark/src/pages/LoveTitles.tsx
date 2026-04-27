import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Wand2, RefreshCw, Share2, Download, Sparkles } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';

import { LoadingOverlay } from '../components/LoadingOverlay';

export function LoveTitles() {
  const [name, setName] = useState('');
  const [trait, setTrait] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsGenerating(true);
    setTitle('');

    try {
      const prompt = `You are Heart Spark, a playful and slightly dramatic romantic title generator.
      Generate a funny, slightly dramatic, and highly specific "official romantic title" for someone named ${name}.
      ${trait ? `Their main personality trait or habit is: ${trait}.` : 'Make it completely random.'}
      The title should be formatted like "Chief Flirting Officer" or "Certified Overthinker of Texts".
      Keep it under 6 words. Do not include any other text, just the title.`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const result = response.text || "Certified Mystery";
      setTitle(result.replace(/["']/g, '').trim());
    } catch (error) {
      console.error("Failed to generate title:", error);
      setTitle("Certified Mystery");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const text = `My official love title is: "${title}"! Get yours at Heart Spark!`;
    await shareAsImage('title-result', 'Love Title', text);
  };

  const handleDownload = () => {
    downloadAsImage('title-result', 'love-title');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <LoadingOverlay isVisible={isGenerating} type="calculator" />
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Funny Love Titles <Wand2 className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Discover your official romantic title based on your unique vibe.
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-6">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Jordan"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">A quirky trait or habit (Optional)</label>
              <input
                type="text"
                value={trait}
                onChange={(e) => setTrait(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Replies 3 business days later"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            variant="custom"
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
            disabled={isGenerating || !name}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                ✨ Crafting your title...
              </span>
            ) : (
              "Generate My Title 👑"
            )}
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {title && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
          >
            <div id="title-result" className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-950 border-8 border-double border-pink-200 dark:border-pink-900/50 shadow-2xl p-8 md:p-12 text-center">
              {/* Certificate Background Elements */}
              <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-grid-pink"></div>
              </div>
              <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-pink-500/30 rounded-tl-xl"></div>
              <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-pink-500/30 rounded-tr-xl"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-pink-500/30 rounded-bl-xl"></div>
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-pink-500/30 rounded-br-xl"></div>

              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pink-50 dark:bg-pink-900/20 border-4 border-pink-100 dark:border-pink-900/40 mb-4 shadow-inner">
                    <Wand2 className="w-10 h-10 text-pink-500" />
                  </div>
                  <h2 className="text-xs font-black text-pink-500 uppercase tracking-[0.4em]">Official Certification</h2>
                </div>

                <div className="space-y-4">
                  <p className="text-zinc-500 dark:text-zinc-400 font-serif italic text-lg">This document hereby confirms that</p>
                  <h3 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
                    {name}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-serif italic text-lg">is officially designated as the</p>
                </div>
                
                <div className="py-10 px-6 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-3xl border-2 border-pink-100 dark:border-pink-900/30 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
                  <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 leading-tight">
                    {title}
                  </p>
                </div>

                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Date Issued</p>
                    <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-4 border-pink-500/20 flex items-center justify-center relative">
                      <Sparkles className="w-8 h-8 text-pink-500/40" />
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-pink-500/20 animate-spin-slow"></div>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">HeartSpark Seal</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Authorized By</p>
                    <p className="text-sm font-bold text-pink-500 font-serif italic">Heart Spark AI</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8" data-html2canvas-ignore>
              <Button variant="outline" onClick={() => setTitle('')} className="rounded-2xl h-12 px-6 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                <RefreshCw className="w-4 h-4 mr-2" /> New Title
              </Button>
              <Button variant="custom" onClick={handleShare} className="rounded-2xl h-12 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 border-none shadow-lg transition-all">
                <Share2 className="w-4 h-4 mr-2" /> Share Certificate
              </Button>
              <Button variant="outline" onClick={handleDownload} className="rounded-2xl h-12 px-6 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
