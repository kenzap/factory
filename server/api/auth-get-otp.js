
import express from 'express';
import { getRequestCount, incrementRequestCount, isValidEmail, sendOtpEmail, storeNonce, storeOtp } from '../_/helpers/auth.js';
import { log } from '../_/helpers/index.js';

// API route for product export
function getOtpApi(app) {

    // Add middleware to parse JSON bodies
    app.use(express.json());

    app.post('/api/auth/get-otp', async (req, res) => {
        try {

            const { email } = req.body;

            if (!email) {
                res.status(400).json({ error: 'email is required', code: 400 });
                return;
            }

            if (!isValidEmail(email)) {
                res.status(400).json({ error: 'invalid email format', code: 400 });
                return;
            }

            // Check rate limiting - allow max 3 OTP requests per email per 15 minutes
            const rateLimitKey = `otp_requests_${email}`;
            const maxRequests = 3;
            const timeWindow = 15 * 60 * 1000; // 15 minutes

            // You'll need to implement getRequestCount and incrementRequestCount
            // These could use Redis, database, or in-memory storage
            // console.log(`Checking rate limit for ${email}...`);
            // console.log(`Redis url: ${process.env.REDIS_URL}`);

            // process.env.REDIS_URL = "redis://local_redis:6379"; // Ensure this is set correctly in your environment
            const requestCount = await getRequestCount(rateLimitKey);

            if (requestCount >= maxRequests) {
                res.status(429).json({
                    error: 'too many otp requests, please try again later',
                    code: 429
                });
                return;
            }

            await incrementRequestCount(rateLimitKey, timeWindow);

            // Generate a 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const nonce = Math.floor(100000 + Math.random() * 900000).toString();

            // Store OTP with expiration (you'll need to implement storage - Redis, database, or in-memory)
            // This is a placeholder for your storage implementation
            await storeOtp(email, otp, 5 * 60 * 1000); // 5 minutes expiration
            await storeNonce(email, nonce, 5 * 60 * 1000); // 5 minutes expiration

            // Send OTP via email (you'll need to implement email service)
            await sendOtpEmail(email, otp);

            log(`OTP generated for ${email} - ${otp}`);

            res.json({ success: true, code: 200, nonce: nonce, message: 'otp sent successfully' });
        } catch (err) {

            res.status(500).json({ error: 'failed to request otp', code: 500 });
            log(`Error requesting OTP: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOtpApi;