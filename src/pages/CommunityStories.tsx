import React, { useState, useEffect, useMemo } from "react";
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
  Database,
} from "lucide-react";
import { generateContentWithFallback } from "../utils/ai";
import { motion, AnimatePresence } from "motion/react";
import seedStories from "../data/seedStories.json";

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
  comments?: any[]; // For local seeds
}

const localStories: Story[] = seedStories.map((s, index) => ({
  id: `seed_${index}`,
  content: s.content,
  author: s.author || "Anonymous",
  category: s.category || "General",
  likes: s.likes || 0,
  likedBy: [],
  reactions: { aww: s.likes || 0, redFlag: 0, drama: 0, heartbreak: 0, slay: 0 },
  commentCount: s.comments ? s.comments.length : 0,
  reportCount: 0,
  reactedUsers: [],
  createdAt: Timestamp.fromMillis(Date.now() - (index + 1) * 3600000), // 1 hour apart
  userId: `seed_user_${index}`,
  comments: s.comments, // Keep local comments
}));

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
  const [newStory, setNewStory] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [postCategory, setPostCategory] = useState("Crush");
  const [showPollInput, setShowPollInput] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const { user, isConfigured } = useAuth();

  // Admin Check
  const isAdmin = user?.email === "shubh656577@gmail.com";

  // Comment state per story
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
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
  const [activeSort, setActiveSort] = useState("Trending");
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

  // Real-time comments listener
  useEffect(() => {
    const storyId = selectedStory?.id || expandedStory;
    if (!storyId) return;

    if (storyId.startsWith("seed_")) {
      const seedIndex = parseInt(storyId.replace("seed_", ""));
      const seedStory = seedStories[seedIndex];
      if (seedStory && seedStory.comments) {
        setComments(
          seedStory.comments.map((c, i) => ({
            id: `seed_comment_${i}`,
            text: c.text,
            author: c.user || "Anonymous",
            createdAt: Timestamp.fromMillis(Date.now() - i * 60000),
            userId: `seed_user_${i}`,
          }))
        );
      } else {
        setComments([]);
      }
      return;
    }

    if (!db) return;

    setLoadingComments(true);
    const q = query(
      collection(db, `community_stories/${storyId}/comments`),
      orderBy("createdAt", "asc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedComments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[];
        setComments(fetchedComments);
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
      if (!showReportedOnly && activeSort !== "👤 My Posts") {
        let fallbackData = [...localStories];
        if (activeSort === "🏆 Top (All Time)") {
          fallbackData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        }
        setStories(fallbackData);
      }
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
        limit(50),
      );
    } else {
      if (activeSort === "🏆 Top (All Time)") {
        q = query(
          collection(db, "community_stories"),
          orderBy("likes", "desc"),
          limit(100),
        );
      } else if (activeSort === "👤 My Posts" && user?.uid) {
        q = query(
          collection(db, "community_stories"),
          where("userId", "==", user.uid),
          limit(100),
        );
      } else {
        // For Newest and Trending, fetch newest
        q = query(
          collection(db, "community_stories"),
          orderBy("createdAt", "desc"),
          limit(100),
        );
      }
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let storyData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Story[];
        
        // Merge local stories if not filtering by My Posts or Reported
        if (!showReportedOnly && activeSort !== "👤 My Posts") {
          storyData = [...storyData, ...localStories];
          
          // Re-sort the combined array
          if (activeSort === "🏆 Top (All Time)") {
            storyData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          } else {
            storyData.sort((a, b) => {
              const timeA = a.createdAt?.toMillis() || 0;
              const timeB = b.createdAt?.toMillis() || 0;
              return timeB - timeA;
            });
          }
        } else if (activeSort === "👤 My Posts") {
          // Client-side sort for My Posts to avoid requiring a composite index
          storyData = storyData.sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
          });
        }
        
        setStories(storyData);
        setLoadingStories(false);
      },
      (error) => {
        console.error("Error fetching stories:", error);
        
        // IF FIREBASE FAILS ENTIRELY, STILL SHOW LOCAL STORIES!
        if (!showReportedOnly && activeSort !== "👤 My Posts") {
           let fallbackData = [...localStories];
           if (activeSort === "🏆 Top (All Time)") {
             fallbackData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
           }
           setStories(fallbackData);
        }
        
        setLoadingStories(false);
        showToast("Failed to connect to the database. Showing community archive.", "error");
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
    if (!db) return;
    if (!user) {
      showToast("Please login to seed the database.", "error");
      return;
    }
    if (!window.confirm("Are you sure you want to seed the database? This will add 100+ stories.")) return;
    
    setLoading(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      
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

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
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

            if (count % 400 === 0) {
              await batch.commit();
              batch = writeBatch(db);
            }
          }
        }
      }
      
      // Commit any remaining
      if (count % 400 !== 0) {
        await batch.commit();
      }
      
      showToast(`Successfully seeded stories!`, "success");
    } catch (error) {
      console.error("Error seeding database:", error);
      showToast("Failed to seed database. Check console for details.", "error");
    } finally {
      setLoading(false);
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
      setPostCategory("Crush");
      setShowPollInput(false);
      setPollOptions(["", ""]);
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

  const handleReaction = async (story: Story, emoji: string) => {
    if (!user) {
      showToast("Please login to react to stories!", "info");
      return;
    }
    if (story.id.startsWith("seed_")) {
      // Optimistic update for seed stories
      const updatedStories = stories.map((s) => {
        if (s.id === story.id) {
          const newReactions = { ...s.reactions };
          newReactions[emoji as keyof typeof newReactions] = (newReactions[emoji as keyof typeof newReactions] || 0) + 1;
          const updatedStory = { ...s, reactions: newReactions };
          if (selectedStory?.id === story.id) {
            setSelectedStory(updatedStory);
          }
          return updatedStory;
        }
        return s;
      });
      setStories(updatedStories);
      showToast("✨ Reaction added to archived community story!", "success");
      return;
    }
    if (!db) return;

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

          return {
            ...s,
            reactions: newReactions,
            reactedUsers: newReactedUsers,
          };
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
    }
  };

  const handleReport = async (storyId: string) => {
    if (!user) {
      showToast("Please login to report stories.", "error");
      return;
    }
    if (storyId.startsWith("seed_")) {
      showToast("This story has already been moderated and archived.", "info");
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
    if (storyId.startsWith("seed_")) {
      showToast("Cannot modify archived community stories.", "error");
      return;
    }
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

    if (hasLinks(newComment)) {
      showToast("⚠️ Links are not allowed in comments.", "error");
      return;
    }

    const commentText = newComment.trim();
    setNewComment("");

    try {
      await addDoc(collection(db, `community_stories/${storyId}/comments`), {
        text: commentText,
        author: user.displayName || "Anonymous",
        createdAt: serverTimestamp(),
        userId: user.uid,
      });

      const storyRef = doc(db, "community_stories", storyId);
      await updateDoc(storyRef, {
        commentCount: increment(1),
      });

      // Find the story to get the author's userId
      const story = stories.find((s) => s.id === storyId);
      if (story && story.userId && story.userId !== user.uid) {
        // Create notification for the story author
        await addDoc(collection(db, "notifications"), {
          userId: story.userId,
          type: "comment",
          storyId: storyId,
          message: `${user.displayName || "Someone"} commented on your story: "${story.content.substring(0, 30)}..."`,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      showToast("Failed to post comment.", "error");
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
    if (activeSort === "Trending") {
      return [...stories].sort((a, b) => {
        const scoreA = (a.likes || 0) + (a.commentCount || 0);
        const scoreB = (b.likes || 0) + (b.commentCount || 0);
        return scoreB - scoreA;
      });
    }
    return stories;
  }, [stories, activeSort]);

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
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white text-adaptive-readable flex items-center gap-2">
            Community <MessageCircle className="w-6 h-6 text-pink-500" />
          </h1>
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <button
                onClick={handleSeedDatabase}
                className="p-2 rounded-full transition-colors bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30"
                title="Seed Database (Dev Only)"
              >
                <Database className="w-5 h-5" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowReportedOnly(!showReportedOnly)}
                className={`p-2 rounded-full transition-colors ${showReportedOnly ? "bg-red-500/20 text-red-500" : "bg-white/60 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-white"}`}
              >
                <Flag className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["Trending", "✨ Newest", "🏆 Top (All Time)", ...(user ? ["👤 My Posts"] : [])].map((sortOption) => (
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
          className="fixed bottom-8 right-8 md:bottom-12 md:right-12 w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-40 border-none"
          aria-label="Post a Story"
        >
          <Plus className="w-8 h-8" />
        </button>
      ) : (
        <div className="fixed bottom-0 left-0 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white p-4 text-center z-40 shadow-lg flex items-center justify-center gap-4">
          <p className="font-medium">
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
              {/* Category Selection */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {["Crush", "Confession", "Advice"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPostCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      postCategory === cat
                        ? "bg-pink-500 text-white"
                        : "bg-white/60 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

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

      {/* Stories Feed */}
      <div className="space-y-6 max-w-2xl mx-auto">
        <AnimatePresence mode="popLayout">
          {loadingStories ? (
            // Skeleton Loaders
            [1, 2, 3].map((i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="animate-pulse space-y-4 border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-5 sm:p-6 rounded-[24px]">
                  <div className="h-6 bg-white/80 dark:bg-white/10 rounded w-3/4"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/80 dark:bg-white/10"></div>
                    <div className="h-4 bg-white/80 dark:bg-white/10 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="h-4 bg-white/80 dark:bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/80 dark:bg-white/10 rounded w-5/6"></div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : stories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
                  Be the first to share something ❤️
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Your story could be exactly what someone needs to hear today.
                </p>
              </div>
            </motion.div>
          ) : (
            sortedStories.map((story) => (
                <motion.div
                  key={story.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    id={`story-${story.id}`}
                    className="rounded-[24px] bg-white/60 dark:bg-white/5 backdrop-blur-md border border-pink-100 dark:border-white/10 p-5 sm:p-6 hover:bg-white/80 dark:bg-white/10 transition-all duration-300 shadow-xl hover:shadow-pink-500/5 cursor-pointer relative overflow-hidden group"
                    onClick={() => setSelectedStory(story)}
                  >
                    {/* Admin Warning Banner */}
                    {isAdmin && (story.reportCount || 0) > 0 && (
                      <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold px-4 py-1 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        REPORTED POST ({story.reportCount} reports)
                      </div>
                    )}

                    <div
                      className={`space-y-3 ${isAdmin && (story.reportCount || 0) > 0 ? "mt-4" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 font-bold text-lg border border-pink-500/20">
                            {story.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {story.author}
                              </span>
                              {story.category && (
                                <span className="px-2 py-0.5 bg-white/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-[10px] rounded-full font-medium uppercase tracking-wider">
                                  {story.category}
                                </span>
                              )}
                              {user && user.uid === story.userId && (
                                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] rounded-full font-bold uppercase tracking-wider">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {story.createdAt
                                ? new Date(
                                    story.createdAt.toMillis(),
                                  ).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Just now"}
                            </div>
                          </div>
                        </div>

                        {/* Delete Post Button */}
                        {user && (user.uid === story.userId || isAdmin) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(story.id);
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                              deletingPostId === story.id
                                ? "bg-red-500 text-white shadow-md"
                                : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                            title={isAdmin ? "Delete post (Admin)" : "Delete your post"}
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingPostId === story.id && (
                              <span>Confirm?</span>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="pt-2">
                        <p className={`text-zinc-600 dark:text-zinc-300 leading-relaxed text-base transition-all duration-300 ${inlineExpandedStories.has(story.id) ? '' : 'line-clamp-3'}`}>
                          {story.content}
                        </p>
                        {story.content.length > 100 && (
                          <button
                            onClick={(e) => toggleInlineExpand(story.id, e)}
                            className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 text-sm font-semibold mt-2 hover:opacity-80 transition-opacity"
                          >
                            {inlineExpandedStories.has(story.id) ? 'Show less' : 'Read more...'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interaction Bar */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-pink-50 dark:border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(story, "aww");
                        }}
                        className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-pink-400 transition-colors"
                      >
                        <span className="text-xl">❤️</span>
                        <span className="text-sm font-medium">
                          {story.reactions?.aww || 0}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStory(story);
                        }}
                        className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-blue-400 transition-colors"
                      >
                        <span className="text-xl">💬</span>
                        <span className="text-sm font-medium">
                          {story.commentCount || 0}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStory(story);
                        }}
                        className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-purple-400 transition-colors"
                      >
                        <span className="text-xl">📊</span>
                        <span className="text-sm font-medium">
                          {story.poll
                            ? story.poll.options.reduce(
                                (acc, curr) => acc + curr.votes,
                                0,
                              )
                            : 0}
                        </span>
                      </button>
                      <button
                        onClick={(e) => handleShare(story, e)}
                        className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-green-500 transition-colors"
                        title="Share this story"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
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

                <p className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed mb-8 text-lg">
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
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-pink-500" /> Comments
                    ({selectedStory.commentCount || 0})
                  </h3>

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
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-xs shrink-0">
                              {comment.author.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-zinc-900 dark:text-white text-sm">
                                  {comment.author}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {comment.createdAt
                                    ? new Date(
                                        comment.createdAt.toMillis(),
                                      ).toLocaleDateString()
                                    : "Just now"}
                                </span>
                              </div>
                              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Comment Input */}
              <div className="p-4 sm:p-6 border-t border-pink-100 dark:border-white/10 bg-white dark:bg-[#121214]/90 backdrop-blur-xl shrink-0">
                {user ? (
                  <form
                    onSubmit={(e) => handlePostComment(selectedStory.id, e)}
                    className="flex gap-3 max-w-2xl mx-auto"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 font-bold shrink-0 border border-pink-500/20">
                      {user.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 h-10 px-4 rounded-full border border-pink-100 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-pink-500 outline-none text-sm text-zinc-900 dark:text-white transition-colors"
                        required
                        maxLength={200}
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="h-10 w-10 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
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
    </div>
  );
}
