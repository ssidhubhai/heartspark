import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from './Card';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  color: string;
}

interface ToolCarouselProps {
  features: Feature[];
}

export function ToolCarousel({ features }: ToolCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-8">
      <div className="overflow-hidden relative h-[450px] sm:h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0"
          >
            <Link to={features[currentIndex].path} className="block h-full group">
              <Card className={`h-full flex flex-col md:flex-row items-center gap-8 p-8 sm:p-12 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-3xl border border-pink-100/80 dark:border-white/5 rounded-[3rem] overflow-hidden hover:shadow-2xl transition-all duration-500`}>
                <div className={`absolute -right-16 -top-16 w-64 h-64 bg-gradient-to-br ${features[currentIndex].color} opacity-10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700`} />
                
                <div className={`w-32 h-32 sm:w-48 sm:h-48 rounded-[2.5rem] bg-gradient-to-br ${features[currentIndex].color} flex items-center justify-center shrink-0 shadow-2xl shadow-pink-500/20 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-500`}>
                  <div className="bg-white/20 backdrop-blur-sm p-6 rounded-3xl">
                    {React.cloneElement(features[currentIndex].icon as React.ReactElement<{ className?: string }>, { className: "w-16 h-16 sm:w-24 sm:h-24 text-white" })}
                  </div>
                </div>

                <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
                  {features[currentIndex].badge && (
                    <span className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-lg">
                      {features[currentIndex].badge}
                    </span>
                  )}
                  <h3 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    {features[currentIndex].title}
                  </h3>
                  <p className="text-xl text-slate-500 dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                    {features[currentIndex].description}
                  </p>
                  <div className="pt-4">
                    <div className="inline-flex items-center gap-3 text-pink-500 font-black text-lg group-hover:gap-5 transition-all">
                      Launch Tool <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center items-center gap-6 mt-12">
        <button
          onClick={prev}
          className="p-4 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-pink-500 hover:border-pink-500/50 transition-all shadow-lg active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex gap-2">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'w-12 bg-pink-500' : 'w-2 bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-4 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-pink-500 hover:border-pink-500/50 transition-all shadow-lg active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
