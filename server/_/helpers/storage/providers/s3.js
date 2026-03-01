import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const toDefined = (value) => (value === undefined || value === null || value === '' ? undefined : value);

const parseBool = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    const v = String(value).toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'no') return false;
    return fallback;
};

const buildS3Config = () => {
    const endpoint = toDefined(process.env.S3_ENDPOINT || process.env.BUCKET_ENDPOINT);

    return {
        bucket: toDefined(process.env.S3_BUCKET || process.env.BUCKET_NAME),
        region: toDefined(process.env.S3_REGION || process.env.BUCKET_REGION || 'us-east-1'),
        accessKeyId: toDefined(process.env.S3_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID || process.env.BUCKET_KEY),
        secretAccessKey: toDefined(process.env.S3_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET),
        endpoint,
        forcePathStyle: parseBool(process.env.S3_FORCE_PATH_STYLE, Boolean(endpoint)),
    };
};

const ensureConfig = (config) => {
    if (!config.bucket || !config.region || !config.accessKeyId || !config.secretAccessKey) {
        throw new Error('S3 storage is not configured. Set S3_* or BUCKET_* variables.');
    }
};

const createClient = (config) => {
    const base = {
        region: config.region,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: config.forcePathStyle,
    };

    if (config.endpoint) {
        base.endpoint = config.endpoint;
    }

    return new S3Client(base);
};

export const createS3Provider = () => {
    const config = buildS3Config();

    const isConfigured = Boolean(config.bucket && config.region && config.accessKeyId && config.secretAccessKey);
    const client = isConfigured ? createClient(config) : null;

    return {
        provider: 's3',
        isConfigured,
        async putObject(key, body, options = {}) {
            ensureConfig(config);

            const metadata = {};
            Object.entries(options.metadata || {}).forEach(([metaKey, metaValue]) => {
                if (metaValue !== undefined && metaValue !== null && metaValue !== '') {
                    metadata[metaKey] = String(metaValue);
                }
            });

            const command = new PutObjectCommand({
                Bucket: config.bucket,
                Key: key,
                Body: body,
                ContentType: options.contentType,
                Metadata: metadata,
                ACL: options.acl,
            });

            const result = await client.send(command);

            return {
                key,
                etag: result?.ETag || '',
                url: '',
                requestId: result?.$metadata?.requestId || '',
            };
        },
        async getSignedUrl(key, options = {}) {
            ensureConfig(config);
            const expiresIn = Number.isFinite(options.expiresIn) ? options.expiresIn : 3600;
            const command = new GetObjectCommand({
                Bucket: config.bucket,
                Key: key,
            });
            return getSignedUrl(client, command, { expiresIn });
        },
        async headObject(key) {
            ensureConfig(config);

            const result = await client.send(new HeadObjectCommand({
                Bucket: config.bucket,
                Key: key,
            }));

            const contentLength = Number.parseInt(result?.ContentLength, 10);
            return {
                contentLength: Number.isFinite(contentLength) ? contentLength : 0,
            };
        },
        async getObject(key) {
            ensureConfig(config);

            const result = await client.send(new GetObjectCommand({
                Bucket: config.bucket,
                Key: key,
            }));

            return {
                body: result?.Body || null,
                contentType: result?.ContentType || 'application/octet-stream',
                contentLength: Number.isFinite(Number.parseInt(result?.ContentLength, 10))
                    ? Number.parseInt(result.ContentLength, 10)
                    : undefined,
                cacheControl: result?.CacheControl || undefined,
                etag: result?.ETag || undefined,
            };
        },
        async deleteObject(key) {
            ensureConfig(config);

            const result = await client.send(new DeleteObjectCommand({
                Bucket: config.bucket,
                Key: key,
            }));

            return {
                key,
                requestId: result?.$metadata?.requestId || '',
            };
        },
        async listObjects(prefix) {
            ensureConfig(config);

            let continuationToken;
            const keys = [];

            do {
                const result = await client.send(new ListObjectsV2Command({
                    Bucket: config.bucket,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                }));

                (result?.Contents || []).forEach((item) => {
                    if (item?.Key) keys.push(item.Key);
                });

                continuationToken = result?.IsTruncated
                    ? result?.NextContinuationToken
                    : undefined;
            } while (continuationToken);

            return keys;
        },
    };
};
