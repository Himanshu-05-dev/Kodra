/**
 * @file SandboxController.js
 * Layer 1: Controller - Sandbox Lifecycle REST Endpoints.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { sandboxService } from '../services/SandboxService.js';

export class SandboxController {
  /**
   * POST /api/v1/sandbox/:projectId/start
   */
  static async startSandbox(req, res, next) {
    try {
      const { projectId } = req.params;
      const ownerId = req.user?.uid || req.headers['x-user-id'] || 'anonymous';
      const result = await sandboxService.startSandbox(projectId, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/sandbox/:projectId/stop
   */
  static async stopSandbox(req, res, next) {
    try {
      const { projectId } = req.params;
      const ownerId = req.user?.uid || req.headers['x-user-id'] || 'anonymous';
      const result = await sandboxService.stopSandbox(projectId, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sandbox/:projectId/status
   */
  static async getStatus(req, res, next) {
    try {
      const { projectId } = req.params;
      const ownerId = req.user?.uid || req.headers['x-user-id'] || 'anonymous';
      const status = await sandboxService.getSandboxStatus(projectId, ownerId);
      return ApiResponse.success(res, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sandbox/engine
   */
  static async getEngineHealth(req, res, next) {
    try {
      const health = await sandboxService.checkEngineHealth();
      return ApiResponse.success(res, health);
    } catch (err) {
      next(err);
    }
  }
}
