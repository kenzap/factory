import { __html } from "../helpers/global.js";

export const getHtml = (record) => {

    return /*html*/`
    <div class="container mt-4 work-log">
        <!-- Work Entry Form -->
        <div class="card- work-entry-card-">
            <div class="card-body- border-0 mb-4">
                <form id="workEntryForm">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label for="productName" class="form-label d-none">${__html('Product Name')}</label>
                            <div class="position-relative">
                                <input type="text" class="form-control pe-5 border-0" id="productName" required placeholder="" value="${record.product_name}" >
                                <i class="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3"></i>
                            </div>
                        </div>
                        <div class="col-md-1">
                            <label for="productColor" class="form-label d-none">${__html('Color')}</label>
                            <input type="text" class="form-control border-0" id="productColor" placeholder="" value="${record.color}" required>
                        </div>
                        <div class="col-md-2">
                            <label for="productCoating" class="form-label d-none">${__html('Coating')}</label>
                            <input type="text" class="form-control border-0" id="productCoating" placeholder="" value="${record.coating}" required>
                        </div>
                        <div class="col-md-1">
                            <label for="qty" class="form-label d-none" >${__html('Quantity')}</label>
                            <input type="number" class="form-control border-0" style="width:8 0px;" id="qty" min="1" placeholder="Qty" value="${record.qty}" required>
                        </div>
                        <div class="col-md-1">
                            <label for="time" class="form-label d-none">${__html('Time (min)')}</label>
                            <input type="number" class="form-control border-0" id="time" min="1" placeholder="Min">
                        </div>
                        <div class="col-md-1">
                            <label for="origin" class="form-label d-none">${__html('Origin')}</label>
                            <select class="form-select border-0" id="origin" required>
                                <option value="w">${__html('Warehouse')}</option>
                                <option value="o" ${record.order_id ? "selected" : ""}>${__html('Order')}</option>
                                <option value="">-</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label for="type" class="form-label d-none">${__html('Type')}</label>
                            <select class="form-select  border-0" id="type" required></select>
                        </div>
                        <div class="col-md-1 d-flex align-items-end">
                            <button type="submit" class="btn btn-dark  border-0 btn-add-worklog-record w-100">
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
    <div class="fixed-summary d-none">
        <div class="container-fluid">
            <table class="table summary-table mb-0">
                <tbody>
                    <tr>
                        <td></td>
                        <td><span class="summary-label">${__html('Records:')}</span> <span class="summary-value" id="summaryEntries">0</span></td>
                        <td></td>
                        <td><span class="summary-label">${__html('Products:')}</span> <span class="summary-value" id="summaryProducts">0</span></td>
                        <td></td>
                        <td><span class="summary-label">${__html('Quantity:')}</span> <span class="summary-value" id="totalQuantity">0</span></td>
                        <td></td>
                        <td><span class="summary-label">${__html('Time:')}</span> <span class="summary-value" id="summaryTime">0</span></td>
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