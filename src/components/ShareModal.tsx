import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, MessageCircle, Instagram, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const url = window.location.origin;
  const text = "Check out HeartSpark, the ultimate AI relationship and astrology assistant! 💕";

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard! Share the love.');
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  };

  const handleInstagram = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied! You can now paste it in your Instagram story or bio.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-pink-100 dark:border-pink-900/30 p-6"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-pink-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-tr from-pink-100 to-purple-100 dark:from-pink-500/20 dark:to-purple-500/20 text-pink-600 dark:text-pink-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Share HeartSpark</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Spread the love with your friends</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-2">
              <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#25D366]/20">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">WhatsApp</span>
              </button>
              <button onClick={handleInstagram} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-[#E1306C]/10 text-[#E1306C] flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-[#F56040] group-hover:to-[#833AB4] group-hover:text-white transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#E1306C]/20">
                  <Instagram className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Instagram</span>
              </button>
              <button onClick={handleCopy} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-all group-hover:scale-110 group-hover:shadow-lg">
                  <Copy className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Copy Link</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
