import { getDbConnection, getMinPrice, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

/**
 * 3D Factory Product Export API
 *
 * Extract product data from Factory database stored under product key and export it in XML format.
 * Used by salidzini.lv and kurpirkt.lv to import product data to their search engine.
 *
 * @version 1.0
 * @date 2024-08-26
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<string>} - XML string of products
*/
async function exportProductsXML(lang) {
    const client = getDbConnection();
    await client.connect();

    try {
        const locale = await getLocale({ 'locale': lang, 'locale-checksum': '' });
        const state = { settings: {}, sk_settings: {} };

        // Get ecommerce settings
        const ecommerceQuery = `
            SELECT js->'data'->>'currency' as currency, 
                   js->'data'->>'currency_symb' as currency_symb, 
                   js->'data'->>'currency_symb_loc' as currency_symb_loc, 
                   js->'data'->>'tax_calc' as tax_calc, 
                   js->'data'->>'tax_auto_rate' as tax_auto_rate, 
                   js->'data'->>'tax_rate' as tax_rate, 
                   js->'data'->>'tax_display' as tax_display 
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
        `;

        const ecommerceResult = await client.query(ecommerceQuery, ['settings', sid]);
        if (ecommerceResult.rows.length > 0) {
            const row = ecommerceResult.rows[0];
            state.settings = {
                currency: row.currency,
                currency_symb: row.currency_symb,
                currency_symb_loc: row.currency_symb_loc,
                tax_auto_rate: row.tax_auto_rate,
                tax_rate: row.tax_rate,
                tax_display: row.tax_display
            };
        }

        // Get 3D factory settings
        const factoryQuery = `
            SELECT js->'data'->>'price' as price 
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
        `;

        const factoryResult = await client.query(factoryQuery, ['settings', sid]);
        if (factoryResult.rows.length > 0) {
            const row = factoryResult.rows[0];
            state.sk_settings = {
                price: row.price ? JSON.parse(row.price) : []
            };
        }

        // XML header
        let items = "<?xml version='1.0' encoding='utf-8' ?>\n<root>";

        // Get products
        const productsQuery = `
            SELECT _id, 
                   js->'data'->'locales'->$1->>'title' as title,
                   js->'data'->'slugs'->>$1 as slug,
                   js->'data'->>'cats' as cats, 
                   js->'data'->>'input_fields' as input_fields, 
                   js->'data'->>'calc_price' as calc_price, 
                   js->'data'->>'var_price' as var_price, 
                   js->'data'->>'formula' as formula, 
                   js->'data'->>'formula_price' as formula_price, 
                   js->'data'->>'cad_files' as cad_files 
            FROM data 
            WHERE ref = $2 AND js->'data'->>'status' = '1' AND js->'data'->'slugs'->>$1 <> ''
            LIMIT 1000
        `;

        const productsResult = await client.query(productsQuery, [lang, 'product']);

        for (const row of productsResult.rows) {
            const id = row._id;
            let title = row.title;
            const slug = row.slug;
            title = locale[title] || title;
            const link = `https://skarda.design/${lang}/${slug}`;

            const item = {
                title: title,
                var_price: row.var_price ? JSON.parse(row.var_price) : [],
                calc_price: row.calc_price,
                formula: row.formula,
                formula_price: row.formula_price,
                input_fields: row.input_fields ? JSON.parse(row.input_fields) : [],
                cad_files: row.cad_files ? JSON.parse(row.cad_files) : []
            };

            const price = getMinPrice(state, item);
            const image = item.cad_files.length ?
                `https://cdn.skarda.design/${id}-polyester-2h3-1500.webp` :
                `https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S${sid}/sketch-${id}-1-1000.jpeg`;

            const cats = JSON.parse(row.cats || '[]');
            let category = cats.length > 0 ? cats[0] : "Skārda Izstrādājumi";
            category = locale[category] || category;
            const category_link = `https://skarda.design/?lang=lv&s=${encodeURIComponent(category)}`;
            let color = "Antracīts 2H3";
            let manufacturer = "Skārda Design";

            // Exceptions
            if (category === "Instruments" || category === "Instrumenti") {
                color = "";
                manufacturer = "";
            }

            if (price === 0) continue;

            // Escape XML special characters
            const escapeXml = (str) => {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            };

            items += `
            <item>
                <name>${escapeXml(title)}</name>
                <link>${escapeXml(link)}</link>
                <price>${price}</price>
                <image>${escapeXml(image)}</image>
                <manufacturer>Skārda Design</manufacturer>
                <color>${escapeXml(color)}</color>
                <category>${escapeXml(category)}</category>
                <category_link>${escapeXml(category_link)}</category_link>
                <in_stock>1</in_stock>
            </item>`;
        }

        items += "\n</root>";
        return items;

    } finally {
        await client.end();
    }
}

// API route for product export
function exportProductsApi(app) {
    console.log('Export Products API initialized');

    app.get('/api/export-products/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const xml = await exportProductsXML(lang);

            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.send(xml);
        } catch (err) {

            res.status(500).json({ error: 'Failed to export products' });
            log(`Error exporting products: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default exportProductsApi;