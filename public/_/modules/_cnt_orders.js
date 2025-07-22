export const HTMLContent = (__) => {

    return `
      <div class="container ec-orders">
        <div class="d-md-flex justify-content-between bd-highlight mb-3">
            <nav class="bc" aria-label="breadcrumb"></nav>
            <button class="btn btn-primary add-order btn-add mt-3 mb-1 mt-md-0 mb-md-0" type="button">${ __('New order') }</button>
        </div>
        <div class="row">
          <div class="col-md-12 page-title">
            <div class="st-opts st-table mb-3 dropdown">
                <a class="btn btn-outline-secondary dropdown-toggle" href="#" role="button" id="order-status" data-id="status" data-value="" data-bs-toggle="dropdown" aria-expanded="false">
                  ${ __('All') }
                </a>
                <ul class="dropdown-menu" aria-labelledby="order-status">
                  <li><a class="dppi dropdown-item" data-key="" href="#" >${ __('All') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="new" href="#" >${ __('New') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="paid" href="#" >${ __('Paid') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="processing" href="#" >${ __('Processing') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="completed" href="#" >${ __('Completed') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="canceled" href="#" >${ __('Canceled') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="failed" href="#" >${ __('Failed') }</a></li>
                  <li><a class="dppi dropdown-item" data-key="refunded" href="#" >${ __('Refunded') }</a></li>
                </ul>
            </div>
            <div class="st-opts" >
              <div class="input-group-sm mb-0 justify-content-start mb-3 mb-sm-0" >
                <input id="usearch" type="text" class="inp form-control search-input" autocomplete="off" placeholder="${ __('Search order') }">
              </div>
              <!-- <a id="viewSum" href="#" style="margin-left:16px;">view summary</a> -->
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-12 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
            <div class="card border-white shadow-sm border-0">
              <div class="card-body p-0">
 
                <div class="table-responsive">
                  <table class="table table-hover table-borderless align-middle table-striped table-p-list mb-0">
                    <thead>
                      <tr>
                        <th><span class="ps-1">${ __('From') }</span></th>
                        <th class="d-none d-sm-table-cell">${ __('Status') }</th>
                        <th>${ __('Total') }</th>
                        <th class="d-none d-sm-table-cell">${ __('Time') }</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody class="list">

                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal order-modal" tabindex="-1" data-backdrop="static" data-keyboard="false">
        <div class="modal-dialog ">
          <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"></h5>
                <button type="button" class="btn-close align-self-start-remove" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
              
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-confirm"></button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"></button>
              </div>
          </div>
        </div>
      </div>

    `;
}