/**
 * @file tools.test.js
 * Automated validation suite for Phase 6: AI Tool Calling & Execution Engine.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { toolRegistry } from '../../agent/src/tools/ToolRegistry.js';
import { FileSystemRepository } from '../src/repositories/FileSystemRepository.js';
import { ExecManager } from '../src/infrastructure/docker/ExecManager.js';
import { AgentLoopEngine } from '../../agent/src/engine/AgentLoopEngine.js';

describe('Phase 6: AI Tool Calling & Execution Engine Test Suite', () => {
  const testWorkspaceDir = path.resolve(process.cwd(), 'temp_test_tool_workspace');
  const fileRepo = new FileSystemRepository();
  const execManager = new ExecManager();

  const mockContext = {
    projectId: 'test-tool-proj-1',
    project: {
      _id: 'test-tool-proj-1',
      name: 'tool-test-app',
      workspacePath: testWorkspaceDir
    },
    workspacePath: testWorkspaceDir,
    fileRepo,
    execManager
  };

  before(async () => {
    await fs.mkdir(testWorkspaceDir, { recursive: true });
    await fs.mkdir(path.join(testWorkspaceDir, 'src'), { recursive: true });
  });

  after(async () => {
    await fs.rm(testWorkspaceDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('1. Tool Registry & Schema Declarations', () => {
    it('should register all 7 core development tools', () => {
      const defs = toolRegistry.getDefinitions();
      assert.equal(defs.length, 7);

      const names = defs.map((d) => d.name);
      assert.ok(names.includes('list_files'));
      assert.ok(names.includes('read_file'));
      assert.ok(names.includes('write_file'));
      assert.ok(names.includes('edit_file'));
      assert.ok(names.includes('delete_file'));
      assert.ok(names.includes('search_files'));
      assert.ok(names.includes('run_command'));
    });

    it('should generate Gemini function declarations with valid schema', () => {
      const geminiTools = toolRegistry.getGeminiDeclarations();
      assert.equal(geminiTools.length, 7);
      for (const tool of geminiTools) {
        assert.equal(typeof tool.name, 'string');
        assert.equal(typeof tool.description, 'string');
        assert.equal(typeof tool.parameters, 'object');
        assert.equal(tool.parameters.type, 'OBJECT');
      }
    });

    it('should correctly classify mutation tools', () => {
      assert.equal(toolRegistry.isMutation('write_file'), true);
      assert.equal(toolRegistry.isMutation('edit_file'), true);
      assert.equal(toolRegistry.isMutation('delete_file'), true);
      assert.equal(toolRegistry.isMutation('read_file'), false);
      assert.equal(toolRegistry.isMutation('run_command'), false);
    });
  });

  describe('2. File System Tools Execution', () => {
    it('write_file should create a new file with content', async () => {
      const result = await toolRegistry.executeTool('write_file', {
        path: 'src/math.js',
        content: '// Math helpers\nexport function add(a, b) {\n  return a + b;\n}\n'
      }, mockContext);

      assert.equal(result.success, true);
      assert.equal(result.isMutation, true);
      assert.ok(result.durationMs >= 0);

      const onDisk = await fs.readFile(path.join(testWorkspaceDir, 'src/math.js'), 'utf8');
      assert.ok(onDisk.includes('export function add'));
    });

    it('read_file should read full and sliced content', async () => {
      // Full read
      const full = await toolRegistry.executeTool('read_file', {
        path: 'src/math.js'
      }, mockContext);

      assert.equal(full.success, true);
      assert.equal(full.result.totalLines, 5);

      // Sliced read
      const sliced = await toolRegistry.executeTool('read_file', {
        path: 'src/math.js',
        startLine: 2,
        endLine: 4
      }, mockContext);

      assert.equal(sliced.success, true);
      assert.ok(sliced.result.content.includes('2: export function add'));
      assert.ok(sliced.result.content.includes('3:   return a + b;'));
    });

    it('edit_file should perform surgical text replacement', async () => {
      const edit = await toolRegistry.executeTool('edit_file', {
        path: 'src/math.js',
        targetContent: 'return a + b;',
        replacementContent: 'return Number(a) + Number(b);'
      }, mockContext);

      assert.equal(edit.success, true);
      assert.equal(edit.result.replacementsMade, 1);

      const updated = await fs.readFile(path.join(testWorkspaceDir, 'src/math.js'), 'utf8');
      assert.ok(updated.includes('Number(a) + Number(b)'));
    });

    it('search_files should find keyword matches across files', async () => {
      const search = await toolRegistry.executeTool('search_files', {
        query: 'Number(a)'
      }, mockContext);

      assert.equal(search.success, true);
      assert.ok(search.result.totalMatches > 0);
      assert.equal(search.result.matches[0].file, 'src/math.js');
    });

    it('list_files should list directories and files', async () => {
      const list = await toolRegistry.executeTool('list_files', {
        path: 'src'
      }, mockContext);

      assert.equal(list.success, true);
      assert.ok(list.result.files.includes('math.js'));
    });

    it('delete_file should delete the file from disk', async () => {
      const del = await toolRegistry.executeTool('delete_file', {
        path: 'src/math.js'
      }, mockContext);

      assert.equal(del.success, true);
      assert.equal(del.result.deleted, true);

      const exists = await fileRepo.exists(path.join(testWorkspaceDir, 'src/math.js'));
      assert.equal(exists, false);
    });
  });

  describe('3. ExecManager & Command Execution Tool', () => {
    it('run_command should execute shell commands and capture output', async () => {
      const result = await toolRegistry.executeTool('run_command', {
        command: 'node -e "console.log(\'KODRA_SANDBOX_SUCCESS\')"'
      }, mockContext);

      assert.equal(result.success, true);
      assert.equal(result.result.exitCode, 0);
      assert.ok(result.result.stdout.includes('KODRA_SANDBOX_SUCCESS'));
    });

    it('should safely enforce toolOutputMaxChars truncation', () => {
      const longOutput = 'A'.repeat(10000);
      // @ts-ignore
      const truncated = execManager._truncate(longOutput, 500);
      assert.ok(truncated.length <= 500);
      assert.ok(truncated.includes('Output truncated'));
    });
  });

  describe('4. AgentLoopEngine Multi-Turn Reasoning', () => {
    it('should coordinate multi-turn tool calling and completion loop', async () => {
      let turnCounter = 0;
      const toolCallEvents = [];
      const toolResultEvents = [];
      const fileChangeEvents = [];

      // Mock multi-turn provider:
      // Turn 1 -> Emits toolCall write_file('test.txt')
      // Turn 2 -> Emits final explanation text
      const mockProvider = {
        async *stream() {
          turnCounter++;
          if (turnCounter === 1) {
            yield {
              toolCall: {
                id: 'call-1',
                name: 'write_file',
                args: { path: 'test.txt', content: 'Autonomous agent was here.' }
              }
            };
          } else {
            yield { textChunk: 'I created the file test.txt for you!' };
          }
        }
      };

      const loopEngine = new AgentLoopEngine({
        toolRegistry,
        maxIterations: 5
      });

      const loopResult = await loopEngine.runLoop({
        provider: mockProvider,
        context: mockContext,
        messages: [{ role: 'user', content: 'Create test.txt' }],
        systemInstruction: 'You are Kodra.',
        callbacks: {
          onToolCall: (call) => toolCallEvents.push(call),
          onToolResult: (res) => toolResultEvents.push(res),
          onFileChanged: (evt) => fileChangeEvents.push(evt)
        }
      });

      assert.ok(loopResult.text.includes('I created the file test.txt'));
      assert.equal(loopResult.iterations, 2);
      assert.equal(toolCallEvents.length, 1);
      assert.equal(toolCallEvents[0].name, 'write_file');
      assert.equal(toolResultEvents.length, 1);
      assert.equal(toolResultEvents[0].success, true);
      assert.equal(fileChangeEvents.length, 1);
      assert.equal(fileChangeEvents[0].path, 'test.txt');

      // Verify file was written
      const created = await fs.readFile(path.join(testWorkspaceDir, 'test.txt'), 'utf8');
      assert.equal(created, 'Autonomous agent was here.');
    });
  });
});
