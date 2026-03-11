import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Share2, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { downloadAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';

export function LoveCalculator() {
  const [searchParams] = useSearchParams();
  const initialCrush = searchParams.get('crush') || '';
  
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState(initialCrush);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{ score: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateLove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;

    setIsCalculating(true);
    setResult(null);
    setError(null);

    try {
      // Try to use the AI for a personalized reading
      const prompt = `Calculate the love compatibility between "${name1}" and "${name2}". 
      Return ONLY a JSON object with two fields:
      1. "score": a number between 1 and 100 representing their compatibility percentage. Make it somewhat random but based on the names.
      2. "message": A short, fun, 1-2 sentence explanation of why they got this score.
      Do not include markdown formatting or backticks, just the raw JSON.`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "{}";
      const data = JSON.parse(text);
      
      const score = data.score || Math.floor(Math.random() * 100) + 1;
      const message = data.message || "You two have a unique connection!";

      setResult({ score, message });
      
      if (score > 75) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff69b4', '#ff1493', '#ffc0cb']
        });
      }
    } catch (err: any) {
      console.error("AI Calculation Error:", err);
      
      // Check if it's an API key error
      if (err.message?.includes('API key') || err.message?.includes('No Gemini API keys')) {
        setError("AI features are currently unavailable because the API key is missing or invalid. Please check your .env file.");
      } else {
        setError("The AI is currently taking a nap. We used our backup math algorithm instead!");
      }

      // Fallback to deterministic algorithm so the user still gets a result
      const combined = (name1.toLowerCase() + name2.toLowerCase()).replace(/[^a-z]/g, '');
      let sum = 0;
      for (let i = 0; i < combined.length; i++) {
        sum += combined.charCodeAt(i);
      }
      const today = new Date().toDateString();
      for (let i = 0; i < today.length; i++) {
        sum += today.charCodeAt(i);
      }
      const score = (sum % 100) + 1;
      
      let message = "";
      if (score > 90) message = "Soulmates! You two are meant to be together forever. 💖";
      else if (score > 75) message = "Sparks are flying! There's a very strong connection here. ✨";
      else if (score > 50) message = "There's potential! Maybe it's time to make a move? 😉";
      else if (score > 25) message = "Friendzone alert! But hey, best friends make great couples too. 🤷‍♀️";
      else message = "Oof. Maybe look elsewhere? Or prove the calculator wrong! 💔";

      setResult({ score, message });
      
      if (score > 75) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff69b4', '#ff1493', '#ffc0cb']
        });
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `My love compatibility with ${name2} is ${result.score}%! "${result.message}" Check yours at HeartSpark! ${window.location.href}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Love Calculator Result',
          text,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    }
  };

  const handleDownload = () => {
    downloadAsImage('calculator-result', 'love-calculator-result');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
          Advanced Love Calculator
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Enter two names to discover your true compatibility score.
        </p>
      </div>

      <Card>
        <form onSubmit={calculateLove} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
              <input
                type="text"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
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
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
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

      <AnimatePresence>
        {error && !isCalculating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800 dark:text-orange-200">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !isCalculating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
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
    </div>
  );
}
