import { build } from 'esbuild';

build({
    entryPoints: ['./dist/main.js'],
    bundle: true,
    minify: true,
    outfile: './build/app.js',
    format: 'iife'
}).then(() => {
    console.log('Build complete.');
}).catch(() => process.exit(1));