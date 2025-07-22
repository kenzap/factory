import { authenticateToken, getUserSessionById } from '../_/helpers/auth.js';

// Simple API route
function homeApi(app) {

    app.post('/api/home/', authenticateToken, async (_req, res) => {

        console.log('Home API called', _req.user.id);

        let user = await getUserSessionById(_req.user.id);

        console.log(`User session: ${JSON.stringify(user)}`);

        if (!user.id) {
            return res.status(403).json({ code: 403, error: 'user not found' });
        }

        res.json({ success: true, user, message: '/api/home/ loaded' });
    });
}

export default homeApi;