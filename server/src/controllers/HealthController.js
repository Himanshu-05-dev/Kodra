/**
 * @file HealthController.js
 * Layer 1: Controller - System Health, Environment & Dependency Diagnostics.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { getConnectionStatus } from '../infrastructure/database/connection.js';
import { config } from '../config/index.js';

export class HealthController {
  /**
   * GET /health
   */
  static async getHealth(req, res, next) {
    try {
      const dbStatus = getConnectionStatus();
      const memoryUsage = process.memoryUsage();

      const healthData = {
        status: dbStatus.isConnected ? 'healthy' : 'degraded',
        service: 'kodra-backend',
        environment: config.env,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus.state,
          isConnected: dbStatus.isConnected
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memoryRssMB: Math.round(memoryUsage.rss / 1024 / 1024),
          memoryHeapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
        }
      };

      const statusCode = dbStatus.isConnected ? 200 : 503;
      return ApiResponse.success(res, healthData, statusCode);
    } catch (err) {
      next(err);
    }
  }
}
