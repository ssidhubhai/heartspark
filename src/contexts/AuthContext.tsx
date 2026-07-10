import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, logout, db, requestNotificationPermission } from '../lib/firebase';
import { AuthModal } from '../components/AuthModal';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  isConfigured: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  refreshUserData: () => Promise<void>;
  requestAccountDeletion: () => Promise<void>;
  cancelAccountDeletion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  isConfigured: false,
  showToast: () => {},
  refreshUserData: async () => {},
  requestAccountDeletion: async () => {},
  cancelAccountDeletion: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isConfigured = !!auth;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const refreshUserData = async () => {
    if (user && db) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    }
  };

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      showToast(customEvent.detail.message, customEvent.detail.type);
    };
    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenModal);
    return () => window.removeEventListener('open-auth-modal', handleOpenModal);
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Sync user profile to Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'settings');
          
          let currentPublicData: any = null;
          let currentPrivateData: any = null;

          const updateCombinedUserData = () => {
            if (currentPublicData && currentPrivateData) {
              setUserData({ ...currentPublicData, ...currentPrivateData });
              setLoading(false);
            }
          };

          // Set up real-time listener for private data (rarely changes)
          const unsubPrivateData = onSnapshot(privateDocRef, async (privateSnap) => {
            currentPrivateData = privateSnap.exists() ? privateSnap.data() : {};
            
            // Handle account deletion cancellation
            if (currentPrivateData.deletionRequestedAt) {
              const requestedAt = currentPrivateData.deletionRequestedAt.toDate();
              const now = new Date();
              const daysDiff = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60 * 24);
              
              if (daysDiff < 30) {
                // Cancel deletion if logged in within 30 days
                await updateDoc(privateDocRef, {
                  deletionRequestedAt: null
                });
                showToast("Welcome back! Your account deletion request has been cancelled.", "success");
              } else {
                // Account should be deleted.
                // Perform cleanup
                try {
                  const batch = writeBatch(db);
                  if (currentPublicData?.username) {
                    batch.delete(doc(db, 'usernames', currentPublicData.username));
                  }
                  batch.delete(privateDocRef);
                  batch.delete(userDocRef);
                  await batch.commit();
                } catch (e) {
                  console.error("Cleanup error:", e);
                }
                
                await logout();
                showToast("This account has been permanently deleted.", "error");
                return;
              }
            }

            // Request notification permission and save token
            const token = await requestNotificationPermission();
            if (token && token !== currentPrivateData.fcmToken) {
              await setDoc(privateDocRef, { fcmToken: token }, { merge: true });
            }

            updateCombinedUserData();
          }, (err) => {
            console.error("Error fetching private data:", err);
            currentPrivateData = {};
            updateCombinedUserData();
            setLoading(false);
          });

          // Set up real-time listener for user data
          const unsubUserData = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const publicData = docSnap.data();
              currentPublicData = publicData;
              
              // Update online status and last seen
              if (!publicData.isOnline) {
                await updateDoc(userDocRef, {
                  isOnline: true,
                  lastSeen: serverTimestamp()
                });
              }

              // Sync basic profile data if missing in Firestore but present in Auth
              if (currentUser.displayName && !publicData.displayName) {
                 await updateDoc(userDocRef, { displayName: currentUser.displayName });
              }
              if (currentUser.photoURL && !publicData.photoURL) {
                 await updateDoc(userDocRef, { photoURL: currentUser.photoURL });
              }
              
              updateCombinedUserData();
            } else {
              // Create new user if doesn't exist
              const baseUsername = (currentUser.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
              const uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
              
              const newPublicData = {
                displayName: currentUser.displayName || 'New User',
                username: uniqueUsername,
                photoURL: currentUser.photoURL || '',
                role: 'user',
                isOnline: true,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                bio: 'Hey there! I\'m using Heart Spark.',
                blockedUsers: []
              };

              const newPrivateData = {
                deletionRequestedAt: null
              };
              
              try {
                // Reserve username
                await setDoc(doc(db, 'usernames', uniqueUsername), { uid: currentUser.uid });
                // Create user profile
                await setDoc(userDocRef, newPublicData);
                // Create private settings
                await setDoc(doc(db, 'users', currentUser.uid, 'private', 'settings'), newPrivateData);
                
                setUserData({ ...newPublicData, ...newPrivateData });
                setLoading(false);
              } catch (err) {
                console.error("Error creating user profile:", err);
                showToast("Failed to initialize profile. Please refresh.", "error");
                // Allow them in with fallback data so they aren't stuck loading forever
                setUserData({ ...newPublicData, ...newPrivateData });
                setLoading(false);
              }
            }
          }, (err) => {
            console.error("Error fetching user data:", err);
            currentPublicData = { displayName: currentUser.displayName, username: 'user', photoURL: currentUser.photoURL };
            updateCombinedUserData();
            setLoading(false);
          });

          // Update online status with throttling and state check
          let lastPresenceUpdate = 0;
          let lastOnlineState: boolean | null = null;
          let offlineTimeout: NodeJS.Timeout | null = null;
          let idleTimeout: NodeJS.Timeout | null = null;

          const updatePresence = async (online: boolean) => {
            const now = Date.now();
            // Throttling: Only update if state changed OR it's been more than 2 minutes
            // CRITICAL: Offline updates (online === false) should ALWAYS bypass throttling
            if (online === lastOnlineState && online === true && now - lastPresenceUpdate < 120000) return;
            
            // Only update presence if the user document actually exists / has been loaded
            if (!currentPublicData) return;
            
            try {
              lastPresenceUpdate = now;
              lastOnlineState = online;
              await updateDoc(userDocRef, {
                isOnline: online,
                lastSeen: serverTimestamp()
              });
            } catch (err) {
              console.error("Error updating presence:", err);
            }
          };

          const setOfflineWithGrace = () => {
            if (offlineTimeout) clearTimeout(offlineTimeout);
            offlineTimeout = setTimeout(() => {
              // Clean up stale localStorage presence keys
              const now = Date.now();
              Object.keys(localStorage).forEach(k => {
                if (k.startsWith('presence_')) {
                  try {
                    const data = JSON.parse(localStorage.getItem(k) || '{}');
                    if (data.timestamp && now - data.timestamp > 300000) {
                      localStorage.removeItem(k);
                    }
                  } catch (e) {
                    // Remove corrupted or legacy data
                    localStorage.removeItem(k);
                  }
                }
              });

              // Check if any other tab is visible before going offline
              const otherTabsVisible = Object.keys(localStorage)
                .filter(k => k.startsWith('presence_') && k !== `presence_${tabId}`)
                .some(k => {
                  try {
                    const data = JSON.parse(localStorage.getItem(k) || '{}');
                    return data.state === 'visible';
                  } catch (e) {
                    return false;
                  }
                });
              
              if (!otherTabsVisible) {
                updatePresence(false);
              }
            }, 30000); // Reduced to 30 second grace period
          };

          const setOnline = () => {
            if (offlineTimeout) {
              clearTimeout(offlineTimeout);
              offlineTimeout = null;
            }
            updatePresence(true);
            resetIdleTimer();
          };

          const resetIdleTimer = () => {
            if (idleTimeout) clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => {
              updatePresence(false);
            }, 300000); // 5 minutes idle = offline
          };

          const tabId = Math.random().toString(36).substring(2, 9);
          const updateTabPresence = (state: string) => {
            localStorage.setItem(`presence_${tabId}`, JSON.stringify({
              state,
              timestamp: Date.now()
            }));
          };

          updateTabPresence(document.visibilityState);

          const handleVisibilityChange = () => {
            updateTabPresence(document.visibilityState);
            if (document.visibilityState === 'hidden') {
              setOfflineWithGrace();
            } else {
              setOnline();
            }
          };

          const handleActivity = () => {
            if (document.visibilityState === 'visible') {
              setOnline();
            }
          };

          const handleBeforeUnload = () => {
            localStorage.removeItem(`presence_${tabId}`);
            // If this was the last active tab, try to set offline immediately
            const otherTabs = Object.keys(localStorage).filter(k => k.startsWith('presence_'));
            if (otherTabs.length === 0) {
              // Use a synchronous-ish update if possible, or just let the heartbeat handle it
              updatePresence(false);
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);
          document.addEventListener('mousemove', handleActivity);
          document.addEventListener('keydown', handleActivity);
          document.addEventListener('click', handleActivity);
          window.addEventListener('beforeunload', handleBeforeUnload);
          
          setOnline();

          // Periodic ping (every 2 minutes)
          const pingInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
              updateTabPresence('visible');
              updatePresence(true);
            }
          }, 120000);

          return () => {
            unsubUserData();
            unsubPrivateData();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('mousemove', handleActivity);
            document.removeEventListener('keydown', handleActivity);
            document.removeEventListener('click', handleActivity);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            localStorage.removeItem(`presence_${tabId}`);
            clearInterval(pingInterval);
            if (offlineTimeout) clearTimeout(offlineTimeout);
            if (idleTimeout) clearTimeout(idleTimeout);
            updatePresence(false);
          };
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Signed out successfully");
    } catch (error) {
      console.error("Logout failed", error);
      showToast("Failed to sign out", "error");
    }
  };

  const requestAccountDeletion = async () => {
    if (!user || !db) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'private', 'settings'), {
        deletionRequestedAt: serverTimestamp()
      });
      showToast("Account deletion requested. You have 30 days to cancel by logging in.", "success");
    } catch (error) {
      console.error("Error requesting deletion:", error);
      showToast("Failed to request account deletion.", "error");
    }
  };

  const cancelAccountDeletion = async () => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'private', 'settings'), {
        deletionRequestedAt: null
      });
      showToast("Account deletion cancelled.", "success");
    } catch (error) {
      console.error("Error cancelling deletion:", error);
      showToast("Failed to cancel account deletion.", "error");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login: handleLogin, 
      logout: handleLogout, 
      isConfigured, 
      showToast, 
      refreshUserData,
      requestAccountDeletion,
      cancelAccountDeletion
    }}>
      {children}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {/* Toast System */}
      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[300px] sm:max-w-md",
                toast.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                toast.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-500",
                toast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-500"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
               <ShieldCheck className="w-5 h-5" />}
              <p className="text-sm font-black uppercase tracking-widest flex-1">{toast.message}</p>
              <button 
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
