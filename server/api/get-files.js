import OSS from 'ali-oss';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const getBucketClient = () => {
    if (!process.env.BUCKET_NAME || !process.env.BUCKET_KEY || !process.env.BUCKET_SECRET || !process.env.BUCKET_REGION) {
        return null;
    }

    return new OSS({
        region: process.env.BUCKET_REGION,
        accessKeyId: process.env.BUCKET_KEY,
        accessKeySecret: process.env.BUCKET_SECRET,
        bucket: process.env.BUCKET_NAME,
        secure: true,
    });
};

const parseIntSafe = (value) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
};

const getFiles = async (filters = {}) => {
    const client = getDbConnection();
    const files = [];

    const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? Math.min(filters.limit, 500) : 200;
    const offset = Number.isInteger(filters.offset) && filters.offset >= 0 ? filters.offset : 0;
    const search = typeof filters.s === 'string' ? filters.s.trim() : '';

    try {
        await client.connect();

        let where = `WHERE ref = $1 AND sid = $2`;
        const params = ['file', sid];

        if (search) {
            params.push(`%${search}%`);
            where += ` AND (
                unaccent(COALESCE(js->'data'->>'o', '')) ILIKE unaccent($${params.length})
                OR unaccent(COALESCE(js->'data'->>'n', '')) ILIKE unaccent($${params.length})
                OR unaccent(COALESCE(js->'data'->>'e', '')) ILIKE unaccent($${params.length})
                OR unaccent(_id) ILIKE unaccent($${params.length})
            )`;
        }

        const listParams = [...params, limit, offset];

        const listQuery = `
            SELECT
                _id,
                COALESCE(js->'data'->>'o', js->'data'->>'n', '') AS name,
                COALESCE(js->'data'->>'e', '') AS ext,
                COALESCE(js->'data'->>'m', '') AS mime,
                COALESCE(js->'data'->>'u', '0') AS uploaded,
                COALESCE(js->'data'->>'z', '0') AS size
            FROM data
            ${where}
            ORDER BY COALESCE(NULLIF(js->'data'->>'u', '')::bigint, 0) DESC, _id DESC
            LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
        `;

        const listResult = await client.query(listQuery, listParams);

        listResult.rows.forEach((row) => {
            files.push({
                id: row._id,
                name: row.name || `${row._id}${row.ext ? '.' + row.ext : ''}`,
                ext: row.ext || '',
                mime: row.mime || '',
                uploaded: parseIntSafe(row.uploaded),
                size: parseIntSafe(row.size),
                view_url: '',
            });
        });

        const bucketClient = getBucketClient();

        if (bucketClient) {
            files.forEach((file) => {
                if (!file.ext) return;
                const objectKey = `S${sid}/${file.id}.${file.ext}`;
                file.view_url = bucketClient.signatureUrl(objectKey, { expires: 3600 });
            });
        }

        const filesMissingSize = files.filter((f) => !f.size && f.ext && bucketClient);

        if (bucketClient && filesMissingSize.length > 0) {
            await Promise.all(filesMissingSize.map(async (file) => {
                try {
                    const objectKey = `S${sid}/${file.id}.${file.ext}`;
                    const head = await bucketClient.head(objectKey);
                    const bucketSize = parseIntSafe(head?.res?.headers?.['content-length']);

                    if (bucketSize > 0) {
                        file.size = bucketSize;

                        await client.query(
                            `
                                UPDATE data
                                SET js = jsonb_set(js, '{data,z}', to_jsonb($1::bigint), true)
                                WHERE _id = $2 AND sid = $3 AND ref = 'file'
                            `,
                            [bucketSize, file.id, sid]
                        );
                    }
                } catch (_error) {
                    // Ignore missing/object access errors for legacy records.
                }
            }));
        }

        const countQuery = `SELECT COUNT(_id) AS total FROM data ${where}`;
        const countResult = await client.query(countQuery, params);
        const totalRecords = parseIntSafe(countResult.rows?.[0]?.total);

        const totalSizeQuery = `
            SELECT COALESCE(SUM(COALESCE(NULLIF(js->'data'->>'z', '')::bigint, 0)), 0) AS total_size
            FROM data
            ${where}
        `;
        const totalSizeResult = await client.query(totalSizeQuery, params);
        let totalSize = parseIntSafe(totalSizeResult.rows?.[0]?.total_size);

        if (totalSize === 0 && files.length > 0) {
            totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        }

        return {
            files,
            meta: {
                limit,
                offset,
                total_records: totalRecords,
            },
            totals: {
                files: totalRecords,
                size: totalSize,
            }
        };
    } finally {
        await client.end();
    }
};

function getFilesApi(app) {
    app.post('/api/get-files/', authenticateToken, async (req, res) => {
        if (!req?.user?.rights?.includes('file_management')) {
            return res.status(403).json({ success: false, code: 403, error: 'forbidden' });
        }

        const files = await getFiles(req.body?.filters || {});
        const locale = await getLocale(req.headers);
        const locales = await getLocales();

        res.json({
            success: true,
            user: req.user,
            locale,
            locales,
            files,
        });
    });
}

export default getFilesApi;
