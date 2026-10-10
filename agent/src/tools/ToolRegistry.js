/**
 * @file ToolRegistry.js
 * Central Registry of Agent Tools, JSON Schema Adapters, and Dispatch Execution.
 */

import { ToolDefinitions } from './ToolDefinitions.js';
import { listFilesHandler } from './handlers/listFilesHandler.js';
import { readFileHandler } from './handlers/readFileHandler.js';
import { writeFileHandler } from './handlers/writeFileHandler.js';
import { editFileHandler } from './handlers/editFileHandler.js';
import { deleteFileHandler } from './handlers/deleteFileHandler.js';
import { searchFilesHandler } from './handlers/searchFilesHandler.js';
import { runCommandHandler } from './handlers/runCommandHandler.js';
import { gitStatusHandler } from './handlers/gitStatusHandler.js';
import { gitDiffHandler } from './handlers/gitDiffHandler.js';
import { gitCommitHandler } from './handlers/gitCommitHandler.js';

export class ToolRegistry {
  constructor() {
    this.definitions = ToolDefinitions;
    this.handlers = new Map([
      ['list_files', listFilesHandler],
      ['read_file', readFileHandler],
      ['write_file', writeFileHandler],
      ['edit_file', editFileHandler],
      ['delete_file', deleteFileHandler],
      ['search_files', searchFilesHandler],
      ['run_command', runCommandHandler],
      ['git_status', gitStatusHandler],
      ['git_diff', gitDiffHandler],
      ['git_commit', gitCommitHandler]
    ]);

    this.mutationTools = new Set(['write_file', 'edit_file', 'delete_file', 'git_commit']);
  }

  /**
   * Get all tool definitions
   */
  getDefinitions() {
    return this.definitions;
  }

  /**
   * Returns schema compatible with Google Gemini @google/genai SDK
   */
  getGeminiDeclarations() {
    return this.definitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: tool.parameters.type,
        properties: tool.parameters.properties,
        required: tool.parameters.required || []
      }
    }));
  }

  /**
   * Returns schema compatible with OpenAI Tools API
   */
  getOpenAITools() {
    return this.definitions.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties,
          required: tool.parameters.required || []
        }
      }
    }));
  }

  /**
   * Check if a tool modifies the filesystem
   * @param {string} toolName 
   */
  isMutation(toolName) {
    return this.mutationTools.has(toolName);
  }

  /**
   * Execute a tool by name with arguments and context
   * @param {string} toolName
   * @param {object} args
   * @param {object} context
   * @returns {Promise<{ success: boolean, result?: any, error?: string, durationMs: number, isMutation: boolean }>}
   */
  async executeTool(toolName, args = {}, context) {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      return {
        success: false,
        error: `Tool "${toolName}" is not recognized. Available tools: ${Array.from(this.handlers.keys()).join(', ')}`,
        durationMs: 0,
        isMutation: false
      };
    }

    const startTime = Date.now();
    try {
      const result = await handler(args, context);
      const durationMs = Date.now() - startTime;
      return {
        success: true,
        result,
        durationMs,
        isMutation: this.isMutation(toolName)
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        error: err.message || 'An error occurred during tool execution',
        durationMs,
        isMutation: false
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
