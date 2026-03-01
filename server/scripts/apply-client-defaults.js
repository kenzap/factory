import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { normalizeTimezoneOrUtc } from '../_/helpers/timezone.js';

dotenv.config();

const { Client } = pg;

const ALLOWED_SETTINGS_KEYS = new Set([
    'default_timezone',
    'system_language',
    'system_of_units',
    'currency',
    'currency_symb',
    'currency_symb_loc',
    'tax_region',
    'vat_number',
    'tax_percent_auto',
    'tax_percent',
    'tax_display'
]);

function parseArgs(argv) {
    const args = {
        config: '',
        dryRun: false,
        sidOverride: null
    };

    for (const arg of argv) {
        if (arg.startsWith('--config=')) args.config = arg.split('=')[1];
        if (arg === '--dry-run') args.dryRun = true;
        if (arg.startsWith('--sid=')) args.sidOverride = Number(arg.split('=')[1]);
    }

    if (!args.config) {
        throw new Error('Missing --config=path/to/client.json');
    }

    return args;
}

function makeId(length = 40) {
    const chars = 'abcdefghiklmnopqrstuvwxyz1234567890';
    let out = '';
    for (let i = 0; i < length; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

function pickSupportedSettings(rawSettings) {
    const out = {};

    for (const [key, value] of Object.entries(rawSettings || {})) {
        if (!ALLOWED_SETTINGS_KEYS.has(key)) continue;
        out[key] = value;
    }

    if (Object.prototype.hasOwnProperty.call(out, 'default_timezone')) {
        out.default_timezone = normalizeTimezoneOrUtc(out.default_timezone);
    }

    return out;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }

    const rawConfig = JSON.parse(fs.readFileSync(args.config, 'utf8'));

    const sid = Number(args.sidOverride ?? rawConfig.sid);
    if (!Number.isFinite(sid) || sid <= 0) {
        throw new Error('Invalid sid. Provide positive numeric sid in config or --sid');
    }

    const settingsPatch = pickSupportedSettings(rawConfig.settings);
    if (!Object.keys(settingsPatch).length) {
        throw new Error('No supported settings keys provided in config.settings');
    }

    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    try {
        await db.query('BEGIN');

        const existing = await db.query(
            `SELECT _id, js FROM data WHERE ref = 'settings' AND sid = $1 LIMIT 1`,
            [sid]
        );

        if (existing.rows.length === 0) {
            const now = Math.floor(Date.now() / 1000);
            const rowId = makeId();
            const js = {
                data: {
                    ...settingsPatch
                },
                meta: {
                    created: now,
                    updated: now
                }
            };

            await db.query(
                `INSERT INTO data (_id, pid, sid, ref, js) VALUES ($1, $2, $3, 'settings', $4::jsonb)`,
                [rowId, null, sid, JSON.stringify(js)]
            );

            console.log(`[apply-client-defaults] inserted settings row for sid=${sid}`);
        } else {
            const row = existing.rows[0];
            const js = row.js || {};
            js.data = {
                ...(js.data || {}),
                ...settingsPatch
            };

            js.meta = {
                ...(js.meta || {}),
                updated: Math.floor(Date.now() / 1000)
            };

            await db.query(
                `UPDATE data SET js = $1::jsonb WHERE _id = $2`,
                [JSON.stringify(js), row._id]
            );

            console.log(`[apply-client-defaults] updated settings row for sid=${sid}`);
        }

        if (args.dryRun) {
            await db.query('ROLLBACK');
            console.log('[apply-client-defaults] dry run complete (rolled back)');
        } else {
            await db.query('COMMIT');
            console.log('[apply-client-defaults] committed');
        }
    } catch (err) {
        await db.query('ROLLBACK');
        throw err;
    } finally {
        await db.end();
    }
}

main().catch((err) => {
    console.error('[apply-client-defaults] failed:', err.message);
    process.exit(1);
});
