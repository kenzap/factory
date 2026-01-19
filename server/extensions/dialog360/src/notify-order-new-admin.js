/**
 * Sends a WhatsApp notification to admin when a new order is placed.
 * 
 * @async
 * @function notifyOrderNewAdmin
 * @param {Object} query - Query parameters containing order and contact information
 * @param {string} [query.orderId] - The order ID (alternative: pasutid)
 * @param {string} [query.pasutid] - Alternative parameter name for order ID
 * @param {string} [query.phone] - Admin's phone number (alternative: to)
 * @param {string} [query.to] - Alternative parameter name for phone number
 * @param {Object} logger - Logger instance for logging messages and errors
 * @returns {Promise<Object>} Response object indicating success or failure
 */
export const notifyOrderNewAdmin = async (query, access, db, logger) => {
    try {
        // 360dialog API configuration production
        const url = "https://waba-v2.360dialog.io/messages";
        const apiKey = process.env.DIALOG_KEY;

        // Extract order ID and phone from query parameters
        const orderId = query.orderId || query.pasutid;
        const phone = query.phone || query.to;

        // Normalize phone number
        let normalizedPhone = phone;
        if (normalizedPhone.startsWith("+")) {
            normalizedPhone = normalizedPhone.substring(1);
        }

        // Add country code "371" if not present and length is less than 10
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
                name: "order_new_admin_v2",
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

        logger.info('Sending WhatsApp new order admin notification:', payload);

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

        logger.info(`WhatsApp new order admin notification sent to ${normalizedPhone}:`, result);
        return { success: true, message: 'WhatsApp message sent successfully', data: result };

    } catch (error) {
        logger.error('Error sending WhatsApp new order admin notification:', error);
        return {
            success: false,
            reason: error.message
        };
    }
};
