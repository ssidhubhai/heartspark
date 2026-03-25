import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PremiumStoryFeedItem } from '../components/PremiumStoryFeedItem';
import { 
  User, 
  AlertCircle, 
  Edit2, 
  Image as ImageIcon, 
  Loader2, 
  X, 
  RefreshCw, 
  Grid, 
  Bookmark, 
  Heart, 
  Share2, 
  Link as LinkIcon,
  Check
} from 'lucide-react';

export function Profile() {
  const { user, isConfigured } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('POSTS');
  const [stats, setStats] = useState({ stories: 0, sparks: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [userBio, setUserBio] = useState('');
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState('');

  useEffect(() => {
    if (user) {
      setCurrentDisplayName(user.displayName || '');
      setCurrentPhotoURL(user.photoURL || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !db) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserBio(data.bio || '');
          setEditBio(data.bio || '');
        }
        setEditDisplayName(user.displayName || '');
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !db) return;
      try {
        const q = query(collection(db, 'community_stories'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const storiesCount = querySnapshot.size;
        let totalSparks = 0;
        querySnapshot.forEach((doc) => {
          totalSparks += (doc.data().likes || 0);
        });
        setStats({ stories: storiesCount, sparks: totalSparks });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  useEffect(() => {
    const fetchTabStories = async () => {
      if (!user || !db) return;
      setLoadingStories(true);
      try {
        let q;
        if (activeTab === 'POSTS') {
          q = query(
            collection(db, 'community_stories'), 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        } else if (activeTab === 'LIKED') {
          q = query(
            collection(db, 'community_stories'), 
            where('likedBy', 'array-contains', user.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          // SAVED - assuming saved stories are in a separate collection or field
          setStories([]);
          setLoadingStories(false);
          return;
        }

        if (!q) return;

        const querySnapshot = await getDocs(q);
        const fetchedStories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));
        setStories(fetchedStories);
      } catch (error) {
        console.error("Error fetching tab stories:", error);
      } finally {
        setLoadingStories(false);
      }
    };

    fetchTabStories();
  }, [user, activeTab]);

  const handleUpdateProfile = async () => {
    if (!auth?.currentUser || !db) return;
    setUpdatingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editDisplayName });
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: editDisplayName,
        bio: editBio,
        updatedAt: new Date()
      }, { merge: true });
      
      setUserBio(editBio);
      setCurrentDisplayName(editDisplayName);
      setShowEditModal(false);
      // Removed window.location.reload() to prevent session loss in iframes.
      // The updated displayName will be reflected on the next natural reload or auth state change.
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!auth?.currentUser || !avatarUrl.trim()) return;
    setUpdatingAvatar(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: avatarUrl.trim() });
      setCurrentPhotoURL(avatarUrl.trim());
      setShowAvatarModal(false);
      // Removed window.location.reload() to prevent session loss in iframes.
    } catch (error) {
      console.error("Error updating avatar:", error);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user?.displayName}'s Profile`,
          text: `Check out ${user?.displayName}'s profile on HeartSpark!`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Profile link copied to clipboard!');
    }
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
    <div className="max-w-2xl mx-auto w-full bg-white dark:bg-[#0A0A0A] min-h-screen border-x border-zinc-100 dark:border-zinc-900 shadow-sm pb-20">
      {/* Cover Banner */}
      <div className="h-32 md:h-48 w-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 relative" />

      {/* Profile Header Section */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-end -mt-12 md:-mt-16 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-[#0A0A0A] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-md">
              {currentPhotoURL ? (
                <img 
                  src={currentPhotoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-pink-50 dark:bg-pink-900/20">
                  <User className="w-10 h-10 md:w-14 md:h-14 text-pink-500" />
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setAvatarUrl(currentPhotoURL || '');
                setShowAvatarModal(true);
              }}
              className="absolute bottom-1 right-1 bg-white dark:bg-zinc-800 p-1.5 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 hover:scale-110 transition-transform"
            >
              <Edit2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex gap-8 mb-2 pr-4">
            <div className="text-center">
              <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white leading-none">
                {loadingStats ? '...' : stats.stories}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Stories</div>
            </div>
            <div className="text-center">
              <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white leading-none">
                {loadingStats ? '...' : stats.sparks >= 1000 ? `${(stats.sparks / 1000).toFixed(1)}K` : stats.sparks}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Sparks</div>
            </div>
          </div>
        </div>

        {/* Identity & Bio */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {currentDisplayName || 'Anonymous User'}
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            @{user.email?.split('@')[0] || 'user'} • {user.email}
          </p>
          <div className="pt-2 max-w-md">
            <p className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-snug">
              {userBio || 'No bio yet. Click Edit Profile to add one! ✨'}
            </p>
            <a 
              href="#" 
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm mt-2 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              linktr.ee/{currentDisplayName?.toLowerCase().replace(/\s/g, '') || 'heartspark'}
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button 
            variant="custom"
            className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl border-0 h-10 transition-colors"
            onClick={() => setShowEditModal(true)}
          >
            Edit Profile
          </Button>
          <Button 
            variant="custom"
            className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl border-0 h-10 transition-colors flex items-center justify-center gap-2"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Sticky Content Tabs */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 mt-4">
        <div className="flex">
          {[
            { id: 'POSTS', icon: Grid },
            { id: 'SAVED', icon: Bookmark },
            { id: 'LIKED', icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 transition-all relative ${
                activeTab === tab.id 
                  ? 'text-pink-500' 
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-bold mt-1 tracking-widest">{tab.id}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-full mx-8" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Area */}
      <div className="min-h-[400px]">
        {loadingStories ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            <p className="text-sm text-zinc-500 mt-4 font-bold uppercase tracking-widest">Loading Feed...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4">
              <Grid className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-400">
              No {activeTab.toLowerCase()} yet
            </h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs">
              {activeTab === 'POSTS' 
                ? "Your shared stories and memories will appear here for everyone to see."
                : activeTab === 'LIKED'
                ? "Stories you've liked will appear here for you to revisit."
                : "Stories you've saved will appear here for you to revisit."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {stories.map((story) => (
              <PremiumStoryFeedItem 
                key={story.id} 
                story={story} 
                onLike={(id) => console.log('Like', id)}
                onComment={(id) => console.log('Comment', id)}
                onShare={(id) => console.log('Share', id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md relative shadow-2xl border-0 rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">Edit Profile</h2>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-12 px-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="w-full p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={updatingProfile || !editDisplayName.trim()} 
                  variant="custom"
                  className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl border-0 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
                >
                  {updatingProfile ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Save Profile
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Avatar Modal (Keep existing logic) */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md relative shadow-2xl border-0 rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">Update Avatar</h2>
                <button 
                  onClick={() => setShowAvatarModal(false)} 
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-pink-50 dark:border-pink-900/20 shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-zinc-300" />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    onClick={generateRandomAvatar} 
                    variant="custom" 
                    className="w-full h-11 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl border-0 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" /> Generate Random
                  </Button>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
                    <span className="flex-shrink mx-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Or</span>
                    <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
                  </div>

                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Paste image URL here..."
                    className="w-full h-12 px-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm"
                  />
                </div>

                <Button 
                  onClick={handleUpdateAvatar} 
                  disabled={updatingAvatar || !avatarUrl} 
                  variant="custom"
                  className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl border-0 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
                >
                  {updatingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
