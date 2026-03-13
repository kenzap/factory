import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const SEARCH_DIRS = ['public', 'server'];
const OUTPUT_FILE = path.join(ROOT_DIR, 'server', 'assets', 'texts.json');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.idea', '.vscode']);

function listJsFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
        if (SKIP_DIRS.has(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            listJsFiles(fullPath, files);
            continue;
        }

        if (entry.isFile() && fullPath.endsWith('.js')) files.push(fullPath);
    }

    return files;
}

function readStringLiteral(raw) {
    const text = raw.trim();
    if (text.length < 2) return null;

    const quote = text[0];
    const endQuote = text[text.length - 1];
    if ((quote !== '\'' && quote !== '"' && quote !== '`') || quote !== endQuote) return null;

    const inner = text.slice(1, -1);

    // Ignore template strings with interpolation, these are dynamic.
    if (quote === '`' && inner.includes('${')) return null;

    let result = '';
    for (let i = 0; i < inner.length; i += 1) {
        const ch = inner[i];
        if (ch !== '\\') {
            result += ch;
            continue;
        }

        i += 1;
        if (i >= inner.length) break;
        const next = inner[i];

        if (next === 'n') result += '\n';
        else if (next === 'r') result += '\r';
        else if (next === 't') result += '\t';
        else result += next;
    }

    return result.trim() || null;
}

function splitTopLevelArgs(argsText) {
    const args = [];
    let current = '';
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let quote = '';
    let escape = false;

    for (let i = 0; i < argsText.length; i += 1) {
        const ch = argsText[i];

        if (quote) {
            current += ch;
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === quote) quote = '';
            continue;
        }

        if (ch === '\'' || ch === '"' || ch === '`') {
            quote = ch;
            current += ch;
            continue;
        }

        if (ch === '(') depthParen += 1;
        else if (ch === ')') depthParen -= 1;
        else if (ch === '{') depthBrace += 1;
        else if (ch === '}') depthBrace -= 1;
        else if (ch === '[') depthBracket += 1;
        else if (ch === ']') depthBracket -= 1;

        if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
            args.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) args.push(current.trim());
    return args;
}

function parseCallArguments(source, openParenIndex) {
    let i = openParenIndex + 1;
    let depth = 1;
    let quote = '';
    let escape = false;
    let argsText = '';

    while (i < source.length) {
        const ch = source[i];

        if (quote) {
            argsText += ch;
            if (escape) {
                escape = false;
                i += 1;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                i += 1;
                continue;
            }
            if (ch === quote) quote = '';
            i += 1;
            continue;
        }

        if (ch === '\'' || ch === '"' || ch === '`') {
            quote = ch;
            argsText += ch;
            i += 1;
            continue;
        }

        if (ch === '(') {
            depth += 1;
            argsText += ch;
            i += 1;
            continue;
        }

        if (ch === ')') {
            depth -= 1;
            if (depth === 0) {
                return { argsText, endIndex: i };
            }
            argsText += ch;
            i += 1;
            continue;
        }

        argsText += ch;
        i += 1;
    }

    return null;
}

function extractFromSource(source, fnName) {
    const keys = new Set();
    const needle = `${fnName}(`;
    let from = 0;

    while (from < source.length) {
        const at = source.indexOf(needle, from);
        if (at === -1) break;

        const prev = source[at - 1];
        if (prev && /[A-Za-z0-9_$]/.test(prev)) {
            from = at + needle.length;
            continue;
        }

        const parsed = parseCallArguments(source, at + fnName.length);
        if (!parsed) break;

        const args = splitTopLevelArgs(parsed.argsText);
        const first = readStringLiteral(args[0] || '');
        const second = readStringLiteral(args[1] || '');

        // Supports both forms:
        // __html('Price')
        // __html(locales, 'Price')
        if (first) keys.add(first);
        else if (second) keys.add(second);

        from = parsed.endIndex + 1;
    }

    return keys;
}

function run() {
    const allFiles = SEARCH_DIRS.flatMap((dir) => listJsFiles(path.join(ROOT_DIR, dir)));
    const allKeys = new Set();

    for (const filePath of allFiles) {
        const source = fs.readFileSync(filePath, 'utf8');
        const htmlKeys = extractFromSource(source, '__html');
        const attrKeys = extractFromSource(source, '__attr');

        for (const key of htmlKeys) allKeys.add(key);
        for (const key of attrKeys) allKeys.add(key);
    }

    const output = [...allKeys].sort((a, b) => a.localeCompare(b));
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

    console.log(`Exported ${output.length} locale keys to ${OUTPUT_FILE}`);
}

run();
