import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { User, Trash2, MessageCircle, AlertCircle, Edit2, Image as ImageIcon, Loader2, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Story {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  reactions: {
    aww: number;
    redFlag: number;
    drama: number;
    heartbreak: number;
    slay: number;
  };
  commentCount: number;
}

export function Profile() {
  const { user, isConfigured } = useAuth();
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  useEffect(() => {
    if (!db || !user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'community_stories'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];

      // Sort client-side to avoid needing a composite index in Firestore
      storyData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setUserStories(storyData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeletePost = async (storyId: string) => {
    if (!db) return;
    
    if (deletingPostId !== storyId) {
      setDeletingPostId(storyId);
      setTimeout(() => setDeletingPostId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'community_stories', storyId));
      setDeletingPostId(null);
    } catch (error: any) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. You might not have permission, or there was a network error.");
      setDeletingPostId(null);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!auth?.currentUser || !avatarUrl.trim()) return;
    setUpdatingAvatar(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: avatarUrl.trim() });
      setShowAvatarModal(false);
      window.location.reload(); // Refresh to show new avatar
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Failed to update avatar");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`);
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-16 h-16 text-pink-500 mx-auto" />
        <h2 className="text-3xl font-bold text-zinc-800 dark:text-white">Firebase Required</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Profile requires a database. Please add your Firebase configuration to the .env file!
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <User className="w-16 h-16 text-pink-500 mx-auto" />
        <h2 className="text-3xl font-bold text-zinc-800 dark:text-white">Profile</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Please login to view your profile and manage your stories.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 relative">
      <div className="text-center space-y-4">
        <div className="relative w-24 h-24 mx-auto">
          <div className="w-24 h-24 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-800 shadow-lg">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-12 h-12 text-pink-500" />
            )}
          </div>
          <button 
            onClick={() => {
              setAvatarUrl(user.photoURL || '');
              setShowAvatarModal(true);
            }}
            className="absolute bottom-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
            title="Edit Avatar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white">
          {user.displayName || 'Anonymous User'}
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {user.email}
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-pink-100 dark:border-zinc-800 pb-2">
          <MessageCircle className="w-6 h-6 text-pink-500" /> Your Stories
        </h2>

        {loading ? (
          <div className="text-center py-10 text-zinc-500">Loading your stories...</div>
        ) : userStories.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-pink-200 dark:border-zinc-800 backdrop-blur-sm">
            <p>You haven't posted any stories yet.</p>
            <Link to="/stories">
              <Button className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0">Go to Community</Button>
            </Link>
          </div>
        ) : (
          userStories.map((story) => (
            <Card key={story.id} className="hover:shadow-xl transition-all duration-300 border-pink-100/50 dark:border-pink-900/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white pr-8">{story.title}</h3>
                <button 
                  onClick={() => handleDeletePost(story.id)} 
                  className={`p-2 rounded-full transition-colors flex items-center gap-1 text-sm ${
                    deletingPostId === story.id 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                  }`}
                  title="Delete your post"
                >
                  <Trash2 className="w-5 h-5" />
                  {deletingPostId === story.id && <span className="font-bold pr-1">Confirm?</span>}
                </button>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                Posted {story.createdAt ? new Date(story.createdAt.toMillis()).toLocaleDateString() : 'Just now'}
              </p>
              <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed mb-4">
                {story.content}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 pt-4 border-t border-pink-50 dark:border-zinc-800">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" /> {story.commentCount || 0} comments
                </span>
                <span className="flex items-center gap-1">
                  🥺 {story.reactions?.aww || 0}
                </span>
                <span className="flex items-center gap-1">
                  🚩 {story.reactions?.redFlag || 0}
                </span>
                <span className="flex items-center gap-1">
                  🍿 {story.reactions?.drama || 0}
                </span>
                <span className="flex items-center gap-1">
                  💔 {story.reactions?.heartbreak || 0}
                </span>
                <span className="flex items-center gap-1">
                  👑 {story.reactions?.slay || 0}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl relative shadow-2xl border-pink-100 dark:border-pink-900/30 animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAvatarModal(false)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
              Update Avatar <ImageIcon className="w-6 h-6 text-pink-500" />
            </h2>
            
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-pink-50 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-pink-100 dark:border-pink-900/30">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-pink-300 dark:text-zinc-600" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={generateRandomAvatar} 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 border-pink-200 dark:border-zinc-700 hover:bg-pink-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <RefreshCw className="w-4 h-4" /> Generate Random Avatar
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-pink-100 dark:border-zinc-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">Or paste image URL</span>
                  </div>
                </div>

                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/my-avatar.png"
                  className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 focus:border-pink-500 dark:focus:border-pink-500 outline-none transition-all text-zinc-900 dark:text-white placeholder-zinc-400"
                />
              </div>

              <Button 
                onClick={handleUpdateAvatar} 
                disabled={updatingAvatar || !avatarUrl} 
                className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0"
              >
                {updatingAvatar ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  'Save Avatar'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
