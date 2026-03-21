import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { User, AlertCircle, Edit2, Image as ImageIcon, Loader2, X, RefreshCw } from 'lucide-react';

export function Profile() {
  const { user, isConfigured } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

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
                variant="custom"
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
