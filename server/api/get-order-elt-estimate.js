import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const toNum = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toKey = (...parts) => parts.map((p) => String(p || '').trim().toLowerCase()).join('::');

const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const toDayKey = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const countWorkingDaysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

    // Normalize to UTC midnight to avoid DST/local offsets in day math.
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    let workingDays = 0;

    while (current.getTime() <= last.getTime()) {
        const day = current.getUTCDay(); // 0=Sun, 6=Sat
        if (day !== 0 && day !== 6) workingDays += 1;
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return Math.max(1, workingDays);
};

const median = (values = []) => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
};

const percentile = (values = [], p = 0.8) => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
    return sorted[idx];
};

const toFlag = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
};

const normalizeCurrentItems = (items = []) => {
    return (Array.isArray(items) ? items : [])
        .map((item) => ({
            product_id: String(item?._id || '').trim(),
            title: String(item?.title || '').trim(),
            group_name: String(item?.group || '').trim(),
            qty: Math.max(0, toNum(item?.qty, 0))
        }))
        .filter((item) => item.qty > 0 && (item.product_id || item.title));
};

const getOrderEltEstimate = async (filters = {}) => {
    const db = getDbConnection();

    try {
        await db.connect();

        const items = normalizeCurrentItems(filters?.items || []);
        const currentOrderId = String(filters?.order_id || '').trim();
        if (items.length === 0) {
            return {
                estimate_days: 0,
                estimate_days_p80: 0,
                estimate_days_best_case: 0,
                backlog_days: 0,
                backlog_days_best_case: 0,
                backlog_orders: 0,
                backlog_qty: 0,
                sample_size: 0,
                confidence: 'low',
                reason: 'no_items'
            };
        }

        const query = `
            SELECT
                COALESCE(i.item->>'_id', '') AS product_id,
                COALESCE(i.item->>'title', '') AS title,
                COALESCE(i.item->>'group', '') AS group_name,
                COALESCE(i.item->>'qty', '0')::numeric AS qty,
                COALESCE(o.js->'data'->>'rtp_date', o.js->'data'->>'date', '') AS start_date,
                COALESCE(i.item->'inventory'->>'rdy_date', '') AS ready_date
            FROM data o
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.js->'data'->'items', '[]'::jsonb)) AS i(item)
            WHERE o.ref = 'order'
              AND o.sid = $1
              AND COALESCE(i.item->'inventory'->>'rdy_date', '') <> ''
              AND COALESCE(o.js->'data'->>'rtp_date', o.js->'data'->>'date', '') <> ''
              AND (i.item->'inventory'->>'rdy_date')::timestamptz >= (NOW() - INTERVAL '365 days')
        `;

        const result = await db.query(query, [sid]);
        const rows = result.rows || [];

        const statsByExact = new Map();
        const statsByProduct = new Map();
        const statsByGroup = new Map();
        const globalLead = [];

        const pushStats = (map, key, lead, qty) => {
            if (!map.has(key)) map.set(key, { lead_days: [], qty: [] });
            map.get(key).lead_days.push(lead);
            map.get(key).qty.push(qty);
        };

        for (const row of rows) {
            const readyDate = parseDate(row.ready_date);
            const startDate = parseDate(row.start_date);
            if (!readyDate || !startDate) continue;

            const leadDays = Math.max(0.25, (readyDate.getTime() - startDate.getTime()) / DAY_MS);
            const qty = Math.max(0.01, toNum(row.qty, 0.01));
            const productId = String(row.product_id || '').trim();
            const title = String(row.title || '').trim();
            const groupName = String(row.group_name || '').trim();

            if (productId || title) {
                pushStats(statsByExact, toKey(productId || title, groupName), leadDays, qty);
                pushStats(statsByProduct, toKey(productId || title), leadDays, qty);
            }

            if (groupName) pushStats(statsByGroup, toKey(groupName), leadDays, qty);
            globalLead.push(leadDays);
        }

        // Backlog from currently pending manufacturing items (not issued, not cancelled).
        const pendingParams = [sid];
        let pendingExcludeClause = '';
        if (currentOrderId) {
            pendingExcludeClause = ` AND COALESCE(o.js->'data'->>'id', '') <> $2 `;
            pendingParams.push(currentOrderId);
        }
        const pendingQuery = `
            SELECT
                COALESCE(i.item->>'group', '') AS group_name,
                COALESCE(i.item->>'qty', '0')::numeric AS qty,
                COALESCE(o.js->'data'->>'id', '') AS order_id,
                COALESCE(i.item->'inventory'->>'isu_date', '') AS isu_date,
                COALESCE(i.item->'inventory'->>'rdy_date', '') AS rdy_date,
                COALESCE(i.item->>'cancelled_from_invoice', '') AS cancelled_from_invoice,
                COALESCE(i.item->>'hidden_from_invoice', '') AS hidden_from_invoice
            FROM data o
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.js->'data'->'items', '[]'::jsonb)) AS i(item)
            WHERE o.ref = 'order'
              AND o.sid = $1
              AND o.js->'data'->'deleted' IS NULL
              AND (o.js->'data'->>'draft' IS NULL OR (o.js->'data'->>'draft')::boolean = false)
              AND (o.js->'data'->>'transaction' IS NULL OR (o.js->'data'->>'transaction')::boolean = false)
              AND COALESCE(o.js->'data'->>'due_date', '') <> ''
              ${pendingExcludeClause}
        `;
        const pendingResult = await db.query(pendingQuery, pendingParams);
        const pendingRows = pendingResult.rows || [];

        const now = new Date();
        const windowStart = new Date(now.getTime() - (30 * DAY_MS));
        const dayAgo30 = windowStart.getTime();
        const workingDaysWindow = countWorkingDaysBetween(windowStart, now);
        const throughputByGroup = new Map();
        const throughputByGroupDay = new Map();
        let throughputQty30d = 0;
        for (const row of rows) {
            const readyDate = parseDate(row.ready_date);
            if (!readyDate || readyDate.getTime() < dayAgo30) continue;

            const qty = Math.max(0, toNum(row.qty, 0));
            if (qty <= 0) continue;

            const groupName = toKey(row.group_name);
            const dayKey = toDayKey(readyDate);
            throughputQty30d += qty;
            if (!throughputByGroup.has(groupName)) throughputByGroup.set(groupName, 0);
            throughputByGroup.set(groupName, throughputByGroup.get(groupName) + qty);

            const groupDayKey = `${groupName}::${dayKey}`;
            if (!throughputByGroupDay.has(groupDayKey)) throughputByGroupDay.set(groupDayKey, 0);
            throughputByGroupDay.set(groupDayKey, throughputByGroupDay.get(groupDayKey) + qty);
        }
        const globalDailyRate = Math.max(0.5, throughputQty30d / workingDaysWindow);
        const groupMaxDailyRate = new Map();
        let globalMaxDailyRate = globalDailyRate;
        for (const [groupDayKey, qty] of throughputByGroupDay.entries()) {
            const groupName = groupDayKey.split('::')[0] || '';
            const prev = groupMaxDailyRate.get(groupName) || 0;
            if (qty > prev) groupMaxDailyRate.set(groupName, qty);
            if (qty > globalMaxDailyRate) globalMaxDailyRate = qty;
        }

        const pendingByGroup = new Map();
        const pendingOrderSet = new Set();
        let pendingQtyTotal = 0;
        for (const row of pendingRows) {
            if (!row) continue;
            if (String(row.isu_date || '').trim()) continue;
            if (String(row.rdy_date || '').trim()) continue;
            if (toFlag(row.cancelled_from_invoice) || toFlag(row.hidden_from_invoice)) continue;

            const qty = Math.max(0, toNum(row.qty, 0));
            if (qty <= 0) continue;

            const groupName = toKey(row.group_name);
            if (!pendingByGroup.has(groupName)) pendingByGroup.set(groupName, 0);
            pendingByGroup.set(groupName, pendingByGroup.get(groupName) + qty);
            pendingQtyTotal += qty;
            if (row.order_id) pendingOrderSet.add(String(row.order_id));
        }

        const getBucket = (item) => {
            const pidOrTitle = item.product_id || item.title;
            const exact = statsByExact.get(toKey(pidOrTitle, item.group_name));
            if (exact && exact.lead_days.length >= 3) return exact;

            const byProduct = statsByProduct.get(toKey(pidOrTitle));
            if (byProduct && byProduct.lead_days.length >= 5) return byProduct;

            const byGroup = statsByGroup.get(toKey(item.group_name));
            if (byGroup && byGroup.lead_days.length >= 6) return byGroup;

            return {
                lead_days: globalLead,
                qty: []
            };
        };

        let weightedLead = 0;
        let weightedLeadP80 = 0;
        let weightedBacklogDays = 0;
        let weightedBacklogDaysBestCase = 0;
        let totalWeight = 0;
        let sampleSize = 0;

        for (const item of items) {
            const bucket = getBucket(item);
            const leadValues = bucket.lead_days || [];
            if (leadValues.length === 0) continue;

            const baseLead = median(leadValues);
            const p80Lead = percentile(leadValues, 0.8);
            const medianQty = median(bucket.qty || []) || item.qty;
            const qtyFactor = Math.min(2.5, Math.max(0.6, Math.sqrt(item.qty / Math.max(0.01, medianQty))));

            const estimatedLead = baseLead * qtyFactor;
            const estimatedLeadP80 = p80Lead * qtyFactor;
            const weight = Math.max(0.1, item.qty);
            const normalizedGroup = toKey(item.group_name);
            const groupPendingQty = pendingByGroup.get(normalizedGroup) || 0;
            const groupDailyRate = Math.max(0.5, (throughputByGroup.get(normalizedGroup) || 0) / workingDaysWindow) || globalDailyRate;
            const groupDailyRateBestCase = Math.max(0.5, groupMaxDailyRate.get(normalizedGroup) || globalMaxDailyRate);
            const backlogDaysForItem = Math.min(45, groupPendingQty / Math.max(0.5, groupDailyRate));
            const backlogDaysForItemBestCase = Math.min(45, groupPendingQty / groupDailyRateBestCase);

            weightedLead += estimatedLead * weight;
            weightedLeadP80 += estimatedLeadP80 * weight;
            weightedBacklogDays += backlogDaysForItem * weight;
            weightedBacklogDaysBestCase += backlogDaysForItemBestCase * weight;
            totalWeight += weight;
            sampleSize += leadValues.length;
        }

        if (totalWeight <= 0) {
            return {
                estimate_days: 0,
                estimate_days_p80: 0,
                estimate_days_best_case: 0,
                backlog_days: 0,
                backlog_days_best_case: 0,
                backlog_orders: 0,
                backlog_qty: 0,
                sample_size: 0,
                confidence: 'low',
                reason: 'no_history'
            };
        }

        const backlogDays = weightedBacklogDays / totalWeight;
        const backlogDaysBestCase = weightedBacklogDaysBestCase / totalWeight;
        const estimateDays = (weightedLead / totalWeight) + backlogDays;
        const estimateDaysP80 = (weightedLeadP80 / totalWeight) + backlogDays;
        const estimateDaysBestCase = (weightedLead / totalWeight) + backlogDaysBestCase;

        let confidence = 'low';
        if (sampleSize >= 80) confidence = 'high';
        else if (sampleSize >= 30) confidence = 'medium';

        return {
            estimate_days: Number(estimateDays.toFixed(2)),
            estimate_days_p80: Number(estimateDaysP80.toFixed(2)),
            estimate_days_best_case: Number(estimateDaysBestCase.toFixed(2)),
            backlog_days: Number(backlogDays.toFixed(2)),
            backlog_days_best_case: Number(backlogDaysBestCase.toFixed(2)),
            backlog_orders: pendingOrderSet.size,
            backlog_qty: Number(pendingQtyTotal.toFixed(2)),
            sample_size: sampleSize,
            confidence,
            reason: 'ok'
        };
    } finally {
        await db.end();
    }
};

function getOrderEltEstimateApi(app) {
    app.post('/api/get-order-elt-estimate/', authenticateToken, async (req, res) => {
        try {
            const report = await getOrderEltEstimate(req.body?.filters || {});
            const locale = await getLocale(req.headers);
            const locales = await getLocales();

            res.send({
                success: true,
                user: req?.user,
                locale,
                locales,
                ...report
            });
        } catch (err) {
            res.status(500).json({ error: 'failed to get order ELT estimate' });
            log(`Error getting order ELT estimate: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrderEltEstimateApi;
