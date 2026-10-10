/**
 * @file GitController.js
 * Layer 1: Controller - Git Version Control and Remote Repository REST Endpoints.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { ProjectService } from '../services/ProjectService.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { GitService, gitService } from '../services/GitService.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { FileSystemRepository } from '../repositories/FileSystemRepository.js';

const fileSystemRepo = new FileSystemRepository();
const projectRepo = new ProjectRepository();
const workspaceService = new WorkspaceService(fileSystemRepo);
const projectService = new ProjectService(projectRepo, workspaceService, fileSystemRepo, null, gitService);

function getRequestUserId(req) {
  return req.user?.uid || req.headers['x-user-id'] || 'anonymous';
}

export class GitController {
  /**
   * GET /api/v1/projects/:id/git/status
   */
  static async getStatus(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const status = await gitService.getStatus(project.workspacePath);
      return ApiResponse.success(res, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/git/diff
   */
  static async getDiff(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const staged = req.query.staged === 'true';
      const filePath = req.query.filePath || null;

      const diff = await gitService.getDiff(project.workspacePath, { staged, filePath });
      return ApiResponse.success(res, diff);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/git/stage
   */
  static async stageFiles(req, res, next) {
    try {
      const { id } = req.params;
      const { files } = req.body;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const status = await gitService.stageFiles(project.workspacePath, files);
      return ApiResponse.success(res, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/git/unstage
   */
  static async unstageFiles(req, res, next) {
    try {
      const { id } = req.params;
      const { files } = req.body;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const status = await gitService.unstageFiles(project.workspacePath, files);
      return ApiResponse.success(res, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/git/commit
   */
  static async commit(req, res, next) {
    try {
      const { id } = req.params;
      const { message, stageAll } = req.body;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const result = await gitService.commit(project.workspacePath, { message, stageAll });
      return ApiResponse.success(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/git/branches
   */
  static async getBranches(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const branches = await gitService.getBranches(project.workspacePath);
      return ApiResponse.success(res, branches);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/git/branches
   */
  static async checkoutBranch(req, res, next) {
    try {
      const { id } = req.params;
      const { branch, create } = req.body;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const result = await gitService.checkoutBranch(project.workspacePath, { branch, create: Boolean(create) });
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/git/history
   */
  static async getHistory(req, res, next) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit, 10) || 15;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const history = await gitService.getHistory(project.workspacePath, limit);
      return ApiResponse.success(res, history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/git/ai-commit-message
   */
  static async generateCommitMessage(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);
      const project = await projectService.getProjectById(id, ownerId);

      const diff = await gitService.getDiff(project.workspacePath, { staged: false });
      const status = await gitService.getStatus(project.workspacePath);

      const allChanged = [...status.staged, ...status.unstaged, ...status.untracked];
      const message = gitService.generateCommitMessage(diff.diff, allChanged);

      return ApiResponse.success(res, { message });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/import-git
   */
  static async importGitProject(req, res, next) {
    try {
      const { url, name, description, branch, token } = req.body;
      const ownerId = getRequestUserId(req);

      const project = await projectService.importGitProject({
        url,
        name,
        description,
        branch,
        token,
        ownerId
      });

      return ApiResponse.success(res, project, 201);
    } catch (err) {
      next(err);
    }
  }
}
