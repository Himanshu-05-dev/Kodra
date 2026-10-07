/**
 * @file ProjectRepository.js
 * Layer 3: Data Access - Isolates database queries for Project entity.
 */

import { ProjectModel } from '../models/Project.js';

export class ProjectRepository {
  /**
   * Create a new project document
   */
  async create(projectData) {
    return await ProjectModel.create(projectData);
  }

  /**
   * Find project by ID
   */
  async findById(id) {
    return await ProjectModel.findById(id).lean();
  }

  /**
   * Find project by owner and name
   */
  async findByOwnerAndName(ownerId, name) {
    return await ProjectModel.findOne({ ownerId, name }).lean();
  }

  /**
   * List projects belonging to an owner
   */
  async listByOwner(ownerId, { limit = 50, skip = 0, sort = { updatedAt: -1 } } = {}) {
    const [projects, total] = await Promise.all([
      ProjectModel.find({ ownerId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ProjectModel.countDocuments({ ownerId })
    ]);

    return { projects, total };
  }

  /**
   * Update project fields
   */
  async updateById(id, updateData) {
    return await ProjectModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Delete project by ID
   */
  async deleteById(id) {
    return await ProjectModel.findByIdAndDelete(id).lean();
  }
}
