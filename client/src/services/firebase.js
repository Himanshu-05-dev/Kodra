/**
 * @file firebase.js
 * Client Firebase SDK Initialization & Authentication Service.
 * Manages Google OAuth, Email/Password login, and fallback Dev Auth sessions.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Read client environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your_')
);

// Initialize Firebase App
let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('Firebase client initialization warning:', err);
  }
}

export { auth, googleProvider };

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth is not configured. Please enter your Firebase credentials in .env.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please enter your Firebase credentials in .env.');
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Register new user with email and password
 */
export async function signUpWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please enter your Firebase credentials in .env.');
  }
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign out user
 */
export async function logOut() {
  if (auth) {
    await signOut(auth);
  }
}
