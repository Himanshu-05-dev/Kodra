/**
 * @file server.js
 * Kodra Backend Bootstrap Entry Point.
 * Orchestrates Express, Middleware, Routing, Database, and Graceful Teardown.
 */

import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './infrastructure/logger/logger.js';
import { connectDB, disconnectDB } from './infrastructure/database/connection.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { NotFoundError } from './utils/AppError.js';
import { TerminalGateway } from './gateways/TerminalGateway.js';
import { AgentGateway } from './gateways/AgentGateway.js';
import { PreviewProxyGateway } from './gateways/PreviewProxyGateway.js';
import { ptyManager } from './infrastructure/terminal/PtyManager.js';

const app = express();

// 1. Live Preview Reverse Proxy Gateway Instance
const previewProxyGateway = new PreviewProxyGateway();

// 2. Security & Core Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false, // Allow IDE iframe embedding
  contentSecurityPolicy: false // Allow preview apps to load assets freely
}));

app.use(cors({
  origin: config.server.corsOrigin === '*' ? '*' : config.server.corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-User-Id']
}));

// 3. Dynamic Live Preview Reverse Proxy (Precedes body parsers to avoid stream consumption)
app.use(previewProxyGateway.middleware);

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// 4. Request Correlation & Logging
app.use(requestLogger);

// 5. API Versioned Routes
app.use(config.server.apiPrefix, apiRouter);

// 6. Catch Unmapped Routes (404)
app.use((req, res, next) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} does not exist.`));
});

// 7. Centralized Error Handling Middleware
app.use(errorHandler);

// 8. Server Lifecycle & Boot
let serverInstance = null;
let terminalGatewayInstance = null;
let agentGatewayInstance = null;

async function bootstrap() {
  try {
    logger.info('==============================================');
    logger.info(`Starting Kodra Platform Backend [${config.env.toUpperCase()}]`);
    logger.info('==============================================');

    // Connect to Database
    await connectDB();

    // Create HTTP & WebSocket Server
    const httpServer = http.createServer(app);
    terminalGatewayInstance = new TerminalGateway(httpServer);
    agentGatewayInstance = new AgentGateway(httpServer);
    previewProxyGateway.setupUpgradeHandler(httpServer);

    serverInstance = httpServer.listen(config.server.port, config.server.host, () => {
      logger.info(`Server successfully listening on http://${config.server.host}:${config.server.port}`);
      logger.info(`API Base URL: http://${config.server.host}:${config.server.port}${config.server.apiPrefix}`);
      logger.info(`Terminal WS URL: ws://${config.server.host}:${config.server.port}/ws/terminal`);
      logger.info(`Agent WS URL: ws://${config.server.host}:${config.server.port}/ws/agent`);
      logger.info(`Preview Base Domain: ${config.preview.baseDomain}`);
      logger.info(`Preview Gateway URL: http://<projectId>.${config.preview.baseDomain}:${config.server.port}`);
      logger.info(`Workspace Storage Base: ${config.storage.basePath}`);
    });
  } catch (err) {
    logger.error(`Fatal bootstrap error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

// 7. Graceful Teardown Handlers
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Commencing graceful teardown...`);

  // Terminate active PTY sessions
  ptyManager.destroyAll();

  if (terminalGatewayInstance) {
    terminalGatewayInstance.close();
  }
  if (agentGatewayInstance) {
    agentGatewayInstance.close();
  }

  if (serverInstance) {
    serverInstance.close(async () => {
      logger.info('HTTP & WebSocket server closed cleanly.');
      try {
        await disconnectDB();
        logger.info('Graceful shutdown completed. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error(`Error during database disconnect: ${err.message}`);
        process.exit(1);
      }
    });

    // Force exit if teardown hangs
    setTimeout(() => {
      logger.error('Teardown timed out after 10s. Forcing shutdown.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection caught at process level', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
bootstrap();

export { app };
