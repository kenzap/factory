import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, log_error, sid } from '../_/helpers/index.js';
import { createStorageProvider } from '../_/helpers/storage/index.js';

/**
 * Delete file from the database and cloud storage
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteFile(id) {

    const client = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = {};

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id, js->'data'->>'e' as ext, js->'data'->>'s' as sizes
    `;

    const params = ['file', sid, id];

    try {

        await client.connect();

        const result = await client.query(query, params);

        response = result.rows[0];

    } finally {
        await client.end();
    }

    return response;
}

const storageClient = createStorageProvider();

async function deleteFromBucket(id) {
    if (!storageClient.isConfigured) {
        return { success: false, error: `Storage provider "${storageClient.provider}" is not configured` };
    }

    try {
        const folderPrefix = `S${sid}/`;
        const objectKey = `${folderPrefix}${id}`;
        const fileId = String(id).split('.')[0];
        const escapedFileId = fileId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const keysInFolder = typeof storageClient.listObjects === 'function'
            ? await storageClient.listObjects(folderPrefix)
            : [];

        const relatedRegex = new RegExp(
            `${folderPrefix}(?:` +
            `${escapedFileId}\\.` + // original file: <id>.<ext>
            `|${escapedFileId}-1-` + // generated from upload without source prefix
            `|[a-z0-9_-]+-${escapedFileId}-1-` + // generated with arbitrary source prefix
            `|sketch-${escapedFileId}-1-` + // sketch variants
            `|post-${escapedFileId}-` + // post variants
            `)`
        );

        const candidateKeys = new Set([objectKey]);
        keysInFolder.forEach((key) => {
            if (relatedRegex.test(key)) candidateKeys.add(key);
        });

        const deleted = [];
        const failed = [];

        for (const key of candidateKeys) {
            try {
                await storageClient.deleteObject(key);
                deleted.push(key);
            } catch (error) {
                failed.push({ key, error: error.message });
            }
        }

        return {
            success: failed.length === 0,
            deleted,
            failed,
        };
    } catch (error) {
        log_error(`${storageClient.provider} delete failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// API route
function deleteFileApi(app) {

    app.post('/api/delete-file/', authenticateToken, async (_req, res) => {

        log('/api/delete-file/', _req.body.id);

        const responseDB = await deleteFile(_req.body.id);
        const ext = responseDB?.ext;

        // no info about file extension, nothing to delete from the bucket
        if (!ext) {
            res.json({ success: true, responseDB });
            return;
        }

        const objectId = ext ? `${responseDB._id}.${ext}` : `${responseDB._id}`;
        const responseBucket = await deleteFromBucket(objectId);

        res.json({ success: true, responseDB, responseBucket });
    });
}

export default deleteFileApi;
