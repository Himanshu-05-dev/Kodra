/**
 * @file TerminalService.js
 * Layer 2: Business Logic - Orchestrates terminal sessions for project workspaces.
 * Transparently bridges terminal sessions to either isolated Docker containers or host PTYs.
 */

import { ptyManager } from '../infrastructure/terminal/PtyManager.js';
import { dockerManager } from '../infrastructure/docker/DockerManager.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';

export class TerminalService {
  /**
   * @param {ProjectRepository} [projectRepo]
   * @param {import('../infrastructure/terminal/PtyManager.js').PtyManager} [ptyMgr]
   * @param {import('../infrastructure/docker/DockerManager.js').DockerManager} [dockerMgr]
   */
  constructor(
    projectRepo = new ProjectRepository(),
    ptyMgr = ptyManager,
    dockerMgr = dockerManager
  ) {
    this.projectRepo = projectRepo;
    this.pty = ptyMgr;
    this.docker = dockerMgr;
    this.activeStreams = new Map(); // sessionId -> { type: 'docker' | 'host', stream, exec }
  }

  /**
   * Start a new terminal session bound to a project's workspace directory or Docker container
   * @param {string} sessionId Unique connection/session ID
   * @param {string} projectId Target project ID
   * @param {number} cols Initial columns
   * @param {number} rows Initial rows
   * @param {(data: string) => void} onDataCallback Stream output listener
   */
  async startTerminalSession(sessionId, projectId, cols = 80, rows = 24, onDataCallback) {
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID "${projectId}" does not exist`);
    }

    // 1. If project has an active Docker container, route terminal directly into the container
    if (project.containerId && this.docker.isAvailable) {
      try {
        logger.info(`Routing terminal [${sessionId}] into Docker container [${project.containerId.slice(0, 12)}]`);
        const { exec, stream } = await this.docker.createExecPty(
          project.containerId,
          cols,
          rows,
          ['/bin/sh']
        );

        stream.on('data', (chunk) => {
          try {
            onDataCallback(chunk.toString('utf8'));
          } catch (err) {
            logger.error(`Error forwarding container output [${sessionId}]: ${err.message}`);
          }
        });

        this.activeStreams.set(sessionId, { type: 'docker', stream, exec });
        return { type: 'docker', stream, exec };
      } catch (err) {
        logger.warn(`Docker exec failed, falling back to host PTY: ${err.message}`);
      }
    }

    // 2. Fallback: Host PTY session bound to project workspace
    const workspaceDir = project.workspacePath;
    logger.info(`Starting host PTY session for project "${project.name}" in ${workspaceDir}`);

    const ptyProcess = this.pty.createSession(sessionId, workspaceDir, cols, rows);

    ptyProcess.onData((data) => {
      try {
        onDataCallback(data);
      } catch (err) {
        logger.error(`Error forwarding PTY data to socket [${sessionId}]: ${err.message}`);
      }
    });

    this.activeStreams.set(sessionId, { type: 'host', ptyProcess });
    return { type: 'host', ptyProcess };
  }

  /**
   * Send input to terminal session (Docker stream or host PTY)
   */
  handleInput(sessionId, inputData) {
    const active = this.activeStreams.get(sessionId);
    if (active?.type === 'docker') {
      active.stream.write(inputData);
    } else {
      this.pty.write(sessionId, inputData);
    }
  }

  /**
   * Handle terminal window resize
   */
  handleResize(sessionId, cols, rows) {
    const active = this.activeStreams.get(sessionId);
    if (active?.type === 'docker') {
      active.exec?.resize({ h: rows, w: cols }).catch(() => {});
    } else {
      this.pty.resize(sessionId, cols, rows);
    }
  }

  /**
   * Terminate terminal session
   */
  closeSession(sessionId) {
    const active = this.activeStreams.get(sessionId);
    if (active?.type === 'docker') {
      try {
        active.stream.end();
      } catch {}
    } else {
      this.pty.destroySession(sessionId);
    }
    this.activeStreams.delete(sessionId);
  }
}

// Singleton instance
export const terminalService = new TerminalService();
