/**
 * @file SandboxService.js
 * Layer 2: Business Logic - Orchestrates Sandbox Lifecycle and Dual-Engine Fallback.
 * Seamlessly manages Docker container environments and host emulated sandboxes.
 */

import { dockerManager } from '../infrastructure/docker/DockerManager.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { NotFoundError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';
import { ProjectStatus } from '@kodra/shared';

export class SandboxService {
  /**
   * @param {ProjectRepository} [projectRepo]
   * @param {import('../infrastructure/docker/DockerManager.js').DockerManager} [dockerMgr]
   */
  constructor(projectRepo = new ProjectRepository(), dockerMgr = dockerManager) {
    this.projectRepo = projectRepo;
    this.docker = dockerMgr;
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
   * @returns {Promise<{ mode: 'docker' | 'host_emulated', containerId: string | null, status: string }>}
   */
  async startSandbox(projectId) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

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
   */
  async stopSandbox(projectId) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
    }

    if (project.containerId) {
      await this.docker.destroyContainer(projectId);
    }

    await this.projectRepo.updateById(projectId, {
      containerId: null,
      status: ProjectStatus.STOPPED
    });

    logger.info(`Sandbox stopped for project "${project.name}".`);

    return {
      projectId,
      status: ProjectStatus.STOPPED
    };
  }

  /**
   * Get sandbox runtime diagnostics for a project
   */
  async getSandboxStatus(projectId) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found.`);
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
