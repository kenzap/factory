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
                <h4 id="h-document-templates" class="card-title mb-4">${__html('Document Templates')}</h4>
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

        const tabRoot = document.querySelector('tab-templates');
        if (!tabRoot) return;

        [...tabRoot.querySelectorAll('.html-editor')].forEach(editor => {
            this.editors[editor.id] = ace.edit(editor.id);
            ace.config.set('basePath', 'https://account.kenzap.com/js/ace/');
            this.editors[editor.id].getSession().setMode("ace/mode/html");
            if (this.settings[editor.id]) this.editors[editor.id].setValue(this.settings[editor.id], -1);
        });
    }
}
