import nodemailer from 'nodemailer';
import { log_error } from './index.js';

/**
 * SMTP email handler script
 * 
 * @param 	{String} 	mail_to			email to
 * @param 	{String} 	mail_from		email from
 * @param 	{String} 	from			from name
 * @param 	{String} 	subject			email subject
 * @param 	{String} 	body			email body
 * @param 	{String} 	attach			attachment files (optional)
 * @return 	{Object} 	status			operation success report
 */
export async function send_email(mail_to, mail_from, from, subject, body, attach = []) {
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

    // Mail options
    const mailOptions = {
        from: `${from || 'Skarda Design'} <${mail_from}>`,
        to: mail_to,
        subject: subject,
        html: body
    };

    // Add reply-to for specific email
    if (mail_from === 'no-reply@skarda.design') {
        mailOptions.replyTo = 'info@skarda.design';
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