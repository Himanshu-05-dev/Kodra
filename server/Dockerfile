# ==============================================================================
# KODRA PRODUCTION BACKEND DOCKERFILE
# Multi-stage, hardened Node.js 20 production container
# ==============================================================================

# --- Stage 1: Dependencies & Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (e.g. node-pty)
RUN apk add --no-cache python3 make g++ linux-headers

# Copy monorepo manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY agent/package.json ./agent/
COPY sandbox/package.json ./sandbox/

# Install dependencies across workspaces
RUN npm ci --omit=dev

# Copy source code
COPY shared ./shared
COPY agent ./agent
COPY sandbox ./sandbox
COPY server ./server

# --- Stage 2: Hardened Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install minimal runtime dependencies: curl for healthcheck, bash for commands
RUN apk add --no-cache curl bash \
    && rm -rf /var/cache/apk/*

# Copy built app and dependencies from builder
COPY --from=builder --chown=node:node /app /app

# Ensure workspaces storage exists with proper node user permissions
RUN mkdir -p /app/server/workspaces && chown -R node:node /app/server/workspaces

# Set production environment
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

# Switch to unprivileged user
USER node

# Expose backend API & WebSocket port
EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start production server
CMD ["node", "server/src/server.js"]
