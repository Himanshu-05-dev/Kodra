/**
 * @file PtyManager.js
 * Layer 4: Infrastructure - Spawns and manages native pseudo-terminal (PTY) processes.
 * Features cross-platform shell selection, bi-directional I/O, resizing, and zombie cleanup.
 */

import pty from 'node-pty';
import os from 'node:os';
import { logger } from '../logger/logger.js';

export class PtyManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> { ptyProcess, projectId, createdAt }
  }

  /**
   * Determine the default shell for the host operating system
   */
  getDefaultShell() {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * Spawn a new PTY session for a project
   * @param {string} sessionId Unique session identifier
   * @param {string} cwd Working directory (project workspace path)
   * @param {number} [cols=80]
   * @param {number} [rows=24]
   * @param {object} [env={}]
   * @returns {pty.IPty}
   */
  createSession(sessionId, cwd, cols = 80, rows = 24, env = {}) {
    // If a session already exists with this ID, clean it up first
    if (this.sessions.has(sessionId)) {
      this.destroySession(sessionId);
    }

    const shell = this.getDefaultShell();
    const isWindows = process.platform === 'win32';

    // Arguments: on Windows, powershell -NoLogo avoids welcome banners
    const args = isWindows && shell.toLowerCase().includes('powershell')
      ? ['-NoLogo']
      : [];

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: Math.max(10, cols),
      rows: Math.max(5, rows),
      cwd,
      useConpty: false,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        ...env
      }
    });

    const sessionData = {
      ptyProcess,
      sessionId,
      cwd,
      createdAt: new Date()
    };

    this.sessions.set(sessionId, sessionData);

    logger.info(`PTY session spawned [${sessionId}] in ${cwd} (PID: ${ptyProcess.pid})`);

    ptyProcess.onExit(({ exitCode, signal }) => {
      logger.info(`PTY session exited [${sessionId}] with code ${exitCode}, signal: ${signal}`);
      this.sessions.delete(sessionId);
    });

    return ptyProcess;
  }

  /**
   * Write data into the PTY process
   */
  write(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session?.ptyProcess) {
      session.ptyProcess.write(data);
    }
  }

  /**
   * Resize PTY window dimensions
   */
  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session?.ptyProcess) {
      const safeCols = Math.max(10, Math.min(cols, 500));
      const safeRows = Math.max(5, Math.min(rows, 200));
      session.ptyProcess.resize(safeCols, safeRows);
      logger.debug(`PTY session [${sessionId}] resized to ${safeCols}x${safeRows}`);
    }
  }

  /**
   * Destroy and terminate a PTY session
   */
  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session?.ptyProcess) {
      try {
        session.ptyProcess.kill();
      } catch (err) {
        logger.warn(`Error killing PTY session [${sessionId}]: ${err.message}`);
      }
      this.sessions.delete(sessionId);
      logger.info(`PTY session destroyed [${sessionId}]`);
    }
  }

  /**
   * Kill all active PTY sessions (used during server graceful shutdown)
   */
  destroyAll() {
    logger.info(`Cleaning up all active PTY sessions (${this.sessions.size})...`);
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        session.ptyProcess.kill();
      } catch {}
    }
    this.sessions.clear();
  }
}

// Singleton PtyManager instance
export const ptyManager = new PtyManager();
