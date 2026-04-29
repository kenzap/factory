// === Optimized server/server.js with caching and performance improvements ===
import connectLivereload from 'connect-livereload';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import livereload from 'livereload';
import mime from 'mime-types';
import path from 'path';
import { fileURLToPath } from 'url';
import { eventBus } from './_/helpers/extensions/events.js';
import { checkFileExists } from './_/helpers/extensions/file.js';
import { loadExtensions } from './_/helpers/extensions/loader.js';
import createLogger from './_/helpers/logger.js';
import { sseManager } from './_/helpers/sse.js';
import { createStorageProvider } from './_/helpers/storage/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PUBLIC_DIR = path.join(__dirname, process.env.NODE_ENV === 'production' ? '../dist' : '../public');
const OVERRIDE_PUBLIC_DIR = path.join(__dirname, '../overrides/public');
const HAS_OVERRIDE_PUBLIC_DIR = fs.existsSync(OVERRIDE_PUBLIC_DIR);
const PACKAGES_DIR = path.join(__dirname, '../packages');
const API_DIR = path.join(__dirname, 'api');
const DOCUMENT_DIR = path.join(__dirname, 'document');
const OVERRIDE_API_DIR = path.join(__dirname, '../overrides/server/api');
const OVERRIDE_DOCUMENT_DIR = path.join(__dirname, '../overrides/server/document');
const EXTENSIONS_DIR = path.join(__dirname, 'extensions');
const logger = createLogger('server');
const storageClient = createStorageProvider();
const DEFAULT_SPACE_ID = process.env.SID || 1000000;

// Cache for file existence to avoid repeated fs calls
const fileCache = new Map();

// cron cache
const scheduledJobs = new Map()

// Request timing middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            // logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        });
        next();
    });
}

// Security & CORS
app.use(helmet({
    contentSecurityPolicy: false, // Adjust as needed
}));

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost', 'http://127.0.0.1', 'https://office.skarda.design'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// LiveReload setup with cache busting
if (process.env.NODE_ENV !== 'production') {
    try {
        const liveReloadServer = livereload.createServer({
            port: 35729,
            host: 'localhost',
            exts: ['html', 'css', 'js'],
            delay: 2000
        });

        liveReloadServer.watch(PUBLIC_DIR);

        logger.info('LiveReload server started on port 35729');

        const livereloadMiddleware = connectLivereload({
            port: 35729
        });

        function conditionalLivereload(req, res, next) {
            if (req.path.startsWith('/document/') || req.path.startsWith('/api/') || req.path.startsWith('/report/')) {
                return next();
            }

            // Disable caching for development
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            return livereloadMiddleware(req, res, next);
        }
        app.use(conditionalLivereload);

    } catch (err) {
        logger.error('Failed to start LiveReload:', err);
    }
}

// Static files with proper caching
const staticOptions = {
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
};

// Global override layer: overrides/public shadows core /public files.
if (HAS_OVERRIDE_PUBLIC_DIR) {
    app.use(express.static(OVERRIDE_PUBLIC_DIR, staticOptions));
}
app.use(express.static(PUBLIC_DIR, staticOptions));

// Expose shared runtime packages for browser ES module imports
app.use('/packages', express.static(PACKAGES_DIR, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
}));

function getRouteFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs
        .readdirSync(directory)
        .filter(file => file.endsWith('.js'))
        .sort();
}

async function loadRouteFile(directory, file, routeType, source) {
    try {
        const module = await import(path.join(directory, file));
        const handler = module.default || module;
        if (typeof handler === 'function') {
            handler(app, logger);
        }
    } catch (err) {
        logger.error(`Error loading ${routeType} route ${file} (${source}):`, err);
    }
}

// Load override routes first; core routes are loaded only when not overridden by filename.
async function loadRoutesWithOverrides(coreDir, overrideDir, routeType) {
    const overrideFiles = getRouteFiles(overrideDir);
    const overrideSet = new Set(overrideFiles);
    const coreFiles = getRouteFiles(coreDir).filter(file => !overrideSet.has(file));

    for (const file of overrideFiles) {
        await loadRouteFile(overrideDir, file, routeType, 'override');
    }

    for (const file of coreFiles) {
        await loadRouteFile(coreDir, file, routeType, 'core');
    }
}

// Load all routes at startup
await Promise.all([
    sseManager.initialize(),
    eventBus.initialize()
]);

await loadRoutesWithOverrides(API_DIR, OVERRIDE_API_DIR, 'API');
await loadRoutesWithOverrides(DOCUMENT_DIR, OVERRIDE_DOCUMENT_DIR, 'document');

// Load integrations
await loadExtensions(EXTENSIONS_DIR, app, logger, scheduledJobs, fileCache);

// Public file gateway (hides storage endpoint and bucket details)
app.get('/files/*', async (req, res) => {
    if (!storageClient.isConfigured) {
        return res.status(503).send('Storage is not configured');
    }

    const rawKey = req.params?.[0];
    if (!rawKey) {
        return res.status(400).send('Invalid file key');
    }

    const normalizedKey = decodeURIComponent(String(rawKey)).replace(/^\/+/, '');
    const objectKey = normalizedKey.includes('/')
        ? normalizedKey
        : `S${DEFAULT_SPACE_ID}/${normalizedKey}`;

    try {
        const object = await storageClient.getObject(objectKey);

        if (!object?.body) {
            return res.status(404).send('File not found');
        }

        const guessedType = mime.lookup(objectKey) || '';
        const contentType = (!object.contentType || object.contentType === 'application/octet-stream')
            ? guessedType
            : object.contentType;

        if (contentType) {
            res.setHeader('Content-Type', contentType);
        } else {
            res.setHeader('Content-Type', 'application/octet-stream');
        }
        if (object.contentLength) res.setHeader('Content-Length', String(object.contentLength));
        if (object.etag) res.setHeader('ETag', object.etag);
        res.setHeader('Cache-Control', object.cacheControl || 'public, max-age=31536000, immutable');

        object.body.pipe(res);
    } catch (_error) {
        return res.status(404).send('File not found');
    }
});

// Optimized Next.js-like routing with caching
app.get('*', (req, res, next) => {

    // Skip for API routes (they're already handled)
    if (req.path.startsWith('/api/') || req.path.startsWith('/document/')) {
        return next();
    }

    const requestedPath = req.path.endsWith('/') ? req.path + 'index' : req.path;
    const relativeRequestedPath = requestedPath.replace(/^\/+/, '');

    const publicRoots = HAS_OVERRIDE_PUBLIC_DIR
        ? [OVERRIDE_PUBLIC_DIR, PUBLIC_DIR]
        : [PUBLIC_DIR];

    // Try files in order of likelihood, checking override root first.
    for (const rootDir of publicRoots) {
        const fullPath = path.join(rootDir, relativeRequestedPath);
        const filesToCheck = [
            { path: `${fullPath}.js`, type: 'application/javascript' },
            { path: `${fullPath}.html`, type: 'text/html' },
            { path: path.join(fullPath, 'index.js'), type: 'application/javascript' },
            { path: path.join(fullPath, 'index.html'), type: 'text/html' }
        ];

        for (const file of filesToCheck) {
            if (checkFileExists(file.path, fileCache)) {
                res.type(file.type);
                return res.sendFile(file.path);
            }
        }
    }

    // 404
    res.status(404).send('Not found');
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}/home/`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (HAS_OVERRIDE_PUBLIC_DIR) {
        logger.info(`Override public layer enabled: ${OVERRIDE_PUBLIC_DIR}`);
    } else {
        logger.info(`Override public layer not found: ${OVERRIDE_PUBLIC_DIR}`);
    }
    logger.info(`Override API layer: ${fs.existsSync(OVERRIDE_API_DIR) ? OVERRIDE_API_DIR : 'not found'}`);
    logger.info(`Override document layer: ${fs.existsSync(OVERRIDE_DOCUMENT_DIR) ? OVERRIDE_DOCUMENT_DIR : 'not found'}`);
});  
