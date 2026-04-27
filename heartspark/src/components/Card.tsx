import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../utils/cn';

interface CardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className, hoverEffect = true, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
        "bg-white/80 dark:bg-black/40 backdrop-blur-xl",
        "border border-pink-100 dark:border-pink-500/20 hover:border-pink-500/40",
        "shadow-xl shadow-pink-500/5 dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-2xl hover:shadow-pink-500/10 dark:hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]",
        className
      )}
      {...props}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5 pointer-events-none" />
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
