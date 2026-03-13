import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, log } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const toUtcTimestampLiteral = (input) => {
    if (!input) return null;
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return null;
    // Keep UTC value, but pass as timestamp literal (without timezone marker).
    return date.toISOString().replace('Z', '');
};

const buildFilterClause = (filters = {}, params = []) => {
    const where = [];

    if (filters.machine) {
        where.push(`machine = $${params.length + 1}`);
        params.push(filters.machine);
    }

    if (filters.dateFrom) {
        const fromTs = toUtcTimestampLiteral(filters.dateFrom);
        if (fromTs) {
            where.push(`time >= $${params.length + 1}::timestamp`);
            params.push(fromTs);
        }
    }

    if (filters.dateTo) {
        const toTs = toUtcTimestampLiteral(filters.dateTo);
        if (toTs) {
            where.push(`time <= $${params.length + 1}::timestamp`);
            params.push(toTs);
        }
    }

    return where.length ? `WHERE ${where.join(' AND ')}` : '';
};

const getMachineMeteringReport = async (filters = {}) => {
    const db = getDbConnection();
    const timezone = typeof filters?.timezone === 'string' && filters.timezone.trim()
        ? filters.timezone.trim()
        : 'UTC';

    try {
        await db.connect();

        const baseParams = [];
        const baseWhere = buildFilterClause(filters, baseParams);

        const machinesQuery = `
            SELECT machine, COUNT(*)::int AS points, MIN(time) AS first_seen, MAX(time) AS last_seen
            FROM metering
            ${baseWhere}
            GROUP BY machine
            ORDER BY machine ASC
        `;
        const machinesResult = await db.query(machinesQuery, baseParams);

        const trendQuery = `
            SELECT
                machine,
                to_char(time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS time,
                reading
            FROM metering
            ${baseWhere}
            ORDER BY machine ASC, time ASC
            LIMIT 10000
        `;
        const trendResult = await db.query(trendQuery, baseParams);

        const deltaQuery = `
            WITH base AS (
                SELECT
                    machine,
                    time,
                    reading,
                    LAG(reading) OVER (PARTITION BY machine ORDER BY time) AS prev_reading,
                    LAG(time) OVER (PARTITION BY machine ORDER BY time) AS prev_time
                FROM metering
                ${baseWhere}
            ),
            deltas AS (
                SELECT
                    machine,
                    time,
                    CASE
                        WHEN prev_reading IS NULL THEN 0
                        WHEN reading < prev_reading THEN 0
                        ELSE reading - prev_reading
                    END AS produced,
                    CASE
                        WHEN prev_time IS NULL THEN 0
                        ELSE EXTRACT(EPOCH FROM (time - prev_time))
                    END AS seconds_diff,
                    CASE
                        WHEN prev_reading IS NOT NULL AND reading < prev_reading THEN 1
                        ELSE 0
                    END AS reset_event
                FROM base
            ),
            hourly AS (
                SELECT
                    machine,
                    DATE_TRUNC('hour', time) AS hour_bucket,
                    SUM(produced)::numeric AS produced_total,
                    SUM(seconds_diff)::numeric AS active_seconds
                FROM deltas
                GROUP BY machine, DATE_TRUNC('hour', time)
            )
            SELECT
                machine,
                to_char(hour_bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS hour_bucket,
                produced_total,
                CASE
                    WHEN active_seconds <= 0 THEN 0
                    ELSE ROUND((produced_total / (active_seconds / 3600.0))::numeric, 2)
                END AS rate_per_hour
            FROM hourly
            ORDER BY hour_bucket ASC, machine ASC
        `;
        const productionRateResult = await db.query(deltaQuery, baseParams);

        const heatmapParams = [...baseParams, timezone];
        const tzParam = `$${heatmapParams.length}`;

        const heatmapQuery = `
            WITH base AS (
                SELECT
                    machine,
                    time,
                    reading,
                    LAG(reading) OVER (PARTITION BY machine ORDER BY time) AS prev_reading
                FROM metering
                ${baseWhere}
            ),
            deltas AS (
                SELECT
                    machine,
                    ((time AT TIME ZONE 'UTC') AT TIME ZONE ${tzParam}) AS local_time,
                    CASE
                        WHEN prev_reading IS NULL THEN 0
                        WHEN reading < prev_reading THEN 0
                        ELSE reading - prev_reading
                    END AS produced
                FROM base
            )
            SELECT
                machine,
                EXTRACT(HOUR FROM local_time)::int AS hour_of_day,
                SUM(produced)::numeric AS produced_total
            FROM deltas
            GROUP BY machine, EXTRACT(HOUR FROM local_time)
            ORDER BY machine ASC, hour_of_day ASC
        `;
        const heatmapResult = await db.query(heatmapQuery, heatmapParams);

        const summaryQuery = `
            WITH base AS (
                SELECT
                    machine,
                    time,
                    reading,
                    LAG(reading) OVER (PARTITION BY machine ORDER BY time) AS prev_reading
                FROM metering
                ${baseWhere}
            )
            SELECT
                machine,
                SUM(
                    CASE
                        WHEN prev_reading IS NULL THEN 0
                        WHEN reading < prev_reading THEN 0
                        ELSE reading - prev_reading
                    END
                )::numeric AS produced_total,
                SUM(
                    CASE
                        WHEN prev_reading IS NOT NULL AND reading < prev_reading THEN 1
                        ELSE 0
                    END
                )::int AS reset_events
            FROM base
            GROUP BY machine
            ORDER BY machine ASC
        `;
        const summaryResult = await db.query(summaryQuery, baseParams);

        return {
            machines: machinesResult.rows || [],
            counter_trend: trendResult.rows || [],
            production_rate_trend: productionRateResult.rows || [],
            shift_heatmap: heatmapResult.rows || [],
            machine_summary: summaryResult.rows || []
        };
    } finally {
        await db.end();
    }
};

function getMachineMeteringReportApi(app) {
    app.post('/api/get-machine-metering-report/', authenticateToken, async (req, res) => {
        try {
            const report = await getMachineMeteringReport(req.body?.filters || {});
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
            res.status(500).json({ error: 'failed to get machine metering report' });
            log(`Error getting machine metering report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getMachineMeteringReportApi;
