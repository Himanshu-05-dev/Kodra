/**
 * @file sandbox.test.js
 * Automated validation suite for Phase 4: Docker Sandbox Engine & Dual-Engine Fallback.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { dockerManager } from '../src/infrastructure/docker/DockerManager.js';
import { SandboxService } from '../src/services/SandboxService.js';
import { ProjectStatus } from '@kodra/shared';

describe('Phase 4: Docker Sandbox Engine Test Suite', () => {

  describe('1. DockerManager Infrastructure Adapter', () => {
    it('should probe Docker daemon availability without throwing exceptions', async () => {
      const health = await dockerManager.checkAvailability();
      assert.equal(typeof health, 'object');
      assert.equal(typeof health.isAvailable, 'boolean');
      if (!health.isAvailable) {
        assert.equal(typeof health.error, 'string');
      }
    });

    it('should format host volume paths cleanly across OS platforms', () => {
      // @ts-ignore
      const bind = dockerManager._formatBindPath('D:\\projects\\CODRA\\server\\workspaces\\test');
      assert.ok(!bind.includes('\\'), 'Formatted bind path should not contain backslashes');
      assert.ok(bind.includes('/workspaces/test'));
    });
  });

  describe('2. SandboxService Dual-Engine Orchestration', () => {
    let mockProject = {
      _id: 'proj-sandbox-test-1',
      name: 'sandbox-test-app',
      workspacePath: process.cwd(),
      status: ProjectStatus.CREATED,
      containerId: null
    };

    const mockProjectRepo = {
      findById: async (id) => (id === mockProject._id ? mockProject : null),
      updateById: async (id, update) => {
        mockProject = { ...mockProject, ...update };
        return mockProject;
      }
    };

    const service = new SandboxService(mockProjectRepo, dockerManager);

    it('should check engine health cleanly', async () => {
      const health = await service.checkEngineHealth();
      assert.equal(typeof health.isAvailable, 'boolean');
    });

    it('should start sandbox and update project status to RUNNING', async () => {
      const result = await service.startSandbox(mockProject._id);
      assert.equal(result.status, ProjectStatus.RUNNING);
      assert.ok(result.mode === 'docker' || result.mode === 'host_emulated');
      assert.equal(mockProject.status, ProjectStatus.RUNNING);
    });

    it('should query sandbox status diagnostics', async () => {
      const status = await service.getSandboxStatus(mockProject._id);
      assert.equal(status.projectId, mockProject._id);
      assert.equal(status.status, ProjectStatus.RUNNING);
      assert.ok(status.workspacePath.length > 0);
      assert.equal(typeof status.dockerEngine.isAvailable, 'boolean');
    });

    it('should stop sandbox cleanly and set status to STOPPED', async () => {
      const result = await service.stopSandbox(mockProject._id);
      assert.equal(result.status, ProjectStatus.STOPPED);
      assert.equal(mockProject.status, ProjectStatus.STOPPED);
      assert.equal(mockProject.containerId, null);
    });
  });
});
