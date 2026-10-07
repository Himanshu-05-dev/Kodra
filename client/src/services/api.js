/**
 * @file api.js
 * Centralized API client for Kodra frontend.
 * Enforces zero hardcoded endpoints using Vite environment variables.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Standard HTTP request wrapper with standardized error extraction
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = payload?.error?.message || `HTTP request failed with status ${response.status}`;
      const errorCode = payload?.error?.code || 'NETWORK_ERROR';
      const error = new Error(errorMessage);
      error.code = errorCode;
      error.statusCode = response.status;
      error.details = payload?.error?.details || [];
      throw error;
    }

    return payload?.data;
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    // Network or connection offline error
    const netError = new Error(`Connection error: Could not reach Kodra backend at ${API_BASE_URL}`);
    netError.code = 'NETWORK_UNREACHABLE';
    throw netError;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Projects
  listProjects: (limit = 50) => request(`/projects?limit=${limit}`),
  createProject: ({ name, template = 'vite-react', description = '' }) =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, template, description })
    }),
  getProject: (projectId) => request(`/projects/${projectId}`),
  deleteProject: (projectId) => request(`/projects/${projectId}`, { method: 'DELETE' }),

  // Files & Workspaces
  getProjectFiles: (projectId) => request(`/projects/${projectId}/files`),
  getFileContent: (projectId, relativePath) =>
    request(`/projects/${projectId}/files/content?path=${encodeURIComponent(relativePath)}`),
  saveFileContent: (projectId, relativePath, content) =>
    request(`/projects/${projectId}/files`, {
      method: 'PUT',
      body: JSON.stringify({ path: relativePath, content })
    }),
  deleteFile: (projectId, relativePath) =>
    request(`/projects/${projectId}/files?path=${encodeURIComponent(relativePath)}`, {
      method: 'DELETE'
    }),

  // Sandbox Management
  getSandboxEngine: () => request('/sandbox/engine'),
  startSandbox: (projectId) => request(`/sandbox/${projectId}/start`, { method: 'POST' }),
  stopSandbox: (projectId) => request(`/sandbox/${projectId}/stop`, { method: 'POST' }),
  getSandboxStatus: (projectId) => request(`/sandbox/${projectId}/status`),

  // AI Agent
  getAgentMessages: (projectId) => request(`/agent/${projectId}/messages`),
  clearAgentMessages: (projectId) => request(`/agent/${projectId}/clear`, { method: 'POST' }),
  cancelAgentSession: (projectId) => request(`/agent/${projectId}/cancel`, { method: 'POST' }),
  triggerSelfHealing: (projectId) => request(`/agent/${projectId}/heal`, { method: 'POST' })
};
