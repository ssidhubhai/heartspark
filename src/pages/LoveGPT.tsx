import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Send, Image as ImageIcon, Trash2, Settings, Loader2, Bot, User, Plus, MessageSquare, Menu, X } from 'lucide-react';
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
      messages: [{ role: 'model', text: 'Hi there! I am LoveGPT, your personal relationship and dating assistant. How can I help you today? ❤️' }],
      updatedAt: Date.now()
    }];
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => threads.length > 0 ? threads[0].id : null);
  const [showSidebar, setShowSidebar] = useState(false);

  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      messages: [{ role: 'model', text: 'Hi there! I am LoveGPT, your personal relationship and dating assistant. How can I help you today? ❤️' }],
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
        You are LoveGPT, a friendly, empathetic dating/relationship coach.
        CRITICAL INSTRUCTIONS:
        1. Use VERY simple, everyday language. Talk like a normal friend texting. No big words, no complex psychology terms.
        2. Keep your response SHORT (under 100 words if possible) to save tokens, but be helpful.
        3. At the very end of your response, provide exactly 2 suggested follow-up questions the user could ask you next. Format them clearly like:
           "Suggestions:
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
            <Bot className="w-5 h-5 text-pink-500" /> Chats
          </h2>
          <Button variant="outline" className="md:hidden p-2" onClick={() => setShowSidebar(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4">
          <Button onClick={startNewChat} className="w-full bg-pink-500 hover:bg-pink-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Chat
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
                  ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-500' 
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
              LoveGPT <Bot className="w-6 h-6 md:w-8 md:h-8 text-pink-500" />
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-2xl">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeThread?.messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-pink-500 text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-600'
                }`}>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg mb-2 max-h-64 object-contain" />
                  )}
                  <div className={`prose max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-slate-800 dark:text-slate-200 dark:prose-invert'} markdown-body`}>
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                  <span className="text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            {image && (
              <div className="mb-2 relative inline-block">
                <img src={image} alt="Preview" className="h-20 rounded-lg border border-slate-200" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
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
                className="px-3"
              >
                <ImageIcon className="w-5 h-5 text-slate-500" />
              </Button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask LoveGPT anything..."
                className="flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 focus:border-pink-500 outline-none text-slate-900 dark:text-white"
              />
              <Button type="submit" disabled={loading || (!input.trim() && !image)} className="bg-pink-500 hover:bg-pink-600">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

