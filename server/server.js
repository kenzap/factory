// === Updated server/server.js with Next.js-like routing ===
import connectLivereload from 'connect-livereload';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import livereload from 'livereload';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PUBLIC_DIR = path.join(__dirname, '../public');
const JS_DIR = path.join(PUBLIC_DIR);

// LiveReload setup
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(PUBLIC_DIR);
const livereloadMiddleware = connectLivereload();

function conditionalLivereload(req, res, next) {
    // Skip injection for PDF route or based on some flag
    if (req.path.startsWith('/document/') || req.path.startsWith('/api/')) {
        return next();
    }
    return livereloadMiddleware(req, res, next);
}

app.use(conditionalLivereload);

// Static files (scripts, styles, assets)
app.use(express.static(PUBLIC_DIR));

// Auth
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'https://office.skarda.design'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Dynamic API route loading
const API_DIR = path.join(__dirname, 'api');
const DOCUMENT_DIR = path.join(__dirname, 'document');

// Load API routes dynamically (synchronously)
if (fs.existsSync(API_DIR)) {
    const apiFiles = fs.readdirSync(API_DIR).filter(file => file.endsWith('.js'));

    // Use Promise.all to wait for all routes to load before continuing
    await Promise.all(apiFiles.map(async (file) => {
        try {
            const module = await import(path.join(API_DIR, file));
            const handler = module.default || module;
            if (typeof handler === 'function') {
                handler(app);
                // console.log(`Loaded API routes from: ${file}`);
            }
        } catch (err) {
            console.error(`Error loading API route ${file}:`, err);
        }
    }));
}

// Load document routes dynamically
if (fs.existsSync(DOCUMENT_DIR)) {
    const documentFiles = fs.readdirSync(DOCUMENT_DIR).filter(file => file.endsWith('.js'));

    await Promise.all(documentFiles.map(async (file) => {
        try {
            const module = await import(path.join(DOCUMENT_DIR, file));
            const handler = module.default || module;
            if (typeof handler === 'function') {
                handler(app);
                // console.log(`Loaded document routes from: ${file}`);
            }
        } catch (err) {
            console.error(`Error loading document route ${file}:`, err);
        }
    }));
}

// // Simple API route
// app.get('/api/hello', (req, res) => {
//     res.json({ message: 'Hello from backend!' });
// });

// === Next.js-like Routing Logic ===
app.get('*', (req, res, next) => {
    const requestedPath = req.path.endsWith('/') ? req.path + 'index' : req.path;
    const fullPath = path.join(PUBLIC_DIR, requestedPath);

    const jsFile = `${fullPath}.js`;
    const htmlFile = `${fullPath}.html`;
    const folderIndexFile = path.join(fullPath, 'index.js');

    if (fs.existsSync(jsFile)) {
        res.type('application/javascript');
        return res.sendFile(jsFile);
    }
    if (fs.existsSync(htmlFile)) {
        res.type('text/html');
        return res.sendFile(htmlFile);
    }
    if (fs.existsSync(folderIndexFile)) {
        res.type('application/javascript');
        return res.sendFile(folderIndexFile);
    }

    // If HTML is expected, serve index.html for SPA fallback
    if (req.accepts('html')) {
        return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    }

    // Fallback: 404
    res.status(404).send('Not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));