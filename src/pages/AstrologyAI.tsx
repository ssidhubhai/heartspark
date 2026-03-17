import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Send, Settings, Loader2, Bot, User, Star, Trash2, Plus, MessageSquare, Menu, X, Copy, Check, Sparkles } from 'lucide-react';
import { generateContentWithFallback, generateContentStreamWithFallback } from '../utils/ai';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  details: {
    name: string;
    dob: string;
    time: string;
    place: string;
  };
  updatedAt: number;
}

export function AstrologyAI() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial form state
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('astrology_threads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setThreads(parsed);
          if (parsed.length > 0) {
            setActiveThreadId(parsed[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    } else {
      // Migrate old history if exists
      const oldHistory = localStorage.getItem('astrology_history');
      if (oldHistory) {
        try {
          const parsedMessages = JSON.parse(oldHistory);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            const newThread: Thread = {
              id: Date.now().toString(),
              title: 'Previous Reading',
              messages: parsedMessages,
              details: { name: 'User', dob: '', time: '', place: '' },
              updatedAt: Date.now()
            };
            setThreads([newThread]);
            setActiveThreadId(newThread.id);
            localStorage.removeItem('astrology_history');
          }
        } catch (e) {
          console.error('Failed to migrate old history', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('astrology_threads', JSON.stringify(threads));
  }, [threads]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  const startNewReading = () => {
    setActiveThreadId(null);
    setShowSidebar(false);
    setName('');
    setDob('');
    setTime('');
    setPlace('');
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newThreads = threads.filter(t => t.id !== id);
    setThreads(newThreads);
    if (activeThreadId === id) {
      setActiveThreadId(newThreads.length > 0 ? newThreads[0].id : null);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob || !place) return;

    setLoading(true);

    const initialPrompt = `My name is ${name}. I was born on ${dob} at ${time || 'unknown time'} in ${place}. Today's date is ${new Date().toLocaleDateString()}. Please provide an astrological reading for me, focusing on my personality, love life, and future. Act as Heart Spark, a highly professional, ethical, and insightful AI Astrologer. Use clear, professional language. Use Markdown formatting (bolding, bullet points) to structure your reading clearly. At the very end, suggest exactly 2 short follow-up questions I can ask you next. Format them clearly like:
           "**Suggested Follow-ups:**
           - [Question 1]
           - [Question 2]"`;

    const userMsg: Message = { role: 'user', text: initialPrompt };
    
    const newThread: Thread = {
      id: Date.now().toString(),
      title: `${name}'s Reading`,
      messages: [userMsg],
      details: { name, dob, time, place },
      updatedAt: Date.now()
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);

    try {
      const stream = await generateContentStreamWithFallback({
        model: 'gemini-3-flash-preview',
        contents: initialPrompt
      });

      setThreads(prev => prev.map(t => {
        if (t.id === newThread.id) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: '' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text || '';
        setThreads(prev => prev.map(t => {
          if (t.id === newThread.id) {
            const newMessages = [...t.messages];
            newMessages[newMessages.length - 1] = { role: 'model', text: fullResponse };
            return {
              ...t,
              messages: newMessages,
              updatedAt: Date.now()
            };
          }
          return t;
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      setThreads(prev => prev.map(t => {
        if (t.id === newThread.id) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: 'I apologize, but I am having trouble reading the stars right now. Please try again later.' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeThread) return;

    const userMsg: Message = { role: 'user', text: input };
    
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, messages: [...t.messages, userMsg], updatedAt: Date.now() };
      }
      return t;
    }));
    
    setInput('');
    setLoading(true);

    try {
      const currentMessages = [...activeThread.messages, userMsg];
      // Reduce context to last 6 messages (3 turns) to save input tokens
      let context = currentMessages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Astrologer'}: ${m.text}`).join('\n');

      const prompt = `
        You are Heart Spark, a highly professional, ethical, and insightful AI Astrologer.
        You are doing a reading for ${activeThread.details.name} born on ${activeThread.details.dob} in ${activeThread.details.place}.
        Today's date is ${new Date().toLocaleDateString()}.
        
        CRITICAL INSTRUCTIONS:
        1. Provide insightful, structured, and objective astrological analysis. Avoid overly mystical jargon unless explaining a specific concept.
        2. Match the depth of your response to the user's query. A simple question gets a concise answer; a complex chart question gets a detailed breakdown.
        3. Use Markdown formatting (bolding, bullet points, headers) to organize your readings clearly.
        4. Always maintain a supportive but realistic tone. Do not make definitive predictions about health, death, or guaranteed outcomes.
        5. At the very end of your response, provide exactly 2 suggested follow-up questions the user could ask you next. Format them clearly like:
           "**Suggested Follow-ups:**
           - [Question 1]
           - [Question 2]"
        
        Recent conversation context:
        ${context}
        
        User's new question: ${userMsg.text}
      `;

      const stream = await generateContentStreamWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: '' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text || '';
        setThreads(prev => prev.map(t => {
          if (t.id === activeThreadId) {
            const newMessages = [...t.messages];
            newMessages[newMessages.length - 1] = { role: 'model', text: fullResponse };
            return {
              ...t,
              messages: newMessages,
              updatedAt: Date.now()
            };
          }
          return t;
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: 'I apologize, but I am having trouble connecting to the celestial network right now. Please try again later.' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 relative">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute md:relative z-50 md:z-auto
        w-72 h-full bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl shadow-2xl md:shadow-none border border-zinc-200 dark:border-zinc-800
        flex flex-col transition-all duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0 md:w-72 md:opacity-100' : '-translate-x-[120%] md:w-0 md:opacity-0 md:overflow-hidden md:border-none'}
      `}>
        <div className="p-4 flex justify-between items-center">
          <Button onClick={startNewReading} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-sm border-none">
            <Plus className="w-4 h-4 mr-2" /> New Reading
          </Button>
          <Button variant="outline" className="ml-2 p-2 md:hidden border-pink-200 dark:border-pink-900/30" onClick={() => setShowSidebar(false)}>
            <X className="w-4 h-4 text-zinc-500" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 w-72">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-2">Recent Readings</p>
          {threads.map(thread => (
            <div 
              key={thread.id}
              onClick={() => {
                setActiveThreadId(thread.id);
                if (window.innerWidth < 768) setShowSidebar(false);
              }}
              className={`
                w-full text-left p-2.5 rounded-xl flex items-center justify-between group cursor-pointer transition-colors
                ${activeThreadId === thread.id 
                  ? 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate text-sm font-medium">{thread.title}</span>
              </div>
              <button 
                onClick={(e) => deleteThread(thread.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-md transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <p className="text-center text-sm text-zinc-500 mt-4">No past readings.</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" onClick={() => setShowSidebar(true)}>
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 leading-tight">
                  AstrologyAI
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Professional Astrological Advisor</p>
              </div>
            </div>
          </div>
          <Link to="/love-gpt" className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-700 dark:text-pink-400 rounded-full hover:shadow-md transition-all text-xs md:text-sm font-bold border border-pink-200 dark:border-pink-800/50 whitespace-nowrap">
            💖 <span className="hidden sm:inline">Try</span> Heart Spark
          </Link>
        </div>

        {!activeThread ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center">
            <div className="max-w-2xl w-full space-y-8">
              <Card className="w-full p-8 border-pink-100 dark:border-pink-900/30 shadow-sm bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-pink-600 dark:text-pink-400 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">Begin Your Reading</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Enter your birth details to generate a personalized astrological profile.</p>
                </div>
                <form onSubmit={handleInitialSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date of Birth</label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Time of Birth (Optional)</label>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Place of Birth</label>
                      <input
                        type="text"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        placeholder="City, Country"
                        className="w-full h-11 px-4 rounded-xl border border-pink-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] transition-all border-none"
                    disabled={loading || !name || !dob || !place}
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> ✨ Reading the stars...</> : "Generate Reading"}
                  </Button>
                </form>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-pink-50/50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/20">
                  <h3 className="font-semibold text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> What you'll discover
                  </h3>
                  <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                    <li>• Your core personality traits (Sun, Moon, Rising)</li>
                    <li>• Hidden strengths and potential challenges</li>
                    <li>• Compatibility and love life insights</li>
                    <li>• Career and life path guidance</li>
                  </ul>
                </Card>
                <Card className="p-6 bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
                  <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Ask anything
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">After your initial reading, you can ask follow-up questions like:</p>
                  <div className="space-y-2">
                    <div className="text-xs bg-white dark:bg-zinc-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">"Why do I always attract fire signs?"</div>
                    <div className="text-xs bg-white dark:bg-zinc-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">"What does my Venus sign say about my love language?"</div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth">
              <div className="max-w-3xl mx-auto space-y-8">
                {activeThread.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0 mt-1">
                        <Star className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      </div>
                    )}
                    
                    <div className={`relative max-w-[85%] md:max-w-[75%] ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md' 
                        : 'bg-white dark:bg-zinc-900 border border-pink-100 dark:border-pink-900/30 text-zinc-800 dark:text-zinc-200 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm'
                    }`}>
                      <div className={`prose prose-zinc dark:prose-invert max-w-none ${msg.role === 'user' ? 'prose-p:leading-relaxed' : 'prose-p:leading-7'} markdown-body`}>
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      
                      {msg.role === 'model' && msg.text && (
                        <button 
                          onClick={() => handleCopy(msg.text, i)}
                          className="absolute -left-10 top-2 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm"
                          title="Copy response"
                        >
                          {copiedIndex === i ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0 mt-1">
                      <Star className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="px-5 py-3.5 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-pink-100 dark:border-pink-900/30 rounded-2xl rounded-tl-sm shadow-sm">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white dark:bg-zinc-950">
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-pink-200 dark:border-pink-900/30 p-2 focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500 transition-all shadow-sm">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim()) handleSend(e);
                      }
                    }}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 resize-none py-3 px-3 max-h-[200px] min-h-[44px] placeholder:text-zinc-400"
                    rows={1}
                  />
                  <button 
                    type="submit" 
                    disabled={loading || !input.trim()} 
                    className="p-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm mb-0.5 mr-0.5"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-center text-xs text-zinc-400 mt-3">
                  AstrologyAI provides insights for entertainment and self-reflection.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
