/**
 * @file authMiddleware.js
 * Layer 1: Middleware - Request Authorization & Firebase ID Token Verification.
 * Enforces authenticated identity across HTTP endpoints and WebSocket upgrades.
 */

import { config } from '../config/index.js';
import { firebaseAuthAdapter } from '../infrastructure/auth/FirebaseAuthAdapter.js';
import { UnauthorizedError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';

/**
 * Standard authentication middleware
 * Attaches verified user to `req.user` and `req.userId`.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // 1. If Authorization header is provided
    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Malformed authorization header. Expected "Bearer <token>".');
      }

      const token = authHeader.slice(7).trim();
      const user = await firebaseAuthAdapter.verifyIdToken(token);

      req.user = user;
      req.userId = user.uid;
      return next();
    }

    // 2. Fallback when no Authorization header was sent:
    // If Firebase Auth is strictly enabled in config, reject request
    if (config.auth.firebaseEnabled) {
      throw new UnauthorizedError('Authentication required. Missing Bearer token.');
    }

    // In dev mode with auth disabled, allow X-User-Id header or anonymous fallback
    const devUserId = req.headers['x-user-id'] || 'anonymous';
    req.user = {
      uid: devUserId,
      email: `${devUserId}@kodra.local`,
      name: devUserId === 'anonymous' ? 'Anonymous Developer' : devUserId,
      picture: null,
      emailVerified: true
    };
    req.userId = devUserId;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Strict authentication middleware: requires valid token regardless of dev mode
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required. Please provide a valid Bearer token.');
    }

    const token = authHeader.slice(7).trim();
    const user = await firebaseAuthAdapter.verifyIdToken(token);

    req.user = user;
    req.userId = user.uid;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware: attaches user if present, proceeds if absent
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const user = await firebaseAuthAdapter.verifyIdToken(token).catch(() => null);
      if (user) {
        req.user = user;
        req.userId = user.uid;
      }
    }
    next();
  } catch {
    next();
  }
}

/**
 * WebSocket token verification helper
 * @param {string} token 
 * @returns {Promise<{ uid: string, email: string, name: string }>}
 */
export async function verifySocketToken(token) {
  if (token) {
    return await firebaseAuthAdapter.verifyIdToken(token);
  }

  // If auth is strictly enabled in config, reject unauthenticated socket
  if (config.auth.firebaseEnabled) {
    throw new UnauthorizedError('WebSocket connection requires authentication token');
  }

  // Dev mode fallback
  return {
    uid: 'anonymous',
    email: 'dev@kodra.local',
    name: 'Anonymous Developer'
  };
}
