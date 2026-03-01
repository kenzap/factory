import OSS from 'ali-oss';

const toDefined = (value) => (value === undefined || value === null || value === '' ? undefined : value);

const buildOssConfig = () => {
    const endpoint = toDefined(process.env.OSS_ENDPOINT || process.env.BUCKET_ENDPOINT);

    return {
        region: toDefined(process.env.OSS_REGION || process.env.BUCKET_REGION),
        accessKeyId: toDefined(process.env.OSS_ACCESS_KEY_ID || process.env.BUCKET_KEY),
        accessKeySecret: toDefined(process.env.OSS_ACCESS_KEY_SECRET || process.env.BUCKET_SECRET),
        bucket: toDefined(process.env.OSS_BUCKET || process.env.BUCKET_NAME),
        endpoint,
        secure: endpoint ? endpoint.startsWith('https://') : true,
    };
};

const ensureConfig = (config) => {
    if (!config.region || !config.accessKeyId || !config.accessKeySecret || !config.bucket) {
        throw new Error('OSS storage is not configured. Set OSS_* or BUCKET_* variables.');
    }
};

export const createOssProvider = () => {
    const config = buildOssConfig();

    const isConfigured = Boolean(config.region && config.accessKeyId && config.accessKeySecret && config.bucket);

    const client = isConfigured ? new OSS(config) : null;

    return {
        provider: 'oss',
        isConfigured,
        async putObject(key, body, options = {}) {
            ensureConfig(config);

            const metadata = options.metadata || {};
            const headers = { ...(options.headers || {}) };

            if (options.contentType) {
                headers['Content-Type'] = options.contentType;
            }

            Object.entries(metadata).forEach(([metaKey, metaValue]) => {
                if (metaValue !== undefined && metaValue !== null && metaValue !== '') {
                    headers[`x-oss-meta-${metaKey}`] = String(metaValue);
                }
            });

            const putOptions = {
                headers,
            };

            if (options.acl) {
                putOptions['x-oss-object-acl'] = options.acl;
            }

            const result = await client.put(key, body, putOptions);

            return {
                key,
                etag: result?.res?.headers?.etag || '',
                url: result?.url || '',
                requestId: result?.res?.headers?.['x-oss-request-id'] || '',
            };
        },
        async getSignedUrl(key, options = {}) {
            ensureConfig(config);
            const expiresIn = Number.isFinite(options.expiresIn) ? options.expiresIn : 3600;
            return client.signatureUrl(key, { expires: expiresIn });
        },
        async headObject(key) {
            ensureConfig(config);
            const result = await client.head(key);
            const contentLength = Number.parseInt(result?.res?.headers?.['content-length'], 10);
            return {
                contentLength: Number.isFinite(contentLength) ? contentLength : 0,
            };
        },
        async getObject(key) {
            ensureConfig(config);
            const result = await client.getStream(key);
            const contentLength = Number.parseInt(result?.res?.headers?.['content-length'], 10);

            return {
                body: result?.stream || null,
                contentType: result?.res?.headers?.['content-type'] || 'application/octet-stream',
                contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
                cacheControl: result?.res?.headers?.['cache-control'] || undefined,
                etag: result?.res?.headers?.etag || undefined,
            };
        },
        async deleteObject(key) {
            ensureConfig(config);
            const result = await client.delete(key);
            return {
                key,
                requestId: result?.res?.headers?.['x-oss-request-id'] || '',
            };
        },
        async listObjects(prefix) {
            ensureConfig(config);

            const keys = [];
            let marker = '';

            do {
                const result = await client.list({
                    prefix,
                    marker,
                    'max-keys': 1000,
                });

                const objects = result?.objects || [];
                objects.forEach((item) => {
                    if (item?.name) keys.push(item.name);
                });

                marker = result?.nextMarker || '';
            } while (marker);

            return keys;
        },
    };
};
