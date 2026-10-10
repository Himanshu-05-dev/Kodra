/**
 * @file AppError.js
 * Multi-tier typed operational error hierarchy.
 * Distinguishes operational (expected domain errors) from programmer bugs.
 */

import { ErrorCodes } from '@kodra/shared';

export class AppError extends Error {
  /**
   * @param {string} message 
   * @param {number} statusCode 
   * @param {string} errorCode 
   * @param {Array} [details] 
   */
  constructor(message, statusCode = 500, errorCode = ErrorCodes.INTERNAL_ERROR, details = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ErrorCodes.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ErrorCodes.CONFLICT);
  }
}

export class SecurityViolationError extends AppError {
  constructor(message = 'Security violation detected') {
    super(message, 403, ErrorCodes.SECURITY_VIOLATION);
  }
}

export class StorageLimitError extends AppError {
  constructor(message = 'Storage limit exceeded') {
    super(message, 413, ErrorCodes.STORAGE_LIMIT_EXCEEDED);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Usage quota limit exceeded for your current billing plan', details = []) {
    super(message, 402, ErrorCodes.QUOTA_EXCEEDED, details);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment is required to perform this action', details = []) {
    super(message, 402, ErrorCodes.PAYMENT_REQUIRED, details);
  }
}


export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = []) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, details);
  }
}

export class DockerError extends AppError {
  constructor(message = 'Docker sandbox operation failed', details = []) {
    super(message, 500, ErrorCodes.DOCKER_ERROR, details);
  }
}

export class AIProviderError extends AppError {
  constructor(message = 'AI provider request failed', details = []) {
    super(message, 502, ErrorCodes.AI_PROVIDER_ERROR, details);
  }
}

export class InfrastructureError extends AppError {
  constructor(message = 'Infrastructure operation failed', details = []) {
    super(message, 502, ErrorCodes.INTERNAL_ERROR, details);
  }
}

export class BillingError extends AppError {
  constructor(message = 'Billing service error', details = []) {
    super(message, 400, ErrorCodes.PAYMENT_REQUIRED, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected internal error occurred') {
    super(message, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
