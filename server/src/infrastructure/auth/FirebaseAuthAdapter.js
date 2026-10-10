/**
 * @file FirebaseAuthAdapter.js
 * Layer 4: Infrastructure - Firebase Admin SDK Authentication Adapter.
 * Encapsulates token verification, user retrieval, and multi-tenant identity.
 */

import admin from 'firebase-admin';
import { config } from '../../config/index.js';
import { logger } from '../logger/logger.js';
import { UnauthorizedError } from '../../utils/AppError.js';

export class FirebaseAuthAdapter {
  constructor() {
    this.adminApp = this._initFirebaseAdmin();
    this.isConfigured = Boolean(this.adminApp);
  }

  /**
   * Initialize Firebase Admin SDK app if credentials are provided
   */
  _initFirebaseAdmin() {
    if (!config.auth.firebaseEnabled) {
      logger.info('FirebaseAuthAdapter: Firebase Auth is disabled in config. Running in Dev/Hybrid mode.');
      return null;
    }

    try {
      const { firebaseProjectId, firebaseClientEmail, firebasePrivateKey } = config.auth;

      if (!firebaseProjectId) {
        logger.warn('FirebaseAuthAdapter: FIREBASE_PROJECT_ID is missing. Firebase Admin not initialized.');
        return null;
      }

      // If service account credentials provided
      if (firebaseClientEmail && firebasePrivateKey) {
        const formattedPrivateKey = firebasePrivateKey.replace(/\\n/g, '\n');
        const app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: firebaseProjectId,
            clientEmail: firebaseClientEmail,
            privateKey: formattedPrivateKey
          })
        }, 'kodra-admin');

        logger.info(`FirebaseAuthAdapter: Successfully initialized Firebase Admin for project "${firebaseProjectId}"`);
        return app;
      }

      // Fallback: Application Default Credentials (ADC) or environment project
      const app = admin.initializeApp({
        projectId: firebaseProjectId
      }, 'kodra-admin');

      logger.info(`FirebaseAuthAdapter: Initialized Firebase Admin using ADC for project "${firebaseProjectId}"`);
      return app;
    } catch (err) {
      logger.error(`FirebaseAuthAdapter: Initialization error: ${err.message}`);
      return null;
    }
  }

  /**
   * Verify an ID token (supports Firebase JWTs and Dev Mode tokens)
   * @param {string} token 
   * @returns {Promise<{ uid: string, email: string, name: string, picture?: string, emailVerified?: boolean }>}
   */
  async verifyIdToken(token) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new UnauthorizedError('Authentication token is required.');
    }

    const cleanToken = token.trim();

    // 1. Dev / Mock token handler (Used for local testing or offline development)
    if (cleanToken.startsWith('dev-token') || cleanToken.startsWith('mock-token')) {
      return this._parseDevToken(cleanToken);
    }

    // 2. Real Firebase ID token verification
    if (this.adminApp) {
      try {
        const decoded = await admin.auth(this.adminApp).verifyIdToken(cleanToken);
        return {
          uid: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.email?.split('@')[0] || 'User',
          picture: decoded.picture || null,
          emailVerified: Boolean(decoded.email_verified)
        };
      } catch (err) {
        logger.debug(`Firebase ID token verification failed: ${err.message}`);
        throw new UnauthorizedError(`Invalid or expired authentication token: ${err.message}`);
      }
    }

    // 3. Fallback when Firebase Admin is unconfigured but a non-dev token was sent
    if (!config.auth.firebaseEnabled) {
      // In dev mode with auth disabled, allow decoding base64 mock tokens or fallback
      try {
        const decodedString = Buffer.from(cleanToken, 'base64').toString('utf8');
        if (decodedString.startsWith('{') && decodedString.endsWith('}')) {
          const parsed = JSON.parse(decodedString);
          if (parsed.uid) {
            return {
              uid: parsed.uid,
              email: parsed.email || 'dev@kodra.ai',
              name: parsed.name || 'Developer',
              picture: null,
              emailVerified: true
            };
          }
        }
      } catch {}

      // Default fallback in dev mode if arbitrary string token is provided
      return {
        uid: cleanToken.slice(0, 32),
        email: 'dev@kodra.ai',
        name: 'Developer',
        picture: null,
        emailVerified: true
      };
    }

    throw new UnauthorizedError('Firebase Authentication engine is not configured on the server.');
  }

  /**
   * Helper to parse structured dev tokens:
   * Formats:
   * - "dev-token" -> default dev user
   * - "dev-token:uid:email:name" -> custom test user
   */
  _parseDevToken(token) {
    const parts = token.split(':');
    const uid = parts[1] || 'dev-user-001';
    const email = parts[2] || `${uid}@kodra.local`;
    const name = parts[3] || 'Dev Engineer';

    return {
      uid,
      email,
      name,
      picture: null,
      emailVerified: true
    };
  }

  /**
   * Get user metadata from Firebase
   * @param {string} uid 
   */
  async getUser(uid) {
    if (!this.adminApp) {
      return { uid, email: `${uid}@kodra.local`, displayName: 'Dev Engineer' };
    }
    try {
      const userRecord = await admin.auth(this.adminApp).getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        disabled: userRecord.disabled
      };
    } catch (err) {
      throw new UnauthorizedError(`Failed to fetch user [${uid}]: ${err.message}`);
    }
  }
}

// Singleton adapter instance
export const firebaseAuthAdapter = new FirebaseAuthAdapter();
