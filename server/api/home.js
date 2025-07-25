import { authenticateToken } from '../_/helpers/auth.js';

// Simple API route
function homeApi(app) {

    app.post('/api/home/', authenticateToken, async (_req, res) => {

        console.log('homeApi _req.body', _req.user);

        res.json({ success: true, user: _req.user, message: '/api/home/ loaded' });
    });
}

export default homeApi;