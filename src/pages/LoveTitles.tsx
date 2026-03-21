import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Wand2, RefreshCw, Share2, Download, Sparkles } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';

export function LoveTitles() {
  const [name, setName] = useState('');
  const [trait, setTrait] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsGenerating(true);
    setTitle('');

    try {
      const prompt = `You are Heart Spark, a playful and slightly dramatic romantic title generator.
      Generate a funny, slightly dramatic, and highly specific "official romantic title" for someone named ${name}.
      ${trait ? `Their main personality trait or habit is: ${trait}.` : 'Make it completely random.'}
      The title should be formatted like "Chief Flirting Officer" or "Certified Overthinker of Texts".
      Keep it under 6 words. Do not include any other text, just the title.`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const result = response.text || "Certified Mystery";
      setTitle(result.replace(/["']/g, '').trim());
    } catch (error) {
      console.error("Failed to generate title:", error);
      setTitle("Certified Mystery");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const text = `My official love title is: "${title}"! Get yours at Heart Spark!`;
    await shareAsImage('title-result', 'Love Title', text);
  };

  const handleDownload = () => {
    downloadAsImage('title-result', 'love-title');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Funny Love Titles <Wand2 className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Discover your official romantic title based on your unique vibe.
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-6">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Jordan"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">A quirky trait or habit (Optional)</label>
              <input
                type="text"
                value={trait}
                onChange={(e) => setTrait(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Replies 3 business days later"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            variant="custom"
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
            disabled={isGenerating || !name}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                ✨ Crafting your title...
              </span>
            ) : (
              "Generate My Title 👑"
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
            <Card id="title-result" className="text-center space-y-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 mb-2 mt-4">
                <Wand2 className="w-8 h-8 text-pink-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
                {name}, you are officially...
              </h2>
              
              <div className="py-8 bg-pink-50/50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/20">
                <p className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 px-4 leading-tight">
                  "{title}"
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4" data-html2canvas-ignore>
                <Button variant="outline" onClick={() => setTitle('')} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button variant="custom" onClick={handleShare} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
                  <Share2 className="w-4 h-4 mr-2" /> Share Result
                </Button>
                <Button variant="outline" onClick={handleDownload} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
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
