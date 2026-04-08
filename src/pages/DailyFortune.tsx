import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Flame, RefreshCw, Share2, Sparkles, Download, Star } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback, safeParseJSON } from '../utils/ai';

import { LoadingOverlay } from '../components/LoadingOverlay';

export function DailyFortune() {
  const [fortune, setFortune] = useState('');
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);

  const handleReveal = async () => {
    setIsRevealing(true);
    setFortune('');
    setLuckyNumbers([]);

    try {
      const prompt = `You are Heart Spark, a mystical fortune teller.
      Generate a short, poetic, and slightly mysterious daily love fortune. 
      It should sound like it came from a mystical fortune cookie. 
      Keep it under 2 sentences. Make it uplifting but intriguing.
      Return ONLY a JSON object: {"fortune": "string", "luckyNumbers": [number, number, number]}`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const text = response.text || '';
      const parsed = safeParseJSON(text);
      setFortune(parsed.fortune || "The cosmic energies are shifting. Try cracking another cookie later.");
      setLuckyNumbers(parsed.luckyNumbers || [7, 11, 22]);
    } catch (error) {
      console.error("Failed to generate fortune:", error);
      setFortune("The cosmic energies are shifting. Try cracking another cookie later.");
      setLuckyNumbers([7, 11, 22]);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleShare = async () => {
    const text = `My Daily Love Fortune: "${fortune}" Get yours at Heart Spark!`;
    await shareAsImage('fortune-result', 'Daily Love Fortune', text);
  };

  const handleDownload = () => {
    downloadAsImage('fortune-result', 'daily-fortune');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <LoadingOverlay isVisible={isRevealing} type="fortune" />
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Daily Love Fortune <Sparkles className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Crack open your virtual fortune cookie and see what the universe has in store for your love life today.
        </p>
      </div>

      {!fortune && !isRevealing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-12"
        >
          <Button 
            onClick={handleReveal} 
            variant="custom"
            className="h-16 px-8 text-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] border-none transition-all hover:-translate-y-1 rounded-2xl"
          >
            <Star className="w-6 h-6 mr-2" /> Crack the Cookie 🥠
          </Button>
        </motion.div>
      )}

      {isRevealing && (
        <motion.div 
          className="flex flex-col items-center justify-center py-16 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-pink-500 blur-xl opacity-20 rounded-full"></div>
            <div className="w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 rounded-full flex items-center justify-center shadow-inner relative z-10 border border-pink-200 dark:border-pink-800">
              <Sparkles className="w-16 h-16 text-pink-500 animate-pulse" />
            </div>
          </motion.div>
          <p className="text-lg font-medium text-pink-600 dark:text-pink-400 animate-pulse">
            ✨ Reading the stars...
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {fortune && !isRevealing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: 90 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: -90 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <div id="fortune-result" className="relative overflow-hidden rounded-[2rem] bg-[#FFF9F0] dark:bg-zinc-950 border-4 border-amber-100 dark:border-amber-900/20 shadow-2xl p-8 md:p-12 text-center">
              {/* Paper Texture Effect */}
              <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200 dark:to-amber-900/40"></div>
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
                    <Star className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200 dark:to-amber-900/40"></div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.4em]">The Stars Say</h2>
                  <div className="relative py-10 px-6">
                    <span className="absolute top-0 left-0 text-7xl text-amber-200/40 dark:text-amber-900/20 font-serif">“</span>
                    <p className="text-2xl md:text-3xl font-medium text-zinc-800 dark:text-zinc-200 italic font-serif leading-relaxed relative z-10">
                      {fortune}
                    </p>
                    <span className="absolute bottom-0 right-0 text-7xl text-amber-200/40 dark:text-amber-900/20 font-serif">”</span>
                  </div>
                </div>

                <div className="pt-8 flex flex-col items-center gap-6 border-t border-amber-100 dark:border-amber-900/20">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Your Lucky Numbers</p>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex gap-3">
                    {luckyNumbers.map((num, i) => (
                      <div key={i} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-sm font-black text-amber-700 dark:text-amber-300 shadow-sm">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-4" data-html2canvas-ignore>
                  <Button variant="outline" onClick={handleReveal} className="rounded-2xl h-12 px-6 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all">
                    <RefreshCw className="w-4 h-4 mr-2" /> New Cookie
                  </Button>
                  <Button variant="custom" onClick={handleShare} className="rounded-2xl h-12 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 border-none shadow-lg transition-all">
                    <Share2 className="w-4 h-4 mr-2" /> Share Fortune
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
