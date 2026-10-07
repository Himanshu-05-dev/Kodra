/**
 * @file AgentGateway.js
 * Layer 1: Interface - WebSocket Gateway for AI Agent Token Streaming.
 * Handles WebSocket upgrades on /ws/agent, prompt streaming, and error framing.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { agentService } from '../services/AgentService.js';
import { logger } from '../infrastructure/logger/logger.js';
import { WebSocketEvents, ErrorCodes } from '@kodra/shared';

export class AgentGateway {
  /**
   * @param {import('node:http').Server} httpServer
   */
  constructor(httpServer) {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupUpgradeHandler(httpServer);
    this.setupConnectionHandler();
  }

  /**
   * Handle HTTP upgrade to WebSocket on /ws/agent path
   */
  setupUpgradeHandler(httpServer) {
    httpServer.on('upgrade', (request, socket, head) => {
      const parsedUrl = new URL(request.url || '', 'http://localhost');

      if (parsedUrl.pathname === '/ws/agent') {
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
      const userId = parsedUrl.searchParams.get('userId') || 'anonymous';

      if (!projectId) {
        logger.warn('Agent WS connection rejected: Missing projectId query parameter');
        this.sendFrame(ws, {
          type: WebSocketEvents.ERROR,
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'projectId query parameter is required to connect to AI agent'
        });
        ws.close(1008, 'Missing projectId');
        return;
      }

      logger.info(`Agent WS connected for project [${projectId}]`);

      ws.on('message', async (rawMessage) => {
        try {
          const message = JSON.parse(rawMessage.toString());

          switch (message.type) {
            case WebSocketEvents.AGENT_PROMPT: {
              const prompt = message.prompt;
              if (!prompt) return;

              // 1. Emit thinking state
              this.sendFrame(ws, { type: WebSocketEvents.AGENT_THINKING });

              try {
                // 2. Stream tokens and tool executions in real time
                const result = await agentService.processPromptStream(
                  projectId,
                  prompt,
                  userId,
                  {
                    onThinking: () => {
                      this.sendFrame(ws, { type: WebSocketEvents.AGENT_THINKING });
                    },
                    onStep: (step) => {
                      this.sendFrame(ws, {
                        type: WebSocketEvents.AGENT_STEP,
                        step
                      });
                    },
                    onChunk: (tokenChunk) => {
                      this.sendFrame(ws, {
                        type: WebSocketEvents.AGENT_CHUNK,
                        text: tokenChunk
                      });
                    },
                    onToolCall: (call) => {
                      this.sendFrame(ws, {
                        type: WebSocketEvents.AGENT_TOOL_CALL,
                        call
                      });
                    },
                    onToolResult: (toolResult) => {
                      this.sendFrame(ws, {
                        type: WebSocketEvents.AGENT_TOOL_RESULT,
                        toolResult
                      });
                    },
                    onFileChanged: (evt) => {
                      const eventType = evt.action === 'deleted'
                        ? WebSocketEvents.FILE_DELETED
                        : WebSocketEvents.FILE_UPDATED;
                      this.sendFrame(ws, {
                        type: eventType,
                        path: evt.path
                      });
                    }
                  }
                );

                // 3. Emit completion or cancellation frame
                if (result.cancelled) {
                  this.sendFrame(ws, { type: WebSocketEvents.AGENT_CANCELLED });
                } else {
                  this.sendFrame(ws, {
                    type: WebSocketEvents.AGENT_DONE,
                    messageId: result.messageId,
                    fullText: result.text
                  });
                }
              } catch (err) {
                this.sendFrame(ws, {
                  type: WebSocketEvents.AGENT_ERROR,
                  message: err.message
                });
              }
              break;
            }

            case WebSocketEvents.AGENT_CANCEL: {
              logger.info(`Received AGENT_CANCEL frame for project [${projectId}]`);
              await agentService.cancelSession(projectId);
              this.sendFrame(ws, { type: WebSocketEvents.AGENT_CANCELLED });
              break;
            }

            case WebSocketEvents.PING:
              this.sendFrame(ws, { type: WebSocketEvents.PONG });
              break;

            default:
              logger.debug(`Unknown agent WS frame type: ${message.type}`);
          }
        } catch (err) {
          logger.warn(`Malformed agent WS message: ${err.message}`);
        }
      });

      ws.on('close', () => {
        logger.debug(`Agent WS disconnected for project [${projectId}]`);
      });

      ws.on('error', (err) => {
        logger.error(`Agent WS error: ${err.message}`);
      });
    });
  }

  sendFrame(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  close() {
    this.wss.close();
  }
}
