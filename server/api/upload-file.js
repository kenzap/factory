import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { createStorageProvider } from '../_/helpers/storage/index.js';

const toPublicFileUrl = (filename) => {
    const encodedName = encodeURIComponent(filename);

    const base = (process.env.PUBLIC_FILES_BASE_URL || '').replace(/\/+$/, '');
    return base ? `${base}/files/${encodedName}` : `/files/${encodedName}`;
};

// Configure multer for memory storage (or disk storage if preferred)
const storage = multer.memoryStorage(); // Use memoryStorage for cloud uploads

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
    },
    fileFilter: (req, file, cb) => {

        // Add file type validation
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const mimetype = allowedTypes.test(file.mimetype);

        // Explicitly allow .mtl and .obj by extension
        if (mimetype || ext === 'mtl' || ext === 'obj') {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// storeFileInDb
const storeFileInDb = async (f) => {

    // Prepare image meta
    const js = {
        data: {
            u: Date.now(),
            e: f.ext,
            m: "",
            s: f.sizes ? f.sizes : [],
            n: f.file_name,
            o: f.original_name || f.file_name || '',
            z: f.file_size || 0,
            p: f.slug,
            a: ''
        }
    };
    const jsf = JSON.stringify(js);
    const created = Date.now();

    // DB connection
    const db = await getDbConnection();
    await db.connect();

    // let id;
    // const { rows } = await db.query(
    //     "SELECT _id FROM data WHERE ref = $1 AND sid = $2 AND js->>'data.p' = $3 LIMIT 1",
    //     [f.key, f.sid, f.slug]
    // );

    // if (rows.length === 0) {

    let _id = makeId();
    await db.query(
        "INSERT INTO data (_id, pid, sid, ref, js) VALUES ($1, $2, $3, $4, $5::jsonb)",
        [_id, 0, sid, "file", jsf]
    );

    return _id;
}

const storageClient = createStorageProvider();

const uploadToBucket = async (file, metadata) => {
    if (!storageClient.isConfigured) {
        throw new Error(`Storage provider "${storageClient.provider}" is not configured`);
    }

    const objectKey = `${metadata.folder}/${metadata.filename}`;
    console.log(`Uploading to ${storageClient.provider}:`, objectKey, metadata);

    try {
        const result = await storageClient.putObject(objectKey, file.buffer, {
            contentType: file.mimetype,
            metadata: {
                'original-name': metadata.originalName || file.originalname,
                'uploaded-by': metadata.userId || 'anonymous',
                'upload-time': new Date().toISOString(),
            },
            acl: 'private',
        });

        const signedUrl = await storageClient.getSignedUrl(objectKey, {
            expiresIn: 3600,
        });

        return {
            success: true,
            url: result.url || signedUrl,
            signedUrl,
            key: objectKey,
            etag: result.etag,
            requestId: result.requestId,
        };
    } catch (error) {
        throw new Error(`${storageClient.provider} upload failed: ${error.message}`);
    }
}

const createSizeVariations = async (logger, file, metadata, fileId) => {

    // Only process images for size variations
    if (!file.mimetype.startsWith('image/')) {
        return Promise.resolve();
    }

    // const sizes = JSON.parse(metadata.sizes || '[]');
    const parseSizes = (sizeString) => {
        if (!sizeString) return [];
        return sizeString.split('|').map(size => {
            const [width, height] = size.split('x').map(Number);
            return { width, height: height || null };
        });
    };

    const sizes = parseSizes(metadata.sizes || '');

    // If no sizes specified, skip
    if (sizes.length === 0) {
        return Promise.resolve();
    }

    if (!storageClient.isConfigured) {
        throw new Error(`Storage provider "${storageClient.provider}" is not configured`);
    }

    const promises = sizes.map(async (size) => {
        try {
            // Build resize options - maintain aspect ratio if height is missing
            const resizeOptions = { fit: 'inside' };
            const resizeHeight = size.height || null;

            const resizedBuffer = await sharp(file.buffer)
                .resize(size.width, resizeHeight, resizeOptions)
                .webp({ quality: 80 })
                .toBuffer();

            const sizeKey = `${metadata.folder}/${metadata.source ? metadata.source + '-' : ''}${fileId}-1-${size.width}${size.height ? 'x' + size.height : ''}.webp`;
            logger.info(`Uploading size variation ${size.width}x${size.height || 'auto'} to ${storageClient.provider} as ${sizeKey}`);
            return storageClient.putObject(sizeKey, resizedBuffer, {
                contentType: 'image/webp',
                metadata: {
                    'original-name': metadata.originalName || file.originalname,
                    'uploaded-by': metadata.userId || 'anonymous',
                    'upload-time': new Date().toISOString(),
                },
                acl: 'private',
            });
        } catch (error) {
            logger.error(`Failed to create size variation ${size.width}x${size.height || 'auto'}: ${error.message}`);
            throw error;
        }
    });

    return Promise.all(promises);
}

// API route
function uploadFileApi(app, logger) {
    app.post('/api/upload-file/', authenticateToken, upload.single('file'), async (req, res) => {
        try {

            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Extract form data
            const {
                source,
                name,
                sizes
            } = req.body;

            // Validate required fields
            // if (!slug) {
            //     return res.status(400).json({ error: 'Missing required fields' });
            // }

            const uploadName = name || req.file.originalname || '';

            // extension
            let ext = uploadName.split('.');
            ext = ext[ext.length - 1];
            if (ext.length > 10) ext = ext.substring(0, 10);

            // Save file info to database if needed
            const fileRecord = {
                slug: "",
                ext,
                original_name: req.file.originalname,
                file_name: uploadName,
                file_size: req.file.size,
                mime_type: req.file.mimetype,
                sizes: sizes,
                user_id: req.user?.id
            };

            // store in DB
            const _id = await storeFileInDb(fileRecord);

            // Generate unique filename
            const filename = ext ? `${_id}.${ext}` : `${_id}`;

            logger.info(`File uploaded: ${filename} (${req.file.size} bytes) by user ${req.user?.id}`);

            // Prepare metadata for bucket upload
            const metadata = {
                folder: `S${sid}`, // Organize by space ID
                filename: filename,
                userId: req.user?.id, // From authenticateToken middleware
                originalName: uploadName,
                sizes: sizes,
                source: source || ''
            };

            // Upload to bucket (S3, Google Cloud, etc.)
            const bucketResult = await uploadToBucket(req.file, metadata);

            // Create size variations (applicable for images only)
            const variations = await createSizeVariations(logger, req.file, metadata, _id);

            logger.info(`File ${filename} uploaded to bucket successfully`);

            // Return success response
            res.json({
                success: true,
                upload: {
                    _id: _id,
                    ext: ext,
                    filename: filename,
                    name: metadata.originalName,
                    url: toPublicFileUrl(filename),
                    size: req.file.size,
                    type: req.file.mimetype,
                    sizes: sizes
                    // bucket_key: bucketResult.key
                }
            });

        } catch (err) {
            console.error('Upload error:', err);

            // Handle specific multer errors
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large' });
                }
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }

            res.status(500).json({ error: 'Failed to process uploaded file' });
        }
    });
}

export default uploadFileApi;
