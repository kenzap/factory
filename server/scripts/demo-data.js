import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Client } = pkg;

const SID = Number(process.env.SID || 1000000);
const DATABASE_URL = process.env.DATABASE_URL;
const BANK_NAMES = ['Swedbank', 'SEB Banka', 'Luminor', 'Citadele', 'BlueOrange Bank'];
const INDUSTRIES = ['Metalworks', 'Roofing', 'Steel Systems', 'Fabrication', 'Industrial Solutions', 'Engineering'];
const COMPANY_SUFFIXES = ['SIA', 'Ltd', 'Group', 'Industries', 'Services'];
const FIRST_NAMES = ['Janis', 'Anna', 'Martins', 'Elina', 'Roberts', 'Laura', 'Andris', 'Ilze', 'Mikus', 'Liga'];
const LAST_NAMES = ['Berzins', 'Ozols', 'Kalnins', 'Liepins', 'Krumins', 'Vitolins', 'Eglite', 'Zarina', 'Petersons', 'Svikis'];
const STREET_NAMES = ['Rupniecibas iela', 'Brivibas iela', 'Dzirnavu iela', 'Lielirbes iela', 'Krustpils iela', 'Miera iela'];
const CITIES = ['Riga', 'Jelgava', 'Liepaja', 'Ventspils', 'Valmiera', 'Daugavpils'];

function makeId(length = 40) {
    const chars = 'abcdefghiklmnopqrstuvwxyz1234567890';
    let out = '';
    for (let i = 0; i < length; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

function parseArgs(argv) {
    const args = {
        mode: 'both',
        entities: 20,
        orders: 60,
        dryRun: false
    };

    for (const arg of argv) {
        if (arg.startsWith('--mode=')) args.mode = arg.split('=')[1];
        if (arg.startsWith('--entities=')) args.entities = Number(arg.split('=')[1]);
        if (arg.startsWith('--orders=')) args.orders = Number(arg.split('=')[1]);
        if (arg === '--dry-run') args.dryRun = true;
    }

    if (!['anonymize', 'seed', 'both'].includes(args.mode)) {
        throw new Error('Invalid --mode. Use one of: anonymize, seed, both');
    }

    if (!Number.isFinite(args.entities) || args.entities < 0) args.entities = 0;
    if (!Number.isFinite(args.orders) || args.orders < 0) args.orders = 0;

    return args;
}

function randomFrom(list, fallback = null) {
    if (!Array.isArray(list) || list.length === 0) return fallback;
    return list[Math.floor(Math.random() * list.length)];
}

function nowTs() {
    return Math.floor(Date.now() / 1000);
}

function buildPhone(idx) {
    return `+1555${String(1000000 + idx).slice(-7)}`;
}

function profileFor(idx) {
    const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
    const lastName = LAST_NAMES[idx % LAST_NAMES.length];
    const industry = INDUSTRIES[idx % INDUSTRIES.length];
    const suffix = COMPANY_SUFFIXES[idx % COMPANY_SUFFIXES.length];
    const bank = BANK_NAMES[idx % BANK_NAMES.length];
    const street = STREET_NAMES[idx % STREET_NAMES.length];
    const city = CITIES[idx % CITIES.length];
    const n = String(idx).padStart(4, '0');

    return {
        firstName,
        lastName,
        contactName: `${firstName} ${lastName}`,
        companyName: `${industry} ${suffix} ${n}`,
        legalName: `${industry} ${suffix} ${n}`,
        email: `${industry.toLowerCase().replace(/\\s+/g, '')}${n}@example.com`,
        streetAddress: `${street} ${10 + (idx % 90)}, ${city}`,
        bankName: bank
    };
}

function anonymizeEntityJs(js, idx) {
    const out = structuredClone(js || {});
    const data = out.data || {};
    const n = String(idx).padStart(4, '0');
    const profile = profileFor(idx);

    data.name = profile.companyName;
    data.legal_name = profile.legalName;
    data.email = profile.email;
    data.phone = buildPhone(idx);
    data.reg_number = String(70000000000 + idx);
    data.vat_number = `LV${70000000000 + idx}`;
    data.reg_address = profile.streetAddress;
    data.bank_name = profile.bankName;
    data.bank_acc = `LV00DEMO${String(1000000000000000 + idx).slice(-16)}`;
    data.fname = profile.firstName;
    data.lname = profile.lastName;

    if (Array.isArray(data.contacts)) {
        data.contacts = data.contacts.map((c, cIdx) => ({
            ...c,
            name: `${profile.contactName} ${cIdx + 1}`,
            email: `contact${n}${cIdx + 1}@example.com`,
            phone: buildPhone(idx * 10 + cIdx + 1),
            notes: ''
        }));
    } else {
        data.contacts = [
            {
                id: makeId(6),
                name: `${profile.contactName} 1`,
                email: `contact${n}1@example.com`,
                phone: buildPhone(idx * 10 + 1),
                notes: '',
                primary: true
            }
        ];
    }

    data.notes = '';

    out.data = data;
    out.meta = out.meta || {};
    out.meta.updated = nowTs();
    return out;
}

function anonymizeOrderJs(js, idx) {
    const out = structuredClone(js || {});
    const data = out.data || {};
    const n = String(idx).padStart(4, '0');
    const profile = profileFor(idx);

    data.name = profile.companyName;
    data.email = `orders+${n}@example.com`;
    data.phone = buildPhone(5000 + idx);
    data.address = profile.streetAddress;
    data.person = profile.contactName;
    data.operator = `Manager ${((idx - 1) % 7) + 1}`;
    data.notes = '';

    out.data = data;
    out.meta = out.meta || {};
    out.meta.updated = nowTs();
    return out;
}

function buildFallbackEntity(i) {
    const rowId = makeId(40);
    const n = String(i).padStart(4, '0');
    const ts = nowTs() - i;
    const profile = profileFor(i);

    return {
        _id: rowId,
        pid: 0,
        js: {
            data: {
                _id: rowId,
                name: profile.companyName,
                email: profile.email,
                notes: '',
                phone: buildPhone(i),
                entity: 'company',
                drivers: [],
                bank_acc: `LV00DEMO${String(1000000000000000 + i).slice(-16)}`,
                addresses: [],
                bank_name: profile.bankName,
                discounts: {},
                legal_name: profile.legalName,
                reg_number: String(70000000000 + i),
                vat_number: `LV${70000000000 + i}`,
                vat_status: '0',
                reg_address: profile.streetAddress,
                contacts: [
                    {
                        id: makeId(6),
                        name: `${profile.contactName} 1`,
                        email: `contact${n}1@example.com`,
                        notes: '',
                        phone: buildPhone(i * 10 + 1),
                        primary: true
                    }
                ]
            },
            meta: {
                created: ts,
                updated: ts
            }
        }
    };
}

function buildOrderFromTemplate(templateRow, entity, nextOrderId, i) {
    const ts = nowTs() - i;
    const rowId = makeId(40);
    const profile = profileFor(i);

    const out = structuredClone(templateRow?.js || {
        data: {
            items: [],
            price: { total: 0, tax_total: 0, grand_total: 0, tax_percent: 21 },
            draft: false,
            entity: 'company'
        },
        meta: {}
    });

    out.data = out.data || {};
    out.data._id = rowId;
    out.data.id = nextOrderId;
    out.data.eid = entity?._id || makeId(40);
    out.data.name = entity?.name || profile.companyName;
    out.data.email = entity?.email || `orders+${String(i).padStart(4, '0')}@example.com`;
    out.data.phone = entity?.phone || buildPhone(8000 + i);
    out.data.address = entity?.reg_address || profile.streetAddress;
    out.data.person = (entity?.contacts && entity.contacts[0]?.name) || profile.contactName;
    out.data.operator = `Manager ${((i - 1) % 7) + 1}`;
    out.data.date = new Date((ts - Math.floor(Math.random() * 864000)) * 1000).toISOString();
    out.data.created = ts;
    out.data.updated = ts;
    out.data.draft = false;

    if (!Array.isArray(out.data.items)) out.data.items = [];

    if (!out.data.price || typeof out.data.price !== 'object') {
        out.data.price = { total: 0, tax_total: 0, grand_total: 0, tax_percent: 21 };
    }

    out.meta = out.meta || {};
    out.meta.created = ts;
    out.meta.updated = ts;

    return {
        _id: rowId,
        pid: templateRow?.pid || null,
        js: out
    };
}

async function main() {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }

    const args = parseArgs(process.argv.slice(2));
    const client = new Client({ connectionString: DATABASE_URL });

    console.log(`[demo-data] SID=${SID}, mode=${args.mode}, entities=${args.entities}, orders=${args.orders}, dryRun=${args.dryRun}`);

    await client.connect();

    try {
        await client.query('BEGIN');

        const entityRows = (await client.query(
            `SELECT _id, pid, js FROM data WHERE ref = 'entity' AND sid = $1 ORDER BY _id ASC`,
            [SID]
        )).rows;

        const orderRows = (await client.query(
            `SELECT _id, pid, js FROM data WHERE ref = 'order' AND sid = $1 ORDER BY _id ASC`,
            [SID]
        )).rows;

        const maxOrderIdRes = await client.query(
            `SELECT COALESCE(MAX((js->'data'->>'id')::bigint), 0) AS max_id FROM data WHERE ref = 'order' AND sid = $1`,
            [SID]
        );

        let maxOrderId = Number(maxOrderIdRes.rows[0]?.max_id || 0);

        let anonymizedEntities = 0;
        let anonymizedOrders = 0;
        let insertedEntities = 0;
        let insertedOrders = 0;

        if (args.mode === 'anonymize' || args.mode === 'both') {
            for (let i = 0; i < entityRows.length; i++) {
                const row = entityRows[i];
                const js = anonymizeEntityJs(row.js, i + 1);
                await client.query(`UPDATE data SET js = $1::jsonb WHERE sid = $2 AND ref = 'entity' AND _id = $3`, [JSON.stringify(js), SID, row._id]);
                anonymizedEntities++;
            }

            for (let i = 0; i < orderRows.length; i++) {
                const row = orderRows[i];
                const js = anonymizeOrderJs(row.js, i + 1);
                await client.query(`UPDATE data SET js = $1::jsonb WHERE sid = $2 AND ref = 'order' AND _id = $3`, [JSON.stringify(js), SID, row._id]);
                anonymizedOrders++;
            }
        }

        const entityPool = [];

        if (args.mode === 'seed' || args.mode === 'both') {
            for (let i = 1; i <= args.entities; i++) {
                let row;

                if (entityRows.length > 0) {
                    const template = randomFrom(entityRows);
                    const rowId = makeId(40);
                    const js = anonymizeEntityJs(template.js, entityRows.length + i);
                    js.data = js.data || {};
                    js.data._id = rowId;
                    js.meta = js.meta || {};
                    js.meta.created = nowTs() - i;
                    js.meta.updated = nowTs() - i;

                    row = {
                        _id: rowId,
                        pid: template.pid || 0,
                        js
                    };
                } else {
                    row = buildFallbackEntity(i);
                }

                await client.query(
                    `INSERT INTO data (_id, pid, sid, ref, js) VALUES ($1, $2, $3, 'entity', $4::jsonb)`,
                    [row._id, row.pid, SID, JSON.stringify(row.js)]
                );

                entityPool.push({
                    _id: row.js?.data?._id || row._id,
                    name: row.js?.data?.name || profileFor(i).companyName,
                    email: row.js?.data?.email || profileFor(i).email,
                    phone: row.js?.data?.phone || buildPhone(i),
                    reg_address: row.js?.data?.reg_address || profileFor(i).streetAddress,
                    contacts: row.js?.data?.contacts || []
                });

                insertedEntities++;
            }

            for (let i = 1; i <= args.orders; i++) {
                const templateOrder = randomFrom(orderRows);
                const entity = randomFrom(entityPool, null);
                const nextOrderId = ++maxOrderId;
                const row = buildOrderFromTemplate(templateOrder, entity, nextOrderId, i);

                await client.query(
                    `INSERT INTO data (_id, pid, sid, ref, js) VALUES ($1, $2, $3, 'order', $4::jsonb)`,
                    [row._id, row.pid, SID, JSON.stringify(row.js)]
                );

                insertedOrders++;
            }
        }

        if (args.dryRun) {
            await client.query('ROLLBACK');
            console.log('[demo-data] Dry run completed. Transaction rolled back.');
        } else {
            await client.query('COMMIT');
            console.log('[demo-data] Transaction committed.');
        }

        console.log(`[demo-data] Anonymized entities: ${anonymizedEntities}`);
        console.log(`[demo-data] Anonymized orders: ${anonymizedOrders}`);
        console.log(`[demo-data] Inserted entities: ${insertedEntities}`);
        console.log(`[demo-data] Inserted orders: ${insertedOrders}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[demo-data] Failed, rolled back transaction.', err.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('[demo-data] Fatal error:', err.message);
    process.exit(1);
});
