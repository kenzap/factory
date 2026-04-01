import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const clean = (value = '') => String(value || '').trim();
const keyify = (value = '') => clean(value).toLowerCase();

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

const monthKey = (isoDate = '') => {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

async function loadOrderRows(filters = {}) {
    const db = getDbConnection();
    try {
        await db.connect();

        const query = `
            SELECT
                js->'data'->>'id' AS id,
                js->'data'->>'eid' AS eid,
                js->'data'->>'name' AS name,
                js->'data'->>'date' AS date,
                js->'data'->'price'->>'grand_total' AS revenue,
                js->'data'->'payment'->>'amount' AS paid,
                js->'data'->'invoice'->>'number' AS invoice_number,
                js->'data'->'waybill'->>'number' AS waybill_number
            FROM data
            WHERE ref = $1
              AND sid = $2
              AND js->'data'->'deleted' IS NULL
              AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)
              AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)
              AND ($3::text = '' OR js->'data'->>'date' >= $3::text)
              AND ($4::text = '' OR js->'data'->>'date' <= $4::text)
            ORDER BY js->'data'->>'date' DESC
        `;

        const params = [
            'order',
            sid,
            toIsoStart(filters?.dateFrom || ''),
            toIsoEnd(filters?.dateTo || '')
        ];

        const result = await db.query(query, params);
        return result.rows || [];
    } finally {
        await db.end();
    }
}

function aggregateClientRevenue(rows = [], filters = {}) {
    const byClient = new Map();
    const monthlyTotals = new Map();
    const search = keyify(filters?.search || '');

    rows.forEach((row) => {
        const clientName = clean(row?.name || 'Unknown Client');
        const clientEid = clean(row?.eid);
        const clientKey = clientEid ? `eid:${clientEid}` : `name:${keyify(clientName)}`;
        const orderId = clean(row?.id);
        const orderDate = clean(row?.date);
        const revenue = toNumber(row?.revenue, 0);
        const paid = toNumber(row?.paid, 0);
        const outstanding = revenue - paid;

        if (search) {
            const hay = `${keyify(clientName)} ${keyify(clientEid)} ${keyify(orderId)}`;
            if (!hay.includes(search)) return;
        }

        if (!byClient.has(clientKey)) {
            byClient.set(clientKey, {
                client_key: clientKey,
                client_eid: clientEid,
                client_name: clientName,
                orders_count: 0,
                invoices_count: 0,
                waybills_count: 0,
                revenue_total: 0,
                paid_total: 0,
                outstanding_total: 0,
                avg_order_value: 0,
                first_order_date: orderDate || '',
                last_order_date: orderDate || ''
            });
        }

        const c = byClient.get(clientKey);
        c.orders_count += 1;
        c.revenue_total += revenue;
        c.paid_total += paid;
        c.outstanding_total += outstanding;
        if (clean(row?.invoice_number)) c.invoices_count += 1;
        if (clean(row?.waybill_number)) c.waybills_count += 1;
        if (!c.first_order_date || orderDate < c.first_order_date) c.first_order_date = orderDate;
        if (!c.last_order_date || orderDate > c.last_order_date) c.last_order_date = orderDate;

        const mk = monthKey(orderDate);
        if (mk) {
            if (!monthlyTotals.has(mk)) monthlyTotals.set(mk, 0);
            monthlyTotals.set(mk, monthlyTotals.get(mk) + revenue);
        }
    });

    const clients = [...byClient.values()].map((c) => {
        c.avg_order_value = c.orders_count > 0 ? c.revenue_total / c.orders_count : 0;
        c.paid_ratio = c.revenue_total > 0 ? (c.paid_total / c.revenue_total) * 100 : 0;
        return c;
    }).sort((a, b) => b.revenue_total - a.revenue_total);

    const totalRevenue = clients.reduce((sum, c) => sum + c.revenue_total, 0);
    const totalPaid = clients.reduce((sum, c) => sum + c.paid_total, 0);
    const totalOutstanding = clients.reduce((sum, c) => sum + c.outstanding_total, 0);
    const totalOrders = clients.reduce((sum, c) => sum + c.orders_count, 0);

    const topN = Math.max(3, Math.min(20, Number(filters?.top || 10)));
    const topClients = clients.slice(0, topN);
    const otherRevenue = clients.slice(topN).reduce((sum, c) => sum + c.revenue_total, 0);

    const revenueShare = topClients.map((c) => ({ label: c.client_name, value: c.revenue_total }));
    if (otherRevenue > 0) revenueShare.push({ label: 'Others', value: otherRevenue });

    const monthlyTrend = [...monthlyTotals.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, revenue]) => ({ month, revenue }));

    return {
        summary: {
            clients_count: clients.length,
            orders_count: totalOrders,
            revenue_total: totalRevenue,
            paid_total: totalPaid,
            outstanding_total: totalOutstanding,
            avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            top_client_share_pct: totalRevenue > 0 && clients[0] ? (clients[0].revenue_total / totalRevenue) * 100 : 0
        },
        top_clients: topClients,
        clients,
        revenue_share: revenueShare,
        monthly_trend: monthlyTrend
    };
}

async function getClientRevenueDetail(filters = {}) {
    const targetKey = clean(filters?.client_key || '');
    if (!targetKey) return { summary: null, orders: [] };

    const rows = await loadOrderRows(filters);
    const relevant = rows.filter((row) => {
        const clientName = clean(row?.name || 'Unknown Client');
        const clientEid = clean(row?.eid);
        const key = clientEid ? `eid:${clientEid}` : `name:${keyify(clientName)}`;
        return key === targetKey;
    });

    const orders = relevant.map((row) => {
        const revenue = toNumber(row?.revenue, 0);
        const paid = toNumber(row?.paid, 0);
        return {
            order_id: clean(row?.id),
            date: clean(row?.date),
            revenue,
            paid,
            outstanding: revenue - paid,
            invoice_number: clean(row?.invoice_number),
            waybill_number: clean(row?.waybill_number)
        };
    });

    const summary = orders.reduce((acc, row) => {
        acc.orders_count += 1;
        acc.revenue_total += row.revenue;
        acc.paid_total += row.paid;
        acc.outstanding_total += row.outstanding;
        return acc;
    }, { orders_count: 0, revenue_total: 0, paid_total: 0, outstanding_total: 0 });

    return { summary, orders };
}

function getClientRevenueReportApi(app) {
    app.post('/api/get-client-revenue-report/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body?.filters || {};
            const locale = await getLocale(req.headers);
            const locales = await getLocales();
            const settings = await getSettings(['currency', 'currency_symb', 'currency_symb_loc']);
            const rows = await loadOrderRows(filters);
            const report = aggregateClientRevenue(rows, filters);

            res.send({
                success: true,
                user: req?.user,
                settings,
                locale,
                locales,
                ...report
            });
        } catch (err) {
            res.status(500).json({ error: 'failed to get client revenue report' });
            log(`Error getting client revenue report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });

    app.post('/api/get-client-revenue-detail/', authenticateToken, async (req, res) => {
        try {
            const detail = await getClientRevenueDetail(req.body?.filters || {});
            res.send({ success: true, ...detail });
        } catch (err) {
            res.status(500).json({ error: 'failed to get client revenue detail' });
            log(`Error getting client revenue detail: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getClientRevenueReportApi;
