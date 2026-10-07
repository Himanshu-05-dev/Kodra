/**
 * @file errorHandler.js
 * Layer 1: Middleware - Centralized Global Error Handler.
 * Formats all operational and unexpected exceptions into standard ApiResponse envelopes.
 */

import { AppError } from '../utils/AppError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { logger } from '../infrastructure/logger/logger.js';
import { ErrorCodes } from '@kodra/shared';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const requestId = req.headers?.['x-request-id'] || 'unknown';

  // 1. Handle Known Operational Errors
  if (err instanceof AppError) {
    logger.warn(`Operational Error [${err.errorCode}]: ${err.message}`, {
      requestId,
      statusCode: err.statusCode,
      details: err.details,
      path: req.originalUrl
    });

    return ApiResponse.error(res, err, err.statusCode);
  }

  // 2. Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));

    return ApiResponse.error(res, {
      errorCode: ErrorCodes.VALIDATION_ERROR,
      message: 'Database schema validation failed',
      details
    }, 400);
  }

  // 3. Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return ApiResponse.error(res, {
      errorCode: ErrorCodes.VALIDATION_ERROR,
      message: `Invalid format for field "${err.path}": ${err.value}`,
      details: []
    }, 400);
  }

  // 4. Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.error(res, {
      errorCode: ErrorCodes.CONFLICT,
      message: `Resource with duplicate ${field} already exists`,
      details: [err.keyValue]
    }, 409);
  }

  // 5. Handle JSON Parse Errors from Body Parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.error(res, {
      errorCode: ErrorCodes.VALIDATION_ERROR,
      message: 'Malformed JSON payload in request body',
      details: []
    }, 400);
  }

  // 6. Unhandled Programmer or System Exceptions (500)
  logger.error(`Unhandled Exception: ${err.message}`, {
    requestId,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  return ApiResponse.error(res, {
    errorCode: ErrorCodes.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred'
      : err.message,
    details: []
  }, 500);
}
