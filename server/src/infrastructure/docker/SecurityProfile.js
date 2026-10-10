/**
 * @file SecurityProfile.js
 * Layer 4: Infrastructure Adapter - Container Security & Production Hardening Profile.
 * Enforces kernel containment, capability dropping, PID limits, and privilege isolation
 * to prevent breakout and denial-of-service across multi-tenant execution sandboxes.
 */

import { config } from '../../config/index.js';

export class SecurityProfile {
  /**
   * Generate production-grade HostConfig containment parameters for Dockerode
   * @param {object} [overrides]
   * @returns {object} Docker HostConfig
   */
  static getHardenedHostConfig(overrides = {}) {
    const isHardened = config.productionSecurity?.enforceSecurityProfiles ?? config.isProduction;

    const baseConfig = {
      // Memory containment
      Memory: config.docker.memoryLimitBytes || 1073741824, // 1GB
      MemorySwap: config.docker.memoryLimitBytes || 1073741824, // Disable extra swap
      OomKillDisable: false,

      // CPU throttling
      NanoCpus: Math.round((config.docker.cpuLimit || 1.0) * 1e9),

      // Process quota (anti-fork-bomb)
      PidsLimit: config.productionSecurity?.pidsLimit || config.docker.pidsLimit || 100,

      // Isolated bridge network
      NetworkMode: config.docker.networkName || 'kodra-sandboxes',

      // Auto-restart policy
      RestartPolicy: {
        Name: 'no'
      }
    };

    if (isHardened) {
      return {
        ...baseConfig,
        // Drop all root capabilities and only re-add unprivileged essentials
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'KILL', 'NET_BIND_SERVICE'],

        // Prevent privilege escalation via setuid/setgid binaries
        SecurityOpt: ['no-new-privileges:true'],

        // Resource ulimits
        Ulimits: [
          { Name: 'nproc', Soft: 100, Hard: 100 },
          { Name: 'nofile', Soft: 2048, Hard: 4096 }
        ],

        // Read-only tmpfs mounts for ephemeral operations
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=64m'
        },

        ...overrides
      };
    }

    return {
      ...baseConfig,
      ...overrides
    };
  }

  /**
   * Validate container inspection data to verify active security containment
   * @param {object} inspectData
   * @returns {{ isHardened: boolean, flags: string[] }}
   */
  static verifyContainerContainment(inspectData) {
    const hostConfig = inspectData?.HostConfig || {};
    const flags = [];

    if (hostConfig.PidsLimit && hostConfig.PidsLimit <= 200) {
      flags.push('PIDS_LIMITED');
    }

    if (hostConfig.Memory && hostConfig.Memory <= 2147483648) {
      flags.push('MEMORY_LIMITED');
    }

    if (hostConfig.SecurityOpt?.includes('no-new-privileges:true')) {
      flags.push('NO_NEW_PRIVILEGES');
    }

    if (hostConfig.CapDrop?.includes('ALL')) {
      flags.push('CAPABILITIES_DROPPED');
    }

    return {
      isHardened: flags.includes('PIDS_LIMITED') && flags.includes('MEMORY_LIMITED'),
      flags
    };
  }
}
