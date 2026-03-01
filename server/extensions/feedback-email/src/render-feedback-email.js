const DEFAULT_SUBJECT = 'Vai viss kartībā? #{{order_id}}';
const DEFAULT_TEMPLATE = [
    'Sveiki, {{client_first_name}}!<br><br>',
    'Lūdzu, novērtējiet mūsu pakalpojumus un produktus.<br><br>',
    '<a href="{{review_link}}">Atstājiet atsauksmi par pasūtījumu #{{order_id}}</a>.<br><br>',
    'Ar cieņu,<br>',
    'Skarda Design'
].join('');

const resolveFirstName = (name = '') => {
    const cleanName = String(name || '').trim();
    if (!cleanName) return '';
    return cleanName.split(/\s+/)[0];
};

const applyTemplate = (template, vars) => {
    return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        return vars[key] ?? '';
    });
};

export const renderFeedbackEmail = (order, settings = {}) => {
    const domain = settings?.domain_name ? `https://${settings.domain_name}` : 'https://skarda.design';
    const reviewLink = `${domain}/review/?order=${encodeURIComponent(order._id)}&lang=lv`;
    const firstName = resolveFirstName(order?.name);
    const subjectTemplate = settings?.ask_feedback_order_client_email_subject || DEFAULT_SUBJECT;
    const bodyTemplate = settings?.ask_feedback_order_client_email_template || DEFAULT_TEMPLATE;
    const vars = {
        order_id: order?.id || '',
        order_link: reviewLink,
        review_link: reviewLink,
        client_first_name: firstName,
        client_name: order?.name || ''
    };

    const fallbackGreeting = firstName ? `Sveiki, ${firstName}!` : 'Sveiki!';
    const body = applyTemplate(bodyTemplate, vars);

    return {
        to: order?.email || '',
        fromEmail: 'no-reply@skarda.design',
        fromName: settings?.brand_name || 'Skarda Design',
        subject: applyTemplate(subjectTemplate, vars),
        body: body || `${fallbackGreeting}<br><br>Lūdzu, novērtējiet mūsu pakalpojumus un produktus.<br><br><a href="${reviewLink}">Atstājiet atsauksmi par pasūtījumu #${vars.order_id}</a>.<br><br>Ar cieņu,<br>Skarda Design`,
        reviewLink
    };
};

export default renderFeedbackEmail;
