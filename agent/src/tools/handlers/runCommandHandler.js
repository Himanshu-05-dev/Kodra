/**
 * @file runCommandHandler.js
 * Tool handler for 'run_command'.
 * Executes shell commands inside the Docker container or host sandbox.
 */

export async function runCommandHandler(args, context) {
  const { command } = args;
  const { projectId, project, workspacePath, execManager } = context;

  if (!command || typeof command !== 'string' || !command.trim()) {
    throw new Error('Command argument is required and must be a non-empty string');
  }

  const result = await execManager.executeCommand({
    projectId,
    containerId: project?.containerId,
    workspacePath,
    command: command.trim()
  });

  return {
    command: command.trim(),
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    timedOut: result.timedOut,
    success: result.exitCode === 0
  };
}
