import { chromium } from 'playwright';
// import { authenticateToken } from '../_/helpers/auth.js';
import { getIssuingDate, getManufacturingDate, getWaybillItemsTable, getWaybillNextNumber, getWaybillTotals, removeField } from '../_/helpers/document.js';
import { getDbConnection, getLocale, log, sid } from '../_/helpers/index.js';

/**
 * Waybill PDF Export
 * 
 * @version 1.0
 * @date 2024-08-26
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<string>} - XML string of products
*/
async function viewWaybill(_id, user, lang) {
    const client = getDbConnection();
    await client.connect();

    try {
        const locale = await getLocale(client, sid, lang);

        let settings = {}, order = {}, entity = {};

        // Get settings
        const settingsQuery = `
            SELECT js->'data'->>'currency' as currency, 
                   js->'data'->>'currency_symb' as currency_symb, 
                   js->'data'->>'currency_symb_loc' as currency_symb_loc, 
                   js->'data'->>'tax_calc' as tax_calc, 
                   js->'data'->>'tax_auto_rate' as tax_auto_rate, 
                   js->'data'->>'tax_percent' as tax_percent, 
                   js->'data'->>'tax_display' as tax_display,
                   js->'data'->>'waybill_last_number' as waybill_last_number,
                   js->'data'->>'waybill_document_template' as waybill_document_template 
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
        `;

        const settingsResult = await client.query(settingsQuery, ['3dfactory-settings', sid]);
        if (settingsResult.rows.length > 0) {
            settings = settingsResult.rows[0];
        }

        // Get order details
        const orderQuery = `
            SELECT
                _id,
                js->'data'->'id' as id,
                js->'data'->'eid' as eid,
                js->'data'->'phone' as "phone",
                js->'data'->'address' as "address",
                js->'data'->'draft' as "draft",
                js->'data'->'email' as "email",
                js->'data'->'status' as "status",
                js->'data'->'name' as "name",
                js->'data'->'legal_name' as "legal_name",
                js->'data'->'person' as "person",
                js->'data'->'due_date' as "due_date",
                js->'data'->'notes' as "notes",
                js->'data'->'price' as "price",
                js->'data'->'vat_status' as "vat_status",
                js->'data'->'entity' as "entity",
                js->'data'->'operator' as "operator",
                js->'data'->'waybill' as "waybill",
                js->'data'->'items' as "items"
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
            LIMIT 1
        `;

        const orderResult = await client.query(orderQuery, ['ecommerce-order', sid, _id]);
        if (orderResult.rows) order = orderResult.rows[0] || {};

        console.log('waybill order', order);

        // Get client work 
        const clientQuery = `
            SELECT 
                _id,
                js->'data'->>'name' as name,
                js->'data'->>'email' as email,
                js->'data'->>'type' as "type",
                js->'data'->>'entity' as entity,
                js->'data'->>'legal_name' as "legal_name",
                js->'data'->>'bank_name' as "bank_name",
                js->'data'->>'bank_acc' as "bank_acc",
                js->'data'->>'reg_address' as "reg_address",
                js->'data'->>'reg_number' as "reg_number",
                js->'data'->>'reg_num' as reg_num,
                js->'data'->>'vat_number' as "vat_number",
                js->'data'->>'vat_status' as "vat_status",
                js->'data'->>'notes' as "notes",
                js->'data'->>'phone' as phone,
                js->'data'->'contacts' as contacts,
                js->'data'->'drivers' as drivers,
                js->'data'->'mnf_date' as mnf_date,
                js->'data'->'isu_date' as isu_date
            FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3
        `;

        const entityResult = await client.query(clientQuery, ['3dfactory-entity', sid, order.eid]);
        if (entityResult.rows) entity = entityResult.rows[0] || {};

        console.log('waybill entity', entity);

        let waybill = settings?.waybill_document_template || "";

        let waybill_number = getWaybillNextNumber(settings);

        console.log(`Waybill next number: ${waybill_number}`);

        let manufacturing_date = getManufacturingDate(order);

        console.log(`Manufacturing date: ${manufacturing_date}`);

        let issuing_date = getIssuingDate(order);

        console.log(`Issuing date: ${issuing_date}`);

        let waybill_items_table = getWaybillItemsTable(settings, order);

        let waybill_totals = getWaybillTotals(settings, order);

        order.waybill = order.waybill || { date: new Date().toISOString(), number: waybill_number };

        waybill = order.waybill.date
            ? waybill.replace(/\{\{waybill_date\}\}/g, new Date(order.waybill.date).toLocaleDateString(lang, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }))
            : removeField(waybill, 'waybill_date');

        waybill = order.waybill.date
            ? waybill.replace(/\{\{issue_date\}\}/g, new Date(order.waybill.date).toLocaleDateString(lang, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }))
            : removeField(waybill, 'issue_date');

        waybill = entity.legal_name
            ? waybill.replace(/\{\{client_name\}\}/g, entity.legal_name)
            : removeField(waybill, 'client_name');

        waybill = entity.reg_number
            ? waybill.replace(/\{\{client_reg_number\}\}/g, entity.reg_number)
            : removeField(waybill, 'client_reg_number');

        waybill = entity.vat_number
            ? waybill.replace(/\{\{client_vat_number\}\}/g, entity.vat_number)
            : removeField(waybill, 'client_vat_number');

        waybill = entity.bank_name
            ? waybill.replace(/\{\{client_bank\}\}/g, entity.bank_name)
            : removeField(waybill, 'client_bank');

        waybill = entity.bank_acc
            ? waybill.replace(/\{\{client_bank_acc\}\}/g, entity.bank_acc)
            : removeField(waybill, 'client_bank_acc');

        waybill = entity.bank_code
            ? waybill.replace(/\{\{client_bank_code\}\}/g, entity.bank_code)
            : removeField(waybill, 'client_bank_code');

        waybill = waybill_number
            ? waybill.replace(/\{\{waybill_number\}\}/g, waybill_number)
            : removeField(waybill, 'waybill_number');

        waybill = order.email
            ? waybill.replace(/\{\{client_contact_email\}\}/g, order.email)
            : removeField(waybill, 'client_contact_email');

        waybill = order.phone
            ? waybill.replace(/\{\{client_contact_phone\}\}/g, order.phone)
            : removeField(waybill, 'client_contact_phone');

        waybill = entity.reg_address
            ? waybill.replace(/\{\{client_reg_address\}\}/g, entity.reg_address)
            : removeField(waybill, 'client_reg_address');
        // order.invoice = { number: "test" };
        waybill = order?.invoice?.number
            ? waybill.replace(/\{\{invoice_number\}\}/g, order?.invoice?.number)
            : removeField(waybill, 'invoice_number');

        waybill = order?.id
            ? waybill.replace(/\{\{order_number\}\}/g, order?.id)
            : removeField(waybill, 'order_number');

        waybill = order?.address
            ? waybill.replace(/\{\{delivery_address\}\}/g, order?.address)
            : removeField(waybill, 'delivery_address');

        waybill = manufacturing_date
            ? waybill.replace(/\{\{manufacturing_date\}\}/g, new Date(manufacturing_date).toLocaleDateString(lang, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            }))
            : removeField(waybill, 'manufacturing_date');

        waybill = issuing_date
            ? waybill.replace(/\{\{receiving_date\}\}/g, new Date(issuing_date).toLocaleDateString(lang, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            }))
            : removeField(waybill, 'receiving_date');

        waybill = waybill_items_table
            ? waybill.replace(/\{\{waybill_items_table\}\}/g, waybill_items_table)
            : removeField(waybill, 'waybill_items_table');

        waybill = waybill_totals
            ? waybill.replace(/\{\{waybill_totals\}\}/g, waybill_totals)
            : removeField(waybill, 'waybill_totals');

        waybill = user?.fname
            ? waybill.replace(/\{\{operator_name\}\}/g, user?.fname || '' + ' ' + user?.lname || '')
            : removeField(waybill, 'operator_name');

        // clean up html


        return waybill;

    } finally {
        await client.end();
    }
}

// API route for product export
function viewWaybillApi(app) {

    // app.get('/document/waybill/', authenticateToken, async (req, res) => {
    app.get('/document/waybill/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ error: 'Waybill ID is required' });
            }

            console.log('/document/waybill/', req.user);

            // Generate HTML for waybill
            const html = await viewWaybill(id, req.user, lang);

            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(500); // Ensure content is rendered

            // Take screenshot
            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                type: 'png'
            });

            // Save screenshot to file
            const fs = await import('fs');
            const path = await import('path');
            const screenshotPath = path.join(process.cwd(), '/public/waybill-screenshot.png');
            await fs.promises.writeFile(screenshotPath, screenshotBuffer);

            await page.emulateMedia({ media: 'screen' });
            const pdfBuffer = await page.pdf({
                path: '/app/public/waybill.pdf',
                width: '100px',
                format: 'A4',
                // printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '15mm', right: '15mm' }
            });

            await browser.close();

            // Check if user wants HTML output
            const format = req.query.format || 'pdf';

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            } else {
                res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
                res.setHeader('Content-Disposition', 'filename="waybill.pdf"');
                res.setHeader('Content-Length', pdfBuffer.length);
                res.send(pdfBuffer);
            }

        } catch (err) {
            res.status(500).json({ error: 'Failed to generate document' });
            log(`Failed to generate document: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default viewWaybillApi;