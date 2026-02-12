import { authenticateToken } from '../_/helpers/auth.js';
import { sseManager } from '../_/helpers/sse.js';

// Simple API route 
function sseManufacturingUpdateApi(app, logger) {

    // SSE endpoint
    app.post('/api/manufacturing-updates/connect', authenticateToken, (req, res) => {

        logger.info(`Client connected to manufacturing updates: ${req.user.fname} (${req.user.id})`);

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Send initial connection confirmation
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            message: 'Manufacturing updates connected',
            clientCount: sseManager.getClientCount() + 1
        })}\n\n`);

        // Add client with user metadata
        sseManager.addClient(res, {
            userId: req.user.id,
            username: req.user.username || req.user.email
        });

        // Keep-alive heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
            try {
                res.write(`: heartbeat\n\n`);
            } catch (error) {
                clearInterval(heartbeat);
            }
        }, 30000);

        // Handle client disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
            sseManager.removeClient(res);
        });
    });
}

export default sseManufacturingUpdateApi;