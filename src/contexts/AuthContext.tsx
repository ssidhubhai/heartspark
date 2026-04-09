import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, logout, db, requestNotificationPermission } from '../lib/firebase';
import { AuthModal } from '../components/AuthModal';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  isConfigured: boolean;
  showToast: (message: string, type?: 'success' | 'error') => void;
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
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
    if (!auth) {
      setLoading(false);
      return;
    }

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.emailVerified && currentUser.providerData.some(p => p.providerId === 'password')) {
          setUser(null);
          setUserData(null);
        } else {
          setUser(currentUser);
          
          // Sync user profile to Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // Set up real-time listener for user data
          const unsubUserData = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const publicData = docSnap.data();
              
              // Fetch private data
              const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'settings');
              const privateSnap = await getDoc(privateDocRef);
              const privateData = privateSnap.exists() ? privateSnap.data() : {};

              // Handle account deletion cancellation
              if (privateData.deletionRequestedAt) {
                const requestedAt = privateData.deletionRequestedAt.toDate();
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
                    batch.delete(doc(db, 'usernames', publicData.username));
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
              if (token && token !== privateData.fcmToken) {
                await updateDoc(privateDocRef, { fcmToken: token });
              }

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
              
              setUserData({ ...publicData, ...privateData });
            } else {
              // Create new user if doesn't exist
              const baseUsername = (currentUser.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
              const uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
              
              const newPublicData = {
                displayName: currentUser.displayName || 'New User',
                username: uniqueUsername,
                photoURL: currentUser.photoURL,
                role: 'user',
                isOnline: true,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                bio: 'Hey there! I\'m using Heart Spark.',
                blockedUsers: []
              };

              const newPrivateData = {
                email: currentUser.email,
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
              } catch (err) {
                console.error("Error creating user profile:", err);
              }
            }
          });

          // Update online status
          const updatePresence = async (online: boolean) => {
            try {
              await updateDoc(userDocRef, {
                isOnline: online,
                lastSeen: serverTimestamp()
              });
            } catch (err) {
              console.error("Error updating presence:", err);
            }
          };

          updatePresence(true);

          // Handle tab close/visibility change
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              updatePresence(false);
            } else {
              updatePresence(true);
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);

          return () => {
            unsubUserData();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            updatePresence(false);
          };
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
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
    
    if (!user.emailVerified) {
      showToast("Please verify your email before requesting account deletion.", "error");
      return;
    }

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
                "pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl min-w-[300px]",
                toast.type === 'success' 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
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
