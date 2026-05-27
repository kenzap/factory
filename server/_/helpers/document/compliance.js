import { sid } from '../index.js';
import { isExcludedFromInvoice } from './render.js';

const DOCUMENTATION_URL = 'https://skarda.design/lv/dokumentacija';

const COATING_DOCUMENTS = {
    polyester: 'Polyester',
    'matt-pural': 'Matt Pural',
    'matt-polyester': 'Matt Polyester',
    zinc: 'Zinc'
};

const GROUP_DOCUMENTS = {
    bending: {
        kind: 'Teh. pase Nr.',
        coatings: {
            polyester: '100-01',
            'matt-pural': '100-02',
            'matt-polyester': '100-03',
            zinc: '100-04'
        }
    },
    'rainwater-system-square': {
        kind: 'Teh. pase Nr.',
        coatings: {
            polyester: '200-01',
            'matt-pural': '200-02',
            'matt-polyester': '200-03',
            zinc: '200-04'
        }
    },
    'rainwater-system-round': {
        kind: 'Teh. pase Nr.',
        coatings: {
            polyester: '210-01',
            'matt-pural': '210-02',
            'matt-polyester': '210-03',
            zinc: '210-04'
        }
    },
    'complex-product': {
        kind: 'Teh. pase Nr.',
        coatings: {
            polyester: '400-01',
            'matt-pural': '400-02',
            'matt-polyester': '400-03',
            zinc: '400-04'
        }
    },
    'roofing-fasteners': {
        kind: 'Teh. pase Nr.',
        coatings: {
            polyester: '350-01',
            'matt-pural': '350-02',
            'matt-polyester': '350-03',
            zinc: '350-04'
        }
    },
    'snow-retention': {
        kind: 'EID Nr.',
        coatings: {
            polyester: '500-01',
            'matt-pural': '500-02',
            'matt-polyester': '500-03',
            zinc: '500-04'
        }
    }
};

const VALCPROFIL_MNP_SET = new Set(['SK-VALC-01', 'SK-VALC-02']);
const VALCPROFIL_DOCUMENTS = {
    kind: 'EID Nr.',
    label: 'Valcprofils',
    coatings: {
        polyester: '300-01',
        'matt-pural': '300-02',
        'matt-polyester': '300-03',
        zinc: '300-04'
    }
};

const normalizeKey = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, '-');

const normalizeMnp = (value = '') => String(value || '').trim().toUpperCase();
const normalizeCoating = (value = '') => String(value || '').trim();
const hasMeaningfulCoating = (value = '') => {
    const normalized = normalizeCoating(value);
    return normalized !== '' && normalized !== '-';
};

const safeHtml = (value = '') => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const resolveDocumentDefinition = ({ groupId = '', mnp = '', coating = '' }) => {
    const normalizedCoating = normalizeKey(coating);

    if (!COATING_DOCUMENTS[normalizedCoating]) {
        return null;
    }

    const normalizedMnp = normalizeMnp(mnp);
    if (VALCPROFIL_MNP_SET.has(normalizedMnp)) {
        const number = VALCPROFIL_DOCUMENTS.coatings[normalizedCoating];
        if (!number) return null;

        return {
            label: VALCPROFIL_DOCUMENTS.label,
            coating: COATING_DOCUMENTS[normalizedCoating],
            kind: VALCPROFIL_DOCUMENTS.kind,
            number
        };
    }

    const groupDefinition = GROUP_DOCUMENTS[groupId];
    if (!groupDefinition) {
        return null;
    }

    const number = groupDefinition.coatings[normalizedCoating];
    if (!number) {
        return null;
    }

    return {
        kind: groupDefinition.kind,
        number
    };
};

async function loadProductComplianceMeta(client, items = []) {
    const productIds = [...new Set(
        items
            .map((item) => String(item?._id || '').trim())
            .filter(Boolean)
    )];

    if (productIds.length === 0) {
        return new Map();
    }

    const query = `
        SELECT
            _id,
            js->'data'->>'mnp' AS mnp,
            js->'data'->>'group' AS product_group
        FROM data
        WHERE ref = 'product' AND sid = $1 AND _id = ANY($2)
    `;

    const result = await client.query(query, [sid, productIds]);
    return new Map(result.rows.map((row) => [
        String(row?._id || '').trim(),
        {
            mnp: String(row?.mnp || '').trim(),
            group: String(row?.product_group || '').trim()
        }
    ]));
}

export async function getLatvianComplianceDocumentHtml(client, data = {}) {
    const orderItems = Array.isArray(data?.order?.items)
        ? data.order.items.filter((item) => !isExcludedFromInvoice(item))
        : [];

    if (orderItems.length === 0) {
        return '';
    }

    const distinctCoatings = new Set(
        orderItems
            .map((item) => normalizeCoating(item?.coating || ''))
            .filter((coating) => hasMeaningfulCoating(coating))
            .map((coating) => normalizeKey(coating))
    );
    const shouldShowCoating = distinctCoatings.size > 1;

    const productMetaById = await loadProductComplianceMeta(client, orderItems);
    const groupedEntries = new Map();

    for (const item of orderItems) {
        const productId = String(item?._id || '').trim();
        const productMeta = productMetaById.get(productId) || {};

        const definition = resolveDocumentDefinition({
            groupId: String(item?.group || productMeta.group || '').trim(),
            mnp: String(item?.mnp || productMeta.mnp || '').trim(),
            coating: String(item?.coating || '').trim()
        });

        if (!definition) {
            continue;
        }

        const title = String(item?.title || '').trim();
        const coatingLabel = COATING_DOCUMENTS[normalizeKey(item?.coating || '')] || String(item?.coating || '').trim();
        if (!title) {
            continue;
        }

        const groupKey = `${definition.kind}::${definition.number}`;
        if (!groupedEntries.has(groupKey)) {
            groupedEntries.set(groupKey, {
                kind: definition.kind,
                number: definition.number,
                coating: coatingLabel,
                titles: []
            });
        }

        const entry = groupedEntries.get(groupKey);
        if (entry.titles.includes(title)) {
            continue;
        }

        entry.titles.push(title);
    }

    const entries = [...groupedEntries.values()];

    if (entries.length === 0) {
        return '';
    }

    const list = entries
        .map((entry) => {
            const titleList = entry.titles.map((title) => safeHtml(title)).join(', ');
            const coatingSuffix = shouldShowCoating && entry.coating ? ` (${safeHtml(entry.coating)})` : '';
            return `${titleList}${coatingSuffix}<span style="white-space:nowrap;display:inline-block;vertical-align:baseline;">: ${safeHtml(entry.kind)} ${safeHtml(entry.number)}</span>`;
        })
        .join(' &bull; ');

    return `<div class="privacy-notice" style="margin-top:4px;margin-bottom:8px;font-size:10px;line-height:1.3;"><strong>Izstrādājumiem piemērojamie atbilstības dokumenti:</strong> ${list}. Dokumenti pieejami: <a href="${DOCUMENTATION_URL}" target="_blank" rel="noopener noreferrer" style="color:#000;">${DOCUMENTATION_URL}</a></div>`;
}
