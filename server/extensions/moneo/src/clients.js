import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeMoneoRequest } from './utils.js';

const isNonEmpty = (value) => typeof value === 'string' && value.trim() !== '';
const normalizeName = (value = '') => value.toString().trim().toLowerCase();

const normalizeRegNumber = (value = '') => value
    .toString()
    .trim()
    .replace(/^LV/i, '')
    .replace(/-/g, '');

const normalizeVatNumber = (value = '') => value
    .toString()
    .trim()
    .replace(/-/g, '');

const normalizeBankAccount = (value = '') => value
    .toString()
    .replace(/\s+/g, '')
    .trim();

const getPreviousMonthRange = () => {
    const now = new Date();
    const firstDayThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const firstDayPreviousMonth = new Date(Date.UTC(firstDayThisMonth.getUTCFullYear(), firstDayThisMonth.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const lastDayPreviousMonth = new Date(Date.UTC(firstDayThisMonth.getUTCFullYear(), firstDayThisMonth.getUTCMonth(), 0, 23, 59, 59, 999));

    return {
        from: firstDayPreviousMonth.toISOString(),
        to: lastDayPreviousMonth.toISOString()
    };
};

const buildClientPayload = (config, entity) => {
    const legalName = (entity.legal_name || entity.name || '').trim();
    const regAddress = (entity.reg_address || '').trim();
    const vatNumber = normalizeVatNumber(entity.vat_number || '');
    const regNumber = normalizeRegNumber(entity.reg_number || '');
    const bankAcc = normalizeBankAccount(entity.bank_acc || '');

    // Moneo expects 0 for VAT payer and 1 for non-VAT payer.
    const vatpayer = String(entity.vat_status || '') === '1' && vatNumber.length > 0 ? 0 : 1;
    const clientNumber = (entity.import_id || entity._id || '').toString();
    const country = (entity.country || 'LV').toString().trim() || 'LV';

    return {
        request: { compuid: config.get("COMPANY_UID") },
        data: {
            'contacts.contacts': {
                fieldlist: [
                    'name',
                    'customerflag',
                    'address1',
                    'vatno',
                    'regnr',
                    'country',
                    'iban',
                    'clientnumber',
                    'vatpayer',
                    'comment'
                ],
                data: [[
                    legalName,
                    1,
                    regAddress,
                    vatNumber,
                    regNumber || clientNumber,
                    country,
                    bankAcc,
                    clientNumber,
                    vatpayer,
                    `#${clientNumber || entity._id}`
                ]]
            }
        }
    };
};

const extractMoneoId = (response) => {
    if (!response || !Array.isArray(response.result)) return null;
    const row = response.result[0];
    if (!Array.isArray(row) || !row[0]) return null;
    if (!Array.isArray(row[1]) || !Array.isArray(row[1][4])) return null;
    return row[1][4][0] || null;
};

export const syncClients = async (db, logger, config, options = {}) => {

    try {
        const dryRun = options?.dryRun === true;
        const limit = Number.isFinite(Number(options?.limit)) && Number(options?.limit) > 0
            ? Number.parseInt(options.limit, 10)
            : null;
        const range = getPreviousMonthRange();

        logger.info(`[moneo.syncClients] Starting client sync with Moneo. Mode=${dryRun ? 'dry-run' : 'sync'} Limit=${limit || 'none'} Period: ${range.from} -> ${range.to}.`);

        const query = `
            SELECT
                e._id,
                e.js->'data'->>'name' AS name,
                e.js->'data'->>'legal_name' AS legal_name,
                e.js->'data'->>'reg_number' AS reg_number,
                e.js->'data'->>'vat_number' AS vat_number,
                e.js->'data'->>'bank_acc' AS bank_acc,
                e.js->'data'->>'reg_address' AS reg_address,
                e.js->'data'->>'vat_status' AS vat_status,
                e.js->'data'->>'import_id' AS import_id,
                e.js->'data'->>'country' AS country,
                e.js->'extensions'->'moneo'->>'id' AS moneo_id
            FROM data e
            WHERE e.ref = $1
              AND e.sid = $2
              AND e._id IN (
                    SELECT DISTINCT o.js->'data'->>'eid'
                    FROM data o
                    WHERE o.ref = $3
                      AND o.sid = $4
                      AND (o.js->'data'->'deleted') IS NULL
                      AND ((o.js->'data'->'draft')::boolean = false OR o.js->'data'->'draft' IS NULL)
                      AND ((o.js->'data'->'transaction')::boolean = false OR o.js->'data'->'transaction' IS NULL)
                      AND (
                        (
                          o.js->'data'->'waybill'->>'number' IS NOT NULL
                          AND o.js->'data'->'waybill'->>'number' != ''
                          AND o.js->'data'->'waybill'->>'date' >= $5
                          AND o.js->'data'->'waybill'->>'date' <= $6
                        )
                        OR
                        (
                          o.js->'data'->'invoice'->>'number' IS NOT NULL
                          AND o.js->'data'->'invoice'->>'number' != ''
                          AND o.js->'data'->'invoice'->>'date' >= $5
                          AND o.js->'data'->'invoice'->>'date' <= $6
                        )
                      )
                )
            ORDER BY e.js->'data'->>'legal_name' ASC, e.js->'data'->>'name' ASC
        `;

        const result = await db.query(query, ['entity', db.sid, 'order', db.sid, range.from, range.to]);
        const entities = result.rows || [];

        const summary = {
            success: true,
            dry_run: dryRun,
            limit,
            from: range.from,
            to: range.to,
            total: entities.length,
            synced: 0,
            skipped: 0,
            pending: 0,
            failed: 0,
            data: [],
            errors: []
        };

        logger.info(`[moneo.syncClients] Mode=${dryRun ? 'dry-run' : 'sync'} Limit=${limit || 'none'} Period: ${range.from} -> ${range.to}. Entities in scope: ${entities.length}`);

        let processedSyncCandidates = 0;

        for (const entity of entities) {
            const localEntity = {
                _id: entity._id,
                name: entity.name || '',
                legal_name: entity.legal_name || ''
            };

            if (isNonEmpty(entity.moneo_id)) {
                summary.skipped++;
                summary.data.push({ ...localEntity, moneo_id: entity.moneo_id, status: 'skipped', reason: 'already_synced' });
                continue;
            }

            if (limit !== null && processedSyncCandidates >= limit) {
                summary.skipped++;
                summary.data.push({ ...localEntity, moneo_id: null, status: 'skipped', reason: 'limit_reached' });
                continue;
            }

            try {
                const payload = buildClientPayload(config, { ...entity, _id: entity._id });
                processedSyncCandidates++;

                if (dryRun) {
                    summary.pending++;
                    summary.data.push({
                        ...localEntity,
                        moneo_id: null,
                        status: 'pending',
                        request_preview: payload.data['contacts.contacts'].data[0]
                    });
                    continue;
                }

                const response = await makeMoneoRequest('/contacts.contacts/create/', config, payload);
                const moneoId = extractMoneoId(response);

                if (!moneoId) {
                    throw new Error(`Unexpected Moneo response shape: ${JSON.stringify(response)}`);
                }

                const queryUpdate = `
                    UPDATE data
                    SET js = jsonb_set(
                        jsonb_set(
                            jsonb_set(
                                COALESCE(js, '{}'),
                                '{extensions}',
                                COALESCE(js->'extensions', '{}'),
                                true
                            ),
                            '{extensions,moneo}',
                            COALESCE(js->'extensions'->'moneo', '{}'),
                            true
                        ),
                        '{extensions,moneo,id}',
                        to_jsonb($1::text),
                        true
                    )
                    WHERE _id = $2 AND ref = $3 AND sid = $4
                `;

                await db.query(queryUpdate, [String(moneoId), entity._id, 'entity', db.sid]);

                summary.synced++;
                summary.data.push({ ...localEntity, moneo_id: String(moneoId), status: 'synced' });
                logger.info(`[moneo.syncClients] Synced entity ${entity._id} -> moneo.id ${moneoId}`);
            } catch (error) {
                summary.failed++;
                summary.errors.push({ ...localEntity, error: error.message });
                console.error(error);
                logger.error(`[moneo.syncClients] Failed for entity ${entity._id}: ${error.message}`);
            }
        }

        return summary;
    } catch (err) {
        logger.error(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        return { success: false, error: err.message };
    } finally {
        await db.close();
    }
}

export const syncOldClientIds = async (db, logger, options = {}) => {

    try {
        const dryRun = options?.dryRun === true;

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const clientsPath = path.join(__dirname, '../assets/clients.json');
        const fileData = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
        const legacyRows = fileData?.[2]?.data || [];

        const entitiesQuery = `
            SELECT
                _id,
                js->'data'->>'name' AS name,
                js->'data'->>'legal_name' AS legal_name,
                js->'extensions'->'moneo'->>'id' AS moneo_id
            FROM data
            WHERE ref = $1 AND sid = $2
        `;
        const entitiesResult = await db.query(entitiesQuery, ['entity', db.sid]);
        const entities = entitiesResult.rows || [];

        const nameIndex = new Map();
        for (const entity of entities) {
            const candidates = [
                normalizeName(entity.legal_name || ''),
                // normalizeName(entity.name || '')
            ].filter(Boolean);

            for (const key of candidates) {
                if (!nameIndex.has(key)) nameIndex.set(key, []);
                nameIndex.get(key).push(entity);
            }
        }

        const summary = {
            success: true,
            dry_run: dryRun,
            source_total: legacyRows.length,
            updated: 0,
            skipped: 0,
            unmatched: 0,
            ambiguous: 0,
            errors: 0,
            data: [],
            error_details: []
        };

        for (const oldRow of legacyRows) {
            const oldName = oldRow?.nosaukums || '';
            const oldNameKey = normalizeName(oldName);
            const legacyExtra = oldRow?.extra ? JSON.parse(oldRow.extra) : {};
            const oldMoneoId = legacyExtra?.moneoid ? String(legacyExtra.moneoid) : '';

            // if (oldMoneoId) logger.info(`[moneo.syncOldClientIds] Processing legacy client "${oldName}" with old Moneo ID: ${oldMoneoId}`);

            if (!oldNameKey || !oldMoneoId) {
                summary.skipped++;
                summary.data.push({
                    status: 'skipped',
                    reason: !oldNameKey ? 'missing_nosaukums' : 'missing_moneoid',
                    nosaukums: oldName,
                    moneo_id: oldMoneoId || null
                });
                continue;
            }

            const matches = nameIndex.get(oldNameKey) || [];

            if (matches.length === 0) {

                // logger.warn(`[moneo.syncOldClientIds] No match found for legacy client "${oldName}" (Moneo ID: ${oldMoneoId})`);

                summary.unmatched++;
                summary.data.push({
                    status: 'unmatched',
                    nosaukums: oldName,
                    moneo_id: oldMoneoId
                });
                continue;
            }

            if (matches.length > 2) {

                summary.ambiguous++;
                summary.data.push({
                    status: 'ambiguous',
                    nosaukums: oldName,
                    moneo_id: oldMoneoId,
                    candidates: matches.map((m) => ({
                        _id: m._id,
                        legal_name: m.legal_name || '',
                        name: m.name || ''
                    }))
                });
                continue;
            }

            const entity = matches[0];

            if (isNonEmpty(entity.moneo_id)) {

                // logger.info(`[moneo.syncOldClientIds] Skipping entity ${entity._id} "${entity.legal_name || entity.name}" - already has moneo.id ${entity.moneo_id}/${oldMoneoId}`);

                summary.skipped++;
                summary.data.push({
                    status: 'skipped',
                    reason: 'already_synced',
                    nosaukums: oldName,
                    moneo_id: entity.moneo_id,
                    _id: entity._id
                });
                continue;
            }

            try {

                logger.info(`[moneo.syncOldClientIds] Updating entity ${oldName} with moneo.id ${oldMoneoId}`);

                if (!dryRun) {
                    const updateQuery = `
                        UPDATE data
                        SET js = jsonb_set(
                            jsonb_set(
                                jsonb_set(
                                    COALESCE(js, '{}'),
                                    '{extensions}',
                                    COALESCE(js->'extensions', '{}'),
                                    true
                                ),
                                '{extensions,moneo}',
                                COALESCE(js->'extensions'->'moneo', '{}'),
                                true
                            ),
                            '{extensions,moneo,id}',
                            to_jsonb($1::text),
                            true
                        )
                        WHERE _id = $2 AND ref = $3 AND sid = $4
                    `;

                    await db.query(updateQuery, [oldMoneoId, entity._id, 'entity', db.sid]);
                }

                summary.updated++;
                summary.data.push({
                    status: dryRun ? 'pending' : 'updated',
                    nosaukums: oldName,
                    moneo_id: oldMoneoId,
                    _id: entity._id,
                    legal_name: entity.legal_name || '',
                    name: entity.name || ''
                });
            } catch (error) {
                summary.errors++;
                summary.error_details.push({
                    nosaukums: oldName,
                    moneo_id: oldMoneoId,
                    _id: entity._id,
                    error: error.message
                });
            }
        }

        return summary;
    } catch (err) {
        logger.error(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        return { success: false, error: err.message };
    } finally {
        await db.close();
    }
};
