/**
 * @file projectRoutes.js
 * Layer 1: Routes - Project management and workspace file endpoints.
 */

import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';

const router = Router();

// Project Management
router.post('/', ProjectController.createProject);
router.get('/', ProjectController.listProjects);
router.get('/:id', ProjectController.getProject);
router.delete('/:id', ProjectController.deleteProject);

// Workspace Files
router.get('/:id/files', ProjectController.getProjectFiles);
router.get('/:id/files/content', ProjectController.getProjectFileContent);
router.put('/:id/files', ProjectController.saveProjectFile);
router.delete('/:id/files', ProjectController.deleteProjectFile);

export default router;
