/**
 * @file terminal.test.js
 * Automated validation suite for Phase 3: Terminal & xterm.js PTY Engine.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ptyManager } from '../src/infrastructure/terminal/PtyManager.js';
import { TerminalService } from '../src/services/TerminalService.js';
import { ValidationError, NotFoundError } from '../src/utils/AppError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Phase 3: Terminal & PTY Engine Test Suite', () => {

  describe('1. PtyManager Infrastructure', () => {
    it('should determine the valid host shell', () => {
      const shell = ptyManager.getDefaultShell();
      assert.equal(typeof shell, 'string');
      assert.ok(shell.length > 0);
    });

    it('should spawn, write, and capture output from a native PTY process', async () => {
      const sessionId = 'test-session-pty-1';
      const cwd = process.cwd();

      let receivedOutput = '';
      const ptyProcess = ptyManager.createSession(sessionId, cwd, 80, 24);
      assert.ok(ptyProcess);
      assert.ok(ptyProcess.pid > 0);

      // Listen for output
      const outputPromise = new Promise((resolve) => {
        const disposable = ptyProcess.onData((data) => {
          receivedOutput += data;
          if (receivedOutput.length > 0) {
            resolve(receivedOutput);
          }
        });
        setTimeout(() => resolve(receivedOutput), 3000);
      });

      // Send a newline to trigger prompt
      ptyManager.write(sessionId, '\r');
      await outputPromise;

      assert.ok(receivedOutput.length > 0, 'Expected to receive PTY output');

      // Test resize
      assert.doesNotThrow(() => {
        ptyManager.resize(sessionId, 120, 35);
      });

      // Test session destruction
      ptyManager.destroySession(sessionId);
      assert.equal(ptyManager.sessions.has(sessionId), false);
    });
  });

  describe('2. TerminalService Invariants', () => {
    const mockProjectRepo = {
      findById: async (id) => {
        if (id === 'valid-project-id') {
          return {
            _id: 'valid-project-id',
            name: 'test-app',
            workspacePath: process.cwd()
          };
        }
        return null;
      }
    };

    const service = new TerminalService(mockProjectRepo, ptyManager);

    it('should reject starting a session with missing sessionId', async () => {
      await assert.rejects(
        () => service.startTerminalSession('', 'valid-project-id', 80, 24, () => {}),
        ValidationError
      );
    });

    it('should reject starting a session with non-existent project', async () => {
      await assert.rejects(
        () => service.startTerminalSession('sess-1', 'invalid-project-id', 80, 24, () => {}),
        NotFoundError
      );
    });

    it('should start a session for a valid project and clean it up', async () => {
      let outputChunk = '';
      const session = await service.startTerminalSession(
        'sess-valid-1',
        'valid-project-id',
        80,
        24,
        (data) => { outputChunk += data; }
      );

      assert.ok(session);
      assert.ok(session.ptyProcess.pid > 0);

      service.handleInput('sess-valid-1', '\r');
      service.handleResize('sess-valid-1', 100, 30);
      service.closeSession('sess-valid-1');
    });
  });

  after(() => {
    // Clean up any remaining pty processes
    for (const [id] of ptyManager.sessions) {
      ptyManager.destroySession(id);
    }
  });
});
