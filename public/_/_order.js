import { onClick, __, __html, __attr, __init, attr, parseApiError, hideLoader } from '@kenzap/k-cloud';
import { Util } from "../_/_cart_util.js"
import { CDN, spaceID, makeNumber, priceFormat, onlyNumbers, mt, API_KEY, getAPI, randomString } from "../_/_helpers.js"
import { productModal } from "../_/_modal_product.js"

export class Order{
    
    constructor(_this, id) {
 
        this._this = _this;

        this.id = id;

        this.getOrder(id);
    }

    /**
     * Get cart listeners
     * 
     * @param {String} - order id
     * @returns {Boolean} - true
     */
    getOrder = (id) => {
      
        // check locale
        let locale = localStorage.locale ? localStorage.locale : "lv";

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
                    order: {
                        type:       'find',
                        key:        'ecommerce-order',
                        id:         id,   
                        // limit:      10,
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

                this._this.state.order = response.order;
                this._this.state.settings = response.settings;
                this._this.state.factory_settings = response.factory_settings;

                // preload translations
                __init(response.locale);

                if(this._this.state.order) if(this._this.state.order.length == 0){ 
                    
                    // alert( __("Order does not exist or was removed") ); 
                    let html = "";
                    
                    html += `
                    <div class=" text-center" >
                        <div class="card-header">   
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-exclamation-circle text-danger" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                            </svg>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${ __html("No order found") }</h5>
                            <p class="card-text">${ __html("Order does not exist or was removed.") }</p>
                            <a href="https://wa.me/37126443313" target="_blank" class="btn btn-danger" >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp mb-1 me-1" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                                </svg> ${ __html("Ask question") }
                            </a>
                        </div>
                        <div class="card-footer text-muted d-none">${ __html("Order details") }</div>
                    </div>
                    `;

                    document.querySelector('#contents').innerHTML = html;

                    return; 
                }

                this.renderOrder();

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
    renderOrder = () => {

        // parse URL
        let urlParams = new URLSearchParams(window.location.search);
        let recent = urlParams.get('recent') ? urlParams.get('recent') : "";
        let total = 0, total_with_tax = 0;
        let html = "";
        if(recent == "yes"){

            html += `

            <nav style="--bs-breadcrumb-divider: url(&#34;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M2.5 0L1 1.5 3.5 4 1 6.5 2.5 8l4-4-4-4z' fill='currentColor'/%3E%3C/svg%3E&#34;);" aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="/?orders=recent">${ __html('My Orders') }</a></li>
                    <li class="breadcrumb-item active" aria-current="page">#${ this._this.state.order.id }</li>
                </ol>
            </nav>

            <div class=" text-center">
                <div class="card-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-check-circle text-danger my-1" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                    </svg>
                </div>
                <div class="card-body my-2">
                    <h5 class="card-title">#${ this._this.state.order.id } ${ __html("Order received") }</h5>
                    <p class="card-text">${ __html("Your order is being processed. The manager will contact you soon.") }</p>
                    <p class="form-text"> ${ __html("*working hours: 9.00 - 17.00, Monday - Friday.") }</p>
                    <a href="https://wa.me/37126443313" target="_blank" class="btn btn-danger ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp mb-1 me-1" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                        </svg> ${ __html("Ask question") }
                    </a>
                </div>
                <div class="card-footer text-muted">${ __html("Order details") }</div>
            </div>

            `;
        }

        html += this.renderClient();

        html += `
        <div class="table-responsive">
            <table class="table" style="min-width:840px;">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">${ __html("Product") }</th>
                        <th scope="col">${ __html("Price") }</th>
                        <th scope="col">${ __html("Qty") }</th>
                        <th scope="col"><div class="${ this._this.state.order.entity == "individual" ? "text-end" : "text-start" }">${ __html("Total") }</div></th>
                        <th scope="col" class="${ this._this.state.order.entity == "individual" ? "d-none" : "" }">${ __html("Tax") } / ${ __html("Code") }</th>
                        <th scope="col" class="${ this._this.state.order.entity == "individual" ? "d-none" : "" }"><div class="text-end">${ __html("Total with tax") }</div></th>
                    </tr>
                </thead>
                <tbody>
        `;

        // iterate order items
        this._this.state.order.items.forEach((item, i) => {

            item.updated = 1;

            if(!item.tax_id) item.tax_id = "";
            total += makeNumber(item.total);
            total_with_tax += makeNumber(item.total * (item.tax_id.length == 4 ? 1 : 1.21));

            html += `
                <tr class="${ i == this._this.state.order.items.length-1 ? "border-secondary": "" }">
                    <th scope="row">${ i+1 }</th>
                    <td>
                        <a href="#" class="preview-order-item link-dark" data-i="${ attr(i) }" data-id="${ attr(item._id) }" data-preview="order">          
                            <div class="timgc d-inline-block me-2" style="width:25px;">
                                <span><img src="${ CDN }S${ spaceID() }/sketch-${ item._id }-1-100x100.jpeg?${ item.updated }" data-srcset="${ CDN }S${ spaceID() }/sketch-${ item._id }-1-100x100.jpeg?${ item.updated }" class="img-fluid rounded" alt="Product placeholder" srcset="${ CDN }S${ spaceID() }/sketch-${ item._id }-1-100x100.jpeg?${ item.updated }"></span>
                            </div>${ item.title } ${ item.coating } ${ item.color }
                        </a>
                        <div class="form-text">${ item.note }</div>
                    </td>
                    <td>${ priceFormat(this._this, item.price) }</td>
                    <td>${ item.qty }</td>
                    <td class="${ this._this.state.order.entity == "individual" ? "text-end" : "text-start" }">${ priceFormat(this._this, item.total) }</td>
                    <td class="${ this._this.state.order.entity == "individual" ? "d-none" : "d-none" }">${ item.tax_id }</td>
                    <td class="${ this._this.state.order.entity == "individual" ? "d-none" : "" }">${ item.tax_id.length == 4 ? "ANM / " + item.tax_id: "21%" }</td>
                    <td class="text-end ${ this._this.state.order.entity == "individual" ? "d-none" : "" }">${ priceFormat(this._this, item.total * (item.tax_id.length == 4 ? 1 : 1.21)) }</td>
                </tr>
            `;
        });

        console.log(this._this.state.order.price);

        // vat
        if(this._this.state.order.entity == "individual"){

            
            // total
            html += `
            <tr>
                <td class="text-end fs-5" colspan="5">${ __html("Total") } ${ priceFormat(this._this, this._this.state.order.price.total) }</td>
            </tr>
            `;

            // vat
            html += `
            <tr>
                <td class="text-end fs-5" colspan="5">${ __html("VAT 21%") } ${ priceFormat(this._this, this._this.state.order.price.total * 0.21) }</td>
            </tr>
            `;

            // grand total
            html += `
                <tr>
                    <td class="text-end fs-3" colspan="5">${ __html("Grand total") } ${ priceFormat(this._this, this._this.state.order.price.total + this._this.state.order.price.total * 0.21) }</td>
                </tr>
                `;
        }

        // vat
        if(this._this.state.order.entity == "company"){

            // total
            html += `
            <tr class="border-top">
                <td class="text-start fs-5" colspan="1"></td>
                <td class="text-start fs-5" colspan="1"></td>
                <td class="text-start fs-5" colspan="1"></td>
                <td class="text-start fs-5" colspan="1"></td>
                <td class="text-start" colspan="1">${ priceFormat(this._this, total) }</td>
                <td class="text-end" colspan="2">${ priceFormat(this._this, total_with_tax) }</td>
            </tr>
            <td class="text-end fs-5" colspan="7">${ __html("Grand total") } ${ priceFormat(this._this, total_with_tax) }</td>

            `;
        }


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
     * Render order client requisites
     * 
     * @returns {Boolean} - true
     */
    renderClient = () => {

        let html = `

        <div class="my-3">
            <h5 class="card-title">${ __html("From") }</h5>
            <div class="card-text">${ this._this.state.order.from }</div>
            <div class="card-text">${ this._this.state.order.entity }</div>
            <div class="card-text email">${ this._this.state.order.email }</div>
            <div class="card-text wa-num">${ this._this.state.order.phone }</div>
            <div class="card-text">${ this._this.state.order.notes }</div>
        </div>

        `;

        return html;
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

        // wa link
        onClick('.wa-num', () => {

            let number = document.querySelector(".wa-num").innerHTML;
            if(number.length<3) alert(__html("Number does not exist"));
            if(!number.startsWith('+371') && !number.startsWith('371')){ number = "371" + number; }

            window.open(
                'https://wa.me/'+number,
                '_blank'
            );
        });

        // email link
        onClick('.email', () => {

            let email = document.querySelector(".email").innerHTML;
            window.open('mailto:'+email+'?subject='+__html("Order #%1$", this._this.state.order.id)+'&body=');
        });
        
        return true;
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