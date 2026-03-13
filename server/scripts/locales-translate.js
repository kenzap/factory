import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

dotenv.config();

const ROOT_DIR = path.resolve(process.cwd());
const TEXTS_FILE = path.join(ROOT_DIR, 'server', 'assets', 'texts.json');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const LANGUAGE_NAMES = {
    lv: 'Latvian',
    lt: 'Lithuanian',
    et: 'Estonian',
    ru: 'Russian',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pl: 'Polish',
    en: 'English'
};

function getArg(name, fallback = '') {
    const prefix = `--${name}=`;
    const found = process.argv.find(arg => arg.startsWith(prefix));
    if (!found) return fallback;
    return found.slice(prefix.length);
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

function makeChunks(items, chunkSize = 110) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

function cleanModelJson(rawText) {
    let cleaned = String(rawText || '').trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
}

async function translateWithClaude(text, targetLang) {

    console.log(`Sending translation request to Claude for ${LANGUAGE_NAMES[targetLang] || targetLang}...`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10000,
            messages: [
                {
                    role: 'user',
                    content: `You are a professional translator specializing in technical and business content for manufacturing ERP software.

Translate the following JSON content from English to ${LANGUAGE_NAMES[targetLang] || targetLang}.

IMPORTANT RULES:
1. Maintain the exact same JSON structure
2. Translate all text values, keeping keys unchanged
3. Use professional, industry-appropriate terminology for metal fabrication/manufacturing
4. Keep formatting consistent (capitalization, punctuation)
5. Preserve placeholders exactly as they are (example: %1$, {{name}}, :value)
6. Be culturally appropriate for European business context
7. Maintain formality level appropriate for B2B software
8. Return ONLY valid JSON, no explanations or markdown
9. Use natural local phrasing rather than literal translation
10. Do not modify or translate JSON keys

JSON to translate:
${text}`,
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Translation API error: ${error}`);
    }

    const data = await response.json();
    const translatedText = data?.content?.[0]?.text;
    const cleaned = cleanModelJson(translatedText);

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        throw new Error(`Failed to parse Claude response as JSON: ${error.message}`);
    }
}

async function getLocaleRecord(locale, ext) {
    const db = getDbConnection();
    try {
        await db.connect();

        const query = `
        SELECT
            _id,
            js->'data' AS data,
            js->'data'->'content' AS content
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'locale' = $3 AND js->'data'->>'ext' = $4
        LIMIT 1
        `;

        const result = await db.query(query, ['locale', sid, locale, ext]);
        if (!result.rows.length) {
            return { exists: false, id: '', data: {}, content: {} };
        }

        return {
            exists: true,
            id: result.rows[0]._id,
            data: result.rows[0].data || {},
            content: result.rows[0].content || {}
        };
    } finally {
        await db.end();
    }
}

async function createLocaleRecord(locale, ext) {
    const db = getDbConnection();
    const timestamp = Math.floor(Date.now() / 1000);
    const id = makeId();

    const payload = {
        locale,
        language: LANGUAGE_NAMES[locale] || locale,
        ext,
        content: {},
        created: timestamp,
        updated: timestamp
    };

    try {
        await db.connect();

        const query = `
        INSERT INTO data (_id, pid, ref, sid, js)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING _id
        `;

        await db.query(query, [id, 0, 'locale', sid, JSON.stringify({ data: payload, meta: { created: timestamp, updated: timestamp } })]);
    } finally {
        await db.end();
    }

    return id;
}

async function updateLocaleContent(recordId, nextContent) {
    const db = getDbConnection();
    const timestamp = Math.floor(Date.now() / 1000);

    try {
        await db.connect();

        const query = `
        UPDATE data
        SET js = jsonb_set(
                    jsonb_set(js, '{data,content}', $1::jsonb, true),
                    '{data,updated}', to_jsonb($2::int), true
                )
        WHERE ref = $3 AND sid = $4 AND _id = $5
        RETURNING _id
        `;

        await db.query(query, [JSON.stringify(nextContent), timestamp, 'locale', sid, recordId]);
    } finally {
        await db.end();
    }
}

function getMissingKeys(sourceKeys, content) {
    return sourceKeys.filter((key) => {
        if (!Object.prototype.hasOwnProperty.call(content, key)) return true;
        const value = String(content[key] ?? '').trim();
        return !value;
    });
}

async function run() {
    if (!ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is missing in environment variables.');
    }

    const locale = getArg('locale', 'lv');
    const ext = getArg('ext', 'dashboard');
    const chunkSize = parseInt(getArg('chunk', '110'), 10) || 110;

    const sourceKeys = loadSourceKeys();
    let localeRecord = await getLocaleRecord(locale, ext);

    if (!localeRecord.exists) {
        console.log(`Locale record ${locale}/${ext} not found. Creating...`);
        const recordId = await createLocaleRecord(locale, ext);
        localeRecord = {
            exists: true,
            id: recordId,
            data: {},
            content: {}
        };
    }

    const currentContent = localeRecord.content || {};
    const missingKeys = getMissingKeys(sourceKeys, currentContent);

    console.log(`Source keys: ${sourceKeys.length}`);
    console.log(`Existing translated keys: ${sourceKeys.length - missingKeys.length}`);
    console.log(`Missing/empty keys to translate: ${missingKeys.length}`);

    if (!missingKeys.length) {
        console.log('No missing translations. Nothing to update.');
        return;
    }

    const nextContent = { ...currentContent };
    const chunks = makeChunks(missingKeys, chunkSize);
    let insertedCount = 0;

    for (let i = 0; i < chunks.length; i += 1) {
        const keys = chunks[i];
        const payloadObj = Object.fromEntries(keys.map(key => [key, key]));

        console.log(`Translating batch ${i + 1}/${chunks.length} (${keys.length} keys)...`);
        const translated = await translateWithClaude(JSON.stringify(payloadObj, null, 2), locale);

        if (!translated || typeof translated !== 'object' || Array.isArray(translated)) {
            throw new Error(`Unexpected translation payload for batch ${i + 1}`);
        }

        for (const key of keys) {
            const existingValue = String(nextContent[key] ?? '').trim();
            if (existingValue) continue; // Never overwrite existing translations.

            const candidate = translated[key];
            if (typeof candidate !== 'string' || !candidate.trim()) {
                throw new Error(`Translated value missing/invalid for key "${key}" in batch ${i + 1}`);
            }

            nextContent[key] = candidate;
            insertedCount += 1;
        }
    }

    await updateLocaleContent(localeRecord.id, nextContent);

    console.log(`Done. Added ${insertedCount} missing translations to locale=${locale}, ext=${ext}.`);
}

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
