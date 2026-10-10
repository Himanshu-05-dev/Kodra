/**
 * @file gitDiffHandler.js
 * Tool handler for 'git_diff'.
 * Inspects working tree or staged diffs in the project workspace.
 */

import { gitService } from '../../../../server/src/services/GitService.js';

export async function gitDiffHandler(args, context) {
  const { staged = false, path: filePath = null } = args;
  const { workspacePath } = context;

  if (!workspacePath) {
    throw new Error('Workspace path is required in agent execution context');
  }

  const result = await gitService.getDiff(workspacePath, {
    staged: Boolean(staged),
    filePath: filePath || null
  });

  return {
    staged: result.staged,
    filePath: result.filePath,
    diff: result.diff || '(No diff detected)'
  };
}
