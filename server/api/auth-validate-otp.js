
import express from 'express';
import { cacheUserSession, deleteOtpByEmailOrPhone, generateTokens, getOtpByEmailOrPhone, getRequestCount, getUserByEmail, getUserByPhone, incrementRequestCount, isValidEmail, isValidPhone } from '../_/helpers/auth.js';

// API route for product export
function validateOtpApi(app, logger) {

    // Add middleware to parse JSON bodies
    app.use(express.json());

    app.post('/api/auth/validate-otp', async (req, res) => {
        try {

            let { email_or_phone, nonce, otp } = req.body;

            if (!email_or_phone || !otp || !nonce) {
                res.status(400).json({ success: false, error: 'email, otp and nonce are required', code: 400 });
                return;
            }

            if (!isValidEmail(email_or_phone) && !isValidPhone(email_or_phone)) {
                res.status(400).json({ success: false, error: 'email or phone is required', code: 400 });
                return;
            }

            if (isValidPhone(email_or_phone) && email_or_phone.startsWith('+')) {

                email_or_phone = email_or_phone.substring(1); // remove leading +
                email_or_phone = email_or_phone.replace(/\D/g, '');
            }

            if (isValidPhone(email_or_phone) && email_or_phone.length <= 8) {
                // TODO: create setting for default country code
                email_or_phone = '371' + email_or_phone; // default to Latvia country code. 
            }

            // rate limiting for validation attempts
            const validationLimitKey = `otp_validation_${email_or_phone}`;
            const maxValidationAttempts = 5;
            const validationWindow = 15 * 60 * 1000;

            const validationCount = await getRequestCount(validationLimitKey);
            if (validationCount >= maxValidationAttempts) {
                // Invalidate the OTP after too many attempts
                await deleteOtpByEmailOrPhone(email_or_phone);
                res.status(429).json({
                    success: false,
                    error: 'too many failed attempts, please request a new otp',
                    code: 429
                });
                return;
            }

            // Send OTP via email (you'll need to implement email service)
            let otpCached = await getOtpByEmailOrPhone(email_or_phone, nonce);

            if (!otpCached) {
                await incrementRequestCount(validationLimitKey, validationWindow);
                res.status(400).json({ success: false, error: 'invalid or expired otp', code: 400 });
                return;
            }

            if (otpCached !== otp) {
                await incrementRequestCount(validationLimitKey, validationWindow);
                res.status(400).json({ success: false, error: 'invalid otp', code: 400 });
                return;
            }

            await deleteOtpByEmailOrPhone(email_or_phone);

            logger.info(`OTP validated for ${email_or_phone}`);

            let user = null;

            // get user
            if (isValidEmail(email_or_phone)) user = await getUserByEmail(email_or_phone);
            if (isValidPhone(email_or_phone)) user = await getUserByPhone(email_or_phone);

            // if user not found
            if (!user) {
                res.status(404).json({ success: false, error: 'user not found', code: 404 });
                return;
            }

            logger.info(`User validated`, user);

            // cache user session
            await cacheUserSession(user);

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

            logger.error(`Error validating OTP: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);

            res.status(500).json({ success: false, error: 'failed to request otp', code: 500 });
        }
    });
}

export default validateOtpApi;