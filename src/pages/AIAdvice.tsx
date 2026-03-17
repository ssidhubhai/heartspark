import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MessageSquareHeart, Sparkles, Share2, Download, Loader2, Lightbulb } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';
import Markdown from 'react-markdown';

export function AIAdvice() {
  const [names, setNames] = useState('');
  const [topic, setTopic] = useState('');
  const [advice, setAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names || !topic) return;

    setIsLoading(true);
    setAdvice('');

    try {
      const prompt = `
        You are Heart Spark, an expert dating coach and relationship guru.
        The user (${names}) is asking for advice on this topic: "${topic}".
        
        Please provide thoughtful, practical, and slightly playful advice.
        Format your response in markdown. Use bullet points if helpful.
        Keep it concise but impactful.
      `;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAdvice(response.text || "Oops! Heart Spark is currently taking a nap. Try again later! 😴");
    } catch (error) {
      console.error(error);
      setAdvice("Oops! Heart Spark is currently taking a nap. Try again later! 😴");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const text = `Love Advice for ${names} about ${topic} from Heart Spark!`;
    await shareAsImage('advice-result', 'AI Love Advice', text);
  };

  const handleDownload = () => {
    downloadAsImage('advice-result', 'love-advice');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Heart Spark Coach <MessageSquareHeart className="w-8 h-8 text-pink-500 animate-pulse" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Get cute, playful, and practical relationship advice from your personal AI love guru.
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30">
        <form onSubmit={getAdvice} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Who is this for?</label>
              <input
                type="text"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. Me and Alex, or just Me"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">What do you need advice on?</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
                placeholder="e.g. How to ask them out, First date ideas"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] transition-all flex items-center justify-center gap-2"
            disabled={isLoading || !names || !topic}
          >
            {isLoading ? (
              <>✨ Consulting the love guru... <Loader2 className="w-5 h-5 animate-spin" /></>
            ) : (
              <>Ask Heart Spark <Sparkles className="w-5 h-5" /></>
            )}
          </Button>
        </form>
      </Card>

      {!advice && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-pink-50/50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/20">
            <h3 className="font-semibold text-pink-600 dark:text-pink-400 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Try asking about...
            </h3>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>"We've been dating for 3 months, what's a good anniversary gift?"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>"How do I tell if they are just being friendly or flirting?"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>"What are some fun, low-pressure first date ideas?"</span>
              </li>
            </ul>
          </Card>
          <Card className="p-6 bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
            <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Heart Spark's Specialty
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Heart Spark analyzes your specific situation to give you tailored advice that is:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-white dark:bg-zinc-800 rounded-md text-xs border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">Practical</span>
              <span className="px-2 py-1 bg-white dark:bg-zinc-800 rounded-md text-xs border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">Empathetic</span>
              <span className="px-2 py-1 bg-white dark:bg-zinc-800 rounded-md text-xs border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">Modern</span>
              <span className="px-2 py-1 bg-white dark:bg-zinc-800 rounded-md text-xs border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">Fun</span>
            </div>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {advice && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
          >
            <Card id="advice-result" className="space-y-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-pink-100 dark:border-pink-900/30">
                <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-pink-500" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
                  Heart Spark's Advice
                </h2>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed markdown-body">
                  <Markdown>{advice}</Markdown>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-6 border-t border-pink-100 dark:border-pink-900/30" data-html2canvas-ignore>
                <Button onClick={handleShare} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
                  <Share2 className="w-4 h-4 mr-2" /> Share Advice
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
