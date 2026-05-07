import { send_email } from "./email.js";
import { rawConsole } from "./raw-console.js";
import { getSettings } from "./settings.js";

const MAX_STACK_PREVIEW_LINES = 8;
const DEFAULT_FATAL_FLUSH_TIMEOUT_MS = Math.max(
    250,
    Number.parseInt(process.env.LOGGER_FATAL_FLUSH_TIMEOUT_MS || '2000', 10) || 2000
);
const DEFAULT_CAPTURE_CONSOLE_ERRORS = !['0', 'false', 'off'].includes(
    String(process.env.LOGGER_CAPTURE_CONSOLE_ERRORS || 'true').trim().toLowerCase()
);
const DEFAULT_CAPTURE_PROCESS_ERRORS = !['0', 'false', 'off'].includes(
    String(process.env.LOGGER_CAPTURE_PROCESS_ERRORS || 'true').trim().toLowerCase()
);

let globalErrorCaptureInstalled = false;
let fatalShutdownInProgress = false;

const escapeHtml = (value = '') => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatArg = (arg) => {
    if (arg instanceof Error) {
        const name = arg.name || 'Error';
        const message = arg.message || '';
        return `${name}: ${message}`.trim();
    }

    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg, null, 2);
        } catch (_) {
            return String(arg);
        }
    }

    return String(arg);
};

const collectStacks = (args = []) => {
    const stacks = [];

    args.forEach((arg) => {
        if (arg instanceof Error && typeof arg.stack === 'string' && arg.stack.trim()) {
            stacks.push(arg.stack.trim());
            return;
        }

        if (arg && typeof arg === 'object' && typeof arg.stack === 'string' && arg.stack.trim()) {
            stacks.push(arg.stack.trim());
        }
    });

    if (!stacks.length) {
        const fallback = new Error().stack;
        if (fallback) stacks.push(fallback.trim());
    }

    return stacks;
};

const stackPreview = (stack = '') =>
    String(stack || '')
        .split('\n')
        .slice(0, MAX_STACK_PREVIEW_LINES)
        .join('\n')
        .trim();

const buildErrorReportHtml = ({ scope, message, stack, fullStack, time }) => `
    <div style="font-family:Arial,sans-serif;line-height:1.4;color:#222;">
        <div style="background:#111;color:#fff;padding:12px 14px;border-radius:8px 8px 0 0;">
            <strong>Error Report</strong>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:0;padding:14px;border-radius:0 0 8px 8px;background:#fff;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <tr>
                    <td style="padding:4px 0;color:#6b7280;width:90px;">Scope</td>
                    <td style="padding:4px 0;"><strong>${escapeHtml(scope)}</strong></td>
                </tr>
                <tr>
                    <td style="padding:4px 0;color:#6b7280;">Time</td>
                    <td style="padding:4px 0;">${escapeHtml(time)}</td>
                </tr>
            </table>

            <div style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Message</div>
            <pre style="margin:0 0 12px;padding:10px;background:#f9fafb;border:1px solid #eceff3;border-radius:6px;white-space:pre-wrap;font-size:13px;">${escapeHtml(message)}</pre>

            <div style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Stack (preview)</div>
            <pre style="margin:0;padding:8px;background:#f8fafc;border:1px solid #eceff3;border-radius:6px;white-space:pre-wrap;font-size:11px;line-height:1.35;">${escapeHtml(stack)}</pre>

            <details style="padding-top:10px;">
                <summary style="cursor:pointer;color:#374151;font-size:12px;">Full stack</summary>
                <pre style="margin-top:8px;padding:8px;background:#f8fafc;border:1px solid #eceff3;border-radius:6px;white-space:pre-wrap;font-size:10px;line-height:1.3;">${escapeHtml(fullStack)}</pre>
            </details>
        </div>
    </div>
`;

const normalizeErrorLike = (input) => {
    if (input instanceof Error) return input;

    if (input && typeof input === 'object' && typeof input.message === 'string') {
        return input;
    }

    return new Error(formatArg(input));
};

const waitForPromise = async (promise, timeoutMs = DEFAULT_FATAL_FLUSH_TIMEOUT_MS) => {
    await Promise.race([
        Promise.resolve(promise).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
};

const handleFatalProcessError = async (logger, label, error) => {
    if (fatalShutdownInProgress) {
        rawConsole.error(`[fatal][runtime] Additional ${label.toLowerCase()} while shutting down:`, error);
        return;
    }

    fatalShutdownInProgress = true;

    try {
        await waitForPromise(logger.error(`${label}:`, normalizeErrorLike(error)));
    } finally {
        rawConsole.error(`[fatal][runtime] Exiting process after ${label.toLowerCase()}.`);
        process.exit(1);
    }
};

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
        info: (...args) => rawConsole.log(`[info][${scope}]`, ...args),
        warn: (...args) => rawConsole.warn(`[warn][${scope}]`, ...args),
        error: (...args) => {
            rawConsole.error(`[error][${scope}]`, ...args);

            // Send email notification to admin for errors
            try {
                const errorMessage = args.map((arg) => formatArg(arg)).join(' ').trim();
                const stacks = collectStacks(args);
                const fullStack = stacks.join('\n\n---\n\n');
                const compactStack = stackPreview(stacks[0] || '');
                const time = new Date().toISOString();
                return (async () => {
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
                        buildErrorReportHtml({
                            scope,
                            message: errorMessage || 'No message provided',
                            stack: compactStack || 'Stack not available',
                            fullStack: fullStack || 'Stack not available',
                            time
                        }),
                        [],
                        { replyTo }
                    );
                })().catch((emailError) => {
                    rawConsole.error(`[error][${scope}] Failed to send error notification email:`, emailError);
                });
            } catch (emailError) {
                rawConsole.error(`[error][${scope}] Failed to send error notification email:`, emailError);
                return Promise.resolve();
            }
        },
        debug: (...args) => {
            if (process.env.NODE_ENV !== 'production') {
                rawConsole.debug(`[debug][${scope}]`, ...args)
            }
        }
    }
}

export const installGlobalErrorCapture = ({
    consoleLogger = createLogger('console'),
    processLogger = createLogger('runtime'),
    captureConsoleErrors = DEFAULT_CAPTURE_CONSOLE_ERRORS,
    captureProcessErrors = DEFAULT_CAPTURE_PROCESS_ERRORS
} = {}) => {
    if (globalErrorCaptureInstalled) return;
    globalErrorCaptureInstalled = true;

    if (captureConsoleErrors) {
        console.error = (...args) => {
            void consoleLogger.error(...args);
        };
    }

    if (!captureProcessErrors) return;

    process.on('warning', (warning) => {
        processLogger.warn('Process warning:', warning?.stack || warning?.message || warning);
    });

    process.on('unhandledRejection', (reason) => {
        void processLogger.error('Unhandled promise rejection:', normalizeErrorLike(reason));
    });

    process.on('uncaughtException', (error) => {
        void handleFatalProcessError(processLogger, 'Uncaught exception', error);
    });
};

export default createLogger;
