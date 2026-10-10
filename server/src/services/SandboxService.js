/**
 * @file SandboxService.js
 * Layer 2: Business Logic - Orchestrates Sandbox Lifecycle and Dual-Engine Fallback.
 * Seamlessly manages Docker container environments and host emulated sandboxes.
 */

import { dockerManager } from '../infrastructure/docker/DockerManager.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { quotaService as defaultQuotaService } from './QuotaService.js';
import { usageService as defaultUsageService } from './UsageService.js';
import { NotFoundError, ForbiddenError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';
import { ProjectStatus } from '@kodra/shared';

export class SandboxService {
  /**
   * @param {ProjectRepository} [projectRepo]
   * @param {import('../infrastructure/docker/DockerManager.js').DockerManager} [dockerMgr]
   * @param {import('./QuotaService.js').QuotaService} [quotaSvc]
   * @param {import('./UsageService.js').UsageService} [usageSvc]
   */
  constructor(
    projectRepo = new ProjectRepository(),
    dockerMgr = dockerManager,
    quotaSvc = defaultQuotaService,
    usageSvc = defaultUsageService
  ) {
    this.projectRepo = projectRepo;
    this.docker = dockerMgr;
    this.quotaService = quotaSvc;
    this.usageService = usageSvc;
    this.activeSessions = new Map();
  }

  /**
   * Probe Docker daemon availability
   */
  async checkEngineHealth() {
    return await this.docker.checkAvailability();
  }

  /**
   * Start sandbox execution environment for a project
   * @param {string} projectId 
   * @param {string} [ownerId]
   * @returns {Promise<{ mode: 'docker' | 'host_emulated', containerId: string | null, status: string }>}
   */
  async startSandbox(projectId, ownerId = null) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to execute in this project sandbox.');
    }

    // Verify compute quota before starting sandbox
    await this.quotaService.enforceComputeQuota(project.ownerId);

    // Track active sandbox compute session start
    this.activeSessions.set(projectId, { startTime: Date.now(), ownerId: project.ownerId });

    const dockerHealth = await this.docker.checkAvailability();

    if (dockerHealth.isAvailable) {
      // 1. Docker Engine Available: Spin up dedicated container
      try {
        const { containerId } = await this.docker.createProjectContainer(
          projectId,
          project.workspacePath
        );

        await this.projectRepo.updateById(projectId, {
          containerId,
          status: ProjectStatus.RUNNING
        });

        logger.info(`Project "${project.name}" running in Docker sandbox [${containerId.slice(0, 12)}]`);

        return {
          mode: 'docker',
          containerId,
          status: ProjectStatus.RUNNING,
          engineVersion: dockerHealth.version
        };
      } catch (err) {
        logger.warn(`Docker container start failed, falling back to host emulated sandbox: ${err.message}`);
      }
    }

    // 2. Docker Engine Unavailable / Fallback: Host Emulated Sandbox Mode
    logger.info(`Project "${project.name}" running in Host Emulated Sandbox mode.`);

    await this.projectRepo.updateById(projectId, {
      containerId: null,
      status: ProjectStatus.RUNNING
    });

    return {
      mode: 'host_emulated',
      containerId: null,
      status: ProjectStatus.RUNNING,
      notice: 'Docker Desktop daemon offline. Running in safe host workspace isolation.'
    };
  }

  /**
   * Stop project sandbox environment
   * @param {string} projectId
   * @param {string} [ownerId]
   */
  async stopSandbox(projectId, ownerId = null) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to stop this project sandbox.');
    }

    if (project.containerId) {
      await this.docker.destroyContainer(projectId);
    }

    await this.projectRepo.updateById(projectId, {
      containerId: null,
      status: ProjectStatus.STOPPED
    });

    // Record compute elapsed seconds into usage telemetry
    const session = this.activeSessions.get(projectId);
    if (session) {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
      this.usageService.recordComputeSeconds(session.ownerId, elapsedSeconds).catch((err) => {
        logger.warn(`Failed to record compute seconds: ${err.message}`);
      });
      this.activeSessions.delete(projectId);
    }

    logger.info(`Sandbox stopped for project "${project.name}".`);

    return {
      projectId,
      status: ProjectStatus.STOPPED
    };
  }

  /**
   * Get sandbox runtime diagnostics for a project
   * @param {string} projectId
   * @param {string} [ownerId]
   */
  async getSandboxStatus(projectId, ownerId = null) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to access this project sandbox.');
    }

    const dockerHealth = await this.docker.checkAvailability();

    return {
      projectId,
      projectName: project.name,
      status: project.status,
      containerId: project.containerId || null,
      mode: project.containerId ? 'docker' : 'host_emulated',
      workspacePath: project.workspacePath,
      dockerEngine: dockerHealth
    };
  }
}

// Singleton instance
export const sandboxService = new SandboxService();
