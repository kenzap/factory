import { send_email } from './email.js';
import { getSettings } from './settings.js';
import { TASK_ACTIVE_STATUSES } from './task.js';
import { normalizeTimezoneOrUtc } from './timezone.js';

const DEFAULT_SUBJECT = 'New task assigned: {{task_title}}';
const DEFAULT_TEMPLATE = [
    'Hello {{user_first_name}},<br><br>',
    'You were assigned to task <strong>{{task_title}}</strong>.<br><br>',
    '{{task_date_block}}',
    '{{task_priority_block}}',
    '{{task_category_block}}',
    '{{task_notes_block}}',
    '{{tasks_link_block}}',
    'An .ics calendar event is attached when the task has a scheduled date.<br><br>',
    'Regards,<br>',
    '{{brand_name}}'
].join('');

const DEFAULT_EVENT_DURATION_MINUTES = 60;

const escapeHtml = (value = '') => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeIcsText = (value = '') => String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const applyTemplate = (template = '', vars = {}) => String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return vars[key] ?? '';
});

const formatUtcIcsDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
};

const formatIcsDateOnly = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const taskHasExplicitTime = (task = {}) => {
    if (typeof task?.date_has_time === 'boolean') return task.date_has_time;
    if (typeof task?.date_has_time === 'string') {
        if (task.date_has_time === 'true') return true;
        if (task.date_has_time === 'false') return false;
    }

    const raw = String(task?.due_date || '').trim();
    if (!raw || !raw.includes('T')) return false;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return false;

    return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0;
};

const formatTaskPriority = (priority = '') => {
    const normalized = String(priority || '').toLowerCase();
    if (normalized === 'high') return 'High';
    if (normalized === 'low') return 'Low';
    return 'Medium';
};

const formatTaskStatus = (status = '') => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'in_progress') return 'In Progress';
    if (normalized === 'waiting') return 'Waiting';
    if (normalized === 'done') return 'Done';
    if (normalized === 'canceled') return 'Canceled';
    return 'Open';
};

const resolveFirstName = (user = {}) => {
    const name = String(user?.fname || '').trim();
    if (name) return name;

    const email = String(user?.email || '').trim();
    return email ? email.split('@')[0] : 'there';
};

const buildTasksLink = (settings = {}) => {
    const domain = String(settings?.domain_name || '').trim();
    return domain ? `https://${domain}/tasks/` : '';
};

const resolveTaskLocale = (settings = {}) => String(settings?.system_language || 'en').trim() || 'en';

const resolveTaskTimezone = (settings = {}) => normalizeTimezoneOrUtc(settings?.default_timezone);

const formatTaskDateLabel = (task = {}, settings = {}) => {
    const value = task?.due_date || '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const locale = resolveTaskLocale(settings);
    const timeZone = resolveTaskTimezone(settings);

    if (!taskHasExplicitTime(task)) {
        return new Intl.DateTimeFormat(locale, {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    }

    return new Intl.DateTimeFormat(locale, {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    }).format(date);
};

const hasTaskScheduleChanged = (task = {}, previousTask = null) => {
    if (!previousTask) return false;

    const previousDueDate = String(previousTask?.due_date || previousTask?.remind_at || '').trim();
    const currentDueDate = String(task?.due_date || task?.remind_at || '').trim();

    return previousDueDate !== currentDueDate
        || taskHasExplicitTime(previousTask) !== taskHasExplicitTime(task);
};

const buildIcsAttachment = (task = {}, recipient = {}, settings = {}) => {
    if (!task?.due_date) return null;

    const start = new Date(task.due_date);
    if (Number.isNaN(start.getTime())) return null;

    const hasTime = taskHasExplicitTime(task);
    const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000);
    const uid = `task-${task._id || task.id || Date.now()}@${String(settings?.domain_name || 'skarda.design').replace(/^https?:\/\//, '')}`;
    const organizerEmail = String(settings?.task_assignment_email_from || settings?.documents_email_from || process.env.SMTP_USER || process.env.ADMIN_EMAIL || '').trim();
    const organizerName = String(settings?.brand_name || 'Skarda Design').trim();
    const descriptionParts = [
        task?.description ? `Description: ${task.description}` : '',
        task?.notes ? `Notes: ${task.notes}` : '',
        `Status: ${formatTaskStatus(task?.status)}`,
        `Priority: ${formatTaskPriority(task?.priority)}`,
        task?.category ? `Category: ${task.category}` : '',
        buildTasksLink(settings) ? `Open tasks: ${buildTasksLink(settings)}` : ''
    ].filter(Boolean);

    const lines = [
        'BEGIN:VCALENDAR',
        'PRODID:-//Skarda Design//Factory Tasks//EN',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatUtcIcsDate(new Date())}`,
        `SUMMARY:${escapeIcsText(task?.title || 'Task')}`,
        `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
        'STATUS:CONFIRMED',
        `SEQUENCE:${Math.max(0, Math.floor(new Date(task?.updated_at || task?.created_at || Date.now()).getTime() / 1000) || 0)}`
    ];

    if (hasTime) {
        lines.splice(8, 0,
            `DTSTART:${formatUtcIcsDate(start)}`,
            `DTEND:${formatUtcIcsDate(end)}`
        );
    } else {
        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + 1);
        lines.splice(8, 0,
            `DTSTART;VALUE=DATE:${formatIcsDateOnly(start)}`,
            `DTEND;VALUE=DATE:${formatIcsDateOnly(endDate)}`
        );
    }

    if (organizerEmail) {
        lines.push(`ORGANIZER;CN=${escapeIcsText(organizerName)}:MAILTO:${organizerEmail}`);
    }

    if (recipient?.email) {
        lines.push(`ATTENDEE;CN=${escapeIcsText(resolveFirstName(recipient))};RSVP=TRUE:MAILTO:${recipient.email}`);
    }

    lines.push('END:VEVENT', 'END:VCALENDAR');

    return {
        filename: `task-${task.id || task._id || 'event'}.ics`,
        content: `${lines.join('\r\n')}\r\n`,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST'
    };
};

export async function sendTaskAssignmentEmails(task = {}, previousTask = null, actor = null, logger = console) {
    const assignedUsers = Array.isArray(task?.assigned_users) ? task.assigned_users : [];
    if (!assignedUsers.length) return { sent: 0, skipped: 0 };

    if (!TASK_ACTIVE_STATUSES.has(String(task?.status || '').toLowerCase())) {
        return { sent: 0, skipped: assignedUsers.length };
    }

    const previousAssignedUsers = Array.isArray(previousTask?.assigned_users) ? previousTask.assigned_users : [];
    const previousIds = new Set(previousAssignedUsers.map((user) => String(user?.id || user?._id || '').trim()).filter(Boolean));
    const scheduleChanged = hasTaskScheduleChanged(task, previousTask);
    const recipients = assignedUsers.filter((user) => {
        const id = String(user?.id || user?._id || '').trim();
        const email = String(user?.email || '').trim();
        if (!id || !email) return false;
        if (!previousIds.has(id)) return true;
        return Boolean(task?.due_date) && scheduleChanged;
    });

    if (!recipients.length) return { sent: 0, skipped: 0 };

    const settings = await getSettings();
    const tasksLink = buildTasksLink(settings);
    const subjectTemplate = settings?.task_assignment_email_subject || DEFAULT_SUBJECT;
    const bodyTemplate = settings?.task_assignment_email_template || DEFAULT_TEMPLATE;
    const fromEmail = String(settings?.task_assignment_email_from || settings?.documents_email_from || process.env.SMTP_USER || process.env.ADMIN_EMAIL || '').trim();
    const fromName = String(settings?.brand_name || 'Skarda Design').trim();
    const replyTo = String(settings?.task_assignment_email_reply_to || settings?.documents_email_reply_to || '').trim();
    const actorName = actor?.fname ? `${actor.fname}${actor?.lname ? ` ${actor.lname}` : ''}`.trim() : '';
    const taskDate = formatTaskDateLabel(task, settings);

    if (!fromEmail) {
        logger.warn?.('task-assignment-email: no from email configured, skipping task assignment emails');
        return { sent: 0, skipped: recipients.length };
    }

    let sent = 0;
    let skipped = 0;

    for (const recipient of recipients) {
        const vars = {
            brand_name: escapeHtml(fromName),
            user_first_name: escapeHtml(resolveFirstName(recipient)),
            task_title: escapeHtml(task?.title || 'Task'),
            task_id: escapeHtml(task?.id || ''),
            task_status: escapeHtml(formatTaskStatus(task?.status)),
            task_priority: escapeHtml(formatTaskPriority(task?.priority)),
            task_category: escapeHtml(task?.category || ''),
            task_notes: escapeHtml(task?.notes || ''),
            task_date: escapeHtml(taskDate),
            tasks_link: escapeHtml(tasksLink),
            assigned_by: escapeHtml(actorName),
            task_date_block: taskDate ? `Date: ${escapeHtml(taskDate)}<br>` : '',
            task_priority_block: `Priority: ${escapeHtml(formatTaskPriority(task?.priority))}<br>`,
            task_category_block: task?.category ? `Category: ${escapeHtml(task.category)}<br>` : '',
            task_notes_block: task?.notes ? `Notes: ${escapeHtml(task.notes)}<br><br>` : '<br>',
            tasks_link_block: tasksLink ? `Open tasks: <a href="${escapeHtml(tasksLink)}">${escapeHtml(tasksLink)}</a><br><br>` : ''
        };

        const attachment = buildIcsAttachment(task, recipient, settings);
        const result = await send_email(
            recipient.email,
            fromEmail,
            fromName,
            applyTemplate(subjectTemplate, vars),
            applyTemplate(bodyTemplate, vars),
            attachment ? [attachment] : [],
            { replyTo }
        );

        if (result?.send === true) {
            sent += 1;
            logger.info?.(`task-assignment-email: sent task #${task?.id || task?._id} assignment email to ${recipient.email}`);
        } else {
            skipped += 1;
            logger.error?.(`task-assignment-email: failed sending task #${task?.id || task?._id} assignment email to ${recipient.email}`);
        }
    }

    return { sent, skipped };
}

export default sendTaskAssignmentEmails;
