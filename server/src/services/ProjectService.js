/**
 * @file ProjectService.js
 * Layer 2: Business Logic - Manages Project Lifecycle, Verification, and Operations.
 */

import path from 'node:path';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '../utils/AppError.js';
import { ProjectStatus, ProjectTemplates } from '@kodra/shared';

export class ProjectService {
  /**
   * @param {import('../repositories/ProjectRepository.js').ProjectRepository} projectRepo
   * @param {import('./WorkspaceService.js').WorkspaceService} workspaceService
   * @param {import('../repositories/FileSystemRepository.js').FileSystemRepository} fileSystemRepo
   */
  constructor(projectRepo, workspaceService, fileSystemRepo) {
    this.projectRepo = projectRepo;
    this.workspaceService = workspaceService;
    this.fs = fileSystemRepo;
  }

  /**
   * Create a new project with physical workspace initialization
   */
  async createProject({ name, description = '', ownerId = 'anonymous', template = ProjectTemplates.VITE_REACT }) {
    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new ValidationError('Project name must be a string of at least 2 characters.');
    }
    const sanitizedName = name.trim();

    if (!/^[a-zA-Z0-9-_]+$/.test(sanitizedName)) {
      throw new ValidationError('Project name can only contain alphanumeric characters, hyphens, and underscores.');
    }

    if (!Object.values(ProjectTemplates).includes(template)) {
      throw new ValidationError(`Invalid template "${template}". Allowed: ${Object.values(ProjectTemplates).join(', ')}`);
    }

    // 2. Uniqueness check for owner
    const existing = await this.projectRepo.findByOwnerAndName(ownerId, sanitizedName);
    if (existing) {
      throw new ConflictError(`A project named "${sanitizedName}" already exists for this account.`);
    }

    // 3. Generate Project ID & Workspace Path
    const projectId = new mongoose.Types.ObjectId();
    const workspacePath = path.join(config.storage.basePath, projectId.toString());

    // 4. Physical Workspace Scaffolding
    await this.workspaceService.scaffoldWorkspace(workspacePath, template, sanitizedName);

    // 5. Database Persistence
    const project = await this.projectRepo.create({
      _id: projectId,
      name: sanitizedName,
      description: description.trim(),
      ownerId,
      template,
      workspacePath,
      status: ProjectStatus.READY
    });

    return project;
  }

  /**
   * Get project by ID with ownership verification
   */
  async getProjectById(id, ownerId = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid project ID format: "${id}".`);
    }

    const project = await this.projectRepo.findById(id);
    if (!project) {
      throw new NotFoundError(`Project with ID "${id}" was not found.`);
    }

    if (ownerId && project.ownerId !== 'anonymous' && project.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to access this project.');
    }

    return project;
  }

  /**
   * List projects for an owner
   */
  async listProjects(ownerId = 'anonymous', options = {}) {
    return await this.projectRepo.listByOwner(ownerId, options);
  }

  /**
   * Delete a project, its database record, and its physical files
   */
  async deleteProject(id, ownerId = null) {
    const project = await this.getProjectById(id, ownerId);

    // 1. Delete physical directory on disk
    await this.fs.deleteDirectory(project.workspacePath);

    // 2. Delete database record
    await this.projectRepo.deleteById(id);

    return { id, name: project.name, deleted: true };
  }

  /**
   * Get directory file tree for project
   */
  async getProjectFileTree(id, ownerId = null) {
    const project = await this.getProjectById(id, ownerId);
    return await this.workspaceService.getFileTree(project.workspacePath);
  }

  /**
   * Read file content inside project
   */
  async getFileContent(id, relativePath, ownerId = null) {
    if (!relativePath) {
      throw new ValidationError('File path parameter is required.');
    }
    const project = await this.getProjectById(id, ownerId);
    return await this.workspaceService.readFile(project.workspacePath, relativePath);
  }

  /**
   * Save file content inside project
   */
  async saveFileContent(id, relativePath, content, ownerId = null) {
    if (!relativePath) {
      throw new ValidationError('File path is required.');
    }
    const project = await this.getProjectById(id, ownerId);
    return await this.workspaceService.writeFile(project.workspacePath, relativePath, content);
  }

  /**
   * Delete file inside project
   */
  async deleteFile(id, relativePath, ownerId = null) {
    if (!relativePath) {
      throw new ValidationError('File path is required.');
    }
    const project = await this.getProjectById(id, ownerId);
    await this.workspaceService.deleteFile(project.workspacePath, relativePath);
    return { path: relativePath, deleted: true };
  }
}
