import { getProducts } from "../_/api/get_products.js";
import { saveStockAmount } from "../_/api/save_stock_amount.js";
import { PreviewReport } from "../_/components/payments/preview_report.js";
import { AddStockSupply } from "../_/components/stock/add_stock_supply.js";
import { signOut } from "../_/helpers/auth.js";
import { __html, hideLoader, onClick, toast } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { getHtml } from "../_/modules/stock.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

/**
 * Stock log.
 * Shows current stock levels and allows editing them.
 * 
 * @version 1.0
 */
class Stock {

    constructor() {
        this.products = [];
        this.subItems = new Map();
        this.autoUpdateInterval = null;
        this.mouseTime = Date.now() / 1000;
        this.firstLoad = true;
        this.filters = {
            for: 'stock',
            client: '',
            dateFrom: '',
            dateTo: '',
            draft: false,
            items: true,
            cat: 'rainwater-system-square',
            type: '2' // Default to 'All'
        };

        this.init();
    }

    init() {

        new Modal();

        this.data();

        hideLoader();
    }

    view() {

        if (document.querySelector('.stock-cont')) return;

        document.querySelector('#app').innerHTML = getHtml({ user: this.user, settings: this.settings });

        onClick('#categoryFilter .dropdown-item', (e) => {

            e.preventDefault();

            const selectedCategory = document.getElementById('selectedCategory');
            selectedCategory.textContent = e.target.textContent;

            const category = e.target.getAttribute('data-value');
            e.target.closest('.dropdown').querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');
            this.filters.cat = category;
            this.selectedCoating = "";

            this.data();
        });
    }

    listeners() {

        // Editable cells
        onClick('.editable-cell', (e) => {
            if (e.target.classList.contains('editable-cell')) {
                this.editCell(e.target);
            }
        });

        // Coating filter
        onClick('#coatingFilter .dropdown-item', (e) => {
            e.preventDefault();

            const selectedCoating = document.getElementById('selectedCoating');
            selectedCoating.textContent = e.target.textContent;

            const coating = e.target.getAttribute('data-value');
            e.target.closest('.dropdown').querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');

            this.selectedCoating = coating;

            // Filter the table based on selected coating
            this.filterTableByCoating(coating);
        });

        // sing out
        onClick('.sign-out', (e) => {

            e.preventDefault();

            signOut();
        });

        // Inventory report
        onClick('.inventory-report', (e) => {

            e.preventDefault();

            new PreviewReport(`/report/inventory/?format=pdf`, (response) => {
                if (!response.success) {
                    toast(__html('Error opening report'));
                    return;
                }
            });
        });
    }

    filterTableByCoating(coating) {
        const tbody = document.getElementById('stockTableBody');
        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            const coatingCell = row.querySelector('.product-coating div');
            if (coating.trim() === "" || coatingCell.textContent.trim() === coating.trim()) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    editCell(cell) {

        console.log('Editing cell:', cell);

        // Skip if already being edited
        if (cell.contentEditable === 'true') return;

        const currentValue = cell.textContent;

        // Make cell editable
        cell.contentEditable = true;
        cell.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(cell);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        let isEditing = false;

        const saveEdit = () => {
            if (isEditing) return;
            isEditing = true;

            cell.contentEditable = false;

            // Validate and clean input - only keep numbers
            let newValue = cell.textContent.replace(/[^\d]/g, '');
            newValue = parseInt(newValue) || 0;

            cell.textContent = newValue;
            cell.className = `editable-cell ${this.getStockClass(newValue)}`;

            let stock = {
                color: cell.dataset.color,
                coating: cell.dataset.coating,
                amount: newValue,
                _id: cell.dataset.productId,
            }

            console.log('Saving stock:', stock);

            // Save the new stock amount
            saveStockAmount(stock, (response) => {
                if (!response.success) {
                    toast('Error saving stock amount: ' + response.error);
                    cell.textContent = currentValue; // Revert to old value on error
                    isEditing = false;
                    return;
                }

                toast('Changes applied');
                isEditing = false;
            });

            // Show update feedback
            cell.style.transform = 'scale(1.1)';
            setTimeout(() => {
                cell.style.transform = 'scale(1)';
            }, 200);

            // Remove event listeners
            cell.removeEventListener('input', inputHandler);
            cell.removeEventListener('blur', saveEdit);
            cell.removeEventListener('keydown', keydownHandler);
        };

        const cancelEdit = () => {
            cell.contentEditable = false;
            cell.textContent = currentValue;
            cell.className = `editable-cell ${this.getStockClass(parseInt(currentValue))}`;

            // Remove event listeners
            cell.removeEventListener('input', inputHandler);
            cell.removeEventListener('blur', saveEdit);
            cell.removeEventListener('keydown', keydownHandler);
        };

        // Prevent non-numeric input in real-time
        const inputHandler = () => {
            const value = cell.textContent.replace(/[^\d]/g, '');
            if (cell.textContent !== value) {
                cell.textContent = value;
                // Move cursor to end
                range.selectNodeContents(cell);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        };

        const keydownHandler = (e) => {
            // console.log('Keydown event:', e);

            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        };

        // Add event listeners
        cell.addEventListener('input', inputHandler);
        cell.addEventListener('blur', saveEdit);
        cell.addEventListener('keydown', keydownHandler);
    }

    async data() {

        // get products
        getProducts(this.filters, (response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'warehouse_management')) return

            this.settings = response.settings;
            this.products = response.products;
            this.user = response.user;

            // session
            new Session();
            new Header({
                hidden: true,
            });

            this.view();

            this.renderTableHeader();
            this.renderTableStock();

            document.title = __html('Stock');

            // if (!this.firstLoad) 
            this.listeners();

            this.firstLoad = false;
        });
    }

    getColors() {

        this.colors = [];
        this.products.forEach(product => {
            if (product.var_price) {
                product.var_price.forEach(vp => {
                    if (!vp.title) return;
                    if (!this.colors.includes(vp.title)) {
                        this.colors.push(vp.title);
                    }
                });
            }
        });

        this.colors.sort((a, b) => a.localeCompare(b));

        return this.colors;
    }

    getCoatings() {

        this.coatings = [];
        this.products.forEach(product => {
            if (product.var_price) {
                product.var_price.forEach(vp => {
                    if (!vp.parent) return;
                    if (!this.coatings.includes(vp.parent)) {
                        this.coatings.push(vp.parent);
                    }
                });
            }
        });

        this.coatings.sort((a, b) => a.localeCompare(b));

        if (this.coatings.length === 0) this.coatings.push("-");

        return this.coatings;
    }

    renderTableHeader() {

        this.colors = this.getColors();
        this.coatings = this.getCoatings();

        const header = document.querySelector('#stockContainer thead');

        header.innerHTML = `
            <tr>
            <th class="product-name">${__html('Product')}</th>
            <th class="product-coating">
                <div class="dropdown ${this.coatings.length <= 1 ? 'd-none' : ''}">
                    <button class="btn btn-link text-dark stock-table p-0 text-decoration-none fw-bold" type="button" data-bs-toggle="dropdown">
                        <span id="selectedCoating">${this.selectedCoating ? this.selectedCoating : __html('All')}</span>
                        <i class="bi bi-chevron-down ms-1"></i>
                    </button>
                    <ul class="dropdown-menu" id="coatingFilter">
                        <li><a class="dropdown-item active" href="#" data-value="">${__html('All')}</a></li>
                        ${this.coatings.map(coating =>
            `<li><a class="dropdown-item" href="#" data-value="${coating}" ${this.selectedCoating === coating ? 'active' : ''}>${coating}</a></li>`
        ).join('')}
                    </ul>
                </div>
            </th>
            ${this.colors.map(color => {
            return `<th class="color-header"><div>${color}</div></th>`;
        }).join('')}
            </tr>`;
    }

    /**
     * Render stock table
     */
    renderTableStock() {

        this.colors = this.getColors();
        this.coatings = this.getCoatings();

        const tbody = document.getElementById('stockTableBody');

        tbody.innerHTML = '';

        // console.log(this.products);

        this.products.forEach(product => {

            if (!product.title) return;

            this.coatings.forEach(coating => {

                // skip coatings that do not exist for this product
                if (product.var_price && !product.var_price.find(vp => vp.parent === coating)) {
                    return;
                }

                const row = document.createElement('tr');

                row.style.display = (this.selectedCoating && this.selectedCoating !== coating) ? 'none' : '';

                // Product name cell with category badge
                const productCell = document.createElement('td');
                productCell.className = 'product-name py-1';
                productCell.innerHTML = `
                    <div class="product-name-container d-flex align-items-center">
                        <i class="bi bi-plus fs-6 py-1 pe-2 po" onclick="stock.addSupply('${product._id}','${product.title}','${coating}');" ></i>
                        <div class="d-flex flex-column justify-content-center">
                            ${product.title} 
                            ${product.sdesc ? `<small class="text-muted fw-normal">${product.sdesc}</small>` : ''}
                        </div>
                    </div>`;

                row.appendChild(productCell);

                // Product coating
                const coatingCell = document.createElement('td');
                coatingCell.className = 'product-coating ';
                coatingCell.innerHTML = `
                <div>
                    ${coating}
                </div> `;

                row.appendChild(coatingCell);

                // Color cells
                this.colors.forEach(color => {

                    const cell = document.createElement('td');
                    const quantity = this.getStockAmount(product, coating, color); // this.stockData[product][color];

                    cell.className = `editable-cell ${this.getStockClass(quantity)} `;
                    cell.textContent = quantity;
                    cell.dataset.productId = product._id;
                    cell.dataset.coating = coating;
                    cell.dataset.color = color;

                    row.appendChild(cell);

                    tbody.appendChild(row);
                });
            });
        });
    }

    getStockAmount(product, coating, color) {
        let stock = "";

        if (product.var_price) {
            product.var_price.forEach(vp => {
                if (vp.parent === coating && vp.title === color) {
                    stock += parseInt(vp.stock || 0);
                }
            });
        }

        return stock;
    }

    getCategoryLabel(category) {

        return "";
    }

    addSupply(product_id, product_name, coating) {

        new AddStockSupply({ product_id, product_name, coating }, (response) => {
            if (!response.success) {
                toast(__html('Error opening log: ') + response.error);
                return;
            }
        });
    }

    getStockClass(quantity) {
        quantity = parseFloat(quantity);

        if (quantity === '') return '';
        if (quantity <= 0) return 'out-of-stock';
        // if (quantity <= 5) return 'out-of-stock';
        if (quantity <= 25) return 'very-low-stock';
        if (quantity <= 100) return 'low-stock';
        return '';
    }
}

window.stock = new Stock();