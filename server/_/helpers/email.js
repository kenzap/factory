import nodemailer from 'nodemailer';
import { getDbConnection, log_error, sid } from './index.js';
import { broadcastOrderUpdate } from './order-live-update.js';
import { getSettings } from './settings.js';

/**
 * SMTP email handler script
 * 
 * @param 	{String} 	mail_to			email to
 * @param 	{String} 	mail_from		email from
 * @param 	{String} 	from			from name
 * @param 	{String} 	subject			email subject
 * @param 	{String} 	body			email body
 * @param 	{String} 	attach			attachment files (optional)
 * @param 	{Object} 	options			extra options (optional)
 * @param 	{String} 	options.replyTo	reply-to email (optional)
 * @return 	{Object} 	status			operation success report
 */
export async function send_email(mail_to, mail_from, from, subject, body, attach = [], options = {}) {
    const output = {
        success: true,
        mail_to: mail_to,
        subject: subject
    };

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    let fromName = from;
    if (!fromName) {
        try {
            const settings = await getSettings();
            fromName = settings?.brand_name || '';
        } catch (error) {
            log_error(`Failed to load brand_name setting: ${error.message}`);
        }
    }

    // Mail options
    const mailOptions = {
        from: `${fromName || 'Skarda Design'} <${mail_from}>`,
        to: mail_to,
        subject: subject,
        html: body
    };

    if (options?.replyTo) {
        mailOptions.replyTo = options.replyTo;
    }

    // Add attachments if provided
    if (attach && attach.length > 0) {
        mailOptions.attachments = attach.map(filePath => ({
            filename: filePath.split('/').pop(), // Extract filename from path
            path: filePath,
            contentType: 'application/pdf'
        }));
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        output.send = true;
        output.messageId = info.messageId;
    } catch (error) {

        log_error(`Error sending email: ${error.message} \nsubject: ${subject} \nmail to: ${mail_to} \nserver time: ${Date.now()}`);
    }

    return output;
}

export async function markOrderEmailSent(id, type, email, user, logger) {

    const db = getDbConnection();
    await db.connect();

    try {

        const query_select = `
            SELECT js->'data'->>'${type}' as ${type}
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3
            LIMIT 1
        `;

        const result_select = await db.query(query_select, ['order', sid, id]);
        let data = result_select.rows[0]?.[type] ? JSON.parse(result_select.rows[0][type]) : {};

        data['email_sent_date'] = new Date().toISOString()
        data['email_sent_by_user_id'] = user?.id
        data['email_sent_to'] = email

        const query_update = `
            UPDATE data
            SET js = jsonb_set(js, '{data,${type}}', $4::jsonb)
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3
        `;

        await db.query(query_update, ['order', sid, id, JSON.stringify(data)]);
        await broadcastOrderUpdate(db, id, user);

        logger.info(`Marked email_sent for Order ID: ${id} ${JSON.stringify(data)}`);

    } catch (err) {
        logger.error(`Failed to mark email sent for Order ID: ${id}: ${err.message}`);
    } finally {
        await db.end();
    }
}
