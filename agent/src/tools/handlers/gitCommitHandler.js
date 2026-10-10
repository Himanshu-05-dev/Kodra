/**
 * @file gitCommitHandler.js
 * Tool handler for 'git_commit'.
 * Stages changes and creates a Git commit in the project workspace.
 */

import { gitService } from '../../../../server/src/services/GitService.js';

export async function gitCommitHandler(args, context) {
  const { message, stageAll = true } = args;
  const { workspacePath } = context;

  if (!workspacePath) {
    throw new Error('Workspace path is required in agent execution context');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Commit message is required');
  }

  const commitResult = await gitService.commit(workspacePath, {
    message: message.trim(),
    stageAll: Boolean(stageAll)
  });

  return {
    hash: commitResult.hash,
    message: commitResult.message,
    timestamp: commitResult.timestamp,
    success: true
  };
}
