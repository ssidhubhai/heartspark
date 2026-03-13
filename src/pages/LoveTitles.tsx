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
          Funny Love Titles <Wand2 className="w-8 h-8 text-purple-500" />
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
              className="w-full h-12 px-4 rounded-xl border-2 border-purple-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 outline-none transition-all"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
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
            <Card id="title-result" className="text-center space-y-6 bg-gradient-to-b from-white to-purple-50 dark:from-slate-800 dark:to-slate-800/50 border-purple-200 dark:border-purple-900/50">
              <div className="inline-block p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-2">
                <Wand2 className="w-8 h-8 text-purple-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {name}, you are officially a...
              </h2>
              
              <p className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500 py-4">
                "{title}"
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={() => setTitle('')}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button onClick={handleShare} className="bg-purple-500 hover:bg-purple-600 border-none">
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
