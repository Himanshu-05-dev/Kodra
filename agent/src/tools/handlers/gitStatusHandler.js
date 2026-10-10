/**
 * @file gitStatusHandler.js
 * Tool handler for 'git_status'.
 * Checks active branch and modified/staged/untracked files in the workspace.
 */

import { gitService } from '../../../../server/src/services/GitService.js';

export async function gitStatusHandler(args, context) {
  const { workspacePath } = context;

  if (!workspacePath) {
    throw new Error('Workspace path is required in agent execution context');
  }

  const status = await gitService.getStatus(workspacePath);

  return {
    branch: status.branch,
    isClean: status.isClean,
    counts: status.counts,
    staged: status.staged,
    unstaged: status.unstaged,
    untracked: status.untracked
  };
}
