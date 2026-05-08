import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Sparkles, RefreshCw, Share2, Download, Heart, Flame, Zap } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback, safeParseJSON } from '../utils/ai';

import { LoadingOverlay } from '../components/LoadingOverlay';

const VIBES = [
  { id: 'romantic', label: 'Romantic', icon: <Heart className="w-4 h-4" /> },
  { id: 'funny', label: 'Funny', icon: <Flame className="w-4 h-4" /> },
  { id: 'chaotic', label: 'Chaotic', icon: <Zap className="w-4 h-4" /> },
];

export function CrushPrediction() {
  const [name, setName] = useState('');
  const [crush, setCrush] = useState('');
  const [vibe, setVibe] = useState('romantic');
  const [prediction, setPrediction] = useState('');
  const [probability, setProbability] = useState(0);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !crush) return;

    setIsPredicting(true);
    setPrediction('');

    try {
      const prompt = `You are Heart Spark, a playful and mystical fortune teller.
      Generate a short, fun, and highly specific crush prediction for ${name} and their crush ${crush}. 
      The vibe should be ${vibe}. 
      
      CRITICAL: You MUST respond ONLY with a valid JSON object. Do not include any markdown formatting like \`\`\`json.
      The JSON must have exactly this structure:
      {
        "prediction": "The short, fun, 1-2 sentence prediction.",
        "probability": 85 // A number from 0 to 100 representing the success probability
      }`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const text = response.text || "";
      try {
        const parsed = safeParseJSON(text);
        setPrediction(parsed.prediction);
        setProbability(parsed.probability);
      } catch (e) {
        console.error("Failed to parse JSON", e, text);
        setPrediction(text || "The stars are clouded right now. Try again later!");
        setProbability(Math.floor(Math.random() * 50) + 40);
      }
    } catch (error) {
      console.error("Failed to generate prediction:", error);
      setPrediction("The stars are clouded right now. Try again later!");
      setProbability(0);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleShare = async () => {
    const text = `My Crush Prediction with ${crush}: "${prediction}" (Probability: ${probability}%) Get yours at Heart Spark!`;
    await shareAsImage('prediction-result', 'Crush Prediction', text);
  };

  const handleDownload = () => {
    downloadAsImage('prediction-result', 'crush-prediction');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <LoadingOverlay isVisible={isPredicting} type="calculator" />
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Crush Prediction <Sparkles className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Enter your names and let Heart Spark reveal your mystical future together.
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-6">
        <form onSubmit={handlePredict} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Taylor"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Crush's Name</label>
              <input
                type="text"
                value={crush}
                onChange={(e) => setCrush(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Alex"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Prediction Vibe</label>
            <div className="grid grid-cols-3 gap-3">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVibe(v.id)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    vibe === v.id
                      ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-pink-300 hover:bg-pink-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-pink-700'
                  }`}
                >
                  {v.icon}
                  <span className="font-medium">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            variant="custom"
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
            disabled={isPredicting || !name || !crush}
          >
            {isPredicting ? (
              <span className="flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                ✨ Consulting the stars...
              </span>
            ) : (
              "Reveal Our Future 🔮"
            )}
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {prediction && !isPredicting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
          >
            <Card id="prediction-result" className="text-center space-y-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 mb-2">
                <Sparkles className="w-8 h-8 text-pink-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
                The Stars Have Spoken
              </h2>
              
              <div className="relative">
                <span className="absolute -top-4 -left-2 text-4xl text-pink-200 dark:text-pink-900/50">"</span>
                <p className="text-xl text-zinc-700 dark:text-zinc-300 font-medium px-6 italic relative z-10">
                  {prediction}
                </p>
                <span className="absolute -bottom-4 -right-2 text-4xl text-pink-200 dark:text-pink-900/50">"</span>
              </div>

              <div className="py-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-grid-pink"></div>
                </div>
                
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] font-black mb-6 relative z-10">Success Probability</p>
                
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-zinc-200 dark:text-zinc-800"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={364.4}
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * probability) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="text-pink-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-zinc-900 dark:text-white">{probability}%</span>
                  </div>
                </div>

                <div className="max-w-xs mx-auto mt-2 relative z-10">
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${probability}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={() => setPrediction('')} className="rounded-2xl h-12 px-6 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button variant="custom" onClick={handleShare} className="rounded-2xl h-12 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 border-none shadow-lg transition-all">
                  <Share2 className="w-4 h-4 mr-2" /> Share Result
                </Button>
                <Button variant="outline" onClick={handleDownload} className="rounded-2xl h-12 px-6 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </Card>

            {/* Cross-Promotion for Astro Vibe */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Card className="bg-indigo-950/20 backdrop-blur-md border border-indigo-800/30 p-8 rounded-[2rem] text-center shadow-lg">
                <h3 className="text-xl font-bold text-indigo-100 mb-2 flex items-center justify-center gap-2">
                  Is this written in the stars? ✨
                </h3>
                <p className="text-sm text-indigo-300/80 mb-6">
                  Discover your true cosmic destiny with <span className="font-bold text-purple-400">Astro Vibe.</span>
                </p>
                <Link to="/astrology">
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white w-full sm:w-auto rounded-2xl h-12 font-bold shadow-lg shadow-purple-500/30 px-8">
                    Consult the Stars
                  </Button>
                </Link>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
