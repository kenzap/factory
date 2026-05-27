import { getDbConnection, sid } from './index.js';
import { evaluateCostFormula } from './product.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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

const parseDate = (value = '') => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

export const resolveManufacturingLeadDays = (order = {}, item = {}) => {
    const startDate = parseDate(order?.rtp_date || order?.date);
    const readyDate = parseDate(item?.inventory?.rdy_date);

    if (!startDate || !readyDate) return null;

    const diffDays = (readyDate.getTime() - startDate.getTime()) / DAY_MS;
    if (!Number.isFinite(diffDays) || diffDays < 0) return null;

    return diffDays;
};

export const resolveRevenue = (item = {}) => {
    const total = toNumber(item?.total, NaN);
    if (Number.isFinite(total) && total > 0) return total;
    return toNumber(item?.price, 0) * toNumber(item?.qty, 0);
};

export const resolveCost = (item = {}, productFallback = {}, costSettings = {}, coilPriceMap = new Map()) => {
    const explicitTotal = toNumber(item?.total_cost, NaN);
    if (Number.isFinite(explicitTotal) && explicitTotal >= 0) {
        return { hasCost: true, costTotal: explicitTotal };
    }

    const qty = toNumber(item?.qty, 0);
    const perUnitCost = toNumber(item?.cost, NaN);
    if (Number.isFinite(perUnitCost) && qty > 0) {
        return { hasCost: true, costTotal: perUnitCost * qty };
    }

    const coilId = normalizeText(item?.inventory?.coil_id);
    const coilPriceM2 = coilId ? toNumber(coilPriceMap.get(coilId), NaN) : NaN;
    const formulaContext = {
        ...productFallback,
        ...item,
        formula: normalizeText(item?.formula || productFallback?.formula),
        formula_width: normalizeText(item?.formula_width || productFallback?.formula_width),
        formula_length: normalizeText(item?.formula_length || productFallback?.formula_length),
        formula_width_calc: item?.formula_width_calc ?? item?.width ?? productFallback?.formula_width_calc ?? productFallback?.width ?? '',
        formula_length_calc: item?.formula_length_calc ?? item?.length ?? productFallback?.formula_length_calc ?? productFallback?.length ?? '',
        input_fields: Array.isArray(item?.input_fields) ? item.input_fields : (Array.isArray(productFallback?.input_fields) ? productFallback.input_fields : []),
        input_fields_values: item?.input_fields_values || {},
        coating: normalizeText(item?.coating || productFallback?.coating),
        color: normalizeText(item?.color || productFallback?.color),
        cm: item?.cm === true || item?.cm === 'true' || productFallback?.cm === true || productFallback?.cm === 'true'
    };

    const formulaCost = normalizeText(item?.formula_cost);
    if (formulaCost && qty > 0) {
        const perUnitFormulaCost = evaluateCostFormula({
            settings: costSettings,
            product: { ...formulaContext, formula_cost: formulaCost },
            coilPriceM2
        });

        if (Number.isFinite(perUnitFormulaCost)) {
            return { hasCost: true, costTotal: perUnitFormulaCost * qty };
        }
    }

    const productFormulaCost = normalizeText(productFallback?.formula_cost);
    if (productFormulaCost && qty > 0) {
        const perUnitFormulaCost = evaluateCostFormula({
            settings: costSettings,
            product: { ...formulaContext, formula_cost: productFormulaCost },
            coilPriceM2
        });

        if (Number.isFinite(perUnitFormulaCost)) {
            return { hasCost: true, costTotal: perUnitFormulaCost * qty };
        }
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
            js->'data'->>'formula' AS formula,
            js->'data'->>'formula_width' AS formula_width,
            js->'data'->>'formula_length' AS formula_length,
            js->'data'->'input_fields' AS input_fields,
            js->'data'->>'calc_price' AS calc_price,
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
            formula_cost: normalizeText(row?.formula_cost),
            formula: normalizeText(row?.formula),
            formula_width: normalizeText(row?.formula_width),
            formula_length: normalizeText(row?.formula_length),
            input_fields: Array.isArray(row?.input_fields) ? row.input_fields : [],
            calc_price: normalizeText(row?.calc_price)
        });
    });

    return productMap;
};

export const extractOrderItems = (ordersRows = [], productMap = new Map(), costSettings = {}, coilPriceMap = new Map()) => {
    const items = [];

    ordersRows.forEach((order) => {
        const orderId = normalizeText(order?.id);
        const orderDate = normalizeText(order?.date);
        const orderProductionDate = normalizeText(order?.rtp_date);
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
            const costData = resolveCost(item, productFallback, costSettings, coilPriceMap);
            const manufacturingLeadDays = resolveManufacturingLeadDays(order, item);

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
                manufacturingLeadDays,
                orderId,
                orderDate,
                orderProductionDate,
                clientName,
                lineIndex: index + 1
            });
        });
    });

    return items;
};

const getRequestedCoilIds = (ordersRows = []) => {
    const ids = new Set();

    ordersRows.forEach((order) => {
        const orderItems = Array.isArray(order?.items) ? order.items : [];
        orderItems.forEach((item) => {
            const coilId = normalizeText(item?.inventory?.coil_id);
            if (coilId) ids.add(coilId);
        });
    });

    return [...ids];
};

const getCoilPriceMap = async (db, coilIds = []) => {
    const map = new Map();
    if (!coilIds.length) return map;

    const query = `
        SELECT
            _id,
            js->'data'->>'parent_coil_id' AS parent_coil_id,
            js->'data'->>'price' AS price
        FROM data
        WHERE ref = $1
          AND sid = $2
          AND (_id = ANY($3::text[]) OR COALESCE(js->'data'->>'parent_coil_id', '') = ANY($3::text[]))
    `;

    const result = await db.query(query, ['supplylog', sid, coilIds]);
    const directIds = new Set(coilIds);

    (result.rows || []).forEach((row) => {
        const id = normalizeText(row?._id);
        const price = toNumber(row?.price, NaN);
        if (!id || !Number.isFinite(price) || !directIds.has(id)) return;
        map.set(id, price);
    });

    (result.rows || []).forEach((row) => {
        const parentId = normalizeText(row?.parent_coil_id);
        const price = toNumber(row?.price, NaN);
        if (!parentId || !Number.isFinite(price) || !directIds.has(parentId) || map.has(parentId)) return;
        map.set(parentId, price);
    });

    return map;
};

export async function loadOrderRowsWithProducts(filters = {}) {
    const db = getDbConnection();
    try {
        await db.connect();

        const query = `
            SELECT
                js->'data'->>'id' AS id,
                js->'data'->>'date' AS date,
                js->'data'->>'rtp_date' AS rtp_date,
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

        const settingsQuery = `
            SELECT js->'data'->'price' AS price
            FROM data
            WHERE ref = $1 AND sid = $2
            LIMIT 1
        `;

        const ordersResult = await db.query(query, params);
        const productMap = await getProductMap(db);
        const settingsResult = await db.query(settingsQuery, ['settings', sid]);

        const ordersRows = ordersResult.rows || [];
        const costSettings = {
            price: settingsResult.rows?.[0]?.price || []
        };
        const coilPriceMap = await getCoilPriceMap(db, getRequestedCoilIds(ordersRows));

        return { ordersRows, productMap, costSettings, coilPriceMap };
    } finally {
        await db.end();
    }
}
