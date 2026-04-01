import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const normalizeText = (value = '') => String(value || '').trim();
const normalizeKey = (value = '') => normalizeText(value).toLowerCase();
const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const resolveRevenue = (item = {}) => {
    const total = toNumber(item?.total, NaN);
    if (Number.isFinite(total) && total > 0) return total;
    return toNumber(item?.price, 0) * toNumber(item?.qty, 0);
};

const resolveCost = (item = {}, productFallback = {}) => {
    const explicitTotal = toNumber(item?.total_cost, NaN);
    if (Number.isFinite(explicitTotal) && explicitTotal >= 0) {
        return { hasCost: true, costTotal: explicitTotal };
    }

    const qty = toNumber(item?.qty, 0);
    const perUnitCost = toNumber(item?.cost, NaN);
    if (Number.isFinite(perUnitCost) && qty > 0) {
        return { hasCost: true, costTotal: perUnitCost * qty };
    }

    const formulaCost = toNumber(item?.formula_cost, NaN);
    if (Number.isFinite(formulaCost) && qty > 0) {
        return { hasCost: true, costTotal: formulaCost * qty };
    }

    const productFormulaCost = toNumber(productFallback?.formula_cost, NaN);
    if (Number.isFinite(productFormulaCost) && qty > 0) {
        return { hasCost: true, costTotal: productFormulaCost * qty };
    }

    return { hasCost: false, costTotal: 0 };
};

const matchesSearch = (item, filters = {}) => {
    const search = normalizeKey(filters?.search);
    if (!search) return true;

    const haystack = [
        item?.title,
        item?.sdesc,
        item?.group,
        item?.category,
        item?.productId
    ].map(normalizeText).join(' ').toLowerCase();

    return haystack.includes(search);
};

const toIsoStart = (dateValue = '') => {
    if (!dateValue) return '';
    if (dateValue.includes('T')) return dateValue;
    return new Date(`${dateValue}T00:00:00`).toISOString();
};

const toIsoEnd = (dateValue = '') => {
    if (!dateValue) return '';
    if (dateValue.includes('T')) return dateValue;
    return new Date(`${dateValue}T23:59:59`).toISOString();
};

const getProductMap = async (db) => {
    const query = `
        SELECT
            _id,
            js->'data'->>'title' AS title,
            js->'data'->>'group' AS product_group,
            js->'data'->>'formula_cost' AS formula_cost,
            js->'data'->'cats' AS cats
        FROM data
        WHERE ref = $1 AND sid = $2
    `;

    const result = await db.query(query, ['product', sid]);
    const productMap = new Map();

    result.rows.forEach((row) => {
        const cats = Array.isArray(row?.cats) ? row.cats : [];
        productMap.set(String(row._id || ''), {
            title: normalizeText(row?.title),
            group: normalizeText(row?.product_group),
            category: normalizeText(cats?.[0] || ''),
            formula_cost: toNumber(row?.formula_cost, NaN)
        });
    });

    return productMap;
};

const extractOrderItems = (ordersRows = [], productMap = new Map()) => {
    const items = [];

    ordersRows.forEach((order) => {
        const orderId = normalizeText(order?.id);
        const orderDate = normalizeText(order?.date);
        const clientName = normalizeText(order?.name);
        const orderItems = Array.isArray(order?.items) ? order.items : [];

        orderItems.forEach((item, index) => {
            const productId = normalizeText(item?._id);
            const productFallback = productMap.get(productId) || {};
            const title = normalizeText(item?.title || productFallback?.title || 'Unnamed product');
            const group = normalizeText(item?.group || productFallback?.group || '');
            const category = normalizeText(item?.category || item?.cats?.[0] || productFallback?.category || '');
            const qty = toNumber(item?.qty, 0);
            const revenue = resolveRevenue(item);
            const costData = resolveCost(item, productFallback);

            items.push({
                key: productId ? `id:${productId}` : `name:${normalizeKey(title)}`,
                productId,
                title,
                group,
                category,
                qty,
                revenue,
                hasCost: costData.hasCost,
                costTotal: costData.costTotal,
                orderId,
                orderDate,
                clientName,
                lineIndex: index + 1
            });
        });
    });

    return items;
};

const applyItemFilters = (items = [], filters = {}) => {
    const groupFilter = normalizeKey(filters?.group);
    const categoryFilter = normalizeKey(filters?.category);

    return items.filter((item) => {
        if (groupFilter && normalizeKey(item.group) !== groupFilter) return false;
        if (categoryFilter && normalizeKey(item.category) !== categoryFilter) return false;
        if (!matchesSearch(item, filters)) return false;
        return true;
    });
};

const aggregateProducts = (items = []) => {
    const grouped = new Map();

    items.forEach((item) => {
        if (!grouped.has(item.key)) {
            grouped.set(item.key, {
                key: item.key,
                product_id: item.productId || '',
                product_name: item.title || 'Unnamed product',
                group: item.group || '',
                category: item.category || '',
                orders: new Set(),
                lines_count: 0,
                qty: 0,
                revenue_total: 0,
                revenue_with_cost: 0,
                cost_total: 0,
                products_with_cost_lines: 0,
                products_without_cost_lines: 0
            });
        }

        const row = grouped.get(item.key);
        row.orders.add(item.orderId);
        row.lines_count += 1;
        row.qty += item.qty;
        row.revenue_total += item.revenue;

        if (item.hasCost) {
            row.products_with_cost_lines += 1;
            row.revenue_with_cost += item.revenue;
            row.cost_total += item.costTotal;
        } else {
            row.products_without_cost_lines += 1;
        }
    });

    const records = [...grouped.values()].map((row) => {
        const grossProfit = row.revenue_with_cost - row.cost_total;
        const marginPct = row.revenue_with_cost > 0
            ? (grossProfit / row.revenue_with_cost) * 100
            : null;
        const costCoveragePct = row.revenue_total > 0
            ? (row.revenue_with_cost / row.revenue_total) * 100
            : 0;

        return {
            product_id: row.product_id,
            product_name: row.product_name,
            group: row.group,
            category: row.category,
            orders_count: row.orders.size,
            lines_count: row.lines_count,
            qty: row.qty,
            revenue_total: row.revenue_total,
            revenue_with_cost: row.revenue_with_cost,
            cost_total: row.cost_total,
            gross_profit: grossProfit,
            margin_pct: marginPct,
            cost_coverage_pct: costCoveragePct,
            avg_unit_price: row.qty > 0 ? row.revenue_total / row.qty : 0,
            avg_unit_cost: row.qty > 0 ? row.cost_total / row.qty : null
        };
    });

    records.sort((a, b) => b.revenue_total - a.revenue_total);
    return records;
};

const summarizeProducts = (records = []) => {
    const summary = {
        products: records.length,
        qty: 0,
        revenue_total: 0,
        revenue_with_cost: 0,
        cost_total: 0,
        gross_profit: 0
    };

    records.forEach((row) => {
        summary.qty += toNumber(row.qty, 0);
        summary.revenue_total += toNumber(row.revenue_total, 0);
        summary.revenue_with_cost += toNumber(row.revenue_with_cost, 0);
        summary.cost_total += toNumber(row.cost_total, 0);
    });

    summary.gross_profit = summary.revenue_with_cost - summary.cost_total;
    summary.margin_pct = summary.revenue_with_cost > 0
        ? (summary.gross_profit / summary.revenue_with_cost) * 100
        : null;
    summary.cost_coverage_pct = summary.revenue_total > 0
        ? (summary.revenue_with_cost / summary.revenue_total) * 100
        : 0;

    return summary;
};

async function loadOrderRows(filters = {}) {
    const db = getDbConnection();
    try {
        await db.connect();

        const query = `
            SELECT
                js->'data'->>'id' AS id,
                js->'data'->>'date' AS date,
                js->'data'->>'name' AS name,
                js->'data'->'items' AS items
            FROM data
            WHERE ref = $1
              AND sid = $2
              AND js->'data'->'deleted' IS NULL
              AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)
              AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)
              AND ($3::text = '' OR js->'data'->>'date' >= $3::text)
              AND ($4::text = '' OR js->'data'->>'date' <= $4::text)
        `;

        const params = [
            'order',
            sid,
            toIsoStart(filters?.dateFrom || ''),
            toIsoEnd(filters?.dateTo || '')
        ];

        const [ordersResult, productMap] = await Promise.all([
            db.query(query, params),
            getProductMap(db)
        ]);

        return { ordersRows: ordersResult.rows || [], productMap };
    } finally {
        await db.end();
    }
}

async function getProductAnalyticsReport(filters = {}) {
    const { ordersRows, productMap } = await loadOrderRows(filters);
    const items = extractOrderItems(ordersRows, productMap);
    const filteredItems = applyItemFilters(items, filters);
    const products = aggregateProducts(filteredItems);

    const groups = [...new Set(filteredItems.map((x) => x.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const categories = [...new Set(filteredItems.map((x) => x.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    return {
        summary: summarizeProducts(products),
        products,
        filter_options: { groups, categories }
    };
}

async function getProductAnalyticsDetail(filters = {}) {
    const targetId = normalizeText(filters?.product_id);
    const targetName = normalizeKey(filters?.product_name);
    const targetKey = targetId ? `id:${targetId}` : (targetName ? `name:${targetName}` : '');
    if (!targetKey) return { summary: null, lines: [] };

    const { ordersRows, productMap } = await loadOrderRows(filters);
    const items = extractOrderItems(ordersRows, productMap);
    const filteredItems = applyItemFilters(items, filters).filter((item) => item.key === targetKey);

    const lines = filteredItems
        .map((item) => {
            const grossProfit = item.hasCost ? (item.revenue - item.costTotal) : null;
            const marginPct = (item.hasCost && item.revenue > 0)
                ? (grossProfit / item.revenue) * 100
                : null;

            return {
                order_id: item.orderId,
                order_date: item.orderDate,
                client_name: item.clientName,
                line_index: item.lineIndex,
                qty: item.qty,
                revenue: item.revenue,
                cost_total: item.hasCost ? item.costTotal : null,
                gross_profit: grossProfit,
                margin_pct: marginPct
            };
        })
        .sort((a, b) => String(b.order_date || '').localeCompare(String(a.order_date || '')));

    const products = aggregateProducts(filteredItems);
    return {
        summary: products[0] || null,
        lines
    };
}

function getProductAnalyticsReportApi(app) {
    app.post('/api/get-product-analytics-report/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body?.filters || {};
            const settings = await getSettings(['currency', 'currency_symb', 'currency_symb_loc', 'groups', 'stock_categories']);
            const locale = await getLocale(req.headers);
            const locales = await getLocales();
            const report = await getProductAnalyticsReport(filters);

            res.send({
                success: true,
                user: req?.user,
                settings,
                locale,
                locales,
                ...report
            });
        } catch (err) {
            res.status(500).json({ error: 'failed to get product analytics report' });
            log(`Error getting product analytics report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });

    app.post('/api/get-product-analytics-detail/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body?.filters || {};
            const detail = await getProductAnalyticsDetail(filters);
            res.send({ success: true, ...detail });
        } catch (err) {
            res.status(500).json({ error: 'failed to get product analytics detail' });
            log(`Error getting product analytics detail: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductAnalyticsReportApi;
