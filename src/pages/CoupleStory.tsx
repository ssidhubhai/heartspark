import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BookOpen, RefreshCw, Share2, Download } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';

const stories = [
  "Once upon a time, [NAME1] and [NAME2] met at a coffee shop. [NAME1] spilled coffee on [NAME2]'s shirt, and instead of getting mad, [NAME2] laughed. They've been inseparable ever since.",
  "[NAME1] was trying to reach a book on the top shelf when [NAME2] stepped in to help. Their hands brushed, and the rest is history.",
  "It was raining heavily. [NAME1] forgot their umbrella, but luckily [NAME2] offered to share theirs. They walked home together, and a beautiful romance blossomed.",
  "[NAME1] and [NAME2] were rivals in a video game tournament. After a fierce match, they realized they made a better team together than against each other.",
  "At a crowded party, [NAME1] and [NAME2] locked eyes across the room. They spent the whole night talking in a quiet corner, ignoring everyone else."
];

export function CoupleStory() {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [story, setStory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1 || !name2) return;

    setIsGenerating(true);
    setStory('');

    setTimeout(() => {
      let randomStory = story;
      while (randomStory === story || !randomStory) {
        randomStory = stories[Math.floor(Math.random() * stories.length)];
      }
      
      const personalizedStory = randomStory.replace(/\[NAME1\]/g, name1).replace(/\[NAME2\]/g, name2);
      setStory(personalizedStory);
      setIsGenerating(false);
    }, 1500);
  };

  const handleShare = async () => {
    const text = `Read the romantic story of ${name1} and ${name2}: "${story}" Get yours at HeartSpark!`;
    await shareAsImage('story-result', 'Couple Story', text);
  };

  const handleDownload = () => {
    downloadAsImage('story-result', 'couple-story');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Couple Story Generator <BookOpen className="w-8 h-8 text-indigo-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Generate a short, romantic story starring you and your crush.
        </p>
      </div>

      <Card>
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
              <input
                type="text"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Crush's Name</label>
              <input
                type="text"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-indigo-500 hover:bg-indigo-600 text-white"
            disabled={isGenerating || !name1 || !name2}
          >
            {isGenerating ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <BookOpen className="w-6 h-6" />
              </motion.div>
            ) : (
              "Generate Story"
            )}
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {story && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
          >
            <Card id="story-result" className="text-center space-y-6 bg-gradient-to-b from-white to-indigo-50 dark:from-zinc-900 dark:to-zinc-900 border-indigo-200 dark:border-zinc-800">
              <div className="inline-block p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-2">
                <BookOpen className="w-8 h-8 text-indigo-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                A Tale of {name1} & {name2}
              </h2>
              
              <p className="text-xl text-slate-700 dark:text-slate-300 font-medium px-4 italic leading-relaxed font-serif">
                "{story}"
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={() => setStory('')}>
                  <RefreshCw className="w-4 h-4 mr-2" /> New Story
                </Button>
                <Button onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Share Story
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
