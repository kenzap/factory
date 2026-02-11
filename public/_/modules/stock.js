import { __html } from "../helpers/global.js";
import { isAuthorized } from "../modules/unauthorized.js";

export const getHtml = (response) => {

    return /*html*/`
    <!-- Navigation -->
    <nav class="stock-cont px-3 navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="/home/">
                <i class="bi bi-boxes me-2"></i>${__html('Stock')}
            </a>

            <!-- Search Container -->
            <div class="search-container d-flex align-items-center">
                <div class="me-0">
                    <div class="dropdown">
                        <button class="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown" style="border-radius: 6px; min-width: 200px;">
                            <span id="selectedCategory">${__html(response?.settings?.stock_categories[0].name)}</span>
                        </button>
                        <ul class="dropdown-menu" id="categoryFilter">
                            ${(response?.settings?.stock_categories || []).map(cat => {
        return /*html*/`<li><a class="dropdown-item py-3" href="#" data-value="${cat.id}">${__html(cat.name)}</a></li>`;
    }).join('')
        }
                        </ul>
                    </div>
                </div>
                <button class="btn btn-outline-light action-btn ms-3 me-2 d-none" onclick="stock.init()">
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
                        ${response?.user?.fname}${response?.user?.lname ? ' ' + response.user.lname.charAt(0) + '.' : ''}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="/home/" target="_self"><i class="bi bi-boxes me-2"></i>${__html('Home')}</a></li>
                        <li><a class="dropdown-item" href="/manufacturing/" target="_self"><i class="bi bi-box me-2"></i>${__html('Manufacturing')}</a></li>
                        <li><a class="dropdown-item" href="/worklog/" target="_self"><i class="bi bi-clock-history me-2"></i>${__html('Work Log')}</a></li>
                        ${isAuthorized(response, 'inventory_report') ? `<li><a class="dropdown-item inventory-report" href="#" target="_self"><i class="bi bi-filetype-pdf me-2"></i>${__html('Inventory Report')}</a></li>` : ''}
                        ${isAuthorized(response, 'employee_performance_report') ? `<li><a class="dropdown-item performance-report" href="/report-employee-performance/" target="report-employee-performance"><i class="bi bi-graph-up-arrow me-2"></i>${__html('Performance Report')}</a></li>` : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#"><i class="bi bi-person me-2"></i>${__html('My Profile')}</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger sign-out" href="#"><i class="bi bi-box-arrow-right me-2"></i>${__html('Log out')}</a></li>
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