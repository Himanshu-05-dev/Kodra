/**
 * @file project_management.test.js
 * Test Suite for Phase 10: Project Management, Rename, Cloning, and ZIP Export.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ProjectService } from '../src/services/ProjectService.js';
import { WorkspaceService } from '../src/services/WorkspaceService.js';
import { FileSystemRepository } from '../src/repositories/FileSystemRepository.js';
import { ProjectTemplates, ProjectStatus } from '@kodra/shared';
import { ValidationError, ConflictError, ForbiddenError, NotFoundError } from '../src/utils/AppError.js';

class MockProjectRepository {
  constructor() {
    this.projects = new Map();
  }

  async create(data) {
    const doc = { ...data, _id: data._id.toString(), createdAt: new Date(), updatedAt: new Date() };
    this.projects.set(doc._id, doc);
    return doc;
  }

  async findById(id) {
    return this.projects.get(id?.toString()) || null;
  }

  async findByOwnerAndName(ownerId, name) {
    for (const p of this.projects.values()) {
      if (p.ownerId === ownerId && p.name === name) return p;
    }
    return null;
  }

  async listByOwner(ownerId) {
    const list = Array.from(this.projects.values()).filter(p => p.ownerId === ownerId);
    return { projects: list, total: list.length };
  }

  async updateById(id, updateData) {
    const p = this.projects.get(id?.toString());
    if (!p) return null;
    const updated = { ...p, ...updateData, updatedAt: new Date() };
    this.projects.set(id.toString(), updated);
    return updated;
  }

  async deleteById(id) {
    const p = this.projects.get(id?.toString());
    if (p) this.projects.delete(id.toString());
    return p;
  }
}

class MockSandboxService {
  constructor() {
    this.stoppedProjects = [];
  }

  async stopSandbox(projectId) {
    this.stoppedProjects.push(projectId);
    return { projectId, status: 'stopped' };
  }
}

describe('Phase 10: Dashboard & Project Management Test Suite', () => {
  const testBaseDir = path.resolve('./server/test_workspaces_phase10');
  let fsRepo;
  let workspaceService;
  let projectRepo;
  let sandboxService;
  let projectService;

  before(async () => {
    await fs.mkdir(testBaseDir, { recursive: true });
    fsRepo = new FileSystemRepository();
    workspaceService = new WorkspaceService(fsRepo);
    projectRepo = new MockProjectRepository();
    sandboxService = new MockSandboxService();
    projectService = new ProjectService(projectRepo, workspaceService, fsRepo, sandboxService);
  });

  after(async () => {
    await fs.rm(testBaseDir, { recursive: true, force: true });
  });

  describe('1. Project Renaming & Metadata Updates', () => {
    let testProject;

    before(async () => {
      testProject = await projectService.createProject({
        name: 'app-to-rename',
        description: 'Original description',
        ownerId: 'user-alice',
        template: ProjectTemplates.VITE_REACT
      });
    });

    it('should rename project and update description successfully', async () => {
      const updated = await projectService.updateProject(
        testProject._id,
        { name: 'app-renamed', description: 'Updated description' },
        'user-alice'
      );

      assert.equal(updated.name, 'app-renamed');
      assert.equal(updated.description, 'Updated description');
    });

    it('should reject invalid project names with ValidationError', async () => {
      await assert.rejects(
        () => projectService.updateProject(testProject._id, { name: 'invalid name with spaces!' }, 'user-alice'),
        ValidationError
      );

      await assert.rejects(
        () => projectService.updateProject(testProject._id, { name: 'a' }, 'user-alice'),
        ValidationError
      );
    });

    it('should reject renaming to an already existing name for the same owner (ConflictError)', async () => {
      // Create second project for alice
      await projectService.createProject({
        name: 'alice-second-app',
        ownerId: 'user-alice',
        template: ProjectTemplates.VANILLA
      });

      await assert.rejects(
        () => projectService.updateProject(testProject._id, { name: 'alice-second-app' }, 'user-alice'),
        ConflictError
      );
    });

    it('should block non-owner from updating project (ForbiddenError)', async () => {
      await assert.rejects(
        () => projectService.updateProject(testProject._id, { name: 'hacked-name' }, 'user-bob'),
        ForbiddenError
      );
    });
  });

  describe('2. Project Cloning / Forking', () => {
    let originalProject;

    before(async () => {
      originalProject = await projectService.createProject({
        name: 'original-service',
        description: 'Template project to clone',
        ownerId: 'user-alice',
        template: ProjectTemplates.NODE_EXPRESS
      });

      // Add a custom test file in the original workspace
      await projectService.saveFileContent(originalProject._id, 'src/custom.js', 'console.log("hello cloned world");', 'user-alice');
    });

    it('should clone project with auto-generated copy name', async () => {
      const cloned = await projectService.cloneProject(originalProject._id, {}, 'user-alice');

      assert.ok(cloned);
      assert.notEqual(cloned._id, originalProject._id);
      assert.equal(cloned.name, 'original-service-copy');
      assert.equal(cloned.ownerId, 'user-alice');
      assert.equal(cloned.status, ProjectStatus.READY);

      // Verify custom file exists in cloned project workspace
      const customFile = await projectService.getFileContent(cloned._id, 'src/custom.js', 'user-alice');
      assert.equal(customFile.content, 'console.log("hello cloned world");');
    });

    it('should clone project with a specified custom name', async () => {
      const cloned = await projectService.cloneProject(
        originalProject._id,
        { name: 'custom-forked-app' },
        'user-alice'
      );

      assert.equal(cloned.name, 'custom-forked-app');
      assert.equal(cloned.ownerId, 'user-alice');
    });

    it('should prevent non-owner from cloning another user project', async () => {
      await assert.rejects(
        () => projectService.cloneProject(originalProject._id, {}, 'user-bob'),
        ForbiddenError
      );
    });
  });

  describe('3. Project ZIP Export', () => {
    let zipProject;

    before(async () => {
      zipProject = await projectService.createProject({
        name: 'zip-export-app',
        ownerId: 'user-alice',
        template: ProjectTemplates.VANILLA
      });
    });

    it('should create an archiver stream and export project files as ZIP', async () => {
      const { project, stream } = await projectService.getProjectExport(zipProject._id, 'user-alice');

      assert.equal(project.name, 'zip-export-app');
      assert.ok(stream);

      // Accumulate stream chunks to verify ZIP header magic bytes (PK\x03\x04)
      const chunks = [];
      await new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      assert.ok(buffer.length > 0, 'Exported ZIP buffer should not be empty');
      // Standard ZIP file signature: 0x50, 0x4B, 0x03, 0x04 ("PK\x03\x04")
      assert.equal(buffer[0], 0x50);
      assert.equal(buffer[1], 0x4B);
    });

    it('should forbid non-owner from downloading project ZIP', async () => {
      await assert.rejects(
        () => projectService.getProjectExport(zipProject._id, 'user-bob'),
        ForbiddenError
      );
    });
  });

  describe('4. Project Deletion & Cleanup', () => {
    it('should stop sandbox and delete physical files and database document', async () => {
      const deleteProj = await projectService.createProject({
        name: 'proj-to-delete',
        ownerId: 'user-alice',
        template: ProjectTemplates.VANILLA
      });

      const workspacePath = deleteProj.workspacePath;
      assert.ok(await fsRepo.exists(workspacePath), 'Workspace directory should exist before deletion');

      const result = await projectService.deleteProject(deleteProj._id, 'user-alice');
      assert.equal(result.deleted, true);

      // Directory should no longer exist
      assert.equal(await fsRepo.exists(workspacePath), false, 'Workspace directory should be removed');

      // Database record should be gone
      assert.equal(await projectRepo.findById(deleteProj._id), null);

      // Sandbox stop was invoked
      assert.ok(sandboxService.stoppedProjects.includes(deleteProj._id));
    });
  });
});
