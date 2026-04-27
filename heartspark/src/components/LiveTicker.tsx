import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Star, Zap } from 'lucide-react';

const activities = [
  { icon: <Heart className="w-3 h-3" />, text: "Someone in London just got a 98% Love Match!" },
  { icon: <Star className="w-3 h-3" />, text: "New 'Love Title' issued: 'The Eternal Simp' 💀" },
  { icon: <Zap className="w-3 h-3" />, text: "Astro Vibe check: Leo & Scorpio match is HEATING UP!" },
  { icon: <Sparkles className="w-3 h-3" />, text: "New story leaked: 'The Coffee Shop Betrayal' ☕" },
  { icon: <Heart className="w-3 h-3" />, text: "Compatibility Alert: 94% match in Mumbai!" },
  { icon: <Star className="w-3 h-3" />, text: "Someone just decoded a 'dry text' and it was actually flirting!" },
];

export function LiveTicker() {
  return (
    <div className="w-full bg-zinc-900 dark:bg-zinc-950 py-2 overflow-hidden border-y border-white/5 relative z-30">
      <div className="flex whitespace-nowrap animate-marquee">
        {[...activities, ...activities].map((activity, i) => (
          <div key={i} className="flex items-center gap-2 px-8">
            <span className="text-pink-500">{activity.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {activity.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
