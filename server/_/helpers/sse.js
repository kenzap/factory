import {
    REALTIME_CHANNELS,
    getRealtimeNodeId,
    publishRealtimeMessage,
    subscribeToRealtimeChannel
} from './redis.js';

/**
 * Manages Server-Sent Events (SSE) connections and broadcasting.
 * Handles multiple client connections and provides methods to add, remove,
 * and broadcast messages to all connected clients.
 */
const logWarn = (...args) => console.warn('[warn][sse]', ...args);

export const prepareSseResponse = (res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
};

export const writeSseEvent = (res, data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const writeSseComment = (res, comment = 'heartbeat') => {
    res.write(`: ${comment}\n\n`);
};

class SSEManager {
    constructor() {
        this.clients = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        this.initialized = true;

        await subscribeToRealtimeChannel(REALTIME_CHANNELS.sse, (payload, envelope) => {
            if (envelope?.origin === getRealtimeNodeId()) return;
            this.broadcastLocal(payload);
        });
    }

    addClient(client, metadata = {}) {
        const scope = metadata.scope || 'default';

        this.clients.set(client, {
            connectedAt: new Date(),
            userId: metadata.userId,
            username: metadata.username,
            scope
        });

        console.log(`SSE client connected (${scope}). Total: ${this.clients.size}. Scope total: ${this.getClientCount(scope)}`);
    }

    removeClient(client) {
        const metadata = this.clients.get(client);
        const scope = metadata?.scope || 'default';

        this.clients.delete(client);
        console.log(`SSE client disconnected (${scope}). Total: ${this.clients.size}. Scope total: ${this.getClientCount(scope)}`);
    }

    bindClientLifecycle(req, res, onDisconnect) {
        let cleanedUp = false;

        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            onDisconnect?.();
        };

        req.on('aborted', cleanup);
        res.on('close', cleanup);
        res.on('finish', cleanup);
        req.socket?.on('close', cleanup);

        return cleanup;
    }

    broadcast(data) {
        if (typeof data === 'undefined') return;

        this.broadcastLocal(data);

        void publishRealtimeMessage(REALTIME_CHANNELS.sse, data)
            .catch((error) => {
                logWarn(`Failed to publish SSE update. ${error?.message || error}`);
            });
    }

    broadcastLocal(data) {
        if (typeof data === 'undefined') return;

        const message = `data: ${JSON.stringify(data)}\n\n`;

        this.clients.forEach((metadata, client) => {
            try {
                client.write(message);
            } catch (error) {
                console.error('Error sending SSE:', error);
                this.removeClient(client);
            }
        });
    }

    getClientCount(scope = null) {
        if (!scope) return this.clients.size;

        let count = 0;

        this.clients.forEach((metadata) => {
            if ((metadata?.scope || 'default') === scope) count += 1;
        });

        return count;
    }

    getClientCounts() {
        const scopes = {};

        this.clients.forEach((metadata) => {
            const scope = metadata?.scope || 'default';
            scopes[scope] = (scopes[scope] || 0) + 1;
        });

        return {
            total: this.clients.size,
            scopes
        };
    }
}

export const sseManager = new SSEManager();
