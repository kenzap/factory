import { getProducts } from "../_/api/get_products.js";
import { saveStockAmount } from "../_/api/save_stock_amount.js";
import { AddStockSupply } from "../_/components/stock/add_stock_supply.js";
import { __html, hideLoader, onClick, toast } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { getHtml } from "../_/modules/stock.js";

/**
 * Stock log.
 * 
 * @version 1.0
 */
class Stock {

    constructor() {
        this.products = [];
        this.subItems = new Map();
        this.autoUpdateInterval = null;
        this.mouseTime = Date.now() / 1000;
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

        this.stats = {
            latest: [],
            issued: []
        }

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
    }

    editCell(cell) {
        const currentValue = cell.textContent;
        const wrapper = document.createElement('div');
        const input = document.createElement('input');

        input.type = 'text';
        input.dataset.productId = cell.dataset.productId;
        input.dataset.coating = cell.dataset.coating;
        input.dataset.color = cell.dataset.color;
        input.min = '0';
        input.value = currentValue;
        input.className = 'form-control form-control-sm input-editing';
        input.style.width = '60px';
        input.style.textAlign = 'center';

        wrapper.appendChild(input);

        cell.innerHTML = '';
        cell.appendChild(wrapper);
        input.focus();
        input.select();

        const saveEdit = (e) => {

            const newValue = parseInt(input.value) || 0;

            cell.textContent = newValue;
            cell.className = `editable-cell ${this.getStockClass(newValue)}`;

            let stock = {
                color: input.dataset.color,
                coating: input.dataset.coating,
                amount: newValue,
                _id: input.dataset.productId,
            }

            console.log('Saving stock:', stock);
            // return;

            // Save the new stock amount
            saveStockAmount(stock, (response) => {
                if (!response.success) {
                    toast('Error saving stock amount: ' + response.error);
                    cell.textContent = currentValue; // Revert to old value on error
                    return;
                }

                toast('Changes applied');
            });

            // Show update feedback
            cell.style.transform = 'scale(1.1)';
            setTimeout(() => {
                cell.style.transform = 'scale(1)';
            }, 200);
        };

        input.addEventListener('blur', e => saveEdit(e));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveEdit(e);
            }
            if (e.key === 'Escape') {
                cell.textContent = currentValue;
                cell.className = `editable-cell ${this.getStockClass(parseInt(currentValue))}`;
            }
        });
    }

    async data() {

        // get products
        getProducts(this.filters, (response) => {

            // console.log(response);

            // show UI loader
            if (!response.success) return;

            // init locale
            new Locale(response);

            // hide UI loader
            hideLoader();

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

            // document.getElementById('loadingIndicator').style.display = 'none';
            // document.getElementById('stockContainer').style.display = 'block';

            this.listeners();
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
                <th class="product-coating">${__html('Coating')}</th>
            ${this.colors.map(color => {
            return `<th class="color-header" > <div>${color}</div></th > `;
        }).join('')
            }
            </tr>
    `;
    }

    /**
     * Render stock table
     */
    renderTableStock() {

        this.colors = this.getColors();
        this.coatings = this.getCoatings();

        const tbody = document.getElementById('stockTableBody');

        tbody.innerHTML = '';

        this.products.forEach(product => {

            if (!product.title) return;

            this.coatings.forEach(coating => {

                const row = document.createElement('tr');

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
        let stock = 0;

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
        if (quantity === 0) return 'out-of-stock';
        if (quantity <= 25) return 'very-low-stock';
        if (quantity <= 100) return 'low-stock';
        return '';
    }
}

window.stock = new Stock();