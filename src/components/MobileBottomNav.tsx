import { Link, useLocation } from 'react-router-dom';
import { Heart, MessageCircleHeart, Bot, BookHeart } from 'lucide-react';
import { cn } from '../utils/cn';

export function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { name: 'Calculator', path: '/', icon: <Heart className="w-5 h-5" /> },
    { name: 'Analyzer', path: '/analyzer', icon: <MessageCircleHeart className="w-5 h-5" /> },
    { name: 'Astro', path: '/astrology', icon: <Bot className="w-5 h-5" /> },
    { name: 'Stories', path: '/stories', icon: <BookHeart className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-pink-100 dark:border-zinc-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200",
                isActive 
                  ? "text-pink-600 dark:text-pink-400" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-pink-500 dark:hover:text-pink-300"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-300",
                isActive ? "bg-pink-100 dark:bg-pink-500/20 scale-110" : "bg-transparent"
              )}>
                {item.icon}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive ? "font-bold" : ""
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
