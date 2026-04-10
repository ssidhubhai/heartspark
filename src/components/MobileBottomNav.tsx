import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, MessageCircle, Bot, Users, LayoutGrid, User } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';

export function MobileBottomNav() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isForcedHidden, setIsForcedHidden] = useState(false);

  // Check if we are on a route where the nav should be completely hidden
  const isHiddenRoute = 
    location.pathname.startsWith('/analyzer') || 
    location.pathname.startsWith('/love-gpt') || 
    location.pathname.startsWith('/astrology') || 
    (location.pathname.startsWith('/tools/') && location.pathname !== '/tools');

  // Check if we are on a route where the nav should auto-hide on scroll
  const isAutoHideRoute = 
    location.pathname === '/' || 
    location.pathname.startsWith('/stories');

  useEffect(() => {
    const checkForcedHidden = () => {
      setIsForcedHidden(document.body.classList.contains('hide-mobile-nav'));
    };

    // Initial check
    checkForcedHidden();

    // Listen for class changes on body
    const observer = new MutationObserver(checkForcedHidden);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isAutoHideRoute) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show at the very top
      if (currentScrollY < 20) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isAutoHideRoute]);

  const navItems = [
    { name: 'Calculator', path: '/', icon: <Heart className="w-5 h-5 fill-current" /> },
    { name: 'Social', path: '/stories', icon: <Users className="w-5 h-5 fill-current" /> },
    { name: 'Messages', path: '/messages', icon: <MessageCircle className="w-5 h-5 fill-current" /> },
    { name: 'Explore', path: '/tools', icon: <LayoutGrid className="w-5 h-5 fill-current" /> },
    { name: 'Profile', path: '/profile', icon: <User className="w-5 h-5 fill-current" /> },
  ];

  if (isForcedHidden || isHiddenRoute) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-pink-100 dark:border-zinc-800 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
