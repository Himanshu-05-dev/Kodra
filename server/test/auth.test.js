/**
 * @file auth.test.js
 * Automated validation suite for Phase 9: Authentication & Multi-User Scoping.
 * Tests Firebase Auth adapter, middleware, user-scoped data isolation, and WebSocket auth.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FirebaseAuthAdapter } from '../src/infrastructure/auth/FirebaseAuthAdapter.js';
import { authenticate, requireAuth, verifySocketToken } from '../src/middleware/authMiddleware.js';
import { ProjectService } from '../src/services/ProjectService.js';
import { SandboxService } from '../src/services/SandboxService.js';
import { UnauthorizedError, ForbiddenError } from '../src/utils/AppError.js';
import { ProjectTemplates, ProjectStatus } from '@kodra/shared';

describe('Phase 9: Authentication & Multi-User Scoping Test Suite', () => {

  describe('1. FirebaseAuthAdapter Infrastructure Adapter', () => {
    const adapter = new FirebaseAuthAdapter();

    it('should reject missing or empty token with UnauthorizedError', async () => {
      await assert.rejects(
        async () => await adapter.verifyIdToken(''),
        UnauthorizedError
      );
      await assert.rejects(
        async () => await adapter.verifyIdToken(null),
        UnauthorizedError
      );
      await assert.rejects(
        async () => await adapter.verifyIdToken('   '),
        UnauthorizedError
      );
    });

    it('should parse standard dev token correctly', async () => {
      const user = await adapter.verifyIdToken('dev-token');
      assert.equal(user.uid, 'dev-user-001');
      assert.equal(user.email, 'dev-user-001@kodra.local');
      assert.equal(user.name, 'Dev Engineer');
      assert.equal(user.emailVerified, true);
    });

    it('should parse custom scoped dev token format (dev-token:uid:email:name)', async () => {
      const user = await adapter.verifyIdToken('dev-token:user-alice:alice@kodra.ai:Alice Developer');
      assert.equal(user.uid, 'user-alice');
      assert.equal(user.email, 'alice@kodra.ai');
      assert.equal(user.name, 'Alice Developer');
      assert.equal(user.emailVerified, true);
    });

    it('should decode base64 mock tokens in dev fallback mode', async () => {
      const payload = { uid: 'user-bob-99', email: 'bob@example.com', name: 'Bob Engineer' };
      const base64Token = Buffer.from(JSON.stringify(payload)).toString('base64');

      const user = await adapter.verifyIdToken(base64Token);
      assert.equal(user.uid, 'user-bob-99');
      assert.equal(user.email, 'bob@example.com');
      assert.equal(user.name, 'Bob Engineer');
    });
  });

  describe('2. Auth Middleware Execution & Header Extraction', () => {
    it('should authenticate request with valid Bearer token and attach req.user', async () => {
      const req = {
        headers: {
          authorization: 'Bearer dev-token:user-carol:carol@test.com:Carol'
        }
      };
      const res = {};
      let nextCalled = false;

      await authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(req.user.uid, 'user-carol');
      assert.equal(req.user.email, 'carol@test.com');
      assert.equal(req.userId, 'user-carol');
    });

    it('should reject malformed authorization header (missing Bearer prefix)', async () => {
      const req = {
        headers: {
          authorization: 'Token dev-token:user-carol'
        }
      };
      const res = {};
      let caughtError = null;

      await authenticate(req, res, (err) => { caughtError = err; });

      assert.ok(caughtError instanceof UnauthorizedError);
      assert.ok(caughtError.message.includes('Bearer'));
    });

    it('should allow dev anonymous fallback when auth is disabled and no token is passed', async () => {
      const req = {
        headers: {
          'x-user-id': 'custom-dev-id'
        }
      };
      const res = {};
      let nextCalled = false;

      await authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(req.user.uid, 'custom-dev-id');
      assert.equal(req.userId, 'custom-dev-id');
    });

    it('requireAuth should reject requests missing authorization header', async () => {
      const req = { headers: {} };
      const res = {};
      let caughtError = null;

      await requireAuth(req, res, (err) => { caughtError = err; });

      assert.ok(caughtError instanceof UnauthorizedError);
    });

    it('should verify WebSocket tokens via verifySocketToken', async () => {
      const user = await verifySocketToken('dev-token:ws-user-1:ws@kodra.ai:WS User');
      assert.equal(user.uid, 'ws-user-1');
      assert.equal(user.email, 'ws@kodra.ai');
    });
  });

  describe('3. Multi-User Scoping & Ownership Isolation', () => {
    // In-memory mock repositories
    const mockDb = new Map();

    const mockProjectRepo = {
      create: async (data) => {
        mockDb.set(data._id.toString(), { ...data });
        return { ...data };
      },
      findById: async (id) => mockDb.get(id.toString()) || null,
      findByOwnerAndName: async (ownerId, name) => {
        return Array.from(mockDb.values()).find((p) => p.ownerId === ownerId && p.name === name) || null;
      },
      listByOwner: async (ownerId) => {
        const userProjects = Array.from(mockDb.values()).filter((p) => p.ownerId === ownerId);
        return { projects: userProjects, total: userProjects.length };
      },
      deleteById: async (id) => {
        mockDb.delete(id.toString());
        return { deleted: true };
      },
      updateById: async (id, data) => {
        const existing = mockDb.get(id.toString());
        if (!existing) return null;
        const updated = { ...existing, ...data };
        mockDb.set(id.toString(), updated);
        return updated;
      }
    };

    const mockFs = {
      createDirectory: async () => {},
      deleteDirectory: async () => {},
      resolveSafePath: (base, rel) => `${base}/${rel}`,
      getStats: async () => ({ size: 50, mtime: new Date() }),
      readFile: async () => '// test code',
      writeFile: async () => {},
      deleteFile: async () => {},
      getDirectoryTree: async () => []
    };

    const mockWorkspaceService = {
      scaffoldWorkspace: async () => {},
      getFileTree: async () => [],
      readFile: async () => ({ content: 'code' }),
      writeFile: async () => ({ saved: true }),
      deleteFile: async () => {}
    };

    const projectService = new ProjectService(mockProjectRepo, mockWorkspaceService, mockFs);
    const sandboxService = new SandboxService(mockProjectRepo, {
      checkAvailability: async () => ({ isAvailable: false }),
      destroyContainer: async () => {}
    });

    it('should assign authenticated user as owner on project creation', async () => {
      const project = await projectService.createProject({
        name: 'alice-secret-app',
        description: 'Alice App',
        ownerId: 'user-alice',
        template: ProjectTemplates.VANILLA
      });

      assert.equal(project.ownerId, 'user-alice');
      assert.equal(project.name, 'alice-secret-app');
    });

    it('User Alice should successfully access her own project', async () => {
      const projects = await projectService.listProjects('user-alice');
      assert.equal(projects.total, 1);
      assert.equal(projects.projects[0].name, 'alice-secret-app');

      const project = await projectService.getProjectById(projects.projects[0]._id, 'user-alice');
      assert.equal(project.name, 'alice-secret-app');
    });

    it('User Bob should NOT be able to view, edit, or delete Alice project (ForbiddenError)', async () => {
      const aliceProjects = await projectService.listProjects('user-alice');
      const aliceProjectId = aliceProjects.projects[0]._id;

      // Bob tries to get Alice's project -> throws ForbiddenError (403)
      await assert.rejects(
        async () => await projectService.getProjectById(aliceProjectId, 'user-bob'),
        ForbiddenError
      );

      // Bob tries to delete Alice's project -> throws ForbiddenError (403)
      await assert.rejects(
        async () => await projectService.deleteProject(aliceProjectId, 'user-bob'),
        ForbiddenError
      );

      // Bob tries to save file in Alice's project -> throws ForbiddenError (403)
      await assert.rejects(
        async () => await projectService.saveFileContent(aliceProjectId, 'hack.js', 'alert(1)', 'user-bob'),
        ForbiddenError
      );
    });

    it('User Bob should NOT be able to start or stop Alice project sandbox', async () => {
      const aliceProjects = await projectService.listProjects('user-alice');
      const aliceProjectId = aliceProjects.projects[0]._id;

      // Bob tries to start sandbox in Alice's project
      await assert.rejects(
        async () => await sandboxService.startSandbox(aliceProjectId, 'user-bob'),
        ForbiddenError
      );

      // Bob tries to stop sandbox in Alice's project
      await assert.rejects(
        async () => await sandboxService.stopSandbox(aliceProjectId, 'user-bob'),
        ForbiddenError
      );
    });

    it('User Bob listing projects should return 0 projects (isolated tenant)', async () => {
      const bobProjects = await projectService.listProjects('user-bob');
      assert.equal(bobProjects.total, 0);
      assert.equal(bobProjects.projects.length, 0);
    });
  });

});
