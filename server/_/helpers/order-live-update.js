import { sid } from './index.js';
import { sseManager } from './sse.js';

/**
 * Broadcast the current order snapshot so frontend views can refresh
 * document state and item-level inventory status without a full reload.
 */
export async function broadcastOrderUpdate(db, orderId, user) {
    if (!orderId) return null;

    const query = `
        SELECT
            _id,
            js->'data'->>'id' as id,
            COALESCE((js->'data'->'draft')::boolean, false) as draft,
            js->'data'->'items' as items,
            js->'data'->'waybill' as waybill,
            js->'data'->'invoice' as invoice,
            js->'data'->'quotation' as quotation,
            js->'data'->'production_slip' as production_slip,
            js->'data'->'packing_list' as packing_list,
            js->'data'->'sketch_list' as sketch_list
        FROM data
        WHERE ref = 'order' AND sid = $1 AND js->'data'->>'id' = $2
        LIMIT 1
    `;

    const result = await db.query(query, [sid, String(orderId)]);
    const order = result.rows[0] || null;

    if (!order) return null;

    sseManager.broadcast({
        type: 'order-update',
        order_id: order.id,
        order_record_id: order._id,
        draft: order.draft,
        items: order.items || [],
        waybill: order.waybill || null,
        invoice: order.invoice || null,
        quotation: order.quotation || null,
        production_slip: order.production_slip || null,
        packing_list: order.packing_list || null,
        sketch_list: order.sketch_list || null,
        updated_by: { user_id: user?.id, name: user?.fname },
        timestamp: new Date().toISOString()
    });

    return order;
}
