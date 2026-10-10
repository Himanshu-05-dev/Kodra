#!/usr/bin/env bash
# ==============================================================================
# KODRA PRODUCTION DEPLOYMENT AUTOMATION SCRIPT
# Provisions Linux instance (Ubuntu/Debian), hardens Docker, and launches stack
# ==============================================================================

set -euo pipefail

echo "=================================================================="
echo " Starting Kodra Platform Production Cloud Deployment"
echo "=================================================================="

# 1. Update OS and install prerequisites
echo "--> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw fail2ban jq libnss3-tools

# 2. Kernel Security & Inotify Tweaks for Heavy File Watching
echo "--> Optimizing Linux kernel limits for container orchestration..."
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=8192
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_user_instances=8192" | sudo tee -a /etc/sysctl.conf

# 3. Install Docker Engine if not present
if ! command -v docker &> /dev/null; then
    echo "--> Installing Docker Engine and Compose plugin..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
fi

# 4. Configure Firewall (UFW)
echo "--> Configuring UFW firewall rules..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt renewal)
sudo ufw allow 443/tcp   # HTTPS / WSS
sudo ufw --force enable

# 5. Check Environment File
if [ ! -f .env.production ]; then
    echo "⚠️ Warning: .env.production not found. Copying template..."
    cp .env.example .env.production
    echo "Please configure your credentials in .env.production before running again."
    exit 1
fi

# 6. Build and Launch Production Stack
echo "--> Pulling base sandbox image..."
docker pull node:20-alpine

echo "--> Building production application containers..."
docker compose -f docker-compose.prod.yml build --pull

echo "--> Starting Kodra Platform in daemon mode..."
docker compose -f docker-compose.prod.yml up -d

# 7. Health Probe
echo "--> Probing backend healthcheck..."
sleep 5
for i in {1..12}; do
    if curl -s http://localhost:5000/api/v1/health | grep -q '"status":"healthy"'; then
        echo "✅ Kodra Backend is healthy and operational!"
        break
    else
        echo "Waiting for backend initialization (attempt $i/12)..."
        sleep 3
    fi
done

echo "=================================================================="
echo " Kodra Cloud Production Deployment Complete!"
echo " Web IDE: https://app.kodra.dev"
echo " Live Previews: https://*.preview.kodra.dev"
echo " API & WebSockets: https://api.kodra.dev"
echo "=================================================================="
