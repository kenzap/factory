import { send_email } from '../../_/helpers/email.js';
import { getSettings } from '../../_/helpers/settings.js';
import { claimOrderForFeedback } from './src/claim-order-for-feedback.js';
import { renderFeedbackEmail } from './src/render-feedback-email.js';

/**
 * Sends one feedback-request email every 15 minutes for an order
 * created at least 7 days ago and not yet marked as emailed.
 */
export function register({ router, cron, db, logger, config }) {

    // Route to get orders ready for notification
    if (process.env.NODE_ENV !== 'production')
        router.get('/request-feedback/', async (req, res) => {

            const claimedOrder = await claimOrderForFeedback(db, logger);

            // logger.info('orders:', claimedOrder);

            res.json({
                status: "asking feedback for orders",
                order: claimedOrder,
                timezone: config.get('default_timezone') || 'UTC'
            });
        });

    if (process.env.NODE_ENV === 'production')
        cron.register(
            'request-feedback',
            '*/1 * * * *',
            async () => {
                try {
                    const claimedOrder = await claimOrderForFeedback(db, logger);

                    // logger.info('feedback-email: claimed order for feedback request:', claimedOrder);

                    if (!claimedOrder) return;

                    if (!claimedOrder.email) {
                        logger.warn(`feedback-email: claimed order ${claimedOrder.id} has no email`);
                        return;
                    }

                    const settings = await getSettings();
                    const message = renderFeedbackEmail(claimedOrder, settings);

                    const sendResult = await send_email(
                        message.to,
                        message.fromEmail,
                        message.fromName,
                        message.subject,
                        message.body,
                        [],
                        { replyTo: message.replyTo }
                    );

                    if (sendResult?.send === true) {
                        logger.info(`feedback-email: feedback request sent for order #${claimedOrder.id} to ${message.to}`);
                    } else {
                        logger.error(`feedback-email: sending failed for order #${claimedOrder.id} (${message.to})`);
                    }

                    await send_email(
                        process.env.ADMIN_EMAIL,
                        message.fromEmail,
                        message.fromName,
                        message.subject,
                        message.body,
                        [],
                        { replyTo: message.replyTo }
                    );

                } catch (error) {
                    logger.error('feedback-email: cron job failed:', error);
                } finally {
                    await db.close();
                }
            },
            { timezone: config.get('default_timezone') || 'UTC' }
        );
}

export default { register };
