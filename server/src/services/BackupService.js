/**
 * @file BackupService.js
 * Layer 2: Business Logic - Orchestrates Cloud Workspace Snapshots and Disaster Recovery.
 * Ensures persistent storage backup to AWS S3 with path traversal defense on restore.
 */

import AdmZip from 'adm-zip';
import path from 'node:path';
import fs from 'node:fs/promises';
import { s3BackupAdapter as defaultS3Adapter } from '../infrastructure/storage/S3BackupAdapter.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { FileSystemRepository } from '../repositories/FileSystemRepository.js';
import { NotFoundError, ForbiddenError, SecurityViolationError, ValidationError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';

export class BackupService {
  /**
   * @param {ProjectRepository} [projectRepo]
   * @param {FileSystemRepository} [fileRepo]
   * @param {import('../infrastructure/storage/S3BackupAdapter.js').S3BackupAdapter} [s3Adapter]
   */
  constructor(
    projectRepo = new ProjectRepository(),
    fileRepo = new FileSystemRepository(),
    s3Adapter = defaultS3Adapter
  ) {
    this.projectRepo = projectRepo;
    this.fileRepo = fileRepo;
    this.s3Adapter = s3Adapter;
  }

  /**
   * Helper to verify project ownership
   */
  async _getProjectWithAuth(projectId, ownerId) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have access to this project backup.');
    }

    return project;
  }

  /**
   * Create an automated or manual cloud snapshot of a workspace
   * @param {string} projectId
   * @param {string} [ownerId]
   * @param {string} [tag='manual']
   */
  async backupWorkspace(projectId, ownerId = null, tag = 'manual') {
    const project = await this._getProjectWithAuth(projectId, ownerId);

    logger.info(`BackupService: Creating "${tag}" snapshot for project [${project.name}] (${projectId})`);

    // 1. Pack physical directory into zip buffer
    const buffer = await this.s3Adapter.createArchiveBuffer(project.workspacePath);

    // 2. Upload to S3 bucket or local cloud storage fallback
    const result = await this.s3Adapter.uploadSnapshot(projectId, buffer, tag);

    return {
      success: true,
      projectId,
      key: result.key,
      sizeBytes: result.sizeBytes,
      location: result.location
    };
  }

  /**
   * List available cloud snapshots for a project
   * @param {string} projectId
   * @param {string} [ownerId]
   */
  async listBackups(projectId, ownerId = null) {
    await this._getProjectWithAuth(projectId, ownerId);
    return await this.s3Adapter.listSnapshots(projectId);
  }

  /**
   * Restore project workspace from a cloud snapshot
   * @param {string} projectId
   * @param {string} snapshotKey
   * @param {string} [ownerId]
   */
  async restoreWorkspace(projectId, snapshotKey, ownerId = null) {
    if (!snapshotKey) {
      throw new ValidationError('Snapshot key is required for restoration.');
    }

    const project = await this._getProjectWithAuth(projectId, ownerId);

    logger.info(`BackupService: Restoring project [${project.name}] from snapshot "${snapshotKey}"`);

    // 1. Download snapshot archive
    const zipBuffer = await this.s3Adapter.downloadSnapshot(projectId, snapshotKey);

    // 2. Unpack with traversal security validation
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    const destinationPath = path.resolve(project.workspacePath);

    for (const entry of zipEntries) {
      const entryTarget = path.resolve(destinationPath, entry.entryName);

      // Path traversal check
      if (!entryTarget.startsWith(destinationPath)) {
        throw new SecurityViolationError(
          `Malicious archive entry "${entry.entryName}" attempted path traversal out of workspace.`
        );
      }
    }

    // Safe extraction
    zip.extractAllTo(destinationPath, true);

    logger.info(`BackupService: Successfully restored ${zipEntries.length} entries into ${destinationPath}`);

    return {
      success: true,
      projectId,
      snapshotKey,
      restoredEntriesCount: zipEntries.length
    };
  }

  /**
   * Delete a cloud snapshot
   * @param {string} projectId
   * @param {string} snapshotKey
   * @param {string} [ownerId]
   */
  async deleteBackup(projectId, snapshotKey, ownerId = null) {
    await this._getProjectWithAuth(projectId, ownerId);
    return await this.s3Adapter.deleteSnapshot(projectId, snapshotKey);
  }
}

export const backupService = new BackupService();
