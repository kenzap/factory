import pkg from 'pg';

const { Pool } = pkg;

export const sid = process.env.SID || 1000000; // Default space ID
export const locale = process.env.LOCALE || "en"; // Default locale
const DEFAULT_POOL_MAX = Math.max(1, Number.parseInt(process.env.POSTGRES_POOL_MAX || '10', 10) || 10);
const DEFAULT_IDLE_TIMEOUT_MS = Math.max(1000, Number.parseInt(process.env.POSTGRES_POOL_IDLE_TIMEOUT_MS || '30000', 10) || 30000);
const DEFAULT_CONNECTION_TIMEOUT_MS = Math.max(1000, Number.parseInt(process.env.POSTGRES_POOL_CONNECTION_TIMEOUT_MS || '5000', 10) || 5000);
const DEFAULT_POOL_ALERT_THRESHOLD_PERCENT = Math.min(
    100,
    Math.max(1, Number.parseInt(process.env.POSTGRES_POOL_ALERT_THRESHOLD_PERCENT || '85', 10) || 85)
);
const DEFAULT_POOL_ALERT_COOLDOWN_MS = Math.max(
    60 * 1000,
    Number.parseInt(process.env.POSTGRES_POOL_ALERT_COOLDOWN_MS || '900000', 10) || 900000
);
const DEFAULT_POOL_ALERT_ENABLED = !['0', 'false', 'off'].includes(
    String(process.env.POSTGRES_POOL_ALERTS_ENABLED || 'true').trim().toLowerCase()
);

let sharedDbPool = null;
let dbPoolAlertPromise = null;
let dbPoolAlertLastSentAt = 0;

class PooledDbConnection {
    constructor(pool) {
        this.pool = pool;
        this.client = null;
    }

    async connect() {
        if (!this.client) {
            this.client = await this.pool.connect();
        }

        return this;
    }

    async query(text, params) {
        if (this.client) {
            return this.client.query(text, params);
        }

        return this.pool.query(text, params);
    }

    async end() {
        if (!this.client) return;

        this.client.release();
        this.client = null;
    }

    async close() {
        await this.end();
    }
}

export function __html(locales, key, ...p) {
    // This function should return the HTML for the given key
    // For now, it just returns the key itself
    locales = locales || {};

    let match = (input, pa) => {
        pa.forEach((param, i) => {
            input = input.replace('%' + (i + 1) + '$', param);
        });
        return input;
    }

    if (locales.values && locales.values[key]) {
        return match(locales.values[key], p);
    }

    return match(key, p);
}

export function attr(key) {
    // This function should return the HTML for the given key
    // For now, it just returns the key itself
    return key;
}

// logging
export function log(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

// error logging with reporting
export function log_error(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

function getDbPoolMetrics(pool) {
    const max = Math.max(1, Number(pool?.options?.max) || DEFAULT_POOL_MAX);
    const total = Math.max(0, Number(pool?.totalCount) || 0);
    const idle = Math.max(0, Number(pool?.idleCount) || 0);
    const waiting = Math.max(0, Number(pool?.waitingCount) || 0);
    const active = Math.max(0, total - idle);
    const utilizationRatio = max > 0 ? active / max : 0;

    return {
        max,
        total,
        idle,
        waiting,
        active,
        utilizationRatio,
        utilizationPercent: Math.round(utilizationRatio * 100)
    };
}

function buildDbPoolAlertHtml(metrics) {
    const time = new Date().toISOString();
    const nodeId = process.env.HOSTNAME || `pid-${process.pid}`;

    return `
        <div style="font-family:Arial,sans-serif;line-height:1.4;color:#222;">
            <div style="background:#7c2d12;color:#fff;padding:12px 14px;border-radius:8px 8px 0 0;">
                <strong>Database Pool Warning</strong>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:0;padding:14px;border-radius:0 0 8px 8px;background:#fff;">
                <p style="margin:0 0 12px;">
                    PostgreSQL pool usage reached <strong>${metrics.utilizationPercent}%</strong> of configured capacity on node
                    <strong>${nodeId}</strong>.
                </p>
                <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:4px 0;color:#6b7280;width:160px;">Time</td><td style="padding:4px 0;">${time}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Tenant SID</td><td style="padding:4px 0;">${sid}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Pool max</td><td style="padding:4px 0;">${metrics.max}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Active clients</td><td style="padding:4px 0;">${metrics.active}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Idle clients</td><td style="padding:4px 0;">${metrics.idle}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Total clients</td><td style="padding:4px 0;">${metrics.total}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Waiting requests</td><td style="padding:4px 0;">${metrics.waiting}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Alert threshold</td><td style="padding:4px 0;">${DEFAULT_POOL_ALERT_THRESHOLD_PERCENT}%</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Environment</td><td style="padding:4px 0;">${process.env.NODE_ENV || 'development'}</td></tr>
                </table>
            </div>
        </div>
    `;
}

async function sendDbPoolCapacityAlert(metrics) {
    const [{ send_email }, { getCachedSettings }] = await Promise.all([
        import('./email.js'),
        import('./settings.js')
    ]);
    const settings = getCachedSettings?.() || {};
    const mailTo = process.env.POSTGRES_POOL_ALERT_EMAIL_TO || settings?.logger_email_to || process.env.ADMIN_EMAIL;

    if (!mailTo) {
        console.warn('[db-pool] Pool alert skipped because no recipient email is configured.');
        return;
    }

    const mailFrom = process.env.POSTGRES_POOL_ALERT_EMAIL_FROM || settings?.logger_email_from || process.env.SMTP_USER || '';
    const replyTo = process.env.POSTGRES_POOL_ALERT_EMAIL_REPLY_TO || settings?.logger_email_reply_to || '';
    const subject = process.env.POSTGRES_POOL_ALERT_SUBJECT
        || `Database pool warning: ${metrics.utilizationPercent}% in use`;

    await send_email(
        mailTo,
        mailFrom,
        'DB Pool Alert',
        subject,
        buildDbPoolAlertHtml(metrics),
        [],
        { replyTo }
    );
}

function scheduleDbPoolCapacityAlert(pool) {
    if (!DEFAULT_POOL_ALERT_ENABLED) return;

    const metrics = getDbPoolMetrics(pool);
    if (metrics.utilizationPercent < DEFAULT_POOL_ALERT_THRESHOLD_PERCENT) return;

    const now = Date.now();
    if (dbPoolAlertPromise) return;
    if (dbPoolAlertLastSentAt && (now - dbPoolAlertLastSentAt) < DEFAULT_POOL_ALERT_COOLDOWN_MS) return;

    dbPoolAlertLastSentAt = now;
    console.warn(
        `[db-pool] Usage reached ${metrics.utilizationPercent}% (${metrics.active}/${metrics.max}, waiting=${metrics.waiting}). Sending warning email.`
    );

    dbPoolAlertPromise = sendDbPoolCapacityAlert(metrics)
        .catch((error) => {
            console.error('[db-pool] Failed to send pool capacity warning email:', error);
        })
        .finally(() => {
            dbPoolAlertPromise = null;
        });
}

// Database connection helper
export function getDbPool() {
    if (!sharedDbPool) {
        sharedDbPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: DEFAULT_POOL_MAX,
            idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT_MS,
            connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS
        });

        sharedDbPool.on('error', (error) => {
            console.error('[db-pool] Unexpected idle client error:', error);
        });

        sharedDbPool.on('acquire', () => {
            scheduleDbPoolCapacityAlert(sharedDbPool);
        });
    }

    return sharedDbPool;
}

export function getDbConnection() {
    return new PooledDbConnection(getDbPool());
}

export async function closeDbPool() {
    if (!sharedDbPool) return;

    const pool = sharedDbPool;
    sharedDbPool = null;
    await pool.end();
}

export const makeId = () => {

    let length_ = 40; // Default length

    let chars = 'abcdefghiklmnopqrstuvwxyz1234567890'.split('');
    if (typeof length_ !== "number") {
        length_ = Math.floor(Math.random() * chars.length_);
    }
    let str = '';
    for (let i = 0; i < length_; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

export const getLocales = async () => {

    const client = getDbConnection();
    await client.connect();

    let locales = {};

    try {

        // Get locales
        const query = `
            SELECT 
                js->'data'->'locale' as locale,
                js->'data'->'language' as language
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'ext' = 'ecommerce'
            LIMIT 50
        `;

        const result = await client.query(query, ['locale', sid]);
        if (result.rows.length > 0) {

            locales = result.rows;
        }

    } finally {
        await client.end();
    }

    return locales;
}

export const getSettings = async (fields) => {

    const client = getDbConnection();
    await client.connect();

    let settings = {};

    try {

        // Get settings by specified fields
        let query;
        if (fields && fields.length > 0) {
            const fieldSelections = fields.map(field => `js->'data'->'${field}' as ${field}`).join(', ');
            query = `
            SELECT ${fieldSelections}
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
            `;
            // Default fields if none specified
        } else {
            query = `
            SELECT js->'data'->'currency' as currency, 
                   js->'data'->'currency_symb' as currency_symb, 
                   js->'data'->'currency_symb_loc' as currency_symb_loc, 
                   js->'data'->'tax_calc' as tax_calc, 
                   js->'data'->'tax_auto_rate' as tax_auto_rate, 
                   js->'data'->'tax_rate' as tax_rate, 
                   js->'data'->'tax_percent' as tax_percent, 
                   js->'data'->'tax_display' as tax_display,
                   js->'data'->'price' as price,
                   js->'data'->'var_parent' as var_parent,
                   js->'data'->'textures' as textures
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
            `;
        }

        const result = await client.query(query, ['settings', sid]);
        if (result.rows.length > 0) {
            const row = result.rows[0];

            if (fields && fields.length > 0) {

                // Only include the requested fields
                fields.forEach(field => {
                    settings[field] = row[field];
                });

            } else {

                // Default fields when none specified
                settings = {
                    currency: row.currency,
                    currency_symb: row.currency_symb,
                    currency_symb_loc: row.currency_symb_loc,
                    tax_calc: row.tax_calc,
                    tax_auto_rate: row.tax_auto_rate,
                    tax_rate: row.tax_rate,
                    tax_percent: row.tax_percent,
                    tax_display: row.tax_display,
                    price: row.price,
                    var_parent: row.var_parent,
                    textures: row.textures || []
                };
            }

            // Always include logo regardless of fields parameter
            settings.logo = process.env.LOGO || 'https://cdn.kenzap.com/logo.svg';
        }

    } finally {
        await client.end();
    }

    return settings;
}

// Helper function to evaluate math expressions safely
export function evalmath(equation) {
    if (equation.includes(':')) {
        equation = equation.split(':')[1];
    }

    if (!equation) equation = '1';

    try {
        // Basic math evaluation - replace with a proper math parser for production
        return Function('"use strict"; return (' + equation + ')')();
    } catch (e) {
        return 1;
    }
}

export function makeNumber(price) {
    price = price || 0;
    price = parseFloat(price);
    return Math.round(price * 100) / 100;
}

export function getMinPrice(state, item, html = false) {
    const obj = { COATING: 1 };

    switch (item.calc_price) {
        case 'complex':
            obj.price = 0;
            obj.total = 0;
            obj.type = 'complex';
            return html ? '<div class="badge rounded-pill bg-danger fw-bold mt-3" style="font-size: 1rem;">Calculate</div>' : 0.00;

        case 'variable':
            if (!item.var_price || !item.var_price[0]) {
                item.var_price = [{ price: 0 }];
            }

            let min_price = parseFloat(item.var_price[0].price);
            item.var_price.forEach(price => {
                if (parseFloat(price.price) < min_price) {
                    min_price = parseFloat(price.price);
                }
            });

            obj.price = makeNumber(min_price);
            obj.total = obj.price;
            obj.type = 'variable';

            return html ?
                `<div class="badge rounded-pill bg-danger fw-bold mt-3" style="font-size: 1.1rem;"><span style="font-size:0.8rem">no</span> ${priceFormat(state, obj.total)}</div>` :
                obj.total;

        case 'formula':
        default:
            obj.formula = item.formula;
            obj.formula_price = item.formula_price;

            state.sk_settings.price.forEach(price => {
                if (price.id === "ZN") {
                    obj.COATING = parseFloat(price.price);
                }

                if (price.id && price.id.length > 0) {
                    obj.formula = obj.formula.replace(new RegExp(price.id, 'g'), parseFloat(price.price));
                    obj.formula_price = obj.formula_price.replace(new RegExp(price.id, 'g'), parseFloat(price.price));
                }
            });

            obj.formula = obj.formula.replace(/COATING/g, obj.COATING);
            obj.formula_price = obj.formula_price.replace(/COATING/g, obj.COATING);
            obj.formula = obj.formula.replace(/MATERIAL/g, obj.COATING);
            obj.formula_price = obj.formula_price.replace(/MATERIAL/g, obj.COATING);
            obj.formula_price = obj.formula_price.replace(/M2/g, item.formula + "/1000000");

            item.input_fields.forEach(field => {
                obj.formula = obj.formula.replace(new RegExp(field.label, 'g'), field.default);
                obj.formula_price = obj.formula_price.replace(new RegExp(field.label, 'g'), field.default);
            });

            obj.price = makeNumber((evalmath(obj.formula) / 1000000 * obj.COATING)) + makeNumber(evalmath(obj.formula_price));
            obj.total = obj.price * 1;
            obj.type = 'formula';

            return html ?
                `<div class="badge rounded-pill bg-danger fw-bold mt-3" style="font-size: 1.1rem;"><span style="font-size:0.8rem">no</span> ${priceFormat(state, obj.total)}</div>` :
                obj.total;
    }
}
