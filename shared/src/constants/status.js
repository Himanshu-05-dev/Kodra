/**
 * @file status.js
 * Domain lifecycle status constants across all layers of Kodra.
 */

export const ProjectStatus = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error'
});

export const ContainerStatus = Object.freeze({
  PENDING: 'pending',
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPED: 'stopped',
  FAILED: 'failed'
});

export const AgentStatus = Object.freeze({
  IDLE: 'idle',
  THINKING: 'thinking',
  EXECUTING_TOOL: 'executing_tool',
  HEALING: 'healing',
  CANCELLED: 'cancelled',
  ERROR: 'error',
  COMPLETED: 'completed'
});

export const ProjectTemplates = Object.freeze({
  VANILLA: 'vanilla',
  VITE_REACT: 'vite-react',
  NODE_EXPRESS: 'node-express'
});
