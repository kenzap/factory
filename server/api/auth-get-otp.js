
import express from 'express';
import { getRequestCount, incrementRequestCount, isValidEmail, isValidPhone, sendOtpEmail, storeNonce, storeOtp } from '../_/helpers/auth.js';
import { eventBus } from '../_/helpers/extensions/events.js';
import { log } from '../_/helpers/index.js';

// API route for product export
function getOtpApi(app) {

    // Add middleware to parse JSON bodies
    app.use(express.json());

    app.post('/api/auth/get-otp', async (req, res) => {
        try {

            let { email_or_phone } = req.body;

            if (!email_or_phone) {
                res.status(400).json({ success: false, error: 'email or phone is required', code: 400 });
                return;
            }

            if (!isValidEmail(email_or_phone) && !isValidPhone(email_or_phone)) {
                res.status(400).json({ success: false, error: 'invalid email or phone format', code: 400 });
                return;
            }

            if (isValidPhone(email_or_phone) && email_or_phone.startsWith('+')) {

                email_or_phone = email_or_phone.substring(1); // remove leading +
                email_or_phone = email_or_phone.replace(/\D/g, '');
            }

            // add locall code if missing
            if (isValidPhone(email_or_phone) && email_or_phone.length <= 8) {
                // TODO: create setting for default country code
                email_or_phone = '371' + email_or_phone; // default to Latvia country code. 
            }

            // Check rate limiting - allow max 3 OTP requests per email per 15 minutes
            const rateLimitKey = `otp_requests_${email_or_phone}`;
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
                    success: false,
                    error: 'too many otp requests, please try again later',
                    code: 429
                });
                return;
            }

            await incrementRequestCount(rateLimitKey, timeWindow);

            // Generate a 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 12);

            // Store OTP with expiration (you'll need to implement storage - Redis, database, or in-memory)
            // This is a placeholder for your storage implementation
            await storeOtp(email_or_phone, otp, 5 * 60 * 1000); // 5 minutes expiration
            await storeNonce(email_or_phone, nonce, 5 * 60 * 1000); // 5 minutes expiration

            // Send OTP via email (you'll need to implement email service)
            if (isValidEmail(email_or_phone)) await sendOtpEmail(email_or_phone, otp);
            if (isValidPhone(email_or_phone)) eventBus.emit('otp.requested', { phone: email_or_phone, otp }); // await sendOtpWhatsApp(email_or_phone, otp); // send nonce as well

            log(`OTP generated for ${email_or_phone} - ${otp}`);

            res.json({ success: true, code: 200, nonce: nonce, message: 'otp sent successfully' });
        } catch (err) {

            res.status(500).json({ success: false, error: 'failed to request otp', code: 500 });
            log(`Error requesting OTP: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOtpApi;