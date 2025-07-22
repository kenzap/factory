
import express from 'express';
import { cacheUserSession, generateTokens, getOtpByEmail, getUserByEmail, isValidEmail } from '../_/helpers/auth.js';
import { log } from '../_/helpers/index.js';

// API route for product export
function validateOtpApi(app) {

    // Add middleware to parse JSON bodies
    app.use(express.json());

    app.post('/api/auth/validate-otp', async (req, res) => {
        try {

            const { email, nonce, otp } = req.body;

            if (!email || !otp || !nonce) {
                res.status(400).json({
                    error: 'email, otp and nonce are required',
                    code: 400
                });
                return;
            }

            if (!email) {
                res.status(400).json({ error: 'email is required', code: 400 });
                return;
            }

            if (!isValidEmail(email)) {
                res.status(400).json({ error: 'invalid email format', code: 400 });
                return;
            }

            // Send OTP via email (you'll need to implement email service)
            const otpCached = await getOtpByEmail(email, nonce);

            if (!otpCached) {
                res.status(400).json({ error: 'invalid nonce', code: 400 });
                return;
            }

            if (otpCached !== otp) {
                res.status(400).json({ error: 'invalid otp', code: 400 });
                return;
            }

            log(`OTP validated for ${email}`);

            // get user by email
            const user = await getUserByEmail(email);

            // cache user session
            await cacheUserSession(user);

            // if user not found
            if (!user) {
                res.status(404).json({
                    error: 'user not found', code: 404
                });
                return;
            }

            log(`User found`, user);

            // TODO: invalidate OTP and nonce

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user);

            // Store refresh token
            // user.refreshTokens.push(refreshToken);
            user.lastLogin = new Date();

            // Set secure cookie for refresh token
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                token: accessToken,
                user: user
            });
        } catch (err) {

            res.status(500).json({ error: 'failed to request otp', code: 500 });
            log(`Error validating OTP: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default validateOtpApi;