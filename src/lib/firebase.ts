import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDocFromServer, doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence to save reads and improve performance
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY' // The user will need to provide this from Firebase Console
      });
      return token;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
  return null;
};

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline, which typically means the Firestore database has not been provisioned or the configuration is incorrect.");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error("Firebase is not configured. Please add your Firebase config to the .env file.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in popup was closed. Please keep it open to complete the sign-in.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Network connection lost. Please check your internet and try again.");
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error("Sign-in popup was blocked by your browser. Please allow popups for this site.");
    } else {
      throw new Error("We couldn't sign you in with Google. Please try again or use email.");
    }
  }
};

export const loginWithEmail = async (emailOrUsername: string, password: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    let loginEmail = emailOrUsername.trim().toLowerCase();
    
    // If it's not an email, treat it as a username
    if (!loginEmail.includes('@')) {
      const usernameDocRef = doc(db, 'usernames', loginEmail);
      const usernameSnap = await getDoc(usernameDocRef);
      if (usernameSnap.exists()) {
        const uid = usernameSnap.data().uid;
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists() && userSnap.data().email) {
          loginEmail = userSnap.data().email;
        } else {
          throw new Error("ACCOUNT_NOT_FOUND");
        }
      } else {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
    } else {
      // It's an email, let's verify if it exists in our database first
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', loginEmail));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
    }

    const result = await signInWithEmailAndPassword(auth, loginEmail, password);
    if (!result.user.emailVerified) {
      await signOut(auth);
      throw new Error("Please verify your email address before logging in. Check your inbox for the verification link.");
    }
    return result.user;
  } catch (error: any) {
    console.error("Error signing in", error);
    
    if (error.message === "ACCOUNT_NOT_FOUND" || error.code === 'auth/user-not-found') {
      throw new Error("ACCOUNT_NOT_FOUND");
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("Invalid email or password.");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. For your security, please wait a few minutes before trying again.");
    } else if (error.code === 'auth/user-disabled') {
      throw new Error("This account has been disabled. Please contact support if you believe this is an error.");
    } else if (error.message && error.message.includes("verify your email")) {
      throw error;
    } else {
      throw new Error("We couldn't sign you in. Please check your details and try again.");
    }
  }
};

export const registerWithEmail = async (email: string, password: string, name: string, username: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    
    // Create user profile in Firestore immediately
    const userDocRef = doc(db, 'users', result.user.uid);
    const usernameDocRef = doc(db, 'usernames', username.toLowerCase());
    
    await setDoc(usernameDocRef, { uid: result.user.uid });
    await setDoc(userDocRef, {
      displayName: name,
      username: username.toLowerCase(),
      email: email,
      photoURL: null,
      role: 'user',
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      bio: 'Hey there! I\'m using Heart Spark.',
      blockedUsers: []
    });

    await sendEmailVerification(result.user);
    return result.user;
  } catch (error: any) {
    console.error("Error registering with Email", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("This email is already registered. Try signing in instead!");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("That doesn't look like a valid email address. Please check for typos.");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("Your password is too short. Please use at least 6 characters.");
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("Email/password accounts are not enabled. Please contact the administrator.");
    } else {
      throw new Error("We couldn't create your account. Please try again in a moment.");
    }
  }
};

export const resetPassword = async (email: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Error sending password reset email", error);
    if (error.code === 'auth/user-not-found') {
      throw new Error("No account found with this email address.");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Please enter a valid email address.");
    } else {
      throw new Error("Failed to send password reset email. Please try again.");
    }
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Error signing out", error);
    throw new Error("Failed to log out. Please try again.");
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const getFriendlyErrorMessage = (error: any): string => {
  const code = error.code || error.message;
  
  if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please try again later.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
