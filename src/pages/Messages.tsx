import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Search, 
  MoreVertical, 
  ChevronLeft, 
  Zap, 
  Image as ImageIcon, 
  Smile, 
  Paperclip,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Ghost,
  Lock,
  CheckCircle2,
  Star,
  Sparkles,
  Palette,
  Upload,
  Timer,
  Calendar,
  Key
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs,
  getDoc,
  limit,
  Timestamp,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI } from "@google/genai";

const AI_CHAT_ID = 'ai-assistant';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { Button } from '../components/Button';

import EmojiPicker, { Theme } from 'emoji-picker-react';

import { Skeleton } from '../components/Skeleton';
import { Card } from '../components/Card';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  read?: boolean;
  isGhost?: boolean;
  type?: 'text' | 'capsule';
  capsuleData?: {
    condition: 'date' | 'password';
    date?: any;
    hint?: string | null;
    password?: string;
    isUnlocked: boolean;
  };
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
  };
  reactions?: {
    [emoji: string]: string[]; // emoji to array of user IDs
  };
}

interface Chat {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCount?: number;
  storyContent?: string;
  ghostMode?: boolean;
  isBestFriend?: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  otherUser?: {
    uid: string;
    displayName: string;
    username: string;
    photoURL?: string;
    isOnline: boolean;
    lastSeen?: any;
  };
}

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) return null;

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return <span className="text-emerald-500 font-bold">Ready to unlock!</span>;

  return (
    <div className="flex gap-1.5 text-[10px] font-mono font-bold">
      {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
      <span>{timeLeft.hours.toString().padStart(2, '0')}h</span>
      <span>{timeLeft.minutes.toString().padStart(2, '0')}m</span>
      <span>{timeLeft.seconds.toString().padStart(2, '0')}s</span>
    </div>
  );
};

const ReactionPicker = ({ onSelect, onCancel }: { onSelect: (emoji: string) => void, onCancel: () => void }) => {
  const emojis = ['❤️', '🔥', '😂', '😮', '😢', '👍', '✨', '💯'];
  
  return (
    <>
      <div className="fixed inset-0 z-[450]" onClick={onCancel} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.5, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-900 rounded-full shadow-2xl border border-zinc-100 dark:border-zinc-800 p-1.5 flex gap-1 z-[451]"
      >
        {emojis.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </motion.div>
    </>
  );
};

export function Messages() {
  const { user, userData, showToast, login } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-64px)] p-4 text-center space-y-6">
        <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-pink-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Access Restricted</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            You need to be signed in to view your messages and sparks.
          </p>
        </div>
        <Button 
          variant="custom"
          onClick={login}
          className="px-8 h-14 bg-pink-500 text-white font-black uppercase tracking-widest rounded-2xl"
        >
          Sign In to Continue
        </Button>
      </div>
    );
  }

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const chatBackground = userData?.chatBackground || { type: 'pattern', value: 'default' };

  const getBackgroundStyle = () => {
    if (chatBackground.type === 'color') {
      return { backgroundColor: chatBackground.value };
    }
    if (chatBackground.type === 'gradient') {
      return { backgroundImage: chatBackground.value };
    }
    if (chatBackground.type === 'image') {
      return { 
        backgroundImage: `url(${chatBackground.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return {};
  };
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Toggle mobile bottom nav based on activeChat
  useEffect(() => {
    if (activeChat) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [activeChat]);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [searchMode, setSearchMode] = useState<'chats' | 'users'>('chats');
  const [filterMode, setFilterMode] = useState<'all' | 'best_friends'>('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showOtherProfile, setShowOtherProfile] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'chat' | 'message', id: string } | null>(null);
  
  const [isGhostMode, setIsGhostMode] = useState(false);

  // Time Capsule State
  const [showCapsuleModal, setShowCapsuleModal] = useState(false);
  const [showCapsuleVault, setShowCapsuleVault] = useState(false);
  const [capsuleCondition, setCapsuleCondition] = useState<'date' | 'password'>('date');
  const [capsuleDate, setCapsuleDate] = useState('');
  const [capsulePassword, setCapsulePassword] = useState('');
  const [capsuleMessage, setCapsuleMessage] = useState('');
  const [capsuleHint, setCapsuleHint] = useState('');
  const [unlockingCapsuleId, setUnlockingCapsuleId] = useState<string | null>(null);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [editingCapsuleId, setEditingCapsuleId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{chatId: string, x: number, y: number} | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hide mobile bottom nav when a chat is active
  useEffect(() => {
    if (activeChat) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => document.body.classList.remove('hide-mobile-nav');
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chats and their user data
  useEffect(() => {
    if (!user || !db) return;

    const q1 = query(
      collection(db, "sparks"),
      where("senderId", "==", user.uid),
      limit(50)
    );

    const q2 = query(
      collection(db, "sparks"),
      where("receiverId", "==", user.uid),
      limit(50)
    );

    const unsub1 = onSnapshot(q1, (snap1) => {
      const chats1 = snap1.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
        .filter(chat => chat.status === 'accepted');
      updateChats(chats1, 'sender');
    });

    const unsub2 = onSnapshot(q2, (snap2) => {
      const chats2 = snap2.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
        .filter(chat => chat.status === 'accepted');
      updateChats(chats2, 'receiver');
    });

    const updateChats = (newChats: Chat[], type: 'sender' | 'receiver') => {
      setChats(prev => {
        const otherTypeChats = prev.filter(c => 
          type === 'sender' ? c.receiverId === user.uid : c.senderId === user.uid
        );
        const combined = [...otherTypeChats, ...newChats];
        
        // Add AI Assistant chat
        const aiChat: Chat = {
          id: AI_CHAT_ID,
          senderId: user.uid,
          senderName: userData?.displayName || 'Me',
          receiverId: 'ai',
          receiverName: 'Heart Spark AI',
          status: 'accepted',
          otherUser: {
            uid: 'ai',
            displayName: 'Heart Spark AI',
            username: 'ai_assistant',
            isOnline: true,
            photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=ai'
          }
        };

        const finalChats = combined.some(c => c.id === AI_CHAT_ID) 
          ? combined 
          : [aiChat, ...combined];

        return finalChats
          .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
          .sort((a, b) => {
            if (a.id === AI_CHAT_ID) return -1;
            if (b.id === AI_CHAT_ID) return 1;
            const aTime = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
            const bTime = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
            return bTime - aTime;
          });
      });
      setLoadingChats(false);
    };

    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.uid]);

  // Real-time listener for other users' data (presence, name, etc.)
  useEffect(() => {
    if (!chats.length || !db) return;

    const unsubscribers = chats.map(chat => {
      const otherId = chat.senderId === user?.uid ? chat.receiverId : chat.senderId;
      return onSnapshot(doc(db, 'users', otherId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChats(prev => prev.map(c => {
            if (c.id === chat.id) {
              return {
                ...c,
                otherUser: {
                  uid: docSnap.id,
                  displayName: data.displayName,
                  username: data.username,
                  photoURL: data.photoURL,
                  isOnline: data.isOnline,
                  lastSeen: data.lastSeen
                }
              };
            }
            return c;
          }));
        }
      });
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [chats.length, user?.uid]);

  // Username search logic
  useEffect(() => {
    if (searchMode !== 'users' || searchTerm.trim().length < 3 || !db) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const cleanSearchTerm = searchTerm.startsWith('@') ? searchTerm.slice(1) : searchTerm;
        const q = query(
          collection(db, 'users'),
          where('username', '>=', cleanSearchTerm.toLowerCase()),
          where('username', '<=', cleanSearchTerm.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() }))
          .filter((u: any) => u.uid !== user?.uid);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchMode]);

  const handleStartChat = async (targetUser: any) => {
    if (!user || !db) return;

    // Check if chat already exists
    const existingChat = chats.find(c => c.senderId === targetUser.uid || c.receiverId === targetUser.uid);
    if (existingChat) {
      setActiveChat(existingChat);
      setSearchMode('chats');
      setSearchTerm('');
      return;
    }

    // Send a spark request
    try {
      const sparkData = {
        senderId: user.uid,
        senderName: userData?.displayName || user.displayName || 'User',
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        message: `Hey! I found you by your username @${targetUser.username}. Let's chat!`,
        status: 'pending',
        createdAt: serverTimestamp(),
        type: 'direct'
      };
      await addDoc(collection(db, 'sparks'), sparkData);
      showToast(`Spark request sent to @${targetUser.username}!`, 'success');
      setSearchMode('chats');
      setSearchTerm('');
    } catch (error) {
      console.error("Error starting chat:", error);
      showToast("Failed to send chat request", "error");
    }
  };

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat || !db) return;

    setLoadingMessages(true);
    const q = query(
      collection(db, `sparks/${activeChat.id}/messages`),
      orderBy("createdAt", "desc"),
      limit(30) // Reduced from 100 to save reads on free tier
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
      setMessages(msgs);
      setLoadingMessages(false);
      
      // Mark as read and handle ghost deletion
      msgs.forEach(async (m) => {
        if (m.senderId !== user?.uid && !m.read) {
          try {
            await updateDoc(doc(db, `sparks/${activeChat.id}/messages`, m.id), { read: true });
            
            // If it's a ghost message, delete it after a short delay
            if (m.isGhost) {
              setTimeout(async () => {
                try {
                  await deleteDoc(doc(db, `sparks/${activeChat.id}/messages`, m.id));
                } catch (e) {
                  // Message might already be deleted
                }
              }, 10000); // 10 seconds delay after reading
            }
          } catch (error) {
            console.error("Error updating message read status:", error);
          }
        }
      });
    });

    // Listen for typing indicator
    const unsubTyping = onSnapshot(doc(db, 'sparks', activeChat.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const typingStatus = data.typingStatus || {};
        const otherId = activeChat.senderId === user?.uid ? activeChat.receiverId : activeChat.senderId;
        setIsOtherTyping(!!typingStatus[otherId]);
      }
    });

    return () => {
      unsubscribe();
      unsubTyping();
    };
  }, [activeChat?.id]);

  const lastTypingTimeRef = useRef<number>(0);

  const handleTyping = () => {
    if (!activeChat || !user || !db) return;

    const now = Date.now();
    // Throttle typing updates to once every 2 seconds to save writes
    if (now - lastTypingTimeRef.current > 2000) {
      lastTypingTimeRef.current = now;
      // Set typing to true
      updateDoc(doc(db, 'sparks', activeChat.id), {
        [`typingStatus.${user.uid}`]: true
      }).catch(console.error);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set timeout to set typing to false
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'sparks', activeChat.id), {
        [`typingStatus.${user.uid}`]: false
      }).catch(console.error);
    }, 3000);
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendCapsule = async () => {
    if (!user || !activeChat || !capsuleMessage.trim() || isSending) return;
    if (capsuleCondition === 'date' && !capsuleDate) {
      showToast("Please select an unlock date.", "error");
      return;
    }
    if (capsuleCondition === 'password' && !capsulePassword.trim()) {
      showToast("Please set an unlock password.", "error");
      return;
    }

    setIsSending(true);
    try {
      const capsuleData = {
        condition: capsuleCondition,
        date: capsuleCondition === 'date' ? new Date(capsuleDate) : null,
        password: capsuleCondition === 'password' ? capsulePassword.trim() : null,
        hint: capsuleHint.trim() || null,
        isUnlocked: false
      };

      if (editingCapsuleId) {
        await updateDoc(doc(db, `sparks/${activeChat.id}/messages`, editingCapsuleId), {
          text: capsuleMessage.trim(),
          capsuleData
        });
        showToast("Time Capsule updated!", "success");
      } else {
        await addDoc(collection(db, `sparks/${activeChat.id}/messages`), {
          text: capsuleMessage.trim(),
          senderId: user.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: 'capsule',
          capsuleData
        });

        await updateDoc(doc(db, "sparks", activeChat.id), {
          lastMessage: "🔒 Sent a Time Capsule",
          lastMessageAt: serverTimestamp()
        });
        showToast("Time Capsule sealed and sent!", "success");
      }

      setShowCapsuleModal(false);
      setCapsuleMessage('');
      setCapsuleDate('');
      setCapsulePassword('');
      setCapsuleHint('');
      setEditingCapsuleId(null);
    } catch (error) {
      console.error("Error sending capsule:", error);
      showToast("Failed to send capsule", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleUnlockCapsule = async (msg: Message) => {
    if (!activeChat || !db || !user) return;
    
    if (msg.capsuleData?.condition === 'date') {
      const unlockTime = msg.capsuleData.date?.toDate().getTime();
      if (unlockTime && Date.now() >= unlockTime) {
        await updateDoc(doc(db, `sparks/${activeChat.id}/messages`, msg.id), { 
          'capsuleData.isUnlocked': true 
        });
        showToast("Capsule unlocked!", "success");
      } else {
        showToast("It's not time yet!", "error");
      }
    } else if (msg.capsuleData?.condition === 'password') {
      if (unlockPasswordInput.trim() === msg.capsuleData.password) {
        await updateDoc(doc(db, `sparks/${activeChat.id}/messages`, msg.id), { 
          'capsuleData.isUnlocked': true 
        });
        showToast("Correct password! Capsule unlocked!", "success");
        setUnlockingCapsuleId(null);
        setUnlockPasswordInput('');
      } else {
        showToast("Incorrect password.", "error");
      }
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!activeChat || !db || !user) return;
    
    // AI Assistant reactions are local only
    if (activeChat.id === AI_CHAT_ID) {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const currentReactions = m.reactions || {};
          const userIds = currentReactions[emoji] || [];
          let newReactions;
          if (userIds.includes(user.uid)) {
            const newUserIds = userIds.filter(id => id !== user.uid);
            if (newUserIds.length === 0) {
              const { [emoji]: _, ...rest } = currentReactions;
              newReactions = rest;
            } else {
              newReactions = { ...currentReactions, [emoji]: newUserIds };
            }
          } else {
            newReactions = { ...currentReactions, [emoji]: [...userIds, user.uid] };
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      }));
      setReactionPickerMessageId(null);
      return;
    }

    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const userIds = currentReactions[emoji] || [];
    
    let newReactions;
    if (userIds.includes(user.uid)) {
      // Remove reaction
      const newUserIds = userIds.filter(id => id !== user.uid);
      if (newUserIds.length === 0) {
        const { [emoji]: _, ...rest } = currentReactions;
        newReactions = rest;
      } else {
        newReactions = { ...currentReactions, [emoji]: newUserIds };
      }
    } else {
      // Add reaction
      newReactions = { ...currentReactions, [emoji]: [...userIds, user.uid] };
    }

    await updateDoc(doc(db, `sparks/${activeChat.id}/messages`, messageId), {
      reactions: newReactions
    });
    setReactionPickerMessageId(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim() || isSending) return;

    setIsSending(true);
    const text = newMessage.trim();
    const replyData = replyingTo ? {
      id: replyingTo.id,
      text: replyingTo.text,
      senderId: replyingTo.senderId,
      senderName: replyingTo.senderId === user.uid ? 'You' : (activeChat.otherUser?.displayName || 'Unknown')
    } : null;

    setNewMessage('');
    setReplyingTo(null);

    try {
      if (activeChat.id === AI_CHAT_ID) {
        // Handle AI Assistant
        const userMessage = {
          id: Date.now().toString(),
          text,
          senderId: user.uid,
          createdAt: Timestamp.now(),
          read: true
        };
        
        setMessages(prev => [...prev, userMessage as Message]);

        // Call Gemini
        const history = messages.map(m => ({
          role: m.senderId === user.uid ? "user" : "model",
          parts: [{ text: m.text }],
        }));

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [...history, { role: "user", parts: [{ text }] }],
        });

        const aiText = response.text || "I'm sorry, I couldn't process that.";

        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: aiText,
          senderId: 'ai',
          createdAt: Timestamp.now(),
          read: true
        };
        setMessages(prev => [...prev, aiMessage as Message]);
      } else {
        await addDoc(collection(db, `sparks/${activeChat.id}/messages`), {
          text,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          read: false,
          isGhost: isGhostMode,
          replyTo: replyData
        });

        // Only update spark document if it's not the AI Assistant
        if (activeChat.id !== AI_CHAT_ID) {
          await updateDoc(doc(db, "sparks", activeChat.id), {
            lastMessage: text,
            lastMessageAt: serverTimestamp()
          });
        }

        // Add notification for the receiver
        const otherId = activeChat.senderId === user.uid ? activeChat.receiverId : activeChat.senderId;
        await addDoc(collection(db, 'notifications'), {
          userId: otherId,
          message: `New message from ${userData?.displayName || 'someone'}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
          storyId: activeChat.id, // Using chat ID as storyId for navigation
          type: 'message',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Failed to send message", "error");
    } finally {
      setIsSending(false);
    }
  };

  const filteredChats = chats.filter(c => {
    const otherName = (c.senderId === user?.uid ? c.receiverName : c.senderName) || 'Unknown';
    const matchesSearch = otherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterMode === 'all' || (filterMode === 'best_friends' && c.isBestFriend);
    return matchesSearch && matchesFilter;
  });

  const filteredMessages = messages.filter(m => 
    m.text.toLowerCase().includes(chatSearchTerm.toLowerCase())
  );

  const handleBlockUser = async () => {
    if (!user || !activeChat || !db) return;
    const otherId = activeChat.senderId === user.uid ? activeChat.receiverId : activeChat.senderId;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const blocked = userSnap.data()?.blockedUsers || [];
      
      if (!blocked.includes(otherId)) {
        await updateDoc(userRef, {
          blockedUsers: [...blocked, otherId]
        });
        showToast("User blocked successfully", "success");
        setActiveChat(null);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast("Failed to block user", "error");
    }
  };

  const handleClearChat = async () => {
    if (!user || !activeChat || !db) return;
    
    try {
      const messagesRef = collection(db, `sparks/${activeChat.id}/messages`);
      const messagesSnap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      messagesSnap.docs.forEach(d => batch.delete(d.ref));
      
      // Clear last message in spark
      batch.update(doc(db, 'sparks', activeChat.id), {
        lastMessage: "",
        lastMessageAt: serverTimestamp()
      });

      await batch.commit();
      showToast("Chat history cleared", "success");
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error clearing chat:", error);
      showToast("Failed to clear chat history", "error");
    }
  };

  const handleDeleteChat = async () => {
    if (!user || !activeChat || !db) return;
    
    try {
      // Delete all messages first
      const messagesRef = collection(db, `sparks/${activeChat.id}/messages`);
      const messagesSnap = await getDocs(messagesRef);
      const deletePromises = messagesSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Delete the spark document
      await deleteDoc(doc(db, 'sparks', activeChat.id));
      
      showToast("Conversation and history deleted", "success");
      setActiveChat(null);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
      showToast("Failed to delete conversation", "error");
    }
  };

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean = true) => {
    if (!activeChat || !db || !user) return;
    
    if (activeChat.id === AI_CHAT_ID) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setShowDeleteConfirm(null);
      return;
    }

    try {
      if (forEveryone) {
        await deleteDoc(doc(db, `sparks/${activeChat.id}/messages`, messageId));
      } else {
        // Local delete only (simulated by deleting for all as requested by user's "delete from me" intent)
        await deleteDoc(doc(db, `sparks/${activeChat.id}/messages`, messageId));
      }
      showToast("Message deleted", "success");
    } catch (error) {
      console.error("Error deleting message:", error);
      showToast("Failed to delete message", "error");
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const toggleGhostMode = async () => {
    if (!activeChat || !db) return;
    try {
      const newStatus = !activeChat.ghostMode;
      await updateDoc(doc(db, 'sparks', activeChat.id), {
        ghostMode: newStatus
      });
      showToast(newStatus ? "Ghost Mode enabled! 👻" : "Ghost Mode disabled", "success");
    } catch (error) {
      console.error("Error toggling Ghost Mode:", error);
      showToast("Failed to toggle Ghost Mode", "error");
    }
  };

  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !editingMessageId || !editingText.trim() || !db) return;

    try {
      await updateDoc(doc(db, `sparks/${activeChat.id}/messages`, editingMessageId), {
        text: editingText.trim(),
        editedAt: serverTimestamp()
      });
      setEditingMessageId(null);
      setEditingText('');
      showToast("Message updated", "success");
    } catch (error) {
      console.error("Error editing message:", error);
      showToast("Failed to update message", "error");
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-pink-500" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Login to Chat</h2>
        <p className="text-zinc-500 max-w-xs">You need to be logged in to view your messages and sparks.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex bg-white dark:bg-[#0A0A0B] overflow-hidden relative w-full h-[calc(100dvh-64px)]",
      !activeChat && "pb-16 md:pb-0" // Account for MobileBottomNav
    )}>
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-zinc-100 dark:border-zinc-900 flex flex-col transition-all h-full",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Messages</h1>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              <button 
                onClick={() => { setSearchMode('chats'); setFilterMode('all'); }}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  searchMode === 'chats' && filterMode === 'all' ? "bg-white dark:bg-zinc-800 text-pink-500 shadow-sm" : "text-zinc-500"
                )}
              >
                Chats
              </button>
              <button 
                onClick={() => { setSearchMode('chats'); setFilterMode('best_friends'); }}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1",
                  searchMode === 'chats' && filterMode === 'best_friends' ? "bg-white dark:bg-zinc-800 text-yellow-500 shadow-sm" : "text-zinc-500"
                )}
              >
                <Star className="w-3 h-3" />
                Besties
              </button>
              <button 
                onClick={() => setSearchMode('users')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  searchMode === 'users' ? "bg-white dark:bg-zinc-800 text-pink-500 shadow-sm" : "text-zinc-500"
                )}
              >
                Find
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={searchMode === 'chats' ? "Search chats..." : "Find by @username..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-pink-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {searchMode === 'users' ? (
            <div className="p-2">
              {searching ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                </div>
              ) : searchResults.length === 0 ? (
                searchTerm.trim() ? (
                  <div className="text-center py-10 px-6">
                    <p className="text-sm text-zinc-500">No users found with that username.</p>
                  </div>
                ) : (
                  <div className="text-center py-10 px-6">
                    <p className="text-sm text-zinc-500">Type at least 3 characters to find friends!</p>
                  </div>
                )
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1"
                >
                  {searchResults.map((u, idx) => (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={u.uid}
                      onClick={() => handleStartChat(u)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-2xl transition-colors"
                    >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center text-cyan-500 font-bold shrink-0 border border-cyan-500/10">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        u.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-zinc-900 dark:text-white text-sm">{u.displayName}</p>
                      <p className="text-xs text-zinc-500">@{u.username}</p>
                    </div>
                    <div className="px-3 py-1 bg-pink-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-pink-500/20">
                      Request
                    </div>
                  </motion.button>
                ))}
                </motion.div>
              )}
            </div>
          ) : loadingChats ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <MessageSquare className="w-12 h-12 text-zinc-200 mb-4" />
              <p className="text-zinc-500 text-sm">No chats yet. Spark some connections in the community!</p>
            </div>
          ) : (
            filteredChats.map((chat, idx) => {
              const otherUser = chat.otherUser;
              const otherName = otherUser?.displayName || (chat.senderId === user.uid ? chat.receiverName : chat.senderName) || 'Unknown';
              const isActive = activeChat?.id === chat.id;
              
              return (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ chatId: chat.id, x: e.clientX, y: e.clientY });
                  }}
                  className={cn(
                    "w-full p-4 flex gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-50 dark:border-zinc-900/50",
                    isActive && "bg-pink-50 dark:bg-pink-500/5"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center text-pink-500 font-bold border border-pink-500/10 overflow-hidden">
                      {otherUser?.photoURL ? (
                        <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        otherName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {otherUser?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#0A0A0B] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-zinc-900 dark:text-white truncate">
                        {otherName}
                        {chat.isBestFriend && <Sparkles className="w-3 h-3 text-pink-500 inline ml-1" />}
                      </span>
                      <span className="text-[10px] text-zinc-400">{formatTime(chat.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div 
              className="fixed inset-0 z-[400]" 
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed z-[401] bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-2 w-48 overflow-hidden"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button 
                className="w-full px-4 py-2 text-left text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                onClick={async () => {
                  const chat = chats.find(c => c.id === contextMenu.chatId);
                  if (chat && db) {
                    await updateDoc(doc(db, "sparks", chat.id), {
                      isBestFriend: !chat.isBestFriend
                    });
                  }
                  setContextMenu(null);
                }}
              >
                <Star className="w-4 h-4 text-yellow-500" />
                Toggle Best Friend
              </button>
              <button 
                className="w-full px-4 py-2 text-left text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                onClick={() => {
                  navigate('/tools/signal-analyzer');
                  setContextMenu(null);
                }}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Analyze Vibe
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-zinc-50/30 dark:bg-black/20 h-full overflow-hidden relative min-w-0 min-h-0",
        !activeChat && "hidden md:flex items-center justify-center"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-[#0A0A0B] border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="md:hidden p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center text-pink-500 font-bold border border-pink-500/10 overflow-hidden">
                    {activeChat.otherUser?.photoURL ? (
                      <img src={activeChat.otherUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (activeChat.otherUser?.displayName || (activeChat.senderId === user.uid ? activeChat.receiverName : activeChat.senderName) || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  {activeChat.otherUser?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#0A0A0B] rounded-full" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-zinc-900 dark:text-white">
                    {activeChat.otherUser?.displayName || (activeChat.senderId === user.uid ? activeChat.receiverName : activeChat.senderName) || 'Unknown'}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {activeChat.otherUser?.isOnline ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                          {isOtherTyping ? "Typing..." : "Online"}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        Offline {activeChat.otherUser?.lastSeen ? `• ${formatTime(activeChat.otherUser.lastSeen)}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl px-3 py-1.5 transition-all",
                  isSearchingChat ? "w-48 opacity-100" : "w-0 opacity-0 overflow-hidden"
                )}>
                  <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Search messages..."
                    value={chatSearchTerm}
                    onChange={(e) => setChatSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs w-full"
                  />
                </div>
                <button 
                  onClick={() => {
                    setIsSearchingChat(!isSearchingChat);
                    if (isSearchingChat) setChatSearchTerm('');
                  }}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isSearchingChat ? "bg-pink-500 text-white" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  title="Search messages"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowCapsuleVault(true)}
                  className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all relative"
                  title="Time Capsule Vault"
                >
                  <Lock className="w-5 h-5" />
                  {messages.filter(m => m.type === 'capsule' && !m.capsuleData?.isUnlocked).length > 0 && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white dark:border-[#0A0A0B]" />
                  )}
                </button>
                <button 
                  onClick={() => {
                    const newValue = !isGhostMode;
                    setIsGhostMode(newValue);
                    showToast(newValue ? "Ghost Mode ON: Messages will disappear" : "Ghost Mode OFF", newValue ? "success" : "info");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                    isGhostMode 
                      ? "bg-purple-500/10 text-purple-500 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                  title="Toggle Ghost Mode (Disappearing Messages)"
                >
                  <Ghost className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isGhostMode ? "Ghost On" : "Ghost Off"}</span>
                </button>
                <button 
                  onClick={() => {
                    // Format the last 50 messages for analysis
                    const transcript = messages.slice(-50).map(m => {
                      const sender = m.senderId === user.uid ? "Me" : (activeChat.otherUser?.displayName || "Them");
                      return `${sender}: ${m.text}`;
                    }).join('\n');
                    
                    navigate('/tools/signal-analyzer', { 
                      state: { 
                        chatTranscript: transcript,
                        otherUserName: activeChat.otherUser?.displayName || "Them"
                      } 
                    });
                  }}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all"
                  title="Analyze Vibe"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                <div className="relative group">
                  <button 
                    className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                    <button 
                      onClick={() => setShowBackgroundModal(true)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      <Palette className="w-4 h-4 text-pink-500" />
                      Chat Background
                    </button>
                    <button 
                      onClick={() => setShowOtherProfile(true)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      View Profile
                    </button>
                    <button 
                      onClick={handleBlockUser}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
                    >
                      Block User
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm({ type: 'chat', id: activeChat.id })}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
                    >
                      Remove Friend
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm({ type: 'message', id: 'clear_all' })}
                      className="w-full px-4 py-3 text-left text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      Clear Chat History
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide relative z-0 min-h-0" style={getBackgroundStyle()}>
              {/* Background Overlay for Readability */}
              {chatBackground.type !== 'pattern' && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 pointer-events-none z-[-1]" />
              )}
              
              {/* Telegram-style Background Pattern */}
              {(chatBackground.type === 'pattern' || chatBackground.showPattern) && (
                <div 
                  className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none" 
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='15' y='35' font-size='20' opacity='0.7'%3E✨%3C/text%3E%3Ctext x='75' y='25' font-size='16' opacity='0.5'%3E💖%3C/text%3E%3Ctext x='35' y='85' font-size='24' opacity='0.6'%3E🌸%3C/text%3E%3Ctext x='95' y='95' font-size='18' opacity='0.8'%3E💫%3C/text%3E%3Ctext x='60' y='60' font-size='14' opacity='0.4'%3E🦋%3C/text%3E%3C/svg%3E")`,
                    backgroundSize: '120px 120px'
                  }} 
                />
              )}
              
              <div className="flex justify-center mb-8 relative z-10">
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 dark:border-white/5 text-center max-w-xs shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
                  <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Spark Context</p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium italic">"{activeChat.storyContent}"</p>
                </div>
              </div>

              {loadingMessages ? (
                <div className="p-4 space-y-6 relative z-10">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <Skeleton className={cn("h-12 w-48", i % 2 === 0 ? "rounded-2xl rounded-tr-none" : "rounded-2xl rounded-tl-none")} />
                    </div>
                  ))}
                </div>
              ) : (
                filteredMessages.map((msg, i) => {
                  const isMe = msg.senderId === user.uid;
                  const showTime = i === 0 || (msg.createdAt?.toMillis() - messages[i-1].createdAt?.toMillis() > 300000);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95, originX: isMe ? 1 : 0, originY: 1 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}
                      drag="x"
                      dragConstraints={{ left: isMe ? -50 : 0, right: isMe ? 0 : 50 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info) => {
                        if (Math.abs(info.offset.x) > 40) {
                          setReplyingTo(msg);
                        }
                      }}
                      key={msg.id} 
                      className="space-y-1 relative z-10"
                    >
                      {showTime && (
                        <div className="flex justify-center my-6">
                          <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "flex group/msg",
                        isMe ? "justify-end" : "justify-start"
                      )}>
                        <div className="relative flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
                          {isMe && !editingMessageId && (
                            <div className="flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingText(msg.text);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-sm transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setReplyingTo(msg)}
                                className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-sm transition-all"
                                title="Reply"
                              >
                                <Send className="w-3.5 h-3.5 rotate-180" />
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm({ type: 'message', id: msg.id })}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-sm transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          
                          {!isMe && (
                            <div className="flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity order-last">
                              <button 
                                onClick={() => setReplyingTo(msg)}
                                className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-sm transition-all"
                                title="Reply"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setReactionPickerMessageId(msg.id)}
                                className="p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-sm transition-all"
                                title="React"
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div 
                            onClick={() => {
                              if (reactionPickerMessageId === msg.id) {
                                setReactionPickerMessageId(null);
                              } else {
                                setReactionPickerMessageId(msg.id);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setReactionPickerMessageId(msg.id);
                            }}
                            className={cn(
                              "px-4 py-3 rounded-[20px] text-[15px] leading-relaxed shadow-sm relative cursor-pointer active:scale-[0.98] transition-transform",
                              isMe 
                                ? (msg.isGhost ? "bg-purple-600 text-white rounded-br-sm shadow-[0_4px_20px_rgba(147,51,234,0.25)] border border-purple-400/50" : "bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-br-sm shadow-[0_4px_15px_rgba(236,72,153,0.2)]")
                                : (msg.isGhost ? "bg-zinc-800 text-purple-100 rounded-bl-sm border border-purple-500/30" : "bg-white dark:bg-[#18181B] text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800/50 rounded-bl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]"),
                              activeChat.isBestFriend && isMe && !msg.isGhost && "shadow-[0_0_25px_rgba(236,72,153,0.35)] border border-pink-400/50",
                              activeChat.isBestFriend && !isMe && !msg.isGhost && "shadow-[0_0_25px_rgba(234,179,8,0.15)] border border-yellow-400/30"
                            )}
                          >
                            {msg.replyTo && (
                              <div className={cn(
                                "mb-2 p-2 rounded-lg border-l-2 text-xs bg-black/5 dark:bg-white/5",
                                isMe ? "border-white/50 text-white/80" : "border-pink-500 text-zinc-500"
                              )}>
                                <p className="font-bold text-[10px] mb-0.5">{msg.replyTo.senderName}</p>
                                <p className="truncate italic">"{msg.replyTo.text}"</p>
                              </div>
                            )}

                            {msg.type === 'capsule' ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={cn("p-1.5 rounded-full", msg.capsuleData?.isUnlocked ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-500/20 text-zinc-500")}>
                                    {msg.capsuleData?.isUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-widest">Time Capsule</span>
                                </div>
                                {msg.capsuleData?.isUnlocked ? (
                                  <p className="whitespace-pre-wrap">{msg.text}</p>
                                ) : (
                                  <div className="space-y-3">
                                    {msg.capsuleData?.hint && (
                                      <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-white/10 italic text-xs opacity-80">
                                        <span className="font-bold not-italic mr-1">Hint:</span>
                                        {msg.capsuleData.hint}
                                      </div>
                                    )}
                                    <div className="text-center p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5">
                                      <div className="flex items-center justify-center gap-2 mb-2 opacity-70">
                                        <Timer className="w-3 h-3" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">
                                          {msg.capsuleData?.condition === 'date' 
                                            ? 'Unlocks In'
                                            : 'Password Required'}
                                        </p>
                                      </div>
                                      
                                      <div className="mb-3">
                                        {msg.capsuleData?.condition === 'date' && msg.capsuleData.date ? (
                                          <CountdownTimer targetDate={msg.capsuleData.date.toDate()} />
                                        ) : msg.capsuleData?.condition === 'password' ? (
                                          <div className="flex flex-col gap-2">
                                            {unlockingCapsuleId === msg.id ? (
                                              <div className="flex flex-col gap-2">
                                                <input 
                                                  type="text"
                                                  placeholder="Enter password..."
                                                  value={unlockPasswordInput}
                                                  onChange={(e) => setUnlockPasswordInput(e.target.value)}
                                                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-[10px] text-white outline-none placeholder:text-white/40"
                                                  autoFocus
                                                />
                                                <div className="flex gap-2">
                                                  <button 
                                                    onClick={() => {
                                                      setUnlockingCapsuleId(null);
                                                      setUnlockPasswordInput('');
                                                    }}
                                                    className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-[8px] font-bold uppercase tracking-widest rounded-md transition-colors text-white"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button 
                                                    onClick={() => handleUnlockCapsule(msg)}
                                                    className="flex-1 py-1 bg-indigo-500 hover:bg-indigo-600 text-[8px] font-bold uppercase tracking-widest rounded-md transition-colors text-white"
                                                  >
                                                    Unlock
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-400">
                                                <Lock className="w-3 h-3" />
                                                <span>Locked with password</span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-400">
                                            <Zap className="w-3 h-3" />
                                            <span>Waiting for both sparks</span>
                                          </div>
                                        )}
                                      </div>

                                      {!isMe && !msg.capsuleData?.isUnlocked && unlockingCapsuleId !== msg.id && (
                                        <button 
                                          onClick={() => {
                                            if (msg.capsuleData?.condition === 'password') {
                                              setUnlockingCapsuleId(msg.id);
                                            } else {
                                              handleUnlockCapsule(msg);
                                            }
                                          }}
                                          className="w-full py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                          Try to Unlock
                                        </button>
                                      )}
                                      {isMe && !msg.capsuleData?.isUnlocked && (
                                        <button 
                                          onClick={() => {
                                            setEditingCapsuleId(msg.id);
                                            setCapsuleMessage(msg.text);
                                            setCapsuleHint(msg.capsuleData?.hint || '');
                                            setCapsuleCondition(msg.capsuleData?.condition || 'date');
                                            if (msg.capsuleData?.date) {
                                              setCapsuleDate(msg.capsuleData.date.toDate().toISOString().split('T')[0]);
                                            }
                                            if (msg.capsuleData?.password) {
                                              setCapsulePassword(msg.capsuleData.password);
                                            }
                                            setShowCapsuleModal(true);
                                          }}
                                          className="mt-2 text-[10px] font-bold text-white/60 hover:text-white underline"
                                        >
                                          Edit Capsule
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : msg.isGhost ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                  <Ghost className="w-3 h-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Ghost Message</span>
                                </div>
                                {editingMessageId === msg.id ? (
                                  <form onSubmit={handleEditMessage} className="flex flex-col gap-2 min-w-[200px]">
                                    <textarea
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-sm text-white outline-none focus:ring-1 focus:ring-white/50"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => setEditingMessageId(null)}
                                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 rounded-lg transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        type="submit"
                                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white text-pink-500 rounded-lg transition-colors"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    {msg.text}
                                    {(msg as any).editedAt && (
                                      <span className="ml-2 text-[8px] opacity-50 italic">(edited)</span>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              editingMessageId === msg.id ? (
                                <form onSubmit={handleEditMessage} className="flex flex-col gap-2 min-w-[200px]">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-sm text-white outline-none focus:ring-1 focus:ring-white/50"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => setEditingMessageId(null)}
                                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      type="submit"
                                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white text-pink-500 rounded-lg transition-colors"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  {msg.text}
                                  {(msg as any).editedAt && (
                                    <span className="ml-2 text-[8px] opacity-50 italic">(edited)</span>
                                  )}
                                </>
                              )
                            )}
                            <div className={cn(
                              "flex items-center justify-end gap-1 mt-1",
                              isMe ? "text-pink-100" : "text-zinc-400"
                            )}>
                              <span className="text-[8px] font-bold opacity-70">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                              )}
                            </div>

                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className={cn(
                                "absolute -bottom-2 flex flex-wrap gap-1",
                                isMe ? "right-0" : "left-0"
                              )}>
                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                  <motion.button
                                    key={emoji}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.2 }}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={cn(
                                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] shadow-sm border transition-all",
                                      userIds.includes(user.uid)
                                        ? "bg-pink-500 text-white border-pink-400"
                                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-100 dark:border-zinc-700"
                                    )}
                                  >
                                    <span className="animate-bounce-slow">{emoji}</span>
                                    {userIds.length > 1 && <span>{userIds.length}</span>}
                                  </motion.button>
                                ))}
                              </div>
                            )}
                          </div>
                          {reactionPickerMessageId === msg.id && (
                            <ReactionPicker 
                              onSelect={(emoji) => handleReaction(msg.id, emoji)}
                              onCancel={() => setReactionPickerMessageId(null)}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-[#0A0A0B] border-t border-zinc-100 dark:border-zinc-900 relative shrink-0">
              {replyingTo && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border-l-4 border-pink-500 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-0.5">
                      Replying to {replyingTo.senderId === user.uid ? 'yourself' : (activeChat.otherUser?.displayName || 'Unknown')}
                    </p>
                    <p className="text-xs text-zinc-500 truncate italic">"{replyingTo.text}"</p>
                  </div>
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-4 mb-2 z-[100] shadow-2xl rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                  <EmojiPicker 
                    onEmojiClick={onEmojiClick}
                    theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                    width={320}
                    height={400}
                  />
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className={cn(
                  "flex-1 flex items-end gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-3xl border transition-all",
                  isGhostMode 
                    ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
                    : "border-transparent focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-500/20"
                )}>
                  <div className="flex gap-1 shrink-0 pb-1 pl-1">
                    <button 
                      type="button" 
                      onClick={() => setShowCapsuleModal(true)}
                      className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors rounded-xl"
                      title="Send Time Capsule"
                    >
                      <Lock className="w-5 h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={cn(
                        "p-2 transition-colors rounded-xl",
                        showEmojiPicker ? "bg-pink-500 text-white" : "text-zinc-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                      )}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                        // Auto-expand
                        e.target.style.height = 'inherit';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                      placeholder={isGhostMode ? "Type a ghost message..." : "Type a message..."}
                      rows={1}
                      className={cn(
                        "w-full py-3 bg-transparent text-sm outline-none transition-all resize-none max-h-32 overflow-y-auto",
                        isGhostMode ? "placeholder-purple-400/50 text-purple-600 dark:text-purple-400" : "text-zinc-900 dark:text-white"
                      )}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className={cn(
                      "shrink-0 p-3 text-white rounded-2xl shadow-lg transition-all disabled:opacity-50 active:scale-95 mb-0.5 mr-0.5",
                      isGhostMode ? "bg-purple-500 shadow-purple-500/20 hover:bg-purple-600" : "bg-pink-500 shadow-pink-500/20 hover:bg-pink-600"
                    )}
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-pink-500" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Your Conversations</h3>
            <p className="text-zinc-500 max-w-xs mx-auto">Select a chat to start messaging. All your sparks are here!</p>
          </div>
        )}
      </div>
      {/* Background Customization Modal */}
      <AnimatePresence>
        {showBackgroundModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Chat Vibe</h2>
                  <button onClick={() => setShowBackgroundModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                  {/* Solid Colors */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Solid Colors</p>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { name: 'Default', value: 'transparent' },
                        { name: 'Zinc', value: '#18181b' },
                        { name: 'Pink', value: '#fdf2f8' },
                        { name: 'Rose', value: '#fff1f2' },
                        { name: 'Indigo', value: '#eef2ff' },
                      ].map((color) => (
                        <button
                          key={color.name}
                          onClick={() => updateDoc(doc(db, 'users', user.uid), { 'chatBackground.type': 'color', 'chatBackground.value': color.value })}
                          className={cn(
                            "w-full aspect-square rounded-xl border-2 transition-all hover:scale-105",
                            chatBackground.type === 'color' && chatBackground.value === color.value ? "border-pink-500 shadow-lg shadow-pink-500/20" : "border-transparent"
                          )}
                          style={{ backgroundColor: color.value === 'transparent' ? '#f4f4f5' : color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Gradients */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Gradients</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'Soft Pink', value: 'linear-gradient(to bottom right, #fdf2f8, #fbcfe8)' },
                        { name: 'Cosmic', value: 'linear-gradient(to bottom right, #faf5ff, #e9d5ff)' },
                        { name: 'Ocean', value: 'linear-gradient(to bottom right, #f0f9ff, #bae6fd)' },
                      ].map((grad) => (
                        <button
                          key={grad.name}
                          onClick={() => updateDoc(doc(db, 'users', user.uid), { 'chatBackground.type': 'gradient', 'chatBackground.value': grad.value })}
                          className={cn(
                            "w-full h-12 rounded-xl border-2 transition-all hover:scale-105",
                            chatBackground.type === 'gradient' && chatBackground.value === grad.value ? "border-pink-500 shadow-lg shadow-pink-500/20" : "border-transparent"
                          )}
                          style={{ backgroundImage: grad.value }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom Image */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Custom Image</p>
                    <div className="flex gap-3">
                      <label className="flex-1 h-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                        {isUploadingBg ? (
                          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-pink-500 transition-colors" />
                            <span className="text-[10px] font-bold text-zinc-500 mt-1">Upload Image</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !user) return;
                            
                            if (file.size > 2 * 1024 * 1024) {
                              showToast("Image must be less than 2MB", "error");
                              return;
                            }

                            setIsUploadingBg(true);
                            try {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const base64 = reader.result as string;
                                const storageRef = ref(storage, `backgrounds/${user.uid}`);
                                await uploadString(storageRef, base64, 'data_url');
                                const url = await getDownloadURL(storageRef);
                                await updateDoc(doc(db, 'users', user.uid), { 
                                  'chatBackground.type': 'image', 
                                  'chatBackground.value': url 
                                });
                                showToast("Background updated!", "success");
                              };
                              reader.readAsDataURL(file);
                            } catch (err) {
                              console.error(err);
                              showToast("Failed to upload image", "error");
                            } finally {
                              setIsUploadingBg(false);
                            }
                          }} 
                        />
                      </label>
                      {chatBackground.type === 'image' && (
                        <div className="w-20 h-20 rounded-2xl border-2 border-pink-500 overflow-hidden shadow-lg shadow-pink-500/20">
                          <img src={chatBackground.value} alt="Current" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pattern Toggle */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">Aesthetic Pattern</p>
                        <p className="text-[10px] text-zinc-500">Overlay the signature spark pattern</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateDoc(doc(db, 'users', user.uid), { 'chatBackground.showPattern': !chatBackground.showPattern })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        chatBackground.showPattern ? "bg-pink-500" : "bg-zinc-300 dark:bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        chatBackground.showPattern ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => setShowBackgroundModal(false)}
                  className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-widest"
                >
                  Looks Good!
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white dark:bg-[#0A0A0B] rounded-3xl p-6 shadow-2xl border border-zinc-100 dark:border-zinc-900"
            >
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
                {showDeleteConfirm.type === 'chat' ? 'Remove Friend?' : 
                 showDeleteConfirm.id === 'clear_all' ? 'Clear Chat History?' : 'Delete Message?'}
              </h3>
              <p className="text-zinc-500 text-sm mb-6">
                {showDeleteConfirm.type === 'chat' 
                  ? 'This will permanently remove this connection and delete all messages for both participants.'
                  : showDeleteConfirm.id === 'clear_all'
                  ? 'This will delete all messages in this chat for both participants, but you will stay connected.'
                  : 'Do you want to delete this message?'}
              </p>
              <div className="flex flex-col gap-3">
                {showDeleteConfirm.type === 'message' && showDeleteConfirm.id !== 'clear_all' && (
                  <>
                    <Button 
                      variant="custom" 
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-red-500/20"
                      onClick={() => handleDeleteMessage(showDeleteConfirm.id, true)}
                    >
                      Delete for Everyone
                    </Button>
                    <Button 
                      variant="custom" 
                      className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl h-12"
                      onClick={() => handleDeleteMessage(showDeleteConfirm.id, false)}
                    >
                      Delete for Me
                    </Button>
                  </>
                )}
                {(showDeleteConfirm.type === 'chat' || showDeleteConfirm.id === 'clear_all') && (
                  <Button 
                    variant="custom" 
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-red-500/20"
                    onClick={() => {
                      if (showDeleteConfirm.type === 'chat') {
                        handleDeleteChat();
                      } else if (showDeleteConfirm.id === 'clear_all') {
                        handleClearChat();
                      }
                    }}
                  >
                    Confirm Delete
                  </Button>
                )}
                <Button 
                  variant="custom" 
                  className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl h-12"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Other User Profile Modal */}
      <AnimatePresence>
        {showOtherProfile && activeChat && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-[#0A0A0B] rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-900"
            >
              <div className="h-24 bg-gradient-to-r from-pink-500 to-purple-500" />
              <div className="px-6 pb-8 text-center -mt-12">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#0A0A0B] bg-zinc-100 dark:bg-zinc-800 mx-auto overflow-hidden shadow-lg mb-4">
                  {activeChat.otherUser?.photoURL ? (
                    <img src={activeChat.otherUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-pink-500">
                      {(activeChat.otherUser?.displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                  {activeChat.otherUser?.displayName || 'Unknown User'}
                </h3>
                <p className="text-sm text-pink-500 font-bold mb-4">@{activeChat.otherUser?.username || 'user'}</p>
                
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-6">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">About</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {activeChat.otherUser?.displayName === 'Unknown User' ? 'Loading profile...' : (activeChat.otherUser as any)?.bio || 'No bio provided.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="custom" 
                    className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl h-12"
                    onClick={() => setShowOtherProfile(false)}
                  >
                    Close
                  </Button>
                  <Button 
                    variant="custom" 
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-pink-500/20"
                    onClick={() => {
                      setShowOtherProfile(false);
                      navigate(`/profile/${activeChat.otherUser.uid}`);
                    }}
                  >
                    View Posts
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Time Capsule Modal */}
      <AnimatePresence>
        {showCapsuleModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white dark:bg-[#0A0A0B] rounded-3xl p-6 shadow-2xl border border-zinc-100 dark:border-zinc-900"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">Time Capsule</h3>
                    <p className="text-xs text-zinc-500">Send a locked message</p>
                  </div>
                </div>
                <button onClick={() => setShowCapsuleModal(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-widest">
                    Secret Message
                  </label>
                  <textarea
                    value={capsuleMessage}
                    onChange={(e) => setCapsuleMessage(e.target.value)}
                    placeholder="Write something they won't see until it unlocks..."
                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-white min-h-[100px] resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-widest">
                    Capsule Hint (Optional)
                  </label>
                  <input
                    type="text"
                    value={capsuleHint}
                    onChange={(e) => setCapsuleHint(e.target.value)}
                    placeholder="e.g., A memory from our first date..."
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-widest">
                    Unlock Condition
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCapsuleCondition('date')}
                      className={cn(
                        "p-2 rounded-xl border-2 text-center transition-all",
                        capsuleCondition === 'date'
                          ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-cyan-300"
                      )}
                    >
                      <Calendar className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
                      <div className="font-bold text-zinc-900 dark:text-white text-[10px]">Date</div>
                    </button>
                    <button
                      onClick={() => setCapsuleCondition('password')}
                      className={cn(
                        "p-2 rounded-xl border-2 text-center transition-all",
                        capsuleCondition === 'password'
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-purple-300"
                      )}
                    >
                      <Key className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                      <div className="font-bold text-zinc-900 dark:text-white text-[10px]">Password</div>
                    </button>
                  </div>
                </div>

                {capsuleCondition === 'date' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-widest">
                      Unlock Date
                    </label>
                    <input
                      type="date"
                      value={capsuleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCapsuleDate(e.target.value)}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-white text-sm"
                    />
                  </motion.div>
                )}

                {capsuleCondition === 'password' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-widest">
                      Set Password
                    </label>
                    <input
                      type="text"
                      value={capsulePassword}
                      onChange={(e) => setCapsulePassword(e.target.value)}
                      placeholder="Enter a secret password..."
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-white text-sm"
                    />
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold shadow-lg shadow-indigo-500/25 border-0 mt-2"
                  onClick={handleSendCapsule}
                  disabled={isSending || !capsuleMessage.trim() || (capsuleCondition === 'date' && !capsuleDate) || (capsuleCondition === 'password' && !capsulePassword.trim())}
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Seal & Send Capsule"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Capsule Vault Modal */}
      <AnimatePresence>
        {showCapsuleVault && activeChat && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white dark:bg-[#0A0A0B] rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-900"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Capsule Vault</h3>
                </div>
                <button onClick={() => setShowCapsuleVault(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {messages.filter(m => m.type === 'capsule').length === 0 ? (
                  <div className="text-center py-12">
                    <Lock className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-500 text-sm">No time capsules in this vault yet.</p>
                  </div>
                ) : (
                  messages.filter(m => m.type === 'capsule').sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all",
                        msg.capsuleData?.isUnlocked 
                          ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20" 
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {msg.capsuleData?.isUnlocked ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-zinc-400" />}
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", msg.capsuleData?.isUnlocked ? "text-emerald-500" : "text-zinc-500")}>
                            {msg.capsuleData?.isUnlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-bold">{formatTime(msg.createdAt)}</span>
                      </div>
                      
                      {msg.capsuleData?.isUnlocked ? (
                        <p className="text-sm text-zinc-800 dark:text-zinc-200 italic">"{msg.text}"</p>
                      ) : (
                        <div className="space-y-2">
                          {msg.capsuleData?.hint && (
                            <p className="text-xs text-zinc-500 italic">Hint: {msg.capsuleData.hint}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-indigo-500">
                              {msg.capsuleData?.condition === 'date' 
                                ? "Unlocks on date" 
                                : "Password required"}
                            </div>
                            {msg.senderId !== user.uid ? (
                              <button 
                                onClick={() => {
                                  if (msg.capsuleData?.condition === 'password') {
                                    setUnlockingCapsuleId(msg.id);
                                    setShowCapsuleVault(false);
                                  } else {
                                    handleUnlockCapsule(msg);
                                    setShowCapsuleVault(false);
                                  }
                                }}
                                className="text-[10px] font-black text-pink-500 uppercase tracking-widest hover:underline"
                              >
                                Try Unlock
                              </button>
                            ) : (
                              !msg.capsuleData?.isUnlocked && (
                                <button 
                                  onClick={() => {
                                    setEditingCapsuleId(msg.id);
                                    setCapsuleMessage(msg.text);
                                    setCapsuleHint(msg.capsuleData?.hint || '');
                                    setCapsuleCondition(msg.capsuleData?.condition || 'date');
                                    if (msg.capsuleData?.date) {
                                      setCapsuleDate(msg.capsuleData.date.toDate().toISOString().split('T')[0]);
                                    }
                                    if (msg.capsuleData?.password) {
                                      setCapsulePassword(msg.capsuleData.password);
                                    }
                                    setShowCapsuleVault(false);
                                    setShowCapsuleModal(true);
                                  }}
                                  className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
                                >
                                  Edit
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900">
                <Button 
                  onClick={() => {
                    setShowCapsuleVault(false);
                    setShowCapsuleModal(true);
                  }}
                  className="w-full h-12 bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  Send New Capsule
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
