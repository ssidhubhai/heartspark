import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MessageSquare, Sparkles, Brain, Loader2, Image as ImageIcon, Trash2, Share2, Download } from 'lucide-react';
import { generateContentWithFallback, generateContentStreamWithFallback } from '../utils/ai';
import Markdown from 'react-markdown';
import { downloadAsPdf, shareAsPdf } from '../utils/downloadImage';

export function CrushMessageAnalyzer() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !image) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const prompt = `
        You are Heart Spark, an expert dating coach and relationship analyst.
        Analyze this communication I received from my crush.
        
        Context about our relationship: ${context || 'None provided'}
        ${message ? `The text message: "${message}"` : ''}
        ${image ? `I have also attached a screenshot of our conversation or their profile.` : ''}
        
        Please provide a concise analysis broken down into these sections. Use simple, everyday language (like talking to a friend). Use markdown formatting and emojis:
        1. **Hidden Meaning**: What are they actually trying to say? (Keep it brief)
        2. **Flirting Score**: Give a score from 0-100% on how flirty this message is.
        3. **Interest Level**: Cold, Friendly, or Flirting? (Briefly explain why)
        4. **Suggested Replies**: Give me 3 short options for exactly what I should reply (one funny, one flirty, one playing it cool).
        
        IMPORTANT: At the very end, suggest 1 or 2 follow-up questions the user can ask you next (e.g., "Should we analyze their previous text too?").
      `;

      const parts: any[] = [{ text: prompt }];
      
      if (image) {
        const match = image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (match) {
          parts.unshift({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      const stream = await generateContentStreamWithFallback({
        model: 'gemini-3-flash-preview',
        contents: { parts },
      });

      setAnalysis('');
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text || '';
        setAnalysis(fullResponse);
      }

    } catch (error) {
      console.error('Error analyzing text:', error);
      setAnalysis('Oops! The AI is taking a break. Please check your API key or try again later.');
    } finally {
      setLoading(false);
    }
  };

  const [followUp, setFollowUp] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUp.trim() || !analysis) return;

    setFollowUpLoading(true);
    const currentFollowUp = followUp;
    setFollowUp('');

    try {
      const prompt = `
        You are Heart Spark, an expert dating coach and relationship analyst.
        We were analyzing this text message: "${message}"
        With this context: "${context}"
        
        Your previous analysis was:
        ${analysis}
        
        The user has a follow-up question: "${currentFollowUp}"
        
        Please provide a concise, helpful answer to their follow-up question. Use simple language and markdown formatting.
      `;

      const stream = await generateContentStreamWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      let fullResponse = analysis + `\n\n---\n\n**Q: ${currentFollowUp}**\n\n`;
      setAnalysis(fullResponse);
      
      for await (const chunk of stream) {
        fullResponse += chunk.text || '';
        setAnalysis(fullResponse);
      }

    } catch (error) {
      console.error('Error with follow-up:', error);
      setAnalysis(prev => prev + '\n\n*Error: Could not get follow-up response.*');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleShare = async () => {
    const text = `I just decoded a text message using Heart Spark's Crush Message Analyzer! Try it out:`;
    await shareAsPdf('analysis-result', 'Message Analyzer Result', text);
  };

  const handleDownload = () => {
    downloadAsPdf('analysis-result', 'message-analysis');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Crush Message Analyzer <Brain className="w-8 h-8 text-pink-500 animate-pulse" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Confused by their text? Let Heart Spark decode the hidden meaning, calculate a flirting score, and generate the perfect reply.
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              What did they text you? (Or upload a screenshot)
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="e.g., 'haha okay' or 'what are you up to later?'"
              className="w-full min-h-[8rem] max-h-[24rem] p-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none resize-none transition-all overflow-y-auto"
            />
            
            <div className="flex items-center gap-4 mt-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30"
              >
                <ImageIcon className="w-4 h-4" /> Add Screenshot
              </Button>
              {image && (
                <div className="relative inline-block">
                  <img src={image} alt="Preview" className="h-12 rounded border border-zinc-200 dark:border-zinc-700" />
                  <button 
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Context (Optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., We just met yesterday, or We've been friends for 3 years"
              className="w-full h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || (!message.trim() && !image)} 
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] transition-all"
          >
            {loading ? (
              <>✨ Analyzing emotional signals... <Loader2 className="w-5 h-5 animate-spin" /></>
            ) : (
              <>Decode Their Hidden Feelings 🕵️‍♀️ <Sparkles className="w-5 h-5" /></>
            )}
          </Button>
        </form>
      </Card>

      {analysis && (
        <Card id="analysis-result" className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-pink-100 dark:border-pink-900/30">
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-800 dark:text-white">AI Analysis</h3>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed markdown-body">
              <Markdown>{analysis}</Markdown>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-pink-100 dark:border-pink-900/30" data-html2canvas-ignore>
            <Button onClick={handleShare} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
              <Share2 className="w-4 h-4 mr-2" /> Share Analysis
            </Button>
            <Button variant="outline" onClick={handleDownload} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-pink-100 dark:border-pink-900/30" data-html2canvas-ignore>
            <form onSubmit={handleFollowUp} className="flex gap-2 items-end bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-pink-200 dark:border-pink-900/30 p-2 focus-within:border-pink-500 transition-colors">
              <textarea
                value={followUp}
                onChange={(e) => {
                  setFollowUp(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (followUp.trim()) handleFollowUp(e);
                  }
                }}
                placeholder="Ask a follow-up question..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-white resize-none py-2 px-2 max-h-[150px] min-h-[40px]"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={followUpLoading || !followUp.trim()} 
                className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 text-white rounded-xl transition-colors border-none"
              >
                {followUpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
