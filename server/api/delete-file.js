import OSS from 'ali-oss';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

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
        RETURNING _id, js->'data'->'e' as ext
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

// Alibaba Cloud OSS delete function
async function deleteFromBucket(id) {
    const client = new OSS({
        region: process.env.BUCKET_REGION,
        accessKeyId: process.env.BUCKET_KEY,
        accessKeySecret: process.env.BUCKET_SECRET,
        bucket: process.env.BUCKET_NAME,
        secure: true,
    });

    // Assuming the object key is based on the id
    const objectKey = `S${sid}/${id}`;

    try {
        const result = await client.delete(objectKey);
        return { success: true, result };
    } catch (error) {
        throw new Error(`OSS delete failed: ${error.message}`);
    }
}

// API route
function deleteFileApi(app) {

    app.post('/api/delete-file/', authenticateToken, async (_req, res) => {

        console.log('/api/delete-file/', _req.body.id);

        const responseDB = await deleteFile(_req.body.id);
        const ext = responseDB.ext;
        const objectId = ext ? `${responseDB._id}.${ext}` : `${responseDB._id}`;
        const responseBucket = await deleteFromBucket(objectId);

        // console.log('deleteClient response', response);

        res.json({ success: true, responseDB, responseBucket });
    });
}

export default deleteFileApi;