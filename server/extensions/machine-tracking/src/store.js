export const store = async (query, db, logger) => {
    try {
        const machineRaw = query?.machine ?? query?.machine_id;
        const machine = typeof machineRaw === 'string' ? machineRaw.trim() : '';
        const reading = Number(query?.reading);

        if (!machine) {
            return { success: false, reason: 'machine is required' };
        }

        if (machine.length > 100) {
            return { success: false, reason: 'machine must be 100 characters or less' };
        }

        if (!Number.isFinite(reading)) {
            return { success: false, reason: 'reading must be a valid number' };
        }

        let timestamp = new Date();
        if (query?.time) {
            const parsed = new Date(query.time);
            if (Number.isNaN(parsed.getTime())) {
                return { success: false, reason: 'time must be a valid timestamp' };
            }
            timestamp = parsed;
        }

        const insertQuery = `
            INSERT INTO metering (time, reading, machine)
            VALUES (($1::timestamptz AT TIME ZONE 'UTC'), $2, $3)
            RETURNING _id, time, reading, machine
        `;

        const result = await db.query(insertQuery, [timestamp.toISOString(), reading, machine]);
        const row = result.rows?.[0] || null;

        return {
            success: true,
            data: row
        };

    } catch (error) {
        if (logger?.error) {
            logger.error('Failed to store machine reading', error);
        }
        return {
            success: false,
            reason: error.message
        };
    }
};
