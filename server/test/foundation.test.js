/**
 * @file foundation.test.js
 * Automated validation suite for Phase 1: Project Foundation.
 * Tests configuration, security path guards, error hierarchy, and workspace scaffolding.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { config } from '../src/config/index.js';
import { FileSystemRepository } from '../src/repositories/FileSystemRepository.js';
import { WorkspaceService } from '../src/services/WorkspaceService.js';
import {
  ValidationError,
  NotFoundError,
  SecurityViolationError,
  StorageLimitError
} from '../src/utils/AppError.js';
import { ErrorCodes, ProjectStatus, ProjectTemplates } from '@kodra/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testWorkspaceDir = path.resolve(__dirname, './test_workspaces');

describe('Phase 1: Project Foundation Test Suite', () => {

  describe('1. Configuration & Immutability', () => {
    it('should freeze configuration object to prevent runtime mutations', () => {
      assert.ok(Object.isFrozen(config));
      assert.throws(() => {
        // @ts-ignore
        config.server.port = 9999;
      });
    });

    it('should have loaded valid server configuration from .env', () => {
      assert.equal(typeof config.server.port, 'number');
      assert.ok(config.server.port > 0);
      assert.equal(typeof config.server.apiPrefix, 'string');
      assert.ok(config.storage.basePath.length > 0);
    });
  });

  describe('2. Error Handling & Operational Hierarchy', () => {
    it('should instantiate ValidationError with status 400 and code VALIDATION_ERROR', () => {
      const err = new ValidationError('Invalid project name');
      assert.equal(err.statusCode, 400);
      assert.equal(err.errorCode, ErrorCodes.VALIDATION_ERROR);
      assert.equal(err.isOperational, true);
      assert.equal(err.message, 'Invalid project name');
    });

    it('should instantiate NotFoundError with status 404 and code NOT_FOUND', () => {
      const err = new NotFoundError('Project missing');
      assert.equal(err.statusCode, 404);
      assert.equal(err.errorCode, ErrorCodes.NOT_FOUND);
      assert.equal(err.isOperational, true);
    });

    it('should instantiate SecurityViolationError with status 403 and code SECURITY_VIOLATION', () => {
      const err = new SecurityViolationError('Path escape');
      assert.equal(err.statusCode, 403);
      assert.equal(err.errorCode, ErrorCodes.SECURITY_VIOLATION);
    });
  });

  describe('3. FileSystemRepository & Path Traversal Guard', () => {
    const fsRepo = new FileSystemRepository();

    it('should resolve safe relative path within base directory', () => {
      const safe = fsRepo.resolveSafePath(testWorkspaceDir, 'src/App.jsx');
      assert.ok(safe.startsWith(testWorkspaceDir));
      assert.ok(safe.endsWith(path.join('src', 'App.jsx')));
    });

    it('should block and throw SecurityViolationError on ../ directory traversal attempt', () => {
      assert.throws(
        () => fsRepo.resolveSafePath(testWorkspaceDir, '../../../etc/passwd'),
        SecurityViolationError
      );
    });

    it('should block backslash traversal on Windows / Unix', () => {
      assert.throws(
        () => fsRepo.resolveSafePath(testWorkspaceDir, '..\\..\\secret.env'),
        SecurityViolationError
      );
    });
  });

  describe('4. WorkspaceService Scaffolding & File Operations', () => {
    const fsRepo = new FileSystemRepository();
    const workspaceService = new WorkspaceService(fsRepo);
    const sampleProjectDir = path.join(testWorkspaceDir, 'test-project-1');

    it('should scaffold a complete Vite React project structure', async () => {
      await workspaceService.scaffoldWorkspace(sampleProjectDir, ProjectTemplates.VITE_REACT, 'test-vite-app');

      // Check key files
      const pkgJsonExists = await fsRepo.exists(path.join(sampleProjectDir, 'package.json'));
      const appJsxExists = await fsRepo.exists(path.join(sampleProjectDir, 'src/App.jsx'));
      const viteConfigExists = await fsRepo.exists(path.join(sampleProjectDir, 'vite.config.js'));

      assert.equal(pkgJsonExists, true);
      assert.equal(appJsxExists, true);
      assert.equal(viteConfigExists, true);
    });

    it('should read file content correctly', async () => {
      const fileData = await workspaceService.readFile(sampleProjectDir, 'package.json');
      assert.equal(typeof fileData.content, 'string');
      const parsed = JSON.parse(fileData.content);
      assert.equal(parsed.name, 'test-vite-app');
    });

    it('should write file safely and update file content', async () => {
      await workspaceService.writeFile(sampleProjectDir, 'src/test.txt', 'Hello Kodra Sandbox!');
      const readBack = await workspaceService.readFile(sampleProjectDir, 'src/test.txt');
      assert.equal(readBack.content, 'Hello Kodra Sandbox!');
    });

    it('should build hierarchical directory tree', async () => {
      const tree = await workspaceService.getFileTree(sampleProjectDir);
      assert.equal(tree.type, 'directory');
      assert.ok(Array.isArray(tree.children));
      const hasSrc = tree.children.some(c => c.name === 'src' && c.type === 'directory');
      const hasPkg = tree.children.some(c => c.name === 'package.json' && c.type === 'file');
      assert.equal(hasSrc, true);
      assert.equal(hasPkg, true);
    });

    it('should clean up test directory after run', async () => {
      await fsRepo.deleteDirectory(testWorkspaceDir);
      const exists = await fsRepo.exists(testWorkspaceDir);
      assert.equal(exists, false);
    });
  });
});
