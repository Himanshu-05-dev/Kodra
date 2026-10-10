/**
 * @file projectRoutes.js
 * Layer 1: Routes - Project management and workspace file endpoints.
 */

import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';
import { PreviewController } from '../controllers/PreviewController.js';
import { GitController } from '../controllers/GitController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceProjectCreationQuota } from '../middleware/quotaMiddleware.js';

const router = Router();

// Enforce authentication across all project operations
router.use(authenticate);

// Project Management
router.post('/', enforceProjectCreationQuota, ProjectController.createProject);
router.get('/', ProjectController.listProjects);
router.get('/:id', ProjectController.getProject);
router.patch('/:id', ProjectController.updateProject);
router.post('/:id/clone', ProjectController.cloneProject);
router.get('/:id/export', ProjectController.exportProject);
router.delete('/:id', ProjectController.deleteProject);

// Workspace Files
router.get('/:id/files', ProjectController.getProjectFiles);
router.get('/:id/files/content', ProjectController.getProjectFileContent);
router.put('/:id/files', ProjectController.saveProjectFile);
router.delete('/:id/files', ProjectController.deleteProjectFile);

// Live Preview Gateway
router.get('/:id/preview/status', PreviewController.getPreviewStatus);
router.post('/:id/preview/port', PreviewController.setPreviewPort);
router.get('/:id/preview/detect', PreviewController.detectPreviewPort);

// Git Version Control
router.post('/import-git', GitController.importGitProject);
router.get('/:id/git/status', GitController.getStatus);
router.get('/:id/git/diff', GitController.getDiff);
router.post('/:id/git/stage', GitController.stageFiles);
router.post('/:id/git/unstage', GitController.unstageFiles);
router.post('/:id/git/commit', GitController.commit);
router.get('/:id/git/branches', GitController.getBranches);
router.post('/:id/git/branches', GitController.checkoutBranch);
router.get('/:id/git/history', GitController.getHistory);
router.post('/:id/git/ai-commit-message', GitController.generateCommitMessage);

export default router;
