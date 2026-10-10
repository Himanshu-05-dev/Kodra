/**
 * @file DockerManager.js
 * Layer 4: Infrastructure - Docker Engine Adapter via Dockerode.
 * Manages container lifecycles, resource quotas, volume bind-mounts, and PTY exec streams.
 */

import Docker from 'dockerode';
import path from 'node:path';
import { config } from '../../config/index.js';
import { logger } from '../logger/logger.js';
import { SecurityProfile } from './SecurityProfile.js';

export class DockerManager {
  constructor() {
    this.docker = this._initDockerClient();
    this.isAvailable = false;
    this.activeContainers = new Map(); // projectId -> containerId
    this.containerPorts = new Map(); // containerId -> { [containerPort]: hostPort }
  }

  /**
   * Common web dev ports exposed in sandbox containers
   */
  static get COMMON_DEV_PORTS() {
    return [5173, 3000, 8080, 4173, 8000, 5001];
  }

  /**
   * Initialize Dockerode with platform-aware socket/pipe auto-detection
   */
  _initDockerClient() {
    if (config.docker.socketPath) {
      return new Docker({ socketPath: config.docker.socketPath });
    }

    if (process.platform === 'win32') {
      // Docker Desktop for Windows Named Pipe
      return new Docker({ socketPath: '//./pipe/docker_engine' });
    }

    return new Docker({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * Probe Docker daemon availability
   * @returns {Promise<{ isAvailable: boolean, version?: string, error?: string }>}
   */
  async checkAvailability() {
    try {
      const ping = await this.docker.ping();
      this.isAvailable = (ping.toString().trim() === 'OK');
      const version = await this.docker.version().catch(() => null);

      return {
        isAvailable: true,
        version: version?.Version || 'active',
        platform: version?.Os || process.platform
      };
    } catch (err) {
      this.isAvailable = false;
      return {
        isAvailable: false,
        error: err.message
      };
    }
  }

  /**
   * Format host path for Docker volume mounting across Windows / Linux
   */
  _formatBindPath(hostPath) {
    const normalized = path.resolve(hostPath).replace(/\\/g, '/');
    return normalized;
  }

  /**
   * Create an isolated container for a project workspace
   * @param {string} projectId 
   * @param {string} workspacePath Host physical directory
   * @returns {Promise<{ containerId: string, container: Docker.Container }>}
   */
  async createProjectContainer(projectId, workspacePath) {
    const formattedBind = this._formatBindPath(workspacePath);
    const containerName = `kodra-box-${projectId}`;

    logger.info(`Creating Docker sandbox container [${containerName}] with volume ${formattedBind}:/workspace`);

    // Ensure image exists or pull if needed
    try {
      await this.docker.getImage(config.docker.baseImage).inspect();
    } catch {
      logger.info(`Pulling Docker base image "${config.docker.baseImage}"...`);
      await new Promise((resolve, reject) => {
        this.docker.pull(config.docker.baseImage, (err, stream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (pullErr) => {
            if (pullErr) return reject(pullErr);
            resolve();
          });
        });
      });
    }

    // Build ExposedPorts and PortBindings
    const exposedPorts = {};
    const portBindings = {};
    for (const p of DockerManager.COMMON_DEV_PORTS) {
      const key = `${p}/tcp`;
      exposedPorts[key] = {};
      portBindings[key] = [{ HostPort: '0' }]; // Dynamic ephemeral host port
    }

    // Configure container with security quotas and dynamic port mapping
    const container = await this.docker.createContainer({
      Image: config.docker.baseImage,
      name: containerName,
      WorkingDir: config.docker.workdir,
      User: config.docker.user,
      Tty: true,
      OpenStdin: true,
      Cmd: ['tail', '-f', '/dev/null'],
      Labels: {
        'kodra.project': projectId,
        'kodra.managed': 'true'
      },
      ExposedPorts: exposedPorts,
      HostConfig: SecurityProfile.getHardenedHostConfig({
        Binds: [`${formattedBind}:${config.docker.workdir}:rw`],
        PortBindings: portBindings,
        AutoRemove: true
      })
    });

    await container.start();
    this.activeContainers.set(projectId, container.id);
    logger.info(`Sandbox container started [${container.id.slice(0, 12)}] for project ${projectId}`);

    // Retrieve and cache dynamically assigned host ports
    const portMappings = await this.getContainerPortMappings(container.id);

    return {
      containerId: container.id,
      container,
      portMappings
    };
  }

  /**
   * Inspect container and extract dynamic host port mappings
   * @param {string} containerId 
   * @returns {Promise<Record<string, number>>} Map of containerPort -> hostPort
   */
  async getContainerPortMappings(containerId) {
    if (!containerId) return {};

    try {
      const container = this.docker.getContainer(containerId);
      const inspectData = await container.inspect();
      const rawPorts = inspectData.NetworkSettings?.Ports || {};
      const mappings = {};

      for (const [key, bindings] of Object.entries(rawPorts)) {
        const containerPort = parseInt(key.split('/')[0], 10);
        if (bindings && bindings.length > 0 && bindings[0].HostPort) {
          mappings[containerPort] = parseInt(bindings[0].HostPort, 10);
        }
      }

      this.containerPorts.set(containerId, mappings);
      return mappings;
    } catch (err) {
      logger.warn(`Failed to inspect port mappings for container [${containerId}]: ${err.message}`);
      return this.containerPorts.get(containerId) || {};
    }
  }

  /**
   * Get mapped host port for a container's dev port
   * @param {string} containerId 
   * @param {number} containerPort 
   * @returns {Promise<number | null>}
   */
  async getContainerHostPort(containerId, containerPort = 5173) {
    const cached = this.containerPorts.get(containerId);
    if (cached && cached[containerPort]) {
      return cached[containerPort];
    }

    const mappings = await this.getContainerPortMappings(containerId);
    return mappings[containerPort] || null;
  }

  /**
   * Execute an interactive TTY stream inside the container
   */
  async createExecPty(containerId, cols = 80, rows = 24, cmd = ['/bin/sh']) {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await exec.start({
      stdin: true,
      Tty: true,
      hijack: true
    });

    // Resize TTY
    await exec.resize({ h: rows, w: cols }).catch(() => {});

    return { exec, stream };
  }

  /**
   * Run a headless command inside container with stdout/stderr capture (for AI tools)
   */
  async executeCommand(containerId, command, timeoutMs = config.docker.execTimeoutMs) {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true
    });

    return new Promise((resolve, reject) => {
      let isTimedOut = false;
      const timer = setTimeout(() => {
        isTimedOut = true;
        reject(new Error(`Command timed out after ${timeoutMs}ms: "${command}"`));
      }, timeoutMs);

      exec.start({ hijack: true }, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        container.modem.demuxStream(
          stream,
          { write: (chunk) => { stdout += chunk.toString('utf8'); } },
          { write: (chunk) => { stderr += chunk.toString('utf8'); } }
        );

        stream.on('end', async () => {
          clearTimeout(timer);
          if (isTimedOut) return;

          const inspect = await exec.inspect();
          resolve({
            exitCode: inspect.ExitCode ?? 0,
            stdout,
            stderr
          });
        });
      });
    });
  }

  /**
   * Stop and remove a sandbox container
   */
  async destroyContainer(projectId) {
    const containerId = this.activeContainers.get(projectId);
    if (!containerId) return;

    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 2 });
      this.activeContainers.delete(projectId);
      this.containerPorts.delete(containerId);
      logger.info(`Sandbox container stopped [${containerId.slice(0, 12)}] for project ${projectId}`);
    } catch (err) {
      logger.warn(`Error stopping container [${containerId}]: ${err.message}`);
      this.activeContainers.delete(projectId);
      this.containerPorts.delete(containerId);
    }
  }

  /**
   * Cleanup all containers on server teardown
   */
  async destroyAll() {
    logger.info(`Tearing down all active sandbox containers (${this.activeContainers.size})...`);
    for (const [projectId, containerId] of this.activeContainers.entries()) {
      try {
        const container = this.docker.getContainer(containerId);
        await container.stop({ t: 1 });
      } catch {}
    }
    this.activeContainers.clear();
  }
}

// Singleton DockerManager instance
export const dockerManager = new DockerManager();
