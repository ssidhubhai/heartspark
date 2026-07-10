import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, arrayRemove, limit, addDoc, serverTimestamp, writeBatch, getAggregateFromServer, count, sum } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { generateContentWithFallback } from '../utils/ai';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
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
  Check,
  Camera,
  Calendar,
  MapPin,
  Sparkles,
  Zap,
  Shield,
  Search,
  MessageCircle
} from 'lucide-react';

export function Profile() {
  const { user, isConfigured, showToast, requestAccountDeletion, cancelAccountDeletion, userData, loading: authLoading, login } = useAuth();
  const { uid } = useParams();
  const navigate = useNavigate();

  if (!uid && !user && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-64px)] p-4 text-center space-y-6">
        <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-pink-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Your Profile</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Sign in to view your profile, manage your sparks, and customize your experience.
          </p>
        </div>
        <Button 
          variant="custom"
          onClick={login}
          className="px-8 h-14 bg-pink-500 text-white font-black uppercase tracking-widest rounded-2xl"
        >
          Sign In to View Profile
        </Button>
      </div>
    );
  }

  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('SPARKS');

  const avatarPresets = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Willow',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          // Check size just in case, but 256x256 jpeg should be tiny
          if (compressedBase64.length > 1048576) {
             showToast("Image is still too large after compression.", "error");
             return;
          }
          
          setAvatarUrl(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
  const [stats, setStats] = useState({ sparks: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSparks, setLoadingSparks] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLoveStatus, setEditLoveStatus] = useState('Single');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [userBio, setUserBio] = useState('');
  const [userLoveStatus, setUserLoveStatus] = useState('Single');
  const [userUsername, setUserUsername] = useState('');
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [sparkStatus, setSparkStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [isSendingSpark, setIsSendingSpark] = useState(false);
  const [isDeletingFriend, setIsDeletingFriend] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  useEffect(() => {
    if (!user || !db || !targetUid || targetUid === user.uid) return;

    const q = query(
      collection(db, "sparks"),
      where("senderId", "in", [user.uid, targetUid]),
      where("receiverId", "in", [user.uid, targetUid])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setSparkStatus('none');
      } else {
        const sparks = snapshot.docs.map(doc => doc.data());
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
    });

    return () => unsubscribe();
  }, [user?.uid, targetUid, db]);

  const handleSendSpark = async () => {
    if (!user || !db || !targetUid) return;
    setIsSendingSpark(true);
    try {
      await addDoc(collection(db, "sparks"), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        receiverId: targetUid,
        status: 'pending',
        createdAt: serverTimestamp(),
        message: `Hi! I'd love to connect with you.`,
        type: 'profile_spark'
      });
      showToast("Spark request sent!", "success");
    } catch (error) {
      console.error("Error sending spark:", error);
      showToast("Failed to send spark.", "error");
    } finally {
      setIsSendingSpark(false);
    }
  };

  useEffect(() => {
    if (uid) {
      setTargetUid(uid);
    } else if (user) {
      setTargetUid(user.uid);
    }
  }, [uid, user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!targetUid || !db) return;
      
      // If it's my profile, use the reactive userData from AuthContext
      if (targetUid === user?.uid && userData) {
        setProfileData(userData);
        setUserBio(userData.bio || '');
        setEditBio(userData.bio || '');
        setUserLoveStatus(userData.loveStatus || 'Single');
        setEditLoveStatus(userData.loveStatus || 'Single');
        setUserUsername(userData.username || '');
        setEditUsername(userData.username || '');
        setCurrentDisplayName(userData.displayName || '');
        setCurrentPhotoURL(userData.photoURL || '');
        
        if (userData.blockedUsers && userData.blockedUsers.length > 0) {
          setLoadingBlocked(true);
          const blockedDetails = await Promise.all(
            userData.blockedUsers.map(async (uid: string) => {
              const d = await getDoc(doc(db, 'users', uid));
              return { uid, ...(d.data() || { displayName: 'Unknown User' }) };
            })
          );
          setBlockedUsers(blockedDetails);
          setLoadingBlocked(false);
        } else {
          setBlockedUsers([]);
        }
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData(data);
          setUserBio(data.bio || '');
          setEditBio(data.bio || '');
          setUserLoveStatus(data.loveStatus || 'Single');
          setEditLoveStatus(data.loveStatus || 'Single');
          setUserUsername(data.username || '');
          setEditUsername(data.username || '');
          setCurrentDisplayName(data.displayName || '');
          setCurrentPhotoURL(data.photoURL || '');
          setBlockedUsers([]);
        }
        setEditDisplayName(profileData?.displayName || user?.displayName || '');
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserData();
  }, [targetUid, user, userData]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!targetUid || !db) return;
      try {
        const q = query(collection(db, 'sparks'), where('receiverId', '==', targetUid));
        try {
          const snapshot = await getAggregateFromServer(q, {
            totalSparks: sum('likes')
          });
          
          setStats({ 
            sparks: snapshot.data().totalSparks 
          });
        } catch (aggError: any) {
          if (aggError.message && aggError.message.includes('requires an index')) {
            console.log("Aggregate index missing, falling back to client-side summation.");
            const { getDocs } = await import('firebase/firestore');
            const docsSnap = await getDocs(q);
            let totalSparks = 0;
            docsSnap.forEach(doc => {
              totalSparks += (doc.data().likes || 0);
            });
            setStats({
              sparks: totalSparks
            });
          } else {
            throw aggError;
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [targetUid]);

  const [sparks, setSparks] = useState<any[]>([]);
  const [sparkType, setSparkType] = useState<'received' | 'sent'>('received');
  const [checkingCompatibility, setCheckingCompatibility] = useState<string | null>(null);
  const [pendingSparksCount, setPendingSparksCount] = useState(0);

  useEffect(() => {
    if (!targetUid || !db) return;

    setLoadingSparks(true);
    let unsubscribe: () => void;

    if (activeTab === 'SPARKS') {
      const q = query(
        collection(db, 'sparks'),
        where(sparkType === 'received' ? 'receiverId' : 'senderId', '==', targetUid),
        limit(50)
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedSparks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setSparks(fetchedSparks);
        setLoadingSparks(false);
      }, (error) => {
        console.error("Error fetching sparks:", error);
        setLoadingSparks(false);
      });
    }

    // Monitor pending sparks for badge (only for my profile)
    if (targetUid === user?.uid) {
      const pendingQ = query(
        collection(db, 'sparks'),
        where('receiverId', '==', targetUid)
      );
      const unsubscribePending = onSnapshot(pendingQ, (snapshot) => {
        const pendingCount = snapshot.docs.filter(doc => doc.data().status === 'pending').length;
        setPendingSparksCount(pendingCount);
      });

      return () => {
        if (unsubscribe) unsubscribe();
        unsubscribePending();
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [targetUid, db, activeTab, sparkType, user]);

  const handleSparkAction = async (sparkId: string, action: 'accepted' | 'declined') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'sparks', sparkId), {
        status: action
      });
      if (action === 'accepted') {
        showToast("Spark accepted! You can now chat.", "success");
      }
    } catch (error) {
      console.error("Error updating spark:", error);
    }
  };

  const checkCompatibility = async (spark: any) => {
    if (!db) return;
    setCheckingCompatibility(spark.id);
    try {
      const senderDoc = await getDoc(doc(db, 'users', spark.senderId));
      const senderBio = senderDoc.exists() ? senderDoc.data().bio : "No bio provided.";
      
      const prompt = `
        You are a relationship compatibility AI. 
        Analyze the compatibility between a sender and a receiver based on:
        Sender Bio: "${senderBio}"
        Spark Message: "${spark.message}"
        Story Context: "${spark.storyContent || 'N/A'}"
        
        Provide a "Compatibility Score" (0-100) and a 1-sentence reason why they might (or might not) connect.
        Format: "Score: [X]% | Reason: [Reason]"
      `;

      const response = await generateContentWithFallback({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const result = response.text?.trim();
      if (result) {
        await updateDoc(doc(db, 'sparks', spark.id), {
          compatibility: result
        });
      }
    } catch (error) {
      console.error("Error checking compatibility:", error);
      showToast("Failed to check compatibility.", "error");
    } finally {
      setCheckingCompatibility(null);
    }
  };

  const handleUnblock = async (blockedUid: string) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        blockedUsers: Array.isArray(blockedUsers) ? arrayRemove(blockedUid) : []
      });
      setBlockedUsers(prev => prev.filter(u => u.uid !== blockedUid));
      showToast('User unblocked');
    } catch (error) {
      console.error("Error unblocking user:", error);
      showToast('Failed to unblock user', 'error');
    }
  };

  const handleDeleteFriend = async () => {
    if (!user || !db || !targetUid) return;
    if (!window.confirm("Are you sure you want to remove this friend? This will also delete your chat history.")) return;
    
    setIsDeletingFriend(true);
    try {
      const q = query(
        collection(db, "sparks"),
        where("senderId", "in", [user.uid, targetUid]),
        where("receiverId", "in", [user.uid, targetUid])
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      for (const sparkDoc of snapshot.docs) {
        // Delete messages first
        const messagesRef = collection(db, `sparks/${sparkDoc.id}/messages`);
        const messagesSnap = await getDocs(messagesRef);
        messagesSnap.docs.forEach(m => batch.delete(m.ref));
        // Delete spark
        batch.delete(sparkDoc.ref);
      }
      
      await batch.commit();
      showToast("Friend removed successfully.", "success");
      setSparkStatus('none');
    } catch (error) {
      console.error("Error deleting friend:", error);
      showToast("Failed to remove friend.", "error");
    } finally {
      setIsDeletingFriend(false);
    }
  };

  const handleClearChat = async () => {
    if (!user || !db || !targetUid) return;
    if (!window.confirm("Clear all messages in this chat? You will stay friends.")) return;
    
    try {
      const q = query(
        collection(db, "sparks"),
        where("senderId", "in", [user.uid, targetUid]),
        where("receiverId", "in", [user.uid, targetUid])
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const sparkId = snapshot.docs[0].id;
      const messagesRef = collection(db, `sparks/${sparkId}/messages`);
      const messagesSnap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      messagesSnap.docs.forEach(m => batch.delete(m.ref));
      
      batch.update(doc(db, 'sparks', sparkId), {
        lastMessage: "",
        lastMessageAt: serverTimestamp()
      });

      await batch.commit();
      showToast("Chat history cleared.", "success");
    } catch (error) {
      console.error("Error clearing chat:", error);
      showToast("Failed to clear chat.", "error");
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth?.currentUser || !db) return;
    
    const newUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (newUsername.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }

    setUpdatingProfile(true);
    try {
      // Check if username changed and if it's unique
      if (newUsername !== userUsername) {
        const usernameDoc = await getDoc(doc(db, 'usernames', newUsername));
        if (usernameDoc.exists()) {
          showToast('Username already taken', 'error');
          setUpdatingProfile(false);
          return;
        }

        // Delete old username reservation if it exists
        if (userUsername) {
          await deleteDoc(doc(db, 'usernames', userUsername));
        }
        // Reserve new username
        await setDoc(doc(db, 'usernames', newUsername), { uid: auth.currentUser.uid });
      }

      await updateProfile(auth.currentUser, { displayName: editDisplayName });
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: editDisplayName,
        username: newUsername,
        bio: editBio,
        loveStatus: editLoveStatus,
        updatedAt: new Date()
      }, { merge: true });
      
      setUserBio(editBio);
      setUserLoveStatus(editLoveStatus);
      setUserUsername(newUsername);
      setCurrentDisplayName(editDisplayName);
      setShowEditModal(false);
      showToast('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast('Failed to update profile', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const compressImageBase64 = (base64Str: string, maxWidth = 300, maxHeight = 300, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleUpdateAvatar = async () => {
    if (!auth?.currentUser || !avatarUrl.trim()) return;
    setUpdatingAvatar(true);
    try {
      let finalAvatarUrl = avatarUrl.trim();

      // If it's a base64 string, upload it to Firebase Storage
      if (finalAvatarUrl.startsWith('data:image')) {
        try {
          const storageRef = ref(storage, `avatars/${auth.currentUser.uid}_${Date.now()}.jpg`);
          await uploadString(storageRef, finalAvatarUrl, 'data_url');
          finalAvatarUrl = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.warn("Firebase Storage upload failed, falling back to database compressed base64 storage:", storageError);
          finalAvatarUrl = await compressImageBase64(finalAvatarUrl, 200, 200, 0.5);
        }
      }

      // Now we can safely update Firebase Auth
      try {
        if (!finalAvatarUrl.startsWith('data:image')) {
          await updateProfile(auth.currentUser, { photoURL: finalAvatarUrl });
        } else {
          await updateProfile(auth.currentUser, { photoURL: 'base64_avatar_fallback' });
        }
      } catch (authError) {
        console.warn("Auth photoURL update failed:", authError);
      }
      
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL: finalAvatarUrl,
        updatedAt: new Date()
      }, { merge: true });
      
      setCurrentPhotoURL(finalAvatarUrl);
      setShowAvatarModal(false);
      showToast('Avatar updated successfully!');
    } catch (error) {
      console.error("Error updating avatar:", error);
      showToast('Failed to update avatar', 'error');
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
      showToast('Profile link copied to clipboard!');
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

  if (loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto w-full bg-white dark:bg-[#0A0A0A] min-h-screen border-x border-zinc-100 dark:border-zinc-900 shadow-sm pb-24 md:pb-8 animate-pulse">
        <div className="h-32 md:h-48 w-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="px-4 pb-4">
          <div className="flex justify-between items-end -mt-12 md:-mt-16 mb-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-[#0A0A0A] bg-zinc-300 dark:bg-zinc-700" />
            <div className="w-24 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="space-y-3">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-16 w-full max-w-md bg-zinc-200 dark:bg-zinc-800 rounded-md mt-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full bg-white dark:bg-[#0A0A0A] min-h-screen border-x border-zinc-100 dark:border-zinc-900 shadow-sm pb-24 md:pb-8">
      <SEO 
        title={`${currentDisplayName || userUsername || 'Profile'}`}
        description={`Check out ${currentDisplayName || userUsername || 'this'}'s profile on HeartSpark. View their sparks and more connections.`} 
        canonicalUrl={`https://heartspark-five.vercel.app/profile/${targetUid || user.uid}`}
      />
      {/* Cover Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-32 md:h-48 w-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 relative" 
      />

      {/* Profile Header Section */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-end -mt-12 md:-mt-16 mb-4">
          {/* Avatar */}
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative"
          >
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
          </motion.div>

          {/* Stats Row */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-8 mb-2 pr-4"
          >
            <div className="text-center">
              <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white leading-none">
                {loadingStats ? '...' : stats.sparks >= 1000 ? `${(stats.sparks / 1000).toFixed(1)}K` : stats.sparks}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Sparks</div>
            </div>
          </motion.div>
        </div>

        {/* Identity & Bio */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1"
        >
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {currentDisplayName || 'Anonymous User'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-zinc-500 font-medium">
              @{userUsername || 'user'}
            </p>
            {userLoveStatus && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-[10px] font-bold uppercase tracking-wider">
                <Heart className="w-3 h-3" />
                {userLoveStatus}
              </span>
            )}
          </div>
          <div className="pt-2 max-w-md">
            <p className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-snug">
              {userBio || 'No bio yet. Click Edit Profile to add one! ✨'}
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mt-6"
        >
          {targetUid === user?.uid ? (
            <>
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
            </>
          ) : (
            <>
              {sparkStatus === 'accepted' ? (
                <div className="flex-1 flex gap-2">
                  <Button 
                    variant="custom"
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl border-0 h-10 transition-colors flex items-center justify-center gap-2"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </Button>
                  <Button 
                    variant="custom"
                    title="Clear Chat"
                    className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 font-bold rounded-xl border-0 h-10 w-10 transition-colors flex items-center justify-center"
                    onClick={handleClearChat}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="custom"
                    title="Remove Friend"
                    className="bg-zinc-100 dark:bg-zinc-900 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 font-bold rounded-xl border-0 h-10 w-10 transition-colors flex items-center justify-center"
                    onClick={handleDeleteFriend}
                    disabled={isDeletingFriend}
                  >
                    {isDeletingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="custom"
                  disabled={sparkStatus === 'pending' || isSendingSpark}
                  className={cn(
                    "flex-1 font-bold rounded-xl border-0 h-10 transition-colors flex items-center justify-center gap-2",
                    sparkStatus === 'pending' 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" 
                      : "bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20"
                  )}
                  onClick={handleSendSpark}
                >
                  {isSendingSpark ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className={cn("w-4 h-4", sparkStatus === 'pending' && "fill-current")} />
                  )}
                  {sparkStatus === 'pending' ? 'Requested' : 'Spark Connection'}
                </Button>
              )}
              <Button 
                variant="custom"
                className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl border-0 h-10 transition-colors flex items-center justify-center gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </>
          )}
        </motion.div>
      </div>

      {/* Sticky Content Tabs */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 mt-4">
        <div className="flex">
          {[
            { id: 'SPARKS', icon: Zap },
            { id: 'SETTINGS', icon: Shield },
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
              <div className="relative">
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'fill-current' : ''}`} />
                {tab.id === 'SPARKS' && pendingSparksCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full border-2 border-white dark:border-black" />
                )}
              </div>
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
        {loadingSparks ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            <p className="text-sm text-zinc-500 mt-4 font-bold uppercase tracking-widest">Loading Feed...</p>
          </div>
        ) : activeTab === 'SPARKS' ? (
          <div className="flex flex-col">
            <div className="flex gap-4 p-4 border-b border-zinc-100 dark:border-zinc-900">
              <button 
                onClick={() => setSparkType('received')}
                className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${sparkType === 'received' ? 'border-pink-500 text-pink-500' : 'border-transparent text-zinc-400'}`}
              >
                Received
              </button>
              <button 
                onClick={() => setSparkType('sent')}
                className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${sparkType === 'sent' ? 'border-pink-500 text-pink-500' : 'border-transparent text-zinc-400'}`}
              >
                Sent
              </button>
            </div>
            {sparks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-lg font-bold text-zinc-400">No {sparkType} sparks</h3>
                <p className="text-sm text-zinc-500 mt-2 max-w-xs">
                  {sparkType === 'received' 
                    ? "When someone wants to connect with you, their request will appear here."
                    : "When you spark a connection with someone, it will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {sparks.map((spark) => (
                  <div key={spark.id} className="p-4 bg-white dark:bg-[#0A0A0A] hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center font-bold ${sparkType === 'received' ? 'from-yellow-500/20 to-orange-500/20 text-yellow-500' : 'from-pink-500/20 to-purple-500/20 text-pink-500'}`}>
                        {(sparkType === 'received' ? spark.senderName : (spark.receiverName || 'U')).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-white truncate">
                            {sparkType === 'received' ? spark.senderName : (spark.receiverName || 'User')}
                          </span>
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            {spark.createdAt?.toDate ? spark.createdAt.toDate().toLocaleDateString() : 'now'}
                          </span>
                        </div>
                        
                        {spark.storyContent && (
                          <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-tighter mb-1">Regarding Story</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1 italic">"{spark.storyContent}"</p>
                          </div>
                        )}

                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 font-medium">
                          {spark.message}
                        </p>

                        {spark.compatibility && (
                          <div className="mt-2 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">AI Compatibility</p>
                            <p className="text-xs text-indigo-900 dark:text-indigo-200">{spark.compatibility}</p>
                          </div>
                        )}

                        {sparkType === 'received' && spark.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              variant="custom" 
                              className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs h-8 px-4"
                              onClick={() => handleSparkAction(spark.id, 'accepted')}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              className="text-xs h-8 px-4"
                              onClick={() => handleSparkAction(spark.id, 'declined')}
                            >
                              Decline
                            </Button>
                            {!spark.compatibility && (
                              <Button 
                                variant="outline" 
                                className="text-xs h-8 px-4 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                                onClick={() => checkCompatibility(spark)}
                                disabled={checkingCompatibility === spark.id}
                              >
                                {checkingCompatibility === spark.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "AI Check"}
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            spark.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                            spark.status === 'declined' ? 'bg-red-500/10 text-red-500' :
                            'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {spark.status}
                          </span>
                          
                          {spark.status === 'accepted' && (
                            <Button 
                              variant="custom" 
                              className="bg-pink-500 hover:bg-pink-600 text-white text-[10px] h-6 px-3 rounded-full flex items-center gap-1"
                              onClick={() => navigate('/messages')}
                            >
                              <MessageCircle className="w-3 h-3" />
                              Message
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'SETTINGS' ? (
          <div className="p-4 space-y-8">
            {/* Account Deletion Status */}
            {userData?.deletionRequestedAt && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <div className="flex items-center gap-3 text-red-500 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <h4 className="font-black uppercase tracking-widest text-sm">Deletion Pending</h4>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed mb-4">
                  You requested to delete your account on {userData.deletionRequestedAt.toDate().toLocaleDateString()}. 
                  Your data will be permanently erased after 30 days. Log in anytime before then to cancel.
                </p>
                <Button 
                  variant="custom" 
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-10"
                  onClick={cancelAccountDeletion}
                >
                  Cancel Deletion Request
                </Button>
              </div>
            )}

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Account Safety</h3>
              <div className="space-y-3">
                {!userData?.deletionRequestedAt && (
                  <Button 
                    variant="custom" 
                    className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 font-bold rounded-xl h-12 transition-all flex items-center justify-center gap-2"
                    onClick={() => setShowDeleteAccountConfirm(true)}
                  >
                    <Shield className="w-4 h-4" />
                    Request Account Deletion
                  </Button>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Blocked Users</h3>
              {loadingBlocked ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                </div>
              ) : blockedUsers.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">No blocked users.</p>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{u.displayName}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        className="text-[10px] h-7 px-3 border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleUnblock(u.uid)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showDeleteAccountConfirm && (
          <div className="fixed inset-0 z-[300] flex overflow-y-auto p-4 sm:p-6">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteAccountConfirm(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="m-auto w-full max-w-sm bg-white dark:bg-[#0A0A0B] rounded-3xl p-6 shadow-2xl relative border border-zinc-100 dark:border-zinc-900"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 text-center">
                Delete Account?
              </h3>
              <p className="text-zinc-500 text-sm mb-6 text-center">
                This will start a 30-day deletion process. All your stories, messages, and profile data will be permanently erased. Your username will be released for others to use.
              </p>
              
              {!user?.emailVerified && (
                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    You must verify your email before you can request account deletion.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="custom" 
                  className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl h-12"
                  onClick={() => setShowDeleteAccountConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="custom" 
                  disabled={!user?.emailVerified}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-red-500/20 disabled:opacity-50"
                  onClick={() => {
                    requestAccountDeletion();
                    setShowDeleteAccountConfirm(false);
                  }}
                >
                  Request Deletion
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="m-auto w-full max-w-md relative"
          >
          <Card className="w-full shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">Edit Profile</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
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
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="username"
                      className="w-full h-12 pl-8 pr-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm font-bold"
                    />
                  </div>
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Love Status</label>
                  <select
                    value={editLoveStatus}
                    onChange={(e) => setEditLoveStatus(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm"
                  >
                    <option value="Single">Single</option>
                    <option value="In a Relationship">In a Relationship</option>
                    <option value="It's Complicated">It's Complicated</option>
                    <option value="Crushing">Crushing</option>
                    <option value="Just Looking">Just Looking</option>
                    <option value="Taken">Taken</option>
                  </select>
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={updatingProfile || !editDisplayName.trim()} 
                  variant="custom"
                  className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl border-0 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
                >
                  {updatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Profile"}
                </Button>
              </div>
            </div>
          </Card>
          </motion.div>
        </div>
      )}

      {showAvatarModal && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAvatarModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="m-auto w-full max-w-md relative"
          >
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white">Update Avatar</h2>
                  <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <motion.div 
                      key={avatarUrl}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-32 h-32 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-pink-50 dark:border-pink-900/20 shadow-inner"
                    >
                      {avatarUrl ? <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-zinc-300" />}
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {avatarPresets.map((url, idx) => (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={idx}
                        onClick={() => setAvatarUrl(url)}
                        className={cn(
                          "w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                          avatarUrl === url ? "border-pink-500 shadow-lg shadow-pink-500/20" : "border-transparent bg-zinc-50 dark:bg-zinc-900"
                        )}
                      >
                        <img src={url} alt="Preset" className="w-full h-full object-cover" />
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="custom" 
                      className="flex-1 h-11 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl border-0 transition-all"
                    >
                      <ImageIcon className="w-4 h-4" /> Gallery
                    </Button>
                    <Button 
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute('capture', 'user');
                          fileInputRef.current.click();
                        }
                      }} 
                      variant="custom" 
                      className="flex-1 h-11 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl border-0 transition-all"
                    >
                      <Camera className="w-4 h-4" /> Camera
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Button onClick={generateRandomAvatar} variant="custom" className="w-full h-11 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl border-0 transition-all">
                      <RefreshCw className="w-4 h-4" /> Generate Random
                    </Button>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
                      <span className="flex-shrink mx-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Or URL</span>
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
                  <Button onClick={handleUpdateAvatar} disabled={updatingAvatar || !avatarUrl} variant="custom" className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl border-0 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50">
                    {updatingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
