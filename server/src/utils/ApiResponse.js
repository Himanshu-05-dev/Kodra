/**
 * @file ApiResponse.js
 * Standardized API response serialization envelope for all HTTP endpoints.
 */

export class ApiResponse {
  /**
   * Send a standardized success JSON response
   * @param {import('express').Response} res 
   * @param {any} data 
   * @param {number} [statusCode=200] 
   * @param {object} [meta={}] 
   */
  static success(res, data = null, statusCode = 200, meta = {}) {
    const requestId = res.req?.headers?.['x-request-id'] || res.getHeader?.('x-request-id');

    return res.status(statusCode).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
        ...meta
      }
    });
  }

  /**
   * Send a standardized error JSON response
   * @param {import('express').Response} res 
   * @param {object} error 
   * @param {number} [statusCode=500] 
   * @param {object} [meta={}] 
   */
  static error(res, error, statusCode = 500, meta = {}) {
    const requestId = res.req?.headers?.['x-request-id'] || res.getHeader?.('x-request-id');
    const path = res.req?.originalUrl;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.errorCode || error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details || []
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...(path ? { path } : {}),
        ...(requestId ? { requestId } : {}),
        ...meta
      }
    });
  }
}
