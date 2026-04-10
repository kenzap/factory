import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const toISODate = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const normalizeDateFilter = (filters = {}) => {
    const end = parseDate(filters?.dateTo) || new Date();
    const start = parseDate(filters?.dateFrom) || new Date(end.getTime() - 29 * DAY_MS);

    const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59));

    return {
        dateFrom: startDay,
        dateTo: endDay
    };
};

const buildDateAxis = (dateFrom, dateTo) => {
    const days = [];
    const current = new Date(Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth(), dateFrom.getUTCDate()));
    const last = new Date(Date.UTC(dateTo.getUTCFullYear(), dateTo.getUTCMonth(), dateTo.getUTCDate()));

    while (current <= last) {
        days.push(toISODate(current));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return days;
};

const compactGroupName = (rawGroup = '', categories = []) => {
    const normalized = String(rawGroup || '').trim();
    if (!normalized) return 'Ungrouped';

    const fromId = categories.find((cat) => String(cat?._id || '') === normalized || String(cat?.id || '') === normalized);
    if (fromId?.title) return String(fromId.title);

    const fromSlug = categories.find((cat) => String(cat?.slug || '').toLowerCase() === normalized.toLowerCase());
    if (fromSlug?.title) return String(fromSlug.title);

    return normalized;
};

const getGroupFromCats = (cats = [], categories = []) => {
    if (!Array.isArray(cats) || cats.length === 0) return 'Ungrouped';

    for (const cat of cats) {
        const normalized = String(cat || '').trim();
        if (!normalized) continue;
        const group = compactGroupName(normalized, categories);
        if (group) return group;
    }

    return 'Ungrouped';
};

const resolveGroupName = (itemGroup, cats = [], categories = []) => {
    const direct = String(itemGroup || '').trim();
    if (direct) return direct;
    return getGroupFromCats(cats, categories);
};

const getProductionThroughputReport = async (filters = {}) => {
    const db = getDbConnection();

    try {
        await db.connect();

        const { dateFrom, dateTo } = normalizeDateFilter(filters);
        const dateAxis = buildDateAxis(dateFrom, dateTo);

        const params = [sid, dateFrom.toISOString(), dateTo.toISOString()];

        const query = `
            SELECT
                o.js->'data'->>'id' AS order_id,
                o.js->'data'->>'date' AS order_date,
                i.item->>'title' AS product_name,
                i.item->>'_id' AS product_id,
                i.item->>'group' AS item_group,
                COALESCE(i.item->>'qty', '0')::numeric AS qty,
                i.item->'inventory'->>'rdy_date' AS rdy_date
            FROM data o
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.js->'data'->'items', '[]'::jsonb)) AS i(item)
            WHERE o.ref = 'order'
              AND o.sid = $1
              AND i.item->'inventory'->>'rdy_date' IS NOT NULL
              AND i.item->'inventory'->>'rdy_date' <> ''
              AND (i.item->'inventory'->>'rdy_date')::timestamptz >= $2::timestamptz
              AND (i.item->'inventory'->>'rdy_date')::timestamptz <= $3::timestamptz
        `;

        const result = await db.query(query, params);

        const productIds = [...new Set((result.rows || []).map((row) => String(row.product_id || '').trim()).filter(Boolean))];

        let productMap = new Map();
        let settingsCategories = [];

        if (productIds.length > 0) {
            const productsQuery = `
                SELECT
                    js->'data'->>'_id' AS product_id,
                    js->'data'->'cats' AS cats
                FROM data
                WHERE ref = 'product' AND sid = $1 AND js->'data'->>'_id' = ANY($2::text[])
            `;
            const productsResult = await db.query(productsQuery, [sid, productIds]);
            productMap = new Map(
                (productsResult.rows || []).map((row) => [
                    String(row.product_id || ''),
                    Array.isArray(row.cats) ? row.cats : []
                ])
            );
        }

        const settingsResult = await db.query(
            `SELECT js->'data'->'cats' AS cats FROM data WHERE ref = 'settings' AND sid = $1 LIMIT 1`,
            [sid]
        );
        settingsCategories = Array.isArray(settingsResult.rows?.[0]?.cats) ? settingsResult.rows[0].cats : [];

        const perProductByDay = new Map();
        const perGroupTotals = new Map();
        const leadTimeByProduct = new Map();
        let overallTotalQty = 0;

        for (const row of result.rows || []) {
            const readyDate = parseDate(row.rdy_date);
            const orderDate = parseDate(row.order_date);
            if (!readyDate) continue;

            const dayKey = toISODate(new Date(Date.UTC(
                readyDate.getUTCFullYear(),
                readyDate.getUTCMonth(),
                readyDate.getUTCDate()
            )));

            const qty = Number(row.qty || 0);
            if (!Number.isFinite(qty) || qty <= 0) continue;

            const productId = String(row.product_id || '').trim();
            const productName = String(row.product_name || '').trim() || 'Unnamed product';
            const cats = productMap.get(productId) || [];
            const groupName = resolveGroupName(row.item_group, cats, settingsCategories);
            const productKey = `${productName}::${groupName}`;

            if (!perProductByDay.has(productKey)) {
                perProductByDay.set(productKey, {
                    product_name: productName,
                    product_id: productId,
                    group_name: groupName,
                    daily: new Map(),
                    total_qty: 0
                });
            }

            const productEntry = perProductByDay.get(productKey);
            productEntry.daily.set(dayKey, (productEntry.daily.get(dayKey) || 0) + qty);
            productEntry.total_qty += qty;

            if (!perGroupTotals.has(groupName)) {
                perGroupTotals.set(groupName, {
                    group_name: groupName,
                    total_qty: 0,
                    days_active: new Set(),
                    daily: new Map()
                });
            }
            const groupEntry = perGroupTotals.get(groupName);
            groupEntry.total_qty += qty;
            groupEntry.days_active.add(dayKey);
            groupEntry.daily.set(dayKey, (groupEntry.daily.get(dayKey) || 0) + qty);

            if (!leadTimeByProduct.has(productKey)) {
                leadTimeByProduct.set(productKey, {
                    sum_days: 0,
                    count: 0
                });
            }
            if (orderDate) {
                const days = Math.max(0, Math.round((readyDate.getTime() - orderDate.getTime()) / DAY_MS));
                const lead = leadTimeByProduct.get(productKey);
                lead.sum_days += days;
                lead.count += 1;
            }

            overallTotalQty += qty;
        }

        const products = [...perProductByDay.values()]
            .map((entry) => {
                const daily = dateAxis.map((day) => ({
                    day,
                    qty: Number((entry.daily.get(day) || 0).toFixed(3))
                }));
                const lead = leadTimeByProduct.get(`${entry.product_name}::${entry.group_name}`);
                const avgLeadDays = lead && lead.count > 0 ? Number((lead.sum_days / lead.count).toFixed(2)) : 0;
                return {
                    product_name: entry.product_name,
                    product_id: entry.product_id,
                    group_name: entry.group_name,
                    total_qty: Number(entry.total_qty.toFixed(3)),
                    avg_lead_days: avgLeadDays,
                    daily
                };
            })
            .sort((a, b) => b.total_qty - a.total_qty || a.product_name.localeCompare(b.product_name));

        const groups = [...perGroupTotals.values()]
            .map((entry) => {
                let maxDailyQty = 0;
                for (const value of entry.daily.values()) {
                    maxDailyQty = Math.max(maxDailyQty, Number(value || 0));
                }

                return {
                    group_name: entry.group_name,
                    total_qty: Number(entry.total_qty.toFixed(3)),
                    active_days: entry.days_active.size,
                    avg_daily_qty: Number((entry.total_qty / Math.max(1, dateAxis.length)).toFixed(3)),
                    max_daily_qty: Number(maxDailyQty.toFixed(3))
                };
            })
            .sort((a, b) => b.total_qty - a.total_qty || a.group_name.localeCompare(b.group_name));

        const dailyTotals = dateAxis.map((day) => {
            let dayTotal = 0;
            for (const product of products) {
                const hit = product.daily.find((d) => d.day === day);
                dayTotal += Number(hit?.qty || 0);
            }
            return {
                day,
                qty: Number(dayTotal.toFixed(3))
            };
        });

        const trailing7 = dailyTotals.slice(-7).reduce((sum, row) => sum + Number(row.qty || 0), 0);
        const trailing14 = dailyTotals.slice(-14).reduce((sum, row) => sum + Number(row.qty || 0), 0);

        const forecast = {
            next_7_days_qty: Number(((trailing14 / 14) * 7).toFixed(3)),
            next_day_qty: Number((trailing7 / 7).toFixed(3))
        };

        return {
            date_axis: dateAxis,
            summary: {
                total_qty_30d: Number(overallTotalQty.toFixed(3)),
                products_count: products.length,
                groups_count: groups.length,
                avg_daily_qty: Number((overallTotalQty / Math.max(1, dateAxis.length)).toFixed(3))
            },
            forecast,
            daily_totals: dailyTotals,
            groups,
            products
        };
    } finally {
        await db.end();
    }
};

function getProductionThroughputReportApi(app) {
    app.post('/api/get-production-throughput-report/', authenticateToken, async (req, res) => {
        try {
            const report = await getProductionThroughputReport(req.body?.filters || {});
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
            res.status(500).json({ error: 'failed to get production throughput report' });
            log(`Error getting production throughput report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductionThroughputReportApi;
