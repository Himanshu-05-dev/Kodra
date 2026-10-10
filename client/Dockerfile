# ==============================================================================
# KODRA PRODUCTION FRONTEND DOCKERFILE
# Multi-stage build with Vite and static Nginx Alpine serving
# ==============================================================================

# --- Stage 1: Build Static Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/

# Install client and shared dependencies
RUN npm ci

# Copy source files
COPY shared ./shared
COPY client ./client

# Build production bundle
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_BASE_URL=
ARG VITE_PREVIEW_DOMAIN=preview.kodra.dev

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_BASE_URL=$VITE_WS_BASE_URL \
    VITE_PREVIEW_DOMAIN=$VITE_PREVIEW_DOMAIN

WORKDIR /app/client
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:1.27-alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
