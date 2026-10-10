/**
 * @file ProjectController.js
 * Layer 1: Controller - Project & Workspace File REST Endpoints.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { ProjectService } from '../services/ProjectService.js';
import { SandboxService } from '../services/SandboxService.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { FileSystemRepository } from '../repositories/FileSystemRepository.js';

// Dependency Injection Composition Root for Project Domain
const fileSystemRepo = new FileSystemRepository();
const projectRepo = new ProjectRepository();
const workspaceService = new WorkspaceService(fileSystemRepo);
const sandboxService = new SandboxService(projectRepo);
const projectService = new ProjectService(projectRepo, workspaceService, fileSystemRepo, sandboxService);

function getRequestUserId(req) {
  return req.user?.uid || req.headers['x-user-id'] || 'anonymous';
}

export class ProjectController {
  /**
   * POST /api/v1/projects
   */
  static async createProject(req, res, next) {
    try {
      const { name, description, template } = req.body;
      const ownerId = getRequestUserId(req);

      const project = await projectService.createProject({
        name,
        description,
        template,
        ownerId
      });

      return ApiResponse.success(res, project, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects
   */
  static async listProjects(req, res, next) {
    try {
      const ownerId = getRequestUserId(req);
      const limit = parseInt(req.query.limit, 10) || 50;
      const skip = parseInt(req.query.skip, 10) || 0;

      const result = await projectService.listProjects(ownerId, { limit, skip });
      return ApiResponse.success(res, result.projects, 200, { total: result.total });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id
   */
  static async getProject(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);

      const project = await projectService.getProjectById(id, ownerId);
      return ApiResponse.success(res, project);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/projects/:id
   * Rename or update description
   */
  static async updateProject(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const ownerId = getRequestUserId(req);

      const updated = await projectService.updateProject(id, { name, description }, ownerId);
      return ApiResponse.success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/clone
   * Clone/Fork project workspace & record
   */
  static async cloneProject(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const ownerId = getRequestUserId(req);

      const cloned = await projectService.cloneProject(id, { name }, ownerId);
      return ApiResponse.success(res, cloned, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/export
   * Stream project directory as a ZIP archive
   */
  static async exportProject(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);

      const { project, stream } = await projectService.getProjectExport(id, ownerId);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}.zip"`);

      stream.on('error', (err) => next(err));
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id
   */
  static async deleteProject(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);

      const result = await projectService.deleteProject(id, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/files
   */
  static async getProjectFiles(req, res, next) {
    try {
      const { id } = req.params;
      const ownerId = getRequestUserId(req);

      const fileTree = await projectService.getProjectFileTree(id, ownerId);
      return ApiResponse.success(res, fileTree);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id/files/content?path=src/App.jsx
   */
  static async getProjectFileContent(req, res, next) {
    try {
      const { id } = req.params;
      const relativePath = req.query.path;
      const ownerId = getRequestUserId(req);

      const fileData = await projectService.getFileContent(id, relativePath, ownerId);
      return ApiResponse.success(res, fileData);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/projects/:id/files
   * Body: { path: "src/App.jsx", content: "..." }
   */
  static async saveProjectFile(req, res, next) {
    try {
      const { id } = req.params;
      const { path: relativePath, content } = req.body;
      const ownerId = getRequestUserId(req);

      const result = await projectService.saveFileContent(id, relativePath, content, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id/files?path=src/App.jsx
   */
  static async deleteProjectFile(req, res, next) {
    try {
      const { id } = req.params;
      const relativePath = req.query.path;
      const ownerId = getRequestUserId(req);

      const result = await projectService.deleteFile(id, relativePath, ownerId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
