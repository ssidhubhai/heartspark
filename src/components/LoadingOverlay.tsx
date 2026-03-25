import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "Analyzing your vibes..." }: LoadingOverlayProps) {
  const loadingMessages = [
    "Analyzing your vibes...",
    "Checking the stars...",
    "Calculating chemistry...",
    "Consulting the love oracle...",
    "Decoding emotional signals...",
    "Measuring heartbeats...",
    "Syncing your energies..."
  ];

  const [currentMessage, setCurrentMessage] = React.useState(message);

  React.useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setCurrentMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-xl"
        >
          <div className="relative">
            {/* Pulsing Outer Glow */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-pink-500/30 blur-3xl rounded-full"
            />
            
            {/* Central Heart */}
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-2xl shadow-pink-500/40"
            >
              <Heart className="w-12 h-12 text-white fill-current animate-pulse" />
            </motion.div>
            
            {/* Orbiting Sparkles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, delay: i * 0.4 }
                }}
                className="absolute top-1/2 left-1/2 w-4 h-4 text-yellow-400"
                style={{ 
                  marginTop: -8, 
                  marginLeft: -8,
                  transformOrigin: `${40 + i * 10}px ${40 + i * 10}px` 
                }}
              >
                <Sparkles className="w-full h-full fill-current" />
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-12 text-center"
          >
            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-tight">
              {currentMessage}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">This might take a few seconds...</p>
          </motion.div>
          
          {/* Progress Bar */}
          <div className="mt-8 w-64 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
