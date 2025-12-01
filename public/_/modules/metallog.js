import { __html } from "../helpers/global.js";

export const getHtml = (record) => {

    return /*html*/`
    <div class="container mt-4 supplies-log">
        <!-- Work Entry Form -->
        <div class="card- supply-entry-card-">
            <div class="card-body- border-0 mb-4">
                <form id="supplyEntryForm">
                    <div class="row g-3">
                        <div class="col-md-2 form-cont" data-type="metal">
                            <label for="thickness" class="form-label d-none">${__html('Thickness')}</label>
                            <input type="number" class="form-control border-0" id="thickness" placeholder="${__html('Thickness')}" value="" required>
                        </div>
                        <div class="col-md-2 form-cont" data-type="metal">
                            <label for="width" class="form-label d-none">${__html('Width')}</label>
                            <input type="number" class="form-control border-0" id="width" placeholder="${__html('Width')}" value="1250" required>
                        </div>
                        <div class="col-md-2 form-cont" data-type="metal">
                            <label for="length" class="form-label d-none">${__html('Length')}</label>
                            <input type="number" class="form-control border-0" id="length" placeholder="${__html('Length')}" value="" required>
                        </div>
                        <div class="col-md-4 form-cont d-none" data-type="product">
                            <label for="productName" class="form-label d-none">${__html('Product')}</label>
                            <div class="position-relative">
                                <input type="text" class="form-control pe-5 border-0" id="productName" required placeholder="${__html('Product name')}" value="${record.product_name}" >
                                <i class="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3"></i>
                            </div>
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="productColor" class="form-label d-none">${__html('Color')}</label>
                            <input type="text" class="form-control border-0" id="productColor" placeholder="${__html('Color')}" value="${record.color}" autocomplete="off" required>
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="productCoating" class="form-label d-none">${__html('Coating')}</label>
                            <input type="text" class="form-control border-0" id="productCoating" placeholder="${__html('Coating')}" value="${record.coating}" autocomplete="off" required>
                        </div>
                        <div class="col-md-2 form-cont d-none" data-type="general">
                            <label for="qty" class="form-label d-none" >${__html('Quantity')}</label>
                            <input type="number" class="form-control border-0" style="width:8 0px;" id="qty" min="1" placeholder="${__html('Quantity')}" value="" required>
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="price" class="form-label d-none" >${__html('Price')}</label>
                            <input type="number" class="form-control border-0" style="width:8 0px;" id="price" min="1" placeholder="${__html('Price')}" value="" required>
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="document_id" class="form-label d-none">${__html('Document #')}</label>
                            <input type="text" class="form-control border-0" id="document_id" placeholder="${__html('INV-100000')}" value="">
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="document_date" class="form-label d-none">${__html('Document date')}</label>
                            <input type="date" class="form-control border-0" id="document_date" placeholder="" value="" >
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <supplier-suggestion></supplier-suggestion>
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="status" class="form-label d-none">${__html('Status')}</label>
                            <div class="position-relative">
                                <select class="form-select border-0" id="status" required>
                                    <option value="ordered">${__html('Ordered')}</option>
                                    <option value="available" selected>${__html('Available')}</option>
                                    <option value="used">${__html('Used')}</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2 form-cont" data-type="general">
                            <label for="notes" class="form-label d-none">${__html('Notes')}</label>
                            <input type="text" class="form-control border-0" id="notes" placeholder="${__html('Notes..')}" value="">
                        </div>
                        <div class="col-md-1 form-cont d-flex align-items-center" data-type="general">
                            <div class="form-check mb-0">
                                <input class="form-check-input" type="checkbox" id="clientMaterial">
                                <label class="form-check-label small" for="clientMaterial">
                                    ${__html('CM')}
                                </label>
                            </div>
                        </div>
                        <div class="col-md-1 form-cont d-flex align-items-end" data-type="general">
                            <button type="submit" class="btn btn-dark border-0 btn-add-worklog-record w-100">
                                <i class="bi bi-plus-circle me-1"></i>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Work Log Table -->
        <div class="work-log-table">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead id="workLogHeader">

                    </thead>
                    <tbody id="workLogBody">
                        <!-- Work entries will be populated here -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Fixed Bottom Summary -->
    <div class="fixed-summary">
        <div class="container-fluid">
            <table class="table summary-table mb-0">
                <tbody>
                    <tr>
                        <td></td>
                        <td><span class="summary-label">${__html('Records:')}</span> <span class="summary-value" id="s1">0</span></td>
                        <td></td>
                        <td><span class="summary-label d-none">${__html('Products:')}</span> <span class="summary-value" id="s2">0</span></td>
                        <td></td>
                        <td><span class="summary-label d-none">${__html('Quantity:')}</span> <span class="summary-value" id="s3">0</span></td>
                        <td></td>
                        <td><span class="summary-label d-none">${__html('Time:')}</span> <span class="summary-value" id="s4">0</span></td>
                        <td></td>
                        <td class="summary-value" id="summaryTime"></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Date Range Picker Modal -->
    <div class="modal fade" id="dateRangeModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${__html('Select Date Range')}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <label for="filterStartDate" class="form-label">${__html('Start Date')}</label>
                            <input type="date" class="form-control" id="filterStartDate">
                        </div>
                        <div class="col-md-6">
                            <label for="filterEndDate" class="form-label">${__html('End Date')}</label>
                            <input type="date" class="form-control" id="filterEndDate">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
                    <button type="button" class="btn btn-primary" id="applyDateRange">${__html('Apply')}</button>
                </div>
            </div>
        </div>
    </div>
    `;
}