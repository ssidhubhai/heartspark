import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Send, CornerDownRight, Loader2, X } from 'lucide-react';
import { Timestamp, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

interface Comment {
  id: string;
  content: string;
  authorName: string;
  userId: string;
  createdAt: any;
  parentId?: string;
  replyToAuthor?: string;
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
  const { user, showToast } = useAuth();
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

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

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
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        setComments(fetchedComments);
        setLoadingComments(false);
      });
      return () => unsubscribe();
    }
  }, [showComments, story.id]);

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
        content: newComment.trim(),
        authorName: user.displayName || 'Anonymous',
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center text-pink-500 font-bold border border-pink-500/10 shrink-0">
          {(story.author || story.authorName || 'A').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[15px] text-zinc-900 dark:text-white truncate">
                {story.author || story.authorName || 'Anonymous'}
              </span>
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
                      .filter(c => !c.parentId)
                      .map((comment) => (
                        <div key={comment.id} className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                              {(comment.authorName || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                  {comment.authorName || 'Anonymous'}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {formatTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                {comment.content}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button
                                  onClick={() => setReplyTo({ id: comment.id, author: comment.authorName, userId: comment.userId })}
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
                              </div>
                            </div>
                          </div>

                          {/* Nested Replies */}
                          {expandedComments.has(comment.id) && (
                            <div className="ml-10 space-y-3 border-l-2 border-zinc-50 dark:border-zinc-900 pl-4">
                              {comments
                                .filter(r => r.parentId === comment.id)
                                .map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-[9px] font-bold text-zinc-400 shrink-0">
                                      {(reply.authorName || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">
                                          {reply.authorName || 'Anonymous'}
                                        </span>
                                        <span className="text-[9px] text-zinc-400">
                                          {formatTime(reply.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        <span className="text-pink-500 font-bold mr-1">@{reply.replyToAuthor}</span>
                                        {reply.content}
                                      </p>
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
    </motion.div>
  );
}
