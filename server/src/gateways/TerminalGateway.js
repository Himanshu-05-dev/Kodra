/**
 * @file TerminalGateway.js
 * Layer 1: Interface - WebSocket Gateway for real-time terminal streaming.
 * Handles WebSocket upgrades, bi-directional PTY data framing, and cleanup on disconnect.
 */

import { WebSocketServer, WebSocket } from 'ws';
import url from 'node:url';
import crypto from 'node:crypto';
import { terminalService } from '../services/TerminalService.js';
import { logger } from '../infrastructure/logger/logger.js';
import { WebSocketEvents, ErrorCodes } from '@kodra/shared';

export class TerminalGateway {
  /**
   * @param {import('node:http').Server} httpServer
   */
  constructor(httpServer) {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupUpgradeHandler(httpServer);
    this.setupConnectionHandler();
  }

  /**
   * Handle HTTP upgrade to WebSocket on /ws/terminal path
   */
  setupUpgradeHandler(httpServer) {
    httpServer.on('upgrade', (request, socket, head) => {
      const parsedUrl = new URL(request.url || '', 'http://localhost');

      if (parsedUrl.pathname === '/ws/terminal') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });
  }

  /**
   * Handle active WebSocket connection
   */
  setupConnectionHandler() {
    this.wss.on('connection', async (ws, request) => {
      const parsedUrl = new URL(request.url || '', 'http://localhost');
      const projectId = parsedUrl.searchParams.get('projectId');
      const sessionId = parsedUrl.searchParams.get('sessionId') || crypto.randomUUID();
      const initialCols = parseInt(parsedUrl.searchParams.get('cols') || '80', 10);
      const initialRows = parseInt(parsedUrl.searchParams.get('rows') || '24', 10);

      if (!projectId) {
        logger.warn('Terminal WS connection rejected: Missing projectId query parameter');
        this.sendFrame(ws, {
          type: WebSocketEvents.ERROR,
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'projectId query parameter is required to attach terminal'
        });
        ws.close(1008, 'Missing projectId');
        return;
      }

      logger.info(`Terminal WS connected: [${sessionId}] for project [${projectId}]`);

      try {
        // Start PTY session and hook streaming
        await terminalService.startTerminalSession(
          sessionId,
          projectId,
          initialCols,
          initialRows,
          (outputData) => {
            if (ws.readyState === WebSocket.OPEN) {
              this.sendFrame(ws, {
                type: WebSocketEvents.TERMINAL_OUTPUT,
                data: outputData
              });
            }
          }
        );

        // Listen for incoming messages from browser
        ws.on('message', (rawMessage) => {
          try {
            const message = JSON.parse(rawMessage.toString());

            switch (message.type) {
              case WebSocketEvents.TERMINAL_INPUT:
                if (typeof message.data === 'string') {
                  terminalService.handleInput(sessionId, message.data);
                }
                break;

              case WebSocketEvents.TERMINAL_RESIZE:
                if (message.cols && message.rows) {
                  terminalService.handleResize(sessionId, message.cols, message.rows);
                }
                break;

              case WebSocketEvents.PING:
                this.sendFrame(ws, { type: WebSocketEvents.PONG });
                break;

              default:
                logger.debug(`Unknown terminal message type: ${message.type}`);
            }
          } catch (err) {
            logger.warn(`Malformed terminal WS message: ${err.message}`);
          }
        });

        // Clean up on disconnect
        ws.on('close', (code, reason) => {
          logger.info(`Terminal WS disconnected [${sessionId}], code: ${code}, reason: ${reason}`);
          terminalService.closeSession(sessionId);
        });

        ws.on('error', (err) => {
          logger.error(`Terminal WS socket error [${sessionId}]: ${err.message}`);
          terminalService.closeSession(sessionId);
        });
      } catch (err) {
        logger.error(`Failed to initialize terminal session [${sessionId}]: ${err.message}`);
        this.sendFrame(ws, {
          type: WebSocketEvents.ERROR,
          code: err.errorCode || ErrorCodes.INTERNAL_ERROR,
          message: err.message
        });
        ws.close(1011, err.message);
      }
    });
  }

  /**
   * Helper to send JSON WebSocket frame safely
   */
  sendFrame(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Close all active sockets on server shutdown
   */
  close() {
    this.wss.close();
  }
}
