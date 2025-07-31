import OSS from 'ali-oss';
import formidable from 'formidable';
import mime from 'mime-types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log } from '../_/helpers/index.js';

export const handleUpload = async (req, res) => {

    // Parse form data
    const form = formidable({ multiples: false });
    const fields = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });

    const { fields: f, files } = fields;
    const output = { success: true };

    // Validate required fields
    const required = ['sid', 'key', 'slug', 'pid'];
    for (const k of required) {
        if (!f[k]) {
            res.status(404).json({ success: false, reason: 'not authorized' });
            return;
        }
    }

    f.sizes = f.sizes || '0';
    if (String(f.sizes).length > 1000) {
        res.status(412).json({ success: false, reason: 'malformed sizes parameter' });
        return;
    }
    if (String(f.slug).length > 1000) {
        res.status(413).json({ success: false, reason: 'malformed slug parameter' });
        return;
    }

    let name = f.name || (files.file && files.file.originalFilename) || '';
    if (!files.file || !files.file.filepath) {
        res.status(400).json({ success: false, reason: 'no upload file provided' });
        return;
    }
    if (name.length > 1000) {
        res.status(411).json({ success: false, reason: 'please provide file with shorter name' });
        return;
    }

    const tmpPath = files.file.filepath;
    const tmpMime = mime.lookup(tmpPath) || files.file.mimetype;
    output.tmp_mime = tmpMime;
    output.tmp_name = tmpPath;

    // Detect file extension
    let ext = f.ext || mime.extension(tmpMime) || '';
    if (['image/tiff', 'image/webp', 'image/jpeg', 'image/bmp', 'image/gif', 'image/png'].includes(tmpMime)) {
        ext = 'webp';
        f.sizes = f.sizes ? String(f.sizes).split('|') : [];
    }

    // Ensure 100x100 is present
    if (Array.isArray(f.sizes)) f.sizes = f.sizes.join('|');
    if (!String(f.sizes).includes('100x100')) f.sizes = '100x100|' + f.sizes;

    // Prepare image meta
    const js = {
        data: {
            u: Date.now(),
            e: ext,
            m: tmpMime,
            s: f.sizes,
            n: name,
            p: f.slug,
            a: ''
        }
    };
    const jsf = JSON.stringify(js);
    const created = Date.now();

    // DB connection
    const db = await getDbConnection();
    await db.connect();

    let id;
    const { rows } = await db.query(
        "SELECT _id FROM data WHERE ref = $1 AND sid = $2 AND js->>'data.p' = $3 LIMIT 1",
        [f.key, f.sid, f.slug]
    );
    if (rows.length === 0) {
        id = uuidv4();
        await db.query(
            "INSERT INTO data (_id, pid, sid, ref, js) VALUES ($1, $2, $3, $4, $5::jsonb)",
            [id, f.pid, f.sid, f.key, jsf]
        );
        output.id = id;
    }

    // OSS client
    const ossClient = new OSS({
        region: 'eu-central-1',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        bucket: 'kenzap-sites-eu',
        endpoint: 'oss-eu-central-1.aliyuncs.com'
    });

    // File processing
    if (['image/tiff', 'image/webp', 'image/jpeg', 'image/bmp', 'image/gif', 'image/png'].includes(tmpMime)) {
        // Raster image
        const sizes = String(f.sizes).split('|');
        output.sizes = [];
        for (const s of sizes) {
            let sw = parseInt(s, 10);
            let sh = null;
            if (s.includes('x')) {
                const [w, h] = s.split('x').map(Number);
                sw = w;
                sh = h;
            }
            output.sizes.push(s);

            // Resize and upload JPEG
            const jpegBuffer = await sharp(tmpPath)
                .resize(sw, sh, { fit: 'cover' })
                .jpeg({ quality: 86 })
                .toBuffer();
            await ossClient.put(`S${f.sid}/${f.slug}-${s}.jpeg`, jpegBuffer);

            // Resize and upload WEBP
            const webpBuffer = await sharp(tmpPath)
                .resize(sw, sh, { fit: 'cover' })
                .webp({ quality: 86 })
                .toBuffer();
            await ossClient.put(`S${f.sid}/${f.slug}-${s}.webp`, webpBuffer);

            output.jpeg = true;
        }
        output.format = 'webp';
    } else if (tmpMime === 'image/svg+xml') {
        // SVG
        await ossClient.put(`S${f.sid}/${f.slug}.svg`, tmpPath);
        output.format = 'svg';
    } else {
        // Other file
        let extF = ext ? '.' + ext : '';
        let fileF = `S${f.sid}/${f.slug}`;
        if (!String(f.slug).includes(extF) && ext) fileF = `S${f.sid}/${f.slug}${extF}`;
        await ossClient.put(fileF, tmpPath);
        output.format = '';
    }

    output.success = true;
    return output;
};

// API route
function uploadFileApi(app) {

    app.post('/api/upload-file/', authenticateToken, async (req, res) => {
        try {
            // Pass req and res to handleUpload for form upload
            const upload = await handleUpload(req, res);

            // If handleUpload already sent a response, don't send another
            if (res.headersSent) return;

            res.send({ success: true, upload });
        } catch (err) {
            res.status(500).json({ error: 'failed to process uploaded file' });
            log(`Error uploading file: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default uploadFileApi;