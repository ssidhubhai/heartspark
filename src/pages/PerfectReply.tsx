import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Sparkles, Copy, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { generateContentWithFallback } from '../utils/ai';

export function PerfectReply() {
  const [receivedMessage, setReceivedMessage] = useState('');
  const [context, setContext] = useState('crush');
  const [vibe, setVibe] = useState('flirty');
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateReplies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedMessage.trim()) return;

    setLoading(true);
    setReplies([]);
    setCopiedIndex(null);

    const prompt = `
      You are an expert dating coach and texting master. 
      I received this text message: "${receivedMessage}"
      My relationship to this person is: ${context}
      I want my reply to have this vibe: ${vibe}
      
      Generate exactly 3 perfect, natural-sounding text message replies I could send back. 
      Make them realistic, modern, and highly effective. Do not use hashtags.
      
      Format the output EXACTLY like this, with each reply on a new line starting with a dash:
      - [First reply option]
      - [Second reply option]
      - [Third reply option]
    `;

    try {
      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || '';
      // Parse the bullet points
      const parsedReplies = text
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

      if (parsedReplies.length > 0) {
        setReplies(parsedReplies);
      } else {
        // Fallback if parsing fails
        setReplies([
          "I'm not sure how to reply to that, maybe just be honest!",
          "Haha, that's interesting.",
          "Let me think about that and get back to you."
        ]);
      }
    } catch (error) {
      console.error("Error generating replies:", error);
      setReplies(["Sorry, my AI brain is a bit overwhelmed right now. Try again!"]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"
        >
          <MessageSquare className="w-8 h-8 text-indigo-500" />
        </motion.div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
          Perfect Reply Generator
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Never get stuck on read again. Paste the text you received, and our AI will craft the perfect response based on the vibe you want.
        </p>
      </div>

      <Card className="p-6 md:p-8 border-indigo-100 dark:border-indigo-900/30 shadow-xl shadow-indigo-100/20 dark:shadow-none">
        <form onSubmit={generateReplies} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              What did they say?
            </label>
            <textarea
              value={receivedMessage}
              onChange={(e) => setReceivedMessage(e.target.value)}
              placeholder="e.g., 'Hey, what are you up to later?' or paste a Tinder opener..."
              className="w-full h-24 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none resize-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Who is this?
              </label>
              <select
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none transition-all appearance-none"
              >
                <option value="crush">My Crush</option>
                <option value="tinder match">Dating App Match (Tinder/Bumble)</option>
                <option value="partner">My Boyfriend / Girlfriend</option>
                <option value="ex">My Ex</option>
                <option value="friend">A Friend (but I want to flirt)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                What's the vibe?
              </label>
              <select
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none transition-all appearance-none"
              >
                <option value="flirty">Flirty & Playful 😏</option>
                <option value="funny">Funny & Witty 😂</option>
                <option value="playing it cool">Playing it Cool / Mysterious 🧊</option>
                <option value="direct">Direct & Confident 🎯</option>
                <option value="sarcastic">Sarcastic & Teasing 🙃</option>
                <option value="apologetic">Apologetic & Sweet 🥺</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !receivedMessage.trim()}
            className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            {loading ? (
              <>
                Crafting perfect replies... <Loader2 className="w-5 h-5 animate-spin" />
              </>
            ) : (
              <>
                Generate Replies <Sparkles className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </Card>

      {replies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 px-2">
            <ArrowRight className="w-5 h-5 text-indigo-500" /> Choose your reply:
          </h3>
          <div className="grid gap-4">
            {replies.map((reply, index) => (
              <Card key={index} className="p-4 flex items-start justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                <p className="text-slate-800 dark:text-slate-200 text-lg font-medium leading-relaxed pt-1">
                  "{reply}"
                </p>
                <button
                  onClick={() => copyToClipboard(reply, index)}
                  className="shrink-0 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-all"
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
