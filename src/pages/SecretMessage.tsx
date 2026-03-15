import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Copy, RefreshCw, Send, Download } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';

const messages = [
  "I can't stop smiling when I think about you.",
  "You're the reason I check my phone every 5 minutes.",
  "I have a huge crush on you, but I'm too shy to say it.",
  "You looked really cute today.",
  "I wish I had the courage to tell you how I feel.",
  "Every time you laugh, my heart skips a beat.",
  "You're my favorite notification.",
  "I think we'd make a really cute couple.",
  "I've been trying to find the right words, but 'I like you' will have to do.",
  "You're the best part of my day."
];

export function SecretMessage() {
  const [message, setMessage] = useState(messages[0]);
  const [copied, setCopied] = useState(false);

  const generateMessage = () => {
    let newMessage = message;
    while (newMessage === message) {
      newMessage = messages[Math.floor(Math.random() * messages.length)];
    }
    setMessage(newMessage);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `"${message}" - Sent via HeartSpark!`;
    await shareAsImage('secret-message', 'Secret Message', text);
  };

  const handleDownload = () => {
    downloadAsImage('secret-message', 'secret-message');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
          Secret Message Generator
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Generate cute anonymous messages to send to your crush.
        </p>
      </div>

      <Card id="secret-message" className="text-center space-y-8 bg-gradient-to-br from-indigo-50 to-zinc-50 dark:from-slate-800 dark:to-slate-800/80 border-indigo-200 dark:border-indigo-900/50">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-[150px] flex items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-inner border border-indigo-100 dark:border-slate-700"
        >
          <p className="text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-200 italic font-serif">
            "{message}"
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4" data-html2canvas-ignore>
          <Button variant="outline" onClick={generateMessage} className="flex-1 min-w-[140px]">
            <RefreshCw className="w-5 h-5 mr-2" /> Generate New
          </Button>
          <Button onClick={copyToClipboard} className="flex-1 min-w-[140px]" variant={copied ? "secondary" : "primary"}>
            <Copy className="w-5 h-5 mr-2" /> {copied ? "Copied!" : "Copy Text"}
          </Button>
          <Button onClick={handleShare} className="flex-1 min-w-[140px] bg-indigo-500 hover:bg-indigo-600 border-none text-white">
            <Send className="w-5 h-5 mr-2" /> Send via App
          </Button>
          <Button variant="outline" onClick={handleDownload} className="flex-1 min-w-[140px]">
            <Download className="w-5 h-5 mr-2" /> Download
          </Button>
        </div>
      </Card>
      
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
        <p>Tip: Send this anonymously using NGL, Tellonym, or just text it from an unknown number!</p>
      </div>
    </div>
  );
}
