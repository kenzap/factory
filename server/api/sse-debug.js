import { authenticateToken } from '../_/helpers/auth.js';
import { getRealtimeDebugState } from '../_/helpers/redis.js';
import { prepareSseResponse, sseManager, writeSseComment, writeSseEvent } from '../_/helpers/sse.js';

function sseDebugApi(app, logger) {
    const scope = 'debug';

    const makeSnapshot = (user = null) => ({
        type: 'debug-connected',
        message: 'SSE debug stream connected',
        server_time: new Date().toISOString(),
        user: user ? { id: user.id, name: user.fname } : null,
        clients: sseManager.getClientCounts(),
        realtime: getRealtimeDebugState()
    });

    const handleConnect = (req, res) => {
        logger.info(`Client connected to SSE debug stream: ${req.user.fname} (${req.user.id})`);

        prepareSseResponse(res);
        writeSseEvent(res, makeSnapshot(req.user));

        sseManager.addClient(res, {
            scope,
            userId: req.user.id,
            username: req.user.username || req.user.email
        });

        const heartbeat = setInterval(() => {
            try {
                writeSseComment(res, `heartbeat ${Date.now()}`);
            } catch (_error) {
                cleanup();
            }
        }, 30000);

        const ticker = setInterval(() => {
            try {
                writeSseEvent(res, {
                    type: 'debug-tick',
                    server_time: new Date().toISOString(),
                    clients: sseManager.getClientCounts(),
                    realtime: getRealtimeDebugState()
                });
            } catch (_error) {
                cleanup();
            }
        }, 5000);

        const cleanup = sseManager.bindClientLifecycle(req, res, () => {
            clearInterval(heartbeat);
            clearInterval(ticker);
            sseManager.removeClient(res);
        });
    };

    app.get('/api/sse-debug/connect', authenticateToken, handleConnect);
    app.post('/api/sse-debug/connect', authenticateToken, handleConnect);

    app.get('/api/sse-debug/state', authenticateToken, (req, res) => {
        res.json({
            success: true,
            server_time: new Date().toISOString(),
            user: { id: req.user.id, name: req.user.fname },
            clients: sseManager.getClientCounts(),
            realtime: getRealtimeDebugState()
        });
    });

    app.post('/api/sse-debug/broadcast', authenticateToken, (req, res) => {
        const payload = {
            type: 'debug-broadcast',
            message: req.body?.message || 'Manual SSE debug broadcast',
            emitted_at: new Date().toISOString(),
            user: { id: req.user.id, name: req.user.fname },
            payload: req.body?.payload || null,
            clients: sseManager.getClientCounts(),
            realtime: getRealtimeDebugState()
        };

        sseManager.broadcast(payload);

        logger.info(`Manual SSE debug broadcast emitted by ${req.user.fname} (${req.user.id})`);

        res.json({
            success: true,
            debug_event: payload
        });
    });
}

export default sseDebugApi;
