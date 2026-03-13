import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getDbConnection, sid } from '../_/helpers/index.js';

dotenv.config();

const ROOT_DIR = path.resolve(process.cwd());
const TEXTS_FILE = path.join(ROOT_DIR, 'server', 'assets', 'texts.json');

function getArg(name, fallback = '') {
    const prefix = `--${name}=`;
    const found = process.argv.find(arg => arg.startsWith(prefix));
    if (!found) return fallback;
    return found.slice(prefix.length);
}

async function getLocaleContent(locale, ext) {
    const db = getDbConnection();
    try {
        await db.connect();

        const query = `
        SELECT
            _id,
            js->'data'->'content' AS content
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'locale' = $3 AND js->'data'->>'ext' = $4
        LIMIT 1
        `;

        const result = await db.query(query, ['locale', sid, locale, ext]);
        if (!result.rows.length) {
            return { exists: false, id: '', content: {} };
        }

        return {
            exists: true,
            id: result.rows[0]._id,
            content: result.rows[0].content || {}
        };
    } finally {
        await db.end();
    }
}

function loadSourceKeys() {
    if (!fs.existsSync(TEXTS_FILE)) {
        throw new Error(`Locale source file not found: ${TEXTS_FILE}. Run "npm run locales:export" first.`);
    }

    const raw = fs.readFileSync(TEXTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error(`Expected array in ${TEXTS_FILE}`);
    }

    return parsed.map(v => String(v).trim()).filter(Boolean);
}

async function run() {
    const locale = getArg('locale', 'lv');
    const ext = getArg('ext', 'dashboard');
    const reportFile = getArg('report', '');

    const sourceKeys = loadSourceKeys();
    const localeData = await getLocaleContent(locale, ext);
    const content = localeData.content || {};

    const missing = [];
    const empty = [];
    const untranslated = [];
    const translated = [];

    for (const key of sourceKeys) {
        if (!Object.prototype.hasOwnProperty.call(content, key)) {
            missing.push(key);
            continue;
        }

        const value = String(content[key] ?? '').trim();
        if (!value) {
            empty.push(key);
            continue;
        }

        if (value === key) {
            untranslated.push(key);
            continue;
        }

        translated.push(key);
    }

    const summary = {
        locale,
        ext,
        sid,
        locale_record_exists: localeData.exists,
        locale_record_id: localeData.id || null,
        source_key_count: sourceKeys.length,
        translated_count: translated.length,
        missing_count: missing.length,
        empty_count: empty.length,
        untranslated_count: untranslated.length,
        actionable_missing_count: missing.length + empty.length + untranslated.length
    };

    const report = {
        summary,
        missing,
        empty,
        untranslated
    };

    console.log('Locale sync dry run');
    console.log(JSON.stringify(summary, null, 2));

    if (reportFile) {
        const target = path.isAbsolute(reportFile)
            ? reportFile
            : path.join(ROOT_DIR, reportFile);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`Report written to ${target}`);
    } else if (summary.actionable_missing_count > 0) {
        const preview = [...missing, ...empty, ...untranslated].slice(0, 250);
        console.log(`Preview (first ${preview.length} keys needing attention):`);
        preview.forEach(key => console.log(`- ${key}`));
    }
}

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
