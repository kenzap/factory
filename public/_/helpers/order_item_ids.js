import { randomString } from "./global.js";

export const normalizeOrderItemId = (orderId = '', itemId = '') => {

    const normalizedOrderId = String(orderId || '').trim();
    let normalizedItemId = String(itemId || '').trim();
    if (!normalizedOrderId || !normalizedItemId) return normalizedItemId;

    const duplicatePrefix = `${normalizedOrderId}-${normalizedOrderId}-`;
    while (normalizedItemId.startsWith(duplicatePrefix)) {
        normalizedItemId = `${normalizedOrderId}-${normalizedItemId.slice(duplicatePrefix.length)}`;
    }

    return normalizedItemId;
};

export const buildOrderScopedItemId = (orderId = '', itemId = '') => {

    const normalizedOrderId = String(orderId || '').trim();
    const normalizedItemId = normalizeOrderItemId(orderId, itemId);
    if (!normalizedOrderId) return normalizedItemId;
    if (!normalizedItemId) return '';
    if (normalizedItemId.startsWith(`${normalizedOrderId}-`)) return normalizedItemId;
    return `${normalizedOrderId}-${normalizedItemId}`;
};

export const createUniqueOrderItemId = (
    orderId = '',
    usedIds = new Set(),
    preferredId = '',
    options = {}
) => {

    const {
        preferOrderPrefix = false
    } = options;

    const normalizedPreferredId = String(preferredId || '').trim();
    if (normalizedPreferredId && !usedIds.has(normalizedPreferredId)) {
        usedIds.add(normalizedPreferredId);
        return normalizedPreferredId;
    }

    let nextId = '';
    do {
        const suffix = randomString(6);
        nextId = preferOrderPrefix && String(orderId || '').trim()
            ? `${String(orderId || '').trim()}-${suffix}`
            : suffix;
    } while (usedIds.has(nextId));

    usedIds.add(nextId);
    return nextId;
};

export const ensureUniqueOrderItems = (items = [], orderId = '') => {

    const rows = Array.isArray(items) ? items : [];
    const normalizedOrderId = String(orderId || '').trim();
    const usedIds = new Set();
    let changed = false;

    const nextItems = rows.map((item = {}) => {
        const currentId = String(item?.id || '').trim();
        const normalizedId = normalizeOrderItemId(normalizedOrderId, currentId);

        if (normalizedId && !usedIds.has(normalizedId)) {
            usedIds.add(normalizedId);
            if (normalizedId !== currentId) {
                changed = true;
                return { ...item, id: normalizedId };
            }

            return item;
        }

        const preferOrderPrefix = Boolean(
            normalizedOrderId && (
                item?.sketch_attached ||
                normalizedId.startsWith(`${normalizedOrderId}-`)
            )
        );

        const nextId = createUniqueOrderItemId(normalizedOrderId, usedIds, '', {
            preferOrderPrefix
        });

        changed = true;
        return { ...item, id: nextId };
    });

    return {
        items: nextItems,
        changed
    };
};
