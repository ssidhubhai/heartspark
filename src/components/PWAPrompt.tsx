import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { Button } from './Button';

export function PWAPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show after 5 seconds if not dismissed
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
    const timer = setTimeout(() => {
      if (!isDismissed) setShow(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-80"
        >
          <div className="bg-zinc-900 dark:bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            
            <button 
              onClick={dismiss}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-pink-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Install HeartSpark</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Add to your home screen for the full app experience.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Tap</span>
                <Share className="w-3 h-3" />
                <span>then</span>
                <PlusSquare className="w-3 h-3" />
                <span>"Add to Home Screen"</span>
              </div>
              <Button 
                variant="custom" 
                onClick={dismiss}
                className="w-full h-10 text-xs bg-white text-black hover:bg-zinc-200 border-none rounded-xl"
              >
                Got it!
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
