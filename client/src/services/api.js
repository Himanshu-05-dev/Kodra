/**
 * @file api.js
 * Centralized API client for Kodra frontend.
 * Enforces zero hardcoded endpoints using Vite environment variables.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

let activeAuthToken = null;

export function setApiAuthToken(token) {
  activeAuthToken = token;
}

export function getApiAuthToken() {
  return activeAuthToken;
}

/**
 * Standard HTTP request wrapper with standardized error extraction
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(activeAuthToken ? { Authorization: `Bearer ${activeAuthToken}` } : {}),
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
  updateProject: (projectId, { name, description }) =>
    request(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description })
    }),
  cloneProject: (projectId, { name } = {}) =>
    request(`/projects/${projectId}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
  deleteProject: (projectId) => request(`/projects/${projectId}`, { method: 'DELETE' }),
  downloadProjectZip: async (projectId, projectName = 'project') => {
    const url = `${API_BASE_URL}/projects/${projectId}/export`;
    const headers = {
      ...(activeAuthToken ? { Authorization: `Bearer ${activeAuthToken}` } : {})
    };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to download project ZIP (${response.status})`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${projectName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

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
  triggerSelfHealing: (projectId) => request(`/agent/${projectId}/heal`, { method: 'POST' }),

  // Live Preview Gateway
  getPreviewStatus: (projectId) => request(`/projects/${projectId}/preview/status`),
  setPreviewPort: (projectId, port) => request(`/projects/${projectId}/preview/port`, {
    method: 'POST',
    body: JSON.stringify({ port })
  }),
  detectPreviewPort: (projectId) => request(`/projects/${projectId}/preview/detect`),

  // Git Version Control
  getGitStatus: (projectId) => request(`/projects/${projectId}/git/status`),
  getGitDiff: (projectId, { staged = false, filePath = null } = {}) => {
    const params = new URLSearchParams();
    if (staged) params.append('staged', 'true');
    if (filePath) params.append('filePath', filePath);
    const qs = params.toString();
    return request(`/projects/${projectId}/git/diff${qs ? `?${qs}` : ''}`);
  },
  stageGitFiles: (projectId, files) =>
    request(`/projects/${projectId}/git/stage`, {
      method: 'POST',
      body: JSON.stringify({ files })
    }),
  unstageGitFiles: (projectId, files) =>
    request(`/projects/${projectId}/git/unstage`, {
      method: 'POST',
      body: JSON.stringify({ files })
    }),
  commitGit: (projectId, { message, stageAll = false }) =>
    request(`/projects/${projectId}/git/commit`, {
      method: 'POST',
      body: JSON.stringify({ message, stageAll })
    }),
  getGitBranches: (projectId) => request(`/projects/${projectId}/git/branches`),
  checkoutGitBranch: (projectId, { branch, create = false }) =>
    request(`/projects/${projectId}/git/branches`, {
      method: 'POST',
      body: JSON.stringify({ branch, create })
    }),
  getGitHistory: (projectId, limit = 15) =>
    request(`/projects/${projectId}/git/history?limit=${limit}`),
  generateGitCommitMessage: (projectId) =>
    request(`/projects/${projectId}/git/ai-commit-message`, {
      method: 'POST'
    }),
  importGitProject: ({ url, name, description, branch, token }) =>
    request('/projects/import-git', {
      method: 'POST',
      body: JSON.stringify({ url, name, description, branch, token })
    }),

  // Usage, Quotas & Stripe Billing
  getBillingUsage: () => request('/billing/usage'),
  getSubscription: () => request('/billing/subscription'),
  createCheckout: ({ priceId, returnUrl } = {}) =>
    request('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId, returnUrl })
    }),
  createBillingPortal: ({ returnUrl } = {}) =>
    request('/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ returnUrl })
    }),
  upgradePlanDirect: (plan = 'pro') =>
    request('/billing/upgrade-direct', {
      method: 'POST',
      body: JSON.stringify({ plan })
    })
};

