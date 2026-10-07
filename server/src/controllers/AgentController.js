/**
 * @file AgentController.js
 * Layer 1: Controller - AI Agent Conversation REST Endpoints.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { agentService } from '../services/AgentService.js';

export class AgentController {
  /**
   * GET /api/v1/agent/:projectId/messages
   */
  static async getMessages(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.headers['x-user-id'] || 'anonymous';
      const history = await agentService.getHistory(projectId, userId);
      return ApiResponse.success(res, history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/agent/:projectId/clear
   */
  static async clearMessages(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.headers['x-user-id'] || 'anonymous';
      const result = await agentService.clearHistory(projectId, userId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/agent/:projectId/cancel
   */
  static async cancel(req, res, next) {
    try {
      const { projectId } = req.params;
      const result = await agentService.cancelSession(projectId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/agent/:projectId/heal
   */
  static async heal(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.headers['x-user-id'] || 'anonymous';
      const result = await agentService.runSelfHealing(projectId, userId);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
