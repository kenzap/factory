import { __html } from "../../helpers/global.js";

export class TabTemplates {

    constructor(settings, editors) {

        this.settings = settings;
        this.editors = editors || {};

        this.tab();

        this.init();
    }

    tab = () => {

        document.querySelector('tab-templates').innerHTML = /*html*/`
            <div>
                <h4 id="h-email-templates" class="card-title mb-4">${__html('Email Templates')}</h4>
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
                            <label class="col-sm-3 col-form-label">${__html('Waybill template.')}</label>
                            <div class="col-sm-9">
                                <div id="waybill_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="waybill_document_template-" type="text" class="form-control d-none" name="waybill_document_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('Waybill document template with dynamic fields.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Invoice template.')}</label>
                            <div class="col-sm-9">
                                <div id="invoice_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="invoice_document_template-" type="text" class="form-control d-none" name="invoice_document_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('Invoice document template with dynamic fields.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Production slip template.')}</label>
                            <div class="col-sm-9">
                                <div id="production_slip_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="production_slip_document_template-" type="text" class="form-control d-none" name="production_slip_document_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('Production slip template with dynamic fields.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Quotation template.')}</label>
                            <div class="col-sm-9">
                                <div id="quotation_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="quotation_document_template-" type="text" class="form-control d-none" name="quotation_document_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('Production slip template with dynamic fields.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Package slip template.')}</label>
                            <div class="col-sm-9">
                                <div id="package_slip_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="package_slip_document_template-" type="text" class="form-control d-none" name="package_slip_document_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('Production slip template with dynamic fields.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Proforma template.')}</label>
                            <div class="col-sm-9">
                                <div id="proforma_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                                <textarea id="proforma_document_template-" type="text" class="form-control d-none" name="proforma_document_template" data-type="textarea" rows="20"></textarea>
                                <p class="form-text">${__html('Invoice document template with dynamic fields.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    init = () => {

        // init editors
        [...document.querySelectorAll('.html-editor')].forEach(editor => {

            this.editors[editor.id] = ace.edit(editor.id);
            ace.config.set('basePath', 'https://account.kenzap.com/js/ace/');
            this.editors[editor.id].getSession().setMode("ace/mode/html");
            if (this.settings[editor.id]) this.editors[editor.id].setValue(this.settings[editor.id], -1);
        });
    }
}