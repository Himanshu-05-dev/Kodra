/**
 * @file S3BackupAdapter.js
 * Layer 4: Infrastructure Adapter - AWS S3 / Cloudflare R2 / MinIO Workspace Backup.
 * Creates compressed workspace snapshots and uploads to cloud object storage
 * with local disk fallback for development environments.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { ZipArchive } from 'archiver';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { config } from '../../config/index.js';
import { logger } from '../logger/logger.js';
import { InfrastructureError, NotFoundError } from '../../utils/AppError.js';

export class S3BackupAdapter {
  constructor(cfg = config.backup) {
    this.config = cfg;
    this.isLive = Boolean(this.config.s3AccessKeyId && this.config.s3SecretAccessKey);
    this.localBackupDir = path.resolve(process.cwd(), 'server/backups');

    if (this.isLive) {
      const clientConfig = {
        region: this.config.s3Region || 'us-east-1',
        credentials: {
          accessKeyId: this.config.s3AccessKeyId,
          secretAccessKey: this.config.s3SecretAccessKey
        }
      };

      if (this.config.s3Endpoint) {
        clientConfig.endpoint = this.config.s3Endpoint;
        clientConfig.forcePathStyle = this.config.s3ForcePathStyle ?? true;
      }

      this.client = new S3Client(clientConfig);
      logger.info(`S3BackupAdapter: Initialized S3 Client for bucket "${this.config.s3Bucket}" [${this.config.s3Region}]`);
    } else {
      this.client = null;
      logger.info('S3BackupAdapter: Running in Local Snapshot Fallback mode (no AWS credentials configured).');
    }
  }

  /**
   * Pack workspace folder into an in-memory ZIP buffer
   * @param {string} workspacePath
   * @returns {Promise<Buffer>}
   */
  async createArchiveBuffer(workspacePath) {
    return new Promise((resolve, reject) => {
      const archive = new ZipArchive({ zlib: { level: 6 } });
      const chunks = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('error', (err) => reject(err));
      archive.on('end', () => resolve(Buffer.concat(chunks)));

      archive.directory(workspacePath, false);
      archive.finalize();
    });
  }

  /**
   * Upload workspace snapshot to S3 or local archive
   * @param {string} projectId
   * @param {Buffer} buffer
   * @param {string} [tag='manual']
   * @returns {Promise<{ key: string, sizeBytes: number, location: string }>}
   */
  async uploadSnapshot(projectId, buffer, tag = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${projectId}_${timestamp}_${tag}.zip`;
    const s3Key = `snapshots/${projectId}/${filename}`;

    if (this.isLive) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: 'application/zip',
          Metadata: {
            projectId,
            snapshotTag: tag,
            timestamp: new Date().toISOString()
          }
        });

        await this.client.send(command);
        logger.info(`S3BackupAdapter: Uploaded snapshot "${s3Key}" (${buffer.length} bytes) to S3.`);

        return {
          key: s3Key,
          sizeBytes: buffer.length,
          location: `s3://${this.config.s3Bucket}/${s3Key}`
        };
      } catch (err) {
        logger.error(`S3 upload failed: ${err.message}`);
        throw new InfrastructureError(`Failed to upload workspace snapshot to S3: ${err.message}`);
      }
    }

    // Local Disk Fallback
    await fs.mkdir(this.localBackupDir, { recursive: true });
    const localFilePath = path.join(this.localBackupDir, filename);
    await fs.writeFile(localFilePath, buffer);
    logger.debug(`S3BackupAdapter [LOCAL]: Saved snapshot to ${localFilePath}`);

    return {
      key: filename,
      sizeBytes: buffer.length,
      location: localFilePath
    };
  }

  /**
   * Download workspace snapshot from S3 or local archive
   * @param {string} projectId
   * @param {string} snapshotKey
   * @returns {Promise<Buffer>}
   */
  async downloadSnapshot(projectId, snapshotKey) {
    if (this.isLive) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: snapshotKey
        });

        const response = await this.client.send(command);
        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
      } catch (err) {
        logger.error(`S3 download failed: ${err.message}`);
        throw new NotFoundError(`Snapshot "${snapshotKey}" not found in S3 bucket.`);
      }
    }

    // Local Disk Fallback
    const localFilePath = path.join(this.localBackupDir, path.basename(snapshotKey));
    try {
      return await fs.readFile(localFilePath);
    } catch {
      throw new NotFoundError(`Local snapshot "${snapshotKey}" not found.`);
    }
  }

  /**
   * List available snapshots for a project
   * @param {string} projectId
   * @returns {Promise<Array<{ key: string, sizeBytes: number, lastModified: Date }>>}
   */
  async listSnapshots(projectId) {
    if (this.isLive) {
      try {
        const prefix = `snapshots/${projectId}/`;
        const command = new ListObjectsV2Command({
          Bucket: this.config.s3Bucket,
          Prefix: prefix
        });

        const response = await this.client.send(command);
        const items = (response.Contents || []).map((item) => ({
          key: item.Key,
          sizeBytes: item.Size,
          lastModified: item.LastModified
        }));

        return items.sort((a, b) => b.lastModified - a.lastModified);
      } catch (err) {
        logger.error(`S3 list failed: ${err.message}`);
        return [];
      }
    }

    // Local Disk Fallback
    try {
      await fs.mkdir(this.localBackupDir, { recursive: true });
      const files = await fs.readdir(this.localBackupDir);
      const projectFiles = files.filter((f) => f.startsWith(`${projectId}_`));

      const items = await Promise.all(
        projectFiles.map(async (filename) => {
          const filePath = path.join(this.localBackupDir, filename);
          const stat = await fs.stat(filePath);
          return {
            key: filename,
            sizeBytes: stat.size,
            lastModified: stat.mtime
          };
        })
      );

      return items.sort((a, b) => b.lastModified - a.lastModified);
    } catch {
      return [];
    }
  }

  /**
   * Delete snapshot
   * @param {string} projectId
   * @param {string} snapshotKey
   */
  async deleteSnapshot(projectId, snapshotKey) {
    if (this.isLive) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: snapshotKey
        });
        await this.client.send(command);
        return { deleted: true };
      } catch (err) {
        throw new InfrastructureError(`Failed to delete S3 snapshot: ${err.message}`);
      }
    }

    // Local Disk Fallback
    const localFilePath = path.join(this.localBackupDir, path.basename(snapshotKey));
    await fs.rm(localFilePath, { force: true }).catch(() => {});
    return { deleted: true };
  }
}

export const s3BackupAdapter = new S3BackupAdapter();
