import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MessageSquare, Sparkles, Brain, Loader2, Image as ImageIcon, Trash2, Share2, Download, X } from 'lucide-react';
import { generateContentWithFallback, generateContentStreamWithFallback, safeParseJSON } from '../utils/ai';
import Markdown from 'react-markdown';
import { downloadAsPdf, shareAsPdf, shareAsImage } from '../utils/downloadImage';
import { motion } from 'framer-motion';
import { LoadingOverlay } from '../components/LoadingOverlay';

export function CrushMessageAnalyzer() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
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
        
        CRITICAL: You MUST respond ONLY with a valid JSON object. Do not include any markdown formatting like \`\`\`json.
        The JSON must have exactly this structure:
        {
          "hiddenMeaning": "What are they actually trying to say? (Keep it brief, 1-2 sentences)",
          "flirtingScore": 85, // A number from 0 to 100
          "vibe": "Friendly", // One of: "Cold", "Friendly", "Flirting", "Mixed Signals"
          "redFlags": ["flag 1", "flag 2"], // Array of strings, empty if none
          "greenFlags": ["flag 1", "flag 2"], // Array of strings, empty if none
          "suggestedReplies": [
            { "type": "Funny", "text": "reply 1" },
            { "type": "Flirty", "text": "reply 2" },
            { "type": "Cool", "text": "reply 3" }
          ],
          "followUpSuggestion": "A suggested follow-up question the user can ask you."
        }
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

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: { parts },
      });

      const text = response.text || '';
      try {
        const parsed = safeParseJSON(text);
        setAnalysis(JSON.stringify(parsed)); // Store as string to keep state type, we'll parse in render
      } catch (e) {
        console.error("Failed to parse JSON", e, text);
        // Fallback to a generic response if JSON parsing fails
        setAnalysis(JSON.stringify({
          hiddenMeaning: "The AI was a bit confused by this one, but it seems like they are keeping things casual.",
          flirtingScore: 50,
          vibe: "Mixed Signals",
          redFlags: [],
          greenFlags: ["They replied!"],
          suggestedReplies: [
            { type: "Safe", text: "Haha yeah" }
          ],
          followUpSuggestion: "Want me to try analyzing it again?"
        }));
      }

    } catch (error) {
      console.error('Error analyzing text:', error);
      setAnalysis('error');
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
    if (isSharing) return;
    setIsSharing(true);
    try {
      const text = `I just decoded a text message using Heart Spark's Crush Message Analyzer! Try it out:`;
      await shareAsImage('analysis-result', 'Message Analyzer Result', text);
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await downloadAsPdf('analysis-result', 'message-analysis');
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      <LoadingOverlay 
        isVisible={loading || isSharing} 
        type={loading ? "analyzer" : "default"}
        message={isSharing ? "Preparing your analysis report..." : undefined}
      />
      <div className="flex-1 overflow-y-auto pb-12 space-y-8 px-1 sm:px-2">
        <div className="text-center space-y-4 pt-4">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white flex items-center justify-center gap-3 tracking-tight">
          Crush Message Analyzer <Brain className="w-8 h-8 text-pink-500 animate-pulse" />
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
          Confused by their text? Let Heart Spark decode the hidden meaning, calculate a flirting score, and generate the perfect reply.
        </p>
      </div>

      <Card className="backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none rounded-3xl overflow-hidden">
        <form onSubmit={handleAnalyze} className="space-y-6 p-2 md:p-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">
              What did they text you? (Or upload a screenshot)
            </label>
            <div className="relative">
              <div className="absolute -left-2 top-4 w-4 h-4 bg-zinc-100 dark:bg-zinc-800 rotate-45 rounded-sm"></div>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder="e.g., 'haha okay' or 'what are you up to later?'"
                className="w-full min-h-[6rem] max-h-[24rem] p-4 rounded-2xl rounded-tl-none border-none bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-pink-500/20 outline-none resize-none transition-all overflow-y-auto placeholder:text-zinc-400 relative z-10 text-lg"
              />
            </div>
            
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
                className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
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

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">
              Context (Optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., We just met yesterday, or We've been friends for 3 years"
              className="w-full h-14 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all placeholder:text-zinc-400"
            />
          </div>

          <Button 
            type="submit" 
            variant="custom"
            disabled={loading || (!message.trim() && !image)} 
            className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] rounded-2xl transition-all mt-4"
          >
            {loading ? (
              <>✨ Analyzing emotional signals... <Loader2 className="w-5 h-5 animate-spin" /></>
            ) : (
              <>Decode Their Hidden Feelings 🕵️‍♀️ <Sparkles className="w-5 h-5" /></>
            )}
          </Button>
        </form>
      </Card>

      {analysis && analysis !== 'error' && (
        <>
          <Card id="analysis-result" className="animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none rounded-3xl overflow-hidden p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800/50">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Vibe Check</h3>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">HeartSpark AI Analysis</p>
              </div>
            </div>
            
            {(() => {
              try {
                const data = JSON.parse(analysis);
                return (
                  <div className="space-y-8">
                    {/* Score & Vibe */}
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800/50">
                      <div className="text-center">
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                          {data.flirtingScore}%
                        </div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Flirting Score</div>
                      </div>
                      <div className="hidden md:block w-px h-16 bg-zinc-200 dark:bg-zinc-800"></div>
                      <div className="text-center">
                        <div className="text-3xl font-black text-zinc-800 dark:text-zinc-100">
                          {data.vibe}
                        </div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Overall Vibe</div>
                      </div>
                    </div>

                    {/* Hidden Meaning */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-500" /> What they actually mean:
                      </h4>
                      <p className="text-zinc-700 dark:text-zinc-300 bg-pink-50/50 dark:bg-pink-900/10 p-4 rounded-2xl border border-pink-100/50 dark:border-pink-900/20 leading-relaxed">
                        {data.hiddenMeaning}
                      </p>
                    </div>

                    {/* Flags */}
                    {(data.redFlags?.length > 0 || data.greenFlags?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.greenFlags?.length > 0 && (
                          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                              🟩 Green Flags
                            </h4>
                            <ul className="space-y-1">
                              {data.greenFlags.map((flag: string, i: number) => (
                                <li key={i} className="text-sm text-emerald-600 dark:text-emerald-300/80 flex items-start gap-2">
                                  <span className="mt-1 text-[10px]">✨</span> {flag}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {data.redFlags?.length > 0 && (
                          <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100/50 dark:border-rose-900/20">
                            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
                              🚩 Red Flags
                            </h4>
                            <ul className="space-y-1">
                              {data.redFlags.map((flag: string, i: number) => (
                                <li key={i} className="text-sm text-rose-600 dark:text-rose-300/80 flex items-start gap-2">
                                  <span className="mt-1 text-[10px]">⚠️</span> {flag}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Replies */}
                    {data.suggestedReplies?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-500" /> How to reply:
                        </h4>
                        <div className="grid gap-3">
                          {data.suggestedReplies.map((reply: any, i: number) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-sm">
                              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-full w-fit">
                                {reply.type}
                              </span>
                              <p className="text-zinc-800 dark:text-zinc-200 text-sm flex-1">{reply.text}</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 rounded-xl shrink-0"
                                onClick={() => navigator.clipboard.writeText(reply.text)}
                              >
                                Copy
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } catch (e) {
                return (
                  <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed markdown-body">
                    <Markdown>{analysis}</Markdown>
                  </div>
                );
              }
            })()}

            <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/50" data-html2canvas-ignore>
              <Button onClick={handleShare} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 border-none rounded-xl shadow-sm">
                <Share2 className="w-4 h-4 mr-2" /> Share Analysis
              </Button>
              <Button variant="outline" onClick={handleDownload} className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
            
            <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800/50" data-html2canvas-ignore>
              <form onSubmit={handleFollowUp} className="relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800/80 p-2 pl-4 focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500/50 transition-all shadow-sm">
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
                  className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 resize-none py-3.5 max-h-[150px] min-h-[48px] placeholder:text-zinc-400 text-base"
                  rows={1}
                />
                <button 
                  type="submit" 
                  disabled={followUpLoading || !followUp.trim()} 
                  className="p-3 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 rounded-full transition-all shadow-sm mb-0.5 mr-0.5 border-none"
                >
                  {followUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </Card>

          {/* Cross-Promotion for Astro Vibe */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="bg-indigo-50 dark:bg-indigo-950/20 backdrop-blur-md border border-indigo-100 dark:border-indigo-800/30 p-8 rounded-[2rem] text-center shadow-lg">
              <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center justify-center gap-2">
                Is this written in the stars? ✨
              </h3>
              <p className="text-sm text-indigo-600 dark:text-indigo-300/80 mb-6">
                Discover your true cosmic destiny with <span className="font-bold text-purple-600 dark:text-purple-400">Astro Vibe.</span>
              </p>
              <Link to="/astrology">
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white w-full sm:w-auto rounded-2xl h-12 font-bold shadow-lg shadow-purple-500/30 px-8">
                  Consult the Stars
                </Button>
              </Link>
            </Card>
          </motion.div>
        </>
      )}
      </div>
    </div>
  );
}
