export function isValidIanaTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(new Date());
        return true;
    } catch (_err) {
        return false;
    }
}

export function normalizeTimezoneOrUtc(timezone) {
    const normalized = (timezone || '').trim();
    return isValidIanaTimezone(normalized) ? normalized : 'UTC';
}
