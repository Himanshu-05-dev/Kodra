/**
 * @file BackupController.js
 * Layer 1: Controller - Workspace Disaster Recovery and S3 Snapshot REST Endpoints.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { backupService } from '../services/BackupService.js';

function getRequestUserId(req) {
  return req.user?.uid || req.headers['x-user-id'] || 'anonymous';
}

export class BackupController {
  /**
   * POST /api/v1/projects/:id/backup
   * Create cloud snapshot
   */
  static async createBackup(req, res, next) {
    try {
      const { id } = req.params;
      const { tag = 'manual' } = req.body || {};
      const ownerId = getRequestUserId(req);

      const result = await backupService.backupWorkspace(id, ownerId, tag);
      return ApiResponse.success(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/backups
   * List available snapshots
   */
  static async listBackups(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);

      const backups = await backupService.listBackups(id, ownerId);
      return ApiResponse.success(res, backups);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/restore
   * Restore workspace from snapshot
   */
  static async restoreBackup(req, res, next) {
    try {
      const { id } = req.params;
      const { snapshotKey } = req.body || {};
      const ownerId = getRequestUserId(req);

      const result = await backupService.restoreWorkspace(id, snapshotKey, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id/backups
   * Delete cloud snapshot
   */
  static async deleteBackup(req, res, next) {
    try {
      const { id } = req.params;
      const { snapshotKey } = req.body || {};
      const ownerId = getRequestUserId(req);

      const result = await backupService.deleteBackup(id, snapshotKey, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
