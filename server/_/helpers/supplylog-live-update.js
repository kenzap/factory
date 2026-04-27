import { sid } from './index.js';
import { sseManager } from './sse.js';

export async function getSupplylogSnapshot(db, supplyId) {
    if (!supplyId) return null;

    const query = `
        SELECT
            _id,
            js->'data'->>'type' as type,
            js->'data'->>'status' as status,
            js->'data'->>'product_id' as product_id,
            js->'data'->>'parent_coil_id' as parent_coil_id,
            js->'data'->>'color' as color,
            js->'data'->>'coating' as coating,
            js->'data'->>'supplier' as supplier,
            js->'data'->>'notes' as notes,
            js->'data'->>'qty' as qty,
            js->'data'->>'width' as width,
            js->'data'->>'length' as length,
            js->'data'->>'thickness' as thickness,
            js->'data'->'parameters' as parameters,
            COALESCE(js->'data'->>'cm', 'false') as cm
        FROM data
        WHERE ref = 'supplylog' AND sid = $1 AND _id = $2
        LIMIT 1
    `;

    const result = await db.query(query, [sid, supplyId]);
    const row = result.rows[0] || null;

    if (!row) return null;

    return {
        ...row,
        coil_id: row._id,
        cm: row.cm === true || row.cm === 'true' || row.cm === '1'
    };
}

export function broadcastSupplylogUpdate(update, user) {
    if (!update?.coil_id && !update?._id) return;

    sseManager.broadcast({
        type: 'supplylog-update',
        action: update.action || 'updated',
        coil_id: update.coil_id || update._id,
        product_id: update.product_id || '',
        parent_coil_id: update.parent_coil_id || '',
        item_type: update.type || '',
        status: update.status || '',
        color: update.color || '',
        coating: update.coating || '',
        supplier: update.supplier || '',
        notes: update.notes || '',
        width: update.width || '',
        length: update.length || '',
        thickness: update.thickness || '',
        parameters: update.parameters || null,
        cm: update.cm === true || update.cm === 'true' || update.cm === '1',
        updated_fields: Array.isArray(update.updated_fields) ? update.updated_fields : [],
        updated_by: { user_id: user?.id, name: user?.fname },
        timestamp: new Date().toISOString()
    });
}
