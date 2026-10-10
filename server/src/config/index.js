/**
 * @file config/index.js
 * Layer 4: Infrastructure - Centralized, Validated Configuration Engine.
 * Enforces zero hardcoded values across the entire application.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: rootEnvPath });

/**
 * Helper to parse numbers safely with fallback validation
 */
function getNumber(key, defaultValue, min = 0, max = Infinity) {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`Configuration Error: Variable "${key}" must be a number between ${min} and ${max}. Received: "${val}"`);
  }
  return parsed;
}

/**
 * Helper to ensure required strings are present
 */
function getRequired(key) {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    throw new Error(`Configuration Error: Required environment variable "${key}" is missing or empty.`);
  }
  return val.trim();
}

/**
 * Helper to get optional string with fallback
 */
function getOptional(key, defaultValue = '') {
  const val = process.env[key];
  return (val !== undefined && val !== '') ? val.trim() : defaultValue;
}

/**
 * Helper to parse booleans
 */
function getBoolean(key, defaultValue = false) {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }
  return val.toLowerCase() === 'true' || val === '1';
}

const rawStoragePath = getOptional('STORAGE_BASE_PATH', './server/workspaces');
const resolvedStoragePath = path.isAbsolute(rawStoragePath)
  ? rawStoragePath
  : path.resolve(__dirname, '../../../', rawStoragePath);

function deepFreeze(obj) {
  Object.keys(obj).forEach((prop) => {
    if (obj[prop] && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return Object.freeze(obj);
}

export const config = deepFreeze({
  env: getOptional('NODE_ENV', 'development'),
  isProduction: getOptional('NODE_ENV', 'development') === 'production',
  isDevelopment: getOptional('NODE_ENV', 'development') === 'development',

  server: {
    port: getNumber('PORT', 5000, 1024, 65535),
    host: getOptional('HOST', '0.0.0.0'),
    apiPrefix: getOptional('API_PREFIX', '/api/v1'),
    corsOrigin: getOptional('CORS_ORIGIN', 'http://localhost:5173'),
    logLevel: getOptional('LOG_LEVEL', 'info').toLowerCase()
  },

  database: {
    uri: getOptional('MONGODB_URI', 'mongodb://127.0.0.1:27017/kodra_dev'),
    autoIndex: getBoolean('MONGODB_AUTO_INDEX', true),
    maxPoolSize: getNumber('MONGODB_MAX_POOL_SIZE', 10, 1, 100),
    serverSelectionTimeoutMS: getNumber('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5000, 1000, 30000)
  },

  storage: {
    basePath: resolvedStoragePath,
    maxProjectStorageMB: getNumber('MAX_PROJECT_STORAGE_MB', 500, 10, 10000),
    maxFileSizeBytes: getNumber('MAX_FILE_SIZE_BYTES', 5242880, 1024, 52428800) // 5MB default
  },

  docker: {
    socketPath: getOptional('DOCKER_SOCKET_PATH', ''),
    baseImage: getOptional('DOCKER_BASE_IMAGE', 'node:20-alpine'),
    workdir: getOptional('DOCKER_CONTAINER_WORKDIR', '/workspace'),
    user: getOptional('DOCKER_DEFAULT_USER', 'node'),
    memoryLimitBytes: getNumber('DOCKER_MEMORY_LIMIT_BYTES', 1073741824), // 1GB
    cpuLimit: parseFloat(getOptional('DOCKER_CPU_LIMIT', '1.0')),
    pidsLimit: getNumber('DOCKER_PIDS_LIMIT', 100, 10, 1000),
    networkName: getOptional('DOCKER_NETWORK_NAME', 'kodra-sandboxes'),
    execTimeoutMs: getNumber('DOCKER_EXEC_TIMEOUT_MS', 60000, 1000, 300000)
  },

  ai: {
    defaultProvider: getOptional('AI_DEFAULT_PROVIDER', 'gemini'),
    gemini: {
      apiKey: getOptional('GEMINI_API_KEY', ''),
      model: getOptional('GEMINI_DEFAULT_MODEL', 'gemini-1.5-pro-latest'),
      temperature: parseFloat(getOptional('GEMINI_TEMPERATURE', '0.2')),
      maxOutputTokens: getNumber('GEMINI_MAX_OUTPUT_TOKENS', 8192)
    },
    openai: {
      apiKey: getOptional('OPENAI_API_KEY', ''),
      model: getOptional('OPENAI_DEFAULT_MODEL', 'gpt-4o'),
      temperature: parseFloat(getOptional('OPENAI_TEMPERATURE', '0.2'))
    },
    ollama: {
      baseUrl: getOptional('OLLAMA_BASE_URL', 'http://localhost:11434'),
      model: getOptional('OLLAMA_DEFAULT_MODEL', 'llama3:8b')
    },
    agent: {
      maxIterations: getNumber('AGENT_MAX_ITERATIONS', 15, 1, 50),
      commandTimeoutMs: getNumber('AGENT_COMMAND_TIMEOUT_MS', 45000, 5000, 300000),
      toolOutputMaxChars: getNumber('AGENT_TOOL_OUTPUT_MAX_CHARS', 8000, 500, 50000)
    }
  },

  auth: {
    firebaseEnabled: getBoolean('FIREBASE_AUTH_ENABLED', false),
    firebaseProjectId: getOptional('FIREBASE_PROJECT_ID', ''),
    firebaseClientEmail: getOptional('FIREBASE_CLIENT_EMAIL', ''),
    firebasePrivateKey: getOptional('FIREBASE_PRIVATE_KEY', '')
  },

  preview: {
    baseDomain: getOptional('PREVIEW_BASE_DOMAIN', 'preview.localhost'),
    portRangeStart: getNumber('PREVIEW_PORT_RANGE_START', 30000),
    portRangeEnd: getNumber('PREVIEW_PORT_RANGE_END', 35000)
  },

  billing: {
    enabled: getBoolean('BILLING_ENABLED', false),
    stripeSecretKey: getOptional('STRIPE_SECRET_KEY', ''),
    stripeWebhookSecret: getOptional('STRIPE_WEBHOOK_SECRET', ''),
    stripePriceIdProMonthly: getOptional('STRIPE_PRICE_ID_PRO_MONTHLY', 'price_pro_monthly'),
    tiers: {
      free: {
        maxTokensMonthly: getNumber('FREE_TIER_MAX_TOKENS_MONTHLY', 50000),
        maxSandboxHoursMonthly: getNumber('FREE_TIER_MAX_SANDBOX_HOURS_MONTHLY', 10),
        maxProjects: getNumber('FREE_TIER_MAX_PROJECTS', 3)
      },
      pro: {
        maxTokensMonthly: getNumber('PRO_TIER_MAX_TOKENS_MONTHLY', 2000000),
        maxSandboxHoursMonthly: getNumber('PRO_TIER_MAX_SANDBOX_HOURS_MONTHLY', 200),
        maxProjects: getNumber('PRO_TIER_MAX_PROJECTS', 50)
      },
      enterprise: {
        maxTokensMonthly: getNumber('ENTERPRISE_TIER_MAX_TOKENS_MONTHLY', 10000000),
        maxSandboxHoursMonthly: getNumber('ENTERPRISE_TIER_MAX_SANDBOX_HOURS_MONTHLY', 1000),
        maxProjects: getNumber('ENTERPRISE_TIER_MAX_PROJECTS', 200)
      }
    }
  }
});
