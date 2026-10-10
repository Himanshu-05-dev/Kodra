/**
 * @file AuthContext.jsx
 * React Context Provider for Authentication & Multi-User State.
 * Handles Firebase Auth listeners, ID token caching, and Dev/Offline fallback mode.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  isFirebaseConfigured,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  logOut
} from '../services/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { setApiAuthToken } from '../services/api.js';

const AuthContext = createContext(null);

const DEV_STORAGE_KEY = 'kodra_dev_user_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Auth state
  useEffect(() => {
    let unsubscribe = () => {};

    if (isFirebaseConfigured && auth) {
      // 1. Firebase Live Auth Listener
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            setIdToken(token);
            setApiAuthToken(token);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || null,
              isAnonymous: false
            });
          } catch (err) {
            console.error('Failed to get Firebase ID token:', err);
          }
        } else {
          // Check for dev fallback session
          checkDevSession();
        }
        setLoading(false);
      });
    } else {
      // 2. Dev / Hybrid Mode: Load saved dev user from localStorage
      checkDevSession();
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Helper to load or initialize dev user
  const checkDevSession = () => {
    try {
      const saved = localStorage.getItem(DEV_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const token = `dev-token:${parsed.uid}:${parsed.email}:${parsed.displayName}`;
        setIdToken(token);
        setApiAuthToken(token);
        setUser(parsed);
        return;
      }
    } catch {}

    // Default guest session in dev mode
    const defaultDev = {
      uid: 'dev-user-001',
      email: 'alex@kodra.dev',
      displayName: 'Alex Rivers',
      photoURL: null,
      isAnonymous: false
    };
    const devToken = `dev-token:${defaultDev.uid}:${defaultDev.email}:${defaultDev.displayName}`;
    setIdToken(devToken);
    setApiAuthToken(devToken);
    setUser(defaultDev);
  };

  // Login with Google Popup
  const handleGoogleLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login with Email
  const handleEmailLogin = async (email, password) => {
    setError(null);
    try {
      setLoading(true);
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register with Email
  const handleEmailSignup = async (email, password) => {
    setError(null);
    try {
      setLoading(true);
      await signUpWithEmail(email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Quick switch Dev User (for local multi-user testing)
  const handleDevLogin = (customUid, customEmail, customName) => {
    const devUser = {
      uid: customUid || 'dev-user-001',
      email: customEmail || `${customUid || 'dev-user-001'}@kodra.local`,
      displayName: customName || 'Dev Engineer',
      photoURL: null,
      isAnonymous: false
    };
    const token = `dev-token:${devUser.uid}:${devUser.email}:${devUser.displayName}`;

    localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(devUser));
    setIdToken(token);
    setApiAuthToken(token);
    setUser(devUser);
    setError(null);
  };

  // Sign out
  const handleSignOut = async () => {
    setError(null);
    try {
      setLoading(true);
      if (isFirebaseConfigured && auth) {
        await logOut();
      }
      localStorage.removeItem(DEV_STORAGE_KEY);
      setIdToken(null);
      setApiAuthToken(null);
      setUser(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    idToken,
    loading,
    error,
    isAuthenticated: Boolean(user),
    isFirebaseConfigured,
    loginWithGoogle: handleGoogleLogin,
    loginWithEmail: handleEmailLogin,
    signupWithEmail: handleEmailSignup,
    loginAsDev: handleDevLogin,
    signOut: handleSignOut,
    clearError: () => setError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
