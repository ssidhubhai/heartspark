import { ReactNode, Children } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../utils/cn';
import { Sparkles } from 'lucide-react';

interface CardProps extends HTMLMotionProps<"div"> {
  children?: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className, hoverEffect = true, ...props }: CardProps) {
  // Check if children are truly empty (handles null, undefined, false, empty string, or empty arrays)
  const isEmpty = !children || Children.toArray(children).every(child => 
    child === null || child === undefined || child === false as any || child === ''
  );

  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, scale: 1.015 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
        "bg-white/80 dark:bg-black/40 backdrop-blur-xl",
        "border border-pink-100 dark:border-pink-500/20",
        // Background pattern dependent on theme
        "bg-gradient-to-br from-transparent to-pink-50/50 dark:to-pink-900/10",
        hoverEffect && "hover:border-pink-300 dark:hover:border-pink-500/40 hover:shadow-2xl hover:shadow-pink-500/10 dark:hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]",
        "shadow-xl shadow-pink-500/5 dark:shadow-[0_0_20px_rgba(0,0,0,0.5)]",
        className
      )}
      {...props}
    >
      {/* Subtle background static glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.03),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.08),transparent_50%)] pointer-events-none" />

      {/* Conditional inner glow on hover */}
      {hoverEffect && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 dark:from-pink-500/10 dark:to-purple-500/10 pointer-events-none" />
      )}
      
      <div className="relative z-10 h-full flex flex-col justify-center">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full min-h-[120px] opacity-30">
            <Sparkles className="w-8 h-8 text-pink-500" />
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}
