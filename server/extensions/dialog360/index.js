import { getOrdersReady } from './src/get-orders-ready.js';
import { markOrderReady } from './src/mark-order-ready.js';
// import { notifyOrderNewAdmin } from './src/notify-order-new-admin.js';
import { notifyOrderReady } from './src/notify-order-ready.js';
import { sendOtp } from './src/send-otp.js';

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
/**
 * Registers the dialog360 extension with the application framework.
 * Sets up event handlers, API routes, and cron jobs for order notifications via WhatsApp.
 * 
 * @param {Object} params - The registration parameters
 * @param {Object} params.router - Express router instance for defining HTTP routes
 * @param {Object} params.cron - Cron service for scheduling recurring tasks
 * @param {Object} params.config - Application configuration object
 * @param {Object} params.events - Event emitter for handling application events
 * @param {Object} params.db - Database connection/service instance
 * @param {Object} params.logger - Logger instance for application logging
 * 
 * @description
 * - Listens for "otp.requested" events to send OTP messages
 * - Provides GET /orders-ready endpoint to retrieve orders ready for notification
 * - Provides GET /order-ready-test/:id endpoint for testing order notifications
 * - Schedules a cron job to automatically notify customers of ready orders during business hours (9AM-6PM, Monday-Friday)
 * 
 * Note: In the cron expression '0 9,10,11,12,13,14,15,16,18 * * 1-5', the '1-5' represents Monday through Friday (where 1=Monday, 5=Friday)
 */
export function register({ router, cron, config, events, db, logger }) {

    logger.info('Registering dialog360 extension')

    events.on("otp.requested", async ({ phone, otp }) => {

        logger.info("OTP Request received:", phone, otp);

        await sendOtp(phone, otp, config, logger);
    });

    // Route to get orders ready for notification
    router.get('/orders-ready', async (req, res) => {

        // const order = await repositories.order.findById(req.params.id)
        // if (!order) {
        //     return res.status(404).json({ error: 'Not found' })
        // }

        const orders = await getOrdersReady(db, logger);

        logger.info('orders:', orders);

        res.json({
            id: "-",
            total: orders.length,
            status: "processing"
        });
    });

    // Test route for order ready notification, ex: http://localhost:3000/extension/dialog360/order-ready-test/43006
    router.get('/order-ready-test/:id', async (req, res) => {

        // const notify = await notifyOrderReady({ orderId: req.params.id, phone: "6581500872" }, config, db, logger);

        events.emit("email.send", { email: "pavel@kenzap.com", subject: `Order #${req.params.id} is ready`, body: `Order ${req.params.id} ready notification sent.` });

        // const otp = await sendOtp("6581500872", "1234", config, logger);

        // const mark = await markOrderReady(req.params.id, db, logger);

        // logger.error('cron test: orders ready for notification');

        // const response = await notifyOrderNewAdmin({ orderId: req.params.id, phone: "6581500872" }, { sid: db.sid, permission: 'admin' }, db, logger);

        res.json({ status: 'ok' });
    });

    // cron every minute for testing
    // cron.register(
    //     'test',
    //     '*/20 * * * * *', // every 10 seconds
    //     async () => {

    //         const orders = await getOrdersReady(db, logger);

    //         logger.info('cron test: orders ready for notification:', orders);

    //         for (const order of orders) {

    //             // await notifyOrderReady({ orderId: order.id, phone: order.phone }, { sid: auth.sid, permission: auth.permission }, db, logger);
    //             await notifyOrderReady({ orderId: order.id, phone: "6581500872" }, config, db, logger);

    //             await markOrderReady(order.id, db, logger);
    //         }
    //     },
    //     { timezone: 'Europe/Riga' }
    // )

    // Register cron
    cron.register(
        'sync',
        '0,15,30,45 9,10,11,12,13,14,15,16 * * 1-5', // every weekday at 9:00, 9:30, 10:00, 10:30 .. 4:00, 4:30
        async (ctx) => {

            const orders = await getOrdersReady(db, logger);

            logger.info('cron test: orders ready for notification:', orders);

            for (const order of orders) {

                // keep sending while in debug mode
                // if (process.env.NODE_ENV !== 'production') await notifyOrderReady({ orderId: order.id, phone: "6581500872" }, config, db, logger);

                if (process.env.NODE_ENV !== 'production') await notifyOrderReady({ orderId: order.id, phone: "6581500872" }, config, db, logger);
                if (process.env.NODE_ENV === 'production') await notifyOrderReady({ orderId: order.id, phone: order.phone }, config, db, logger);
                if (process.env.NODE_ENV === 'production') await markOrderReady(order.id, db, logger);
            }

            logger.info('cron test:', orders);
        },
        { timezone: 'Europe/Riga' }
    )
}