import { getOrdersReadyForNotification } from './src/get-orders-ready-for-notification.js';
// import { notifyOrderNewAdmin } from './src/notify-order-new-admin.js';
import { notifyOrderReady } from './src/notify-order-ready.js';

// register whatsapp extension
/**
 * Registers WhatsApp extension with routes and cron jobs for order notifications.
 * 
 * @param {Object} params - Configuration object
 * @param {Object} params.router - Express router instance for registering HTTP routes
 * @param {Object} params.cron - Cron manager for scheduling recurring tasks
 * @param {Object} params.db - Database connection instance
 * @param {Object} params.logger - Logger instance for debugging and monitoring
 *  
 * @description
 * Sets up:
 * - GET /orders-ready endpoint to retrieve orders ready for notification
 * - Cron job that runs Monday through Friday (1-5) at 9am, 10am, 3pm, and 4pm
 *   in Europe/Riga timezone to process orders for WhatsApp notifications
 * 
 * @note In the cron expression '0 9,10,15,16 * * 1-5', the '1-5' represents
 *       Monday through Friday (1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday)
 */
export function register({ router, cron, config, db, logger }) {

    logger.info('Registering WhatsApp extension with API key:', config.get('DIALOG_KEY') ? config.get('DIALOG_KEY') : 'not set');

    // Route to get orders ready for notification
    router.get('/orders-ready', async (req, res) => {

        // const order = await repositories.order.findById(req.params.id)
        // if (!order) {
        //     return res.status(404).json({ error: 'Not found' })
        // }

        const orders = await getOrdersReadyForNotification(db, logger);

        logger.info('orders:', orders);

        res.json({
            id: "-",
            total: orders.length,
            status: "processing"
        })
    })

    // Test route for order ready notification
    router.get('/order-ready-test/:id', async (req, res) => {

        const response = await notifyOrderReady({ orderId: req.params.id, phone: "6581500872" }, { sid: db.sid, permission: 'admin' }, config, db, logger);

        // const response = await notifyOrderNewAdmin({ orderId: req.params.id, phone: "6581500872" }, { sid: db.sid, permission: 'admin' }, db, logger);

        res.json({ response });
    });

    // Register cron
    cron.register(
        'sync',
        '0 9,10,15,16 * * 1-5', // every weekday at 9am, 10am, 3pm, 4pm
        async (ctx) => {

            const orders = await getOrdersReadyForNotification(db);

            // for (const order of orders) {
            //     await notifyOrderReady({ order_id: order._id }, { sid: auth.sid, permission: auth.permission }, db, logger);
            // }

            db.close();

            logger.info('cron test:', orders);
        },
        { timezone: 'Europe/Riga' }
    )
}