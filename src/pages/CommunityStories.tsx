import { Logo } from '../components/Logo';
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDocs,
  deleteDoc,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import {
  MessageCircle,
  AlertCircle,
  Send,
  ShieldCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Flag,
  Trash2,
  Shield,
  CheckCircle2,
  Share2,
  Heart,
  Eye,
  MoreHorizontal,
  Edit2,
  Repeat,
  Zap,
  Search,
} from "lucide-react";
import { generateContentWithFallback } from "../utils/ai";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../utils/cn";
import seedStoriesData from "../data/seedStories.json";

const seedStories: any[] = seedStoriesData;

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Story {
  id: string;
  content: string;
  author: string;
  userId: string;
  createdAt: any;
  expiresAt?: any;
  category?: string;
  likes?: number;
  likedBy?: string[];
  poll?: {
    options: PollOption[];
    votedUsers: string[]; // array of userIds
  };
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
  userId: string;
  createdAt: any;
  parentId?: string;
  replyToAuthor?: string;
  isAI?: boolean;
}

const formatRelativeTime = (timestamp: any) => {
  if (!timestamp) return "now";
  try {
    const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) return "now";
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return "now";
  }
};

export function CommunityStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newStory, setNewStory] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [postCategory, setPostCategory] = useState("Crush");
  const [showPollInput, setShowPollInput] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingProgress, setSeedingProgress] = useState(0);
  const [totalToSeed, setTotalToSeed] = useState(0);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [shuffledStories, setShuffledStories] = useState<Story[] | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };
  const { user, userData, isConfigured } = useAuth();
  const [searchParams] = useSearchParams();
  const storyIdFromUrl = searchParams.get("id");

  // Admin Check
  const isAdmin = user?.email === "shubh656577@gmail.com";

  // Comment state per story
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [sparkStatuses, setSparkStatuses] = useState<Record<string, 'none' | 'pending' | 'accepted'>>({});

  useEffect(() => {
    if (!user || !db) return;

    // Listen to recent sparks involving the current user to track connection statuses
    // Limited to 100 to save reads on free tier
    const qSent = query(collection(db, 'sparks'), where('senderId', '==', user.uid), limit(100));
    const qReceived = query(collection(db, 'sparks'), where('receiverId', '==', user.uid), limit(100));

    const updateStatuses = (snapshot: any) => {
      setSparkStatuses(prev => {
        const next = { ...prev };
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          const otherId = data.senderId === user.uid ? data.receiverId : data.senderId;
          
          // Priority: accepted > pending > none
          if (data.status === 'accepted') {
            next[otherId] = 'accepted';
          } else if (data.status === 'pending' && next[otherId] !== 'accepted') {
            next[otherId] = 'pending';
          }
        });
        return next;
      });
    };

    const unsubSent = onSnapshot(qSent, updateStatuses);
    const unsubReceived = onSnapshot(qReceived, updateStatuses);

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user?.uid, db]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; userId: string } | null>(null);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (storyIdFromUrl && stories.length > 0) {
      const story = stories.find((s) => s.id === storyIdFromUrl);
      if (story) {
        setSelectedStory(story);
      }
    }
  }, [storyIdFromUrl, stories]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [showReportedOnly, setShowReportedOnly] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [activeSort, setActiveSort] = useState("✨ Newest");
  const [inlineExpandedStories, setInlineExpandedStories] = useState<Set<string>>(new Set());

  const toggleInlineExpand = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineExpandedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const filteredStories = useMemo(() => {
    let result = [...stories];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(s => 
        (s.author || "").toLowerCase().includes(term) ||
        (s.content || "").toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [stories, searchTerm]);

  // Real-time comments listener
  useEffect(() => {
    const storyId = selectedStory?.id || expandedStory;
    if (!storyId) return;

    if (!db) return;

    setLoadingComments(true);
    const q = query(
      collection(db, `community_stories/${storyId}/comments`),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const blockedUsers = userData?.blockedUsers || [];
        const fetchedComments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[];
        
        const filteredComments = fetchedComments.filter(c => !blockedUsers.includes(c.userId)).reverse();
        setComments(filteredComments);
        setLoadingComments(false);
      },
      (error) => {
        console.error("Error fetching comments:", error);
        setLoadingComments(false);
      },
    );

    return () => unsubscribe();
  }, [expandedStory, selectedStory?.id]);

// Fetch stories
  useEffect(() => {
    if (!db) {
      setLoadingStories(false);
      return;
    }

    setLoadingStories(true);

    let q;
    if (showReportedOnly) {
      q = query(
        collection(db, "community_stories"),
        where("reportCount", ">", 0),
        orderBy("reportCount", "desc"),
        limit(20),
      );
    } else {
      if (activeSort === "🏆 Top (All Time)") {
        q = query(
          collection(db, "community_stories"),
          orderBy("likes", "desc"),
          limit(20),
        );
      } else if (activeSort === "👤 My Posts" && user?.uid) {
        q = query(
          collection(db, "community_stories"),
          where("userId", "==", user.uid),
          limit(20),
        );
      } else {
        // For Newest and Trending, fetch newest
        q = query(
          collection(db, "community_stories"),
          orderBy("createdAt", "desc"),
          limit(20),
        );
      }
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = new Date();
        const blockedUsers = userData?.blockedUsers || [];
        
        const storyData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Story[];
          
        const filteredStories = storyData.filter((story) => {
          // Filter out blocked users
          if (blockedUsers.includes(story.userId)) return false;
          
          // Filter out expired stories
          if (story.expiresAt) {
            const expiresAtDate = story.expiresAt.toDate ? story.expiresAt.toDate() : new Date(story.expiresAt);
            if (expiresAtDate < now) return false;
          }
          
          return true;
        });
        
        setStories(filteredStories);
        setLoadingStories(false);
      },
      (error) => {
        console.error("Error fetching stories:", error);
        setLoadingStories(false);
        showToast("Failed to connect to the database.", "error");
      }
    );

    return () => unsubscribe();
  }, [showReportedOnly, activeSort, user?.uid]);

  // Scroll to specific story if ID is in URL
  useEffect(() => {
    if (!loadingStories && stories.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const storyId = urlParams.get("id");
      if (storyId) {
        const element = document.getElementById(`story-${storyId}`);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add(
              "ring-4",
              "ring-indigo-500",
              "ring-opacity-50",
              "transition-all",
              "duration-1000",
            );
            setTimeout(() => {
              element.classList.remove(
                "ring-4",
                "ring-indigo-500",
                "ring-opacity-50",
              );
            }, 3000);
          }, 500);
        }
      }
    }
  }, [loadingStories, stories]);

  const hasLinks = (text: string) => {
    const urlRegex =
      /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
    return urlRegex.test(text);
  };

  const handleSeedDatabase = async () => {
    console.log("Seed button clicked!");
    if (!db) {
      console.error("Database not initialized");
      showToast("Database not initialized", "error");
      return;
    }
    if (!user) {
      console.error("User not logged in");
      showToast("Please login to seed the database.", "error");
      return;
    }
    
    console.log("Starting seeding process with", seedStories.length, "stories");
    setIsSeeding(true);
    setSeedingProgress(0);
    setTotalToSeed(seedStories.length);
    
    try {
      let batch = writeBatch(db);
      let count = 0;
      let storiesProcessed = 0;
      
      for (const story of seedStories) {
        const newStoryRef = doc(collection(db, "community_stories"));
        
        batch.set(newStoryRef, {
          content: story.content,
          author: story.author || "Anonymous",
          category: story.category || "General",
          likes: story.likes || 0,
          likedBy: [],
          reactions: { aww: 0, redFlag: 0, drama: 0, heartbreak: 0, slay: 0 },
          commentCount: story.comments ? story.comments.length : 0,
          reportCount: 0,
          reactedUsers: [],
          createdAt: serverTimestamp(),
          userId: user.uid,
        });
        count++;
        storiesProcessed++;
        
        // Update progress every 5 stories to avoid too many state updates
        if (storiesProcessed % 5 === 0 || storiesProcessed === seedStories.length) {
          setSeedingProgress(storiesProcessed);
        }

        if (count >= 400) {
          console.log(`Committing batch at ${storiesProcessed} stories...`);
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }

        if (story.comments && story.comments.length > 0) {
          for (const comment of story.comments) {
            const commentRef = doc(collection(db, `community_stories/${newStoryRef.id}/comments`));
            batch.set(commentRef, {
              text: comment.text,
              author: comment.user || "Anonymous",
              createdAt: serverTimestamp(),
              userId: user.uid,
            });
            count++;

            if (count >= 400) {
              console.log(`Committing batch at ${storiesProcessed} stories (comment)...`);
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }
      }
      
      if (count > 0) {
        console.log("Committing final batch...");
        await batch.commit();
      }
      
      console.log("Seeding complete!");
      showToast(`Successfully seeded ${seedStories.length} stories!`, "success");
    } catch (error: any) {
      console.error("Error seeding database:", error);
      showToast(`Failed to seed database: ${error.message || "Unknown error"}`, "error");
    } finally {
      setIsSeeding(false);
      setSeedingProgress(0);
    }
  };

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to post a story!", "error");
      return;
    }
    if (!newStory.trim() || !db) return;

    // 1. Link Prevention Check
    if (hasLinks(newStory)) {
      showToast(
        "⚠️ Links are not allowed in Community Stories to prevent spam.",
        "error",
      );
      return;
    }

    setLoading(true);
    setModerating(true);

    try {
      // 2. Check if user is banned
      if (user?.uid) {
        const banRef = doc(db, "banned_users", user.uid);
        const banSnap = await getDoc(banRef);
        if (banSnap.exists()) {
          showToast(
            "🚫 You have been blocked from posting in the community.",
            "error",
          );
          setLoading(false);
          setModerating(false);
          return;
        }
      }

      // 3. AI Moderation Check
      const prompt = `
        Analyze the following story. Does it contain bullying, swearing, hate speech, requests for money, self-harm, or highly inappropriate/NSFW content? 
        Reply with ONLY 'YES' if it contains bad content, or 'NO' if it is safe.
        
        Story: ${newStory}
      `;

      const response = await generateContentWithFallback({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const aiDecision = response.text?.trim().toUpperCase() || "";

      if (aiDecision.includes("YES")) {
        showToast(
          "⚠️ Post Blocked: Our AI detected inappropriate content.",
          "error",
        );
        setLoading(false);
        setModerating(false);
        return;
      }

      // 4. Safe to Post - Save to Firebase
      const storyData: any = {
        content: newStory.trim(),
        author: authorName.trim() || user.displayName || "Anonymous",
        createdAt: serverTimestamp(),
        userId: user.uid,
        category: postCategory,
        likes: 0,
        likedBy: [],
        reactions: { aww: 0, redFlag: 0, drama: 0, heartbreak: 0, slay: 0 },
        commentCount: 0,
        reportCount: 0,
        reactedUsers: [],
      };

      if (isEphemeral) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        storyData.expiresAt = expiresAt;
      }

      if (showPollInput) {
        const validOptions = pollOptions.filter((opt) => opt.trim() !== "");
        if (validOptions.length >= 2) {
          storyData.poll = {
            options: validOptions.map((text, i) => ({
              id: `opt_${i}`,
              text: text.trim(),
              votes: 0,
            })),
            votedUsers: [],
          };
        }
      }

      await addDoc(collection(db, "community_stories"), storyData);

      setNewStory("");
      setAuthorName("");
      setPostCategory("General");
      setShowPollInput(false);
      setPollOptions(["", ""]);
      setIsEphemeral(false);
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

  const COOL_EMOJIS = [
    "💀",
    "😭",
    "💅",
    "🚩",
    "☕",
    "🤡",
    "🐐",
    "👀",
    "💯",
    "🫶",
    "🔥",
    "🥺",
    "💔",
    "👑",
    "✨",
    "🥰",
    "😂",
    "🤔",
    "🎉",
  ];
  const [activeReactionStoryId, setActiveReactionStoryId] = useState<
    string | null
  >(null);

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isSharing) return;
    setIsSharing(true);
    
    const shareData = {
      title: `Story by ${story.author} on Community`,
      text: story.content,
      url: `${window.location.origin}/community?story=${story.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast("Thanks for sharing!", "success");
      } else {
        // Fallback for browsers that don't support navigator.share
        await navigator.clipboard.writeText(`${shareData.text}\n\nRead more at: ${shareData.url}`);
        showToast("Story copied to clipboard!", "success");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Don't show error if user just cancelled the share dialog
      if ((err as Error).name !== 'AbortError') {
        showToast("Failed to share story", "error");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const [reactingToId, setReactingToId] = useState<string | null>(null);

  const handleReaction = async (story: Story, emoji: string) => {
    if (!user) {
      showToast("Please login to react to stories!", "info");
      return;
    }
    if (reactingToId === story.id) return; // Prevent double clicks

    if (!db) return;

    setReactingToId(story.id);
    const userReactionKey = `${user.uid}_${emoji}`;
    const hasReactedToThis = story.reactedUsers?.includes(userReactionKey);

    // Find if the user has reacted with ANY emoji
    const previousReactionKey = story.reactedUsers?.find((u) =>
      u.startsWith(`${user.uid}_`),
    );
    const previousEmoji = previousReactionKey
      ? previousReactionKey.split("_")[1]
      : null;

    // Optimistic UI update
    setStories((prev) =>
      prev.map((s) => {
        if (s.id === story.id) {
          const newReactions = { ...s.reactions };
          let newReactedUsers = [...(s.reactedUsers || [])];

          if (hasReactedToThis) {
            // Deselect the current emoji
            newReactions[emoji] = Math.max(0, (newReactions[emoji] || 0) - 1);
            newReactedUsers = newReactedUsers.filter(
              (u) => u !== userReactionKey,
            );
          } else {
            // Select new emoji, and remove old one if exists
            if (previousEmoji) {
              newReactions[previousEmoji] = Math.max(
                0,
                (newReactions[previousEmoji] || 0) - 1,
              );
              newReactedUsers = newReactedUsers.filter(
                (u) => u !== previousReactionKey,
              );
            }
            newReactions[emoji] = (newReactions[emoji] || 0) + 1;
            newReactedUsers.push(userReactionKey);
          }

          const updatedStory = {
            ...s,
            reactions: newReactions,
            reactedUsers: newReactedUsers,
          };
          
          if (selectedStory?.id === story.id) {
            setSelectedStory(updatedStory);
          }
          
          return updatedStory;
        }
        return s;
      }),
    );

    setActiveReactionStoryId(null);

    try {
      const storyRef = doc(db, "community_stories", story.id);
      if (hasReactedToThis) {
        // Deselect
        await updateDoc(storyRef, {
          [`reactions.${emoji}`]: increment(-1),
          reactedUsers: arrayRemove(userReactionKey),
        });
      } else {
        // Select new, remove old
        if (previousEmoji && previousReactionKey) {
          // Remove old reaction
          await updateDoc(storyRef, {
            [`reactions.${previousEmoji}`]: increment(-1),
            reactedUsers: arrayRemove(previousReactionKey),
          });
        }
        // Add new reaction
        await updateDoc(storyRef, {
          [`reactions.${emoji}`]: increment(1),
          reactedUsers: arrayUnion(userReactionKey),
        });
      }
    } catch (error) {
      console.error("Error updating reaction: ", error);
      showToast("Failed to update reaction.", "error");
    } finally {
      setReactingToId(null);
    }
  };

  const handleReport = async (storyId: string) => {
    if (!user) {
      showToast("Please login to report stories.", "error");
      return;
    }
    if (!db) return;

    if (reportingPostId !== storyId) {
      setReportingPostId(storyId);
      setTimeout(() => setReportingPostId(null), 3000);
      return;
    }

    try {
      const storyRef = doc(db, "community_stories", storyId);
      await updateDoc(storyRef, {
        reportCount: increment(1),
      });
      showToast(
        "Thank you for reporting. Our moderation team will review this post.",
        "success",
      );
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
      await updateDoc(doc(db, "community_stories", storyId), {
        reportCount: 0,
      });
      showToast("Reports cleared. Post marked as innocent.", "success");
    } catch (error) {
      console.error("Error clearing reports:", error);
      showToast("Failed to clear reports.", "error");
    }
  };

  const handleDeletePost = async (storyId: string) => {
    if (storyId.startsWith("seed_")) {
      showToast("Cannot delete archived community stories.", "error");
      return;
    }
    if (!db) return;

    if (deletingPostId !== storyId) {
      setDeletingPostId(storyId);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeletingPostId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, "community_stories", storyId));
      showToast("Post deleted successfully.", "success");
      setDeletingPostId(null);
    } catch (error: any) {
      console.error("Error deleting post:", error);
      showToast(
        "Failed to delete post. You might not have permission.",
        "error",
      );
      setDeletingPostId(null);
    }
  };

  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [sparkModalStory, setSparkModalStory] = useState<Story | null>(null);
  const [sparkMessage, setSparkMessage] = useState("");
  const [isSendingSpark, setIsSendingSpark] = useState(false);

  const handleSendSpark = (story: Story) => {
    if (!user) {
      showToast("Please login to spark a connection!", "info");
      return;
    }
    setSparkModalStory(story);
  };

  const submitSpark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !sparkModalStory || !sparkMessage.trim()) return;

    setIsSendingSpark(true);
    try {
      // Create a spark request in a new collection
      await addDoc(collection(db, "sparks"), {
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        receiverId: sparkModalStory.userId,
        storyId: sparkModalStory.id,
        message: sparkMessage.trim(),
        status: "pending", // pending, accepted, declined
        createdAt: serverTimestamp(),
      });

      showToast("Spark sent! If they accept, you can chat.", "success");
      setSparkModalStory(null);
      setSparkMessage("");
    } catch (error) {
      console.error("Error sending spark:", error);
      showToast("Failed to send spark.", "error");
    } finally {
      setIsSendingSpark(false);
    }
  };

  const handleGetAIAdvice = async (story: Story) => {
    if (!db) return;
    setIsGettingAdvice(true);
    try {
      const prompt = `
        You are an objective, empathetic AI therapist and advice giver. 
        Read the following story and provide a helpful, unbiased perspective. 
        If there are "red flags", point them out gently but clearly. 
        Validate the user's feelings if appropriate.
        Keep your response concise (under 3 paragraphs).
        
        Story: "${story.content}"
      `;

      const response = await generateContentWithFallback({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const advice = response.text?.trim();
      if (!advice) throw new Error("Failed to generate advice");

      // Post the advice as a comment
      const commentData = {
        text: advice,
        author: "AI Therapist 🤖",
        userId: "ai_therapist", // Special ID
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        isAI: true, // Special flag for styling
      };

      await addDoc(
        collection(db, `community_stories/${story.id}/comments`),
        commentData,
      );

      // Update comment count
      const storyRef = doc(db, "community_stories", story.id);
      await updateDoc(storyRef, {
        commentCount: increment(1),
      });

      showToast("AI Perspective added!", "success");
    } catch (error) {
      console.error("Error getting AI advice:", error);
      showToast("Failed to get AI perspective.", "error");
    } finally {
      setIsGettingAdvice(false);
    }
  };

  const handlePersonalBlock = async (userIdToBlock: string) => {
    if (!user || !db) return;
    if (userIdToBlock === user.uid) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentBlocked = userDoc.data().blockedUsers || [];
        if (!currentBlocked.includes(userIdToBlock)) {
          await updateDoc(userRef, {
            blockedUsers: [...currentBlocked, userIdToBlock]
          });
          showToast("User blocked. You won't see their posts or comments.", "success");
          // Refresh user data in context if needed, or just let the feed filter
        }
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast("Failed to block user.", "error");
    }
  };

  const handleBlockUser = async (authorId: string) => {
    if (authorId.startsWith("seed_")) {
      showToast("Cannot block an archived user.", "error");
      return;
    }
    if (!db) return;
    if (authorId === "anonymous") {
      showToast(
        "Cannot block an anonymous user. Please just delete their post.",
        "error",
      );
      return;
    }

    if (blockingUserId !== authorId) {
      setBlockingUserId(authorId);
      setTimeout(() => setBlockingUserId(null), 3000);
      return;
    }

    try {
      await setDoc(doc(db, "banned_users", authorId), {
        bannedAt: serverTimestamp(),
        reason: "Admin blocked from community stories",
      });
      showToast("User has been blocked.", "success");
      setBlockingUserId(null);
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast("Failed to block user.", "error");
      setBlockingUserId(null);
    }
  };

  const handleEditPost = async (storyId: string, newContent: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "community_stories", storyId), {
        content: newContent,
        updatedAt: serverTimestamp(),
      });
      showToast("Post updated successfully!", "success");
      setEditingStory(null);
      setEditContent("");
    } catch (error) {
      console.error("Error updating post:", error);
      showToast("Failed to update post.", "error");
    }
  };

  const handleEditComment = async (storyId: string, commentId: string, newText: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, `community_stories/${storyId}/comments`, commentId), {
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

  const handleDeleteComment = async (storyId: string, commentId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, `community_stories/${storyId}/comments`, commentId));
      await updateDoc(doc(db, "community_stories", storyId), {
        commentCount: increment(-1),
      });
      showToast("Comment deleted.", "success");
    } catch (error) {
      console.error("Error deleting comment:", error);
      showToast("Failed to delete comment.", "error");
    }
  };

  const handleShufflePosts = () => {
    if (!isAdmin) return;
    const shuffled = [...stories].sort(() => Math.random() - 0.5);
    setShuffledStories(shuffled);
    showToast("Posts shuffled for variety!", "success");
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
    if (storyId.startsWith("seed_")) {
      showToast("🔒 Comments are locked for archived stories.", "error");
      setNewComment("");
      return;
    }
    if (!newComment.trim() || !db) return;

    setIsPostingComment(true);
    if (hasLinks(newComment)) {
      showToast("⚠️ Links are not allowed in comments.", "error");
      setIsPostingComment(false);
      return;
    }

    const commentText = newComment.trim();
    const currentReplyTo = replyTo;
    setNewComment("");
    setReplyTo(null);

    try {
      const commentData: any = {
        text: commentText,
        author: user.displayName || "Anonymous",
        createdAt: serverTimestamp(),
        userId: user.uid,
      };

      if (currentReplyTo) {
        commentData.parentId = currentReplyTo.id;
        commentData.replyToAuthor = currentReplyTo.author;
      }

      await addDoc(collection(db, `community_stories/${storyId}/comments`), commentData);

      const storyRef = doc(db, "community_stories", storyId);
      await updateDoc(storyRef, {
        commentCount: increment(1),
      });

      // If it's a reply, auto-expand the parent
      if (currentReplyTo) {
        setExpandedComments(prev => new Set(prev).add(currentReplyTo.id));
      }

      // Find the story to get the author's userId
      const story = stories.find((s) => s.id === storyId);

      // Notification logic
      if (currentReplyTo) {
        // Notify the person being replied to
        if (currentReplyTo.userId !== user.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: currentReplyTo.userId,
            type: "reply",
            storyId: storyId,
            message: `${user.displayName || "Someone"} replied to your comment: "${commentText.substring(0, 30)}..."`,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      } else if (story && story.userId && story.userId !== user.uid) {
        // Create notification for the story author (only if it's a top-level comment)
        await addDoc(collection(db, "notifications"), {
          userId: story.userId,
          type: "comment",
          storyId: storyId,
          message: `${user.displayName || "Someone"} commented on your story: "${story.content.substring(0, 30)}..."`,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
      showToast("Comment posted!", "success");
    } catch (error) {
      console.error("Error posting comment:", error);
      showToast("Failed to post comment.", "error");
    } finally {
      setIsPostingComment(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-16 h-16 text-indigo-500 mx-auto" />
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Firebase Required
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Community Stories require a database. Please add your Firebase
          configuration to the .env file!
        </p>
      </div>
    );
  }

  const sortedStories = useMemo(() => {
    if (shuffledStories) return shuffledStories;
    let sorted = [...stories];
    if (activeSort === "✨ Newest" || activeSort === "👤 My Posts") {
      sorted.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    }
    return sorted;
  }, [stories, activeSort, shuffledStories]);

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen pb-20 relative px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 z-10">
      {/* Subtle Background Gradient and Floating Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-900/20 via-transparent to-transparent dark:via-[#0A0A0B] dark:to-[#0A0A0B]">
        <div className="absolute top-[10%] left-[5%] w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-[40%] right-[10%] w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[20%] left-[15%] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-pink-100 dark:border-white/10 py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6">
        <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Community
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                "p-2 rounded-full transition-all",
                showSearch ? "bg-pink-500 text-white" : "bg-white/60 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-white"
              )}
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={handleShufflePosts}
                  className="p-2 rounded-full transition-colors bg-purple-500/20 text-purple-500 hover:bg-purple-500/30"
                  title="Shuffle Posts"
                >
                  <Repeat className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="p-2 rounded-full transition-colors bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30 disabled:opacity-50"
                  title="Seed Database"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowReportedOnly(!showReportedOnly)}
                  className={`p-2 rounded-full transition-colors ${showReportedOnly ? "bg-red-500/20 text-red-500" : "bg-white/60 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-white"}`}
                >
                  <Flag className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by username or content..."
                  className="w-full h-11 pl-11 pr-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-pink-500/30 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all text-sm"
                  autoFocus
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["✨ Newest", "🏆 Top (All Time)", ...(user ? ["👤 My Posts"] : [])].map((sortOption) => (
            <button
              key={sortOption}
              onClick={() => setActiveSort(sortOption)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeSort === sortOption
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-white/60 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {sortOption}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className={`fixed top-20 left-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-medium ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "success"
                  ? "bg-indigo-500 text-white"
                  : "bg-zinc-800 text-white"
            }`}
          >
            {toast.type === "error" && <AlertCircle className="w-4 h-4" />}
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === "info" && <MessageCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Posting */}
      {user ? (
        <button
          onClick={() => setShowPostModal(true)}
          className="fixed bottom-24 right-4 md:bottom-12 md:right-12 w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-40 border-none"
          aria-label="Post a Story"
        >
          <Plus className="w-8 h-8" />
        </button>
      ) : (
        <div className="fixed bottom-16 md:bottom-0 left-0 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 text-center z-40 shadow-[0_-4px_20px_rgba(236,72,153,0.3)] flex items-center justify-center gap-4">
          <p className="font-medium text-sm md:text-base">
            Login to share your own stories and react!
          </p>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl bg-white dark:bg-[#121214] relative shadow-2xl animate-in fade-in zoom-in duration-200 border-pink-100 dark:border-white/10">
            <button
              onClick={() => setShowPostModal(false)}
              className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
              Share Your Story{" "}
              <MessageCircle className="w-6 h-6 text-pink-500" />
            </h2>

            <form onSubmit={handlePostStory} className="space-y-4">
              <textarea
                value={newStory}
                onChange={(e) => {
                  setNewStory(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder="Spill the tea here... (No links allowed)"
                className="w-full min-h-[8rem] max-h-[20rem] p-4 rounded-xl border-2 border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none resize-none transition-all overflow-y-auto text-zinc-900 dark:text-white placeholder:text-zinc-500"
                required
                maxLength={2000}
              />

              {/* Poll Options */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPollInput(!showPollInput)}
                  className="text-sm font-medium text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />{" "}
                  {showPollInput ? "Remove Poll" : "Add a Poll"}
                </button>

                <AnimatePresence>
                  {showPollInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[idx] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 h-10 px-3 rounded-lg border border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500"
                            maxLength={50}
                          />
                          {idx >= 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = pollOptions.filter(
                                  (_, i) => i !== idx,
                                );
                                setPollOptions(newOpts);
                              }}
                              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 4 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, ""])}
                          className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-white"
                        >
                          + Add another option
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEphemeral(!isEphemeral)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEphemeral ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEphemeral ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">Ephemeral Venting</span>
                  <span className="text-xs text-zinc-500">Post will self-destruct in 24 hours</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your Name (Optional)"
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-500"
                  maxLength={30}
                />
                <Button
                  type="submit"
                  variant="custom"
                  disabled={loading || !newStory.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-none flex items-center justify-center gap-2 w-full sm:w-auto text-white"
                >
                  {loading ? (
                    <>
                      {moderating ? "AI Checking..." : "Posting..."}
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Post Story <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500 text-center mt-2">
                Stories are analyzed by AI. Inappropriate content or links will
                be blocked.
              </p>
            </form>
          </Card>
        </div>
      )}

      {isSeeding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-pink-500/20"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-zinc-100 dark:text-zinc-800"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - (totalToSeed > 0 ? seedingProgress / totalToSeed : 0))}
                  className="text-pink-500 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Plus className="w-8 h-8 text-pink-500 animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
              Seeding Database...
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Please wait while we populate the community with stories.
            </p>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 flex justify-between items-center">
              <div className="text-left">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Progress</span>
                <span className="text-lg font-black text-pink-500">
                  {totalToSeed > 0 ? Math.round((seedingProgress / totalToSeed) * 100) : 0}%
                </span>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Stories</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white">
                  {seedingProgress} / {totalToSeed}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stories Feed */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="popLayout">
          {loadingStories ? (
            // Skeleton Loaders
            [1, 2, 3].map((i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border-b border-gray-200/20 px-4 py-4"
              >
                <div className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-white/10 shrink-0"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-white/80 dark:bg-white/10 rounded w-1/3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/80 dark:bg-white/10 rounded w-full"></div>
                      <div className="h-3 bg-white/80 dark:bg-white/10 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : filteredStories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center px-6"
            >
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-zinc-300" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                {searchTerm ? "No matches found" : "No stories yet"}
              </h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                {searchTerm 
                  ? `We couldn't find any stories matching "${searchTerm}". Try a different keyword.`
                  : "Be the first to share your story with the community!"}
              </p>
            </motion.div>
          ) : (
            filteredStories.map((story) => (
              <motion.div
                key={story.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border-b border-gray-200/20 px-4 py-3 hover:bg-white/80 dark:bg-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden group"
                onClick={() => setSelectedStory(story)}
              >
                <div id={`story-${story.id}`} className="flex gap-3">
                  {/* Left Column: Avatar */}
                  <div className="shrink-0 pt-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${story.userId}`);
                      }}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 font-bold text-lg border border-pink-500/20 hover:scale-110 transition-transform"
                    >
                      {story.author.charAt(0).toUpperCase()}
                    </button>
                  </div>

                  {/* Right Column: Content */}
                  <div className="flex-1 min-w-0">
                    {/* Admin Warning Banner */}
                    {isAdmin && (story.reportCount || 0) > 0 && (
                      <div className="mb-2 bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" />
                        REPORTED ({story.reportCount})
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${story.userId}`);
                          }}
                          className="font-bold text-[14px] text-zinc-900 dark:text-white truncate cursor-pointer hover:text-pink-500 transition-colors"
                        >
                          {story.author}
                        </span>
                        {story.category && (
                          <span className="px-1.5 py-0.5 bg-pink-500/10 text-pink-500 text-[9px] rounded-full font-bold uppercase tracking-wider">
                            {story.category}
                          </span>
                        )}
                        {user && user.uid === story.userId && (
                          <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] rounded-full font-bold uppercase tracking-wider">
                            You
                          </span>
                        )}
                        {user && user.uid !== story.userId && sparkStatuses[story.userId] !== 'accepted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (sparkStatuses[story.userId] === 'pending') {
                                showToast("Spark request is already pending!", "success");
                              } else {
                                handleSendSpark(story);
                              }
                            }}
                            className={cn(
                              "ml-1 transition-all transform hover:scale-110 flex items-center gap-1",
                              sparkStatuses[story.userId] === 'pending' ? "text-pink-500" : "text-yellow-500 hover:text-yellow-600"
                            )}
                            title={sparkStatuses[story.userId] === 'pending' ? "Requested" : "Spark a Connection"}
                          >
                            <Zap className={cn("w-3.5 h-3.5", sparkStatuses[story.userId] === 'pending' && "fill-current")} />
                            {sparkStatuses[story.userId] === 'pending' && <span className="text-[9px] font-bold uppercase tracking-tighter">Requested</span>}
                          </button>
                        )}
                        <span className="text-[13px] text-zinc-500 shrink-0">
                          · {formatRelativeTime(story.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === story.id ? null : story.id);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-500/10"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeMenuId === story.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-white/10 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {user && user.uid === story.userId && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStory(story);
                                    setEditContent(story.content);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit Post
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePost(story.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete Post
                                </button>
                              </>
                            )}
                            {isAdmin && showReportedOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePost(story.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Admin Delete
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                handleShare(story, e);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                            >
                              <Share2 className="w-4 h-4" /> Share
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReport(story.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                            >
                              <Flag className="w-4 h-4" /> Report
                            </button>
                            {user && user.uid !== story.userId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePersonalBlock(story.userId);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <X className="w-4 h-4" /> Block User
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="mb-3 mt-1">
                      <p className="text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                        {story.content}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between max-w-[280px] -ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(story, "aww");
                        }}
                        className={cn(
                          "group flex items-center gap-1 transition-colors",
                          story.reactedUsers?.some(u => u.startsWith(user?.uid || ''))
                            ? "text-pink-500"
                            : "text-zinc-500 hover:text-pink-500"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-full transition-colors",
                          story.reactedUsers?.some(u => u.startsWith(user?.uid || ''))
                            ? "bg-pink-500/10"
                            : "group-hover:bg-pink-500/10"
                        )}>
                          <Heart className={cn(
                            "w-4 h-4 transition-all",
                            story.reactedUsers?.some(u => u.startsWith(user?.uid || '')) && "fill-pink-500 scale-110"
                          )} />
                        </div>
                        <span className="text-[12px] font-medium">
                          {story.reactions?.aww || 0}
                        </span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStory(story);
                        }}
                        className="group flex items-center gap-1 text-zinc-500 hover:text-blue-500 transition-colors"
                      >
                        <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <span className="text-[12px] font-medium">
                          {story.commentCount || 0}
                        </span>
                      </button>

                      <div className="group flex items-center gap-1 text-zinc-500 hover:text-purple-500 transition-colors">
                        <div className="p-2 rounded-full group-hover:bg-purple-500/10 transition-colors">
                          <Eye className="w-4 h-4" />
                        </div>
                        <span className="text-[12px] font-medium">
                          {story.poll
                            ? story.poll.options.reduce(
                                (acc, curr) => acc + curr.votes,
                                0,
                              )
                            : Math.floor((story.reactions?.aww || 0) * 2.5 + (story.commentCount || 0) * 5 + 10)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedStory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStory(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#121214] rounded-t-[32px] border-t border-pink-100 dark:border-white/10 h-[90vh] flex flex-col shadow-2xl sm:max-w-2xl sm:mx-auto sm:rounded-[32px] sm:bottom-6 sm:h-[85vh]"
            >
              <div className="flex justify-center sm:justify-between items-center p-4 shrink-0 relative border-b border-pink-50 dark:border-white/5">
                <div className="w-12 h-1.5 bg-white/20 rounded-full sm:hidden" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white hidden sm:block ml-4">Comments</h3>
                <button 
                  onClick={() => setSelectedStory(null)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 scrollbar-hide">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 font-bold text-xl border border-pink-500/20">
                    {selectedStory.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white text-lg">
                        {selectedStory.author}
                      </span>
                      {selectedStory.category && (
                        <span className="px-2 py-0.5 bg-white/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-xs rounded-full font-medium uppercase tracking-wider">
                          {selectedStory.category}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {selectedStory.createdAt
                        ? new Date(
                            selectedStory.createdAt.toMillis(),
                          ).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Just now"}
                    </div>
                  </div>
                </div>

                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed mb-8 text-[15px] sm:text-base">
                  {selectedStory.content}
                </p>

                {/* Poll Section */}
                {selectedStory.poll && (
                  <div className="mb-8 space-y-3 bg-white/60 dark:bg-white/5 p-5 rounded-2xl border border-pink-50 dark:border-white/5">
                    <h4 className="text-zinc-900 dark:text-white font-bold mb-4 flex items-center gap-2">
                      <span className="text-xl">📊</span> Community Poll
                    </h4>
                    {selectedStory.poll.options.map((opt, idx) => {
                      const totalVotes = selectedStory.poll!.options.reduce(
                        (acc, curr) => acc + curr.votes,
                        0,
                      );
                      const percentage =
                        totalVotes === 0
                          ? 0
                          : Math.round((opt.votes / totalVotes) * 100);
                      const hasVoted =
                        user &&
                        selectedStory.poll!.votedUsers.includes(user.uid);

                      return (
                        <button
                          key={idx}
                          onClick={async () => {
                            if (!user) {
                              showToast("Please login to vote!", "info");
                              return;
                            }
                            if (selectedStory.id.startsWith("seed_")) {
                              showToast("Voting is closed for archived stories.", "info");
                              return;
                            }
                            if (hasVoted) return;

                            // Optimistic update
                            const updatedStory = { ...selectedStory };
                            updatedStory.poll!.options[idx].votes += 1;
                            updatedStory.poll!.votedUsers.push(user.uid);
                            setSelectedStory(updatedStory);

                            // Firebase update
                            if (!db) return;
                            try {
                              const storyRef = doc(
                                db,
                                "community_stories",
                                selectedStory.id,
                              );
                              // We need to fetch the latest to update the array properly, or just overwrite the poll object
                              const storySnap = await getDoc(storyRef);
                              if (storySnap.exists()) {
                                const currentData = storySnap.data() as Story;
                                if (
                                  currentData.poll &&
                                  !currentData.poll.votedUsers.includes(
                                    user.uid,
                                  )
                                ) {
                                  const newPoll = { ...currentData.poll };
                                  newPoll.options[idx].votes += 1;
                                  newPoll.votedUsers.push(user.uid);
                                  await updateDoc(storyRef, { poll: newPoll });
                                }
                              }
                            } catch (error) {
                              console.error("Error voting:", error);
                              showToast("Failed to submit vote.", "error");
                            }
                          }}
                          disabled={hasVoted}
                          className="w-full relative overflow-hidden rounded-xl bg-white/60 dark:bg-white/5 border border-pink-100 dark:border-white/10 p-4 text-left transition-all hover:bg-white/80 dark:bg-white/10 disabled:opacity-100 disabled:cursor-default group"
                        >
                          {hasVoted && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 z-0"
                            />
                          )}
                          <div className="relative z-10 flex justify-between items-center">
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {opt.text}
                            </span>
                            {hasVoted && (
                              <span className="text-sm font-bold text-pink-400">
                                {percentage}%
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    <div className="text-right text-xs text-zinc-500 mt-2">
                      {selectedStory.poll.options.reduce(
                        (acc, curr) => acc + curr.votes,
                        0,
                      )}{" "}
                      total votes
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-pink-500" /> Comments
                      ({selectedStory.commentCount || 0})
                    </h3>
                    <button
                      onClick={() => handleGetAIAdvice(selectedStory)}
                      disabled={isGettingAdvice}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-full text-sm font-medium transition-all shadow-md disabled:opacity-50"
                    >
                      {isGettingAdvice ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-lg">🤖</span>
                      )}
                      Get AI Perspective
                    </button>
                  </div>

                  {loadingComments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {comments.length === 0 ? (
                        <p className="text-center text-zinc-500 py-8">
                          No comments yet. Be the first to share your thoughts!
                        </p>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {comments
                            .filter((c) => !c.parentId)
                            .map((comment) => (
                              <motion.div
                                key={comment.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`space-y-4 ${comment.isAI ? 'bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20' : ''}`}
                              >
                                <div className="flex gap-3">
                                  <button 
                                    onClick={() => navigate(`/profile/${comment.userId}`)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 hover:scale-110 transition-transform ${comment.isAI ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-white/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'}`}
                                  >
                                    {comment.isAI ? '🤖' : comment.author.charAt(0).toUpperCase()}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-baseline gap-2 mb-1">
                                      <span 
                                        onClick={() => navigate(`/profile/${comment.userId}`)}
                                        className={`font-bold text-sm cursor-pointer hover:text-pink-500 transition-colors ${comment.isAI ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-white'}`}
                                      >
                                        {comment.author}
                                      </span>
                                      <span className="text-xs text-zinc-500">
                                        {comment.createdAt
                                          ? formatRelativeTime(comment.createdAt)
                                          : "now"}
                                      </span>
                                    </div>
                                    <p className={`text-[15px] leading-relaxed mt-1 ${comment.isAI ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                      {comment.text}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button
                                        onClick={() =>
                                          setReplyTo({
                                            id: comment.id,
                                            author: comment.author,
                                            userId: comment.userId,
                                          })
                                        }
                                        className="text-xs font-medium text-pink-500 hover:text-pink-600 transition-colors"
                                      >
                                        Reply
                                      </button>

                                      {comments.some(r => r.parentId === comment.id) && (
                                        <button
                                          onClick={() => toggleReplies(comment.id)}
                                          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                                        >
                                          {expandedComments.has(comment.id) ? (
                                            <>Hide Replies</>
                                          ) : (
                                            <>Show Replies ({comments.filter(r => r.parentId === comment.id).length})</>
                                          )}
                                        </button>
                                      )}
                                      
                                      <div className="relative">
                                        <button
                                          onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)}
                                          className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors rounded-full hover:bg-zinc-500/10"
                                        >
                                          <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                        
                                        {activeMenuId === comment.id && (
                                          <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-white/10 py-1 z-50">
                                            {user && user.uid === comment.userId && (
                                              <button
                                                onClick={() => {
                                                  setEditingComment(comment);
                                                  setEditContent(comment.text);
                                                  setActiveMenuId(null);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" /> Edit
                                              </button>
                                            )}
                                            {(isAdmin || (user && user.uid === comment.userId)) && (
                                              <button
                                                onClick={() => {
                                                  handleDeleteComment(selectedStory.id, comment.id);
                                                  setActiveMenuId(null);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                              </button>
                                            )}
                                            {user && user.uid !== comment.userId && (
                                              <button
                                                onClick={() => {
                                                  handlePersonalBlock(comment.userId);
                                                  setActiveMenuId(null);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                              >
                                                <X className="w-3.5 h-3.5" /> Block User
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {expandedComments.has(comment.id) && (
                                  <AnimatePresence mode="popLayout">
                                    {comments
                                      .filter((r) => r.parentId === comment.id)
                                      .map((reply) => (
                                        <motion.div
                                          key={reply.id}
                                          layout
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          className="flex gap-3 ml-11"
                                        >
                                          <button 
                                            onClick={() => navigate(`/profile/${reply.userId}`)}
                                            className="w-6 h-6 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-[10px] shrink-0 hover:scale-110 transition-transform"
                                          >
                                            {reply.author.charAt(0).toUpperCase()}
                                          </button>
                                          <div className="flex-1">
                                            <div className="flex items-baseline gap-2 mb-1">
                                              <span 
                                                onClick={() => navigate(`/profile/${reply.userId}`)}
                                                className="font-bold text-zinc-900 dark:text-white text-xs cursor-pointer hover:text-pink-500 transition-colors"
                                              >
                                                {reply.author}
                                              </span>
                                              <span className="text-[10px] text-zinc-500">
                                                {reply.createdAt
                                                  ? formatRelativeTime(reply.createdAt)
                                                  : "now"}
                                              </span>
                                            </div>
                                            <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed mt-1">
                                              {reply.replyToAuthor && (
                                                <span className="text-pink-500 font-medium mr-1">
                                                  @{reply.replyToAuthor}
                                                </span>
                                              )}
                                              {reply.text}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                              <button
                                                onClick={() =>
                                                  setReplyTo({
                                                    id: comment.id,
                                                    author: reply.author,
                                                    userId: reply.userId,
                                                  })
                                                }
                                                className="text-[10px] font-medium text-pink-500 hover:text-pink-600 transition-colors"
                                              >
                                                Reply
                                              </button>
                                              
                                              <div className="relative">
                                                <button
                                                  onClick={() => setActiveMenuId(activeMenuId === reply.id ? null : reply.id)}
                                                  className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors rounded-full hover:bg-zinc-500/10"
                                                >
                                                  <MoreHorizontal className="w-3 h-3" />
                                                </button>
                                                
                                                {activeMenuId === reply.id && (
                                                  <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-white/10 py-1 z-50">
                                                    {user && user.uid === reply.userId && (
                                                      <button
                                                        onClick={() => {
                                                          setEditingComment(reply);
                                                          setEditContent(reply.text);
                                                          setActiveMenuId(null);
                                                        }}
                                                        className="w-full px-3 py-1.5 text-left text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2"
                                                      >
                                                        <Edit2 className="w-3 h-3" /> Edit
                                                      </button>
                                                    )}
                                                    {(isAdmin || (user && user.uid === reply.userId)) && (
                                                      <button
                                                        onClick={() => {
                                                          handleDeleteComment(selectedStory.id, reply.id);
                                                          setActiveMenuId(null);
                                                        }}
                                                        className="w-full px-3 py-1.5 text-left text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                                      >
                                                        <Trash2 className="w-3 h-3" /> Delete
                                                      </button>
                                                    )}
                                                    {user && user.uid !== reply.userId && (
                                                      <button
                                                        onClick={() => {
                                                          handlePersonalBlock(reply.userId);
                                                          setActiveMenuId(null);
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
                                        </motion.div>
                                      ))}
                                  </AnimatePresence>
                                )}
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      )}

                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Comment Input */}
              <div className="p-4 sm:p-6 border-t border-pink-100 dark:border-white/10 bg-white dark:bg-[#121214]/90 backdrop-blur-xl shrink-0">
                {user ? (
                  <div className="max-w-2xl mx-auto space-y-3">
                    {replyTo && (
                      <div className="flex items-center justify-between bg-pink-50/50 dark:bg-pink-500/5 px-3 py-2 rounded-lg border border-pink-100 dark:border-pink-500/10">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          Replying to <span className="font-bold text-pink-500">@{replyTo.author}</span>
                        </span>
                        <button
                          onClick={() => setReplyTo(null)}
                          className="text-zinc-400 hover:text-pink-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <form
                      onSubmit={(e) => handlePostComment(selectedStory.id, e)}
                      className="flex gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 font-bold shrink-0 border border-pink-500/20">
                        {user.displayName?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={replyTo ? `Reply to @${replyTo.author}...` : "Add a comment..."}
                          className="flex-1 h-10 px-4 rounded-full border border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none text-sm text-zinc-900 dark:text-white transition-colors"
                          required
                          maxLength={200}
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim() || isPostingComment}
                          className="h-10 w-10 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-colors shadow-lg shadow-pink-500/20"
                        >
                          {isPostingComment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-2 bg-white/60 dark:bg-white/5 rounded-xl border border-pink-100 dark:border-white/10 max-w-2xl mx-auto">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Please login to join the conversation.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Edit Story Modal */}
      <AnimatePresence>
        {editingStory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <Card className="w-full max-w-2xl bg-white dark:bg-[#121214] relative shadow-2xl p-6 border-pink-100 dark:border-white/10">
              <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Edit Story</h2>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[10rem] p-4 rounded-xl border-2 border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none resize-none transition-all text-zinc-900 dark:text-white"
                placeholder="Edit your story..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setEditingStory(null)}>Cancel</Button>
                <Button 
                  variant="custom" 
                  className="bg-pink-500 hover:bg-pink-600 text-white border-none"
                  onClick={() => handleEditPost(editingStory.id, editContent)}
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Comment Modal */}
      <AnimatePresence>
        {editingComment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-white dark:bg-[#121214] relative shadow-2xl p-6 border-pink-100 dark:border-white/10">
              <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Edit Comment</h2>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[6rem] p-4 rounded-xl border-2 border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none resize-none transition-all text-zinc-900 dark:text-white"
                placeholder="Edit your comment..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setEditingComment(null)}>Cancel</Button>
                <Button 
                  variant="custom" 
                  className="bg-pink-500 hover:bg-pink-600 text-white border-none"
                  onClick={() => {
                    const storyId = selectedStory?.id || expandedStory;
                    if (storyId) handleEditComment(storyId, editingComment.id, editContent);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Spark Modal */}
      <AnimatePresence>
        {sparkModalStory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <Card className="w-full max-w-md bg-white dark:bg-[#121214] relative shadow-2xl p-6 border-yellow-500/20">
              <button
                onClick={() => setSparkModalStory(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Spark a Connection</h2>
                <p className="text-sm text-zinc-500 mt-2">
                  Send a private message request to <span className="font-bold">{sparkModalStory.author}</span>.
                </p>
              </div>

              <form onSubmit={submitSpark} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Your Message
                  </label>
                  <textarea
                    value={sparkMessage}
                    onChange={(e) => setSparkMessage(e.target.value)}
                    placeholder="Hi, I really resonated with your story..."
                    className="w-full min-h-[6rem] p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 focus:border-yellow-500 outline-none resize-none text-sm text-zinc-900 dark:text-white"
                    required
                    maxLength={300}
                  />
                  <p className="text-xs text-zinc-500 text-right mt-1">
                    {sparkMessage.length}/300
                  </p>
                </div>
                
                <Button 
                  type="submit"
                  disabled={!sparkMessage.trim() || isSendingSpark}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white border-none h-12"
                >
                  {isSendingSpark ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Send Spark <Zap className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
