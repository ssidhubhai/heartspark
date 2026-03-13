import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, MessageCircleHeart, Gamepad2, Star, Flame, MessageCircle, Brain, Mail, Users, Bot, Share2, RefreshCw, Download, BookOpen } from 'lucide-react';
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
        message = "Self-love is the best love! You're perfect just the way you are. 💖";
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

        // Fun easter eggs for specific names (optional, but adds virality)
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

        if (score > 90) message = "Soulmates! The classic algorithm says you're meant to be. 💖";
        else if (score > 80) message = "Sparks are flying! A very strong connection here. ✨";
        else if (score > 70) message = "There's definitely something special between you two! 😉";
        else if (score > 50) message = "A solid match! With a little effort, this could be great. 🌟";
        else message = "The numbers are low, but love can always defy the odds! 🌱";
      }

      setResult({ score, message });
      setIsCalculating(false);
      
      if (score > 75) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ff69b4', '#ff1493', '#ffc0cb', '#8b5cf6']
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
    }, 1500);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `My love compatibility with ${name2} is ${result.score}%! "${result.message}"`;
    await shareAsImage('calculator-result', 'Love Calculator Result', text);
  };

  const handleDownload = () => {
    downloadAsImage('calculator-result', 'love-calculator-result');
  };

  const features = [
    {
      title: "Perfect Reply AI",
      description: "Never get stuck on read. Paste a text, and our AI generates the perfect flirty or funny reply.",
      icon: <MessageCircle className="w-6 h-6 text-indigo-500" />,
      path: "/tools/perfect-reply",
      color: "bg-indigo-100 dark:bg-indigo-900/30",
      badge: "Most Useful 🚀"
    },
    {
      title: "Community Stories",
      description: "Read and react to dramatic crush stories from around the world.",
      icon: <Users className="w-6 h-6 text-emerald-500" />,
      path: "/stories",
      color: "bg-emerald-100 dark:bg-emerald-900/30",
      badge: "Trending 🔥"
    },
    {
      title: "Couple Story Maker",
      description: "Generate a cute, personalized story about you and your crush.",
      icon: <BookOpen className="w-6 h-6 text-teal-500" />,
      path: "/tools/story",
      color: "bg-teal-100 dark:bg-teal-900/30",
      badge: "New ✨"
    },
    {
      title: "LoveGPT",
      description: "Talk to your personal AI relationship coach. Ask advice and get help.",
      icon: <Bot className="w-6 h-6 text-pink-500" />,
      path: "/love-gpt",
      color: "bg-pink-100 dark:bg-pink-900/30",
      badge: "Popular 💖"
    },
    {
      title: "Text Analyzer",
      description: "Confused by their text? Let AI decode what they really mean.",
      icon: <Brain className="w-6 h-6 text-indigo-500" />,
      path: "/analyzer",
      color: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      title: "Crush Quiz",
      description: "Are you in the friend zone or is it true love? Take the test!",
      icon: <Sparkles className="w-6 h-6 text-purple-500" />,
      path: "/quiz",
      color: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Couple Games",
      description: "Play fun mini-games together and test your bond.",
      icon: <Gamepad2 className="w-6 h-6 text-blue-500" />,
      path: "/games",
      color: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Flirting Test",
      description: "Are you a smooth talker or a shy potato? Find out now.",
      icon: <Flame className="w-6 h-6 text-orange-500" />,
      path: "/flirting-test",
      color: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Astrology AI",
      description: "Get an advanced astrological reading based on your birth details.",
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      path: "/astrology",
      color: "bg-yellow-100 dark:bg-yellow-900/30",
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-200/50 via-transparent to-transparent dark:from-pink-900/20 blur-3xl rounded-full"></div>
        
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center p-6 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 mb-4 shadow-xl shadow-pink-200/50 dark:shadow-none border border-white/50 dark:border-white/10"
        >
          <Heart className="w-16 h-16 text-pink-500 fill-pink-500 drop-shadow-md" />
        </motion.div>
        
        <motion.h1 
          className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Discover Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 animate-gradient-x">
            True Love Destiny
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Explore viral crush games, test your compatibility, and find out if they're the one. ✨
        </motion.p>
      </section>

      {/* Love Calculator Section (Replaced the single input) */}
      <section className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-pink-200 dark:border-pink-900/50 shadow-xl shadow-pink-100/50 dark:shadow-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <Heart className="w-6 h-6 text-pink-500 fill-pink-500" /> Love Calculator
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Uses the classic "TRUE LOVE" paper-and-pencil algorithm!</p>
            </div>
            
            <form onSubmit={calculateLove} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
                  <input
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                    placeholder="e.g. Alex"
                    required
                  />
                </div>
                
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-pink-500 text-white shadow-lg mt-3">
                  <Heart className="w-5 h-5 fill-current" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Crush's Name</label>
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                    placeholder="e.g. Taylor"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg"
                disabled={isCalculating || !name1 || !name2}
              >
                {isCalculating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Heart className="w-6 h-6" />
                  </motion.div>
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="mt-8"
            >
              <Card id="calculator-result" className="text-center space-y-6 bg-gradient-to-b from-white to-pink-50 dark:from-slate-800 dark:to-slate-800/50 border-pink-200 dark:border-pink-900/50">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {name1} & {name2}
                </h2>
                
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-pink-100 dark:text-slate-700"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className="text-pink-500"
                      strokeDasharray="251.2"
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 - (251.2 * result.score) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      className="text-5xl font-extrabold text-pink-600 dark:text-pink-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                    >
                      {result.score}%
                    </motion.span>
                  </div>
                </div>

                <motion.p 
                  className="text-xl text-slate-700 dark:text-slate-300 font-medium px-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  {result.message}
                </motion.p>

                <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                  <Button variant="outline" onClick={() => setResult(null)}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Recalculate
                  </Button>
                  <Button onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" /> Share Result
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Features Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Popular Games</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link to={feature.path} className="block h-full relative">
                <Card className="h-full flex flex-col hover:border-pink-300 dark:hover:border-pink-700 transition-colors relative overflow-hidden">
                  {feature.badge && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      {feature.badge}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 flex-grow">
                    {feature.description}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Daily Fortune Teaser */}
      <section>
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-bold">Daily Love Fortune</h2>
              <p className="text-pink-100 max-w-lg text-lg">
                What do the stars say about your love life today? Get your personalized daily fortune and romantic advice.
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="lg" 
              className="bg-white text-pink-600 hover:bg-pink-50 w-full md:w-auto"
              onClick={() => navigate('/tools/fortune')}
            >
              Reveal Fortune
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
