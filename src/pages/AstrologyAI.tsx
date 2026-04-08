import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Send, Settings, Loader2, Bot, User, Star, Trash2, Plus, MessageSquare, Menu, X, Copy, Check, Sparkles, Heart, PanelLeftClose, Edit2 } from 'lucide-react';
import { generateContentWithFallback, generateContentStreamWithFallback } from '../utils/ai';
import { calculatePlacements, AstrologicalPlacements } from '../utils/astrology';
import Markdown from 'react-markdown';
import { LoadingOverlay } from '../components/LoadingOverlay';

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
    partnerName?: string;
    partnerDob?: string;
  };
  placements?: {
    user: AstrologicalPlacements;
    partner: AstrologicalPlacements;
  };
  updatedAt: number;
}

export function AstrologyAI() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initial form state
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerDob, setPartnerDob] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [savedProfiles, setSavedProfiles] = useState<{name: string, dob: string, time: string, place: string}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('astrology_profiles');
    if (saved) setSavedProfiles(JSON.parse(saved));
  }, []);

  const saveProfile = () => {
    if (!name || !dob || !place) return;
    const newProfile = { name, dob, time, place };
    const updated = [newProfile, ...savedProfiles.filter(p => p.name !== name)].slice(0, 3);
    setSavedProfiles(updated);
    localStorage.setItem('astrology_profiles', JSON.stringify(updated));
  };

  const loadProfile = (p: {name: string, dob: string, time: string, place: string}) => {
    setName(p.name);
    setDob(p.dob);
    setTime(p.time);
    setPlace(p.place);
  };

  useEffect(() => {
    try {
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
    } catch (e) {
      console.error('localStorage error:', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (threads.length > 0) {
        localStorage.setItem('astrology_threads', JSON.stringify(threads));
      } else {
        localStorage.removeItem('astrology_threads');
      }
    } catch (e) {
      console.error('localStorage setItem error:', e);
    }
  }, [threads]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  useLayoutEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    setIsAutoScrollEnabled(true);
  }, [activeThreadId]);

  useEffect(() => {
    if (isAutoScrollEnabled && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeThread?.messages, isAutoScrollEnabled]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsAutoScrollEnabled(isNearBottom);
  };

  const startNewReading = () => {
    setActiveThreadId(null);
    setShowSidebar(false);
    setName('');
    setDob('');
    setTime('');
    setPlace('');
    setPartnerName('');
    setPartnerDob('');
    setAdditionalInfo('');
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

  const handleEditMessage = (index: number) => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    if (!activeThread) return;
    
    const messageToEdit = activeThread.messages[index];
    if (messageToEdit.role !== 'user') return;
    
    // Set input to the message text
    setInput(messageToEdit.text);
    
    // Truncate messages up to this point
    const newMessages = activeThread.messages.slice(0, index);
    
    const updatedThread = {
      ...activeThread,
      messages: newMessages,
      updatedAt: Date.now()
    };
    
    const newThreads = threads.map(t => t.id === updatedThread.id ? updatedThread : t);
    setThreads(newThreads);
    localStorage.setItem('astrology_threads', JSON.stringify(newThreads));
    
    // Focus input
    setTimeout(() => {
      const inputEl = document.querySelector('textarea');
      if (inputEl) inputEl.focus();
    }, 0);
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob || !place || !partnerName || !partnerDob) return;

    setLoading(true);

    const userPlacements = calculatePlacements(dob, time);
    const partnerPlacements = calculatePlacements(partnerDob);

    const initialPrompt = `My name is ${name}. I was born on ${dob} at ${time || 'unknown time'} in ${place}. 
    I want to know about my compatibility with my crush/partner, ${partnerName}, who was born on ${partnerDob}.
    ${additionalInfo ? `Here is some additional context about our relationship: ${additionalInfo}` : ''}
    
    ASTROLOGICAL DATA (Use this for a highly accurate reading):
    My Placements: Sun in ${userPlacements.sun}, Moon in ${userPlacements.moon}, Venus in ${userPlacements.venus}, Mars in ${userPlacements.mars}, Mercury in ${userPlacements.mercury}.
    ${partnerName}'s Placements: Sun in ${partnerPlacements.sun}, Moon in ${partnerPlacements.moon}, Venus in ${partnerPlacements.venus}, Mars in ${partnerPlacements.mars}, Mercury in ${partnerPlacements.mercury}.
    
    Today's date is ${new Date().toLocaleDateString()}. 
    
    Please provide an advanced, deep-dive astrological compatibility reading for us based on these exact planetary placements. Act as Astro Vibe, a highly professional, ethical, and insightful AI Relationship Astrologer. 
    Your main focus MUST be providing the match of partner and crush. Design the algorithm in such a way it provides information of our relationship much and talks mainly of it. Reveal everything about our dynamic, potential challenges, and deep connection.
    Use clear, professional language. Use Markdown formatting (bolding, bullet points) to structure your reading clearly. 
    At the very end, suggest exactly 2 short follow-up questions I can ask you next about our relationship. Format them clearly like:
           "**Suggested Follow-ups:**
           - [Question 1]
           - [Question 2]"`;

    const userMsg: Message = { role: 'user', text: initialPrompt };
    
    const newThread: Thread = {
      id: Date.now().toString(),
      title: `${name} & ${partnerName}'s Vibe Check`,
      messages: [userMsg],
      details: { name, dob, time, place, partnerName, partnerDob },
      placements: { user: userPlacements, partner: partnerPlacements },
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
    setIsAutoScrollEnabled(true);

    try {
      const currentMessages = [...activeThread.messages, userMsg];
      // Reduce context to last 6 messages (3 turns) to save input tokens
      let context = currentMessages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Astrologer'}: ${m.text}`).join('\n');

      const prompt = `
        You are Astro Vibe, a highly professional, ethical, and insightful AI Relationship Astrologer.
        You are doing a compatibility reading for ${activeThread.details.name} born on ${activeThread.details.dob} in ${activeThread.details.place}.
        Today's date is ${new Date().toLocaleDateString()}.
        
        CRITICAL INSTRUCTIONS:
        1. Focus entirely on relationship compatibility, love dynamics, and connection between the user and their partner/crush.
        2. Provide insightful, structured, and objective astrological analysis. Avoid overly mystical jargon unless explaining a specific concept.
        3. Match the depth of your response to the user's query. A simple question gets a concise answer; a complex chart question gets a detailed breakdown.
        4. Use Markdown formatting (bolding, bullet points, headers) to organize your readings clearly.
        5. Always maintain a supportive but realistic tone. Do not make definitive predictions about health, death, or guaranteed outcomes.
        6. At the very end of your response, provide exactly 2 suggested follow-up questions the user could ask you next about their relationship. Format them clearly like:
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
    <div className="max-w-7xl mx-auto h-full px-0 md:px-4 lg:px-8 flex flex-col md:flex-row gap-0 md:gap-6 relative overflow-hidden">
      <LoadingOverlay 
        isVisible={loading && !activeThreadId} 
        type="astro"
      />
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute md:relative z-50 md:z-10
        w-72 h-full backdrop-blur-xl rounded-2xl shadow-2xl md:shadow-sm border border-zinc-200/50 dark:border-zinc-800/50
        flex flex-col transition-all duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0 md:w-72 md:opacity-100' : '-translate-x-[120%] md:w-0 md:opacity-0 md:overflow-hidden md:border-none'}
      `}>
        <div className="p-4 flex justify-between items-center">
          <Button onClick={startNewReading} className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm border-none rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> New Reading
          </Button>
          <Button variant="outline" className="ml-2 p-2 border-zinc-200 dark:border-zinc-800 rounded-xl" onClick={() => setShowSidebar(false)}>
            <PanelLeftClose className="w-4 h-4 text-zinc-500" />
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
                w-full text-left p-3 rounded-xl flex items-center justify-between group cursor-pointer transition-all
                ${activeThreadId === thread.id 
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium' 
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeThreadId === thread.id ? 'text-pink-500' : 'opacity-50'}`} />
                <span className="truncate text-sm">{thread.title}</span>
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
      <div className="flex-1 flex flex-col h-full min-w-0 bg-transparent relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-transparent z-20">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-xl border border-zinc-200/50 dark:border-zinc-800/50" onClick={() => setShowSidebar(true)}>
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 flex items-center gap-2">
                Astro Vibe <span className="text-[10px] font-black px-2 py-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 rounded-full shadow-sm tracking-widest">PREMIUM</span>
              </h1>
            </div>
          </div>
        </div>

        {!activeThread ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center py-8">
            <div className="max-w-2xl w-full space-y-8">
              <Card className="w-full p-8 border-pink-100 dark:border-pink-900/30 shadow-sm backdrop-blur-xl">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-pink-600 dark:text-pink-400 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">Deep Compatibility Analysis</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Enter your details and your crush/partner's details to reveal everything about your cosmic connection.</p>
                </div>
                <form onSubmit={handleInitialSubmit} className="space-y-6">
                <div className="space-y-6">
                    {/* User Details */}
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-700/50 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                          <User className="w-4 h-4 text-pink-500" /> Your Profile
                        </h3>
                        <div className="flex gap-2">
                          {savedProfiles.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => loadProfile(p)}
                              className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-[9px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-pink-500 hover:text-white transition-all"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full h-12 px-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
                              placeholder="Your name"
                              required
                            />
                            {name && !savedProfiles.some(p => p.name === name) && (
                              <button
                                type="button"
                                onClick={saveProfile}
                                className="absolute right-2 top-2 h-8 px-3 rounded-xl bg-pink-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-pink-600 transition-all"
                              >
                                Save
                              </button>
                            )}
                          </div>
                        </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Birth Date</label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Birth Time (Optional)</label>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Birth Place</label>
                        <input
                          type="text"
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="City, Country"
                          className="w-full h-12 px-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Partner Details */}
                  <div className="p-6 bg-pink-50/30 dark:bg-pink-900/10 rounded-3xl border border-pink-100 dark:border-pink-900/20 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-pink-600 dark:text-pink-400 flex items-center gap-2 uppercase tracking-widest">
                        <Heart className="w-4 h-4" /> Partner / Crush
                      </h3>
                      <div className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/30 text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-tighter">Required</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Their Name</label>
                        <input
                          type="text"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-pink-100/50 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
                          placeholder="Their name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Their Birth Date</label>
                        <input
                          type="date"
                          value={partnerDob}
                          onChange={(e) => setPartnerDob(e.target.value)}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-pink-100/50 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Context & Intentions</label>
                    <textarea
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Tell us about your relationship, how you met, or specific questions you have..."
                      className="w-full h-32 px-4 py-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all resize-none text-sm font-medium"
                    />
                  </div>
                </div>

                  <Button 
                    type="submit" 
                    variant="custom"
                    className="w-full h-12 text-base bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_25px_rgba(251,191,36,0.6)] transition-all border-none"
                    disabled={loading || !name || !dob || !place || !partnerName || !partnerDob}
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> ✨ Analyzing Cosmic Connection...</> : "Consult the Stars"}
                  </Button>
                </form>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-pink-50/50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/20 shadow-none">
                  <h3 className="font-semibold text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> What you'll discover
                  </h3>
                  <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                    <li>• Deep compatibility analysis (Sun, Moon, Venus)</li>
                    <li>• Hidden relationship dynamics and challenges</li>
                    <li>• How they truly perceive you</li>
                    <li>• Future potential of your connection</li>
                  </ul>
                </Card>
                <Card className="p-6 bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 shadow-none">
                  <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Ask anything
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">After your initial reading, you can ask follow-up questions like:</p>
                  <div className="space-y-2">
                    <div className="text-xs bg-white dark:bg-zinc-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">"Why do we always argue about small things?"</div>
                    <div className="text-xs bg-white dark:bg-zinc-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900/30 text-zinc-700 dark:text-zinc-300">"What is the best way to confess my feelings to them?"</div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto pb-32"
            >
              <div className="max-w-[800px] mx-auto w-full px-4 py-6 flex flex-col min-h-full">
                {activeThread.placements && (
                  <div className="mb-8 p-6 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-pink-100 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-pink-500" /> Cosmic Profiles
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="font-semibold text-pink-600 dark:text-pink-400 border-b border-pink-100 dark:border-zinc-800 pb-2">{activeThread.details.name}</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg shadow-sm text-zinc-700 dark:text-zinc-300">☀️ Sun in {activeThread.placements.user.sun}</span>
                          <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg shadow-sm text-zinc-700 dark:text-zinc-300">🌙 Moon in {activeThread.placements.user.moon}</span>
                          <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg shadow-sm text-zinc-700 dark:text-zinc-300">💖 Venus in {activeThread.placements.user.venus}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="font-semibold text-purple-600 dark:text-purple-400 border-b border-purple-100 dark:border-zinc-800 pb-2">{activeThread.details.partnerName || 'Partner'}</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg shadow-sm text-zinc-700 dark:text-zinc-300">☀️ Sun in {activeThread.placements.partner.sun}</span>
                          <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg shadow-sm text-zinc-700 dark:text-zinc-300">🌙 Moon in {activeThread.placements.partner.moon}</span>
                          <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg shadow-sm text-zinc-700 dark:text-zinc-300">💖 Venus in {activeThread.placements.partner.venus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeThread.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300 mb-8`}>
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    <div className={`relative max-w-[85%] md:max-w-[75%] ${
                      msg.role === 'user' 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-3xl rounded-tr-sm px-5 py-3.5' 
                        : 'bg-transparent text-zinc-800 dark:text-zinc-200 px-2 py-2'
                    }`}>
                      <div className={`prose prose-zinc dark:prose-invert max-w-none ${msg.role === 'user' ? 'prose-p:leading-relaxed' : 'prose-p:leading-7'} markdown-body`}>
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      
                      {msg.role === 'model' && msg.text && (
                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopy(msg.text, i)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm flex items-center gap-1.5 text-xs font-medium"
                            title="Copy response"
                          >
                            {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedIndex === i ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {msg.role === 'user' && !loading && (
                        <div className="flex items-center justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditMessage(i)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm flex items-center gap-1.5 text-xs font-medium"
                            title="Edit message"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </div>
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
                  <div className="flex gap-4 justify-start animate-in fade-in mb-8">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div className="px-2 py-4 flex items-center gap-2">
                      <span className="flex gap-1.5">
                        <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Floating Pill Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 pt-10 pb-6 px-4 z-20">
              <div className="max-w-[800px] mx-auto relative">
                <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800/80 p-2 pl-4 focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500/50 transition-all shadow-lg shadow-zinc-200/50 dark:shadow-none">
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
                    className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 resize-none py-3.5 max-h-[200px] min-h-[48px] placeholder:text-zinc-400 text-base"
                    rows={1}
                  />
                  <button 
                    type="submit" 
                    disabled={loading || !input.trim()} 
                    className="p-3 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 rounded-full transition-all shadow-sm mb-0.5 mr-0.5 border-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-center text-xs text-zinc-400 mt-3 font-medium">
                  Astro Vibe provides insights for entertainment and self-reflection.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
