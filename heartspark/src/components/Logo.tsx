import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const containerSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-[2rem]'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  return (
    <div className={cn("flex items-center gap-2 group select-none", className)}>
      <div className={cn(
        "relative flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-sm",
        size === 'sm' ? 'w-8 h-8 rounded-full' : 
        size === 'md' ? 'w-9 h-9 rounded-full' : 
        size === 'lg' ? 'w-12 h-12 rounded-full' : 
        'w-16 h-16 rounded-full'
      )}>
        <Heart className={cn("fill-current text-white animate-blink", iconSizes[size])} />
      </div>

      {showText && (
        <div className={cn("flex items-center font-black tracking-tighter", textSizes[size])}>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D97] to-[#D946EF]">
            Heart
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D946EF] to-[#A855F7]">
            Spark
          </span>
        </div>
      )}
    </div>
  );
}
