import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

function parseArgs(argv) {
    const args = {
        outDir: 'docs/generated/dumps/s3',
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
    const s3Port = process.env.S3_PORT || '9000';
    const endpoint = args.endpoint || process.env.S3_EXPORT_ENDPOINT || `http://host.docker.internal:${s3Port}`;

    const projectRoot = process.cwd();
    const outDirAbs = path.resolve(projectRoot, args.outDir);
    const bucketOut = path.join(outDirAbs, bucket);
    const privateOut = privateBucket ? path.join(outDirAbs, privateBucket) : '';

    fs.mkdirSync(bucketOut, { recursive: true });
    if (args.includePrivate && privateOut) fs.mkdirSync(privateOut, { recursive: true });

    runDocker([
        'run',
        '--rm',
        '--add-host',
        'host.docker.internal:host-gateway',
        '-e',
        `AWS_ACCESS_KEY_ID=${accessKey}`,
        '-e',
        `AWS_SECRET_ACCESS_KEY=${secretKey}`,
        '-e',
        `AWS_DEFAULT_REGION=${process.env.S3_REGION || 'us-east-1'}`,
        '-v',
        `${outDirAbs}:/backup`,
        'public.ecr.aws/aws-cli/aws-cli:latest',
        's3',
        'sync',
        `s3://${bucket}`,
        `/backup/${bucket}`,
        '--endpoint-url',
        endpoint,
        '--no-progress'
    ], projectRoot);

    if (args.includePrivate && privateBucket) {
        runDocker([
            'run',
            '--rm',
            '--add-host',
            'host.docker.internal:host-gateway',
            '-e',
            `AWS_ACCESS_KEY_ID=${accessKey}`,
            '-e',
            `AWS_SECRET_ACCESS_KEY=${secretKey}`,
            '-e',
            `AWS_DEFAULT_REGION=${process.env.S3_REGION || 'us-east-1'}`,
            '-v',
            `${outDirAbs}:/backup`,
            'public.ecr.aws/aws-cli/aws-cli:latest',
            's3',
            'sync',
            `s3://${privateBucket}`,
            `/backup/${privateBucket}`,
            '--endpoint-url',
            endpoint,
            '--no-progress'
        ], projectRoot);
    }

    console.log(`[export-buckets] Export complete: ${outDirAbs}`);
}

main();
