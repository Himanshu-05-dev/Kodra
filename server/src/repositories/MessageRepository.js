/**
 * @file MessageRepository.js
 * Layer 3: Data Access - Isolates database operations for Message entity.
 */

import { MessageModel } from '../models/Message.js';

export class MessageRepository {
  /**
   * Persist a message in database
   */
  async createMessage({ sessionId, role, content, toolCalls = [], toolResults = [] }) {
    return await MessageModel.create({
      sessionId,
      role,
      content,
      toolCalls,
      toolResults
    });
  }

  /**
   * Get chronological message history for a session
   */
  async getSessionMessages(sessionId, limit = 50) {
    return await MessageModel.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  }

  /**
   * Clear all messages in a session
   */
  async deleteBySessionId(sessionId) {
    return await MessageModel.deleteMany({ sessionId });
  }
}
