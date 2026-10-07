/**
 * @file connection.js
 * Layer 4: Infrastructure - MongoDB Atlas / Local Connection Manager.
 * Features auto-reconnect, secret sanitization in logs, and graceful teardown.
 */

import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { logger } from '../logger/logger.js';

let isConnected = false;

/**
 * Sanitize connection string so credentials are not exposed in logs
 */
function sanitizeUri(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Initialize MongoDB connection
 */
export async function connectDB() {
  const sanitized = sanitizeUri(config.database.uri);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info(`MongoDB connection established: ${sanitized}`, {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error(`MongoDB connection error: ${err.message}`, {
      sanitizedUri: sanitized
    });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn(`MongoDB disconnected from: ${sanitized}`);
  });

  try {
    logger.info(`Connecting to MongoDB... [${sanitized}]`);
    await mongoose.connect(config.database.uri, {
      autoIndex: config.database.autoIndex,
      maxPoolSize: config.database.maxPoolSize,
      serverSelectionTimeoutMS: config.database.serverSelectionTimeoutMS
    });
    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    isConnected = false;
    logger.error(`Failed to connect to MongoDB: ${err.message}`, {
      sanitizedUri: sanitized
    });
    // In development, we do not exit hard; we allow the server to boot so Health API reports the status
    if (config.isProduction) {
      throw err;
    }
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection gracefully...');
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly.');
  }
}

/**
 * Report current database connection status
 */
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const stateCode = mongoose.connection.readyState;
  return {
    isConnected: stateCode === 1,
    state: states[stateCode] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
}
