/**
 * @file PreviewService.js
 * Layer 2: Business Logic - Manages Project Preview Status, Port Detection, and Proxy Target Resolution.
 * Zero HTTP/WS dependencies; pure application business logic.
 */

import net from 'node:net';
import { config } from '../config/index.js';
import { logger } from '../infrastructure/logger/logger.js';
import { dockerManager } from '../infrastructure/docker/DockerManager.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/AppError.js';

export class PreviewService {
  /**
   * @param {ProjectRepository} [projectRepo]
   * @param {import('../infrastructure/docker/DockerManager.js').DockerManager} [dockerMgr]
   */
  constructor(projectRepo = new ProjectRepository(), dockerMgr = dockerManager) {
    this.projectRepo = projectRepo;
    this.docker = dockerMgr;

    // Cache of target URLs for lightning-fast proxy routing (projectId -> { targetUrl, expiresAt })
    this.targetUrlCache = new Map();

    // Standard dev candidate ports in probing priority order
    this.candidatePorts = [5173, 3000, 8080, 4173, 8000, 5001, 5174, 3001];
  }

  /**
   * Fast TCP probe to check if a port is listening on host
   * @param {number} port 
   * @param {string} [host='127.0.0.1'] 
   * @param {number} [timeoutMs=300] 
   * @returns {Promise<boolean>}
   */
  async probePort(port, host = '127.0.0.1', timeoutMs = 300) {
    if (!port || port < 1 || port > 65535) return false;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let connected = false;

      socket.setTimeout(timeoutMs);

      socket.once('connect', () => {
        connected = true;
        socket.destroy();
        resolve(true);
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });

      try {
        socket.connect(port, host);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Get preview diagnostic status for a project
   * Checks both configured and candidate ports, probes active dev servers, and generates URLs.
   * @param {string} projectId 
   * @param {string} [ownerId]
   * @returns {Promise<{
   *   projectId: string,
   *   isRunning: boolean,
   *   port: number,
   *   hostPort: number | null,
   *   mode: 'docker' | 'host_emulated',
   *   previewUrl: string,
   *   directUrl: string,
   *   proxyPathUrl: string,
   *   availablePorts: number[]
   * }>}
   */
  async getPreviewStatus(projectId, ownerId = null) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to access this project preview.');
    }

    const isDocker = Boolean(project.containerId);
    const configuredPort = project.ports?.dev || null;

    // Build unique ordered list of ports to probe
    const portsToProbe = Array.from(
      new Set(configuredPort ? [configuredPort, ...this.candidatePorts] : this.candidatePorts)
    );

    const activePorts = [];
    let detectedDevPort = null;
    let detectedHostPort = null;

    if (isDocker) {
      // In Docker mode, find mapped host port for each container port and probe
      const portMappings = await this.docker.getContainerPortMappings(project.containerId);

      for (const containerPort of portsToProbe) {
        const mappedHostPort = portMappings[containerPort];
        if (mappedHostPort) {
          const isAlive = await this.probePort(mappedHostPort);
          if (isAlive) {
            activePorts.push(containerPort);
            if (!detectedDevPort) {
              detectedDevPort = containerPort;
              detectedHostPort = mappedHostPort;
            }
          }
        }
      }
    } else {
      // In host emulated mode, probe localhost ports directly
      for (const port of portsToProbe) {
        const isAlive = await this.probePort(port);
        if (isAlive) {
          activePorts.push(port);
          if (!detectedDevPort) {
            detectedDevPort = port;
            detectedHostPort = port;
          }
        }
      }
    }

    const isRunning = activePorts.length > 0;
    const finalDevPort = detectedDevPort || configuredPort || 5173;
    const finalHostPort = detectedHostPort || (isDocker ? null : finalDevPort);

    // If an active port was detected and differs from DB, update DB asynchronously
    if (detectedDevPort && detectedDevPort !== configuredPort) {
      this.projectRepo.updateById(projectId, {
        'ports.dev': detectedDevPort
      }).catch((err) => {
        logger.warn(`Failed to update project dev port in DB: ${err.message}`);
      });
    }

    // Cache target proxy URL
    if (finalHostPort) {
      this.targetUrlCache.set(projectId, {
        targetUrl: `http://127.0.0.1:${finalHostPort}`,
        expiresAt: Date.now() + 5000 // 5-second TTL
      });
    }

    const hostAddress = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;
    const portSuffix = config.server.port === 80 ? '' : `:${config.server.port}`;

    const previewUrl = `http://${projectId}.${config.preview.baseDomain}${portSuffix}`;
    const directUrl = finalHostPort ? `http://localhost:${finalHostPort}` : `http://localhost:${finalDevPort}`;
    const proxyPathUrl = `http://${hostAddress}${portSuffix}/preview/${projectId}`;

    return {
      projectId,
      isRunning,
      port: finalDevPort,
      hostPort: finalHostPort,
      mode: isDocker ? 'docker' : 'host_emulated',
      previewUrl,
      directUrl,
      proxyPathUrl,
      availablePorts: activePorts
    };
  }

  /**
   * Set custom dev server port for a project
   * @param {string} projectId 
   * @param {number} port 
   * @param {string} [ownerId]
   */
  async setPreviewPort(projectId, port, ownerId = null) {
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 1024 || parsedPort > 65535) {
      throw new ValidationError('Port must be a valid number between 1024 and 65535.');
    }

    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to modify this project preview port.');
    }

    await this.projectRepo.updateById(projectId, {
      'ports.dev': parsedPort
    });

    // Invalidate target URL cache
    this.targetUrlCache.delete(projectId);

    logger.info(`Updated dev port for project [${projectId}] to ${parsedPort}`);

    return await this.getPreviewStatus(projectId, ownerId);
  }

  /**
   * Actively scan and detect active ports for project
   * @param {string} projectId 
   * @param {string} [ownerId]
   */
  async detectPreviewPort(projectId, ownerId = null) {
    // Invalidate target URL cache to force fresh probe
    this.targetUrlCache.delete(projectId);
    return await this.getPreviewStatus(projectId, ownerId);
  }

  /**
   * Resolve target proxy URL for reverse proxy (used by PreviewProxyGateway)
   * High performance with in-memory caching.
   * @param {string} projectId 
   * @returns {Promise<string>} e.g. "http://127.0.0.1:5173"
   */
  async getTargetProxyUrl(projectId) {
    const cached = this.targetUrlCache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.targetUrl;
    }

    const status = await this.getPreviewStatus(projectId);
    const targetUrl = status.hostPort
      ? `http://127.0.0.1:${status.hostPort}`
      : `http://127.0.0.1:${status.port}`;

    this.targetUrlCache.set(projectId, {
      targetUrl,
      expiresAt: Date.now() + 4000
    });

    return targetUrl;
  }
}

// Singleton PreviewService instance
export const previewService = new PreviewService();
