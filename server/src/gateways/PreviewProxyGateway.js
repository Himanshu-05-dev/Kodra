/**
 * @file PreviewProxyGateway.js
 * Layer 1: Interface - Dynamic Reverse Proxy & WebSocket Gateway for Live Preview.
 * Proxies HTTP and WebSocket traffic (for Vite/Webpack HMR) without subpath corruption.
 */

import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { logger } from '../infrastructure/logger/logger.js';
import { previewService } from '../services/PreviewService.js';

export class PreviewProxyGateway {
  /**
   * @param {import('node:http').Server} [httpServer]
   */
  constructor(httpServer) {
    this.proxyMiddleware = this._createProxy();

    if (httpServer) {
      this.setupUpgradeHandler(httpServer);
    }
  }

  /**
   * Extract project ID from subdomain, path, custom headers, referer, or cookies
   * @param {import('http').IncomingMessage} req 
   * @returns {string | null}
   */
  extractProjectId(req) {
    // 1. Custom Header
    const customHeader = req.headers?.['x-kodra-project-id'];
    if (customHeader) {
      return customHeader.toString().trim();
    }

    // 2. Subdomain check (e.g. <projectId>.preview.localhost:5000 or <projectId>.localhost:5000)
    const hostHeader = (req.headers?.host || '').split(':')[0].toLowerCase();
    const baseDomain = (config.preview.baseDomain || 'preview.localhost').toLowerCase();

    if (hostHeader.endsWith(baseDomain) && hostHeader !== baseDomain) {
      const subdomain = hostHeader.slice(0, -(baseDomain.length + 1));
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }

    // Fallback: <projectId>.localhost
    if (hostHeader.endsWith('.localhost')) {
      const parts = hostHeader.split('.');
      if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'preview') {
        return parts[0];
      }
    }

    // 3. Path prefix check (e.g. /preview/<projectId>/...)
    const url = req.url || '';
    const pathMatch = url.match(/^\/preview\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // 4. Referer header check (crucial for path-based proxy when HTML loads /src/main.jsx)
    const referer = req.headers?.referer || '';
    if (referer) {
      const refPathMatch = referer.match(/\/preview\/([a-zA-Z0-9_-]+)/);
      if (refPathMatch) {
        return refPathMatch[1];
      }

      const refHostMatch = referer.match(/:\/\/([a-zA-Z0-9_-]+)\.(?:preview\.localhost|localhost)/i);
      if (refHostMatch && refHostMatch[1] !== 'preview') {
        return refHostMatch[1];
      }
    }

    // 5. Cookie check fallback
    const cookie = req.headers?.cookie || '';
    const cookieMatch = cookie.match(/kodra_preview_project=([a-zA-Z0-9_-]+)/);
    if (cookieMatch) {
      return cookieMatch[1];
    }

    return null;
  }

  /**
   * Determine if an incoming request is intended for the preview gateway
   * @param {import('express').Request} req 
   * @returns {boolean}
   */
  isPreviewRequest(req) {
    const host = (req.headers?.host || '').split(':')[0].toLowerCase();
    const baseDomain = (config.preview.baseDomain || 'preview.localhost').toLowerCase();

    // Is subdomain request
    if (host.endsWith(baseDomain) && host !== baseDomain) {
      return true;
    }
    if (host.endsWith('.localhost') && !host.startsWith('localhost')) {
      return true;
    }

    // Is path-based preview request
    if (req.url?.startsWith('/preview/')) {
      return true;
    }

    // Has preview project header
    if (req.headers?.['x-kodra-project-id']) {
      return true;
    }

    // Has referer from preview path and request is NOT for Kodra backend API or client
    const referer = req.headers?.referer || '';
    if (referer.includes('/preview/') && !req.url?.startsWith('/api/')) {
      return true;
    }

    return false;
  }

  /**
   * Render cyber-styled offline notification HTML when dev server is not running
   * @param {string} projectId 
   * @param {number} port 
   */
  _renderOfflineHtml(projectId, port) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kodra Dev Server Offline</title>
  <meta http-equiv="refresh" content="3" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #08090d;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
      text-align: center;
    }
    .card {
      background: rgba(14, 16, 23, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
      padding: 2.25rem 2rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(168, 85, 247, 0.1);
    }
    .icon-container {
      width: 56px;
      height: 56px;
      margin: 0 auto 1.25rem;
      border-radius: 14px;
      background: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c084fc;
      font-size: 1.75rem;
    }
    h2 {
      color: #f8fafc;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.875rem;
      line-height: 1.5;
      color: #94a3b8;
      margin-bottom: 1rem;
    }
    .code-box {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.65rem 0.85rem;
      border-radius: 0.5rem;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.85rem;
      color: #38bdf8;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fbbf24;
      box-shadow: 0 0 8px #fbbf24;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">⚡</div>
    <h2>Dev Server Offline</h2>
    <p>No development server is currently listening on port <strong>${port || 5173}</strong> for project <strong>${projectId}</strong>.</p>
    <div class="code-box">
      <span>$</span> npm run dev
    </div>
    <div class="badge">
      <span class="dot"></span>
      Auto-refreshing every 3s...
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Instantiate http-proxy-middleware with dynamic routing and header sanitization
   */
  _createProxy() {
    return createProxyMiddleware({
      target: 'http://127.0.0.1:5173', // Fallback default
      changeOrigin: true,
      ws: true,
      xfwd: true,
      router: async (req) => {
        const projectId = this.extractProjectId(req);
        if (!projectId) {
          return 'http://127.0.0.1:5173';
        }
        try {
          return await previewService.getTargetProxyUrl(projectId);
        } catch (err) {
          logger.warn(`Preview router target resolution error for [${projectId}]: ${err.message}`);
          return 'http://127.0.0.1:5173';
        }
      },
      pathRewrite: (pathname, req) => {
        // Strip /preview/:projectId prefix if present
        const match = pathname.match(/^\/preview\/[a-zA-Z0-9_-]+(\/.*)?$/);
        if (match) {
          return match[1] || '/';
        }
        return pathname;
      },
      on: {
        proxyReq: (proxyReq, req, res) => {
          const projectId = this.extractProjectId(req);
          if (projectId) {
            proxyReq.setHeader('x-forwarded-host', req.headers.host || '');
            proxyReq.setHeader('x-kodra-project-id', projectId);

            // Set cookie on response for subsequent root asset requests
            if (res && typeof res.setHeader === 'function') {
              res.setHeader('Set-Cookie', `kodra_preview_project=${projectId}; Path=/; SameSite=Lax`);
            }
          }
        },
        proxyRes: (proxyRes, req, res) => {
          // Allow iframe embedding: strip restrictive frame headers
          delete proxyRes.headers['x-frame-options'];

          // Adjust or strip frame-ancestors from Content-Security-Policy
          if (proxyRes.headers['content-security-policy']) {
            const csp = proxyRes.headers['content-security-policy'];
            const updatedCsp = csp.replace(/frame-ancestors\s+[^;]+(;|$)/i, '');
            proxyRes.headers['content-security-policy'] = updatedCsp;
          }

          // Enable cross-origin resource sharing
          proxyRes.headers['access-control-allow-origin'] = '*';
          proxyRes.headers['access-control-allow-credentials'] = 'true';
        },
        error: (err, req, res) => {
          logger.debug(`Preview proxy connection error: ${err.message} (${req.url})`);

          if (res && typeof res.writeHead === 'function' && !res.headersSent) {
            const projectId = this.extractProjectId(req) || 'app';
            const html = this._renderOfflineHtml(projectId, 5173);

            res.writeHead(502, {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(html);
          }
        }
      }
    });
  }

  /**
   * Handle WebSocket upgrades for Vite & Webpack HMR
   * @param {import('http').Server} httpServer 
   */
  setupUpgradeHandler(httpServer) {
    httpServer.on('upgrade', async (request, socket, head) => {
      const parsedUrl = new URL(request.url || '', 'http://localhost');

      // Skip terminal and agent WebSockets (handled by TerminalGateway and AgentGateway)
      if (parsedUrl.pathname === '/ws/terminal' || parsedUrl.pathname === '/ws/agent') {
        return;
      }

      // Check if this upgrade is for a preview dev server (e.g. Vite HMR ws connection)
      const projectId = this.extractProjectId(request);
      if (projectId || this.isPreviewRequest(request)) {
        try {
          logger.debug(`Proxying WebSocket upgrade for project [${projectId}] on ${request.url}`);
          this.proxyMiddleware.upgrade(request, socket, head);
        } catch (err) {
          logger.warn(`WebSocket upgrade proxy failed: ${err.message}`);
          socket.destroy();
        }
      }
    });
  }

  /**
   * Express middleware entrypoint
   */
  get middleware() {
    return (req, res, next) => {
      if (this.isPreviewRequest(req)) {
        return this.proxyMiddleware(req, res, next);
      }
      next();
    };
  }
}
