/**
 * @file AgentLoopEngine.js
 * Multi-Turn Autonomous Reasoning and Tool Execution Engine.
 * Manages iterations, tool dispatch, error feedback, stream synchronization,
 * and AbortSignal cancellation.
 */

import { toolRegistry as defaultToolRegistry } from '../tools/ToolRegistry.js';
import { config } from '../../../server/src/config/index.js';
import { logger } from '../../../server/src/infrastructure/logger/logger.js';

export class AgentLoopEngine {
  /**
   * @param {object} [options]
   * @param {import('../tools/ToolRegistry.js').ToolRegistry} [options.toolRegistry]
   * @param {number} [options.maxIterations]
   */
  constructor({
    toolRegistry = defaultToolRegistry,
    maxIterations = config.ai.agent.maxIterations || 15
  } = {}) {
    this.toolRegistry = toolRegistry;
    this.maxIterations = maxIterations;
  }

  /**
   * Run the autonomous multi-turn reasoning and tool execution loop
   * @param {object} params
   * @param {import('../providers/BaseProvider.js').BaseProvider} params.provider
   * @param {object} params.context Execution context (project, workspacePath, fileRepo, execManager)
   * @param {Array<object>} params.messages Historical conversation turns
   * @param {string} params.systemInstruction Injected project system prompt
   * @param {AbortSignal} [params.abortSignal] Optional signal to cancel runaway loops
   * @param {object} params.callbacks
   * @param {() => void} [params.callbacks.onThinking]
   * @param {(step: { current: number, total: number, phase: string }) => void} [params.callbacks.onStep]
   * @param {(chunk: string) => void} [params.callbacks.onChunk]
   * @param {(call: { id: string, name: string, args: object }) => void} [params.callbacks.onToolCall]
   * @param {(res: { id: string, name: string, success: boolean, result?: any, error?: string, durationMs: number }) => void} [params.callbacks.onToolResult]
   * @param {(evt: { path: string, action: string }) => void} [params.callbacks.onFileChanged]
   */
  async runLoop({
    provider,
    context,
    messages,
    systemInstruction,
    abortSignal,
    callbacks = {}
  }) {
    const {
      onThinking = () => {},
      onStep = () => {},
      onChunk = () => {},
      onToolCall = () => {},
      onToolResult = () => {},
      onFileChanged = () => {}
    } = callbacks;

    const conversation = [...messages];
    const tools = this.toolRegistry.getGeminiDeclarations();
    const executedTools = [];
    let accumulatedText = '';
    let iterations = 0;

    logger.info(`AgentLoopEngine starting execution for project [${context.projectId}] (max iterations: ${this.maxIterations})`);

    while (iterations < this.maxIterations) {
      if (abortSignal?.aborted) {
        logger.info(`AgentLoopEngine execution cancelled by abortSignal on iteration ${iterations}`);
        return {
          text: accumulatedText ? `${accumulatedText}\n\n*(Autonomous loop cancelled by user)*` : '*(Autonomous loop cancelled by user)*',
          executedTools,
          iterations,
          cancelled: true
        };
      }

      iterations++;
      onThinking();
      onStep({
        current: iterations,
        total: this.maxIterations,
        phase: iterations === 1 ? 'Analyzing codebase' : `Iterative reasoning (turn ${iterations})`
      });

      let turnText = '';
      const turnToolCalls = [];

      // 1. Stream response from provider
      try {
        for await (const chunk of provider.stream({
          messages: conversation,
          tools,
          systemInstruction
        })) {
          if (abortSignal?.aborted) {
            break;
          }

          if (chunk.textChunk) {
            turnText += chunk.textChunk;
            accumulatedText += chunk.textChunk;
            onChunk(chunk.textChunk);
          }

          if (chunk.toolCall) {
            turnToolCalls.push(chunk.toolCall);
          }
        }
      } catch (err) {
        if (abortSignal?.aborted) {
          break;
        }
        logger.error(`AgentLoopEngine provider error on turn ${iterations}: ${err.message}`);
        throw err;
      }

      if (abortSignal?.aborted) {
        return {
          text: accumulatedText ? `${accumulatedText}\n\n*(Autonomous loop cancelled by user)*` : '*(Autonomous loop cancelled by user)*',
          executedTools,
          iterations,
          cancelled: true
        };
      }

      // If text was generated, record it in conversation history
      if (turnText) {
        conversation.push({
          role: 'model',
          content: turnText
        });
      }

      // 2. If no tool calls were requested, reasoning is finished!
      if (turnToolCalls.length === 0) {
        logger.info(`AgentLoopEngine finished after ${iterations} iteration(s)`);
        break;
      }

      // 3. Execute tool calls sequentially
      for (const call of turnToolCalls) {
        if (abortSignal?.aborted) break;

        logger.info(`AgentLoopEngine executing tool [${call.name}] on iteration ${iterations}`);
        onToolCall(call);

        const execution = await this.toolRegistry.executeTool(call.name, call.args, context);
        const record = {
          id: call.id,
          name: call.name,
          args: call.args,
          ...execution
        };
        executedTools.push(record);
        onToolResult(record);

        // Notify client if files were modified
        if (execution.isMutation && call.args?.path) {
          onFileChanged({
            path: call.args.path,
            action: call.name === 'delete_file' ? 'deleted' : 'updated'
          });
        }

        // Feed tool response back into next conversation turn
        conversation.push({
          role: 'tool',
          name: call.name,
          content: execution.success ? execution.result : { error: execution.error }
        });
      }

      // Continue loop with updated conversation history containing tool results
    }

    if (iterations >= this.maxIterations) {
      logger.warn(`AgentLoopEngine reached maximum iteration limit (${this.maxIterations})`);
    }

    return {
      text: accumulatedText,
      executedTools,
      iterations,
      cancelled: Boolean(abortSignal?.aborted)
    };
  }
}

export const agentLoopEngine = new AgentLoopEngine();
