import { send_email } from "./email.js";
import { getSettings } from "./settings.js";

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
        error: (...args) => {
            console.error(`[error][${scope}]`, ...args);

            // Send email notification to admin for errors
            try {
                const errorMessage = args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');

                const stackTrace = new Error().stack;
                (async () => {
                    const settings = await getSettings();
                    const mailTo = settings?.logger_email_to || process.env.ADMIN_EMAIL;
                    if (!mailTo) return;

                    const mailFrom = settings?.logger_email_from || "";
                    const replyTo = settings?.logger_email_reply_to || "";
                    const subject = settings?.logger_email_subject || `Error in ${scope}`;

                    await send_email(
                        mailTo,
                        mailFrom,
                        "Error Report",
                        subject,
                        `<h3>Error Log</h3><p><strong>Scope:</strong> ${scope}</p><p><strong>Message:</strong></p><pre>${errorMessage}</pre><p><strong>Stack Trace:</strong></p><pre>${stackTrace}</pre><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
                        [],
                        { replyTo }
                    );
                })().catch((emailError) => {
                    console.error(`[error][${scope}] Failed to send error notification email:`, emailError);
                });
            } catch (emailError) {
                console.error(`[error][${scope}] Failed to send error notification email:`, emailError);
            }
        },
        debug: (...args) => {
            if (process.env.NODE_ENV !== 'production') {
                console.debug(`[debug][${scope}]`, ...args)
            }
        }
    }
}

export default createLogger;
