import { getDbConnection, sid } from './index.js';

export const normalizeText = (value = '') => String(value || '').trim();
export const normalizeKey = (value = '') => normalizeText(value).toLowerCase();

export const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

export const toIsoStart = (dateValue = '') => {
    if (!dateValue) return '';
    if (dateValue.includes('T')) return dateValue;
    return new Date(`${dateValue}T00:00:00`).toISOString();
};

export const toIsoEnd = (dateValue = '') => {
    if (!dateValue) return '';
    if (dateValue.includes('T')) return dateValue;
    return new Date(`${dateValue}T23:59:59`).toISOString();
};

export const monthKey = (isoDate = '') => {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export const resolveRevenue = (item = {}) => {
    const total = toNumber(item?.total, NaN);
    if (Number.isFinite(total) && total > 0) return total;
    return toNumber(item?.price, 0) * toNumber(item?.qty, 0);
};

export const resolveCost = (item = {}, productFallback = {}) => {
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

export const getProductMap = async (db) => {
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

export const extractOrderItems = (ordersRows = [], productMap = new Map()) => {
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

export async function loadOrderRowsWithProducts(filters = {}) {
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
