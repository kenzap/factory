// === Optimized server/server.js with caching and performance improvements ===
import connectLivereload from 'connect-livereload';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import livereload from 'livereload';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PUBLIC_DIR = path.join(__dirname, '../public');
const API_DIR = path.join(__dirname, 'api');
const DOCUMENT_DIR = path.join(__dirname, 'document');

// Cache for file existence to avoid repeated fs calls
const fileCache = new Map();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? Infinity : 5000; // 5s in dev, permanent in prod

function checkFileExists(filePath) {
    const now = Date.now();
    const cached = fileCache.get(filePath);

    if (cached && (CACHE_TTL === Infinity || now - cached.time < CACHE_TTL)) {
        return cached.exists;
    }

    const exists = fs.existsSync(filePath);
    fileCache.set(filePath, { exists, time: now });
    return exists;
}

// Request timing middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        });
        next();
    });
}

// Security & CORS
app.use(helmet({
    contentSecurityPolicy: false, // Adjust as needed
}));

app.use(cors({
    origin: ['http://localhost:3000', 'https://office.skarda.design'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// LiveReload setup
if (process.env.NODE_ENV !== 'production') {
    const liveReloadServer = livereload.createServer();
    liveReloadServer.watch(PUBLIC_DIR);
    const livereloadMiddleware = connectLivereload();

    function conditionalLivereload(req, res, next) {
        // Skip injection for PDF route or based on some flag
        if (req.path.startsWith('/document/') || req.path.startsWith('/api/') || req.path.startsWith('/report/')) {
            return next();
        }
        return livereloadMiddleware(req, res, next);
    }
    app.use(conditionalLivereload);
}

// Static files with proper caching
app.use(express.static(PUBLIC_DIR, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Set cache headers based on file type
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
    }
}));

// Dynamic API route loading
async function loadRoutes(directory, routeType) {
    if (!fs.existsSync(directory)) return;

    const files = fs.readdirSync(directory).filter(file => file.endsWith('.js'));

    await Promise.all(files.map(async (file) => {
        try {
            const module = await import(path.join(directory, file));
            const handler = module.default || module;
            if (typeof handler === 'function') {
                handler(app);
            }
        } catch (err) {
            console.error(`Error loading ${routeType} route ${file}:`, err);
        }
    }));
}

// Load all routes at startup
await loadRoutes(API_DIR, 'API');
await loadRoutes(DOCUMENT_DIR, 'document');

// Optimized Next.js-like routing with caching
app.get('*', (req, res, next) => {

    // Skip for API routes (they're already handled)
    if (req.path.startsWith('/api/') || req.path.startsWith('/document/')) {
        return next();
    }

    const requestedPath = req.path.endsWith('/') ? req.path + 'index' : req.path;
    const fullPath = path.join(PUBLIC_DIR, requestedPath);

    // Try files in order of likelihood
    const filesToCheck = [
        { path: `${fullPath}.js`, type: 'application/javascript' },
        { path: `${fullPath}.html`, type: 'text/html' },
        { path: path.join(fullPath, 'index.js'), type: 'application/javascript' },
        { path: path.join(fullPath, 'index.html'), type: 'text/html' }
    ];

    for (const file of filesToCheck) {
        if (checkFileExists(file.path)) {
            res.type(file.type);
            return res.sendFile(file.path);
        }
    }

    // SPA fallback for HTML requests
    if (req.accepts('html')) {
        return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    }

    // 404
    res.status(404).send('Not found');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});