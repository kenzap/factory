/**
 * Sends a WhatsApp notification to a customer when their order is ready for pickup.
 * 
 * @async
 * @function notifyOrderReady
 * @param {Object} query - Query parameters containing order and contact information
 * @param {string} [query.orderId] - The order ID (alternative: pasutid)
 * @param {string} [query.pasutid] - Alternative parameter name for order ID
 * @param {string} [query.phone] - Customer's phone number (alternative: to)
 * @param {string} [query.to] - Alternative parameter name for phone number
 * @param {Object} access - Access control object (currently unused)
 * @param {Object} db - Database connection object (currently unused)
 * @param {Object} logger - Logger instance for logging messages and errors
 * @returns {Promise<Object>} Response object indicating success or failure
 * @returns {boolean} returns.success - Whether the operation was successful
 * @returns {string} [returns.message] - Success message when operation completes successfully
 * @returns {Object} [returns.data] - Response data from WhatsApp API on success
 * @returns {string} [returns.reason] - Error message when operation fails
 * 
 * @description
 * This function normalizes the phone number by:
 * - Removing leading "+" if present
 * - Adding "371" country code if number is less than 10 digits and doesn't start with "371"
 * 
 * Uses the 360dialog WhatsApp Business API to send a templated message.
 * Requires the following environment variables:
 * - DIALOG_KEY: API key for 360dialog service
 * - WHATSAPP_NAMESPACE: WhatsApp template namespace
 * 
 * @example
 * const result = await notifyOrderReady(
 *   { orderId: "12345", phone: "+37126123456" },
 *   access,
 *   db,
 *   logger
 * );
 * if (result.success) {
 *   console.log("Notification sent successfully");
 * }
 */
export const notifyOrderReady = async (query, config, db, logger) => {
    try {
        // 360dialog API configuration production
        const url = config.get('DIALOG_URL') || "https://waba-v2.360dialog.io/messages";
        const apiKey = config.get('DIALOG_KEY');

        // sandbox
        // const url = "https://waba-sandbox.360dialog.io/v1/messages";
        // const apiKey = "UXENI6_sandbox";

        // Extract order ID from query parameters
        const orderId = query.orderId || query.pasutid;
        const phone = query.phone || query.to;

        // Normalize phone number
        let normalizedPhone = phone;
        if (normalizedPhone.startsWith("+")) {
            normalizedPhone = normalizedPhone.substring(1);
        }

        // By default, add country code "371" if not present and length is less than 10
        if (!normalizedPhone.startsWith("371") && normalizedPhone.length < 10) {
            normalizedPhone = "371" + normalizedPhone;
        }

        const payload = {
            to: normalizedPhone,
            messaging_product: "whatsapp",
            type: "template",
            template: {
                namespace: process.env.WHATSAPP_NAMESPACE,
                language: {
                    policy: "deterministic",
                    code: "lv"
                },
                name: "order_ready_v4",
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: orderId.toString()
                            }
                        ]
                    }
                ]
            }
        };

        logger.info('Sending WhatsApp order ready notification:', payload, apiKey, process.env.WHATSAPP_NAMESPACE);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'D360-Api-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.error(`HTTP error! status:`, response.status);
            logger.error('Response details:', await response.text());
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        logger.info(`WhatsApp order ready notification sent to ${normalizedPhone}:`, result);
        return { success: true, message: 'WhatsApp message sent successfully', data: result };

    } catch (error) {

        logger.error('Error sending WhatsApp order ready notification:', error);
        return {
            success: false,
            reason: error.message
        };
    }
};