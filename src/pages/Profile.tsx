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
        <AlertCircle className="w-16 h-16 text-indigo-500 mx-auto" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Firebase Required</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Profile requires a database. Please add your Firebase configuration to the .env file!
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <User className="w-16 h-16 text-indigo-500 mx-auto" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Profile</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Please login to view your profile and manage your stories.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 relative">
      <div className="text-center space-y-4">
        <div className="relative w-24 h-24 mx-auto">
          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-12 h-12 text-indigo-500" />
            )}
          </div>
          <button 
            onClick={() => {
              setAvatarUrl(user.photoURL || '');
              setShowAvatarModal(true);
            }}
            className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
            title="Edit Avatar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
          {user.displayName || 'Anonymous User'}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          {user.email}
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <MessageCircle className="w-6 h-6 text-indigo-500" /> Your Stories
        </h2>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading your stories...</div>
        ) : userStories.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <p>You haven't posted any stories yet.</p>
            <Link to="/stories">
              <Button className="mt-4 bg-indigo-500 hover:bg-indigo-600">Go to Community</Button>
            </Link>
          </div>
        ) : (
          userStories.map((story) => (
            <Card key={story.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pr-8">{story.title}</h3>
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
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Posted {story.createdAt ? new Date(story.createdAt.toMillis()).toLocaleDateString() : 'Just now'}
              </p>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed mb-4">
                {story.content}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAvatarModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              Update Avatar <ImageIcon className="w-6 h-6 text-indigo-500" />
            </h2>
            
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-indigo-100 dark:border-indigo-900/30">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={generateRandomAvatar} 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Generate Random Avatar
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">Or paste image URL</span>
                  </div>
                </div>

                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/my-avatar.png"
                  className="w-full h-12 px-4 rounded-xl border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <Button 
                onClick={handleUpdateAvatar} 
                disabled={updatingAvatar || !avatarUrl} 
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
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
