import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

async function getUsers() {
    const db = getDbConnection();
    let users = [];

    try {
        await db.connect();

        const query = `
            SELECT
                _id,
                js->'data'->'fname' AS fname,
                js->'data'->'lname' AS lname
            FROM data
            WHERE ref = $1 AND sid = $2 AND jsonb_array_length(js->'data'->'rights') > 0
            LIMIT 100
        `;

        const result = await db.query(query, ['user', sid]);
        if (result.rows.length > 0) users = result.rows;
    } finally {
        await db.end();
    }

    return users;
}

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

const buildAliasMap = (settings = {}) => {
    const aliasMap = new Map();

    // Preferred structure: worklog_taxonomy.aliases[]
    const taxonomyAliases = Array.isArray(settings?.worklog_taxonomy?.aliases)
        ? settings.worklog_taxonomy.aliases
        : [];
    taxonomyAliases.forEach((row) => {
        const type = normalizeText(row?.type);
        const alias = normalizeText(row?.alias);
        const canonical = normalizeText(row?.canonical_tag_id || row?.canonical || row?.tag);
        if (!type || !alias || !canonical) return;
        if (row?.status && String(row.status).toLowerCase() === 'disabled') return;
        aliasMap.set(`${type}::${alias}`, canonical);
    });

    // Backward-compatible structure: worklog_tag_aliases[]
    const flatAliases = Array.isArray(settings?.worklog_tag_aliases) ? settings.worklog_tag_aliases : [];
    flatAliases.forEach((row) => {
        const type = normalizeText(row?.type);
        const alias = normalizeText(row?.alias);
        const canonical = normalizeText(row?.canonical_tag_id || row?.canonical || row?.tag);
        if (!type || !alias || !canonical) return;
        if (row?.status && String(row.status).toLowerCase() === 'disabled') return;
        aliasMap.set(`${type}::${alias}`, canonical);
    });

    return aliasMap;
};

const normalizeTag = (type, tag, aliasMap) => {
    const cleanType = normalizeText(type);
    const cleanTag = normalizeText(tag);
    if (!cleanTag || cleanTag === 'unknown') return '';
    return aliasMap.get(`${cleanType}::${cleanTag}`) || cleanTag;
};

async function getProductManufacturingReport(filters = {}, settings = {}) {
    const db = getDbConnection();
    let report = [];

    try {
        await db.connect();

        let query = `
            SELECT
                _id,
                COALESCE(NULLIF(js->'data'->>'product_name', ''), js->'data'->>'title', '-') AS product_name,
                js->'data'->>'product_id' AS product_id,
                COALESCE(js->'data'->>'type', '') AS type,
                COALESCE(js->'data'->>'tag', '') AS tag,
                COALESCE(js->'data'->>'item_id', '') AS item_id,
                COALESCE(js->'data'->>'order_id', '') AS order_id,
                COALESCE(js->'data'->>'color', '') AS color,
                COALESCE(js->'data'->>'coating', '') AS coating,
                COALESCE((js->'data'->>'qty')::numeric, 0) AS qty,
                COALESCE((js->'data'->>'time')::numeric, 0) AS time
            FROM data
            WHERE ref = $1 AND sid = $2
        `;

        const params = ['worklog', sid];

        if (filters.user_id) {
            query += ` AND js->'data'->>'user_id' = $${params.length + 1}`;
            params.push(filters.user_id);
        }

        if (filters.type) {
            query += ` AND js->'data'->>'type' = $${params.length + 1}`;
            params.push(filters.type);
        }

        if (filters.color) {
            query += ` AND COALESCE(js->'data'->>'color', '') ILIKE $${params.length + 1}`;
            params.push(`%${filters.color}%`);
        }

        if (filters.coating) {
            query += ` AND COALESCE(js->'data'->>'coating', '') ILIKE $${params.length + 1}`;
            params.push(`%${filters.coating}%`);
        }

        if (filters.dateFrom) {
            query += ` AND js->'data'->>'date' >= $${params.length + 1}`;
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            query += ` AND js->'data'->>'date' <= $${params.length + 1}`;
            params.push(filters.dateTo);
        }

        query += `
            ORDER BY
                LOWER(COALESCE(NULLIF(js->'data'->>'product_name', ''), js->'data'->>'title', '-')) ASC,
                LOWER(COALESCE(js->'data'->>'type', '')) ASC
        `;

        const result = await db.query(query, params);
        if (result.rows.length > 0) {
            const aliasMap = buildAliasMap(settings);
            const typeNameById = new Map(
                (Array.isArray(settings?.work_categories) ? settings.work_categories : [])
                    .map((category) => [String(category?.id || ''), String(category?.name || '')])
            );
            const preferredProductIdByName = new Map();

            // If at least one worklog row has product_id for a name, reuse it for rows where product_id is missing.
            result.rows.forEach((row) => {
                const normalizedProductName = normalizeText(row.product_name);
                const productId = String(row.product_id || '').trim();
                if (!normalizedProductName || !productId) return;
                if (!preferredProductIdByName.has(normalizedProductName)) {
                    preferredProductIdByName.set(normalizedProductName, productId);
                }
            });

            const grouped = new Map();
            const dedupQty = new Map();

            result.rows.forEach((row) => {
                const productName = String(row.product_name || '-').trim() || '-';
                const normalizedProductName = normalizeText(productName);
                const rawProductId = String(row.product_id || '').trim();
                const productId = rawProductId || preferredProductIdByName.get(normalizedProductName) || '';
                const type = normalizeText(row.type);
                const groupKey = productId ? `id:${productId}` : `name:${normalizedProductName || '-'}`;
                const rawTag = row.tag || '';
                const normalizedTag = normalizeTag(type, rawTag, aliasMap);
                const typeLabel = typeNameById.get(type) || type || '-';
                const combinedTagKey = normalizedTag ? `${typeLabel} / ${normalizedTag}` : `${typeLabel}`;
                const qty = Number(row.qty) || 0;
                const time = Number(row.time) || 0;

                if (!grouped.has(groupKey)) {
                    grouped.set(groupKey, {
                        product_name: productName,
                        product_id: productId,
                        produced_qty: 0,
                        operations_qty: 0,
                        total_time: 0,
                        tag_breakdown: new Map()
                    });
                }

                const group = grouped.get(groupKey);
                if (!group.product_name || group.product_name === '-' || productName.length > group.product_name.length) {
                    group.product_name = productName;
                }
                if (!group.product_id && productId) group.product_id = productId;
                group.operations_qty += qty;
                group.total_time += time;

                const unitKey = row.item_id || row.order_id || row._id;
                const dedupKey = `${groupKey}::${unitKey}`;
                if (!dedupQty.has(dedupKey)) dedupQty.set(dedupKey, qty);
                if (qty > dedupQty.get(dedupKey)) dedupQty.set(dedupKey, qty);

                if (!group.tag_breakdown.has(combinedTagKey)) {
                    group.tag_breakdown.set(combinedTagKey, {
                        tag: combinedTagKey,
                        aliases: new Set(),
                        total_qty: 0,
                        total_time: 0,
                        entries: 0
                    });
                }

                const tagRow = group.tag_breakdown.get(combinedTagKey);
                tagRow.total_qty += qty;
                tagRow.total_time += time;
                tagRow.entries += 1;
                if (rawTag && normalizeText(rawTag) !== normalizedTag) {
                    tagRow.aliases.add(`${typeLabel} / ${rawTag}`);
                }
            });

            grouped.forEach((group, groupKey) => {
                let producedQty = 0;
                for (const [dedupKey, value] of dedupQty.entries()) {
                    if (dedupKey.startsWith(`${groupKey}::`)) producedQty += value;
                }
                group.produced_qty = producedQty;

                const tags = [...group.tag_breakdown.values()]
                    .map((tag) => ({
                        tag: tag.tag,
                        aliases: [...tag.aliases],
                        total_qty: tag.total_qty,
                        total_time: tag.total_time,
                        entries: tag.entries
                    }))
                    .sort((a, b) => a.tag.localeCompare(b.tag));

                report.push({
                    product_name: group.product_name,
                    product_id: group.product_id,
                    produced_qty: group.produced_qty,
                    operations_qty: group.operations_qty,
                    total_time: group.total_time,
                    tag_breakdown: tags
                });
            });
        }
    } finally {
        await db.end();
    }

    return report;
}

function getProductManufacturingReportApi(app) {
    app.post('/api/get-product-manufacturing-report/', authenticateToken, async (req, res) => {
        try {
            const users = await getUsers();
            const settings = await getSettings(['work_categories', 'worklog_tag_aliases', 'worklog_taxonomy', 'price']);
            const product_report = await getProductManufacturingReport(req.body.filters || {}, settings || {});
            const locale = await getLocale(req.headers);
            const locales = await getLocales();

            res.send({
                success: true,
                user: req?.user,
                settings,
                locale,
                locales,
                users,
                product_report
            });
        } catch (err) {
            res.status(500).json({ error: 'failed to get product manufacturing report' });
            log(`Error getting product manufacturing report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductManufacturingReportApi;
