/**
 * @file preview.test.js
 * Automated validation suite for Phase 8: Live Preview Gateway & Reverse Proxy.
 * Tests port mapping, preview status detection, reverse proxy routing, and error pages.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';

import { DockerManager } from '../src/infrastructure/docker/DockerManager.js';
import { PreviewService } from '../src/services/PreviewService.js';
import { PreviewProxyGateway } from '../src/gateways/PreviewProxyGateway.js';
import { ValidationError, NotFoundError } from '../src/utils/AppError.js';

describe('Phase 8: Live Preview Gateway & Reverse Proxy Test Suite', () => {

  describe('1. Docker Sandbox Dynamic Port Mappings', () => {
    it('should declare common development ports to expose', () => {
      assert.ok(Array.isArray(DockerManager.COMMON_DEV_PORTS));
      assert.ok(DockerManager.COMMON_DEV_PORTS.includes(5173));
      assert.ok(DockerManager.COMMON_DEV_PORTS.includes(3000));
      assert.ok(DockerManager.COMMON_DEV_PORTS.includes(8080));
    });

    it('should extract host port mappings from container inspection data', async () => {
      const dockerMgr = new DockerManager();
      
      // Mock Docker client inspect result
      dockerMgr.docker = {
        getContainer: (id) => ({
          inspect: async () => ({
            NetworkSettings: {
              Ports: {
                '5173/tcp': [{ HostIp: '0.0.0.0', HostPort: '32780' }],
                '3000/tcp': [{ HostIp: '0.0.0.0', HostPort: '32781' }],
                '8080/tcp': null
              }
            }
          })
        })
      };

      const mappings = await dockerMgr.getContainerPortMappings('mock-container-123');
      assert.equal(mappings[5173], 32780);
      assert.equal(mappings[3000], 32781);
      assert.equal(mappings[8080], undefined);

      const hostPort = await dockerMgr.getContainerHostPort('mock-container-123', 5173);
      assert.equal(hostPort, 32780);
    });
  });

  describe('2. PreviewService Diagnostics & Port Probing', () => {
    it('should probe active listening port cleanly via TCP probe', async () => {
      const previewService = new PreviewService();

      // Start a temporary HTTP server on an ephemeral port
      const tempServer = http.createServer((req, res) => res.end('ok'));
      await new Promise((resolve) => tempServer.listen(0, '127.0.0.1', resolve));
      const testPort = tempServer.address().port;

      try {
        const isListening = await previewService.probePort(testPort, '127.0.0.1', 500);
        assert.equal(isListening, true);

        // Check an inactive port
        const isClosed = await previewService.probePort(testPort + 2000, '127.0.0.1', 100);
        assert.equal(isClosed, false);
      } finally {
        await new Promise((resolve) => tempServer.close(resolve));
      }
    });

    it('should return preview status for a mock project', async () => {
      const mockProject = {
        _id: 'proj-preview-test-1',
        name: 'test-app',
        containerId: null,
        ports: { dev: 5173, preview: 5173 }
      };

      const mockRepo = {
        findById: async (id) => (id === mockProject._id ? mockProject : null),
        updateById: async () => mockProject
      };

      const previewService = new PreviewService(mockRepo);
      const status = await previewService.getPreviewStatus('proj-preview-test-1');

      assert.equal(status.projectId, 'proj-preview-test-1');
      assert.equal(typeof status.isRunning, 'boolean');
      assert.equal(status.mode, 'host_emulated');
      assert.ok(status.previewUrl.includes('proj-preview-test-1'));
      assert.ok(status.directUrl.includes('localhost'));
    });

    it('should validate and update custom dev port with setPreviewPort', async () => {
      let savedPort = null;
      const mockProject = {
        _id: 'proj-port-test-2',
        name: 'test-app',
        containerId: null,
        ports: { dev: 5173 }
      };

      const mockRepo = {
        findById: async (id) => mockProject,
        updateById: async (id, update) => {
          savedPort = update['ports.dev'];
          mockProject.ports.dev = savedPort;
          return mockProject;
        }
      };

      const previewService = new PreviewService(mockRepo);

      // Invalid port should throw ValidationError
      await assert.rejects(
        async () => await previewService.setPreviewPort('proj-port-test-2', 99999),
        ValidationError
      );
      await assert.rejects(
        async () => await previewService.setPreviewPort('proj-port-test-2', -5),
        ValidationError
      );

      // Valid port 3000
      const updated = await previewService.setPreviewPort('proj-port-test-2', 3000);
      assert.equal(savedPort, 3000);
      assert.equal(updated.port, 3000);
    });

    it('should cache and return target proxy URL', async () => {
      const mockProject = {
        _id: 'proj-target-3',
        name: 'app',
        containerId: null,
        ports: { dev: 4173 }
      };

      const mockRepo = {
        findById: async () => mockProject,
        updateById: async () => mockProject
      };

      const previewService = new PreviewService(mockRepo);
      const targetUrl = await previewService.getTargetProxyUrl('proj-target-3');
      assert.equal(targetUrl, 'http://127.0.0.1:4173');

      // Verify cached response
      assert.ok(previewService.targetUrlCache.has('proj-target-3'));
      const cachedUrl = await previewService.getTargetProxyUrl('proj-target-3');
      assert.equal(cachedUrl, 'http://127.0.0.1:4173');
    });
  });

  describe('3. PreviewProxyGateway Identifier Extraction & Routing', () => {
    const gateway = new PreviewProxyGateway();

    it('should extract projectId from subdomain preview.localhost', () => {
      const req = {
        headers: { host: '65f1a2b3c4d5.preview.localhost:5000' },
        url: '/'
      };
      const projectId = gateway.extractProjectId(req);
      assert.equal(projectId, '65f1a2b3c4d5');
    });

    it('should extract projectId from .localhost host', () => {
      const req = {
        headers: { host: 'myproject.localhost:5000' },
        url: '/'
      };
      const projectId = gateway.extractProjectId(req);
      assert.equal(projectId, 'myproject');
    });

    it('should extract projectId from path prefix /preview/:id', () => {
      const req = {
        headers: { host: 'localhost:5000' },
        url: '/preview/project-abc-123/src/App.jsx'
      };
      const projectId = gateway.extractProjectId(req);
      assert.equal(projectId, 'project-abc-123');
    });

    it('should extract projectId from x-kodra-project-id header', () => {
      const req = {
        headers: {
          host: 'localhost:5000',
          'x-kodra-project-id': 'custom-id-999'
        },
        url: '/'
      };
      const projectId = gateway.extractProjectId(req);
      assert.equal(projectId, 'custom-id-999');
    });

    it('should extract projectId from referer header for asset requests', () => {
      const req = {
        headers: {
          host: 'localhost:5000',
          referer: 'http://localhost:5000/preview/proj-ref-456/'
        },
        url: '/@vite/client'
      };
      const projectId = gateway.extractProjectId(req);
      assert.equal(projectId, 'proj-ref-456');
    });

    it('should extract projectId from cookie fallback', () => {
      const req = {
        headers: {
          host: 'localhost:5000',
          cookie: 'session=xyz; kodra_preview_project=proj-cookie-789'
        },
        url: '/src/main.jsx'
      };
      const projectId = gateway.extractProjectId(req);
      assert.equal(projectId, 'proj-cookie-789');
    });

    it('should identify preview requests correctly', () => {
      assert.equal(gateway.isPreviewRequest({
        headers: { host: 'demo.preview.localhost:5000' },
        url: '/'
      }), true);

      assert.equal(gateway.isPreviewRequest({
        headers: { host: 'localhost:5000' },
        url: '/preview/demo/'
      }), true);

      assert.equal(gateway.isPreviewRequest({
        headers: { host: 'localhost:5000' },
        url: '/api/v1/projects'
      }), false);
    });

    it('should generate an informative offline fallback HTML page with auto-refresh', () => {
      const html = gateway._renderOfflineHtml('proj-offline-1', 5173);
      assert.ok(html.includes('Dev Server Offline'));
      assert.ok(html.includes('npm run dev'));
      assert.ok(html.includes('5173'));
      assert.ok(html.includes('meta http-equiv="refresh" content="3"'));
    });
  });

});
