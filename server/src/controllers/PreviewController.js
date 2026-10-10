/**
 * @file PreviewController.js
 * Layer 1: Interface - Preview Gateway REST Endpoints.
 * Standardized responses, DTO validation, and delegation to PreviewService.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { previewService } from '../services/PreviewService.js';
import { ValidationError } from '../utils/AppError.js';

export class PreviewController {
  /**
   * GET /api/v1/projects/:id/preview/status
   */
  static async getPreviewStatus(req, res, next) {
    try {
      const projectId = req.params.id || req.params.projectId;
      if (!projectId) {
        throw new ValidationError('Project ID parameter is required.');
      }

      const ownerId = req.user?.uid || req.headers['x-user-id'] || 'anonymous';
      const status = await previewService.getPreviewStatus(projectId, ownerId);
      return ApiResponse.success(res, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/preview/port
   */
  static async setPreviewPort(req, res, next) {
    try {
      const projectId = req.params.id || req.params.projectId;
      const { port } = req.body;

      if (!projectId) {
        throw new ValidationError('Project ID parameter is required.');
      }
      if (!port) {
        throw new ValidationError('Port parameter is required.');
      }

      const ownerId = req.user?.uid || req.headers['x-user-id'] || 'anonymous';
      const updated = await previewService.setPreviewPort(projectId, port, ownerId);
      return ApiResponse.success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/preview/detect
   */
  static async detectPreviewPort(req, res, next) {
    try {
      const projectId = req.params.id || req.params.projectId;
      if (!projectId) {
        throw new ValidationError('Project ID parameter is required.');
      }

      const ownerId = req.user?.uid || req.headers['x-user-id'] || 'anonymous';
      const result = await previewService.detectPreviewPort(projectId, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
