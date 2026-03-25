import React from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface Story {
  id: string;
  content: string;
  author: string;
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
}

export function PremiumStoryFeedItem({ story, onLike, onComment, onShare }: PremiumStoryFeedItemProps) {
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
          {story.author.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[15px] text-zinc-900 dark:text-white truncate">
                {story.author}
              </span>
              <span className="text-zinc-400 text-sm">·</span>
              <span className="text-zinc-400 text-sm shrink-0">
                {formatTime(story.createdAt)}
              </span>
            </div>
            <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <p className="text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {story.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onLike?.(story.id)}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-pink-500 transition-colors group/btn"
            >
              <div className="p-2 -m-2 rounded-full group-hover/btn:bg-pink-500/10 transition-colors">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">{story.likes || 0}</span>
            </button>

            <button 
              onClick={() => onComment?.(story.id)}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-blue-500 transition-colors group/btn"
            >
              <div className="p-2 -m-2 rounded-full group-hover/btn:bg-blue-500/10 transition-colors">
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
        </div>
      </div>
    </motion.div>
  );
}
