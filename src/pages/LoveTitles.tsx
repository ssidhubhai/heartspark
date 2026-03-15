import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Wand2, RefreshCw, Share2, Download } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';

const titles = [
  "Certified Heart Thief",
  "Professional Overthinker",
  "Hopeless Romantic",
  "Chief Flirting Officer",
  "Master of Mixed Signals",
  "Delusional Daydreamer",
  "CEO of Friendzone",
  "Secret Admirer Extraordinaire",
  "Smooth Operator",
  "Clumsy Cupid"
];

export function LoveTitles() {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsGenerating(true);
    setTitle('');

    setTimeout(() => {
      let randomTitle = title;
      while (randomTitle === title) {
        randomTitle = titles[Math.floor(Math.random() * titles.length)];
      }
      
      setTitle(randomTitle);
      setIsGenerating(false);
    }, 1000);
  };

  const handleShare = async () => {
    const text = `My official love title is: "${title}"! Get yours at HeartSpark!`;
    await shareAsImage('title-result', 'Love Title', text);
  };

  const handleDownload = () => {
    downloadAsImage('title-result', 'love-title');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Funny Love Titles <Wand2 className="w-8 h-8 text-indigo-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Discover your official romantic title based on your vibe.
        </p>
      </div>

      <Card>
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-indigo-500 hover:bg-indigo-600 text-white"
            disabled={isGenerating || !name}
          >
            {isGenerating ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Wand2 className="w-6 h-6" />
              </motion.div>
            ) : (
              "Generate Title"
            )}
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {title && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
          >
            <Card id="title-result" className="text-center space-y-6 bg-gradient-to-b from-white to-indigo-50 dark:from-zinc-900 dark:to-zinc-900 border-indigo-200 dark:border-zinc-800">
              <div className="inline-block p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-2">
                <Wand2 className="w-8 h-8 text-indigo-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {name}, you are officially a...
              </h2>
              
              <p className="text-3xl md:text-4xl font-extrabold text-indigo-500 py-4">
                "{title}"
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={() => setTitle('')}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
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
