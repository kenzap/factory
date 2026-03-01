import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

function parseArgs(argv) {
    const args = {
        outDir: 'docs/generated/dumps/minio',
        endpoint: '',
        includePrivate: true
    };

    for (const arg of argv) {
        if (arg.startsWith('--out=')) args.outDir = arg.slice('--out='.length);
        if (arg.startsWith('--endpoint=')) args.endpoint = arg.slice('--endpoint='.length);
        if (arg === '--no-private') args.includePrivate = false;
    }

    return args;
}

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

function runDocker(args, cwd) {
    const result = spawnSync('docker', args, {
        cwd,
        stdio: 'inherit'
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`docker exited with status ${result.status}`);
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2));

    const accessKey = requiredEnv('S3_ACCESS_KEY');
    const secretKey = requiredEnv('S3_SECRET_KEY');
    const bucket = requiredEnv('S3_BUCKET');
    const privateBucket = process.env.S3_BUCKET_PRIVATE || '';
    const minioPort = process.env.MINIO_PORT || '9000';
    const endpoint = args.endpoint || process.env.S3_EXPORT_ENDPOINT || `http://host.docker.internal:${minioPort}`;

    const projectRoot = process.cwd();
    const outDirAbs = path.resolve(projectRoot, args.outDir);
    const bucketOut = path.join(outDirAbs, bucket);
    const privateOut = privateBucket ? path.join(outDirAbs, privateBucket) : '';

    fs.mkdirSync(bucketOut, { recursive: true });
    if (args.includePrivate && privateOut) fs.mkdirSync(privateOut, { recursive: true });

    const containerScriptParts = [
        `mc alias set local "${endpoint}" "${accessKey}" "${secretKey}"`,
        `mc mirror --overwrite local/"${bucket}" /backup/"${bucket}"`
    ];

    if (args.includePrivate && privateBucket) {
        containerScriptParts.push(`mc mirror --overwrite local/"${privateBucket}" /backup/"${privateBucket}"`);
    }

    const containerScript = containerScriptParts.join(' && ');

    runDocker([
        'run',
        '--rm',
        '--entrypoint',
        '/bin/sh',
        '--add-host',
        'host.docker.internal:host-gateway',
        '-v',
        `${outDirAbs}:/backup`,
        'minio/mc',
        '-c',
        containerScript
    ], projectRoot);

    console.log(`[export-buckets] Export complete: ${outDirAbs}`);
}

main();
