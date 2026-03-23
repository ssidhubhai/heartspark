import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, getDocFromServer, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY as string,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID as string
};

const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TODO_KEYHERE' && !firebaseConfig.apiKey.includes('TODO');

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isFirebaseConfigured ? getAuth(app!) : null;
export const db = isFirebaseConfigured ? getFirestore(app!) : null;
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

if (db) {
  async function testConnection() {
    try {
      await getDocFromServer(doc(db!, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. The client is offline, which typically means the Firestore database has not been provisioned or the configuration is incorrect.");
      }
      // Skip logging for other errors, as this is simply a connection test.
    }
  }
  testConnection();
}

export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error("Firebase is not configured. Please add your Firebase config to the .env file.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!result.user.emailVerified) {
      await signOut(auth);
      throw new Error("Please verify your email address before logging in. Check your inbox or spam folder.");
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in with Email", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, password: string, name: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);
    await signOut(auth); // Force them to login after verification
    return result.user;
  } catch (error) {
    console.error("Error registering with Email", error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email", error);
    throw error;
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
