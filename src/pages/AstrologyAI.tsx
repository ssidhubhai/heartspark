import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Send, Settings, Loader2, Bot, User, Star, Trash2, Plus, MessageSquare, Menu, X } from 'lucide-react';
import { generateContentWithFallback } from '../utils/ai';
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
        setThreads(parsed);
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
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
          if (parsedMessages.length > 0) {
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

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob || !place) return;

    setLoading(true);

    const initialPrompt = `My name is ${name}. I was born on ${dob} at ${time || 'unknown time'} in ${place}. Today's date is ${new Date().toLocaleDateString()}. Please provide a detailed advanced astrological reading for me, focusing on my personality, love life, and future. Act as a professional, mystical, and insightful astrologer.`;

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
      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: initialPrompt
      });

      setThreads(prev => prev.map(t => {
        if (t.id === newThread.id) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: response.text || 'The stars are clouded right now.' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));
    } catch (error) {
      console.error('Error:', error);
      setThreads(prev => prev.map(t => {
        if (t.id === newThread.id) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: 'Oops! I am having trouble reading the stars right now. Please try again later.' }],
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
      let context = currentMessages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Astrologer'}: ${m.text}`).join('\n');

      const prompt = `
        You are an advanced, mystical, and professional AI Astrologer.
        You are doing a reading for ${activeThread.details.name} born on ${activeThread.details.dob} in ${activeThread.details.place}.
        Today's date is ${new Date().toLocaleDateString()}.
        
        Recent conversation context:
        ${context}
        
        User's new question: ${userMsg.text}
      `;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: response.text || 'The stars are silent.' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));
    } catch (error) {
      console.error('Error:', error);
      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, { role: 'model', text: 'Oops! I am having trouble connecting right now. Please try again later.' }],
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
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col md:flex-row gap-6 relative">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute md:relative z-50 md:z-auto
        w-72 h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl md:shadow-none border border-slate-200 dark:border-slate-700
        flex flex-col transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Readings
          </h2>
          <Button variant="outline" className="md:hidden p-2" onClick={() => setShowSidebar(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4">
          <Button onClick={startNewReading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Reading
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map(thread => (
            <div 
              key={thread.id}
              onClick={() => {
                setActiveThreadId(thread.id);
                setShowSidebar(false);
              }}
              className={`
                w-full text-left p-3 rounded-xl flex items-center justify-between group cursor-pointer transition-colors
                ${activeThreadId === thread.id 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate text-sm font-medium">{thread.title}</span>
              </div>
              <button 
                onClick={(e) => deleteThread(thread.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <p className="text-center text-sm text-slate-500 mt-4">No past readings.</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" className="md:hidden p-2" onClick={() => setShowSidebar(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Astrology AI <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            </h1>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4 text-center">
          Caution: This is for entertainment purposes only. Do not take astrological predictions as professional or medical advice.
        </p>

        {!activeThread ? (
          <Card className="max-w-2xl mx-auto w-full">
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border-2 border-yellow-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-yellow-500 outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border-2 border-yellow-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-yellow-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Time of Birth (Optional)</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border-2 border-yellow-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-yellow-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Place of Birth</label>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="City, Country"
                    className="w-full h-12 px-4 rounded-xl border-2 border-yellow-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-yellow-500 outline-none"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                disabled={loading || !name || !dob || !place}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Read My Stars"}
              </Button>
            </form>
          </Card>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-2xl">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {activeThread.messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-600'
                  }`}>
                    <div className={`prose max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-slate-800 dark:text-slate-200 dark:prose-invert'} markdown-body`}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5" />
                  </div>
                  <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                    <span className="text-slate-500">Consulting the stars...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 focus:border-yellow-500 outline-none text-slate-900 dark:text-white"
                />
                <Button type="submit" disabled={loading || !input.trim()} className="bg-yellow-500 hover:bg-yellow-600">
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
