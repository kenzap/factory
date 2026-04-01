const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const sortDeep = (value) => {
    if (Array.isArray(value)) return value.map(sortDeep);
    if (!isObject(value)) return value;

    return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
            acc[key] = sortDeep(value[key]);
            return acc;
        }, {});
};

const stableStringify = (value) => JSON.stringify(sortDeep(value));

const resolveBaseItemKey = (item) => {
    const candidates = [
        item?._id,
        item?.id,
        item?.item_id,
        item?.sku,
        item?.code,
        item?.name,
    ];

    for (const candidate of candidates) {
        const value = String(candidate || '').trim();
        if (value) return value;
    }

    return '';
};

const buildIndexedItems = (items) => {
    const rows = Array.isArray(items) ? items : [];
    const used = new Map();

    return rows.map((item, index) => {
        const base = resolveBaseItemKey(item) || `index-${index}`;
        const currentCount = used.get(base) || 0;
        used.set(base, currentCount + 1);

        const key = currentCount > 0 ? `${base}#${currentCount}` : base;

        return {
            key,
            index,
            item: item || {},
            fingerprint: stableStringify(item || {}),
        };
    });
};

export const diffOrderItems = (beforeItems, afterItems) => {
    const beforeRows = buildIndexedItems(beforeItems);
    const afterRows = buildIndexedItems(afterItems);

    const beforeMap = new Map(beforeRows.map((row) => [row.key, row]));
    const afterMap = new Map(afterRows.map((row) => [row.key, row]));

    const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    const changes = [];

    for (const key of allKeys) {
        const previous = beforeMap.get(key);
        const next = afterMap.get(key);

        if (!previous && next) {
            changes.push({
                change_type: 'added',
                item_key: key,
                index_before: null,
                index_after: next.index,
                before: null,
                after: next.item,
            });
            continue;
        }

        if (previous && !next) {
            changes.push({
                change_type: 'removed',
                item_key: key,
                index_before: previous.index,
                index_after: null,
                before: previous.item,
                after: null,
            });
            continue;
        }

        if (previous.fingerprint !== next.fingerprint) {
            changes.push({
                change_type: 'updated',
                item_key: key,
                index_before: previous.index,
                index_after: next.index,
                before: previous.item,
                after: next.item,
            });
        }
    }

    const summary = {
        total_changes: changes.length,
        added: changes.filter((change) => change.change_type === 'added').length,
        removed: changes.filter((change) => change.change_type === 'removed').length,
        updated: changes.filter((change) => change.change_type === 'updated').length,
    };

    return {
        hasChanges: changes.length > 0,
        summary,
        changes,
    };
};

export default diffOrderItems;
