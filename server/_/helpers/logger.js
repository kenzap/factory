/**
 * Creates a logger instance with predefined log levels and scope formatting.
 * 
 * @param {string} [scope='erp'] - The scope identifier to be included in log messages
 * @returns {Object} Logger object with info, warn, error, and debug methods
 * @returns {Function} returns.info - Logs info level messages with scope prefix
 * @returns {Function} returns.warn - Logs warning level messages with scope prefix
 * @returns {Function} returns.error - Logs error level messages with scope prefix
 * @returns {Function} returns.debug - Logs debug level messages with scope prefix (only in non-production environments)
 * 
 * @example
 * const logger = createLogger('auth');
 * logger.info('User logged in successfully');
 * logger.error('Authentication failed');
 */
export const createLogger = (scope = 'erp') => {
    return {
        info: (...args) => console.log(`[info][${scope}]`, ...args),
        warn: (...args) => console.warn(`[warn][${scope}]`, ...args),
        error: (...args) => console.error(`[error][${scope}]`, ...args),
        debug: (...args) => {
            if (process.env.NODE_ENV !== 'production') {
                console.debug(`[debug][${scope}]`, ...args)
            }
        }
    }
}

export default createLogger;