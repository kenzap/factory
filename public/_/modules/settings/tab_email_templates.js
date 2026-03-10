import { __html } from "../../helpers/global.js";

export class TabCommunications {

    constructor(settings, editors) {

        this.settings = settings;
        this.editors = editors || {};

        this.tab();

        this.init();
    }

    tab = () => {

        document.querySelector('tab-communications').innerHTML = /*html*/`
            <div>
                <h4 id="h-communications" class="card-title mb-4">${__html('Communications')}</h4>
                <h5 id="h-email-templates" class="card-title mb-4">${__html('Email Templates')}</h5>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Document email')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="documents_email_from" type="email" class="form-control inp" name="documents_email_from" data-type="email" placeholder="invoice@yourdomain.com">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="documents_email_reply_to" type="email" class="form-control inp" name="documents_email_reply_to" data-type="email" placeholder="info@yourdomain.com">
                                        </div>
                                    </div>
                                </div>
                                <p class="form-text">${__html('Used as fallback for invoice, waybill, quotation, production slip and packing list emails.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('New order client email')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="new_order_client_email_subject" type="text" class="form-control inp" name="new_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="new_order_client_email_from" type="email" class="form-control inp" name="new_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="new_order_client_email_reply_to" type="email" class="form-control inp" name="new_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="new_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="new_order_client_email_template-" type="text" class="form-control d-none" name="new_order_client_email_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('New order manager email')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="new_order_manager_email_subject" type="text" class="form-control inp" name="new_order_manager_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="new_order_manager_email_from" type="email" class="form-control inp" name="new_order_manager_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="new_order_manager_email_reply_to" type="email" class="form-control inp" name="new_order_manager_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="new_order_manager_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="new_order_manager_email_template-" type="text" class="form-control d-none" name="new_order_manager_email_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Email List to Notify')}</label>
                                            <input id="new_order_manager_email_list" type="text" class="form-control inp" name="new_order_manager_email_list" data-type="email">
                                            <p class="form-text">${__html('List of email addresses (e.g., john@example.com, alex@example.com).')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Client\'s order is in production.')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="production_order_client_email_subject" type="text" class="form-control inp" name="production_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="production_order_client_email_from" type="email" class="form-control inp" name="production_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="production_order_client_email_reply_to" type="email" class="form-control inp" name="production_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="production_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="production_order_client_email_template-" type="text" class="form-control d-none" name="production_order_client_email_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Client\'s order is paid.')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="paid_order_client_email_subject" type="text" class="form-control inp" name="paid_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="paid_order_client_email_from" type="email" class="form-control inp" name="paid_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="paid_order_client_email_reply_to" type="email" class="form-control inp" name="paid_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="paid_order_client_email_subject_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="paid_order_client_email_subject_template-" type="text" class="form-control d-none" name="paid_order_client_email_subject_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Client\'s order is canceled.')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="canceled_order_client_email_subject" type="text" class="form-control inp" name="canceled_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="canceled_order_client_email_from" type="email" class="form-control inp" name="canceled_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="canceled_order_client_email_reply_to" type="email" class="form-control inp" name="canceled_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="canceled_order_client_email_subject_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="canceled_order_client_email_subject_template-" type="text" class="form-control d-none" name="canceled_order_client_email_subject_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Client\'s order is refunded.')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="refunded_order_client_email_subject" type="text" class="form-control inp" name="refunded_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="refunded_order_client_email_from" type="email" class="form-control inp" name="refunded_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="refunded_order_client_email_reply_to" type="email" class="form-control inp" name="refunded_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="refunded_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="refunded_order_client_email_template-" type="text" class="form-control d-none" name="refunded_order_client_email_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Client\'s order is ready for pickup.')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="pickup_ready_order_client_email_subject" type="text" class="form-control inp" name="pickup_ready_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="pickup_ready_order_client_email_from" type="email" class="form-control inp" name="pickup_ready_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="pickup_ready_order_client_email_reply_to" type="email" class="form-control inp" name="pickup_ready_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="pickup_ready_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="pickup_ready_order_client_email_template-" type="text" class="form-control d-none" name="pickup_ready_order_client_email_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Client\'s order ask feedback.')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="ask_feedback_order_client_email_subject" type="text" class="form-control inp" name="ask_feedback_order_client_email_subject" data-type="text">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="ask_feedback_order_client_email_from" type="email" class="form-control inp" name="ask_feedback_order_client_email_from" data-type="email">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="ask_feedback_order_client_email_reply_to" type="email" class="form-control inp" name="ask_feedback_order_client_email_reply_to" data-type="email">
                                        </div>
                                    </div>
                                </div>
                                <div id="ask_feedback_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="ask_feedback_order_client_email_template-" type="text" class="form-control d-none" name="ask_feedback_order_client_email_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('OTP email settings')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="otp_email_from" type="email" class="form-control inp" name="otp_email_from" data-type="email" placeholder="otp@yourdomain.com">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="otp_email_reply_to" type="email" class="form-control inp" name="otp_email_reply_to" data-type="email" placeholder="support@yourdomain.com">
                                        </div>
                                    </div>
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="otp_email_subject" type="text" class="form-control inp" name="otp_email_subject" data-type="text" placeholder="One Time Password">
                                        </div>
                                    </div>
                                </div>
                                <p class="form-text">${__html('Used for one-time-password emails during authentication.')}</p>
                            </div>
                        </div>
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Logger email settings')}</label>
                            <div class="col-sm-9">
                                <div class="row">
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('To email')}</label>
                                            <input id="logger_email_to" type="email" class="form-control inp" name="logger_email_to" data-type="email" placeholder="admin@yourdomain.com">
                                        </div>
                                    </div>
                                    <div class="col-lg-8">

                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('From email')}</label>
                                            <input id="logger_email_from" type="email" class="form-control inp" name="logger_email_from" data-type="email" placeholder="no-reply@yourdomain.com">
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Reply-to')}</label>
                                            <input id="logger_email_reply_to" type="email" class="form-control inp" name="logger_email_reply_to" data-type="email" placeholder="support@yourdomain.com">
                                        </div>
                                    </div>
                                    <div class="col-lg-8">
                                        <div class="form-group mb-3">
                                            <label class="col-form-label">${__html('Subject')}</label>
                                            <input id="logger_email_subject" type="text" class="form-control inp" name="logger_email_subject" data-type="text" placeholder="Error in {scope}">
                                        </div>
                                    </div>
                                </div>
                                <p class="form-text">${__html('Used for automatic error reports when logger.error is triggered. If To email is empty, ADMIN_EMAIL env value is used.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="my-4">
                <h5 id="h-whatsapp-templates" class="card-title mb-4">${__html('WhatsApp Templates')}</h5>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('New order admin WhatsApp message')}</label>
                            <div class="col-sm-9">
                                <textarea id="new_order_admin_whatsapp_template" class="form-control inp" name="new_order_admin_whatsapp_template" data-type="textarea" rows="6" placeholder="New order #{{order_id}} from {{client_name}}. View: {{order_link}}"></textarea>
                                <p class="form-text">${__html('Available dynamic fields include: {{order_id}}, {{order_link}}, {{client_name}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Order ready WhatsApp message')}</label>
                            <div class="col-sm-9">
                                <textarea id="pickup_ready_order_client_whatsapp_template" class="form-control inp" name="pickup_ready_order_client_whatsapp_template" data-type="textarea" rows="6" placeholder="Sveiki, {{client_first_name}}! Pasūtījums #{{order_id}} ir gatavs saņemšanai."></textarea>
                                <p class="form-text">${__html('Available dynamic fields include: {{order_id}}, {{order_link}}, {{client_name}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Ask feedback WhatsApp message')}</label>
                            <div class="col-sm-9">
                                <textarea id="ask_feedback_order_client_whatsapp_template" class="form-control inp" name="ask_feedback_order_client_whatsapp_template" data-type="textarea" rows="6" placeholder="Sveiki, {{client_first_name}}! Lūdzu atstājiet atsauksmi par pasūtījumu #{{order_id}}: {{review_link}}"></textarea>
                                <p class="form-text">${__html('Available dynamic fields include: {{order_id}}, {{order_link}}, {{review_link}}, {{client_name}}, {{client_first_name}}, etc.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    init = () => {
        const tabRoot = document.querySelector('tab-communications');
        if (!tabRoot) return;

        [...tabRoot.querySelectorAll('.html-editor')].forEach(editor => {
            this.editors[editor.id] = ace.edit(editor.id);
            ace.config.set('basePath', 'https://account.kenzap.com/js/ace/');
            this.editors[editor.id].getSession().setMode("ace/mode/html");
            if (this.settings[editor.id]) this.editors[editor.id].setValue(this.settings[editor.id], -1);
        });
    }
}
