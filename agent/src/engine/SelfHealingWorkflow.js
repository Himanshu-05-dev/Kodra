/**
 * @file SelfHealingWorkflow.js
 * Layer 2: Domain Engine - Autonomous Self-Healing and Error Repair Pipeline.
 * Orchestrates observation -> diagnosis -> repair -> re-verification loops.
 */

import { ErrorParser } from '../diagnostics/ErrorParser.js';
import { logger } from '../../../server/src/infrastructure/logger/logger.js';

export class SelfHealingWorkflow {
  /**
   * Determine the most relevant test/build verification command for the project
   * @param {object} project 
   * @param {import('../../../server/src/repositories/FileSystemRepository.js').FileSystemRepository} fileRepo
   * @returns {Promise<string>}
   */
  static async detectVerificationCommand(project, fileRepo) {
    try {
      const packageJsonPath = fileRepo.resolveSafePath(project.workspacePath, 'package.json');
      const hasPkg = await fileRepo.exists(packageJsonPath);
      if (hasPkg) {
        const raw = await fileRepo.readFile(packageJsonPath);
        const pkg = JSON.parse(raw);
        if (pkg.scripts?.test && !pkg.scripts.test.includes('no test specified')) {
          return 'npm test';
        }
        if (pkg.scripts?.build) {
          return 'npm run build';
        }
      }
    } catch {
      // Fallback
    }

    if (project.template === 'vite-react') {
      return 'npm run build';
    }
    return 'npm test';
  }

  /**
   * Run automated project diagnostics by executing the verification command
   * @param {object} context 
   * @param {string} [customCommand]
   */
  static async runDiagnostics(context, customCommand) {
    const { project, fileRepo, execManager } = context;
    const command = customCommand || (await this.detectVerificationCommand(project, fileRepo));

    logger.info(`SelfHealingWorkflow: Running diagnostics verification "${command}" for project [${project._id}]`);

    const execResult = await execManager.executeCommand({
      projectId: project._id,
      containerId: project.containerId,
      workspacePath: project.workspacePath,
      command
    });

    const diagnosis = ErrorParser.parse(execResult.stdout, execResult.stderr, execResult.exitCode);

    return {
      command,
      exitCode: execResult.exitCode,
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      diagnosis,
      isClean: execResult.exitCode === 0 && !diagnosis.hasError
    };
  }

  /**
   * Execute autonomous self-healing repair cycle
   * @param {object} params
   * @param {import('./AgentLoopEngine.js').AgentLoopEngine} params.loopEngine
   * @param {import('../providers/BaseProvider.js').BaseProvider} params.provider
   * @param {object} params.context
   * @param {AbortSignal} [params.abortSignal]
   * @param {object} [params.callbacks]
   */
  static async executeRepair({
    loopEngine,
    provider,
    context,
    abortSignal,
    callbacks = {}
  }) {
    const { onStep = () => {}, onChunk = () => {} } = callbacks;

    // Step 1: Initial Diagnostic Baseline
    onStep({ current: 1, total: 5, phase: 'Running build/test verification baseline' });
    const baseline = await this.runDiagnostics(context);

    if (baseline.isClean) {
      const msg = `✅ **Project Health Clean**\n\nThe verification command \`${baseline.command}\` exited cleanly with code 0. No build errors or test failures detected.`;
      onChunk(msg);
      return {
        repaired: false,
        alreadyHealthy: true,
        command: baseline.command,
        summary: 'No errors detected in workspace'
      };
    }

    // Step 2: Formulate repair prompt from diagnostics
    onStep({
      current: 2,
      total: 5,
      phase: `Diagnosed ${baseline.diagnosis.errorType}: ${baseline.diagnosis.summary}`
    });

    const repairPrompt = `Autonomous Self-Healing Repair Task:
The verification command "${baseline.command}" failed with exit code ${baseline.exitCode}.

Diagnostic Analysis:
- Error Type: ${baseline.diagnosis.errorType}
- Target File: ${baseline.diagnosis.file || 'Inspect relevant files'}
- Summary: ${baseline.diagnosis.summary}
- Suggested Action: ${baseline.diagnosis.suggestedAction}

Error Snippet:
\`\`\`
${baseline.diagnosis.rawSnippet}
\`\`\`

Instructions:
1. Inspect the failing file using "read_file".
2. Locate the bug or missing syntax/import.
3. Apply the correction using "edit_file" or "write_file".
4. Re-run "${baseline.command}" using "run_command" to verify the fix.
5. Summarize what caused the bug and how it was fixed.`;

    const systemInstruction = `You are Kodra's Autonomous Self-Healing Engine.
Your goal is to inspect code errors, fix them surgically, and verify that builds and tests pass cleanly.`;

    // Step 3: Run autonomous repair reasoning loop
    onStep({ current: 3, total: 5, phase: 'Autonomous agent patching code' });

    const loopResult = await loopEngine.runLoop({
      provider,
      context,
      messages: [{ role: 'user', content: repairPrompt }],
      systemInstruction,
      abortSignal,
      callbacks: {
        ...callbacks,
        onStep: (step) => onStep({ current: 3, total: 5, phase: step.phase })
      }
    });

    if (loopResult.cancelled) {
      return {
        repaired: false,
        cancelled: true,
        summary: 'Repair cycle cancelled by user'
      };
    }

    // Step 4: Final verification pass
    onStep({ current: 4, total: 5, phase: 'Running post-repair verification check' });
    const postCheck = await this.runDiagnostics(context, baseline.command);

    // Step 5: Completion reporting
    onStep({ current: 5, total: 5, phase: postCheck.isClean ? 'Repairs verified successfully' : 'Diagnostic review completed' });

    return {
      repaired: postCheck.isClean,
      initialDiagnosis: baseline.diagnosis,
      finalExitCode: postCheck.exitCode,
      command: baseline.command,
      text: loopResult.text,
      executedTools: loopResult.executedTools
    };
  }
}
