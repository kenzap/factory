import { createOssProvider } from './providers/oss.js';
import { createS3Provider } from './providers/s3.js';

export const createStorageProvider = () => {
    const provider = (process.env.STORAGE_PROVIDER || 's3').toLowerCase();

    if (provider === 'oss') {
        return createOssProvider();
    }

    return createS3Provider();
};
