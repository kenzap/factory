import { getOrdersReady } from './src/get-orders-ready.js';
import { markOrderReady } from './src/mark-order-ready.js';
// import { notifyOrderNewAdmin } from './src/notify-order-new-admin.js';
import { notifyOrderReady } from './src/notify-order-ready.js';
import { sendOtp } from './src/send-otp.js';
import { withRealtimeLock } from '../../_/helpers/redis.js';


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

    events.on("otp.requested", async ({ phone, otp, nonce }) => {

        logger.info("OTP Request received:", phone, otp);

        await withRealtimeLock(
            `dialog360:otp:${phone}:${nonce || otp}`,
            30 * 1000,
            async () => {
                await sendOtp(phone, otp, config, logger);
            },
            {
                logger,
                onLocked: () => logger.info(`dialog360: skipped duplicate OTP dispatch for ${phone}`)
            }
        );
    });

    // Route to get orders ready for notification
    router.get('/orders-ready', async (req, res) => {

        // TODO: implement object oriented approach with repositories and services instead of direct DB access in the route handler
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

        events.emit("email.send", { email: "pavel@kenzap.com", subject: `Order #${req.params.id} is ready`, body: `Order ${req.params.id} ready notification sent.` });

        res.json({ status: 'ok' });
    });

    // Register cron
    cron.register(
        'sync',
        '0,15,30,45 9,10,11,12,13,14,15,16 * * 1-5', // every weekday at 9:00, 9:30, 10:00, 10:30 .. 4:00, 4:30
        async () => {
            const orders = await getOrdersReady(db, logger);

            for (const order of orders) {
                logger.info('cron: order ready for notification:', order?.id, order?.phone);

                await withRealtimeLock(
                    `dialog360:order-ready:${order.id}`,
                    5 * 60 * 1000,
                    async () => {
                        if (process.env.NODE_ENV !== 'production') {
                            await notifyOrderReady({ orderId: order.id, phone: "6581500872" }, config, db, logger);
                            return;
                        }

                        await notifyOrderReady({ orderId: order.id, phone: "6581500872" }, config, db, logger);
                        await notifyOrderReady({ orderId: order.id, phone: order.phone }, config, db, logger);
                        await markOrderReady(order.id, db, logger);
                    },
                    {
                        logger,
                        onLocked: () => logger.info(`dialog360: skipped duplicate ready notification for order #${order.id}`)
                    }
                );
            }
        },
        {
            timezone: config.get('default_timezone') || 'UTC',
            singleton: true,
            lockKey: 'dialog360:cron:sync',
            lockTtlMs: 14 * 60 * 1000
        }
    )
}
