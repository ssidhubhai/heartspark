import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { loginWithUsername, registerWithUsername, getFriendlyErrorMessage } from '../lib/firebase';
import { Logo } from './Logo';
import { cn } from '../utils/cn';

import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);

  const { showToast } = useAuth();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    setPasswordStrength(strength);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (isLogin) {
      setLoading(true);
      try {
        await loginWithUsername(username, password);
        showToast('Welcome back!');
        onClose();
      } catch (err: any) {
        if (err.message === "Invalid username or password.") {
          setError("Invalid username or password.");
        } else {
          setError(getFriendlyErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!name.trim()) {
        setError('Display Name is required');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (usernameError) {
        setError(usernameError);
        return;
      }
      
      setLoading(true);
      try {
        await registerWithUsername(username, password, name);
        showToast('Account created!');
        onClose();
      } catch (err: any) {
        if (err.message.includes('already taken')) {
          setError("This username is already registered. Try signing in instead!");
        } else {
          setError(getFriendlyErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const checkUsername = (val: string) => {
    // Convert to lowercase for checking, but don't strictly strip.
    const lowerVal = val.toLowerCase();
    setUsername(lowerVal);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (lowerVal.length === 0) {
      setUsernameError('');
      setCheckingUsername(false);
      return;
    }

    if (/[^a-z0-9_]/.test(lowerVal)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      setCheckingUsername(false);
      return;
    }

    if (lowerVal.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setCheckingUsername(false);
      return;
    }

    setUsernameError('');
    setCheckingUsername(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const { db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'usernames', lowerVal));
        if (userDoc.exists()) {
          setUsernameError('This username is already taken');
        } else {
          setUsernameError('');
        }
      } catch (err) {
        console.error("Error checking username:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="m-auto bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full max-w-lg relative border border-white/20 dark:border-white/5 overflow-hidden"
          >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-transparent -z-10" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -z-10" />
            
            {/* Loading Overlay */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-pink-100 dark:border-zinc-800" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full"
                    />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-500 animate-pulse">Authenticating...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="p-8 sm:p-12"
            >
              <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-8">
                <Logo size="lg" className="mb-6" />
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">
                  {isLogin ? 'Welcome Back' : 'Join The Lab'}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                  {isLogin ? 'Sign in to access your digital destiny.' : 'Start your journey with us today.'}
                </p>
              </motion.div>

              {/* Tab Switcher */}
              <motion.div variants={itemVariants} className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-8">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
                  className={cn(
                    "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all",
                    isLogin ? "bg-white dark:bg-zinc-900 text-pink-500 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
                  className={cn(
                    "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all",
                    !isLogin ? "bg-white dark:bg-zinc-900 text-pink-500 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Create Account
                </button>
              </motion.div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex flex-col gap-3 text-red-600 dark:text-red-400 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span className="font-medium">{error}</span>
                    </div>
                    {error.includes("already registered") && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setError('');
                        }}
                        className="ml-8 text-xs font-black uppercase tracking-widest text-pink-500 hover:text-pink-600 transition-colors text-left"
                      >
                        Switch to Sign In instead
                      </button>
                    )}
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div
                    key="success"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {!isLogin && (
                    <motion.div
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-4">Display Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-pink-500 transition-colors" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-14 pl-14 pr-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none text-zinc-900 dark:text-white font-bold transition-all focus:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                          placeholder="Your Name"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex justify-between items-center px-4">
                    <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Username</label>
                    {checkingUsername && !isLogin && <Loader2 className="w-3 h-3 animate-spin text-pink-500" />}
                    {!checkingUsername && !isLogin && username.length >= 3 && !usernameError && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-pink-500 font-bold">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        if (isLogin) {
                          setUsername(e.target.value);
                        } else {
                          checkUsername(e.target.value);
                        }
                      }}
                      className={cn(
                        "w-full h-14 pl-10 pr-6 rounded-2xl border-2 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 outline-none text-zinc-900 dark:text-white font-bold transition-all focus:shadow-[0_0_20px_rgba(236,72,153,0.2)]",
                        !isLogin && usernameError 
                          ? "border-red-500 focus:ring-red-500/20 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                          : (!isLogin && username.length >= 3 && !checkingUsername && !usernameError)
                            ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 focus:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            : "border-zinc-100 dark:border-zinc-800 focus:border-pink-500 focus:ring-pink-500/20"
                      )}
                      placeholder="username"
                      required
                    />
                  </div>
                  {!isLogin && usernameError && (
                    <p className="text-[10px] text-red-500 font-bold ml-4 uppercase tracking-widest">{usernameError}</p>
                  )}
                  {!isLogin && !usernameError && username.length >= 3 && !checkingUsername && (
                    <p className="text-[10px] text-emerald-500 font-bold ml-4 uppercase tracking-widest">Username is available!</p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-4">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-pink-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (!isLogin) calculatePasswordStrength(e.target.value);
                      }}
                      className="w-full h-14 pl-14 pr-14 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none text-zinc-900 dark:text-white font-bold transition-all focus:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-pink-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && password.length > 0 && (
                    <div className="px-4 pt-2 space-y-2">
                      <div className="flex gap-1 h-1">
                        {[25, 50, 75, 100].map((step) => (
                          <div
                            key={step}
                            className={cn(
                              "flex-1 rounded-full transition-all duration-500",
                              passwordStrength >= step 
                                ? (passwordStrength <= 25 ? "bg-red-500" : passwordStrength <= 50 ? "bg-orange-500" : passwordStrength <= 75 ? "bg-yellow-500" : "bg-emerald-500")
                                : "bg-zinc-100 dark:bg-zinc-800"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button 
                    variant="custom" 
                    type="submit" 
                    className="w-full h-16 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-gradient-x text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 transition-all border-none hover:-translate-y-1 active:scale-95 mt-4" 
                    disabled={loading}
                  >
                    {isLogin ? 'Sign In' : 'Continue'}
                    {!loading && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
