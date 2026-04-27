import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Send, CornerDownRight, Loader2, X, Zap, Flag } from 'lucide-react';
import { Timestamp, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, deleteDoc, getDoc, where, arrayUnion, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { generateContentWithFallback } from '../utils/ai';
import { Button } from './Button';

interface Comment {
  id: string;
  text: string;
  author: string;
  userId: string;
  createdAt: any;
  parentId?: string;
  replyToAuthor?: string;
  isAI?: boolean;
}

interface Story {
  id: string;
  content: string;
  author?: string;
  authorName?: string;
  category: string;
  likes: number;
  likedBy: string[];
  reactions: { [key: string]: number };
  commentCount: number;
  createdAt: any;
  userId: string;
  reactedUsers?: string[];
  aiPerspective?: string;
}

interface PremiumStoryFeedItemProps {
  story: Story;
  onLike?: (storyId: string) => void;
  onComment?: (storyId: string) => void;
  onShare?: (storyId: string) => void;
  onEdit?: (story: Story) => void;
  onDelete?: (storyId: string) => void;
  isOwner?: boolean;
}

export function PremiumStoryFeedItem({ story: initialStory, onLike, onComment, onShare, onEdit, onDelete, isOwner }: PremiumStoryFeedItemProps) {
  const { user, userData, showToast, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story>(initialStory);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, author: string, userId: string } | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [showAIPerspective, setShowAIPerspective] = useState(false);
  const [showSparkModal, setShowSparkModal] = useState(false);
  const [sparkMessage, setSparkMessage] = useState('');
  const [isSendingSpark, setIsSendingSpark] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loadingIcebreakers, setLoadingIcebreakers] = useState(false);
  const [hasSparked, setHasSparked] = useState(false);
  const [sparkStatus, setSparkStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [compatibility, setCompatibility] = useState<string | null>(null);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);

  useEffect(() => {
    if (!user || !db || !story.id || user.uid === story.userId) return;
    
    let isMounted = true;

    const checkSparkStatus = async () => {
      try {
        // Check for spark on THIS story
        const qStory = query(
          collection(db, "sparks"),
          where("senderId", "==", user.uid),
          where("storyId", "==", story.id),
          limit(1)
        );
        const storySnap = await getDocs(qStory);
        if (isMounted) setHasSparked(!storySnap.empty);

        // Check for general connection status (sender = me, receiver = them)
        const qFriend1 = query(
          collection(db, "sparks"),
          where("senderId", "==", user.uid),
          where("receiverId", "==", story.userId),
          limit(1)
        );
        // Check for general connection status (sender = them, receiver = me)
        const qFriend2 = query(
          collection(db, "sparks"),
          where("senderId", "==", story.userId),
          where("receiverId", "==", user.uid),
          limit(1)
        );

        const [snap1, snap2] = await Promise.all([getDocs(qFriend1), getDocs(qFriend2)]);
        
        if (!isMounted) return;

        const sparks = [...snap1.docs.map(d => d.data()), ...snap2.docs.map(d => d.data())];
        
        if (sparks.length === 0) {
          setSparkStatus('none');
        } else {
          const accepted = sparks.find(s => s.status === 'accepted');
          if (accepted) {
            setSparkStatus('accepted');
          } else {
            const pending = sparks.find(s => s.status === 'pending');
            if (pending) {
              setSparkStatus('pending');
            } else {
              setSparkStatus('none');
            }
          }
        }
      } catch (error) {
        console.error("Error checking spark status:", error);
      }
    };

    checkSparkStatus();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, story.id, story.userId]);

  const generateIcebreakers = async () => {
    setLoadingIcebreakers(true);
    try {
      const prompt = `
        You are a social icebreaker AI. 
        Generate 3 unique, engaging, and respectful opening lines (icebreakers) for a user who wants to connect with someone who shared this story.
        Story: "${story.content}"
        The icebreakers should be short, friendly, and related to the story's theme.
        Format: Return ONLY the 3 lines separated by "---".
      `;

      const response = await generateContentWithFallback({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const lines = response.text?.split('---').map(l => l.trim()).filter(l => l.length > 0) || [];
      setIcebreakers(lines.slice(0, 3));
    } catch (error) {
      console.error("Error generating icebreakers:", error);
    } finally {
      setLoadingIcebreakers(false);
    }
  };

  const handleSendSpark = async () => {
    if (!user || !db) return;
    if (!sparkMessage.trim()) {
      showToast("Please enter a message!", "error");
      return;
    }

    setIsSendingSpark(true);
    try {
      await addDoc(collection(db, "sparks"), {
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        receiverId: story.userId,
        receiverName: story.author || story.authorName || "Anonymous",
        storyId: story.id,
        storyContent: story.content.substring(0, 100) + "...",
        message: sparkMessage.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      showToast("Spark sent! If they accept, you can chat.", "success");
      setShowSparkModal(false);
      setSparkMessage('');
    } catch (error) {
      console.error("Error sending spark:", error);
      showToast("Failed to send spark.", "error");
    } finally {
      setIsSendingSpark(false);
    }
  };

  const handleGetAIAdvice = async () => {
    if (!db) return;
    
    // Check cache first
    if (story.aiPerspective) {
      setShowAIPerspective(!showAIPerspective);
      return;
    }

    setIsGettingAdvice(true);
    try {
      const prompt = `
        You are an objective, empathetic AI therapist. 
        Analyze this story and provide a very concise, helpful perspective (max 2-3 sentences).
        Identify any "red flags" or validate feelings briefly.
        
        Story: "${story.content}"
      `;

      const response = await generateContentWithFallback({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const advice = response.text?.trim();
      if (!advice) throw new Error("Failed to generate advice");

      // Save to story document for caching
      await updateDoc(doc(db, "community_stories", story.id), {
        aiPerspective: advice
      });

      setShowAIPerspective(true);
      showToast("AI Perspective generated!", "success");
    } catch (error) {
      console.error("Error getting AI advice:", error);
      showToast("Failed to get AI perspective.", "error");
    } finally {
      setIsGettingAdvice(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  if (userData?.blockedUsers?.includes(story.userId)) {
    return null;
  }

  // Real-time story updates
  useEffect(() => {
    if (!db || !initialStory.id) return;
    const unsubscribe = onSnapshot(doc(db, 'community_stories', initialStory.id), (doc) => {
      if (doc.exists()) {
        setStory({ id: doc.id, ...doc.data() } as Story);
      }
    });
    return () => unsubscribe();
  }, [initialStory.id]);

  useEffect(() => {
    if (showComments && db) {
      setLoadingComments(true);
      const q = query(
        collection(db, `community_stories/${story.id}/comments`),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        setComments(fetchedComments.reverse());
        setLoadingComments(false);
      });
      return () => unsubscribe();
    }
  }, [showComments, story.id]);

  const handlePersonalBlock = async (uid: string) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        blockedUsers: arrayUnion(uid)
      });
      showToast("User blocked successfully", "success");
      refreshUserData();
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast("Failed to block user", "error");
    }
  };

  const handleLike = async () => {
    if (!user || !db || isLiking) return;
    setIsLiking(true);
    
    try {
      const storyRef = doc(db, 'community_stories', story.id);
      const isLiked = story.likedBy?.includes(user.uid);
      
      if (isLiked) {
        await updateDoc(storyRef, {
          likes: increment(-1),
          likedBy: story.likedBy.filter(id => id !== user.uid)
        });
      } else {
        await updateDoc(storyRef, {
          likes: increment(1),
          likedBy: [...(story.likedBy || []), user.uid]
        });
      }
      onLike?.(story.id);
    } catch (error) {
      console.error("Error liking story:", error);
      showToast('Failed to update like', 'error');
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !db) return;

    setIsSubmittingComment(true);
    try {
      const commentData: any = {
        text: newComment.trim(),
        author: user.displayName || 'Anonymous',
        userId: user.uid,
        createdAt: serverTimestamp()
      };

      if (replyTo) {
        commentData.parentId = replyTo.id;
        commentData.replyToAuthor = replyTo.author;
      }

      await addDoc(collection(db, `community_stories/${story.id}/comments`), commentData);
      
      await updateDoc(doc(db, 'community_stories', story.id), {
        commentCount: increment(1)
      });

      if (replyTo) {
        setExpandedComments(prev => new Set(prev).add(replyTo.id));
      }

      setNewComment('');
      setReplyTo(null);
      showToast('Comment added!');
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast('Failed to add comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string, newText: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, `community_stories/${story.id}/comments`, commentId), {
        text: newText,
        updatedAt: serverTimestamp(),
      });
      showToast("Comment updated!", "success");
      setEditingComment(null);
      setEditContent("");
    } catch (error) {
      console.error("Error updating comment:", error);
      showToast("Failed to update comment.", "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, `community_stories/${story.id}/comments`, commentId));
      await updateDoc(doc(db, "community_stories", story.id), {
        commentCount: increment(-1),
      });
      showToast("Comment deleted.", "success");
    } catch (error) {
      console.error("Error deleting comment:", error);
      showToast("Failed to delete comment.", "error");
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'now';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white dark:bg-[#0A0A0A] border-b border-zinc-100 dark:border-zinc-900 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group"
    >
      <div className="flex gap-3">
        {/* Avatar Placeholder */}
        <button 
          onClick={() => navigate(`/profile/${story.userId}`)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center text-pink-500 font-bold border border-pink-500/10 shrink-0 hover:scale-110 transition-transform"
        >
          {(story.author || story.authorName || 'A').charAt(0).toUpperCase()}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span 
                onClick={() => navigate(`/profile/${story.userId}`)}
                className="font-bold text-[15px] text-zinc-900 dark:text-white truncate cursor-pointer hover:text-pink-500 transition-colors"
              >
                {story.author || story.authorName || 'Anonymous'}
              </span>
              {user && user.uid === story.userId && (
                <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] rounded-full font-bold uppercase tracking-wider">
                  You
                </span>
              )}
              {user && user.uid !== story.userId && sparkStatus !== 'accepted' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasSparked || sparkStatus === 'pending') {
                      showToast("Spark request is already pending!", "success");
                    } else {
                      setShowSparkModal(true);
                      generateIcebreakers();
                    }
                  }}
                  className={cn(
                    "ml-1 transition-all transform hover:scale-110 flex items-center gap-1",
                    (hasSparked || sparkStatus === 'pending') ? "text-pink-500" : "text-yellow-500 hover:text-yellow-600"
                  )}
                  title={(hasSparked || sparkStatus === 'pending') ? "Requested" : "Spark a Connection"}
                >
                  <Zap className={cn("w-3.5 h-3.5", (hasSparked || sparkStatus === 'pending') && "fill-current")} />
                  {(hasSparked || sparkStatus === 'pending') && <span className="text-[10px] font-bold uppercase tracking-tighter">Requested</span>}
                </button>
              )}
              <span className="text-zinc-400 text-sm">·</span>
              <span className="text-zinc-400 text-sm shrink-0">
                {formatTime(story.createdAt)}
              </span>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMenu(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-xl z-20 py-2 overflow-hidden"
                    >
                      {isOwner && (
                        <>
                          <button
                            onClick={() => {
                              onEdit?.(story);
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" /> Edit Post
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this post?')) {
                                onDelete?.(story.id);
                              }
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Post
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          onShare?.(story.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Share2 className="w-4 h-4" /> Share Post
                      </button>
                      {user && user.uid !== story.userId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePersonalBlock(story.userId);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <X className="w-4 h-4" /> Block User
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <p className="text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {story.content}
          </p>

          {/* AI Perspective Block */}
          <AnimatePresence>
            {(showAIPerspective || (story.aiPerspective && showAIPerspective)) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden group/ai"
              >
                <div className="absolute top-0 right-0 p-2">
                  <span className="text-[10px] font-black text-indigo-500/40 uppercase tracking-widest">AI Analysis</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed italic">
                      "{story.aiPerspective}"
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAIPerspective(false)}
                  className="absolute top-2 right-2 p-1 text-indigo-300 hover:text-indigo-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "flex items-center gap-1.5 transition-colors group/btn",
                story.likedBy?.includes(user?.uid || '') 
                  ? "text-pink-500" 
                  : "text-zinc-500 hover:text-pink-500"
              )}
            >
              <div className={cn(
                "p-2 -m-2 rounded-full transition-colors",
                story.likedBy?.includes(user?.uid || '') 
                  ? "bg-pink-500/10" 
                  : "group-hover/btn:bg-pink-500/10"
              )}>
                <Heart className={cn(
                  "w-4 h-4 transition-all",
                  story.likedBy?.includes(user?.uid || '') && "fill-current scale-110"
                )} />
              </div>
              <span className="text-xs font-medium">{story.likes || 0}</span>
            </button>

            <button 
              onClick={() => {
                setShowComments(!showComments);
                onComment?.(story.id);
              }}
              className={cn(
                "flex items-center gap-1.5 transition-colors group/btn",
                showComments ? "text-blue-500" : "text-zinc-500 hover:text-blue-500"
              )}
            >
              <div className={cn(
                "p-2 -m-2 rounded-full transition-colors",
                showComments ? "bg-blue-500/10" : "group-hover/btn:bg-blue-500/10"
              )}>
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">{story.commentCount || 0}</span>
            </button>

            <button 
              onClick={() => onShare?.(story.id)}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-green-500 transition-colors group/btn"
            >
              <div className="p-2 -m-2 rounded-full group-hover/btn:bg-green-500/10 transition-colors">
                <Share2 className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-900 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Comments</h4>
                  <button
                    onClick={handleGetAIAdvice}
                    disabled={isGettingAdvice}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50",
                      story.aiPerspective 
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                        : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    {isGettingAdvice ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className={cn("w-3 h-3", story.aiPerspective && "fill-current")} />
                    )}
                    {story.aiPerspective ? "View AI Perspective" : "Get AI Perspective"}
                  </button>
                </div>
                {/* Comment List */}
                <div className="space-y-4 mb-4">
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">No comments yet. Be the first to reply!</p>
                  ) : (
                    comments
                      .filter(c => !c.parentId && !userData?.blockedUsers?.includes(c.userId))
                      .map((comment) => (
                        <div key={comment.id} className={`space-y-3 ${comment.isAI ? 'bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20' : ''}`}>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => navigate(`/profile/${comment.userId}`)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 hover:scale-110 transition-transform ${comment.isAI ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                            >
                              {comment.isAI ? '🤖' : (comment.author || 'A').charAt(0).toUpperCase()}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span 
                                  onClick={() => navigate(`/profile/${comment.userId}`)}
                                  className={`text-xs font-black uppercase tracking-tight cursor-pointer hover:text-pink-500 transition-colors ${comment.isAI ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-white'}`}
                                >
                                  {comment.author || 'Anonymous'}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {formatTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className={`text-sm leading-relaxed ${comment.isAI ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {comment.text}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button
                                  onClick={() => setReplyTo({ id: comment.id, author: comment.author, userId: comment.userId })}
                                  className="text-[10px] font-bold text-pink-500 hover:text-pink-600 transition-colors"
                                >
                                  Reply
                                </button>
                                {comments.some(r => r.parentId === comment.id) && (
                                  <button
                                    onClick={() => toggleReplies(comment.id)}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
                                  >
                                    {expandedComments.has(comment.id) ? 'Hide Replies' : `Show Replies (${comments.filter(r => r.parentId === comment.id).length})`}
                                  </button>
                                )}

                                <div className="relative">
                                  <button
                                    onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors rounded-full hover:bg-zinc-500/10"
                                  >
                                    <MoreHorizontal className="w-3 h-3" />
                                  </button>
                                  
                                  {activeCommentMenuId === comment.id && (
                                    <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-white/10 py-1 z-50">
                                      {user && user.uid === comment.userId && (
                                        <button
                                          onClick={() => {
                                            setEditingComment(comment);
                                            setEditContent(comment.text);
                                            setActiveCommentMenuId(null);
                                          }}
                                          className="w-full px-3 py-1.5 text-left text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                                        >
                                          <Edit2 className="w-3 h-3" /> Edit
                                        </button>
                                      )}
                                      {(user && (user.uid === comment.userId || isOwner)) && (
                                        <button
                                          onClick={() => {
                                            handleDeleteComment(comment.id);
                                            setActiveCommentMenuId(null);
                                          }}
                                          className="w-full px-3 py-1.5 text-left text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                        >
                                          <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                      )}
                                      {user && user.uid !== comment.userId && (
                                        <button
                                          onClick={() => {
                                            handlePersonalBlock(comment.userId);
                                            setActiveCommentMenuId(null);
                                          }}
                                          className="w-full px-3 py-1.5 text-left text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                        >
                                          <X className="w-3 h-3" /> Block User
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Nested Replies */}
                          {expandedComments.has(comment.id) && (
                            <div className="ml-10 space-y-3 border-l-2 border-zinc-50 dark:border-zinc-900 pl-4 mt-2">
                              {comments
                                .filter(r => r.parentId === comment.id && !userData?.blockedUsers?.includes(r.userId))
                                .map((reply) => (
                                  <div key={reply.id} className="flex gap-2 relative">
                                    <div className="absolute -left-4 top-3 w-3 h-px bg-zinc-100 dark:bg-zinc-800" />
                                    <button 
                                      onClick={() => navigate(`/profile/${reply.userId}`)}
                                      className="w-6 h-6 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-[9px] font-bold text-zinc-400 shrink-0 hover:scale-110 transition-transform"
                                    >
                                      {(reply.author || 'A').charAt(0).toUpperCase()}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span 
                                          onClick={() => navigate(`/profile/${reply.userId}`)}
                                          className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-tight cursor-pointer hover:text-pink-500 transition-colors"
                                        >
                                          {reply.author || 'Anonymous'}
                                        </span>
                                        <span className="text-[9px] text-zinc-400">
                                          {formatTime(reply.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        <span className="text-pink-500 font-bold mr-1">@{reply.replyToAuthor}</span>
                                        {reply.text}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <button
                                          onClick={() => setReplyTo({ id: comment.id, author: reply.author, userId: reply.userId })}
                                          className="text-[9px] font-bold text-pink-500 hover:text-pink-600 transition-colors"
                                        >
                                          Reply
                                        </button>

                                        <div className="relative">
                                          <button
                                            onClick={() => setActiveCommentMenuId(activeCommentMenuId === reply.id ? null : reply.id)}
                                            className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors rounded-full hover:bg-zinc-500/10"
                                          >
                                            <MoreHorizontal className="w-2.5 h-2.5" />
                                          </button>
                                          
                                          {activeCommentMenuId === reply.id && (
                                            <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-white/10 py-1 z-50">
                                              {user && user.uid === reply.userId && (
                                                <button
                                                  onClick={() => {
                                                    setEditingComment(reply);
                                                    setEditContent(reply.text);
                                                    setActiveCommentMenuId(null);
                                                  }}
                                                  className="w-full px-3 py-1.5 text-left text-[9px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                                                >
                                                  <Edit2 className="w-2.5 h-2.5" /> Edit
                                                </button>
                                              )}
                                              {(user && (user.uid === reply.userId || isOwner)) && (
                                                <button
                                                  onClick={() => {
                                                    handleDeleteComment(reply.id);
                                                    setActiveCommentMenuId(null);
                                                  }}
                                                  className="w-full px-3 py-1.5 text-left text-[9px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                                >
                                                  <Trash2 className="w-2.5 h-2.5" /> Delete
                                                </button>
                                              )}
                                              {user && user.uid !== reply.userId && (
                                                <button
                                                  onClick={() => {
                                                    handlePersonalBlock(reply.userId);
                                                    setActiveCommentMenuId(null);
                                                  }}
                                                  className="w-full px-3 py-1.5 text-left text-[9px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                                >
                                                  <X className="w-2.5 h-2.5" /> Block User
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>

                {/* Add Comment Form */}
                {user && (
                  <form onSubmit={handleAddComment} className="space-y-2">
                    {replyTo && (
                      <div className="flex items-center justify-between bg-pink-50 dark:bg-pink-500/5 px-3 py-1.5 rounded-lg border border-pink-100 dark:border-pink-500/10">
                        <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">
                          Replying to @{replyTo.author}
                        </span>
                        <button onClick={() => setReplyTo(null)} className="text-zinc-400 hover:text-pink-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={replyTo ? `Reply to @${replyTo.author}...` : "Write a reply..."}
                          className="w-full h-10 pl-4 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-pink-500 hover:bg-pink-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Comment Modal */}
      <AnimatePresence>
        {editingComment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-[#121214] relative shadow-2xl p-6 border border-pink-100 dark:border-white/10 rounded-3xl">
              <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Edit Comment</h2>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[6rem] p-4 rounded-xl border-2 border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none resize-none transition-all text-zinc-900 dark:text-white"
                placeholder="Edit your comment..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  onClick={() => setEditingComment(null)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white transition-colors font-bold"
                  onClick={() => handleEditComment(editingComment.id, editContent)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Spark Modal */}
      <AnimatePresence>
        {showSparkModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Spark Connection</h2>
                  </div>
                  <button 
                    onClick={() => setShowSparkModal(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Regarding Story</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 italic line-clamp-2">"{story.content}"</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">AI Icebreakers</label>
                      <button 
                        onClick={generateIcebreakers}
                        disabled={loadingIcebreakers}
                        className="text-[10px] font-bold text-pink-500 hover:underline disabled:opacity-50"
                      >
                        {loadingIcebreakers ? "Generating..." : "Refresh"}
                      </button>
                    </div>
                    
                    <div className="grid gap-2">
                      {loadingIcebreakers ? (
                        Array(3).fill(0).map((_, i) => (
                          <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
                        ))
                      ) : icebreakers.length > 0 ? (
                        icebreakers.map((line, i) => (
                          <button
                            key={i}
                            onClick={() => setSparkMessage(line)}
                            className="text-left p-3 text-xs bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 rounded-xl text-zinc-700 dark:text-zinc-300 transition-colors font-medium"
                          >
                            {line}
                          </button>
                        ))
                      ) : (
                        <p className="text-[10px] text-zinc-500 italic text-center py-2">Click refresh for AI suggestions</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Your Message</label>
                    <textarea
                      value={sparkMessage}
                      onChange={(e) => setSparkMessage(e.target.value)}
                      placeholder="Say something meaningful..."
                      maxLength={200}
                      rows={3}
                      className="w-full p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm resize-none"
                    />
                    <div className="flex justify-end">
                      <span className={cn(
                        "text-[10px] font-bold",
                        sparkMessage.length > 180 ? "text-red-500" : "text-zinc-400"
                      )}>
                        {sparkMessage.length}/200
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSendSpark}
                    disabled={isSendingSpark || !sparkMessage.trim()}
                    variant="custom"
                    className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl border-0 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
                  >
                    {isSendingSpark ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Spark"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
