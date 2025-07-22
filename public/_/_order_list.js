import { onClick, __, __html, __attr, __init, attr, parseApiError, hideLoader } from '@kenzap/k-cloud';
import { Util } from "../_/_cart_util.js"
import { spaceID, priceFormat, onlyNumbers, mt, API_KEY, getAPI, randomString, timeConverterAgo } from "../_/_helpers.js"
import { productModal } from "../_/_modal_product.js"

export class OrderList{
    
    constructor(_this, type) {
 
        this._this = _this;

        this.type = type;

        this.getOrderList(type);
    }

    /**
     * Get cart listeners
     * 
     * @param {String} - order id
     * @returns {Boolean} - true
     */
     getOrderList = (type) => {
      
        // check locale
        let locale = localStorage.locale ? localStorage.locale : "lv";
        let order_list = localStorage.getItem('sk-design-orders') ? JSON.parse(localStorage.getItem('sk-design-orders')) : [];

        // console.log(order_list);
        // console.log(order_list.reverse());

        // do API query
        fetch(getAPI(), {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer KYSh2L3rH7egsE7CBOr1OyYUwqwC2wi8k5jcSiYQCFnUHN3aKjRpXxzD6PzRakp0',
                // 'Kenzap-Token': config.token,
                'Kenzap-Sid': spaceID(),
            },
            body: JSON.stringify({
                query: {
                    orders: {
                        type:       'find',
                        key:        'ecommerce-order',
                        id:         order_list,
                        limit:      10,
                        fields:     ['_id', 'id', 'items', 'from', 'entity', 'sdesc', 'price', 'total_all', 'email', 'phone', 'notes', 'status', 'updated'],
                    },
                    settings: {
                        type:       'get',
                        key:        'ecommerce-settings',
                        fields:     ['currency', 'currency_symb', 'currency_symb_loc', 'tax_calc', 'tax_auto_rate', 'tax_rate', 'tax_display'],
                    },
                    factory_settings: {
                        type:       'get',
                        key:        'sk-settings',
                        fields:     ['price'],
                    },
                    locale: {
                        type:       'locale',
                        locales: [
                            {
                                key: 'sk-design',
                                source: 'extension',
                                locale: locale,   
                            }, 
                            {
                                key: 'ecommerce',
                                source: 'extension',
                                locale: locale,
                            },
                            {
                                key: 'ecommerce',
                                source: 'content',
                                locale: locale,
                            }
                        ]
                    }
                }
            }) 
        })
        .then(response => response.json())
        .then(response => {

            // hide UI loader
            hideLoader();
 
            if(response.success){

                // console.log(response);

                this._this.state.meta = response.meta;
                this._this.state.orders = response.orders.reverse();
                this._this.state.settings = response.settings;
                this._this.state.factory_settings = response.factory_settings;

                // preload translations
                __init(response.locale);

                if(this._this.state.orders) if(this._this.state.orders.length == 0){ 
                    
                    // alert( __("Order does not exist or was removed") ); 
                    let html = "";
                    
                    html += `
                    <div class=" text-center" >
                        <div class="card-header">   
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-check-circle text-danger my-1" viewBox="0 0 16 16">
                                <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"/>
                                <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                            </svg>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${ __html("My Orders") }</h5>
                            <p class="card-text">${ __html("No orders to display yet.") }</p>
                            <a href="/" class="btn btn-outline-danger btn-lg" >
                                ${ __html("view products") }
                            </a>
                        </div>
                        <div class="card-footer text-muted d-none">${ __html("Recent orders") }</div>
                    </div>
                    <div class="table-responsive">
                        <table class="table" style="min-width:700px;">
                            <thead>
                                <tr>
                                    <th scope="col">${ __html("ID") }</th>
                                    <th scope="col">${ __html("Products") }</th>
                                    <th scope="col">${ __html("Ordered") }</th>
                                    <th scope="col text-end"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="text-center pb-5" colspan="5">${ __html("No orders to display yet.") }</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    `;

                    document.querySelector('#contents').innerHTML = html;

    
                }else{

                    this.renderOrders();
                }

            }else{

                parseApiError(response);
            }

            // init header
            this._this.initHeader(response);

            // init footer
            this._this.initFooter();

            // init general listeners
            this._this.initListeners();

            // init this page listeners
            this.initListeners();
        })
        .catch(error => { parseApiError(error); });
    }

    /**
     * Render HTML part of the order
     * 
     * @returns {Boolean} - true
     */
    renderOrders = () => {

        // parse URL
        let urlParams = new URLSearchParams(window.location.search);
        let orders = urlParams.get('orders') ? urlParams.get('orders') : "";
        let html = "";
        if(orders == "recent"){

            html += `

            <div class=" text-center">
                <div class="card-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-check-circle text-danger my-1" viewBox="0 0 16 16">
                        <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"/>
                        <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                    </svg>
                </div>
                <div class="card-body my-2">
                    <h5 class="card-title">${ __html("My Orders") }</h5>
                    <p class="card-text">${ __html("List of recently placed orders.") }</p>
                    <a href="https://wa.me/37126443313" target="_blank" class="btn btn-danger ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp mb-1 me-1" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                        </svg> ${ __html("Ask question") }
                    </a>
                </div>
                <div class="card-footer text-muted">${ __html("Recent orders") }</div>
            </div>

            `;
        }

        html += `
        <div class="table-responsive">
            <table class="table" style="min-width:700px;">
                <thead>
                    <tr>
                        <th scope="col">${ __html("ID") }</th>
                        <th scope="col">${ __html("Products") }</th>
                        <th scope="col">${ __html("Ordered") }</th>
                        <th scope="col text-end"></th>
                    </tr>
                </thead>
                <tbody>
        `;
    
        // iterate order items
        this._this.state.orders.forEach((order, i) => {

            // item.updated = 1;

            let items = "";
            order.items.forEach((item, ii) => {

                items += `
                    ${ item.title } ${ item.coating } ${ item.color }</br>
                `;
            });

            html += `
                <tr>
                    <th scope="row"><a href="?order=${ order._id }">#${ order.id }</a></th>
                    <td style="font-size: 0.82rem;">
                    ${ items }
                    </td>
                    <td>${ timeConverterAgo(__, this._this.state.meta.time, order.updated) }</td>
                    <td class="text-end"><a href="?order=${ order._id }" class="pt-2"><button type="button" class="btn btn-outline-danger btn-sm">${ __html("view order") }</button></a></td>
                </tr>
            `;

            // totals
        html += `
        <tr>
            <td class="text-end fs-4 pb-5" colspan="5">${ __html("Total") } ${ priceFormat(this._this, order.total_all) }</td>
        </tr>
        `;
        });



        html += `
                </tbody>
            </table>      
        </div>  
        `;

        document.querySelector('#contents').innerHTML = html;

        onClick(".preview-order-item", (e) => {

        });
    }

    /**
     * Init cart listeners
     * 
     * @returns {Boolean} - true
     */
    initListeners = () => {

        let _this = this._this;

        // modal order item preview button
        onClick('.preview-order-item', this.itemPreview);

        return  true;
    }

    /**
     * Preview item modal
     * 
     */
    itemPreview = (e) => {

        e.preventDefault();

        let i = e.currentTarget.dataset.i;
        let id = e.currentTarget.dataset.id;
        

        document.querySelector(".modal .btn-secondary").innerHTML = __html('Close');
        // document.querySelector(".modal .btn-primary").innerHTML = __html('Update cart');

        this._this.state.item = this._this.state.order.items[i];
        this._this.state.item.N = parseInt(i) + 1;
        this._this.state.item.title = this._this.state.item.title;

        // set ordered perameters
        this._this.state.item.input_fields.forEach(field => {

            field.default = parseFloat(this._this.state.item.input_fields_values['input' + field.label]);

        });

        console.log(this._this.state.item);
        
        this._this.state.bc = [];

        this._this.state.modal = document.querySelector(".modal-item");
        this._this.state.modal.cont = new bootstrap.Modal(this._this.state.modal);
        this._this.state.modal.cont.show();
        this._this.state.item_parent = null;

        // order preview mode
        this._this.state.item_preview = e.currentTarget.dataset.preview;

        productModal.render(this._this);

        document.querySelector(".modal .btn-primary").classList.add('d-none');
    }
}