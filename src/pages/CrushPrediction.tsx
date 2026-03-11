import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Star, RefreshCw, Share2 } from 'lucide-react';

const predictions = [
  "They will text you exactly at 11:11 PM tonight.",
  "You'll accidentally bump into them this week.",
  "They are currently stalking your Instagram.",
  "They told their best friend about you.",
  "You're going to have a very awkward but cute interaction soon.",
  "They think you have a great smile.",
  "You will end up wearing matching colors by accident.",
  "They are waiting for you to make the first move.",
  "You'll catch them staring at you when you're not looking.",
  "They secretly saved that one picture of you."
];

export function CrushPrediction() {
  const [name, setName] = useState('');
  const [crush, setCrush] = useState('');
  const [prediction, setPrediction] = useState('');
  const [probability, setProbability] = useState(0);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !crush) return;

    setIsPredicting(true);
    setPrediction('');

    setTimeout(() => {
      const randomPrediction = predictions[Math.floor(Math.random() * predictions.length)];
      const randomProb = Math.floor(Math.random() * 60) + 40; // 40-99%
      
      setPrediction(randomPrediction);
      setProbability(randomProb);
      setIsPredicting(false);
    }, 1500);
  };

  const handleShare = async () => {
    const text = `My Crush Prediction with ${crush}: "${prediction}" (Probability: ${probability}%) Get yours at HeartSpark!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Crush Prediction', text, url: window.location.href });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Crush Prediction <Star className="w-8 h-8 text-yellow-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Enter your names to get a mystical prediction about your future together.
        </p>
      </div>

      <Card>
        <form onSubmit={handlePredict} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-yellow-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Crush's Name</label>
              <input
                type="text"
                value={crush}
                onChange={(e) => setCrush(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-yellow-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 outline-none transition-all"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
            disabled={isPredicting || !name || !crush}
          >
            {isPredicting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Star className="w-6 h-6" />
              </motion.div>
            ) : (
              "Reveal Prediction"
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
            <Card className="text-center space-y-6 bg-gradient-to-b from-white to-yellow-50 dark:from-slate-800 dark:to-slate-800/50 border-yellow-200 dark:border-yellow-900/50">
              <div className="inline-block p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-2">
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                The Stars Have Spoken
              </h2>
              
              <p className="text-xl text-slate-700 dark:text-slate-300 font-medium px-4 italic">
                "{prediction}"
              </p>

              <div className="py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-2">Probability of happening</p>
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">
                  {probability}%
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={() => setPrediction('')}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button onClick={handleShare} className="bg-yellow-500 hover:bg-yellow-600 border-none">
                  <Share2 className="w-4 h-4 mr-2" /> Share Result
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
