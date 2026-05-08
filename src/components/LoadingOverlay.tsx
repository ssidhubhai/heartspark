import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Bot, Brain, Star, BookHeart } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  type?: 'default' | 'calculator' | 'astro' | 'analyzer' | 'fortune' | 'story';
}

export function LoadingOverlay({ isVisible, message, type = 'default' }: LoadingOverlayProps) {
  const themedContent = {
    default: {
      icon: <Heart className="w-12 h-12 text-white fill-current animate-pulse" />,
      color: "from-pink-400 to-purple-500",
      messages: ["Analyzing your vibes...", "Syncing your energies...", "Measuring heartbeats..."]
    },
    calculator: {
      icon: <Sparkles className="w-12 h-12 text-white animate-spin-slow" />,
      color: "from-rose-400 to-pink-600",
      messages: ["Calculating chemistry...", "Running love algorithms...", "Checking compatibility..."]
    },
    astro: {
      icon: <Bot className="w-12 h-12 text-white" />,
      color: "from-indigo-500 to-blue-600",
      messages: ["Consulting the stars...", "Reading birth charts...", "Aligning planets..."]
    },
    analyzer: {
      icon: <Brain className="w-12 h-12 text-white" />,
      color: "from-purple-500 to-indigo-600",
      messages: ["Decoding emotional signals...", "Analyzing subtext...", "Vibe checking..."]
    },
    fortune: {
      icon: <Star className="w-12 h-12 text-white" />,
      color: "from-amber-400 to-orange-500",
      messages: ["Gazing into the future...", "Unfolding your destiny...", "Peeking at tomorrow..."]
    },
    story: {
      icon: <BookHeart className="w-12 h-12 text-white" />,
      color: "from-pink-500 to-purple-600",
      messages: ["Writing your romance...", "Crafting your story...", "Imagining the plot..."]
    }
  };

  const currentTheme = themedContent[type] || themedContent.default;
  const [currentMessage, setCurrentMessage] = React.useState(message || currentTheme.messages[0]);

  React.useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setCurrentMessage(currentTheme.messages[Math.floor(Math.random() * currentTheme.messages.length)]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible, type]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl"
        >
          <div className="relative">
            {/* Pulsing Outer Glow */}
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className={`absolute inset-0 bg-gradient-to-br ${currentTheme.color} blur-3xl rounded-full`}
            />
            
            {/* Central Icon */}
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                y: [0, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`relative z-10 w-28 h-28 rounded-[2.5rem] bg-gradient-to-br ${currentTheme.color} flex items-center justify-center shadow-2xl shadow-pink-500/20`}
            >
              {currentTheme.icon}
            </motion.div>
            
            {/* Orbiting Elements */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  rotate: 360,
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.3, 0.7, 0.3]
                }}
                transition={{ 
                  rotate: { duration: 4 + i, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, delay: i * 0.3 }
                }}
                className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-white/40"
                style={{ 
                  marginTop: -6, 
                  marginLeft: -6,
                  transformOrigin: `${50 + i * 12}px ${50 + i * 12}px` 
                }}
              />
            ))}
          </div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-16 text-center px-6"
          >
            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 tracking-tight">
              {currentMessage}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-medium text-lg">Heart Spark is working its magic...</p>
          </motion.div>
          
          {/* Progress Bar */}
          <div className="mt-12 w-72 h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 8, ease: "easeInOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${currentTheme.color}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
