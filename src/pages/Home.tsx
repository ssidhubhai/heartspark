import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, MessageCircleHeart, Gamepad2, Star, Flame, MessageCircle, Brain, Mail, Users, Bot, Share2, RefreshCw, Download, BookOpen, ArrowRight, BookHeart } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function Home() {
  const navigate = useNavigate();
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{ score: number; message: string } | null>(null);

  const calculateLove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;

    setIsCalculating(true);
    setResult(null);

    // Simulate a short calculation delay for effect
    setTimeout(async () => {
      const n1 = name1.trim().toLowerCase();
      const n2 = name2.trim().toLowerCase();
      
      let score = 0;
      let message = "";

      if (n1 === n2) {
        score = 100;
        message = "Self-love is the foundation of all love. You are complete.";
      } else {
        // Classic "TRUE LOVE" paper-and-pencil algorithm (order independent)
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

        // Fun easter eggs for specific names
        if ((n1 === 'romeo' && n2 === 'juliet') || (n1 === 'juliet' && n2 === 'romeo')) {
          score = 99;
        }

        // Custom logic for Riya
        const isRiya = (name: string) => name === 'riya' || name === 'riya rai';
        const isSagar = (name: string) => name === 'sagar' || name === 'sagar gupta';
        const isSiddharth = (name: string) => name === 'siddharth' || name === 'siddharth gupta';

        if ((isRiya(n1) && isSagar(n2)) || (isRiya(n2) && isSagar(n1))) {
          score = 93;
        } else if ((isRiya(n1) && isSiddharth(n2)) || (isRiya(n2) && isSiddharth(n1))) {
          score = 93;
        }

        if (score > 90) message = "Exceptional compatibility. A profound connection is indicated.";
        else if (score > 80) message = "High compatibility. Strong potential for a lasting bond.";
        else if (score > 70) message = "Good compatibility. A solid foundation exists.";
        else if (score > 50) message = "Moderate compatibility. Requires mutual understanding and effort.";
        else message = "Low initial compatibility. Growth requires significant communication.";
      }

      setResult({ score, message });
      setIsCalculating(false);
      
      if (score > 75) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#d946ef', '#fbcfe8'] // Pink/Purple palette
        });
      }

      // Save to Firebase if one of the names is Riya
      const isRiya = (name: string) => name === 'riya' || name === 'riya rai';
      if (db && (isRiya(n1) || isRiya(n2))) {
        try {
          await addDoc(collection(db, 'riya_searches'), {
            name1: name1.trim(),
            name2: name2.trim(),
            score,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error("Error saving search to Firebase:", error);
        }
      }
    }, 1200);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `Compatibility analysis for ${name1} and ${name2}: ${result.score}%. "${result.message}"`;
    await shareAsImage('calculator-result', 'Compatibility Result', text);
  };

  const handleDownload = () => {
    downloadAsImage('calculator-result', 'compatibility-result');
  };

  const features = [
    {
      title: "Community Stories",
      description: "Read, share, and get inspired by real love stories from our community.",
      icon: <BookHeart className="w-6 h-6 text-pink-500" />,
      path: "/stories",
    },
    {
      title: "Astro Vibe",
      description: "Your personal AI relationship astrologer. Get deep compatibility readings!",
      icon: <Bot className="w-6 h-6 text-pink-500" />,
      path: "/astrology",
      badge: "Popular"
    },
    {
      title: "Message Analyzer",
      description: "Decode their texts, get flirting scores, and perfect replies.",
      icon: <MessageCircleHeart className="w-6 h-6 text-purple-500" />,
      path: "/analyzer",
      badge: "Viral"
    },
    {
      title: "Games & Quizzes",
      description: "Test your bond with quizzes, memory games, and truth or dare.",
      icon: <Gamepad2 className="w-6 h-6 text-rose-500" />,
      path: "/games",
    }
  ];

  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-4xl mx-auto relative px-4 mt-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-100 via-transparent to-transparent dark:from-pink-900/30 blur-3xl rounded-full"></div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="inline-flex items-center justify-center p-4 rounded-full bg-pink-100 dark:bg-pink-500/20 mb-4 shadow-[0_0_30px_rgba(236,72,153,0.3)]"
        >
          <Heart className="w-10 h-10 text-pink-500 fill-pink-500 animate-pulse" />
        </motion.div>
        
        <motion.h1 
          className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          Discover Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            True Love Destiny
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Explore viral crush games, test your compatibility, and find out if they're the one. ✨
        </motion.p>
      </section>

      {/* Compatibility Analysis Section */}
      <section className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="border-pink-100 dark:border-pink-900/30 shadow-2xl shadow-pink-500/5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <Card id="calculator-result" className="text-center space-y-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500"></div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                    {name1} & {name2}
                  </h2>
                  <p className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">Analysis Complete</p>
                </div>
                
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-pink-100 dark:text-pink-900/30"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="282.7"
                      initial={{ strokeDashoffset: 282.7 }}
                      animate={{ strokeDashoffset: 282.7 - (282.7 * result.score) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      className="text-4xl font-bold text-zinc-900 dark:text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {result.score}%
                    </motion.span>
                  </div>
                </div>

                <motion.p 
                  className="text-lg text-zinc-700 dark:text-zinc-300 max-w-md mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {result.message}
                </motion.p>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 mt-8 mb-4">
                  <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center justify-center gap-2">
                    Is this written in the stars? ✨
                  </h3>
                  <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 mb-4">
                    Don't leave it to chance! Discover your true cosmic destiny and uncover hidden relationship dynamics with <span className="font-semibold text-purple-600 dark:text-purple-400">Astro Vibe</span>.
                  </p>
                  <Link to="/astrology">
                    <Button variant="custom" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg shadow-purple-500/30 w-full sm:w-auto">
                      Consult the Stars
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-pink-100 dark:border-pink-900/30" data-html2canvas-ignore>
                  <Button variant="outline" size="sm" onClick={() => setResult(null)} className="border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-600 dark:text-pink-400">
                    <RefreshCw className="w-4 h-4 mr-2" /> Recalculate
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare} className="border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-600 dark:text-pink-400">
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-600 dark:text-pink-400">
                    <Download className="w-4 h-4 mr-2" /> Save
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Features Grid */}
      <section className="px-4 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Viral Features</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium text-lg">The best tools to navigate your love life.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
            >
              <Link to={feature.path} className="block h-full group">
                <Card className="h-full flex flex-col p-8 border-pink-100/50 dark:border-pink-900/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl hover:bg-white dark:hover:bg-zinc-900 hover:border-pink-300 dark:hover:border-pink-700/50 hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-2 transition-all duration-300 relative rounded-[2rem] overflow-hidden">
                  {feature.badge && (
                    <div className="absolute top-6 right-6 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 text-pink-600 dark:text-pink-300 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full shadow-sm">
                      {feature.badge}
                    </div>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-100 dark:border-pink-800/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-500 transition-all">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-grow font-medium">
                    {feature.description}
                  </p>
                  <div className="mt-6 flex items-center text-pink-500 font-bold text-sm">
                    Try it now <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Daily Fortune Teaser */}
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
