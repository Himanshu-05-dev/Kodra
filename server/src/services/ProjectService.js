/**
 * @file ProjectService.js
 * Layer 2: Business Logic - Manages Project Lifecycle, Verification, and Operations.
 */

import path from 'node:path';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '../utils/AppError.js';
import { ProjectStatus, ProjectTemplates } from '@kodra/shared';
import { gitService as defaultGitService } from './GitService.js';

export class ProjectService {
  /**
   * @param {import('../repositories/ProjectRepository.js').ProjectRepository} projectRepo
   * @param {import('./WorkspaceService.js').WorkspaceService} workspaceService
   * @param {import('../repositories/FileSystemRepository.js').FileSystemRepository} fileSystemRepo
   * @param {import('./SandboxService.js').SandboxService} [sandboxService]
   * @param {import('./GitService.js').GitService} [gitService]
   */
  constructor(projectRepo, workspaceService, fileSystemRepo, sandboxService = null, gitService = null) {
    this.projectRepo = projectRepo;
    this.workspaceService = workspaceService;
    this.fs = fileSystemRepo;
    this.sandboxService = sandboxService;
    this.gitService = gitService || defaultGitService;
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
   * Update project fields (rename, change description)
   */
  async updateProject(id, { name, description }, ownerId = null) {
    const project = await this.getProjectById(id, ownerId);
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        throw new ValidationError('Project name must be a string of at least 2 characters.');
      }
      const sanitizedName = name.trim();
      if (!/^[a-zA-Z0-9-_]+$/.test(sanitizedName)) {
        throw new ValidationError('Project name can only contain alphanumeric characters, hyphens, and underscores.');
      }

      if (sanitizedName !== project.name) {
        const existing = await this.projectRepo.findByOwnerAndName(project.ownerId, sanitizedName);
        if (existing) {
          throw new ConflictError(`A project named "${sanitizedName}" already exists for this account.`);
        }
        updateData.name = sanitizedName;
      }
    }

    if (description !== undefined) {
      updateData.description = typeof description === 'string' ? description.trim() : '';
    }

    if (Object.keys(updateData).length === 0) {
      return project;
    }

    return await this.projectRepo.updateById(id, updateData);
  }

  /**
   * Clone an existing project
   */
  async cloneProject(id, { name = null } = {}, ownerId = null) {
    const original = await this.getProjectById(id, ownerId);

    let targetName = name?.trim();
    if (targetName) {
      if (!/^[a-zA-Z0-9-_]+$/.test(targetName)) {
        throw new ValidationError('Project name can only contain alphanumeric characters, hyphens, and underscores.');
      }
      const existing = await this.projectRepo.findByOwnerAndName(original.ownerId, targetName);
      if (existing) {
        throw new ConflictError(`A project named "${targetName}" already exists for this account.`);
      }
    } else {
      let candidate = `${original.name}-copy`;
      let existing = await this.projectRepo.findByOwnerAndName(original.ownerId, candidate);
      if (existing) {
        candidate = `${original.name}-copy-${Date.now().toString().slice(-4)}`;
      }
      targetName = candidate;
    }

    const newProjectId = new mongoose.Types.ObjectId();
    const newWorkspacePath = path.join(config.storage.basePath, newProjectId.toString());

    // 1. Copy physical workspace files
    await this.workspaceService.cloneWorkspace(original.workspacePath, newWorkspacePath);

    // 2. Create database document
    const cloned = await this.projectRepo.create({
      _id: newProjectId,
      name: targetName,
      description: original.description ? `${original.description} (Copy)` : `Clone of ${original.name}`,
      ownerId: original.ownerId,
      template: original.template,
      workspacePath: newWorkspacePath,
      status: ProjectStatus.READY
    });

    return cloned;
  }

  /**
   * Get project and ZIP stream for download/export
   */
  async getProjectExport(id, ownerId = null) {
    const project = await this.getProjectById(id, ownerId);
    const stream = this.workspaceService.exportZipStream(project.workspacePath);
    return { project, stream };
  }

  /**
   * Delete a project, its database record, and its physical files
   */
  async deleteProject(id, ownerId = null) {
    const project = await this.getProjectById(id, ownerId);

    // 0. Stop any active container / sandbox
    if (this.sandboxService) {
      try {
        await this.sandboxService.stopSandbox(id, ownerId);
      } catch {}
    }

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

  /**
   * Import a remote Git repository into a new project workspace
   */
  async importGitProject({ url, name = null, description = '', branch = null, token = null, ownerId = 'anonymous' }) {
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new ValidationError('Repository URL is required.');
    }

    // Extract default repository name from URL if not specified
    let targetName = name?.trim();
    if (!targetName) {
      const cleanUrl = url.trim().replace(/\.git$/, '');
      const parts = cleanUrl.split('/');
      targetName = parts[parts.length - 1] || 'git-imported-project';
    }

    // Sanitize name
    targetName = targetName.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40);
    if (targetName.length < 2) targetName = 'git-project';

    // Uniqueness check for owner
    let finalName = targetName;
    const existing = await this.projectRepo.findByOwnerAndName(ownerId, finalName);
    if (existing) {
      finalName = `${targetName}-${Date.now().toString().slice(-4)}`;
    }

    const projectId = new mongoose.Types.ObjectId();
    const workspacePath = path.join(config.storage.basePath, projectId.toString());

    // 1. Clone remote repository
    await this.gitService.cloneRemoteRepo(workspacePath, url.trim(), { branch, token });

    // 2. Auto-detect template
    let detectedTemplate = ProjectTemplates.VANILLA;
    try {
      const pkgPath = path.join(workspacePath, 'package.json');
      if (await this.fs.exists(pkgPath)) {
        const pkgContent = await this.fs.readFile(pkgPath);
        const pkg = JSON.parse(pkgContent);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps.react || allDeps.vite) {
          detectedTemplate = ProjectTemplates.VITE_REACT;
        } else if (allDeps.express || allDeps.fastify || allDeps.koa) {
          detectedTemplate = ProjectTemplates.NODE_EXPRESS;
        }
      }
    } catch {}

    // 3. Database Persistence
    const project = await this.projectRepo.create({
      _id: projectId,
      name: finalName,
      description: description.trim() || `Imported from ${url.trim()}`,
      ownerId,
      template: detectedTemplate,
      workspacePath,
      status: ProjectStatus.READY
    });

    return project;
  }
}
