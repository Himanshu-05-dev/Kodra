/**
 * @file requestLogger.js
 * Layer 1: Middleware - Attaches correlation ID and logs request latency.
 */

import crypto from 'node:crypto';
import { logger } from '../infrastructure/logger/logger.js';

export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} -> ${statusCode} (${durationMs}ms)`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} -> ${statusCode} (${durationMs}ms)`, logData);
    } else {
      logger.debug(`HTTP ${req.method} ${req.originalUrl} -> ${statusCode} (${durationMs}ms)`, logData);
    }
  });

  next();
}
