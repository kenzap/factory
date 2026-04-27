import { authenticateToken } from '../_/helpers/auth.js';
import { extractOrderItems, loadOrderRowsWithProducts, monthKey, normalizeKey, normalizeText, toNumber } from '../_/helpers/analytics-products.js';
import { getLocales, getSettings, log } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const matchesSearch = (item, filters = {}) => {
    const search = normalizeKey(filters?.search);
    if (!search) return true;

    const haystack = [
        item?.group,
        item?.category,
        item?.title,
        item?.productId
    ].map(normalizeText).join(' ').toLowerCase();

    return haystack.includes(search);
};

const applyItemFilters = (items = [], filters = {}) => items.filter((item) => matchesSearch(item, filters));

const aggregateGroups = (items = []) => {
    const grouped = new Map();
    const monthlyByGroup = new Map();

    items.forEach((item) => {
        const groupName = normalizeText(item.group) || 'Ungrouped';
        const groupKey = normalizeKey(groupName) || 'ungrouped';

        if (!grouped.has(groupKey)) {
            grouped.set(groupKey, {
                group_key: groupKey,
                group_name: groupName,
                orders: new Set(),
                products: new Set(),
                qty: 0,
                revenue_total: 0,
                revenue_with_cost: 0,
                cost_total: 0,
                lines_with_cost: 0,
                lines_without_cost: 0
            });
        }

        const row = grouped.get(groupKey);
        const productKey = item.productId ? `id:${item.productId}` : `name:${normalizeKey(item.title)}`;
        row.orders.add(item.orderId);
        row.products.add(productKey);
        row.qty += item.qty;
        row.revenue_total += item.revenue;

        if (item.hasCost) {
            row.lines_with_cost += 1;
            row.revenue_with_cost += item.revenue;
            row.cost_total += item.costTotal;
        } else {
            row.lines_without_cost += 1;
        }

        const mk = monthKey(item.orderDate);
        if (mk) {
            const monthlyKey = `${groupKey}:${mk}`;
            if (!monthlyByGroup.has(monthlyKey)) {
                monthlyByGroup.set(monthlyKey, { group_key: groupKey, month: mk, revenue_total: 0 });
            }
            monthlyByGroup.get(monthlyKey).revenue_total += item.revenue;
        }
    });

    const groups = [...grouped.values()].map((row) => {
        const grossProfit = row.revenue_with_cost - row.cost_total;
        const marginPct = row.revenue_with_cost > 0 ? (grossProfit / row.revenue_with_cost) * 100 : null;
        const costCoveragePct = row.revenue_total > 0 ? (row.revenue_with_cost / row.revenue_total) * 100 : 0;

        return {
            group_key: row.group_key,
            group_name: row.group_name,
            orders_count: row.orders.size,
            products_count: row.products.size,
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
    }).sort((a, b) => b.revenue_total - a.revenue_total);

    const totalRevenue = groups.reduce((sum, row) => sum + toNumber(row.revenue_total, 0), 0);
    groups.forEach((row) => {
        row.revenue_share_pct = totalRevenue > 0 ? (row.revenue_total / totalRevenue) * 100 : 0;
    });

    const monthlyTrend = [...monthlyByGroup.values()]
        .sort((a, b) => a.month.localeCompare(b.month) || a.group_key.localeCompare(b.group_key));

    return { groups, monthlyTrend };
};

const summarizeGroups = (groups = [], items = []) => {
    const orders = new Set();
    const products = new Set();
    const summary = {
        groups_count: groups.length,
        orders_count: 0,
        products_count: 0,
        qty: 0,
        revenue_total: 0,
        revenue_with_cost: 0,
        cost_total: 0,
        gross_profit: 0,
        avg_unit_price: 0
    };

    items.forEach((item) => {
        if (item.orderId) orders.add(item.orderId);
        products.add(item.productId ? `id:${item.productId}` : `name:${normalizeKey(item.title)}`);
        summary.qty += toNumber(item.qty, 0);
        summary.revenue_total += toNumber(item.revenue, 0);
        if (item.hasCost) {
            summary.revenue_with_cost += toNumber(item.revenue, 0);
            summary.cost_total += toNumber(item.costTotal, 0);
        }
    });

    summary.orders_count = orders.size;
    summary.products_count = products.size;
    summary.gross_profit = summary.revenue_with_cost - summary.cost_total;
    summary.margin_pct = summary.revenue_with_cost > 0 ? (summary.gross_profit / summary.revenue_with_cost) * 100 : null;
    summary.cost_coverage_pct = summary.revenue_total > 0 ? (summary.revenue_with_cost / summary.revenue_total) * 100 : 0;
    summary.avg_unit_price = summary.qty > 0 ? summary.revenue_total / summary.qty : 0;

    return summary;
};

const buildCharts = (groups = [], items = []) => {
    const revenueByGroup = groups.map((row) => ({
        label: row.group_name,
        revenue: row.revenue_total,
        share_pct: row.revenue_share_pct
    }));

    const shareTop = groups.slice(0, 7).map((row) => ({
        label: row.group_name,
        value: row.revenue_total,
        pct: row.revenue_share_pct
    }));
    const otherRevenue = groups.slice(7).reduce((sum, row) => sum + toNumber(row.revenue_total, 0), 0);
    if (otherRevenue > 0) {
        const totalRevenue = groups.reduce((sum, row) => sum + toNumber(row.revenue_total, 0), 0);
        shareTop.push({
            label: 'Others',
            value: otherRevenue,
            pct: totalRevenue > 0 ? (otherRevenue / totalRevenue) * 100 : 0
        });
    }

    const priceMarginByGroup = groups.map((row) => ({
        label: row.group_name,
        avg_unit_price: row.avg_unit_price,
        margin_pct: row.margin_pct
    }));

    const profitMarginByGroup = groups.map((row) => ({
        label: row.group_name,
        margin_pct: row.margin_pct,
        gross_profit: row.gross_profit
    }));

    return {
        revenue_by_group: revenueByGroup,
        revenue_share: shareTop,
        price_margin_by_group: priceMarginByGroup,
        profit_margin_by_group: profitMarginByGroup
    };
};

async function getProductGroupAnalyticsReport(filters = {}) {
    const { ordersRows, productMap } = await loadOrderRowsWithProducts(filters);
    const items = extractOrderItems(ordersRows, productMap);
    const filteredItems = applyItemFilters(items, filters);
    const { groups, monthlyTrend } = aggregateGroups(filteredItems);

    return {
        summary: summarizeGroups(groups, filteredItems),
        groups,
        charts: buildCharts(groups, filteredItems),
        monthly_trend: monthlyTrend
    };
}

function getProductGroupAnalyticsReportApi(app) {
    app.post('/api/get-product-group-analytics-report/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body?.filters || {};
            const settings = await getSettings(['currency', 'currency_symb', 'currency_symb_loc']);
            const locale = await getLocale(req.headers);
            const locales = await getLocales();
            const report = await getProductGroupAnalyticsReport(filters);

            res.send({
                success: true,
                user: req?.user,
                settings,
                locale,
                locales,
                ...report
            });
        } catch (err) {
            res.status(500).json({ error: 'failed to get product group analytics report' });
            log(`Error getting product group analytics report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductGroupAnalyticsReportApi;
