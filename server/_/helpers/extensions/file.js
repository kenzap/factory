
import fs from 'fs';

const CACHE_TTL = process.env.NODE_ENV === 'production' ? Infinity : 5000; // 5s in dev, permanent in prod

/**
 * Checks if a file exists at the given path with caching support.
 * Uses an in-memory cache to avoid repeated file system calls within the cache TTL period.
 * 
 * @param {string} filePath - The path to the file to check for existence
 * @param {Map} fileCache - Cache object to store file existence results with timestamps
 * @returns {boolean} True if the file exists, false otherwise
 * 
 */
export const checkFileExists = (filePath, fileCache) => {
    const now = Date.now();
    const cached = fileCache.get(filePath);

    if (cached && (CACHE_TTL === Infinity || now - cached.time < CACHE_TTL)) {
        return cached.exists;
    }

    const exists = fs.existsSync(filePath);
    fileCache.set(filePath, { exists, time: now });
    return exists;
}

export default checkFileExists;
