import { authenticateToken } from '../_/helpers/auth.js';
import { prepareSseResponse, sseManager, writeSseComment, writeSseEvent } from '../_/helpers/sse.js';

// Simple API route 
function sseStockUpdateApi(app, logger) {
    const scope = 'stock';

    const handleConnect = (req, res) => {

        logger.info(`Client connected to stock updates: ${req.user.fname} (${req.user.id})`);

        prepareSseResponse(res);

        writeSseEvent(res, {
            type: 'connected',
            message: 'Stock updates connected',
            clientCount: sseManager.getClientCount(scope) + 1
        });

        sseManager.addClient(res, {
            scope,
            userId: req.user.id,
            username: req.user.username || req.user.email
        });

        const heartbeat = setInterval(() => {
            try {
                writeSseComment(res);
            } catch (error) {
                cleanup();
            }
        }, 30000);

        const cleanup = sseManager.bindClientLifecycle(req, res, () => {
            clearInterval(heartbeat);
            sseManager.removeClient(res);
        });
    };

    app.get('/api/stock-updates/connect', authenticateToken, handleConnect);
    app.post('/api/stock-updates/connect', authenticateToken, handleConnect);
}

export default sseStockUpdateApi;
