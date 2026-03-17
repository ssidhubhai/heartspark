import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X, Share2, Moon, Sun, LogIn, LogOut, User, Download, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { InstallPrompt } from './InstallPrompt';
import { NotificationBell } from './NotificationBell';
import { FloatingHearts } from './FloatingHearts';
import { ShareModal } from './ShareModal';

export function Layout({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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
    { name: 'AI Coach', path: '/love-gpt' },
    { name: 'Tools', path: '/tools' },
    { name: 'Games & Quizzes', path: '/games' },
  ];

  const moreLinks = [
    { name: 'Crush Message Analyzer', path: '/analyzer' },
    { name: 'Story Maker', path: '/tools/story' },
    { name: 'Community Stories', path: '/stories' },
  ];

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300 font-sans relative overflow-hidden",
      isDarkMode ? "bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 text-zinc-100" : "bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 text-zinc-900"
    )}>
      <FloatingHearts />
      <InstallPrompt />
      
      {/* Navbar */}
      <nav className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300",
        isDarkMode ? "bg-gray-950/80 border-gray-800" : "bg-white/60 border-pink-100"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] group-hover:shadow-[0_0_25px_rgba(236,72,153,0.8)] group-hover:scale-110 transition-all duration-300">
                  <Heart className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">
                  Heart Spark
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
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    location.pathname === link.path ? "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10" : "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {link.name}
                </Link>
              ))}

              {/* More Dropdown */}
              <div className="relative group">
                <button
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-2 border backdrop-blur-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors",
                        location.pathname === link.path ? "text-pink-600 bg-pink-50 dark:bg-pink-500/10 dark:text-pink-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
              
              <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
              
              {isConfigured && (
                <div className="flex items-center gap-2 relative">
                  {user ? (
                    <>
                      <NotificationBell />
                      <button 
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
                      >
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="User" className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                            <User className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                          </div>
                        )}
                      </button>

                      {/* Profile Dropdown */}
                      <AnimatePresence>
                        {isProfileDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg py-2 border backdrop-blur-xl z-50 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                          >
                            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{user.displayName || 'User'}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                            </div>
                            <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                              <Settings className="w-4 h-4" /> Account Settings
                            </Link>
                            <button onClick={() => { logout(); setIsProfileDropdownOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                              <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <button onClick={login} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm">
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => window.dispatchEvent(new Event('trigger-install'))}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hidden sm:block text-zinc-500 dark:text-zinc-400"
                aria-label="Install App"
                title="Install App"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-1">
              {user && <NotificationBell />}
              <button
                onClick={() => window.dispatchEvent(new Event('trigger-install'))}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                aria-label="Install App"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
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
              className="md:hidden overflow-hidden bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-pink-100 dark:border-pink-900/30"
            >
              <div className="px-4 pt-2 pb-4 space-y-1">
                {[...navLinks, ...moreLinks].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "block px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                      location.pathname === link.path ? "text-pink-600 bg-pink-50 dark:bg-pink-500/10 dark:text-pink-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
                <button
                  onClick={handleShare}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Share App
                </button>
                {isConfigured && (
                  <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800">
                    {user ? (
                      <>
                        <div className="px-3 py-2 flex items-center gap-3 mb-2">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                              <User className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{user.displayName || 'User'}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                        <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2">
                          <Settings className="w-5 h-5" /> Account Settings
                        </Link>
                        <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                          <LogOut className="w-5 h-5" /> Sign Out
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { login(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2">
                        <LogIn className="w-5 h-5" /> Sign In
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={cn(
        "py-12 border-t transition-colors duration-300 relative z-10",
        isDarkMode ? "border-zinc-800 bg-zinc-950/80 backdrop-blur-md" : "border-pink-200 bg-white/80 backdrop-blur-md"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-center md:text-left">
            <div className="space-y-4">
              <Link to="/" className="flex items-center justify-center md:justify-start gap-2 group">
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                  <Heart className="w-3 h-3 fill-current animate-pulse" />
                </div>
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">
                  Heart Spark
                </span>
              </Link>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Your ultimate AI companion for decoding love, generating stories, and mastering relationships.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <li><Link to="/love-gpt" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">AI Coach</Link></li>
                <li><Link to="/analyzer" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">Message Analyzer</Link></li>
                <li><Link to="/astrology" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">Astrology AI</Link></li>
                <li><Link to="/tools/story" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">Story Maker</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <li><Link to="/about" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">About Us</Link></li>
                <li><Link to="/privacy" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <li><a href="mailto:shubh656577@gmail.com" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">shubh656577@gmail.com</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1">
              Made with <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" /> for deeper connections
            </p>
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Heart Spark. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </div>
  );
}
