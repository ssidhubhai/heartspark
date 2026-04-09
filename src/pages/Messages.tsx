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
  Ghost
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
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { Button } from '../components/Button';

import EmojiPicker, { Theme } from 'emoji-picker-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  read?: boolean;
  isGhost?: boolean;
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
  otherUser?: {
    uid: string;
    displayName: string;
    username: string;
    photoURL?: string;
    isOnline: boolean;
    lastSeen?: any;
  };
}

export function Messages() {
  const { user, userData, showToast } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [searchMode, setSearchMode] = useState<'chats' | 'users'>('chats');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showOtherProfile, setShowOtherProfile] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'chat' | 'message', id: string } | null>(null);
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
      where("status", "==", "accepted"),
      where("senderId", "==", user.uid)
    );

    const q2 = query(
      collection(db, "sparks"),
      where("status", "==", "accepted"),
      where("receiverId", "==", user.uid)
    );

    const unsub1 = onSnapshot(q1, (snap1) => {
      const chats1 = snap1.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      updateChats(chats1, 'sender');
    });

    const unsub2 = onSnapshot(q2, (snap2) => {
      const chats2 = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      updateChats(chats2, 'receiver');
    });

    const updateChats = (newChats: Chat[], type: 'sender' | 'receiver') => {
      setChats(prev => {
        const otherTypeChats = prev.filter(c => 
          type === 'sender' ? c.receiverId === user.uid : c.senderId === user.uid
        );
        const combined = [...otherTypeChats, ...newChats];
        return combined
          .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
          .sort((a, b) => {
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
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
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

  const handleTyping = () => {
    if (!activeChat || !user || !db) return;

    // Set typing to true
    updateDoc(doc(db, 'sparks', activeChat.id), {
      [`typingStatus.${user.uid}`]: true
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set timeout to set typing to false
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'sparks', activeChat.id), {
        [`typingStatus.${user.uid}`]: false
      });
    }, 3000);
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim() || isSending) return;

    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `sparks/${activeChat.id}/messages`), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        isGhost: activeChat.ghostMode || false
      });

      await updateDoc(doc(db, "sparks", activeChat.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      });

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
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Failed to send message", "error");
    } finally {
      setIsSending(false);
    }
  };

  const filteredChats = chats.filter(c => {
    const otherName = (c.senderId === user?.uid ? c.receiverName : c.senderName) || 'Unknown';
    return otherName.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChat || !db) return;
    try {
      await deleteDoc(doc(db, `sparks/${activeChat.id}/messages`, messageId));
      showToast("Message deleted", "success");
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      showToast("Failed to delete message", "error");
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
      "flex bg-white dark:bg-[#0A0A0B] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 relative",
      activeChat 
        ? "h-[calc(100dvh-64px)] md:h-[calc(100vh-80px)]" 
        : "h-[calc(100dvh-128px)] md:h-[calc(100vh-80px)]"
    )}>
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-zinc-100 dark:border-zinc-900 flex flex-col transition-all",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Messages</h1>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              <button 
                onClick={() => setSearchMode('chats')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  searchMode === 'chats' ? "bg-white dark:bg-zinc-800 text-pink-500 shadow-sm" : "text-zinc-500"
                )}
              >
                Chats
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
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
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
                      <span className="font-bold text-zinc-900 dark:text-white truncate">{otherName}</span>
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

      {/* Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-zinc-50/30 dark:bg-black/20",
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
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  onClick={toggleGhostMode}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    activeChat.ghostMode ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  title="Ghost Mode (Messages delete after reading)"
                >
                  <Ghost className="w-5 h-5" />
                </button>
                <div className="relative group">
                  <button 
                    className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              <div className="flex justify-center mb-8">
                <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center max-w-xs">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Spark Context</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">"{activeChat.storyContent}"</p>
                </div>
              </div>

              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                </div>
              ) : (
                filteredMessages.map((msg, i) => {
                  const isMe = msg.senderId === user.uid;
                  const showTime = i === 0 || (msg.createdAt?.toMillis() - messages[i-1].createdAt?.toMillis() > 300000);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      key={msg.id} 
                      className="space-y-1"
                    >
                      {showTime && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "flex group/msg",
                        isMe ? "justify-end" : "justify-start"
                      )}>
                        <div className="relative flex items-center gap-2 max-w-[80%]">
                          {isMe && !editingMessageId && (
                            <div className="flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingText(msg.text);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm({ type: 'message', id: msg.id })}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                            isMe 
                              ? "bg-pink-500 text-white rounded-tr-none" 
                              : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 rounded-tl-none",
                            msg.isGhost && "border-2 border-purple-500/30 dark:border-purple-500/30 italic"
                          )}>
                            {msg.isGhost && (
                              <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                <Ghost className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Ghost Message</span>
                              </div>
                            )}
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
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-[#0A0A0B] border-t border-zinc-100 dark:border-zinc-900 relative">
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
                <div className="flex gap-1">
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
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full pl-4 pr-12 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-pink-500/20 transition-all resize-none max-h-32 overflow-y-auto"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="absolute right-2 bottom-2 p-2 bg-pink-500 text-white rounded-xl shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                  : 'This will delete the message for everyone in this chat. This action cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="custom" 
                  className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl h-12"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="custom" 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-red-500/20"
                  onClick={() => {
                    if (showDeleteConfirm.type === 'chat') {
                      handleDeleteChat();
                    } else if (showDeleteConfirm.id === 'clear_all') {
                      handleClearChat();
                    } else {
                      handleDeleteMessage(showDeleteConfirm.id);
                    }
                  }}
                >
                  Delete
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
    </div>
  );
}
