import { authenticateToken } from '../_/helpers/auth.js';
import { sseManager } from '../_/helpers/sse.js';

function sseOrderUpdateApi(app, logger) {

    app.post('/api/order-updates/connect', authenticateToken, (req, res) => {

        logger.info(`Client connected to order updates: ${req.user.fname} (${req.user.id})`);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        res.write(`data: ${JSON.stringify({
            type: 'connected',
            message: 'Order updates connected',
            clientCount: sseManager.getClientCount() + 1
        })}\n\n`);

        sseManager.addClient(res, {
            userId: req.user.id,
            username: req.user.username || req.user.email
        });

        const heartbeat = setInterval(() => {
            try {
                res.write(`: heartbeat\n\n`);
            } catch (error) {
                clearInterval(heartbeat);
            }
        }, 30000);

        req.on('close', () => {
            clearInterval(heartbeat);
            sseManager.removeClient(res);
        });
    });
}

export default sseOrderUpdateApi;
