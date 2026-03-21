import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Send, Image as ImageIcon, Trash2, Settings, Loader2, Bot, User, Plus, MessageSquare, Menu, X, Copy, Check, Sparkles, PanelLeftClose } from 'lucide-react';
import { generateContentWithFallback, generateContentStreamWithFallback } from '../utils/ai';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export function LoveGPT() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    try {
      const saved = localStorage.getItem('lovegpt_threads');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return parsed;
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
      
      const oldHistory = localStorage.getItem('lovegpt_history');
      if (oldHistory) {
        try {
          const parsedMessages = JSON.parse(oldHistory);
          if (parsedMessages && parsedMessages.length > 0) {
            localStorage.removeItem('lovegpt_history');
            return [{
              id: Date.now().toString(),
              title: 'Previous Chat',
              messages: parsedMessages,
              updatedAt: Date.now()
            }];
          }
        } catch (e) {
          console.error('Failed to migrate old history', e);
        }
      }
    } catch (e) {
      console.error('localStorage error:', e);
    }

    return [{
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{ role: 'model', text: 'Hello! I am Heart Spark, your professional relationship and dating coach. How can I help you today?' }],
      updatedAt: Date.now()
    }];
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => threads.length > 0 ? threads[0].id : null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);

  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  useEffect(() => {
    try {
      if (threads.length > 0) {
        localStorage.setItem('lovegpt_threads', JSON.stringify(threads));
      } else {
        localStorage.removeItem('lovegpt_threads');
      }
    } catch (e) {
      console.error('localStorage setItem error:', e);
    }
  }, [threads]);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const isNewChat = activeThread?.messages.length === 1 && activeThread.messages[0].role === 'model';

  // Fix A: Scroll to bottom instantly on thread change to prevent jumping animation
  useLayoutEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    setIsAutoScrollEnabled(true);
  }, [activeThreadId]);

  // Fix B: Only auto-scroll if user is near the bottom
  useEffect(() => {
    if (isAutoScrollEnabled && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeThread?.messages, isAutoScrollEnabled]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // If user is within 150px of the bottom, enable auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsAutoScrollEnabled(isNearBottom);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startNewChat = () => {
    const newThread: Thread = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{ role: 'model', text: 'Hello! I am Heart Spark, your professional relationship and dating coach. How can I help you today?' }],
      updatedAt: Date.now()
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setShowSidebar(false);
    setInput('');
    setImage(null);
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newThreads = threads.filter(t => t.id !== id);
    setThreads(newThreads);
    if (activeThreadId === id) {
      if (newThreads.length > 0) {
        setActiveThreadId(newThreads[0].id);
      } else {
        startNewChat(); // Always have at least one chat
      }
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !image) || !activeThread) return;

    const userMsg: Message = { role: 'user', text: input, image: image || undefined };
    
    // Update thread title if it's the first user message
    let newTitle = activeThread.title;
    if (activeThread.messages.length === 1 && newTitle === 'New Chat') {
      newTitle = input.slice(0, 30) + (input.length > 30 ? '...' : '');
    }

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { 
          ...t, 
          title: newTitle,
          messages: [...t.messages, userMsg], 
          updatedAt: Date.now() 
        };
      }
      return t;
    }));
    
    setInput('');
    setImage(null);
    setLoading(true);
    setIsAutoScrollEnabled(true); // Re-enable auto-scroll when user sends a message

    try {
      const currentMessages = [...activeThread.messages, userMsg];
      // Reduce context to last 6 messages (3 turns) to save input tokens
      let context = currentMessages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Heart Spark'}: ${m.text}`).join('\n');

      const prompt = `
        You are Heart Spark, a highly professional, empathetic, and insightful relationship coach.
        CRITICAL INSTRUCTIONS:
        1. Use clear, professional, yet warm language. Avoid overly casual slang or excessive emojis.
        2. Match the length of your response to the user's input. If they ask a brief question, provide a concise answer. If they write a detailed scenario, provide a comprehensive, structured analysis.
        3. Use Markdown formatting (bolding, bullet points) to structure your advice clearly.
        4. At the very end of your response, provide exactly 2 suggested follow-up questions the user could ask you next. Format them clearly like:
           "**Suggested Follow-ups:**
           - [Question 1]
           - [Question 2]"
        
        Recent conversation context:
        ${context}
        
        User's new message: ${userMsg.text}
      `;

      const parts: any[] = [{ text: prompt }];
      
      if (userMsg.image) {
        const match = userMsg.image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
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
        contents: { parts }
      });

      // Add an empty model message first
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
            // The last message is the one we just added
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
            messages: [...t.messages, { role: 'model', text: 'I apologize, but I am having trouble connecting right now. Please try again later.' }],
            updatedAt: Date.now()
          };
        }
        return t;
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Use setTimeout to allow state to update before sending
    setTimeout(() => {
      const formEvent = new Event('submit', { cancelable: true }) as unknown as React.FormEvent;
      handleSend(formEvent);
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto h-full px-0 md:px-4 lg:px-8 flex flex-col md:flex-row gap-0 md:gap-6 relative overflow-hidden">
      {/* Ambient Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-400/10 dark:bg-pink-900/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/10 dark:bg-purple-900/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

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
        w-72 h-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl rounded-2xl shadow-2xl md:shadow-sm border border-zinc-200/50 dark:border-zinc-800/50
        flex flex-col transition-all duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0 md:w-72 md:opacity-100' : '-translate-x-[120%] md:w-0 md:opacity-0 md:overflow-hidden md:border-none'}
      `}>
        <div className="p-4 flex justify-between items-center">
          <Button onClick={startNewChat} className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm border-none rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
          <Button variant="outline" className="ml-2 p-2 border-zinc-200 dark:border-zinc-800 rounded-xl" onClick={() => setShowSidebar(false)}>
            <PanelLeftClose className="w-4 h-4 text-zinc-500" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 w-72">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-2">Recent Chats</p>
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
              <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                Heart Spark <span className="text-xs font-normal px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full">Coach</span>
              </h1>
            </div>
          </div>
          <Link to="/astrology" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md text-zinc-700 dark:text-zinc-300 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition-all text-sm font-medium border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Astrology AI</span>
          </Link>
        </div>

        {/* Messages */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pb-32"
        >
          <div className="max-w-[800px] mx-auto w-full px-4 py-6 flex flex-col min-h-full">
            {isNewChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-pink-500/20 transform hover:scale-105 transition-transform">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
                  How can I help your heart today?
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-12 text-lg">
                  I'm Heart Spark, your AI relationship coach. Ask me anything about love, dating, or relationships.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    "How do I know if they like me?",
                    "Give me a cute good morning text",
                    "What are some fun date ideas?",
                    "How to handle a long-distance relationship?"
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-pink-200 dark:hover:border-pink-900/50 transition-all text-left text-zinc-700 dark:text-zinc-300 text-sm shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-center justify-between">
                        <span>{suggestion}</span>
                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Send className="w-3 h-3 text-zinc-500" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {activeThread?.messages.map((msg, i) => {
                  // Skip the initial greeting if it's not a new chat to keep the UI clean like ChatGPT
                  if (i === 0 && msg.role === 'model' && msg.text.includes('Hello! I am Heart Spark')) return null;

                  return (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      
                      <div className={`relative max-w-[85%] md:max-w-[75%] ${
                        msg.role === 'user' 
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-3xl rounded-tr-sm px-5 py-3.5' 
                          : 'bg-transparent text-zinc-800 dark:text-zinc-200 px-2 py-2'
                      }`}>
                        {msg.image && (
                          <img src={msg.image} alt="Uploaded" className="max-w-full rounded-2xl mb-3 max-h-64 object-contain border border-zinc-200 dark:border-zinc-700 shadow-sm" />
                        )}
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
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex gap-4 justify-start animate-in fade-in">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Bot className="w-5 h-5 text-white" />
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
            )}
          </div>
        </div>

        {/* Floating Pill Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 pt-10 pb-6 px-4 z-20">
          <div className="max-w-[800px] mx-auto relative">
            {image && (
              <div className="absolute bottom-full mb-4 left-4">
                <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2">
                  <img src={image} alt="Preview" className="h-20 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md object-cover" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 shadow-md hover:bg-zinc-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800/80 p-2 pl-4 focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500/50 transition-all shadow-lg shadow-zinc-200/50 dark:shadow-none">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 mb-0.5"
                title="Attach image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
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
                    if (input.trim() || image) handleSend();
                  }
                }}
                placeholder="Message Heart Spark..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 resize-none py-3.5 max-h-[200px] min-h-[48px] placeholder:text-zinc-400 text-base"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={loading || (!input.trim() && !image)} 
                className="p-3 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 rounded-full transition-all shadow-sm mb-0.5 mr-0.5 border-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-center text-xs text-zinc-400 mt-3 font-medium">
              Heart Spark can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

