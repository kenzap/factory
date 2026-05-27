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

const getRuntimeContext = () => ({
    environment: process.env.NODE_ENV || 'development',
    nodeId: process.env.HOSTNAME || `pid-${process.pid}`
});

const stackPreview = (stack = '') =>
    String(stack || '')
        .split('\n')
        .slice(0, MAX_STACK_PREVIEW_LINES)
        .join('\n')
        .trim();

const buildErrorReportHtml = ({ scope, message, stack, fullStack, time, environment, nodeId }) => `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;line-height:1.5;color:#212529;">
        <div style="height:4px;background:#dc3545;border-radius:6px 6px 0 0;"></div>
        <table style="width:100%;background:#212529;border-collapse:collapse;">
            <tr>
                <td style="padding:14px 18px;color:#f8f9fa;">
                    <span style="color:#f1aeb5;font-size:15px;margin-right:8px;">&#9888;</span>
                    <strong style="font-size:14px;vertical-align:middle;">Error Report</strong>
                </td>
                <td style="padding:14px 18px;text-align:right;color:#6c757d;font-size:11px;font-family:'Courier New',Courier,monospace;vertical-align:middle;">
                    ${escapeHtml(time)}
                </td>
            </tr>
        </table>
        <div style="border:1px solid #dee2e6;border-top:0;padding:18px 20px;background:#fff;border-radius:0 0 6px 6px;">

            <div style="margin-bottom:16px;">
                <span style="display:inline-block;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;padding:3px 9px;font-size:11px;font-family:'Courier New',Courier,monospace;color:#212529;margin-right:6px;margin-bottom:4px;"><span style="color:#6c757d;">scope:</span> ${escapeHtml(scope)}</span>
                <span style="display:inline-block;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;padding:3px 9px;font-size:11px;font-family:'Courier New',Courier,monospace;color:#212529;margin-right:6px;margin-bottom:4px;"><span style="color:#6c757d;">env:</span> ${escapeHtml(environment)}</span>
                <span style="display:inline-block;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;padding:3px 9px;font-size:11px;font-family:'Courier New',Courier,monospace;color:#212529;margin-bottom:4px;"><span style="color:#6c757d;">node:</span> ${escapeHtml(nodeId)}</span>
            </div>

            <div style="font-size:10px;color:#6c757d;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;">Message</div>
            <pre style="margin:0 0 16px;padding:12px 14px;background:#fcf0ef;border:1px solid #f1aeb5;border-left:3px solid #dc3545;border-radius:0 4px 4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;color:#212529;line-height:1.5;">${escapeHtml(message)}</pre>

            <div style="font-size:10px;color:#6c757d;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;">Stack trace</div>
            <pre style="margin:0;padding:12px 14px;background:#212529;color:#adb5bd;border-radius:6px;font-family:'Courier New',Courier,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;line-height:1.6;">${escapeHtml(stack)}</pre>

            <details style="margin-top:10px;">
                <summary style="cursor:pointer;color:#6c757d;font-size:12px;">Full stack trace</summary>
                <pre style="margin-top:8px;padding:12px 14px;background:#212529;color:#adb5bd;border-radius:6px;font-family:'Courier New',Courier,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;line-height:1.6;">${escapeHtml(fullStack)}</pre>
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
                const runtimeContext = getRuntimeContext();
                return (async () => {
                    const settings = await getSettings();
                    const mailTo = settings?.logger_email_to || process.env.ADMIN_EMAIL;
                    if (!mailTo) return;

                    const mailFrom = settings?.logger_email_from || "";
                    const replyTo = settings?.logger_email_reply_to || "";
                    const subject = settings?.logger_email_subject || `Error in ${scope} (${runtimeContext.environment})`;

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
                            time,
                            environment: runtimeContext.environment,
                            nodeId: runtimeContext.nodeId
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
