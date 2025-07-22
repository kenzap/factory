import cookieParser from 'cookie-parser';
import express from 'express';
import { authenticateToken, clearUserSession } from '../_/helpers/auth.js';
import { log } from '../_/helpers/index.js';

// API route for product export
function logoutApi(app) {

    // Add middleware to parse JSON bodies
    app.use(express.json());
    app.use(cookieParser());
    app.post('/api/auth/logout', authenticateToken, async (req, res) => {
        try {

            // console.log('/api/auth/logout by user', req.user.id);

            if (!req.cookies || !req.cookies.refreshToken) {
                return res.status(401).json({ code: 401, error: 'refresh token required' });
            }

            await clearUserSession(req.user.id);

            // Clear cookie
            res.clearCookie('refreshToken');
            res.json({ success: true, code: 200, message: 'logged out successfully' });
        } catch (err) {

            res.status(500).json({ error: 'failed to request otp', code: 500 });
            log(`Error logging out user: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default logoutApi;