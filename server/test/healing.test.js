/**
 * @file healing.test.js
 * Automated validation suite for Phase 7: Autonomous Coding & Self-Healing Debugging.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ErrorParser } from '../../agent/src/diagnostics/ErrorParser.js';
import { SelfHealingWorkflow } from '../../agent/src/engine/SelfHealingWorkflow.js';
import { AgentLoopEngine } from '../../agent/src/engine/AgentLoopEngine.js';
import { AgentService } from '../src/services/AgentService.js';
import { FileSystemRepository } from '../src/repositories/FileSystemRepository.js';
import { ExecManager } from '../src/infrastructure/docker/ExecManager.js';
import { toolRegistry } from '../../agent/src/tools/ToolRegistry.js';
import { AgentStatus } from '@kodra/shared';

describe('Phase 7: Autonomous Coding & Self-Healing Debugging Test Suite', () => {
  const testDir = path.resolve(process.cwd(), 'temp_test_healing_workspace');
  const fileRepo = new FileSystemRepository();
  const execManager = new ExecManager();

  before(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('1. ErrorParser Diagnostics', () => {
    it('should parse Vite / Rollup compilation errors with file and line', () => {
      const stderr = `[vite] Internal server error: /workspace/src/App.jsx: Unexpected token (14:8)
12 | function App() {
13 |   return (
14 |     <div className=???
   |                    ^`;

      const diag = ErrorParser.parse('', stderr, 1);
      assert.equal(diag.hasError, true);
      assert.equal(diag.errorType, 'CompilationError');
      assert.equal(diag.file, 'src/App.jsx');
      assert.equal(diag.line, 14);
      assert.equal(diag.column, 8);
      assert.ok(diag.summary.includes('Unexpected token'));
      assert.ok(diag.suggestedAction.includes('Inspect src/App.jsx'));
    });

    it('should parse missing module import errors', () => {
      const stderr = `Failed to resolve import "date-fns" from "src/utils.js". Does the file exist?`;
      const diag = ErrorParser.parse('', stderr, 1);

      assert.equal(diag.hasError, true);
      assert.equal(diag.errorType, 'MissingDependency');
      assert.ok(diag.summary.includes('date-fns'));
      assert.ok(diag.suggestedAction.includes('npm install date-fns'));
    });

    it('should parse test runner assertion failures', () => {
      const stdout = `✖ calculator.test.js (15ms)
  AssertionError [ERR_ASSERTION]: Expected 4 to equal 5
    at test/calculator.test.js:12:10`;

      const diag = ErrorParser.parse(stdout, '', 1);
      assert.equal(diag.hasError, true);
      assert.equal(diag.errorType, 'TestFailure');
      assert.ok(diag.summary.includes('Expected 4 to equal 5'));
    });

    it('should return clean status when command succeeds without errors', () => {
      const diag = ErrorParser.parse('Build complete in 420ms.', '', 0);
      assert.equal(diag.hasError, false);
      assert.equal(diag.errorType, 'None');
    });
  });

  describe('2. Runaway Loop Interruption & AbortSignal', () => {
    it('should immediately stop AgentLoopEngine when AbortSignal fires', async () => {
      const controller = new AbortController();
      let iterationCount = 0;

      const mockProvider = {
        async *stream() {
          iterationCount++;
          // Abort during first turn
          controller.abort();
          yield { textChunk: 'Thinking...' };
        }
      };

      const loopEngine = new AgentLoopEngine({ toolRegistry, maxIterations: 10 });
      const result = await loopEngine.runLoop({
        provider: mockProvider,
        context: {
          projectId: 'test-p',
          workspacePath: testDir,
          fileRepo,
          execManager
        },
        messages: [{ role: 'user', content: 'Do long running work' }],
        systemInstruction: 'You are Kodra.',
        abortSignal: controller.signal
      });

      assert.equal(result.cancelled, true);
      assert.ok(result.text.includes('cancelled by user'));
      assert.equal(iterationCount, 1);
    });

    it('AgentService cancelSession should abort active run and set status to CANCELLED', async () => {
      let sessionStatus = AgentStatus.THINKING;
      const mockSessionRepo = {
        getOrCreateSession: async () => ({ _id: 'sess-cancel-1', status: sessionStatus }),
        updateStatus: async (id, status) => { sessionStatus = status; }
      };

      const service = new AgentService(mockSessionRepo, {}, {}, fileRepo, execManager);

      // Register an active controller
      const controller = new AbortController();
      service.activeControllers.set('proj-cancel-1', controller);

      const cancelResult = await service.cancelSession('proj-cancel-1');
      assert.equal(cancelResult.cancelled, true);
      assert.equal(controller.signal.aborted, true);
      assert.equal(sessionStatus, AgentStatus.CANCELLED);
      assert.equal(service.activeControllers.has('proj-cancel-1'), false);
    });
  });

  describe('3. SelfHealingWorkflow Diagnostics & Execution', () => {
    it('should detect verification command based on package.json scripts', async () => {
      const pkgPath = path.join(testDir, 'package.json');
      await fs.writeFile(pkgPath, JSON.stringify({
        scripts: { build: 'vite build', test: 'node --test' }
      }));

      const mockProject = {
        _id: 'proj-diag-1',
        template: 'vite-react',
        workspacePath: testDir
      };

      const cmd = await SelfHealingWorkflow.detectVerificationCommand(mockProject, fileRepo);
      assert.equal(cmd, 'npm test');
    });

    it('should diagnose broken syntax in project and formulate repair plan', async () => {
      // Create broken file with deliberate syntax error
      const brokenFilePath = path.join(testDir, 'src', 'broken.js');
      await fs.writeFile(brokenFilePath, 'const x = ???;\n');

      const mockProject = {
        _id: 'proj-diag-2',
        name: 'test-broken-app',
        template: 'vite-react',
        workspacePath: testDir
      };

      const mockContext = {
        project: mockProject,
        fileRepo,
        execManager
      };

      // Run diagnostics using node --check
      const diagResult = await SelfHealingWorkflow.runDiagnostics(
        mockContext,
        `node --check "${brokenFilePath}"`
      );

      assert.equal(diagResult.isClean, false);
      assert.ok(diagResult.exitCode !== 0);
      assert.ok(diagResult.diagnosis.hasError);
      assert.ok(diagResult.diagnosis.rawSnippet.includes('???'));
    });
  });
});
