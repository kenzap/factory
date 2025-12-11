import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { send_email } from './email.js';
import { getDbConnection, log, log_error, sid } from './index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-provided-in-env';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-provided-in-env';

// JWT middleware
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'unauthorized', code: 401 });
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'forbidden', code: 403 });
        }
        req.user = user;

        // Verify the user session
        let session = await getUserSessionById(req.user.id);
        if (!session.id) {
            return res.status(403).json({ code: 403, error: 'unauthorised' });
        }

        next();
    });
};

// Email validation helper
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Phone validation helper
export const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return phoneRegex.test(phone);
};

// Store OTP function placeholder
export const storeOtp = async (email, otp, ttl) => {
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();

        const key = `otp:${email}`;

        if (ttl <= 0) {
            throw new Error('OTP expiration time must be in the future');
        }

        await redisClient.setEx(key, ttl, otp);

        await redisClient.quit();

    } catch (error) {
        console.error('Error storing OTP:', error);
        throw error;
    }
}

// Store nonce function placeholder
export const storeNonce = async (email, nonce, ttl) => {
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        const key = `nonce:${email}`;
        if (ttl <= 0) {
            throw new Error('Nonce expiration time must be in the future');
        }
        await redisClient.setEx(key, ttl, nonce);
        await redisClient.quit();
    } catch (error) {
        console.error('Error storing nonce:', error);
        throw error;
    }
}

// Send OTP email function placeholder
export const sendOtpEmail = async (email, otp) => {

    try {

        const body = `<p>Your One Time Password (OTP) is: <strong>${otp}</strong></p>`;

        // Use the send_email function to send the OTP email
        await send_email(email, "otp@skarda.design", "Skarda Design", "One Time Password", body);

        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
}

// Send OTP via WhatsApp function placeholder
export const sendOtpWhatsApp = async (phone, otp, isOtp = false) => {

    try {
        // 360dialog API configuration
        // production
        // const url = "https://waba.360dialog.io/v1/messages";
        const url = "https://waba-v2.360dialog.io/messages";
        const apiKey = process.env.DIALOG_KEY;

        // console.log('Using WhatsApp API URL:', url);
        // console.log('Using WhatsApp API Key:', apiKey ? 'Provided' : 'Not Provided', apiKey);

        // sandbox
        // const url = "https://waba-sandbox.360dialog.io/v1/messages";
        // const apiKey = "UXENI6_sandbox";

        // Define template at https://developers.facebook.com/apps/ > your app > WhatsApp > Message Templates
        const payload = {
            to: phone,
            messaging_product: "whatsapp",
            type: "template",
            template: {
                namespace: process.env.WHATSAPP_NAMESPACE,
                language: {
                    policy: "deterministic",
                    code: "en"
                },
                name: "auth_otp",
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: otp
                            }
                        ]
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [
                            {
                                type: "text",
                                text: otp
                            }
                        ]
                    }
                ]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'D360-Api-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            log_error(`HTTP error! status:`, response);
        }

        const result = await response.json();

        log(`WhatsApp OTP sent to ${phone}:`, result);

        return { success: true, message: 'WhatsApp message sent successfully', data: result };

    } catch (error) {
        log_error('Error sending WhatsApp message:', error);
        throw error;
    }
}

// Increment request count for rate limiting
export const getRequestCount = async (key) => {
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        const count = await redisClient.get(key) || 0;
        await redisClient.quit();
        return parseInt(count, 10);
    } catch (error) {
        console.error('Error getting request count:', error);
        throw error;
    }
}

// Increment request count for rate limiting
export const incrementRequestCount = async (key, timeWindow) => {
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        await redisClient.incr(key);
        await redisClient.expire(key, timeWindow / 1000); // Set expiration in
        await redisClient.quit();
    } catch (error) {
        console.error('Error incrementing request count:', error);
        throw error;
    }
}

// Get OTP by email and nonce
export const getOtpByEmailOrPhone = async (email_or_phone, nonce) => {
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        const key = `otp:${email_or_phone}`;
        const otp = await redisClient.get(key);
        const nonceKey = `nonce:${email_or_phone}`;
        const storedNonce = await redisClient.get(nonceKey);
        await redisClient.quit();
        if (otp && storedNonce === nonce) {
            return otp;
        }
        return null;
    } catch (error) {
        console.error('Error getting OTP by email or phone:', error);
        throw error;
    }
}

export const deleteOtpByEmailOrPhone = async (email_or_phone) => {
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        const key = `otp:${email_or_phone}`;
        await redisClient.del(key);
        const nonceKey = `nonce:${email_or_phone}`;
        await redisClient.del(nonceKey);
        await redisClient.quit();
    } catch (error) {
        console.error('Error deleting OTP by email or phone:', error);
        throw error;
    }
}

// This function should retrieve the user from the database by email
export const getUserByEmail = async (email) => {

    let user = null;

    const client = getDbConnection();
    await client.connect();

    try {

        // Get user
        const userQuery = `
            SELECT  _id, 
                    js->'data'->>'fname' as fname,
                    js->'data'->>'lname' as lname,
                    js->'data'->>'rights' as rights,
                    js->'data'->>'avatar' as avatar,
                    js->'data'->>'blocks' as blocks,
                    js->'data'->>'portal' as portal
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'email' = $3
            LIMIT 1
        `;

        const userResult = await client.query(userQuery, ['user', sid, email]);
        if (userResult.rows.length > 0) {
            const row = userResult.rows[0];
            user = {
                id: row._id,
                fname: row.fname,
                lname: row.lname,
                rights: row.rights ? JSON.parse(row.rights) : [],
                avatar: row.avatar ? JSON.parse(row.avatar) : null,
                portal: row.portal || null
            };
        }

        return user;

    } finally {
        await client.end();
    }
}

// This function should retrieve the user from the database by email
export const getUserByPhone = async (phone) => {

    let user = null;

    const client = getDbConnection();
    await client.connect();

    try {

        // Get user
        const userQuery = `
            SELECT  _id, 
                    js->'data'->>'fname' as fname,
                    js->'data'->>'lname' as lname,
                    js->'data'->>'rights' as rights,
                    js->'data'->>'avatar' as avatar,
                    js->'data'->>'blocks' as blocks,
                    js->'data'->>'portal' as portal
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'phone' = $3
            LIMIT 1
        `;

        const userResult = await client.query(userQuery, ['user', sid, phone]);
        if (userResult.rows.length > 0) {
            const row = userResult.rows[0];
            user = {
                id: row._id,
                fname: row.fname,
                lname: row.lname,
                rights: row.rights ? JSON.parse(row.rights) : [],
                avatar: row.avatar ? JSON.parse(row.avatar) : null,
                portal: row.portal || null
            };
        }

        return user;

    } finally {
        await client.end();
    }
}

// This function should retrieve the user from the database by ID
export const getUserById = async (id) => {

    let user = null;

    const client = getDbConnection();
    await client.connect();

    try {

        // Get user
        const userQuery = `
            SELECT  _id, 
                    js->'data'->>'fname' as fname,
                    js->'data'->>'lname' as lname,
                    js->'data'->>'rights' as rights,
                    js->'data'->>'avatar' as avatar,
                    js->'data'->>'blocks' as blocks,
                    js->'data'->>'portal' as portal
            FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3
            LIMIT 1
        `;

        const userResult = await client.query(userQuery, ['user', sid, id]);
        if (userResult.rows.length > 0) {
            const row = userResult.rows[0];
            user = {
                id: row._id,
                email: row.js?.data?.email || null,
                fname: row.fname,
                lname: row.lname,
                rights: row.rights ? JSON.parse(row.rights) : [],
                avatar: row.avatar ? JSON.parse(row.avatar) : null,
                portal: row.portal || null
            };
        }

        return user;

    } finally {
        await client.end();
    }
}

// Cache user session
export const cacheUserSession = async (user) => {

    try {

        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();

        const key = `user:${user.id}`;

        // Store user session in Redis with a TTL of 1 hour
        await redisClient.setEx(key, 3600 * 24 * 7, JSON.stringify(user));

        await redisClient.quit();

    } catch (error) {

        console.error('Error caching user session:', error);
        throw error;
    }

}

// Clear user session
export const clearUserSession = async (id) => {

    try {

        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();

        const key = `user:${id}`;

        console.log(`Clearing user session for user ID: ${id}`);

        // Store user session in Redis with a TTL of 1 hour
        await redisClient.del(key);

        await redisClient.quit();

    } catch (error) {

        console.error('Error clearing user session:', error);
        throw error;
    }
}

// Get cached user session by ID
export const getUserSessionById = async (id) => {

    let user = null;

    try {

        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();

        const key = `user:${id}`;

        user = await redisClient.get(key) || "";

        if (user) { user = JSON.parse(user); }

        await redisClient.quit();

        return user;

    } catch (error) {

        console.error('Error getting user session by ID:', error);
        throw error;
    }
}

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});


// Generate tokens
export const generateTokens = (user) => {
    const accessToken = jwt.sign(
        {
            id: user.id,
            fname: user.fname,
            lname: user.lname,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '12h' }
    );

    return { accessToken, refreshToken };
};

// Validation middleware
const validateLogin = [
    body('username').trim().isLength({ min: 1 }).escape(),
    body('password').isLength({ min: 1 })
];

const validateRegister = [
    body('username').trim().isLength({ min: 3, max: 20 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
];