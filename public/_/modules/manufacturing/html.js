import { __html } from "../../helpers/global.js";

export const getHtml = (response) => {

    return /*html*/`
    <!-- Navigation -->
    <nav class="manufacturing-cont px-3 navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="/home/">
                <i class="bi bi-box-seam me-2"></i>${__html('Manufacturing')}
            </a>
            
            <!-- Search Container -->
            <div class="search-container d-flex align-items-center d-none d-md-flex">
                <div class="me-3">
                    <input type="text" id="orderSearch" class="form-control search-input" placeholder="ID" maxlength="4" style="width: 100px;">
                </div>
                <div class="me-3">
                    <input type="text" id="companySearch" class="form-control search-input" placeholder="${__html('Client')}" style="width: 250px;">
                </div> 
                <button class="btn btn-outline-light action-btn me-2" onclick="manufacturing.refreshOrders()">
                    <i class="bi bi-arrow-clockwise"></i> ${__html('Refresh')}
                </button>
            </div>

            <!-- Stats -->
            <div class="stats-container text-white small d-none d-xl-block">
                <div>${__html('Latest')} <span id="latestOrders" class="fw-bold">-</span></div>
                <div>${__html('Issued')} <span id="issuedOrders" class="fw-bold">-</span></div>
            </div>

            <!-- User Menu -->
            <div class="navbar-nav ms-auto">

                <!-- View toggle -->
                <div class="stats-container view-toggle-container text-white small d-none d-xl-flex me-3 align-items-center">
                    <div class="form-check form-switch me-2 d-flex align-items-center">
                        <input class="form-check-input me-2" type="checkbox" id="viewToggleSwitch" onchange="manufacturing.toggleView()" ${(localStorage.getItem('manufacturingViewMode') || 'compact') === 'warehouse' ? 'checked' : ''}>
                        <label class="form-check-label text-white mb-0 mt-1" for="viewToggleSwitch" id="viewToggleText">
                            ${__html('Warehouse')}
                        </label>
                    </div>
                </div>

                <!-- User Dropdown Menu -->
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle fw-bold" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle me-2"></i>
                        ${response?.user?.fname ? response?.user?.fname : ""}${response?.user?.lname ? ' ' + response.user.lname.charAt(0) + '.' : ''}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="/stock/" target="_self"><i class="bi bi-boxes me-2"></i>${__html('Stock')}</a></li>
                        <li><a class="dropdown-item" href="/cutting/" target="_self"><i class="bi bi-scissors me-2"></i>${__html('Cutting')}</a></li>
                        <li><a class="dropdown-item" href="/metallog/" target="/metallog/" ><i class="bi bi-lightning-charge me-2"></i>${__html('Metal')}</a></li>
                        <li><a class="dropdown-item" href="/triangle/" target="/triangle/"><i class="bi bi-triangle me-2"></i>${__html('Triangle')}</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="/worklog/" target="/worklog/"><i class="bi bi-journal-text me-2"></i>${__html('Work Log')}</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger sign-out" href="#"><i class="bi bi-box-arrow-right me-2"></i>${__html('Log out')}</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container-fluid main-container">
        <div id="loadingIndicator" class="loading">
            <div class="spinner-border text-light pulse" role="status">
                <span class="visually-hidden">${__html('Loading..')}</span>
            </div>
            <div class="mt-3">${__html('Loading orders..')}</div>
        </div>
        
        <div id="ordersContainer" style="display: none;">
            <!-- Orders will be loaded here -->
        </div>
    </div>

    <!-- Close Button (for narrow mode) -->
    <button class="close-btn text-dark d-xl-none" id="closeBtn" onclick="window.close()">
        <i class="bi bi-x-lg"></i>
    </button>
    `;
}