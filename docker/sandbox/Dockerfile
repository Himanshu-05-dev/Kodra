# ==============================================================================
# KODRA SANDBOX BASE CONTAINER
# Lightweight, secure execution container with Node.js, git, curl, and build tools
# ==============================================================================

FROM node:20-alpine

# Install development dependencies: bash, git, curl, build essentials
RUN apk update && apk add --no-cache \
    bash \
    git \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create workspace directory with non-root node user ownership
WORKDIR /workspace
RUN chown -R node:node /workspace

# Switch to unprivileged user (UID 1000) for security hardening
USER node

# Expose typical dev server ports (Vite 5173, Express 3000, Web 8080)
EXPOSE 5173 3000 8080

# Keep container alive to accept interactive exec and background services
CMD ["tail", "-f", "/dev/null"]
