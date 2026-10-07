/**
 * @file AgentService.js
 * Layer 2: Business Logic - Orchestrates AI Conversations, Tool Execution Loop,
 * Self-Healing Debugging Cycles, and Runaway Loop Interruption.
 */

import { AgentSessionRepository } from '../repositories/AgentSessionRepository.js';
import { MessageRepository } from '../repositories/MessageRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { FileSystemRepository } from '../repositories/FileSystemRepository.js';
import { execManager as defaultExecManager } from '../infrastructure/docker/ExecManager.js';
import { ProviderFactory } from '../../../agent/src/providers/ProviderFactory.js';
import { agentLoopEngine as defaultAgentLoopEngine } from '../../../agent/src/engine/AgentLoopEngine.js';
import { SelfHealingWorkflow } from '../../../agent/src/engine/SelfHealingWorkflow.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import { AgentStatus } from '@kodra/shared';
import { logger } from '../infrastructure/logger/logger.js';

export class AgentService {
  /**
   * @param {AgentSessionRepository} [sessionRepo]
   * @param {MessageRepository} [messageRepo]
   * @param {ProjectRepository} [projectRepo]
   * @param {FileSystemRepository} [fileRepo]
   * @param {import('../infrastructure/docker/ExecManager.js').ExecManager} [execManager]
   * @param {import('../../../agent/src/engine/AgentLoopEngine.js').AgentLoopEngine} [loopEngine]
   */
  constructor(
    sessionRepo = new AgentSessionRepository(),
    messageRepo = new MessageRepository(),
    projectRepo = new ProjectRepository(),
    fileRepo = new FileSystemRepository(),
    execManager = defaultExecManager,
    loopEngine = defaultAgentLoopEngine
  ) {
    this.sessionRepo = sessionRepo;
    this.messageRepo = messageRepo;
    this.projectRepo = projectRepo;
    this.fileRepo = fileRepo;
    this.execManager = execManager;
    this.loopEngine = loopEngine;

    // Active project run controllers for instant cancellation
    this.activeControllers = new Map();
  }

  /**
   * Fetch conversation history for a project
   */
  async getHistory(projectId, userId = 'anonymous') {
    const session = await this.sessionRepo.getOrCreateSession(projectId, userId);
    const messages = await this.messageRepo.getSessionMessages(session._id);
    return { session, messages };
  }

  /**
   * Clear all messages in project session
   */
  async clearHistory(projectId, userId = 'anonymous') {
    const session = await this.sessionRepo.getOrCreateSession(projectId, userId);
    await this.messageRepo.deleteBySessionId(session._id);
    await this.sessionRepo.updateStatus(session._id, AgentStatus.IDLE);
    return { cleared: true };
  }

  /**
   * Gracefully interrupt an active autonomous agent loop
   * @param {string} projectId 
   */
  async cancelSession(projectId) {
    const controller = this.activeControllers.get(projectId);
    if (controller) {
      logger.info(`Cancelling active agent run for project [${projectId}]`);
      controller.abort();
      this.activeControllers.delete(projectId);
    }

    try {
      const session = await this.sessionRepo.getOrCreateSession(projectId, 'anonymous');
      await this.sessionRepo.updateStatus(session._id, AgentStatus.CANCELLED);
    } catch {
      // Non-critical session status fallback
    }

    return { cancelled: true };
  }

  /**
   * Trigger an autonomous self-healing repair cycle
   */
  async runSelfHealing(projectId, userId = 'anonymous', streamHandlers) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found`);
    }

    const callbacks = typeof streamHandlers === 'function'
      ? { onChunk: streamHandlers }
      : (streamHandlers || {});

    const session = await this.sessionRepo.getOrCreateSession(projectId, userId);
    await this.sessionRepo.updateStatus(session._id, AgentStatus.HEALING);

    const controller = new AbortController();
    this.activeControllers.set(projectId, controller);

    const executionContext = {
      projectId,
      project,
      workspacePath: project.workspacePath,
      fileRepo: this.fileRepo,
      execManager: this.execManager
    };

    const provider = ProviderFactory.getProvider();

    try {
      logger.info(`Starting Self-Healing Repair workflow for project "${project.name}"`);

      const repairResult = await SelfHealingWorkflow.executeRepair({
        loopEngine: this.loopEngine,
        provider,
        context: executionContext,
        abortSignal: controller.signal,
        callbacks: {
          onThinking: () => callbacks.onThinking?.(),
          onStep: (step) => callbacks.onStep?.(step),
          onChunk: (chunk) => callbacks.onChunk?.(chunk),
          onToolCall: (call) => callbacks.onToolCall?.(call),
          onToolResult: (res) => callbacks.onToolResult?.(res),
          onFileChanged: (evt) => callbacks.onFileChanged?.(evt)
        }
      });

      const summaryText = repairResult.repaired
        ? `✅ **Auto-Repair Succeeded**\n\nThe issue was identified, surgically fixed, and verified clean with \`${repairResult.command}\`.`
        : repairResult.cancelled
        ? `⏹ **Repair Cancelled**\n\nAutonomous repair was interrupted by user.`
        : repairResult.alreadyHealthy
        ? `✅ **Project Clean**\n\nNo build or test failures found with \`${repairResult.command}\`.`
        : `⚠️ **Repair Incomplete**\n\nSelf-healing attempted fixes but verification command \`${repairResult.command}\` exited with code ${repairResult.finalExitCode}.`;

      const savedAiMessage = await this.messageRepo.createMessage({
        sessionId: session._id,
        role: 'model',
        content: repairResult.text ? `${repairResult.text}\n\n${summaryText}` : summaryText,
        toolCalls: repairResult.executedTools?.map(t => ({ id: t.id, name: t.name, args: t.args })) || [],
        toolResults: repairResult.executedTools?.map(t => ({ id: t.id, name: t.name, success: t.success, durationMs: t.durationMs })) || []
      });

      await this.sessionRepo.updateStatus(session._id, AgentStatus.IDLE);
      this.activeControllers.delete(projectId);

      return {
        messageId: savedAiMessage._id,
        text: savedAiMessage.content,
        repaired: repairResult.repaired,
        toolExecutions: repairResult.executedTools || []
      };
    } catch (err) {
      await this.sessionRepo.updateStatus(session._id, AgentStatus.ERROR);
      this.activeControllers.delete(projectId);
      logger.error(`Self-healing error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Process user prompt through autonomous multi-turn reasoning and tool execution
   * @param {string} projectId 
   * @param {string} userPrompt 
   * @param {string} userId 
   * @param {((chunk: string) => void) | object} streamHandlers Function or callback map
   */
  async processPromptStream(projectId, userPrompt, userId = 'anonymous', streamHandlers) {
    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      throw new ValidationError('Prompt cannot be empty');
    }

    const trimmedPrompt = userPrompt.trim();

    // Route direct debugging triggers to SelfHealingWorkflow
    if (
      trimmedPrompt.toLowerCase() === '/fix' ||
      trimmedPrompt.toLowerCase() === '/debug' ||
      trimmedPrompt.toLowerCase() === 'fix with ai'
    ) {
      return this.runSelfHealing(projectId, userId, streamHandlers);
    }

    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project "${projectId}" not found`);
    }

    // Normalize callbacks
    const callbacks = typeof streamHandlers === 'function'
      ? { onChunk: streamHandlers }
      : (streamHandlers || {});

    // 1. Get or create active session
    const session = await this.sessionRepo.getOrCreateSession(projectId, userId);
    await this.sessionRepo.updateStatus(session._id, AgentStatus.THINKING);

    // Create abort controller for this session run
    const controller = new AbortController();
    this.activeControllers.set(projectId, controller);

    // 2. Persist user message in database
    await this.messageRepo.createMessage({
      sessionId: session._id,
      role: 'user',
      content: trimmedPrompt
    });

    // 3. Retrieve recent conversation context
    const recentMessages = await this.messageRepo.getSessionMessages(session._id, 20);
    const formattedMessages = recentMessages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    // 4. System Instruction with Workspace & Tool Capabilities
    const systemInstruction = `You are Kodra, an autonomous AI software engineer and pair programmer embedded inside the user's cloud IDE.
Project Name: "${project.name}"
Project Template: "${project.template}"
Workspace Path: "${project.workspacePath}"
Status: The project is running inside an isolated development environment.

You have access to powerful tools to inspect, read, create, edit, search, and run commands inside the workspace:
- "list_files": Explore workspace structure.
- "read_file": Read file content. Always inspect relevant files before modifying them.
- "write_file": Create new files or overwrite files completely.
- "edit_file": Perform targeted, surgical string replacements in existing files.
- "delete_file": Remove files from workspace.
- "search_files": Fast text search across files.
- "run_command": Execute shell commands inside the sandbox (e.g. "npm install", "npm test", "npm run build").

Guidelines:
1. Always write modern, production-grade code without placeholders or TODO comments.
2. When creating components or features, inspect existing structure first.
3. Be concise and energetic. Explain your actions cleanly.`;

    // 5. Execution context for tools
    const executionContext = {
      projectId,
      project,
      workspacePath: project.workspacePath,
      fileRepo: this.fileRepo,
      execManager: this.execManager
    };

    const provider = ProviderFactory.getProvider();

    try {
      logger.info(`Agent processing prompt for project "${project.name}" using provider [${provider.constructor.name}]`);

      const loopResult = await this.loopEngine.runLoop({
        provider,
        context: executionContext,
        messages: formattedMessages,
        systemInstruction,
        abortSignal: controller.signal,
        callbacks: {
          onThinking: () => callbacks.onThinking?.(),
          onStep: (step) => callbacks.onStep?.(step),
          onChunk: (chunk) => callbacks.onChunk?.(chunk),
          onToolCall: (call) => callbacks.onToolCall?.(call),
          onToolResult: (result) => callbacks.onToolResult?.(result),
          onFileChanged: (evt) => callbacks.onFileChanged?.(evt)
        }
      });

      // 6. Persist final AI model response with tool telemetry in database
      const savedAiMessage = await this.messageRepo.createMessage({
        sessionId: session._id,
        role: 'model',
        content: loopResult.text,
        toolCalls: loopResult.executedTools.map(t => ({ id: t.id, name: t.name, args: t.args })),
        toolResults: loopResult.executedTools.map(t => ({ id: t.id, name: t.name, success: t.success, durationMs: t.durationMs }))
      });

      await this.sessionRepo.updateStatus(session._id, loopResult.cancelled ? AgentStatus.CANCELLED : AgentStatus.IDLE);
      this.activeControllers.delete(projectId);

      return {
        messageId: savedAiMessage._id,
        text: loopResult.text,
        cancelled: loopResult.cancelled,
        toolExecutions: loopResult.executedTools
      };
    } catch (err) {
      await this.sessionRepo.updateStatus(session._id, AgentStatus.ERROR);
      this.activeControllers.delete(projectId);
      logger.error(`Agent reasoning error: ${err.message}`);
      throw err;
    }
  }
}

// Singleton instance
export const agentService = new AgentService();
