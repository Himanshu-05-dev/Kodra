/**
 * @file ToolDefinitions.js
 * Standardized Tool Declarations and JSON Schemas for AI Coding Agent.
 * Compatible with Gemini Function Declarations and OpenAI Tool Calls.
 */

export const ToolDefinitions = Object.freeze([
  {
    name: 'list_files',
    description: 'List files and directories in the project workspace.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: {
          type: 'STRING',
          description: 'Relative directory path from project root (e.g. "src" or ""). Defaults to root directory.'
        },
        recursive: {
          type: 'BOOLEAN',
          description: 'Whether to list subdirectories recursively. Defaults to false.'
        }
      }
    }
  },
  {
    name: 'read_file',
    description: 'Read the full or sliced text content of a file in the workspace.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: {
          type: 'STRING',
          description: 'Relative file path from project root (e.g. "src/App.jsx" or "package.json").'
        },
        startLine: {
          type: 'INTEGER',
          description: 'Optional 1-indexed start line number to begin reading from.'
        },
        endLine: {
          type: 'INTEGER',
          description: 'Optional 1-indexed end line number to finish reading at.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Create a new file or completely overwrite an existing file in the project workspace.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: {
          type: 'STRING',
          description: 'Relative file path from project root (e.g. "src/utils/helpers.js").'
        },
        content: {
          type: 'STRING',
          description: 'The complete code or text content to write into the file.'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'edit_file',
    description: 'Perform a targeted replacement of a specific code snippet inside an existing file without rewriting the entire file.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: {
          type: 'STRING',
          description: 'Relative file path from project root.'
        },
        targetContent: {
          type: 'STRING',
          description: 'Exact text or lines of code currently inside the file to be replaced.'
        },
        replacementContent: {
          type: 'STRING',
          description: 'New code or text to replace the targetContent with.'
        }
      },
      required: ['path', 'targetContent', 'replacementContent']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the project workspace.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: {
          type: 'STRING',
          description: 'Relative file path from project root to delete.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'search_files',
    description: 'Perform a fast grep-style text search across all files in the project workspace (ignores node_modules and .git).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Search string or keyword to look for.'
        },
        path: {
          type: 'STRING',
          description: 'Optional relative directory path to narrow search scope (e.g. "src").'
        },
        caseSensitive: {
          type: 'BOOLEAN',
          description: 'Whether the search is case-sensitive. Defaults to false.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'run_command',
    description: 'Execute a non-interactive shell command inside the project development container/sandbox (e.g. "npm install lodash", "npm test", "npm run build").',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: {
          type: 'STRING',
          description: 'The exact command line string to execute.'
        }
      },
      required: ['command']
    }
  }
]);
