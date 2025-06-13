import { firebaseConfig } from '../firebaseConfig';
import { User, UserRole } from '../types';
import { INITIAL_USER_POINTS } from '../constants';

// Declare Firebase types for global scope (since SDK is loaded via script tag)
declare global {
  interface Window { firebase: any; }
}

let app: any = null; // Firebase App instance
let auth: any = null; // Firebase Auth instance
let db: any = null;  // Firebase Firestore instance

export const initializeFirebase = () => {
  if (!window.firebase) {
    console.error("Firebase SDK not loaded. Ensure firebase scripts are in index.html");
    return false;
  }
  if (!app && window.firebase.apps && !window.firebase.apps.length) { // Check if already initialized
    try {
      app = window.firebase.initializeApp(firebaseConfig);
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      console.log("Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      alert("Could not initialize Firebase. Please check your firebaseConfig.ts and Firebase project setup.");
      return false;
    }
  } else if (window.firebase.apps && window.firebase.apps.length > 0) {
    // Already initialized
    app = window.firebase.app(); // Get default app
    auth = window.firebase.auth();
    db = window.firebase.firestore();
    return true;
  }
  return false;
};


export const onFirebaseAuthStateChanged = (callback: (user: User | null) => void) => {
  if (!auth) {
    console.warn("Firebase Auth not initialized. Call initializeFirebase first.");
    return () => {}; // Return an empty unsubscribe function
  }
  return auth.onAuthStateChanged(async (firebaseUser: any) => {
    if (firebaseUser) {
      const appUser = await findOrCreateUserProfile(firebaseUser);
      callback(appUser);
    } else {
      callback(null);
    }
  });
};

export const signInWithGoogle = async (): Promise<any | null> => {
  if (!auth) {
    console.error("Firebase Auth not initialized.");
    throw new Error("Firebase Auth not initialized.");
  }
  const provider = new window.firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user; // Firebase User object
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const firebaseSignOut = async (): Promise<void> => {
  if (!auth) {
    console.error("Firebase Auth not initialized.");
    return;
  }
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Firebase Sign-Out Error:", error);
  }
};

const findOrCreateUserProfile = async (firebaseUser: any): Promise<User> => {
  if (!db) {
    console.error("Firestore not initialized.");
    throw new Error("Firestore not initialized.");
  }
  const userRef = db.collection('users').doc(firebaseUser.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    // Create new user profile
    const newUserProfile: User = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous User',
      email: firebaseUser.email || '',
      avatarUrl: firebaseUser.photoURL || undefined,
      role: UserRole.MEMBER, // Default role
      points: INITIAL_USER_POINTS, // Default points
    };
    await userRef.set(newUserProfile);
    return newUserProfile;
  } else {
    // User exists, return their profile
    // Ensure all fields are present, merge with defaults if necessary
    const data = doc.data();
    return {
      id: firebaseUser.uid,
      name: data.name || firebaseUser.displayName || 'Anonymous User',
      email: data.email || firebaseUser.email || '',
      avatarUrl: data.avatarUrl || firebaseUser.photoURL || undefined,
      role: data.role || UserRole.MEMBER,
      points: typeof data.points === 'number' ? data.points : INITIAL_USER_POINTS,
    };
  }
};

export const updateUserPointsInFirestore = async (userId: string, newPoints: number): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized.");
    throw new Error("Firestore not initialized.");
  }
  const userRef = db.collection('users').doc(userId);
  try {
    await userRef.update({ points: newPoints });
  } catch (error) {
    console.error("Error updating points in Firestore:", error);
    throw error;
  }
};

export const getAppUserProfile = async (userId: string): Promise<User | null> => {
    if (!db) {
        console.error("Firestore not initialized.");
        return null;
    }
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    if (doc.exists) {
        return doc.data() as User;
    }
    return null;
};
