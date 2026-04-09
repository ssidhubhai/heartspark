import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Logo } from './Logo';
import { cn } from '../utils/cn';

import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Email/Login, 2: Verification, 3: Profile Details
  const [email, setEmail] = useState('');
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

  const { showToast, user } = useAuth();

  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    setPasswordStrength(strength);
  };

  if (!isOpen) return null;

  const handleNextStep = async () => {
    setError('');
    if (step === 1) {
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      if (!isLogin && !password.trim()) {
        setError('Password is required');
        return;
      }
      if (!isLogin && password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      if (isLogin) {
        setLoading(true);
        try {
          await loginWithEmail(email, password);
          showToast('Welcome back!');
          onClose();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        // For registration, we now collect Name and Username BEFORE creating account
        setStep(2);
      }
    } else if (step === 2) {
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      if (!username.trim() || usernameError) {
        setError(usernameError || 'Username is required');
        return;
      }
      
      setLoading(true);
      try {
        await registerWithEmail(email, password, name, username);
        setStep(3);
        showToast('Account created! Verification email sent.');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const checkVerification = async () => {
    setLoading(true);
    setError('');
    try {
      // We need to sign in again to get the latest verification status
      try {
        await loginWithEmail(email, password);
        showToast('Email verified! Welcome to Heart Spark.');
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (isLogin || isForgotPassword) {
      if (isForgotPassword) {
        setLoading(true);
        try {
          await resetPassword(email);
          setSuccessMsg('Password reset link sent to your email.');
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        handleNextStep();
      }
    } else {
      if (step === 1 || step === 2) {
        handleNextStep();
      } else if (step === 3) {
        checkVerification();
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Signed in with Google!');
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection or disable ad blockers.');
      } else {
        setError(err.message || 'Failed to login with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (val: string) => {
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleanVal);
    
    if (cleanVal.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    setCheckingUsername(true);
    try {
      const { db } = await import('../lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'usernames', cleanVal));
      if (userDoc.exists()) {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError('');
      }
    } catch (err) {
      console.error("Error checking username:", err);
    } finally {
      setCheckingUsername(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden relative border border-white/20 dark:border-white/5"
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

            <div className="p-8 sm:p-12">
              <div className="flex flex-col items-center text-center mb-10">
                <Logo size="lg" className="mb-6" />
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">
                  {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : (step === 1 ? 'Join The Lab' : step === 2 ? 'Complete Profile' : 'Verify Email'))}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                  {isForgotPassword 
                    ? 'Enter your email to receive a password reset link.' 
                    : (isLogin ? 'Sign in to access your digital destiny.' : (step === 1 ? 'Start your journey with us today.' : step === 2 ? 'Tell us a bit more about yourself.' : `We've sent a link to ${email}`)) }
                </p>
              </div>

              {/* Step Indicator */}
              {!isLogin && !isForgotPassword && (
                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        step === s ? "w-8 bg-pink-500" : "w-4 bg-zinc-100 dark:bg-zinc-800",
                        step > s && "bg-emerald-500"
                      )}
                    />
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{error}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-4">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-pink-500 transition-colors" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:border-pink-500 focus:ring-8 focus:ring-pink-500/10 outline-none text-zinc-900 dark:text-white font-bold transition-all"
                            placeholder="you@email.com"
                            required
                          />
                        </div>
                      </div>

                      {!isForgotPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-4">
                            <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Password</label>
                            {isLogin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsForgotPassword(true);
                                  setError('');
                                  setSuccessMsg('');
                                }}
                                className="text-[11px] text-pink-500 font-black uppercase tracking-widest hover:text-pink-600 transition-colors"
                              >
                                Forgot?
                              </button>
                            )}
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-pink-500 transition-colors" />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                if (!isLogin) calculatePasswordStrength(e.target.value);
                              }}
                              className="w-full h-14 pl-14 pr-14 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:border-pink-500 focus:ring-8 focus:ring-pink-500/10 outline-none text-zinc-900 dark:text-white font-bold transition-all"
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
                        </div>
                      )}
                    </motion.div>
                  )}

                  {step === 3 && !isLogin && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 text-center"
                    >
                      <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-10 h-10 text-pink-500" />
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                        We've sent a verification link to <span className="font-bold text-zinc-900 dark:text-white">{email}</span>. 
                        Please check your inbox (and spam folder) to continue.
                      </p>
                      <div className="flex flex-col gap-3">
                        <Button 
                          type="button"
                          onClick={checkVerification}
                          className="w-full h-14 bg-pink-500 text-white font-bold rounded-2xl"
                        >
                          I've Verified My Email
                        </Button>
                        <button 
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-bold text-zinc-500 hover:text-pink-500 transition-colors"
                        >
                          Change Email Address
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && !isLogin && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-4">Display Name</label>
                        <div className="relative group">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-pink-500 transition-colors" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:border-pink-500 focus:ring-8 focus:ring-pink-500/10 outline-none text-zinc-900 dark:text-white font-bold transition-all"
                            placeholder="Your Name"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-4">
                          <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Username</label>
                          {checkingUsername && <Loader2 className="w-3 h-3 animate-spin text-pink-500" />}
                        </div>
                        <div className="relative group">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-pink-500 font-bold">@</span>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => checkUsername(e.target.value)}
                            className={cn(
                              "w-full h-14 pl-10 pr-6 rounded-2xl border-2 bg-zinc-50/50 dark:bg-zinc-900/50 focus:ring-8 outline-none text-zinc-900 dark:text-white font-bold transition-all",
                              usernameError 
                                ? "border-red-500 focus:ring-red-500/10" 
                                : "border-zinc-100 dark:border-zinc-800 focus:border-pink-500 focus:ring-pink-500/10"
                            )}
                            placeholder="username"
                            required
                          />
                        </div>
                        {usernameError && (
                          <p className="text-[10px] text-red-500 font-bold ml-4 uppercase tracking-widest">{usernameError}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button 
                  variant="custom" 
                  type="submit" 
                  className="w-full h-16 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-gradient-x text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 transition-all border-none hover:-translate-y-1 active:scale-95" 
                  disabled={loading}
                >
                  {isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : (step === 3 ? 'Verify & Sign In' : 'Continue'))}
                  {!loading && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
                </Button>
              </form>


              <div className="mt-10">
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
                  </div>
                  <span className="relative px-4 bg-white dark:bg-zinc-900 text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Social Connect</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-14 flex items-center justify-center gap-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group"
                  disabled={loading}
                >
                  <div className="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  Continue with Google
                </button>

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setIsForgotPassword(false);
                      setStep(1);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-zinc-500 hover:text-pink-500 transition-colors"
                  >
                    {isForgotPassword 
                      ? "Back to Sign In" 
                      : (isLogin ? "Don't have an account? Join the lab" : "Already have an account? Sign in")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
