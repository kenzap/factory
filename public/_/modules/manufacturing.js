import { __html } from "../helpers/global.js";

export const getHtml = () => {

    return /*html*/`
    <!-- Navigation -->
    <nav class="manufacturing-cont px-3 navbar navbar-expand-lg navbar-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="/home/">
                <i class="bi bi-box-seam me-2"></i>${__html('Manufacturing')}
            </a>
            
            <!-- Search Container -->
            <div class="search-container d-flex align-items-center">
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
            <div class="stats-container text-white small">
                <div>${__html('Latest')} <span id="latestOrders" class="fw-bold">-</span></div>
                <div>${__html('Issued')} <span id="issuedOrders" class="fw-bold">-</span></div>
            </div>

            <!-- User Menu -->
            <div class="navbar-nav ms-auto">
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle fw-bold" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle me-2"></i>
                        Operators
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('nol1', '/ATS/noliktava2?ats=1')">
                            <i class="bi bi-box me-2"></i>Noliktava 1</a></li>
                        <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('nol2', '/ATS/noliktava2?ats=2')">
                            <i class="bi bi-box me-2"></i>Noliktava 2</a></li>
                        <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('nol3', '/ATS/noliktava2?ats=3')">
                            <i class="bi bi-box me-2"></i>Noliktava 3</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('darbs', '/ATS/darbs')">
                            <i class="bi bi-tools me-2"></i>Darbs: Viss</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="/logout.php">
                            <i class="bi bi-box-arrow-right me-2"></i>${__html('Log out')}</a></li>
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
    <button class="close-btn d-none" id="closeBtn" onclick="window.close()">
        <i class="bi bi-x-lg"></i>
    </button>
    `;
}