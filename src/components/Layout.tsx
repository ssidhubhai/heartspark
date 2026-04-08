import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X, Share2, Moon, Sun, LogIn, LogOut, User, Download, Settings, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { InstallPrompt } from './InstallPrompt';
import { NotificationBell } from './NotificationBell';
import { FloatingHearts } from './FloatingHearts';
import { ShareModal } from './ShareModal';
import { MobileBottomNav } from './MobileBottomNav';

export function Layout({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const location = useLocation();
  const { user, login, logout, isConfigured } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Close menu and scroll to top on route change
  useEffect(() => {
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.scrollTo(0, 0);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Astro Vibe', path: '/astrology' },
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
      "flex flex-col font-sans relative overflow-hidden transition-colors duration-300",
      theme === 'dark' ? "bg-[#050505] text-white" : "bg-[#FFFBFC] text-zinc-900",
      (location.pathname === '/love-gpt' || location.pathname === '/astrology') ? "h-[100dvh]" : "min-h-screen"
    )}>
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn(
          "absolute inset-0 opacity-10 transition-opacity duration-500",
          theme === 'dark' ? "bg-grid-pink" : "bg-grid-pink"
        )} />
        <div className={cn(
          "absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow",
          theme === 'dark' ? "bg-pink-600/10" : "bg-pink-200/30"
        )} />
      </div>

      <FloatingHearts />
      <InstallPrompt />
      
      {/* Navbar */}
      <nav className={cn(
        "sticky top-0 z-50 backdrop-blur-md transition-all duration-300",
        theme === 'dark' 
          ? "border-b border-white/10 bg-black/60 shadow-lg" 
          : "bg-white/70 shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {location.pathname !== '/astrology' && (
                <Link to="/">
                  <Logo size="md" />
                </Link>
              )}
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300",
                      location.pathname === link.path 
                        ? "text-pink-600 bg-[#FFF0F5]" 
                        : "text-zinc-600 hover:text-pink-600"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}

                {/* More Dropdown */}
                <div className="relative group">
                  <button
                    className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-zinc-600 hover:text-pink-600 transition-all duration-300 flex items-center gap-1"
                  >
                    More
                    <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  
                  <div className={cn(
                    "absolute right-0 mt-2 w-56 rounded-2xl shadow-xl py-3 border backdrop-blur-3xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right translate-y-2 group-hover:translate-y-0",
                    theme === 'dark' ? "border-white/10 bg-[#0A0A0B]/95" : "border-zinc-200 bg-white/95"
                  )}>
                    {moreLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={cn(
                          "block px-5 py-2.5 text-sm font-medium transition-all",
                          location.pathname === link.path 
                            ? "text-pink-600 bg-[#FFF0F5]" 
                            : "text-zinc-600 hover:bg-pink-50 hover:text-pink-600"
                        )}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 border-l border-zinc-200 pl-4 h-8">
                <NotificationBell />
                
                {isConfigured && (
                  <div className="relative">
                    {user ? (
                      <>
                        <button 
                          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                          className="relative ml-2"
                        >
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-zinc-200 object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                              <User className="w-4 h-4 text-zinc-400" />
                            </div>
                          )}
                        </button>

                        <AnimatePresence>
                          {isProfileDropdownOpen && (
                            <>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="fixed inset-0 z-40"
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className={cn(
                                  "absolute right-0 top-full mt-4 w-72 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border backdrop-blur-3xl z-50 overflow-hidden",
                                  theme === 'dark' ? "border-white/10 bg-[#0A0A0B]/95" : "border-zinc-200 bg-white/95"
                                )}
                              >
                                {/* Header */}
                                <div className={cn("p-6 border-b relative overflow-hidden", theme === 'dark' ? "border-white/5" : "border-zinc-100")}>
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -z-10" />
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                      {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-14 h-14 rounded-2xl border-2 border-white dark:border-zinc-800 object-cover shadow-lg" />
                                      ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-lg">
                                          <User className="w-6 h-6 text-pink-500" />
                                        </div>
                                      )}
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn("text-sm font-black truncate uppercase tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>{user.displayName || 'USER'}</p>
                                      <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-bold">{user.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-500 text-[10px] font-black uppercase tracking-widest">
                                    <Sparkles className="w-3 h-3" /> Pro Member
                                  </div>
                                </div>

                                {/* Links */}
                                <div className="p-2">
                                  <Link 
                                    to="/profile" 
                                    onClick={() => setIsProfileDropdownOpen(false)} 
                                    className={cn(
                                      "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                                      theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-pink-50 text-zinc-600 hover:text-pink-600"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                        <User className="w-4 h-4 text-pink-500" />
                                      </div>
                                      <span className="text-xs font-black uppercase tracking-widest">My Profile</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                  </Link>

                                  <Link 
                                    to="/profile" 
                                    onClick={() => setIsProfileDropdownOpen(false)} 
                                    className={cn(
                                      "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                                      theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-pink-50 text-zinc-600 hover:text-pink-600"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Settings className="w-4 h-4 text-purple-500" />
                                      </div>
                                      <span className="text-xs font-black uppercase tracking-widest">Settings</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                  </Link>

                                  <div className={cn("h-px my-2 mx-4", theme === 'dark' ? "bg-white/5" : "bg-zinc-100")} />

                                  <button 
                                    onClick={() => { logout(); setIsProfileDropdownOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-xs font-black uppercase tracking-widest"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                      <LogOut className="w-4 h-4 text-red-500" />
                                    </div>
                                    Sign Out
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <button onClick={login} className={cn(
                        "flex items-center gap-3 px-6 py-2.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,0,0,0.1)]",
                        theme === 'dark' ? "bg-white text-black hover:bg-pink-500 hover:text-white" : "bg-pink-600 text-white hover:bg-pink-700"
                      )}>
                        <LogIn className="w-4 h-4" />
                        <span>SIGN IN</span>
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={() => window.dispatchEvent(new Event('trigger-install'))}
                  className="p-2 text-zinc-400 hover:text-pink-600 transition-colors"
                  aria-label="Install App"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleTheme}
                  className="p-2 text-zinc-400 hover:text-pink-600 transition-colors"
                  aria-label="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 text-zinc-400 hover:text-pink-600 transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-2">
              {user && <NotificationBell />}
              <button
                onClick={() => window.dispatchEvent(new Event('trigger-install'))}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-pink-400"
                aria-label="Install App"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300 hover:text-pink-400 transition-all"
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "md:hidden overflow-hidden backdrop-blur-3xl border-b",
                theme === 'dark' ? "bg-[#0A0A0B]/95 border-white/10" : "bg-white/95 border-zinc-200"
              )}
            >
              <div className="px-6 pt-4 pb-8 space-y-2">
                {[...navLinks, ...moreLinks].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                      location.pathname === link.path 
                        ? "text-pink-400 bg-pink-500/10 border border-pink-500/20" 
                        : theme === 'dark' ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-zinc-500 hover:bg-pink-50 hover:text-pink-600"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
                <button
                  onClick={handleShare}
                  className={cn(
                    "w-full text-left px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3",
                    theme === 'dark' ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-zinc-500 hover:bg-pink-50 hover:text-pink-600"
                  )}
                >
                  <Share2 className="w-5 h-5 text-pink-500" /> SHARE APP
                </button>
                {isConfigured && (
                  <div className={cn("pt-6 mt-4 border-t", theme === 'dark' ? "border-white/5" : "border-zinc-100")}>
                    {user ? (
                      <div className="space-y-2">
                        <div className={cn(
                          "px-4 py-3 flex items-center gap-4 mb-4 rounded-2xl border",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-100"
                        )}>
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className={cn("w-12 h-12 rounded-xl border", theme === 'dark' ? "border-white/10" : "border-zinc-200")} />
                          ) : (
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center border",
                              theme === 'dark' ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-white/10" : "bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-zinc-200"
                            )}>
                              <User className="w-6 h-6 text-pink-400" />
                            </div>
                          )}
                          <div>
                            <p className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-zinc-900")}>{user.displayName || 'USER'}</p>
                            <p className="text-[10px] text-zinc-500 font-bold mt-1">{user.email}</p>
                          </div>
                        </div>
                        <Link to="/profile" onClick={() => setIsMenuOpen(false)} className={cn(
                          "w-full text-left px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3",
                          theme === 'dark' ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-zinc-500 hover:bg-pink-50 hover:text-pink-600"
                        )}>
                          <Settings className="w-5 h-5 text-pink-500" /> ACCOUNT SETTINGS
                        </Link>
                        <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-3">
                          <LogOut className="w-5 h-5" /> SIGN OUT
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { login(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white bg-pink-500 hover:bg-pink-600 transition-all flex items-center gap-3 justify-center shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                        <LogIn className="w-5 h-5" /> SIGN IN
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
      <main id="main-content" className={cn(
        "w-full relative z-10 pb-28 md:pb-0",
        (location.pathname === '/love-gpt' || location.pathname === '/astrology') ? "flex-1 overflow-hidden" : "flex-grow",
        location.pathname === '/' ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" : 
        (location.pathname === '/love-gpt' || location.pathname === '/astrology' || location.pathname === '/stories') ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
      )}>
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

      {/* Footer - Only show on home page */}
      {location.pathname === '/' && (
        <footer className={cn(
          "py-20 pb-32 md:pb-20 border-t backdrop-blur-3xl relative z-10 overflow-hidden transition-colors duration-300",
          theme === 'dark' ? "border-white/5 bg-black/60" : "border-zinc-200 bg-zinc-50/80"
        )}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 text-center md:text-left">
              <div className="space-y-6">
                <Link to="/">
                  <Logo size="sm" />
                </Link>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                  Your ultimate AI companion for decoding love, generating stories, and mastering relationships in the digital age.
                </p>
              </div>
              
              <div>
                <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-8", theme === 'dark' ? "text-white" : "text-zinc-900")}>LABORATORY</h3>
                <ul className="space-y-4 text-xs font-bold text-zinc-500">
                  <li><Link to="/analyzer" className="hover:text-pink-400 transition-colors uppercase tracking-widest">Message Decoder</Link></li>
                  <li><Link to="/astrology" className="hover:text-pink-400 transition-colors uppercase tracking-widest">Astrology AI</Link></li>
                  <li><Link to="/tools/story" className="hover:text-pink-400 transition-colors uppercase tracking-widest">Story Maker</Link></li>
                </ul>
              </div>

              <div>
                <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-8", theme === 'dark' ? "text-white" : "text-zinc-900")}>PROTOCOL</h3>
                <ul className="space-y-4 text-xs font-bold text-zinc-500">
                  <li><Link to="/about" className="hover:text-pink-400 transition-colors uppercase tracking-widest">About Us</Link></li>
                  <li><Link to="/privacy" className="hover:text-pink-400 transition-colors uppercase tracking-widest">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-pink-400 transition-colors uppercase tracking-widest">Terms of Service</Link></li>
                </ul>
              </div>

              <div>
                <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-8", theme === 'dark' ? "text-white" : "text-zinc-900")}>CONNECT</h3>
                <ul className="space-y-4 text-xs font-bold text-zinc-500">
                  <li><a href="mailto:shubh656577@gmail.com" className="hover:text-pink-400 transition-colors lowercase tracking-widest">shubh656577@gmail.com</a></li>
                  <li><a href="mailto:shubh656577@gmail.com?subject=HeartSpark%20Feedback" className="hover:text-pink-400 transition-colors uppercase tracking-widest">Submit Feedback</a></li>
                </ul>
              </div>
            </div>

            <div className={cn("pt-12 border-t flex flex-col items-center justify-center gap-6", theme === 'dark' ? "border-white/5" : "border-zinc-200")}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-px bg-gradient-to-r from-transparent to-zinc-800" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] flex items-center gap-3">
                  MADE WITH <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" /> FOR CONNECTIONS
                </p>
                <div className="w-10 h-px bg-gradient-to-l from-transparent to-zinc-800" />
              </div>
              <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">© {new Date().getFullYear()} HEART SPARK LABORATORY. ALL RIGHTS RESERVED.</p>
            </div>
          </div>
        </footer>
      )}
      
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      <MobileBottomNav />
    </div>
  );
}
