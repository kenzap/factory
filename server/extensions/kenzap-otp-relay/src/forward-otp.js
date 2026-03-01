function safeEncode(value) {
    return encodeURIComponent(String(value || '').trim());
}

export async function forwardOtpToKenzap({ baseUrl, tenantId, otp, phone, apiKey, logger }) {
    const normalizedBase = String(baseUrl || 'https://api.kenzap.cloud').replace(/\/+$/, '');
    const url = `${normalizedBase}/v1/tenants/${safeEncode(tenantId)}/send-otp/`;

    const headers = {
        'Content-Type': 'application/json'
    };

    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, otp })
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`request failed (${response.status}): ${responseText.slice(0, 300)}`);
    }

    logger.info(`kenzap-otp-relay: forwarded OTP for tenant ${tenantId}, phone ${phone}`);
}

export default forwardOtpToKenzap;
