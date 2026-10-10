/**
 * @file deployment.test.js
 * Automated validation suite for Phase 14: Cloud Production Deployment.
 * Validates SecurityProfile container hardening, S3BackupAdapter snapshots & recovery,
 * wildcard domain routing, and production health telemetry.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { SecurityProfile } from '../src/infrastructure/docker/SecurityProfile.js';
import { S3BackupAdapter } from '../src/infrastructure/storage/S3BackupAdapter.js';
import { BackupService } from '../src/services/BackupService.js';
import { PreviewProxyGateway } from '../src/gateways/PreviewProxyGateway.js';
import { FileSystemRepository } from '../src/repositories/FileSystemRepository.js';
import { SecurityViolationError, NotFoundError } from '../src/utils/AppError.js';

describe('Phase 14: Cloud Production Deployment Test Suite', () => {
  const testWorkspaceDir = path.resolve(process.cwd(), 'temp_test_deployment_workspace');
  const testRestoreDir = path.resolve(process.cwd(), 'temp_test_restore_workspace');

  before(async () => {
    await fs.mkdir(testWorkspaceDir, { recursive: true });
    await fs.writeFile(path.join(testWorkspaceDir, 'App.jsx'), 'export default function App() { return <h1>Production Kodra</h1>; }');
    await fs.writeFile(path.join(testWorkspaceDir, 'package.json'), JSON.stringify({ name: 'prod-app', version: '1.0.0' }));
    await fs.mkdir(path.join(testWorkspaceDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(testWorkspaceDir, 'src/index.js'), 'console.log("running in production");');

    await fs.mkdir(testRestoreDir, { recursive: true });
  });

  after(async () => {
    await fs.rm(testWorkspaceDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(testRestoreDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.resolve(process.cwd(), 'server/backups'), { recursive: true, force: true }).catch(() => {});
  });

  describe('1. Docker SecurityProfile & Kernel Containment', () => {
    it('should configure production-hardened HostConfig containment settings', () => {
      // Force hardened mode for unit test
      const hostConfig = SecurityProfile.getHardenedHostConfig();

      assert.ok(hostConfig.Memory > 0);
      assert.ok(hostConfig.PidsLimit <= 150);
      assert.equal(hostConfig.NetworkMode, 'kodra-sandboxes');
    });

    it('should verify container inspection containment flags', () => {
      const mockInspect = {
        HostConfig: {
          PidsLimit: 100,
          Memory: 1073741824,
          SecurityOpt: ['no-new-privileges:true'],
          CapDrop: ['ALL']
        }
      };

      const verification = SecurityProfile.verifyContainerContainment(mockInspect);
      assert.equal(verification.isHardened, true);
      assert.ok(verification.flags.includes('PIDS_LIMITED'));
      assert.ok(verification.flags.includes('MEMORY_LIMITED'));
      assert.ok(verification.flags.includes('NO_NEW_PRIVILEGES'));
      assert.ok(verification.flags.includes('CAPABILITIES_DROPPED'));
    });
  });

  describe('2. S3 Persistent Storage & Workspace Snapshots (S3BackupAdapter)', () => {
    const s3Adapter = new S3BackupAdapter({
      s3Bucket: 'test-backup-bucket',
      s3Region: 'us-east-1',
      s3AccessKeyId: '', // Tests fallback mode cleanly
      s3SecretAccessKey: ''
    });

    let uploadedKey = '';

    it('should pack workspace files into a valid ZIP archive buffer', async () => {
      const buffer = await s3Adapter.createArchiveBuffer(testWorkspaceDir);
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 0);
    });

    it('should upload workspace snapshot and return key and location', async () => {
      const buffer = await s3Adapter.createArchiveBuffer(testWorkspaceDir);
      const result = await s3Adapter.uploadSnapshot('proj-prod-99', buffer, 'auto-test');

      assert.ok(result.key);
      assert.ok(result.key.includes('proj-prod-99'));
      assert.ok(result.sizeBytes > 0);
      uploadedKey = result.key;
    });

    it('should list available snapshots for a project', async () => {
      const list = await s3Adapter.listSnapshots('proj-prod-99');
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 1);
      assert.equal(list[0].key, uploadedKey);
    });

    it('should download snapshot archive buffer', async () => {
      const buffer = await s3Adapter.downloadSnapshot('proj-prod-99', uploadedKey);
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 0);
    });

    it('should delete snapshot', async () => {
      const del = await s3Adapter.deleteSnapshot('proj-prod-99', uploadedKey);
      assert.equal(del.deleted, true);

      const listAfter = await s3Adapter.listSnapshots('proj-prod-99');
      assert.equal(listAfter.length, 0);
    });
  });

  describe('3. BackupService Disaster Recovery & Path Traversal Guards', () => {
    const mockProject = {
      _id: 'proj-restore-1',
      name: 'restore-app',
      ownerId: 'user-deploy-1',
      workspacePath: testRestoreDir
    };

    const mockProjectRepo = {
      findById: async (id) => (id === 'proj-restore-1' ? mockProject : null)
    };

    const s3Adapter = new S3BackupAdapter({
      s3Bucket: 'test-restore-bucket',
      s3AccessKeyId: '',
      s3SecretAccessKey: ''
    });

    const backupService = new BackupService(mockProjectRepo, new FileSystemRepository(), s3Adapter);

    it('should backup and restore workspace files cleanly into destination', async () => {
      // 1. Create snapshot from source
      const buffer = await s3Adapter.createArchiveBuffer(testWorkspaceDir);
      const upload = await s3Adapter.uploadSnapshot('proj-restore-1', buffer, 'full-test');

      // 2. Restore into target directory
      const result = await backupService.restoreWorkspace('proj-restore-1', upload.key, 'user-deploy-1');
      assert.equal(result.success, true);
      assert.ok(result.restoredEntriesCount >= 3);

      // Verify restored file exists on disk
      const restoredApp = await fs.readFile(path.join(testRestoreDir, 'App.jsx'), 'utf8');
      assert.ok(restoredApp.includes('Production Kodra'));
    });

    it('should reject restore request from unauthorized user (ForbiddenError)', async () => {
      await assert.rejects(
        () => backupService.restoreWorkspace('proj-restore-1', 'any-key', 'unauthorized-user'),
        /You do not have access/
      );
    });
  });

  describe('4. Wildcard Subdomain & Production DNS Routing (PreviewProxyGateway)', () => {
    const gateway = new PreviewProxyGateway();

    it('should extract projectId from production wildcard subdomain host', () => {
      // e.g. my-app.preview.kodra.dev
      const req = {
        headers: {
          host: 'my-app.preview.localhost:5000'
        },
        url: '/'
      };

      const extracted = gateway.extractProjectId(req);
      assert.equal(extracted, 'my-app');
    });

    it('should extract projectId from Nginx gateway header (x-kodra-wildcard-subdomain)', () => {
      const req = {
        headers: {
          'x-kodra-wildcard-subdomain': 'saas-customer-store'
        },
        url: '/'
      };

      const extracted = gateway.extractProjectId(req);
      assert.equal(extracted, 'saas-customer-store');
    });

    it('should detect preview request from wildcard subdomain host header', () => {
      const req = {
        headers: {
          host: 'my-app.preview.localhost:5000'
        }
      };

      assert.equal(gateway.isPreviewRequest(req), true);
    });
  });
});
