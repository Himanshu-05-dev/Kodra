/**
 * @file logger.js
 * Layer 4: Infrastructure - Structured JSON Logger with log levels and correlation ID.
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevelName = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevel = LOG_LEVELS[currentLevelName] ?? LOG_LEVELS.info;

/**
 * Format and write structured logs
 * @param {'debug' | 'info' | 'warn' | 'error'} level 
 * @param {string} message 
 * @param {object} [metadata] 
 */
function log(level, message, metadata = {}) {
  if (LOG_LEVELS[level] < currentLevel) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {})
  };

  // Development: Human readable console with colors
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m'
    };

    const color = colors[logEntry.level] || colors.RESET;
    const metaStr = metadata && Object.keys(metadata).length > 0
      ? `\n  ${JSON.stringify(metadata, null, 2).replace(/\n/g, '\n  ')}`
      : '';

    // eslint-disable-next-line no-console
    console.log(
      `[${logEntry.timestamp}] ${color}${logEntry.level}${colors.RESET}: ${message}${metaStr}`
    );
  } else {
    // Production: Standard JSON output for log aggregators
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  }
}

export const logger = {
  debug: (message, metadata) => log('debug', message, metadata),
  info: (message, metadata) => log('info', message, metadata),
  warn: (message, metadata) => log('warn', message, metadata),
  error: (message, metadata) => log('error', message, metadata)
};
