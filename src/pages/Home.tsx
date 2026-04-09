import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, MessageCircleHeart, Gamepad2, Star, Bot, Share2, RefreshCw, Download, BookHeart, ArrowRight, Zap, Coffee, Ghost, Flame, User } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import confetti from 'canvas-confetti';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { generateContentWithFallback, safeParseJSON } from '../utils/ai';
import { LiveTicker } from '../components/LiveTicker';
import { ToolCarousel } from '../components/ToolCarousel';

const PWAPrompt = React.lazy(() => import('../components/PWAPrompt').then(m => ({ default: m.PWAPrompt })));
const OnboardingTour = React.lazy(() => import('../components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));

export function Home() {
  const navigate = useNavigate();
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [result, setResult] = useState<{ score: number; message: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Basic Streak Logic
    const lastVisit = localStorage.getItem('last_visit');
    const currentStreak = parseInt(localStorage.getItem('streak') || '0');
    const today = new Date().toLocaleDateString();

    if (lastVisit === today) {
      setStreak(currentStreak);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastVisit === yesterday.toLocaleDateString()) {
        const newStreak = currentStreak + 1;
        setStreak(newStreak);
        localStorage.setItem('streak', newStreak.toString());
      } else {
        setStreak(1);
        localStorage.setItem('streak', '1');
      }
      localStorage.setItem('last_visit', today);
    }
  }, []);

  const getDefaultMessage = (score: number) => {
    if (score > 90) return "Basically Soulmates. When is the wedding? 💍 (Send this to them as a hint)";
    if (score > 80) return "The chemistry is giving main character energy. Shoot your shot! 🚀";
    if (score > 70) return "Definitely a vibe. Try sending them a meme and see what happens. 👀";
    if (score > 50) return "It's giving 'just friends' right now, but there's room for character development. 📈";
    return "The math ain't mathing. Focus on your career and JEE prep instead bro 💀📚";
  };

  const calculateLove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;

    setIsCalculating(true);
    setResult(null);

    setTimeout(async () => {
      const n1 = name1.trim().toLowerCase();
      const n2 = name2.trim().toLowerCase();
      
      let score = 0;
      let message = "";

      if (n1 === n2) {
        score = 100;
        message = "Self-love is the foundation of all love. You are complete.";
      } else {
        const [sortedN1, sortedN2] = [n1, n2].sort();
        const combined = (sortedN1 + "truelove" + sortedN2).replace(/[^a-z]/g, '');
        
        let counts: number[] = [];
        let seen = new Set<string>();
        for (let char of combined) {
          if (!seen.has(char)) {
            let count = 0;
            for (let c of combined) {
              if (c === char) count++;
            }
            counts.push(count);
            seen.add(char);
          }
        }

        let current = counts;
        while (current.length > 2) {
          let next: number[] = [];
          let left = 0;
          let right = current.length - 1;
          while (left < right) {
            let sum = current[left] + current[right];
            next.push(...String(sum).split('').map(Number));
            left++;
            right--;
          }
          if (left === right) {
            next.push(current[left]);
          }
          current = next;
        }

        score = parseInt(current.join(''));
        if (isNaN(score)) score = 50;
        if (score > 100) score = 100;

        if ((n1 === 'romeo' && n2 === 'juliet') || (n1 === 'juliet' && n2 === 'romeo')) {
          score = 99;
        }

        // Generate dynamic message using AI
        try {
          const prompt = `You are Heart Spark, a Gen-Z love calculator. 
          The love score between ${name1} and ${name2} is ${score}%. 
          Write a funny, highly relatable, 1-2 sentence Gen-Z style reaction to this score.
          If the score is low (< 50), make it funny but not mean (e.g., "focus on your career").
          If the score is high (> 80), hype them up.
          Return ONLY a JSON object: {"message": "your reaction"}`;

          const response = await generateContentWithFallback({
            model: 'gemini-3-flash-preview',
            contents: prompt
          });
          const text = response.text || '';
          const parsed = safeParseJSON(text);
          message = parsed.message || getDefaultMessage(score);
        } catch (e) {
          message = getDefaultMessage(score);
        }
      }

      setResult({ score, message });
      setIsCalculating(false);
      
      if (score > 75) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#d946ef', '#fbcfe8']
        });
      }
    }, 1200);
  };

  const handleShare = async () => {
    if (!result || isSharing) return;
    setIsSharing(true);
    
    try {
      const text = `Check out our love compatibility on HeartSpark! ${name1} & ${name2} got ${result.score}%! 💖`;
      await shareAsImage('calculator-result', 'HeartSpark Love Result', text);
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!result || isSharing) return;
    setIsSharing(true);

    try {
      await downloadAsImage('calculator-result', `heartspark-${name1}-${name2}`);
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const features = [
    {
      title: "Message Analyzer",
      description: "Paste your 'Hmm' or 'Ok' texts. Let AI decode the real vibe, find red flags, and suggest the perfect reply.",
      icon: <MessageCircleHeart className="w-6 h-6 text-purple-500" />,
      path: "/analyzer",
      badge: "HOT",
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "Astro Vibe",
      description: "Are your zodiacs actually compatible or just a 'canon event'? Get a deep cosmic consultation for your relationship.",
      icon: <Bot className="w-6 h-6 text-pink-500" />,
      path: "/astrology",
      badge: "NEW",
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Viral Stories",
      description: "Anonymous tea from the community. Share your toxic traits, wholesome moments, or ghosting horror stories.",
      icon: <BookHeart className="w-6 h-6 text-rose-500" />,
      path: "/stories",
      color: "from-rose-500 to-orange-500"
    }
  ];

  return (
    <div className="space-y-24 py-12">
      <Suspense fallback={null}>
        <OnboardingTour />
      </Suspense>
      <LiveTicker />
      <Suspense fallback={null}>
        <PWAPrompt />
      </Suspense>
      <LoadingOverlay isVisible={isCalculating} type="calculator" />
      <LoadingOverlay isVisible={isSharing} message="Generating your result image..." />
      
      {/* HERO SECTION */}
      <section className="text-center space-y-6 max-w-4xl mx-auto relative px-4 mt-12 mb-20">
        {/* Streak Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest mb-4"
        >
          <Zap className="w-3 h-3 fill-current" />
          {streak} Day Streak
        </motion.div>

        {/* Floating Heart with Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.1 
          }}
          className="relative flex justify-center mb-12"
        >
          <div className="absolute inset-0 bg-pink-400/20 blur-3xl rounded-full scale-150 animate-pulse-slow" />
          <div className="relative w-24 h-24 rounded-full bg-white shadow-2xl shadow-pink-500/20 flex items-center justify-center group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-white opacity-50" />
            <Heart className="w-12 h-12 relative z-10 animate-heart-sparkle animate-color-glow text-pink-500 fill-current" />
            
            {/* Extra Sparkles */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
                rotate: [0, 45, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-2 right-4 z-20"
            >
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </motion.div>
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.8, 0.3],
                rotate: [0, -45, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              className="absolute bottom-4 left-4 z-20"
            >
              <Sparkles className="w-3 h-3 text-pink-300 fill-pink-300" />
            </motion.div>
          </div>
        </motion.div>
        
        <div className="space-y-2">
          <motion.h1 
            className="text-[56px] md:text-[84px] font-black tracking-tighter text-[#1A1F2C] dark:text-white leading-[1.1] md:leading-[1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Discover Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D97] via-[#D946EF] to-[#A855F7] drop-shadow-sm">
              True Love Destiny
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Explore viral crush games, test your compatibility, and find out if they're the one. ✨
          </motion.p>
        </div>


        {/* Subtle Floating Hearts Background */}
        <div className="absolute inset-0 -z-10 overflow-visible pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-pink-200/40"
              initial={{ 
                x: Math.random() * 800 - 400, 
                y: Math.random() * 400 - 200,
                scale: Math.random() * 0.5 + 0.5,
                opacity: 0 
              }}
              animate={{ 
                y: [0, -40, 0],
                opacity: [0, 0.6, 0],
                rotate: [0, 15, -15, 0]
              }}
              transition={{ 
                duration: 5 + Math.random() * 5, 
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              <Heart className="w-6 h-6 fill-current" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* LOVE CALCULATOR */}
      <section className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="border-pink-100 dark:border-pink-900/30 shadow-2xl shadow-pink-500/5 p-5 sm:p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3">
                <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                Love Calculator
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">Uses the classic "TRUE LOVE" paper-and-pencil algorithm!</p>
            </div>
            
            <form onSubmit={calculateLove} className="space-y-8">
              <div className="flex flex-col md:flex-row items-center gap-4 relative">
                <div className="w-full space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-4">Your Name</label>
                  <input
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    className="w-full h-14 px-6 rounded-full border-2 border-pink-100 dark:border-pink-900/30 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all shadow-sm font-medium text-lg"
                    placeholder="e.g. Alex"
                    required
                  />
                </div>
                
                <div className="flex-shrink-0 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-pink-500 border-4 border-white dark:border-zinc-900 text-white shadow-lg md:mt-6">
                  <Heart className="w-5 h-5 fill-current" />
                </div>

                <div className="w-full space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-4">Crush's Name</label>
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    className="w-full h-14 px-6 rounded-full border-2 border-pink-100 dark:border-pink-900/30 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all shadow-sm font-medium text-lg"
                    placeholder="e.g. Taylor"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="custom"
                className="w-full h-14 text-lg font-bold rounded-full bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all border-none hover:-translate-y-1"
                disabled={isCalculating || !name1 || !name2}
              >
                {isCalculating ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 animate-spin" /> Analyzing emotional signals...
                  </span>
                ) : (
                  "Calculate Compatibility"
                )}
              </Button>
            </form>
          </Card>
        </motion.div>


       <AnimatePresence>
          {result && !isCalculating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 flex flex-col items-center space-y-6 px-4 pb-20"
            >
              {/* ✨ THE CARD (Optimized for Capture) */}
              <div 
                id="calculator-result" 
                ref={resultRef}
                className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-950 border border-pink-100 dark:border-white/5 shadow-2xl w-full max-w-[380px] min-h-[480px] h-auto flex flex-col"
              >
                {/* 🌈 Capture-Safe Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-pink-50 dark:from-[#121212] dark:via-[#0a0a0a] dark:to-[#121212]" />
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-pink-500/10 blur-[80px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-600/10 blur-[80px]" />
                
                <div className="relative z-10 p-8 h-full flex flex-col items-center justify-between text-center">
                  {/* Top Header */}
                  <div className="space-y-6 w-full flex flex-col items-center">
                    <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 dark:bg-white/5 border border-pink-200/50 dark:border-white/10 flex items-center gap-2">
                      <Logo size="sm" showText={false} />
                      <span className="text-[10px] uppercase font-black tracking-[0.3em] text-pink-600 dark:text-pink-400">
                        HeartSpark Analysis
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-tight break-words px-2 uppercase">
                        {name1} <span className="text-pink-500 font-serif not-italic">&</span> {name2}
                      </h2>
                      <p className="text-slate-500 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Global Vibe Check 2.0</p>
                    </div>
                  </div>

                  {/* Hero Score */}
                  <div className="relative flex flex-col items-center py-4">
                    <div className="absolute inset-0 bg-pink-500/5 blur-3xl rounded-full scale-150" />
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200 }}
                      className="relative"
                    >
                      <span className="text-[110px] font-black tracking-tighter leading-none text-slate-900 dark:text-white drop-shadow-[0_0_40px_rgba(236,72,153,0.4)]">
                        {result.score}%
                      </span>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="h-2 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-full -mt-2 opacity-80" 
                      />
                    </motion.div>
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mt-4">Compatibility Level</p>
                  </div>

                  {/* Message Box */}
                  <div className="w-full space-y-6">
                    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border-2 border-pink-100/50 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500" />
                      <p className="text-2xl font-black text-slate-900 dark:text-pink-50 leading-tight italic relative z-10">
                        "{result.message}"
                      </p>
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Heart className="w-24 h-24 text-pink-500 fill-current" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[10px] text-slate-400 dark:text-zinc-600 font-black uppercase tracking-[0.6em]">
                        heartspark.app
                      </p>
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-pink-500/30" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

             {/* 🕹️ HIGH-CONTRAST ACTION DOCK */}
              <div className="flex items-center justify-center gap-3 w-full max-w-[380px] px-2">
                 
                 {/* SHARE BUTTON: Primary Pink */}
                 <Button 
                   onClick={handleShare} 
                   disabled={isSharing}
                   className="flex-[2] rounded-full bg-pink-600 hover:bg-pink-500 text-white font-bold h-12 shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center justify-center border-none disabled:opacity-50"
                 >
                    {isSharing ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />} 
                    Share
                 </Button>
                 
                 {/* SAVE BUTTON: Midnight Glass (Won't turn white) */}
                 <Button 
                   onClick={handleDownload} 
                   disabled={isSharing}
                   className="flex-[2] rounded-full bg-white dark:bg-zinc-900/80 hover:bg-pink-50 dark:hover:bg-zinc-800 text-pink-600 dark:text-white font-bold h-12 backdrop-blur-xl border border-pink-200 dark:border-pink-500/40 shadow-xl transition-all active:scale-95 flex items-center justify-center group disabled:opacity-50"
                 >
                    {isSharing ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2 text-pink-500 group-hover:animate-bounce" />} 
                    <span>Save</span>
                 </Button>

                 {/* RECALCULATE BUTTON: Visible Ghost Circle */}
                 <button 
                   onClick={() => setResult(null)} 
                   className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-pink-100 dark:border-zinc-700 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-300 hover:text-pink-500 dark:hover:text-pink-400 flex items-center justify-center transition-all active:scale-90 group shadow-lg dark:shadow-2xl"
                   title="Recalculate"
                 >
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                 </button>
              </div>

              {/* 🌟 NEXT STEPS UPSELL */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-[380px] space-y-4"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Try This Next</span>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                </div>

                <Link to="/astrology" className="block group">
                  <Card className="bg-white/80 dark:bg-indigo-950/20 backdrop-blur-md border border-indigo-100 dark:border-indigo-800/30 p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 transition-all shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        Astro Vibe <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">New</span>
                      </h3>
                      <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 leading-snug">
                        Are your zodiacs actually compatible?
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Card>
                </Link>

                <Link to="/analyzer" className="block group">
                  <Card className="bg-white/80 dark:bg-purple-950/20 backdrop-blur-md border border-purple-100 dark:border-purple-800/30 p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-purple-50/80 dark:hover:bg-purple-900/30 transition-all shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <MessageCircleHeart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                        Message Analyzer <span className="px-1.5 py-0.5 rounded text-[8px] bg-purple-100 dark:bg-purple-500/30 text-purple-700 dark:text-purple-300 uppercase tracking-wider">Hot</span>
                      </h3>
                      <p className="text-xs text-purple-700/80 dark:text-purple-300/80 mt-0.5 leading-snug">
                        Decode their texts and get the real vibe.
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Card>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* FEATURED TOOLS CAROUSEL */}
      <section className="px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Featured Tools</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium text-lg">Swipe to explore our viral AI features.</p>
        </div>
        
        <ToolCarousel features={features} />
      </section>

      {/* TRENDING TEA TEASER */}
      <section className="px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-pink-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Trending Tea</h2>
          </div>
          <Link to="/stories" className="text-sm font-bold text-pink-500 hover:text-pink-600 transition-colors flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 rounded-3xl border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Ghost className="w-12 h-12 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 italic mb-4">
              "He left me on read for 3 days then liked my story... what is the vibe? 💀"
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs">💅</div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Anonymous</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="flex items-center gap-1 text-[10px] font-bold"><Heart className="w-3 h-3" /> 1.2k</div>
                <div className="flex items-center gap-1 text-[10px] font-bold"><MessageCircleHeart className="w-3 h-3" /> 42</div>
              </div>
            </div>
          </Card>
          <Card className="p-6 rounded-3xl border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Flame className="w-12 h-12 text-rose-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 italic mb-4">
              "My toxic trait is thinking I can fix a Scorpio man. Wish me luck. 🔥"
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs">🤡</div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Anonymous</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="flex items-center gap-1 text-[10px] font-bold"><Heart className="w-3 h-3" /> 856</div>
                <div className="flex items-center gap-1 text-[10px] font-bold"><MessageCircleHeart className="w-3 h-3" /> 18</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* DAILY FORTUNE TEASER */}
      <section className="px-4 max-w-7xl mx-auto pb-12">
        <Card className="bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 text-white border-none overflow-hidden relative rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-3">
                <Star className="w-8 h-8 text-yellow-300 fill-yellow-300" />
                Daily Insights
              </h2>
              <p className="text-pink-100 max-w-lg text-lg">
                Receive your personalized daily reading and actionable relationship advice based on current astrological alignments.
              </p>
            </div>
            <Button 
              className="bg-white text-pink-600 hover:bg-pink-50 w-full md:w-auto whitespace-nowrap text-lg h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all text-adaptive-readable"
              onClick={() => navigate('/tools/fortune')}
            >
              View Today's Reading <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}