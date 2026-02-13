// import OSS from 'ali-oss';
// import formidable from 'formidable';
// import mime from 'mime-types';
import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import OSS from 'ali-oss';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

// Configure multer for memory storage (or disk storage if preferred)
const storage = multer.memoryStorage(); // Use memoryStorage for cloud uploads

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 10MB limit
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

// Alibaba Cloud OSS upload function
const uploadToBucket = async (file, metadata) => {

    const client = new OSS({
        region: process.env.BUCKET_REGION,
        accessKeyId: process.env.BUCKET_KEY,
        accessKeySecret: process.env.BUCKET_SECRET,
        bucket: process.env.BUCKET_NAME,
        // Optional: Use HTTPS
        secure: true,
        // Optional: Custom endpoint if using internal network
        // endpoint: process.env.OSS_ENDPOINT
    });

    const objectKey = `${metadata.folder}/${metadata.filename}`;

    console.log('Uploading to OSS:', objectKey, metadata);

    try {
        // Upload options
        const options = {
            headers: {
                'Content-Type': file.mimetype,
                'x-oss-meta-original-name': metadata.originalName || file.originalname,
                'x-oss-meta-uploaded-by': metadata.userId || 'anonymous',
                // 'x-oss-meta-slug': metadata.slug,
                'x-oss-meta-upload-time': new Date().toISOString()
            },
            // Optional: Set object ACL (private, public-read, public-read-write)
            'x-oss-object-acl': 'private'
        };

        // Upload file buffer to OSS
        const result = await client.put(objectKey, file.buffer, options);

        // Generate public URL (if bucket allows public read)
        // const publicUrl = client.generateObjectUrl(objectKey);

        // Or generate signed URL for private access
        const signedUrl = client.signatureUrl(objectKey, {
            expires: 3600 // URL expires in 1 hour
        });

        return {
            success: true,
            url: result.url, // OSS object URL
            signedUrl: signedUrl, // Signed URL for private access
            key: objectKey,
            etag: result.res.headers.etag,
            requestId: result.res.headers['x-oss-request-id']
        };
    } catch (error) {
        throw new Error(`OSS upload failed: ${error.message}`);
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

    const client = new OSS({
        region: process.env.BUCKET_REGION,
        accessKeyId: process.env.BUCKET_KEY,
        accessKeySecret: process.env.BUCKET_SECRET,
        bucket: process.env.BUCKET_NAME,
        secure: true
    });

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
            logger.info(`Uploading size variation ${size.width}x${size.height || 'auto'} to OSS as ${sizeKey}`);
            return client.put(sizeKey, resizedBuffer, {
                headers: {
                    'Content-Type': 'image/webp',
                    'x-oss-meta-original-name': metadata.originalName || file.originalname,
                    'x-oss-meta-uploaded-by': metadata.userId || 'anonymous',
                    'x-oss-meta-upload-time': new Date().toISOString()
                },
                'x-oss-object-acl': 'private'
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

            // extension
            let ext = name.split('.');
            ext = ext[ext.length - 1];
            if (ext.length > 10) ext = ext.substring(0, 10);

            // Save file info to database if needed
            const fileRecord = {
                slug: "",
                ext,
                original_name: req.file.originalname,
                file_name: "",
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
                originalName: name || req.file.originalname,
                sizes: sizes,
                source: source || ''
            };

            // Upload to bucket (S3, Google Cloud, etc.)
            const bucketResult = await uploadToBucket(req.file, metadata);

            // Create size variations (applicable for images only)
            const variations = await createSizeVariations(logger, req.file, metadata, _id);

            logger.info(`File ${filename} uploaded to bucket successfully with variations: ${variations.length}`);

            // Return success response
            res.json({
                success: true,
                upload: {
                    _id: _id,
                    ext: ext,
                    filename: filename,
                    url: bucketResult.url,
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