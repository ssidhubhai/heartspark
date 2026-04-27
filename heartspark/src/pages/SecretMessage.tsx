import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Copy, RefreshCw, Send, Download, Sparkles, Heart, Flame, Ghost } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';
import { generateContentWithFallback } from '../utils/ai';

const VIBES = [
  { id: 'sweet', label: 'Sweet', icon: <Heart className="w-4 h-4" /> },
  { id: 'flirty', label: 'Flirty', icon: <Flame className="w-4 h-4" /> },
  { id: 'mysterious', label: 'Mysterious', icon: <Ghost className="w-4 h-4" /> },
];

export function SecretMessage() {
  const [message, setMessage] = useState("I can't stop smiling when I think about you.");
  const [vibe, setVibe] = useState('sweet');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  const loadingMessages = [
    "Mixing emotions...",
    "Adding a dash of charm...",
    "Whispering to the stars...",
    "Consulting the love lab...",
    "Polishing the words...",
    "Sealing with a spark..."
  ];

  const generateMessage = async () => {
    setIsGenerating(true);
    setLoadingStep(0);
    
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingMessages.length);
    }, 800);

    try {
      const prompt = `You are Heart Spark, a creative and romantic message generator.
      Generate a short, anonymous secret message to send to a crush. 
      The vibe should be ${vibe}. 
      Keep it under 2 sentences. Make it sound natural and intriguing.
      Do not include any quotes or extra text.`;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const result = response.text || "You've been on my mind a lot lately.";
      const cleanedMessage = result.replace(/["']/g, '').trim();
      setMessage(cleanedMessage);
      setHistory(prev => [cleanedMessage, ...prev].slice(0, 5));
      setCopied(false);
    } catch (error) {
      console.error("Failed to generate message:", error);
      setMessage("You've been on my mind a lot lately.");
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `"${message}" - Sent via Heart Spark!`;
    await shareAsImage('secret-message', 'Secret Message', text);
  };

  const handleDownload = () => {
    downloadAsImage('secret-message', 'secret-message');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">
          Secret Message Generator
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Generate cute, anonymous messages to send to your crush.
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Choose a Vibe</label>
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
            onClick={generateMessage}
            disabled={isGenerating}
            variant="custom"
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="font-bold"
                  >
                    {loadingMessages[loadingStep]}
                  </motion.span>
                </AnimatePresence>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Generate New Message
              </span>
            )}
          </Button>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card id="secret-message" className="text-center space-y-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
            
            <div className="min-h-[150px] flex items-center justify-center p-8 bg-pink-50/50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/20 relative">
              <span className="absolute top-4 left-4 text-4xl text-pink-200 dark:text-pink-900/50 font-serif">"</span>
              <p className="text-2xl md:text-3xl font-medium text-zinc-800 dark:text-zinc-200 italic font-serif relative z-10 leading-relaxed">
                {message}
              </p>
              <span className="absolute bottom-4 right-4 text-4xl text-pink-200 dark:text-pink-900/50 font-serif">"</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-4 border-t border-pink-100 dark:border-zinc-800" data-html2canvas-ignore>
              <Button onClick={copyToClipboard} className="flex-1 min-w-[140px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border-none h-12 rounded-xl font-bold" variant="custom">
                <Copy className="w-5 h-5 mr-2" /> {copied ? "Copied!" : "Copy Text"}
              </Button>
              <Button variant="custom" onClick={handleShare} className="flex-1 min-w-[140px] bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none h-12 rounded-xl font-bold shadow-lg shadow-pink-500/20">
                <Send className="w-5 h-5 mr-2" /> Share Image
              </Button>
              <Button variant="custom" onClick={handleDownload} className="flex-1 min-w-[140px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-none h-12 rounded-xl font-bold">
                <Download className="w-5 h-5 mr-2" /> Download
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {history.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest text-center">Recent Generations</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl border border-pink-100/50 dark:border-pink-900/20 flex items-center justify-between gap-4 group"
              >
                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate italic">"{h}"</p>
                <button 
                  onClick={() => {
                    setMessage(h);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="shrink-0 p-2 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8 bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl border border-pink-100 dark:border-pink-900/30">
        <p>💡 <strong>Tip:</strong> Send this anonymously using NGL, Tellonym, or just text it from an unknown number!</p>
      </div>
    </div>
  );
}
