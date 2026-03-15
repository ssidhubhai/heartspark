import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, MessageCircleHeart, Gamepad2, Star, Flame, MessageCircle, Brain, Mail, Users, Bot, Share2, RefreshCw, Download, BookOpen, ArrowRight } from 'lucide-react';
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
          colors: ['#4f46e5', '#818cf8', '#c7d2fe'] // Indigo palette
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
      title: "Perfect Reply AI",
      description: "Generate context-aware, intelligent responses to any message.",
      icon: <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      path: "/tools/perfect-reply",
      badge: "Essential"
    },
    {
      title: "Community Stories",
      description: "Read and engage with relationship experiences from the community.",
      icon: <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      path: "/stories",
      badge: "Trending"
    },
    {
      title: "Couple Story Maker",
      description: "Generate personalized narratives based on your relationship dynamics.",
      icon: <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      path: "/tools/story",
      badge: "New"
    },
    {
      title: "LoveGPT",
      description: "Consult your personal AI relationship advisor for objective guidance.",
      icon: <Bot className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      path: "/love-gpt",
      badge: "Popular"
    },
    {
      title: "Text Analyzer",
      description: "Decode subtext and analyze the sentiment of complex messages.",
      icon: <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
      path: "/analyzer",
    },
    {
      title: "Relationship Quiz",
      description: "Assess your relationship status through structured psychological quizzes.",
      icon: <Sparkles className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />,
      path: "/quiz",
    },
    {
      title: "Couple Games",
      description: "Interactive exercises designed to strengthen communication and bonding.",
      icon: <Gamepad2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      path: "/games",
    },
    {
      title: "Communication Test",
      description: "Evaluate your interpersonal communication and flirting skills.",
      icon: <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
      path: "/flirting-test",
    },
    {
      title: "Astrology AI",
      description: "Receive professional astrological insights based on precise birth data.",
      icon: <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      path: "/astrology",
    },
  ];

  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto relative px-4">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-transparent to-transparent dark:from-zinc-900/50 blur-3xl rounded-full"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 mb-6 border border-zinc-200 dark:border-zinc-800"
        >
          <Heart className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
        </motion.div>
        
        <motion.h1 
          className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          Navigate Relationships <br />
          <span className="text-zinc-500 dark:text-zinc-400">
            With Intelligence.
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          A suite of advanced tools designed to analyze compatibility, improve communication, and provide objective relationship insights.
        </motion.p>
      </section>

      {/* Compatibility Analysis Section */}
      <section className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                Compatibility Analysis
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Enter two names to calculate algorithmic compatibility.</p>
            </div>
            
            <form onSubmit={calculateLove} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Person 1</label>
                  <input
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Enter name"
                    required
                  />
                </div>
                
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 mt-3">
                  <span className="text-xs font-medium">&</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Person 2</label>
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Enter name"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900"
                disabled={isCalculating || !name1 || !name2}
              >
                {isCalculating ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
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
              <Card id="calculator-result" className="text-center space-y-8 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 p-8">
                <div className="space-y-2">
                  <h2 className="text-xl font-medium text-zinc-900 dark:text-white">
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
                      className="text-zinc-200 dark:text-zinc-800"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="text-indigo-600 dark:text-indigo-500"
                      strokeDasharray="282.7"
                      initial={{ strokeDashoffset: 282.7 }}
                      animate={{ strokeDashoffset: 282.7 - (282.7 * result.score) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
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

                <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800" data-html2canvas-ignore>
                  <Button variant="outline" size="sm" onClick={() => setResult(null)} className="border-zinc-200 dark:border-zinc-800">
                    <RefreshCw className="w-4 h-4 mr-2" /> Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare} className="border-zinc-200 dark:border-zinc-800">
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="border-zinc-200 dark:border-zinc-800">
                    <Download className="w-4 h-4 mr-2" /> Save
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Features Grid */}
      <section className="px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Application Suite</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Explore our collection of relationship tools.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
            >
              <Link to={feature.path} className="block h-full group">
                <Card className="h-full flex flex-col p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 relative">
                  {feature.badge && (
                    <div className="absolute top-6 right-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md">
                      {feature.badge}
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed flex-grow">
                    {feature.description}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Daily Fortune Teaser */}
      <section className="px-4 max-w-7xl mx-auto pb-12">
        <Card className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-none overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-10">
            <div className="space-y-3 text-center md:text-left">
              <h2 className="text-2xl font-semibold">Daily Insights</h2>
              <p className="text-zinc-400 dark:text-zinc-600 max-w-lg">
                Receive your personalized daily reading and actionable relationship advice based on current astrological alignments.
              </p>
            </div>
            <Button 
              className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 w-full md:w-auto whitespace-nowrap"
              onClick={() => navigate('/tools/fortune')}
            >
              View Today's Reading <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
