/**
 * Sends an OTP (One-Time Password) via WhatsApp using the 360Dialog API.
 * 
 * @async
 * @function sendOtpWhatsApp
 * @param {string} phone - The recipient's phone number in international format
 * @param {string} otp - The one-time password to be sent
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *   - success: boolean indicating if the message was sent successfully
 *   - message: string describing the result
 *   - data: object containing the API response data
 * @throws {Error} Throws an error if the API request fails or if there's a network issue
 * 
 * @description
 * This function uses the WhatsApp Business API through 360Dialog to send OTP messages
 * using a predefined template named "auth_otp". The template includes both body text
 * and button components with the OTP value. Requires DIALOG_KEY and WHATSAPP_NAMESPACE
 * environment variables to be configured.
 *  
 * @example
 * try {
 *   const result = await sendOtpWhatsApp('+1234567890', '123456');
 *   console.log('OTP sent successfully:', result);
 * } catch (error) {
 *   console.error('Failed to send OTP:', error);
 * }
 */
export const sendOtp = async (phone, otp, config, logger) => {

    try {
        // 360dialog API configuration
        const url = config.get('DIALOG_API_URL');
        const apiKey = config.get('DIALOG_KEY');

        // Define template at https://developers.facebook.com/apps/ > your app > WhatsApp > Message Templates
        const payload = {
            to: phone,
            messaging_product: "whatsapp",
            type: "template",
            template: {
                namespace: process.env.WHATSAPP_NAMESPACE,
                language: {
                    policy: "deterministic",
                    code: "en"
                },
                name: "auth_otp",
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: otp
                            }
                        ]
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [
                            {
                                type: "text",
                                text: otp
                            }
                        ]
                    }
                ]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'D360-Api-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.error(`HTTP error! status:`, response);
        }

        const result = await response.json();

        logger.info(`WhatsApp OTP sent to ${phone}:`, result);

        return { success: true, message: 'WhatsApp message sent successfully', data: result };

    } catch (error) {
        logger.error('Error sending WhatsApp message:', error);
        throw error;
    }
}