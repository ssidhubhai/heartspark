import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Send, Image as ImageIcon, Trash2, Settings, Loader2, Bot, User, Plus, MessageSquare, Menu, X, Copy, Check } from 'lucide-react';
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

    return [{
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{ role: 'model', text: 'Hello. I am LoveGPT, your professional relationship and dating assistant. How can I assist you today?' }],
      updatedAt: Date.now()
    }];
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => threads.length > 0 ? threads[0].id : null);
  const [showSidebar, setShowSidebar] = useState(false);

  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem('lovegpt_threads', JSON.stringify(threads));
    } else {
      localStorage.removeItem('lovegpt_threads');
    }
  }, [threads]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

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
      messages: [{ role: 'model', text: 'Hello. I am LoveGPT, your professional relationship and dating assistant. How can I assist you today?' }],
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
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

    try {
      const currentMessages = [...activeThread.messages, userMsg];
      // Reduce context to last 6 messages (3 turns) to save input tokens
      let context = currentMessages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'LoveGPT'}: ${m.text}`).join('\n');

      const prompt = `
        You are LoveGPT, a highly professional, empathetic, and insightful relationship coach.
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
          <Button onClick={startNewChat} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
          <Button variant="outline" className="ml-2 p-2 md:hidden border-zinc-200 dark:border-zinc-800" onClick={() => setShowSidebar(false)}>
            <X className="w-4 h-4 text-zinc-500" />
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
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-white leading-tight">
                  LoveGPT
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Professional Relationship Assistant</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8">
            {activeThread?.messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                
                <div className={`relative max-w-[85%] md:max-w-[75%] ${
                  msg.role === 'user' 
                    ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm px-5 py-3.5' 
                    : 'text-zinc-800 dark:text-zinc-200 px-2 py-1'
                }`}>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded" className="max-w-full rounded-xl mb-3 max-h-64 object-contain border border-zinc-200 dark:border-zinc-700" />
                  )}
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
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="px-2 py-3 flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
            {image && (
              <div className="absolute bottom-full mb-4 left-0">
                <div className="relative inline-block">
                  <img src={image} alt="Preview" className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm object-cover" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1.5 shadow-md hover:bg-zinc-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
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
                className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
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
                    if (input.trim() || image) handleSend(e);
                  }
                }}
                placeholder="Message LoveGPT..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 resize-none py-3 max-h-[200px] min-h-[44px] placeholder:text-zinc-400"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={loading || (!input.trim() && !image)} 
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all shadow-sm mb-0.5 mr-0.5"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-center text-xs text-zinc-400 mt-3">
              LoveGPT can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

