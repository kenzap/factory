import { randomUUID } from 'crypto';
import { createClient } from 'redis';
import { sid } from './index.js';

const REALTIME_RETRY_INTERVAL_MS = 30000;
const REALTIME_NODE_ID = `${process.pid}:${randomUUID()}`;
const getRealtimeChannelPrefix = () => process.env.REDIS_CHANNEL_PREFIX || `factory:${process.env.SID || sid}:realtime`;
const REALTIME_DEBUG_ENABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.REALTIME_DEBUG || process.env.REDIS_REALTIME_DEBUG || '').toLowerCase());
const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0
`;

const logInfo = (...args) => console.log('[info][redis-realtime]', ...args);
const logWarn = (...args) => console.warn('[warn][redis-realtime]', ...args);
const logDebug = (...args) => {
    if (!REALTIME_DEBUG_ENABLED) return;
    console.log('[debug][redis-realtime]', ...args);
};

const describePayload = (payload) => {
    if (payload === null) return 'null';
    if (typeof payload === 'undefined') return 'undefined';
    if (typeof payload !== 'object') return String(payload);
    if (payload.type) return `type=${payload.type}`;
    if (payload.event) return `event=${payload.event}`;

    const keys = Object.keys(payload).slice(0, 6);
    return `keys=${keys.join(',') || 'none'}`;
};

export const REALTIME_CHANNELS = Object.freeze({
    get sse() {
        return `${getRealtimeChannelPrefix()}:sse`;
    },
    get events() {
        return `${getRealtimeChannelPrefix()}:events`;
    }
});

const channelHandlers = new Map();
const activeSubscriptions = new Set();

let publisherClient = null;
let subscriberClient = null;
let initPromise = null;
let lastInitFailureAt = 0;
let readinessLogged = false;
let retryTimer = null;

export const createRedisClient = () => {
    const baseOptions = {
        socket: {
            connectTimeout: 2000,
            reconnectStrategy: false
        }
    };

    if (process.env.REDIS_URL) {
        return createClient({
            ...baseOptions,
            url: process.env.REDIS_URL
        });
    }

    return createClient(baseOptions);
};

const registerErrorHandler = (client, label) => {
    client.on('error', (error) => {
        logWarn(`${label} redis client error: ${error?.message || error}`);
    });
};

const disconnectClient = async (client) => {
    if (!client?.isOpen) return;

    try {
        await client.quit();
    } catch (_error) {
        try {
            client.destroy();
        } catch (_destroyError) {
            // Best effort cleanup.
        }
    }
};

const resetRealtimeClients = async () => {
    await Promise.allSettled([
        disconnectClient(subscriberClient),
        disconnectClient(publisherClient)
    ]);

    publisherClient = null;
    subscriberClient = null;
    activeSubscriptions.clear();
};

const clearRealtimeRetry = () => {
    if (!retryTimer) return;

    clearTimeout(retryTimer);
    retryTimer = null;
};

const scheduleRealtimeRetry = () => {
    if (retryTimer) return;

    retryTimer = setTimeout(() => {
        retryTimer = null;
        void initializeRealtimeRedis();
    }, REALTIME_RETRY_INTERVAL_MS);

    if (typeof retryTimer.unref === 'function') {
        retryTimer.unref();
    }
};

const dispatchChannelMessage = (channel, rawMessage) => {
    const handlers = channelHandlers.get(channel);
    if (!handlers?.size) return;

    let envelope = null;

    try {
        envelope = JSON.parse(rawMessage);
    } catch (error) {
        logWarn(`Failed to parse realtime payload for ${channel}: ${error?.message || error}`);
        return;
    }

    handlers.forEach((handler) => {
        try {
            logDebug(`received channel=${channel} origin=${envelope?.origin || 'unknown'} ${describePayload(envelope?.payload)}`);
            handler(envelope?.payload, envelope);
        } catch (error) {
            logWarn(`Realtime handler failed for ${channel}: ${error?.message || error}`);
        }
    });
};

const ensureChannelSubscription = async (channel) => {
    if (!subscriberClient?.isReady || activeSubscriptions.has(channel)) return;

    await subscriberClient.subscribe(channel, (message) => {
        dispatchChannelMessage(channel, message);
    });

    activeSubscriptions.add(channel);
    logDebug(`subscribed channel=${channel}`);
};

const connectRealtimeClients = async () => {
    if (publisherClient?.isReady && subscriberClient?.isReady) return true;

    if (lastInitFailureAt && (Date.now() - lastInitFailureAt) < REALTIME_RETRY_INTERVAL_MS) {
        return false;
    }

    if (publisherClient || subscriberClient) {
        await resetRealtimeClients();
    }

    const baseClient = createRedisClient();
    const pubClient = baseClient;
    const subClient = baseClient.duplicate();

    registerErrorHandler(pubClient, 'publisher');
    registerErrorHandler(subClient, 'subscriber');

    try {
        await Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]);
    } catch (error) {
        await Promise.allSettled([
            disconnectClient(subClient),
            disconnectClient(pubClient)
        ]);
        throw error;
    }

    publisherClient = pubClient;
    subscriberClient = subClient;

    if (!readinessLogged) {
        logInfo(`Redis realtime bridge connected on ${getRealtimeChannelPrefix()}`);
        readinessLogged = true;
    }

    logDebug(`bridge-ready node=${REALTIME_NODE_ID}`);

    return true;
};

export const initializeRealtimeRedis = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            const connected = await connectRealtimeClients();
            if (!connected) return false;

            for (const channel of channelHandlers.keys()) {
                await ensureChannelSubscription(channel);
            }

            lastInitFailureAt = 0;
            clearRealtimeRetry();
            return true;
        } catch (error) {
            lastInitFailureAt = Date.now();
            await resetRealtimeClients();
            logWarn(`Redis realtime bridge unavailable; continuing with process-local updates. ${error?.message || error}`);
            scheduleRealtimeRetry();
            return false;
        } finally {
            initPromise = null;
        }
    })();

    return initPromise;
};

export const subscribeToRealtimeChannel = async (channel, handler) => {
    if (!channelHandlers.has(channel)) {
        channelHandlers.set(channel, new Set());
    }

    channelHandlers.get(channel).add(handler);

    const ready = await initializeRealtimeRedis();

    if (ready) {
        try {
            await ensureChannelSubscription(channel);
        } catch (error) {
            lastInitFailureAt = Date.now();
            await resetRealtimeClients();
            logWarn(`Failed to subscribe to realtime channel ${channel}. ${error?.message || error}`);
            scheduleRealtimeRetry();
        }
    }

    return () => {
        const handlers = channelHandlers.get(channel);
        if (!handlers) return;

        handlers.delete(handler);

        if (handlers.size === 0) {
            channelHandlers.delete(channel);
        }
    };
};

export const publishRealtimeMessage = async (channel, payload) => {
    const ready = await initializeRealtimeRedis();
    if (!ready || !publisherClient?.isReady) return false;

    try {
        logDebug(`publishing channel=${channel} ${describePayload(payload)}`);
        await publisherClient.publish(channel, JSON.stringify({
            origin: REALTIME_NODE_ID,
            payload,
            published_at: new Date().toISOString()
        }));
        return true;
    } catch (error) {
        lastInitFailureAt = Date.now();
        await resetRealtimeClients();
        logWarn(`Failed to publish realtime message on ${channel}. ${error?.message || error}`);
        scheduleRealtimeRetry();
        return false;
    }
};

export const getRealtimeNodeId = () => REALTIME_NODE_ID;

export const isRealtimeDebugEnabled = () => REALTIME_DEBUG_ENABLED;

export const withRealtimeLock = async (key, ttlMs, handler, options = {}) => {
    const {
        failOpen = true,
        logger = null,
        onLocked = null
    } = options;

    const safeKey = String(key || '').trim();
    const safeTtlMs = Math.max(1000, Number(ttlMs) || 1000);

    if (!safeKey) {
        throw new Error('Realtime lock key is required');
    }

    const ready = await initializeRealtimeRedis();

    if (!ready || !publisherClient?.isReady) {
        if (!failOpen) return false;
        return handler({ fallback: true, lockKey: null });
    }

    const lockKey = `${getRealtimeChannelPrefix()}:lock:${safeKey}`;
    const token = randomUUID();
    const acquired = await publisherClient.set(lockKey, token, { NX: true, PX: safeTtlMs });

    if (!acquired) {
        if (typeof onLocked === 'function') {
            try {
                onLocked();
            } catch (_error) {
                // Best effort observer hook.
            }
        }
        return false;
    }

    try {
        return await handler({ fallback: false, lockKey });
    } finally {
        try {
            await publisherClient.eval(RELEASE_LOCK_SCRIPT, {
                keys: [lockKey],
                arguments: [token]
            });
        } catch (error) {
            logger?.warn?.(`Failed to release realtime lock "${safeKey}": ${error?.message || error}`);
            logWarn(`Failed to release realtime lock "${safeKey}". ${error?.message || error}`);
        }
    }
};

export const getRealtimeDebugState = () => ({
    enabled: REALTIME_DEBUG_ENABLED,
    nodeId: REALTIME_NODE_ID,
    channelPrefix: getRealtimeChannelPrefix(),
    channels: {
        sse: REALTIME_CHANNELS.sse,
        events: REALTIME_CHANNELS.events
    },
    publisherReady: Boolean(publisherClient?.isReady),
    subscriberReady: Boolean(subscriberClient?.isReady),
    activeSubscriptions: Array.from(activeSubscriptions),
    lastInitFailureAt: lastInitFailureAt || null
});

export const closeRealtimeRedis = async () => {
    clearRealtimeRetry();
    await resetRealtimeClients();
};
