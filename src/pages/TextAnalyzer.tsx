import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MessageSquare, Sparkles, Brain, Loader2, Image as ImageIcon, Trash2, Share2, Download } from 'lucide-react';
import { generateContentWithFallback, generateContentStreamWithFallback } from '../utils/ai';
import Markdown from 'react-markdown';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';

export function TextAnalyzer() {
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
        You are an expert dating coach and relationship analyst.
        Analyze this communication I received from my crush.
        
        Context about our relationship: ${context || 'None provided'}
        ${message ? `The text message: "${message}"` : ''}
        ${image ? `I have also attached a screenshot of our conversation or their profile.` : ''}
        
        Please provide a concise analysis broken down into these sections. Use simple, everyday language (like talking to a friend). Use markdown formatting and emojis:
        1. **Hidden Meaning**: What are they actually trying to say? (Keep it brief)
        2. **Interest Level**: Cold, Friendly, or Flirting? (Briefly explain why)
        3. **Suggested Reply**: Give me 2 short options for exactly what I should reply.
        
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

  const handleShare = async () => {
    const text = `I just decoded a text message using HeartSpark's AI Text Analyzer! Try it out:`;
    await shareAsImage('analysis-result', 'Text Analyzer Result', text);
  };

  const handleDownload = () => {
    downloadAsImage('analysis-result', 'text-analysis');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Text Decoder <Brain className="w-8 h-8 text-indigo-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Confused by their text? Let AI decode their text messages and tell you exactly what to reply.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border-indigo-100 dark:border-slate-700">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              What did they text you? (Or upload a screenshot)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., 'haha okay' or 'what are you up to later?'"
              className="w-full h-32 p-4 rounded-xl border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none resize-none transition-all"
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
                className="flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> Add Screenshot
              </Button>
              {image && (
                <div className="relative inline-block">
                  <img src={image} alt="Preview" className="h-12 rounded border border-slate-200" />
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Context (Optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., We just met yesterday, or We've been friends for 3 years"
              className="w-full h-12 px-4 rounded-xl border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || (!message.trim() && !image)} 
            className="w-full h-14 text-lg bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Analyzing... <Loader2 className="w-5 h-5 animate-spin" /></>
            ) : (
              <>Decode Message <Sparkles className="w-5 h-5" /></>
            )}
          </Button>
        </form>
      </Card>

      {analysis && (
        <Card id="analysis-result" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">AI Analysis</h3>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed markdown-body">
              <Markdown>{analysis}</Markdown>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700" data-html2canvas-ignore>
            <Button onClick={handleShare} className="bg-indigo-500 hover:bg-indigo-600 border-none">
              <Share2 className="w-4 h-4 mr-2" /> Share Analysis
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
