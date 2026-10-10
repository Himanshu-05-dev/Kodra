/**
 * @file git.test.js
 * Test Suite for Phase 12: Git Version Control Operations and Remote Cloning.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { GitService } from '../src/services/GitService.js';
import { ProjectService } from '../src/services/ProjectService.js';
import { WorkspaceService } from '../src/services/WorkspaceService.js';
import { FileSystemRepository } from '../src/repositories/FileSystemRepository.js';
import { ProjectTemplates, ProjectStatus } from '@kodra/shared';
import { ValidationError, ForbiddenError } from '../src/utils/AppError.js';

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

describe('Phase 12: Git Integration & Git Operations Test Suite', () => {
  const testBaseDir = path.resolve('./server/test_workspaces_git');
  let fsRepo;
  let workspaceService;
  let gitService;
  let projectRepo;
  let projectService;
  let workspacePath;

  before(async () => {
    await fs.mkdir(testBaseDir, { recursive: true });
    fsRepo = new FileSystemRepository();
    workspaceService = new WorkspaceService(fsRepo);
    gitService = new GitService();
    projectRepo = new MockProjectRepository();
    projectService = new ProjectService(projectRepo, workspaceService, fsRepo, null, gitService);

    workspacePath = path.join(testBaseDir, 'test-git-project');
    await fs.mkdir(workspacePath, { recursive: true });
    // Write an initial file
    await fs.writeFile(path.join(workspacePath, 'README.md'), '# Test Git Project\nInitial README.\n');
  });

  after(async () => {
    await fs.rm(testBaseDir, { recursive: true, force: true });
  });

  describe('1. Git Repository Initialization & Status', () => {
    it('should initialize git repo with main branch and configure author', async () => {
      const initResult = await gitService.initRepo(workspacePath);
      assert.equal(initResult.initialized, true);
      assert.equal(await gitService.isGitRepo(workspacePath), true);
    });

    it('should detect untracked README file in getStatus', async () => {
      const status = await gitService.getStatus(workspacePath);
      assert.equal(status.isRepo, true);
      assert.ok(status.branch.length > 0);
      assert.equal(status.isClean, false);
      assert.ok(status.untracked.some(f => f.path === 'README.md'));
    });
  });

  describe('2. Staging, Committing & History', () => {
    it('should stage files with stageFiles', async () => {
      const status = await gitService.stageFiles(workspacePath, ['README.md']);
      assert.ok(status.staged.some(f => f.path === 'README.md'));
    });

    it('should unstage files with unstageFiles', async () => {
      const status = await gitService.unstageFiles(workspacePath, ['README.md']);
      assert.equal(status.staged.length, 0);
      assert.ok(status.untracked.some(f => f.path === 'README.md'));
    });

    it('should reject commit if message is empty', async () => {
      await assert.rejects(
        () => gitService.commit(workspacePath, { message: '  ' }),
        ValidationError
      );
    });

    it('should stage all and commit with valid message', async () => {
      const result = await gitService.commit(workspacePath, { message: 'feat: initial commit' });
      assert.ok(result.hash);
      assert.equal(result.message, 'feat: initial commit');

      // Status should now be clean
      const status = await gitService.getStatus(workspacePath);
      assert.equal(status.isClean, true);
    });

    it('should return recent commit history with getHistory', async () => {
      const history = await gitService.getHistory(workspacePath, 5);
      assert.ok(history.length >= 1);
      assert.equal(history[0].message, 'feat: initial commit');
    });
  });

  describe('3. File Modifications & Git Diff', () => {
    before(async () => {
      // Modify README.md
      await fs.writeFile(path.join(workspacePath, 'README.md'), '# Test Git Project\nUpdated content for diff test.\n');
    });

    it('should detect unstaged diff in getDiff', async () => {
      const diffResult = await gitService.getDiff(workspacePath, { staged: false });
      assert.ok(diffResult.diff.includes('Updated content for diff test'));
    });

    it('should generate intelligent conventional commit message from diff', () => {
      const message = gitService.generateCommitMessage('+ const [data, setData] = useState();', [{ path: 'src/components/Card.jsx', status: 'modified' }]);
      assert.ok(message.startsWith('feat(ui):'));
      assert.ok(message.includes('Card'));
    });
  });

  describe('4. Branching & Checkout', () => {
    it('should list current branch with getBranches', async () => {
      const branches = await gitService.getBranches(workspacePath);
      assert.ok(branches.current);
      assert.ok(branches.branches.includes(branches.current));
    });

    it('should create and checkout a new branch', async () => {
      const result = await gitService.checkoutBranch(workspacePath, { branch: 'feat-ai-agent', create: true });
      assert.equal(result.current, 'feat-ai-agent');

      const branches = await gitService.getBranches(workspacePath);
      assert.equal(branches.current, 'feat-ai-agent');
      assert.ok(branches.branches.includes('feat-ai-agent'));
    });
  });

  describe('5. Remote Repository Cloning & Project Import', () => {
    it('should clone a local repository as a remote into a new project workspace', async () => {
      // workspacePath acts as the remote repo for this test!
      const project = await projectService.importGitProject({
        url: `file://${workspacePath.replace(/\\/g, '/')}`,
        name: 'imported-repo',
        description: 'Test imported project',
        ownerId: 'user-alice'
      });

      assert.ok(project);
      assert.equal(project.name, 'imported-repo');
      assert.equal(project.ownerId, 'user-alice');
      assert.equal(project.status, ProjectStatus.READY);

      // Verify cloned files exist in the imported project
      const readmeExists = await fsRepo.exists(path.join(project.workspacePath, 'README.md'));
      assert.equal(readmeExists, true);
    });

    it('should reject invalid repository URLs with ValidationError', async () => {
      await assert.rejects(
        () => projectService.importGitProject({ url: 'invalid-url-format', ownerId: 'user-alice' }),
        ValidationError
      );
    });
  });
});
