import { ReactNode } from 'react';
import { ParticleBackground } from './ParticleBackground';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X, Share2, Moon, Sun, LogIn, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const { user, login, logout, isConfigured } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'LoveGPT', path: '/love-gpt' },
    { name: 'Astrology', path: '/astrology' },
    { name: 'Games', path: '/games' },
    { name: 'Quizzes', path: '/quiz' },
  ];

  const moreLinks = [
    { name: 'Stories', path: '/stories' },
    { name: 'Calculator', path: '/calculator' },
    { name: 'Confessions', path: '/confessions' },
    { name: 'Text Analyzer', path: '/analyzer' },
    { name: 'Secret Link', path: '/secret' },
  ];

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HeartSpark - AI Love & Relationship Coach',
          text: 'Check out HeartSpark! It has an AI Astrologer, LoveGPT, couple games, and fun crush quizzes. Discover your true love destiny today!',
          url: window.location.origin,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      isDarkMode ? "bg-slate-900 text-white" : "bg-pink-50 text-slate-900"
    )}>
      <ParticleBackground />
      
      {/* Navbar */}
      <nav className={cn(
        "sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300",
        isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-pink-100"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                </motion.div>
                <span className="font-bold text-2xl bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  HeartSpark
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-medium transition-all hover:bg-pink-100 hover:text-pink-600",
                    location.pathname === link.path && "bg-pink-100 text-pink-600 shadow-sm",
                    isDarkMode && "hover:bg-slate-800 hover:text-pink-400",
                    isDarkMode && location.pathname === link.path && "bg-slate-800 text-pink-400 shadow-sm"
                  )}
                >
                  {link.name}
                </Link>
              ))}

              {/* More Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-medium transition-all hover:bg-pink-100 hover:text-pink-600 flex items-center gap-1",
                    isDarkMode && "hover:bg-slate-800 hover:text-pink-400"
                  )}
                >
                  More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                <AnimatePresence>
                  {isMoreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={cn(
                        "absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-2 border backdrop-blur-xl z-50",
                        isDarkMode ? "bg-slate-800/90 border-slate-700" : "bg-white/90 border-pink-100"
                      )}
                    >
                      {moreLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setIsMoreOpen(false)}
                          className={cn(
                            "block px-4 py-2 text-sm transition-colors",
                            location.pathname === link.path ? "text-pink-600 bg-pink-50 dark:bg-slate-700 dark:text-pink-400" : "text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700"
                          )}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {isConfigured && (
                <div className="flex items-center ml-2 border-l pl-2 border-slate-200 dark:border-slate-700">
                  {user ? (
                    <>
                      <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-slate-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                          </div>
                        )}
                        <span className="hidden lg:inline">Profile</span>
                      </Link>
                      <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all">
                        <LogOut className="w-4 h-4" />
                        <span className="hidden lg:inline">Logout</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={login} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-pink-500 text-white hover:bg-pink-600 transition-all">
                      <LogIn className="w-4 h-4" />
                      <span className="hidden lg:inline">Login</span>
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5 text-pink-500" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-slate-800 focus:outline-none"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-white dark:bg-slate-900 border-b border-pink-100 dark:border-slate-800"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {[...navLinks, ...moreLinks].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium hover:bg-pink-50 dark:hover:bg-slate-800",
                      location.pathname === link.path ? "text-pink-600 bg-pink-50 dark:bg-slate-800 dark:text-pink-400" : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
                <button
                  onClick={handleShare}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Share App
                </button>
                {isConfigured && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                    {user ? (
                      <>
                        <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 flex items-center gap-2">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full" />
                          ) : (
                            <User className="w-5 h-5 text-pink-500" />
                          )}
                          Profile
                        </Link>
                        <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 flex items-center gap-2">
                          <LogOut className="w-5 h-5" /> Logout
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { login(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-pink-600 hover:bg-pink-50 dark:hover:bg-slate-800 flex items-center gap-2">
                        <LogIn className="w-5 h-5" /> Login
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={cn(
        "py-8 border-t transition-colors duration-300 text-center",
        isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-pink-200 bg-white/50"
      )}>
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
          Made with <Heart className="w-4 h-4 text-pink-500 fill-pink-500" /> for lovers and dreamers
        </p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} HeartSpark. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
