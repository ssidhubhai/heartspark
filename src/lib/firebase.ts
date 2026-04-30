import { initializeApp } from 'firebase/app';
import { getAuth, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDocFromServer, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

const DOMAIN = '@heartspark.local';

export const loginWithUsername = async (username: string, password: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    let loginEmail = `${cleanUsername}${DOMAIN}`;

    // Maintain backwards compatibility for existing legacy users who registered with a real email
    const usernameDocRef = doc(db, 'usernames', cleanUsername);
    const usernameSnap = await getDoc(usernameDocRef);
    if (usernameSnap.exists()) {
      const uid = usernameSnap.data().uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists() && userSnap.data().email) {
        loginEmail = userSnap.data().email;
      }
    }

    const result = await signInWithEmailAndPassword(auth, loginEmail, password);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in", error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("Invalid username or password.");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. For your security, please wait a few minutes before trying again.");
    } else if (error.code === 'auth/user-disabled') {
      throw new Error("This account has been disabled. Please contact support if you believe this is an error.");
    } else {
      throw new Error("We couldn't sign you in. Please check your details and try again.");
    }
  }
};

export const registerWithUsername = async (username: string, password: string, name: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      throw new Error("Username must be at least 3 characters long (letters, numbers, underscores).");
    }
    
    // Check if username already exists in Firestore usernames collection
    const usernameDocRef = doc(db, 'usernames', cleanUsername);
    const usernameSnap = await getDoc(usernameDocRef);
    if (usernameSnap.exists()) {
      throw new Error("auth/username-already-in-use");
    }

    const email = `${cleanUsername}${DOMAIN}`;

    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    
    // Create user profile in Firestore immediately
    const userDocRef = doc(db, 'users', result.user.uid);
    
    await setDoc(usernameDocRef, { uid: result.user.uid });
    await setDoc(userDocRef, {
      displayName: name,
      username: cleanUsername,
      photoURL: null,
      role: 'user',
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      bio: "Hey there! I'm using Heart Spark.",
      blockedUsers: []
    });

    return result.user;
  } catch (error: any) {
    console.error("Error registering with Username", error);
    if (error.message === "auth/username-already-in-use" || error.code === 'auth/email-already-in-use') {
      throw new Error("This username is already taken. Please try another one.");
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("We couldn't create your account. Please try again in a moment.");
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
  
  if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'Invalid username or password.') {
    return 'Invalid username or password.';
  }
  if (code === 'auth/email-already-in-use' || code === 'auth/username-already-in-use' || code === 'This username is already taken. Please try another one.') {
    return 'This username is already taken.';
  }
  if (code === 'auth/weak-password' || error.message?.includes('weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please try again later.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
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
