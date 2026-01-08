/**
 * Structured Logger - Centralized logging with levels and context
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Logger instance with configurable level
 * Set logger.level to control verbosity:
 * - 0: errors only
 * - 1: errors + warnings
 * - 2: errors + warnings + info
 * - 3: all (including debug)
 */
export const logger = {
  level: LOG_LEVELS.warn,

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Object} [context] - Additional context
   */
  error(message, context = {}) {
    console.error(`[ERROR] ${message}`, Object.keys(context).length ? context : '');
  },

  /**
   * Log a warning message
   * @param {string} message - Warning message
   * @param {Object} [context] - Additional context
   */
  warn(message, context = {}) {
    if (this.level >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Log an info message
   * @param {string} message - Info message
   * @param {Object} [context] - Additional context
   */
  info(message, context = {}) {
    if (this.level >= LOG_LEVELS.info) {
      console.info(`[INFO] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Log a debug message
   * @param {string} message - Debug message
   * @param {Object} [context] - Additional context
   */
  debug(message, context = {}) {
    if (this.level >= LOG_LEVELS.debug) {
      console.log(`[DEBUG] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Set log level by name
   * @param {'error'|'warn'|'info'|'debug'} levelName
   */
  setLevel(levelName) {
    if (LOG_LEVELS[levelName] !== undefined) {
      this.level = LOG_LEVELS[levelName];
    }
  }
};

export { LOG_LEVELS };
