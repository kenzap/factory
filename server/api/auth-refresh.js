
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_REFRESH_SECRET, JWT_SECRET, getUserById } from '../_/helpers/auth.js';
import { log } from '../_/helpers/index.js';

function authRefreshTokenApi(app) {

    app.use(express.json());
    app.use(cookieParser());
    app.post('/api/auth/refresh', async (req, res) => {

        try {
            // Add middleware to parse JSON bodies
            // app.use(express.json());
            // Check if refresh token is provided in cookies
            if (!req.cookies || !req.cookies.refreshToken) {
                return res.status(401).json({ code: 401, error: 'refresh token required' });
            }

            const refreshToken = req.cookies.refreshToken;

            console.log('auth refresh token API called', refreshToken);

            // Verify refresh token
            jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {

                if (err) {
                    return res.status(403).json({ code: 403, error: 'invalid refresh token' });
                }

                // find user and verify refresh token
                console.log(`Decoded refresh token: ${JSON.stringify(decoded)}`);

                const user = await getUserById(decoded.id);
                if (!user.id) {
                    return res.status(404).json({ code: 404, error: 'user not found' });
                }

                // if (!user || !user.refreshTokens.includes(refreshToken)) {
                //     return res.status(403).json({ error: 'invalid refresh token' });
                // }

                // Generate new access token
                const accessToken = jwt.sign(
                    {
                        id: user.id,
                        fname: user.fname,
                        email: user.email
                    },
                    JWT_SECRET,
                    { expiresIn: '15m' }
                );

                res.json({ success: true, accessToken });
            });

        } catch (err) {
            res.status(500).json({ error: 'failed to refresh token', code: 500 });
            log(`Error refreshing token: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        };
    });
}

export default authRefreshTokenApi;