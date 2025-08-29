
import express from 'express';
import { cacheUserSession, generateTokens, getOtpByEmailOrPhone, getUserByEmail, getUserByPhone, isValidEmail, isValidPhone } from '../_/helpers/auth.js';
import { log } from '../_/helpers/index.js';

// API route for product export
function validateOtpApi(app) {

    // Add middleware to parse JSON bodies
    app.use(express.json());

    app.post('/api/auth/validate-otp', async (req, res) => {
        try {

            const { email_or_phone, nonce, otp } = req.body;

            if (!email_or_phone || !otp || !nonce) {
                res.status(400).json({
                    error: 'email, otp and nonce are required',
                    code: 400
                });
                return;
            }

            if (!isValidEmail(email_or_phone) && !isValidPhone(email_or_phone)) {
                res.status(400).json({ error: 'email or phone is required', code: 400 });
                return;
            }

            // Send OTP via email (you'll need to implement email service)
            let otpCached = await getOtpByEmailOrPhone(email_or_phone, nonce);

            if (!otpCached) {
                res.status(400).json({ error: 'invalid nonce', code: 400 });
                return;
            }

            if (otpCached !== otp) {
                res.status(400).json({ error: 'invalid otp', email_or_phone, otpCached, otp, code: 400 });
                return;
            }

            log(`OTP validated for ${email_or_phone}`);

            let user = null;

            // get user by email
            if (isValidEmail(email_or_phone)) user = await getUserByEmail(email_or_phone);

            // get user by phone
            if (isValidPhone(email_or_phone)) user = await getUserByPhone(email_or_phone);

            // if user not found
            if (!user) {
                res.status(404).json({
                    error: 'user not found', code: 404
                });
                return;
            }

            log(`User found`, user);

            // cache user session
            await cacheUserSession(user);

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