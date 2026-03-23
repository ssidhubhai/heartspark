import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Sparkles, RefreshCw, Share2, Download, Heart, Flame, Zap } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';

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
      Keep it under 2 sentences.
      Do NOT include the probability score in the text, just the prediction.`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const result = response.text || "The stars are clouded right now. Try again later!";
      
      // Generate a random probability based on the vibe
      let minProb = 40;
      let maxProb = 99;
      if (vibe === 'chaotic') {
        minProb = 10;
        maxProb = 100;
      } else if (vibe === 'romantic') {
        minProb = 70;
        maxProb = 99;
      }
      const randomProb = Math.floor(Math.random() * (maxProb - minProb + 1)) + minProb;
      
      setPrediction(result);
      setProbability(randomProb);
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

              <div className="py-6 bg-pink-50/50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/20">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-bold mb-2">Probability of happening</p>
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                  {probability}%
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={() => setPrediction('')} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button variant="custom" onClick={handleShare} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
                  <Share2 className="w-4 h-4 mr-2" /> Share Result
                </Button>
                <Button variant="outline" onClick={handleDownload} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>

              {/* Cross-Promotion for Astro Vibe Check */}
              <div className="mt-8 pt-6 border-t border-pink-100 dark:border-pink-900/30" data-html2canvas-ignore>
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-2xl p-6 border border-pink-200/50 dark:border-pink-800/30 text-center">
                  <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-2 flex items-center justify-center gap-2">
                    Want a deeper connection analysis? <Sparkles className="w-5 h-5 text-purple-500" />
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    Don't leave it to chance! Discover your true cosmic destiny and uncover hidden relationship dynamics with <span className="font-semibold text-purple-600 dark:text-purple-400">Astro Vibe</span>.
                  </p>
                  <Link to="/astrology">
                    <Button variant="custom" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg shadow-purple-500/30">
                      Consult the Stars
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
