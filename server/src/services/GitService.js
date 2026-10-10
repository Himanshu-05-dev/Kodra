/**
 * @file GitService.js
 * Layer 2: Business Logic - Manages Git Version Control Operations and Remote Cloning.
 * Safely executes Git CLI commands with argument arrays and timeout guards.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ValidationError, AppError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';

const execFileAsync = promisify(execFile);

export class GitService {
  constructor(timeoutMs = 30000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Helper to execute git command safely inside a workspace directory
   * @param {string} workspacePath
   * @param {string[]} args
   * @returns {Promise<{ stdout: string, stderr: string }>}
   */
  async runGit(workspacePath, args) {
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: workspacePath,
        timeout: this.timeoutMs,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_AUTHOR_NAME: 'Kodra Developer',
          GIT_AUTHOR_EMAIL: 'dev@kodra.ai',
          GIT_COMMITTER_NAME: 'Kodra Developer',
          GIT_COMMITTER_EMAIL: 'dev@kodra.ai'
        },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
      });
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (err) {
      const errorMsg = err.stderr?.trim() || err.stdout?.trim() || err.message;
      throw new AppError(`Git execution failed [git ${args[0]}]: ${errorMsg}`, 500, 'GIT_EXECUTION_ERROR');
    }
  }

  /**
   * Check if workspace is an initialized git repository
   * @param {string} workspacePath
   */
  async isGitRepo(workspacePath) {
    try {
      const gitDir = path.join(workspacePath, '.git');
      const stats = await fs.stat(gitDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Initialize a git repository if not already present
   * @param {string} workspacePath
   */
  async initRepo(workspacePath) {
    const isRepo = await this.isGitRepo(workspacePath);
    if (!isRepo) {
      await this.runGit(workspacePath, ['init', '-b', 'main']);
      await this.runGit(workspacePath, ['config', 'user.name', 'Kodra Developer']);
      await this.runGit(workspacePath, ['config', 'user.email', 'dev@kodra.ai']);
      logger.info(`Initialized Git repository in ${workspacePath}`);
    }
    return { initialized: true };
  }

  /**
   * Get parsed Git status for a workspace
   * @param {string} workspacePath
   */
  async getStatus(workspacePath) {
    const isRepo = await this.isGitRepo(workspacePath);
    if (!isRepo) {
      // Auto-initialize for seamless IDE experience
      await this.initRepo(workspacePath);
    }

    // Get current branch
    let branch = 'main';
    try {
      const { stdout: branchOut } = await this.runGit(workspacePath, ['branch', '--show-current']);
      branch = branchOut || 'main';
    } catch {}

    // Get porcelain status
    const { stdout: porcelain } = await this.runGit(workspacePath, ['status', '--porcelain=v1']);

    const staged = [];
    const unstaged = [];
    const untracked = [];

    if (porcelain) {
      const lines = porcelain.split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.length < 3) continue;
        const x = line[0]; // Staged status index
        const y = line[1]; // Unstaged status working tree
        const filePath = line.slice(3).trim();

        if (x === '?' && y === '?') {
          untracked.push({ path: filePath, status: 'untracked', code: '?' });
        } else {
          // Staged check
          if (x !== ' ' && x !== '?') {
            staged.push({
              path: filePath,
              status: x === 'M' ? 'modified' : x === 'A' ? 'added' : x === 'D' ? 'deleted' : x === 'R' ? 'renamed' : 'staged',
              code: x
            });
          }
          // Unstaged check
          if (y !== ' ' && y !== '?') {
            unstaged.push({
              path: filePath,
              status: y === 'M' ? 'modified' : y === 'D' ? 'deleted' : 'modified',
              code: y
            });
          }
        }
      }
    }

    const isClean = staged.length === 0 && unstaged.length === 0 && untracked.length === 0;

    return {
      isRepo: true,
      branch,
      isClean,
      staged,
      unstaged,
      untracked,
      counts: {
        staged: staged.length,
        unstaged: unstaged.length,
        untracked: untracked.length,
        totalChanges: staged.length + unstaged.length + untracked.length
      }
    };
  }

  /**
   * Get Git diff of changes
   * @param {string} workspacePath
   * @param {{ staged?: boolean, filePath?: string }} [options]
   */
  async getDiff(workspacePath, { staged = false, filePath = null } = {}) {
    await this.initRepo(workspacePath);

    const args = ['diff'];
    if (staged) {
      args.push('--cached');
    }
    if (filePath) {
      args.push('--', filePath);
    }

    const { stdout: diff } = await this.runGit(workspacePath, args);
    return {
      diff,
      staged,
      filePath: filePath || null
    };
  }

  /**
   * Stage files (git add)
   * @param {string} workspacePath
   * @param {string[]} [files]
   */
  async stageFiles(workspacePath, files = ['.']) {
    await this.initRepo(workspacePath);
    const targetFiles = Array.isArray(files) && files.length > 0 ? files : ['.'];
    await this.runGit(workspacePath, ['add', ...targetFiles]);
    return await this.getStatus(workspacePath);
  }

  /**
   * Unstage files (git reset HEAD)
   * @param {string} workspacePath
   * @param {string[]} [files]
   */
  async unstageFiles(workspacePath, files = []) {
    await this.initRepo(workspacePath);
    if (!Array.isArray(files) || files.length === 0) {
      await this.runGit(workspacePath, ['reset', 'HEAD']);
    } else {
      await this.runGit(workspacePath, ['reset', 'HEAD', '--', ...files]);
    }
    return await this.getStatus(workspacePath);
  }

  /**
   * Commit changes with message
   * @param {string} workspacePath
   * @param {{ message: string, stageAll?: boolean }} options
   */
  async commit(workspacePath, { message, stageAll = true }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new ValidationError('Commit message is required and cannot be empty.');
    }

    await this.initRepo(workspacePath);

    if (stageAll) {
      await this.runGit(workspacePath, ['add', '-A']);
    }

    // Verify there is something to commit
    const status = await this.getStatus(workspacePath);
    if (status.staged.length === 0) {
      throw new ValidationError('No staged changes to commit.');
    }

    const trimmedMsg = message.trim();
    await this.runGit(workspacePath, ['commit', '-m', trimmedMsg]);

    // Query commit hash
    const { stdout: hash } = await this.runGit(workspacePath, ['rev-parse', '--short', 'HEAD']);

    logger.info(`Committed [${hash}] in ${workspacePath}: ${trimmedMsg}`);

    return {
      hash,
      message: trimmedMsg,
      timestamp: new Date()
    };
  }

  /**
   * List all branches
   * @param {string} workspacePath
   */
  async getBranches(workspacePath) {
    await this.initRepo(workspacePath);

    let current = 'main';
    try {
      const { stdout: currentBranch } = await this.runGit(workspacePath, ['branch', '--show-current']);
      current = currentBranch || 'main';
    } catch {}

    const { stdout: branchList } = await this.runGit(workspacePath, ['branch']);
    const branches = branchList
      .split('\n')
      .map(b => b.replace(/^\*\s*/, '').trim())
      .filter(Boolean);

    if (!branches.includes(current)) {
      branches.unshift(current);
    }

    return { current, branches };
  }

  /**
   * Checkout or create branch
   * @param {string} workspacePath
   * @param {{ branch: string, create?: boolean }} options
   */
  async checkoutBranch(workspacePath, { branch, create = false }) {
    if (!branch || typeof branch !== 'string' || !branch.trim()) {
      throw new ValidationError('Branch name is required.');
    }

    const sanitizedBranch = branch.trim();
    if (!/^[a-zA-Z0-9/_-]+$/.test(sanitizedBranch)) {
      throw new ValidationError('Branch name contains invalid characters.');
    }

    await this.initRepo(workspacePath);

    const args = create ? ['checkout', '-b', sanitizedBranch] : ['checkout', sanitizedBranch];
    await this.runGit(workspacePath, args);

    return { current: sanitizedBranch };
  }

  /**
   * Get recent commit history
   * @param {string} workspacePath
   * @param {number} [limit]
   */
  async getHistory(workspacePath, limit = 15) {
    await this.initRepo(workspacePath);

    try {
      const { stdout: logOut } = await this.runGit(workspacePath, [
        'log',
        `-n${Math.min(limit, 50)}`,
        '--pretty=format:%h|%an|%ar|%s'
      ]);

      if (!logOut) return [];

      return logOut.split('\n').filter(Boolean).map(line => {
        const [hash, author, relativeDate, ...msgParts] = line.split('|');
        return {
          hash,
          author,
          relativeDate,
          message: msgParts.join('|')
        };
      });
    } catch {
      // Empty repository with no commits yet
      return [];
    }
  }

  /**
   * Generate an intelligent conventional commit message from git diff
   * @param {string} diff
   * @param {Array<{ path: string, status: string }>} [files]
   */
  generateCommitMessage(diff = '', files = []) {
    if (!diff && (!files || files.length === 0)) {
      return 'chore: update project workspace';
    }

    // Inspect files modified
    const filePaths = files.map(f => f.path || f);
    const hasPackageJson = filePaths.some(f => f.includes('package.json'));
    const hasReadme = filePaths.some(f => f.toLowerCase().includes('readme'));
    const hasStyles = filePaths.some(f => f.endsWith('.css') || f.endsWith('.scss'));
    const hasComponents = filePaths.some(f => f.includes('components') || f.endsWith('.jsx') || f.endsWith('.tsx'));
    const hasTests = filePaths.some(f => f.includes('test') || f.includes('spec'));
    const hasServer = filePaths.some(f => f.includes('server') || f.includes('api') || f.includes('routes'));

    let type = 'feat';
    let scope = '';
    let summary = '';

    if (hasPackageJson) {
      type = 'chore';
      scope = 'deps';
      summary = 'update project dependencies';
    } else if (hasTests) {
      type = 'test';
      scope = 'suite';
      summary = 'add test coverage and validations';
    } else if (hasStyles) {
      type = 'style';
      scope = 'ui';
      summary = 'update styling and layout theme';
    } else if (hasComponents) {
      type = 'feat';
      scope = 'ui';
      const mainComp = filePaths.find(f => f.endsWith('.jsx'))?.split('/').pop()?.replace('.jsx', '') || 'components';
      summary = `enhance ${mainComp} interface`;
    } else if (hasServer) {
      type = 'feat';
      scope = 'api';
      summary = 'implement backend service endpoints';
    } else if (hasReadme) {
      type = 'docs';
      summary = 'update project documentation';
    } else {
      type = 'chore';
      summary = 'update project codebase';
    }

    return scope ? `${type}(${scope}): ${summary}` : `${type}: ${summary}`;
  }

  /**
   * Clone a remote Git repository into a target directory
   * @param {string} targetWorkspacePath
   * @param {string} repoUrl
   * @param {{ branch?: string, token?: string }} [options]
   */
  async cloneRemoteRepo(targetWorkspacePath, repoUrl, { branch = null, token = null } = {}) {
    if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
      throw new ValidationError('Repository URL is required.');
    }

    let url = repoUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('git@') && !url.startsWith('file://')) {
      throw new ValidationError('Invalid repository URL format. Must start with https://, git@, or file://');
    }

    // Embed token safely if provided for private repository authentication
    let authenticatedUrl = url;
    if (token && url.startsWith('https://')) {
      authenticatedUrl = url.replace('https://', `https://${encodeURIComponent(token)}@`);
    }

    const args = ['clone', '--depth', '1'];
    if (branch) {
      args.push('--branch', branch.trim());
    }
    args.push(authenticatedUrl, targetWorkspacePath);

    try {
      await execFileAsync('git', args, {
        timeout: 120000, // 2 minutes for clone
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0'
        }
      });

      // Scrub token from remote config URL so it is never persisted in plaintext
      if (token) {
        try {
          await this.runGit(targetWorkspacePath, ['remote', 'set-url', 'origin', url]);
        } catch {}
      }

      logger.info(`Successfully cloned ${url} into ${targetWorkspacePath}`);
      return { success: true, workspacePath: targetWorkspacePath };
    } catch (err) {
      const sanitizedMsg = (err.stderr || err.message || '').replace(new RegExp(token, 'g'), '***');
      throw new AppError(`Failed to clone git repository: ${sanitizedMsg}`, 400, 'GIT_CLONE_ERROR');
    }
  }
}

export const gitService = new GitService();
