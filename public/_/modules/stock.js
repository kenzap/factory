import { __html } from "../helpers/global.js";

export const getHtml = () => {

    return /*html*/`
    <!-- Navigation -->
    <nav class="stock-cont px-3 navbar navbar-expand-lg navbar-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="#">
                <i class="bi bi-boxes me-2"></i>${__html('Stock')}
            </a>
            
            <!-- Search Container -->
            <div class="search-container d-flex align-items-center">
                <div class="me-3">
                    <select id="categoryFilter" class="form-select" style="border-radius: 12px;">
                        <option value="">${__html('All Categories')}</option>
                        <option value="K-style rainwater system">K-style rainwater system</option>
                        <option value="Round rainwater system Ø 125/100">Round rainwater system Ø 125/100</option>
                        <option value="Round rainwater system Ø 150/120">Round rainwater system Ø 150/120</option>
                        <option value="Round rainwater system Ø 150/140">Round rainwater system Ø 150/140</option>
                        <option value="Snow barrier">Snow barrier</option>
                        <option value="Instruments">Instruments</option>
                    </select>
                </div>
                <button class="btn btn-outline-light action-btn me-2" onclick="manufacturing.refreshOrders()">
                    <i class="bi bi-arrow-clockwise"></i> ${__html('Refresh')}
                </button>
            </div>

            <!-- Stats -->
            <div class="stats-container d-none text-white small">
                <div>${__html('Recent changes')} <span id="latestOrders" class="fw-bold">-</span></div>
                <div class="d-none">${__html('Issued')} <span id="issuedOrders" class="fw-bold">-</span></div>
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
    <div class="container-fluid main-container" >
        <div id="loadingIndicator" class="loading d-none">
            <div class="spinner-border text-light pulse" role="status">
                <span class="visually-hidden">${__html('Loading..')}</span>
            </div>
            <div class="mt-3">${__html('Loading products..')}</div>
        </div>
        
        <div id="stockContainer">
            <div class="table-container">
                <table class="table table-bordered- stock-table mb-0">
                    <thead style="position: sticky; top: 0; background-color: #fff; z-index: 10;">
                    </thead>
                    <tbody id="stockTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Close Button (for narrow mode) -->
    <button class="close-btn d-none" id="closeBtn" onclick="window.close()">
        <i class="bi bi-x-lg"></i>
    </button>
    `;
}