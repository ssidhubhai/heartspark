import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Flame, RefreshCw, Share2, Sparkles, Download } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';

const fortunes = [
  "A surprise message will make your heart skip a beat today.",
  "Someone you've been thinking about is thinking about you too.",
  "Your smile will catch someone's attention today. Keep shining!",
  "A small misunderstanding will turn into a cute moment.",
  "You will find courage where you least expect it. Take that chance!",
  "Love is closer than you think. Look around you.",
  "A random act of kindness will lead to a romantic spark.",
  "Today is a good day to be bold. Send that text!",
  "Patience is key. Good things are coming your way.",
  "Your charm is irresistible today. Use it wisely!"
];

export function DailyFortune() {
  const [fortune, setFortune] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);

  const handleReveal = () => {
    setIsRevealing(true);
    setFortune('');

    setTimeout(() => {
      let randomFortune = fortune;
      while (randomFortune === fortune || !randomFortune) {
        randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      }
      
      setFortune(randomFortune);
      setIsRevealing(false);
    }, 1500);
  };

  const handleShare = async () => {
    const text = `My Daily Love Fortune: "${fortune}" Get yours at HeartSpark!`;
    await shareAsImage('fortune-result', 'Daily Love Fortune', text);
  };

  const handleDownload = () => {
    downloadAsImage('fortune-result', 'daily-fortune');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Daily Love Fortune <Flame className="w-8 h-8 text-indigo-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Crack open your fortune cookie and see what the universe has in store for your love life today.
        </p>
      </div>

      {!fortune && !isRevealing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Button 
            onClick={handleReveal} 
            className="h-16 px-8 text-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg"
          >
            <Sparkles className="w-6 h-6 mr-2" /> Reveal My Fortune
          </Button>
        </motion.div>
      )}

      {isRevealing && (
        <motion.div 
          className="flex justify-center py-12"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-32 h-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shadow-inner">
            <Flame className="w-16 h-16 text-indigo-500 animate-pulse" />
          </div>
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
            <Card id="fortune-result" className="text-center space-y-6 bg-gradient-to-b from-white to-indigo-50 dark:from-zinc-900 dark:to-zinc-900 border-indigo-200 dark:border-zinc-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
              
              <div className="inline-block p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-2 mt-4">
                <Sparkles className="w-8 h-8 text-indigo-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-widest text-sm">
                Your Fortune
              </h2>
              
              <p className="text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-200 italic font-serif leading-relaxed px-4 py-6">
                "{fortune}"
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={handleReveal}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Another Cookie
                </Button>
                <Button onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Share Fortune
                </Button>
                <Button variant="outline" onClick={handleDownload}>
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
