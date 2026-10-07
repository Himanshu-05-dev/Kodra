/**
 * @file AgentSessionRepository.js
 * Layer 3: Data Access - Isolates database queries for AgentSession entity.
 */

import { AgentSessionModel } from '../models/AgentSession.js';

export class AgentSessionRepository {
  /**
   * Find active session for project, or create one if none exists
   */
  async getOrCreateSession(projectId, userId = 'anonymous') {
    let session = await AgentSessionModel.findOne({ projectId, userId }).lean();

    if (!session) {
      session = await AgentSessionModel.create({
        projectId,
        userId
      });
      session = session.toObject();
    }

    return session;
  }

  async findById(id) {
    return await AgentSessionModel.findById(id).lean();
  }

  async updateStatus(id, status) {
    return await AgentSessionModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();
  }
}
