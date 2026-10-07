/**
 * @file ExecManager.js
 * Layer 4: Infrastructure - Unified Dual-Engine Command Execution Adapter.
 * Runs non-interactive commands in Docker sandbox containers or host workspace with
 * timeout enforcement, process group isolation, and output length boundaries.
 */

import { exec } from 'node:child_process';
import { dockerManager } from './DockerManager.js';
import { config } from '../../config/index.js';
import { logger } from '../logger/logger.js';

export class ExecManager {
  /**
   * Execute a command with dual-engine fallback (Docker or Host Workspace)
   * @param {object} params
   * @param {string} params.projectId
   * @param {string} [params.containerId]
   * @param {string} params.workspacePath
   * @param {string} params.command
   * @param {number} [params.timeoutMs]
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, timedOut: boolean }>}
   */
  async executeCommand({
    projectId,
    containerId,
    workspacePath,
    command,
    timeoutMs = config.ai.agent.commandTimeoutMs
  }) {
    if (!command || typeof command !== 'string' || !command.trim()) {
      throw new Error('Command must be a non-empty string');
    }

    const trimmedCommand = command.trim();
    const maxChars = config.ai.agent.toolOutputMaxChars || 8000;

    // 1. Docker Sandbox Execution (Preferred)
    if (containerId && dockerManager.isAvailable) {
      try {
        logger.info(`ExecManager: Executing in Docker container [${containerId.slice(0, 12)}] for project ${projectId}: "${trimmedCommand}"`);
        const result = await dockerManager.executeCommand(containerId, trimmedCommand, timeoutMs);
        return {
          exitCode: result.exitCode,
          stdout: this._truncate(result.stdout, maxChars),
          stderr: this._truncate(result.stderr, maxChars),
          timedOut: false
        };
      } catch (err) {
        if (err.message.includes('timed out')) {
          logger.warn(`ExecManager: Docker command timed out: "${trimmedCommand}"`);
          return {
            exitCode: 124,
            stdout: '',
            stderr: `Command timed out after ${timeoutMs}ms: "${trimmedCommand}"`,
            timedOut: true
          };
        }
        logger.warn(`ExecManager: Docker execution failed, falling back to host execution: ${err.message}`);
      }
    }

    // 2. Host Workspace Execution (Dual-Engine Fallback)
    return this._executeOnHost(workspacePath, trimmedCommand, timeoutMs, maxChars);
  }

  /**
   * Execute command directly on host within target workspace directory using native exec
   * @private
   */
  _executeOnHost(cwd, command, timeoutMs, maxChars) {
    return new Promise((resolve) => {
      logger.info(`ExecManager: Executing on Host in "${cwd}": "${command}"`);

      exec(
        command,
        {
          cwd,
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
          env: {
            ...process.env,
            NODE_ENV: 'development',
            CI: 'true' // Suppress interactive prompts in tools like npm / vite
          }
        },
        (error, stdout, stderr) => {
          const timedOut = Boolean(error && (error.killed || error.signal === 'SIGTERM'));
          const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

          resolve({
            exitCode: timedOut ? 124 : exitCode,
            stdout: this._truncate(stdout || '', maxChars),
            stderr: timedOut
              ? `Command timed out after ${timeoutMs}ms: "${command}"`
              : this._truncate(stderr || (error && !stdout ? error.message : ''), maxChars),
            timedOut
          });
        }
      );
    });
  }

  /**
   * Truncate output string if it exceeds max character limit
   * @private
   */
  _truncate(str, maxChars) {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxChars) return str;

    const keptLength = maxChars - 120;
    return `${str.slice(0, keptLength)}\n\n... [Output truncated: exceeded ${maxChars} character limit]`;
  }
}

export const execManager = new ExecManager();
