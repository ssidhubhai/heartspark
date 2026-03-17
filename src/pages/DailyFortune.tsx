import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Flame, RefreshCw, Share2, Sparkles, Download, Star } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';

export function DailyFortune() {
  const [fortune, setFortune] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);

  const handleReveal = async () => {
    setIsRevealing(true);
    setFortune('');

    try {
      const prompt = `You are Heart Spark, a mystical fortune teller.
      Generate a short, poetic, and slightly mysterious daily love fortune. 
      It should sound like it came from a mystical fortune cookie. 
      Keep it under 2 sentences. Make it uplifting but intriguing.`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setFortune(response.text || "The cosmic energies are shifting. Try cracking another cookie later.");
    } catch (error) {
      console.error("Failed to generate fortune:", error);
      setFortune("The cosmic energies are shifting. Try cracking another cookie later.");
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
            <Card id="fortune-result" className="text-center space-y-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 relative overflow-hidden p-8">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 mb-2 mt-4">
                <Flame className="w-8 h-8 text-pink-500" />
              </div>
              
              <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">
                Your Fortune
              </h2>
              
              <div className="relative py-8">
                <span className="absolute top-0 left-4 text-6xl text-pink-200 dark:text-pink-900/30 font-serif">"</span>
                <p className="text-2xl md:text-3xl font-medium text-zinc-800 dark:text-zinc-200 italic font-serif leading-relaxed px-8 relative z-10">
                  {fortune}
                </p>
                <span className="absolute bottom-0 right-4 text-6xl text-pink-200 dark:text-pink-900/30 font-serif">"</span>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-8 border-t border-pink-100 dark:border-zinc-800" data-html2canvas-ignore>
                <Button variant="outline" onClick={handleReveal} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
                  <RefreshCw className="w-4 h-4 mr-2" /> Another Cookie
                </Button>
                <Button onClick={handleShare} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
                  <Share2 className="w-4 h-4 mr-2" /> Share Fortune
                </Button>
                <Button variant="outline" onClick={handleDownload} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
