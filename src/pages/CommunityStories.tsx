import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, updateDoc, increment, getDocs, deleteDoc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MessageCircle, AlertCircle, Send, ShieldCheck, Loader2, ChevronDown, ChevronUp, Plus, X, Flag, Trash2, Shield, CheckCircle2 } from 'lucide-react';
import { generateContentWithFallback } from '../utils/ai';
import { motion, AnimatePresence } from 'motion/react';

interface Story {
  id: string;
  title: string;
  content: string;
  author: string;
  userId: string;
  createdAt: any;
  reactions: {
    aww: number;
    redFlag: number;
    drama: number;
    heartbreak: number;
    slay: number;
  };
  commentCount: number;
  reportCount?: number;
  reactedUsers?: string[];
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: any;
}

export function CommunityStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStory, setNewStory] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const { user, isConfigured } = useAuth();

  // Admin Check (Disabled to prevent normal users from seeing admin controls)
  const isAdmin = false;

  // Comment state per story
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Real-time comments listener
  useEffect(() => {
    if (!db || !expandedStory) return;

    setLoadingComments(true);
    const q = query(collection(db, `community_stories/${expandedStory}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[];
      setComments(fetchedComments);
      setLoadingComments(false);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [expandedStory]);

  // Fetch stories
  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'community_stories'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      setStories(storyData);
      setLoadingStories(false);
    });

    return () => unsubscribe();
  }, []);

  const hasLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
    return urlRegex.test(text);
  };

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to post a story!", "error");
      return;
    }
    if (!newStory.trim() || !newTitle.trim() || !db) return;

    // 1. Link Prevention Check
    if (hasLinks(newStory) || hasLinks(newTitle)) {
      showToast("⚠️ Links are not allowed in Community Stories to prevent spam.", "error");
      return;
    }

    setLoading(true);
    setModerating(true);

    try {
      // 2. Check if user is banned
      if (user?.uid) {
        const banRef = doc(db, 'banned_users', user.uid);
        const banSnap = await getDoc(banRef);
        if (banSnap.exists()) {
          showToast("🚫 You have been blocked from posting in the community.", "error");
          setLoading(false);
          setModerating(false);
          return;
        }
      }

      // 3. AI Moderation Check
      const prompt = `
        Analyze the following story. Does it contain bullying, swearing, hate speech, requests for money, self-harm, or highly inappropriate/NSFW content? 
        Reply with ONLY 'YES' if it contains bad content, or 'NO' if it is safe.
        
        Title: ${newTitle}
        Story: ${newStory}
      `;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const aiDecision = response.text?.trim().toUpperCase() || '';
      
      if (aiDecision.includes('YES')) {
        showToast("⚠️ Post Blocked: Our AI detected inappropriate content.", "error");
        setLoading(false);
        setModerating(false);
        return;
      }

      // 4. Safe to Post - Save to Firebase
      await addDoc(collection(db, 'community_stories'), {
        title: newTitle.trim(),
        content: newStory.trim(),
        author: authorName.trim() || user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        userId: user.uid,
        reactions: { aww: 0, redFlag: 0, drama: 0, heartbreak: 0, slay: 0 },
        commentCount: 0,
        reportCount: 0,
        reactedUsers: []
      });

      setNewTitle('');
      setNewStory('');
      setAuthorName('');
      setShowPostModal(false);
      showToast("Story published successfully!", "success");

    } catch (error) {
      console.error("Error posting story: ", error);
      showToast("Failed to post story. Please try again.", "error");
    } finally {
      setLoading(false);
      setModerating(false);
    }
  };

  const handleReaction = async (story: Story, reactionType: string) => {
    if (!db) return;
    if (!user) {
      showToast("Please login to react to stories!", "info");
      return;
    }
    
    if (story.reactedUsers?.includes(user.uid)) {
      showToast("You have already reacted to this story!", "info");
      return;
    }

    // Optimistic UI update
    setStories(prev => prev.map(s => {
      if (s.id === story.id) {
        return {
          ...s,
          reactions: {
            ...s.reactions,
            [reactionType]: (s.reactions as any)[reactionType] + 1
          },
          reactedUsers: [...(s.reactedUsers || []), user.uid]
        };
      }
      return s;
    }));

    try {
      const storyRef = doc(db, 'community_stories', story.id);
      await updateDoc(storyRef, {
        [`reactions.${reactionType}`]: increment(1),
        reactedUsers: arrayUnion(user.uid)
      });
    } catch (error) {
      console.error("Error adding reaction: ", error);
      showToast("Failed to add reaction.", "error");
    }
  };

  const handleReport = async (storyId: string) => {
    if (!db) return;
    
    if (reportingPostId !== storyId) {
      setReportingPostId(storyId);
      setTimeout(() => setReportingPostId(null), 3000);
      return;
    }

    try {
      const storyRef = doc(db, 'community_stories', storyId);
      await updateDoc(storyRef, {
        reportCount: increment(1)
      });
      showToast("Thank you for reporting. Our moderation team will review this post.", "success");
      setReportingPostId(null);
    } catch (error) {
      console.error("Error reporting: ", error);
      showToast("Failed to report post.", "error");
      setReportingPostId(null);
    }
  };

  // --- ADMIN FUNCTIONS ---
  const handleClearReports = async (storyId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'community_stories', storyId), { reportCount: 0 });
      showToast("Reports cleared. Post marked as innocent.", "success");
    } catch (error) {
      console.error("Error clearing reports:", error);
      showToast("Failed to clear reports.", "error");
    }
  };

  const handleDeletePost = async (storyId: string) => {
    if (!db) return;
    
    if (deletingPostId !== storyId) {
      setDeletingPostId(storyId);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeletingPostId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'community_stories', storyId));
      showToast("Post deleted successfully.", "success");
      setDeletingPostId(null);
    } catch (error: any) {
      console.error("Error deleting post:", error);
      showToast("Failed to delete post. You might not have permission.", "error");
      setDeletingPostId(null);
    }
  };

  const handleBlockUser = async (authorId: string) => {
    if (!db) return;
    if (authorId === 'anonymous') {
      showToast("Cannot block an anonymous user. Please just delete their post.", "error");
      return;
    }
    
    if (blockingUserId !== authorId) {
      setBlockingUserId(authorId);
      setTimeout(() => setBlockingUserId(null), 3000);
      return;
    }

    try {
      await setDoc(doc(db, 'banned_users', authorId), {
        bannedAt: serverTimestamp(),
        reason: 'Admin blocked from community stories'
      });
      showToast("User has been blocked.", "success");
      setBlockingUserId(null);
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast("Failed to block user.", "error");
      setBlockingUserId(null);
    }
  };
  // -----------------------

  const toggleComments = (storyId: string) => {
    if (expandedStory === storyId) {
      setExpandedStory(null);
      setComments([]);
    } else {
      setExpandedStory(storyId);
      setComments([]);
    }
  };

  const handlePostComment = async (storyId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to comment!", "error");
      return;
    }
    if (!newComment.trim() || !db) return;

    if (hasLinks(newComment)) {
      showToast("⚠️ Links are not allowed in comments.", "error");
      return;
    }

    const commentText = newComment.trim();
    setNewComment('');

    try {
      await addDoc(collection(db, `community_stories/${storyId}/comments`), {
        text: commentText,
        author: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        userId: user.uid
      });

      const storyRef = doc(db, 'community_stories', storyId);
      await updateDoc(storyRef, {
        commentCount: increment(1)
      });

    } catch (error) {
      console.error("Error posting comment:", error);
      showToast("Failed to post comment.", "error");
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-16 h-16 text-indigo-500 mx-auto" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Firebase Required</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Community Stories require a database. Please add your Firebase configuration to the .env file!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 relative pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-20 left-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-500 text-white' : 
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 
              'bg-slate-800 text-white'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === 'info' && <MessageCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Community Stories <MessageCircle className="w-8 h-8 text-indigo-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Read dramatic crush stories from around the world. <br/>
          <span className="text-sm font-medium text-indigo-500 flex items-center justify-center gap-1 mt-2">
            <ShieldCheck className="w-4 h-4" /> Protected by AI Moderation
          </span>
        </p>
      </div>

      {/* Floating Action Button for Posting */}
      {user ? (
        <button
          onClick={() => setShowPostModal(true)}
          className="fixed bottom-8 right-8 md:bottom-12 md:right-12 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-40"
          aria-label="Post a Story"
        >
          <Plus className="w-8 h-8" />
        </button>
      ) : (
        <div className="fixed bottom-0 left-0 w-full bg-indigo-600 text-white p-4 text-center z-40 shadow-lg flex items-center justify-center gap-4">
          <p className="font-medium">Login to share your own stories and react!</p>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-800 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowPostModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              Share Your Story <MessageCircle className="w-6 h-6 text-indigo-500" />
            </h2>
            
            <form onSubmit={handlePostStory} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Story Title (e.g., My best friend just confessed...)"
                className="w-full h-12 px-4 rounded-xl border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none font-bold transition-all"
                required
                maxLength={100}
              />
              <textarea
                value={newStory}
                onChange={(e) => setNewStory(e.target.value)}
                placeholder="Spill the tea here... (No links allowed)"
                className="w-full h-40 p-4 rounded-xl border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none resize-none transition-all"
                required
                maxLength={2000}
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your Name (Optional)"
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none transition-all"
                  maxLength={30}
                />
                <Button type="submit" disabled={loading || !newStory.trim() || !newTitle.trim()} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 w-full sm:w-auto">
                  {loading ? (
                    <>
                      {moderating ? 'AI Checking...' : 'Posting...'} 
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    <>'Post Story' <Send className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">
                Stories are analyzed by AI. Inappropriate content or links will be blocked.
              </p>
            </form>
          </Card>
        </div>
      )}

      {/* Stories Feed */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {loadingStories ? (
            // Skeleton Loaders
            [1, 2, 3].map((i) => (
              <motion.div key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="animate-pulse space-y-4 border-slate-200 dark:border-slate-700">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : stories.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-center py-20 text-slate-500"
            >
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No stories yet.</p>
              <p>Tap the + button to be the first to share!</p>
            </motion.div>
          ) : (
            stories.map((story) => (
              <motion.div
                key={story.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-md transition-shadow overflow-hidden relative border-slate-200 dark:border-slate-700">
              
              {/* Admin Warning Banner */}
              {isAdmin && (story.reportCount || 0) > 0 && (
                <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold px-4 py-1 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> 
                  REPORTED POST ({story.reportCount} reports)
                </div>
              )}

              <div className={`space-y-3 ${isAdmin && (story.reportCount || 0) > 0 ? 'mt-4' : ''}`}>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white pr-8">{story.title}</h3>
                  {/* Delete Own Post Button */}
                  {user && user.uid === story.userId && !isAdmin && (
                    <button 
                      onClick={() => handleDeletePost(story.id)} 
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs transition-colors shrink-0 ${
                        deletingPostId === story.id 
                          ? 'bg-red-500 text-white hover:bg-red-600' 
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                      }`}
                      title="Delete your post"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingPostId === story.id && <span className="font-bold">Confirm?</span>}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    {story.author.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{story.author}</span>
                  {user && user.uid === story.userId && (
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-full font-bold uppercase tracking-wider">
                      You
                    </span>
                  )}
                  <span>•</span>
                  <span>{story.createdAt ? new Date(story.createdAt.toMillis()).toLocaleDateString() : 'Just now'}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed mt-4">
                  {story.content}
                </p>
              </div>

              {/* Reactions & Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => handleReaction(story, 'aww')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${story.reactedUsers?.includes(user?.uid || '') ? 'bg-pink-100 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800' : 'bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700'}`}>
                  🥺 <span className="font-medium text-slate-600 dark:text-slate-300">{story.reactions?.aww || 0}</span>
                </button>
                <button onClick={() => handleReaction(story, 'redFlag')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${story.reactedUsers?.includes(user?.uid || '') ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' : 'bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700'}`}>
                  🚩 <span className="font-medium text-slate-600 dark:text-slate-300">{story.reactions?.redFlag || 0}</span>
                </button>
                <button onClick={() => handleReaction(story, 'drama')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${story.reactedUsers?.includes(user?.uid || '') ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' : 'bg-slate-100 dark:bg-slate-800 hover:bg-yellow-50 dark:hover:bg-slate-700'}`}>
                  🍿 <span className="font-medium text-slate-600 dark:text-slate-300">{story.reactions?.drama || 0}</span>
                </button>
                <button onClick={() => handleReaction(story, 'heartbreak')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${story.reactedUsers?.includes(user?.uid || '') ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800' : 'bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700'}`}>
                  💔 <span className="font-medium text-slate-600 dark:text-slate-300">{story.reactions?.heartbreak || 0}</span>
                </button>
                <button onClick={() => handleReaction(story, 'slay')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${story.reactedUsers?.includes(user?.uid || '') ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800' : 'bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700'}`}>
                  👑 <span className="font-medium text-slate-600 dark:text-slate-300">{story.reactions?.slay || 0}</span>
                </button>

                <div className="flex-1"></div>

                <button 
                  onClick={() => toggleComments(story.id)}
                  className="flex items-center gap-1 px-4 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  {story.commentCount || 0}
                  {expandedStory === story.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>

                {/* Report Button */}
                <button 
                  onClick={() => handleReport(story.id)} 
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs transition-colors ml-2 ${
                    reportingPostId === story.id 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                  }`}
                  title="Report inappropriate content"
                >
                  <Flag className="w-3 h-3" />
                  {reportingPostId === story.id && <span className="font-bold">Confirm?</span>}
                </button>
              </div>

              {/* Admin Controls Panel */}
              {isAdmin && (
                <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Admin Controls</span>
                  <div className="flex-1"></div>
                  
                  {(story.reportCount || 0) > 0 && (
                    <button onClick={() => handleClearReports(story.id)} className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md font-medium transition-colors">
                      Clear Reports
                    </button>
                  )}
                  
                  <button onClick={() => handleBlockUser(story.userId)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    blockingUserId === story.userId ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}>
                    {blockingUserId === story.userId ? 'Confirm Block' : 'Block User'}
                  </button>
                  
                  <button onClick={() => handleDeletePost(story.id)} className={`text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1 transition-colors ${
                    deletingPostId === story.id ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}>
                    <Trash2 className="w-3 h-3" /> {deletingPostId === story.id ? 'Confirm Delete' : 'Delete Post'}
                  </button>
                </div>
              )}

              {/* Comments Section */}
              <AnimatePresence>
                {expandedStory === story.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 -mx-6 -mb-6 p-6 overflow-hidden"
                  >
                    {loadingComments ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : (
                      <div className="space-y-4">
                        {comments.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-2">No comments yet. Be the first!</p>
                        ) : (
                          comments.map(comment => (
                            <motion.div 
                              key={comment.id} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm"
                            >
                              <p className="text-sm font-medium text-indigo-500 mb-1">{comment.author}</p>
                              <p className="text-sm text-slate-800 dark:text-slate-200">{comment.text}</p>
                            </motion.div>
                          ))
                        )}
                        
                        {user ? (
                          <form onSubmit={(e) => handlePostComment(story.id, e)} className="flex gap-2 pt-2">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Add a comment... (No links)"
                              className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none text-sm"
                              required
                              maxLength={200}
                            />
                            <Button type="submit" disabled={!newComment.trim()} className="h-10 px-4 bg-indigo-500 hover:bg-indigo-600 text-sm">
                              Post
                            </Button>
                          </form>
                        ) : (
                          <div className="text-center pt-2 text-sm text-slate-500">
                            Please login to join the conversation.
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
          ))
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
