import { forwardOtpToKenzap } from './src/forward-otp.js';

export function register({ events, logger, config }) {
    const enabled = String(config.get('ENABLED') ?? process.env.KENZAP_OTP_RELAY_ENABLED ?? 'true').toLowerCase() !== 'false';

    if (!enabled) {
        logger.info('kenzap-otp-relay: disabled');
        return;
    }

    events.on('otp.requested', async ({ phone, otp }) => {
        const tenantId = config.get('TENANT_ID') || process.env.KENZAP_TENANT_ID || process.env.SID;
        const baseUrl = config.get('API_BASE_URL') || process.env.KENZAP_API_BASE_URL || 'https://api.kenzap.cloud';
        const apiKey = config.get('API_KEY') || process.env.KENZAP_API_KEY || '';

        if (!tenantId) {
            logger.warn('kenzap-otp-relay: tenant id is missing; skipping OTP forward');
            return;
        }

        if (!otp || !phone) {
            logger.warn('kenzap-otp-relay: otp.requested payload is missing phone/otp; skipping');
            return;
        }

        try {
            await forwardOtpToKenzap({
                baseUrl,
                tenantId,
                otp,
                phone,
                apiKey,
                logger
            });
        } catch (error) {
            logger.error(`kenzap-otp-relay: failed to forward OTP (${phone})`, error);
        }
    });

    logger.info('kenzap-otp-relay: registered');
}

export default { register };
