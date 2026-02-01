
import { sid } from '../index.js';
import { formatClientName } from '../order.js';
import { clearSettingsCache } from '../settings.js';

export async function getDocumentData(client, type, _id, user, locale) {

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
                       js->'data'->>'tax_region' as tax_region,
                       js->'data'->>'vat_number' as vat_number,
                       js->'data'->>'discount_visibility' as discount_visibility,
                       js->'data'->>'waybill_last_number' as waybill_last_number,
                       js->'data'->>'waybill_anulled_list' as waybill_anulled_list,
                       js->'data'->>'groups' as groups,
                       js->'data'->>$3 as document_template
                FROM data 
                WHERE ref = $1 AND sid = $2
                LIMIT 1
            `;

    const settingsResult = await client.query(settingsQuery, ['settings', sid, type + '_document_template']);
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
                js->'data'->'invoice' as "invoice",
                js->'data'->'items' as "items"
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 AND js->'data'->'deleted' IS NULL
            LIMIT 1
        `;

    const orderResult = await client.query(orderQuery, ['order', sid, _id]);
    if (orderResult.rows) order = orderResult.rows[0] || {};

    // console.log('waybill order', order);

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
                js->'data'->'drivers' as drivers
            FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3
        `;

    const entityResult = await client.query(clientQuery, ['entity', sid, order.eid]);
    if (entityResult.rows) entity = entityResult.rows[0] || {};

    return {
        settings,
        order,
        entity
    };
}

export async function updateWaybillNumber(db, order) {

    console.log(`updateWaybillNumber: ${order.id}, waybill_number: ${order.waybill.number}`);

    let waybill = order.waybill || {};

    // Update entire waybill object in the database
    const query = `
            UPDATE data
            SET js = jsonb_set(js, '{data,waybill}', $1::jsonb)
            WHERE ref = 'order' AND sid = $2 AND js->'data'->>'id' = $3
            RETURNING _id
        `;

    let response = await db.query(query, [JSON.stringify(waybill), sid, order.id]);

    return response.rows[0] ? response.rows[0]._id : null;
}

export async function updateInvoiceNumber(db, order) {

    let invoice = order.invoice || {};

    // Update entire waybill object in the database
    const query = `
            UPDATE data
            SET js = jsonb_set(js, '{data,invoice}', $1::jsonb)
            WHERE ref = 'order' AND sid = $2 AND js->'data'->>'id' = $3
            RETURNING _id
        `;

    let response = await db.query(query, [JSON.stringify(invoice), sid, order.id]);

    return response.rows[0] ? response.rows[0]._id : null;
}

export function removeField(waybill, fieldName) {

    // Create a regex pattern to match the entire <p> tag with the specified id
    const regex = new RegExp(`<p\\s+id="${fieldName}"[^>]*>.*?</p>`, 'gi');
    waybill = waybill.replace(regex, '');

    return waybill;
}

export function getManufacturingDate(order) {

    // console.log(order.items);

    // Extract manufacturing date from order
    if (!order?.items && order.items.length == 0) return '';

    let latestDate = null;
    for (const orderItem of order.items) {
        if (orderItem?.inventory?.rdy_date) {
            const currentDate = new Date(orderItem.inventory.rdy_date);
            if (!latestDate || currentDate > latestDate) {
                latestDate = currentDate;
            }
        }
    }
    return latestDate;
}

export function getIssuingDate(order) {

    // Extract manufacturing date from order
    if (!order?.items && order.items.length == 0) return '';

    let latestDate = null;
    for (const orderItem of order.items) {
        if (orderItem?.inventory?.isu_date) {
            const currentDate = new Date(orderItem.inventory.isu_date);
            if (!latestDate || currentDate > latestDate) {
                latestDate = currentDate;
            }
        }
    }
    return latestDate;
}

export async function getInvoiceNextNumber(db, order, settings, user) {

    // number already issued
    if (order?.invoice && order?.invoice?.number) return order.invoice;

    order.invoice = {
        number: order.id,
        date: new Date().toISOString(),
        user_id: user?.id || null
    }

    await updateInvoiceNumber(db, { id: order.id, invoice: order.invoice });

    return order.invoice;
}

export async function getWaybillNextNumber(db, order, settings, user) {

    // number already issued
    if (order?.waybill && order?.waybill?.number) return order.waybill;

    // get number from annulled list if present
    if (settings.waybill_anulled_list && settings.waybill_anulled_list.trim()) {
        const annulledNumbers = settings.waybill_anulled_list.trim().split('\n').filter(num => num.trim());
        if (annulledNumbers.length > 0) {

            // Use the last annulled number and remove it from the list
            const reusedNumber = annulledNumbers.pop().trim();
            settings.waybill_anulled_list = annulledNumbers.join('\n');

            order.waybill = {
                number: reusedNumber,
                amount: order.price ? order.price.grand_total : null,
                date: new Date().toISOString(),
                user_id: user?.id || null
            }

            await updateWaybillNumber(db, { id: order.id, waybill: order.waybill });

            // Update settings with the new annulled list
            const updateSettingsQuery = `
                UPDATE data
                SET js = jsonb_set(js, '{data,waybill_anulled_list}', $1::jsonb)
                WHERE ref = 'settings' AND sid = $2
            `;
            await db.query(updateSettingsQuery, [JSON.stringify(settings.waybill_anulled_list), sid]);

            // console.log(`Reused annulled waybill number: ${reusedNumber}`);
            // console.log('Updated annulled list:', settings.waybill_anulled_list);

            return order.waybill;
        }
    }

    // generate new waybill number
    let waybill_prefix;
    let waybill_next_number;
    const prefixMatch = settings.waybill_last_number.toString().match(/^([^-]+)/);
    waybill_prefix = prefixMatch ? prefixMatch[1] : '';

    // Extract numeric part from waybill format (SKA-224261) and increment by 1
    if (settings.waybill_last_number) {
        const match = settings.waybill_last_number.toString().match(/(\d+)$/);
        if (match) {
            const numericPart = parseInt(match[1]);
            settings.waybill_last_number = numericPart + 1;
        } else {
            settings.waybill_last_number = 1;
        }
    } else {
        settings.waybill_last_number = 1;
    }
    waybill_next_number = settings.waybill_last_number ? parseInt(settings.waybill_last_number) : 0;

    order.waybill = {
        number: waybill_prefix + "-" + waybill_next_number,
        amount: order.price ? order.price.grand_total : null,
        date: new Date().toISOString(),
        user_id: user?.id || null
    }

    // Update settings waybill_last_number
    const settingsQuery = `
            UPDATE data
            SET js = jsonb_set(js, '{data,waybill_last_number}', $1::jsonb)
            WHERE ref = 'settings' AND sid = $2
        `;

    // when waybill is annulled this request is skipped
    if (order.waybill.number) await db.query(settingsQuery, [JSON.stringify(order.waybill.number), sid]);

    await updateWaybillNumber(db, { id: order.id, waybill: order.waybill });

    // Clear settings cache
    clearSettingsCache();

    return order.waybill;
}

export const parseDocument = (document, data) => {

    // Replace placeholders in the document template
    document = data.order?.waybill?.date
        ? document.replace(/\{\{waybill_date\}\}/g, new Date(data.order.waybill.date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'waybill_date');

    document = data.order?.waybill?.date
        ? document.replace(/\{\{issue_date\}\}/g, new Date(data.order.waybill.date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'issue_date');

    document = data.entity.legal_name
        ? document.replace(/\{\{client_name\}\}/g, data.entity.legal_name)
        : removeField(document, 'client_name');

    document = data.entity.legal_name
        ? document.replace(/\{\{client_name_formatted\}\}/g, formatClientName(data.entity))
        : removeField(document, 'client_name_formatted');

    document = data.entity.reg_number
        ? document.replace(/\{\{client_reg_number\}\}/g, data.entity.reg_number)
        : removeField(document, 'client_reg_number');

    document = data.entity.vat_number
        ? document.replace(/\{\{client_vat_number\}\}/g, data.entity.vat_number)
        : removeField(document, 'client_vat_number');

    document = data.entity.bank_name
        ? document.replace(/\{\{client_bank\}\}/g, data.entity.bank_name)
        : removeField(document, 'client_bank');

    document = data.entity.bank_acc
        ? document.replace(/\{\{client_bank_acc\}\}/g, data.entity.bank_acc)
        : removeField(document, 'client_bank_acc');

    document = data.entity.bank_code
        ? document.replace(/\{\{client_bank_code\}\}/g, data.entity.bank_code)
        : removeField(document, 'client_bank_code');

    document = data.order?.waybill?.number
        ? document.replace(/\{\{waybill_number\}\}/g, data.order.waybill.number)
        : removeField(document, 'waybill_number');

    document = data.order.email
        ? document.replace(/\{\{client_contact_email\}\}/g, data.order.email)
        : removeField(document, 'client_contact_email');

    document = data.order.phone
        ? document.replace(/\{\{client_contact_phone\}\}/g, data.order.phone)
        : removeField(document, 'client_contact_phone');

    document = data.entity.reg_address
        ? document.replace(/\{\{client_reg_address\}\}/g, data.entity.reg_address)
        : removeField(document, 'client_reg_address');

    document = data.order?.invoice?.number
        ? document.replace(/\{\{invoice_number\}\}/g, data.order?.invoice?.number)
        : removeField(document, 'invoice_number');

    document = data.order?.id
        ? document.replace(/\{\{order_number\}\}/g, data.order?.id)
        : removeField(document, 'order_number');

    document = data.order?.notes
        ? document.replace(/\{\{order_notes\}\}/g, data.order?.notes)
        : removeField(document, 'order_notes');

    document = new Date().toLocaleDateString(data.lang, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
        ? document.replace(/\{\{today_date\}\}/g, new Date().toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'today_date');

    document = data.order?.address
        ? document.replace(/\{\{delivery_address\}\}/g, data.order?.address)
        : removeField(document, 'delivery_address');

    document = data.order?.manufacturing_date
        ? document.replace(/\{\{manufacturing_date\}\}/g, new Date(data.order?.manufacturing_date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }))
        : removeField(document, 'manufacturing_date');

    document = data.order?.due_date
        ? document.replace(/\{\{due_date\}\}/g, new Date(data.order?.due_date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }))
        : removeField(document, 'due_date');

    document = data.issuing_date
        ? document.replace(/\{\{receiving_date\}\}/g, new Date(data.issuing_date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }))
        : removeField(document, 'receiving_date');

    document = data?.waybill_items_table
        ? document.replace(/\{\{waybill_items_table\}\}/g, data.waybill_items_table)
        : removeField(document, 'waybill_items_table');

    document = data?.production_items_table
        ? document.replace(/\{\{production_items_table\}\}/g, data.production_items_table)
        : removeField(document, 'production_items_table');

    document = data?.waybill_totals
        ? document.replace(/\{\{waybill_totals\}\}/g, data.waybill_totals)
        : removeField(document, 'waybill_totals');

    document = data.user?.fname
        ? document.replace(/\{\{operator_name\}\}/g, data.user?.fname || '' + ' ' + data.user?.lname || '')
        : removeField(document, 'operator_name');

    // invoice specific fields
    document = data.order.waybill?.number
        ? document.replace(/\{\{invoice_number\}\}/g, data.order.waybill.number)
        : removeField(document, 'invoice_number');

    document = data.order.invoice?.number
        ? document.replace(/\{\{invoice_date\}\}/g, new Date(data.order?.invoice?.date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'invoice_date');

    document = data?.invoice_items_table
        ? document.replace(/\{\{invoice_items_table\}\}/g, data.invoice_items_table)
        : removeField(document, 'invoice_items_table');

    document = data?.invoice_totals
        ? document.replace(/\{\{invoice_totals\}\}/g, data.invoice_totals)
        : removeField(document, 'invoice_totals');


    return document;
}