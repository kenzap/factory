import { H, showLoader, hideLoader, initHeader, initBreadcrumbs, parseApiError, getCookie, onClick, onKeyUp, onChange, simulateClick, spaceID, toast, link, __html, html } from '@kenzap/k-cloud';
import { log, onlyNumbers, priceFormat } from "../_/_helpers.js"

export class ProductPriceVariations{

    constructor(state){

        this.state = state;

        // log("ProductPriceVariations")
    }

    show(){

        let self = this;

        this.state.modal = document.querySelector(".modal");
        this.state.modalCont = new bootstrap.Modal(this.state.modal);
        this.state.modal.querySelector(".modal-dialog").classList.add('modal-lg');
        this.state.modal.querySelector(".modal-title").innerHTML = `
        <div class="d-flex align-items-center">
            ${ __html("Variations") }
            <div class="ms-2 po d-none"> 
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
                </svg>
            </div>
        </div>`;
        this.state.modal.querySelector(".btn-primary").classList.add("d-none");
        this.state.modal.querySelector(".btn-secondary").innerHTML = __html('Close');

        this.view();

        // price variations
        // setup coatings and prices
        let price = JSON.parse(document.querySelector('#price').value), var_parent = [];
        let parent_options = '<option value="">'+__('None')+'</option>';
        if(price.length == 0) price = self.state.factory_settings.price;
        if(self.state.factory_settings.var_parent) var_parent = self.state.factory_settings.var_parent;

        // console.log(price);

        if(Array.isArray(price)){

            // pricing row parent
            price.forEach((price, i) => {

                if(!price.parent){

                    document.querySelector('.price-table > tbody').insertAdjacentHTML("beforeend", self.structCoatingRow(price, i));
                }
            });
            
            // pricing row
            price.forEach((price, i) => {

                if(price.parent){

                    // console.log('.price-table > tbody [data-parent="'+price.parent+'"]');
                    if(document.querySelector('.price-table > tbody [data-parent="'+price.parent+'"]')) { 
                        document.querySelector('.price-table > tbody [data-parent="'+price.parent+'"]').insertAdjacentHTML("afterend", self.structCoatingRow(price, i)); // :last-child
                    }else{
                        document.querySelector('.price-table > tbody').insertAdjacentHTML("beforeend", self.structCoatingRow(price, i));
                    }
                }
            });
                                
        }else{
            price = [];
            document.querySelector('#price').value = '[]';
        }

        var_parent.split('\n').forEach(el => {

            parent_options += '<option value="'+el+'">'+el+'</option>';
        });
        document.querySelector('.price-parent').innerHTML = parent_options;    

        // cache prices
        document.querySelector('#price').value = JSON.stringify(price);

        // init modal listeners
        this.listeners();

        // view modal
        this.state.modalCont.show();

        // simulate click to enable Paste event handling
        // setTimeout(() => { simulateClick(document.querySelector('.p-modal .modal-header')); }, 2000);
    }

    view(){

        this.state.modal.querySelector(".modal-body").innerHTML = `

            <div class="row">
                <div class="col-sm-12">
                    <div class="table-responsive">
                        <table class="price-table order-form mb-3">
                            <theader>
                                <tr><th><div class="me-1 me-sm-3">${ __html('Site') }</div></th><th class="qty"><div class="me-1 me-sm-3">${ __html('Code') }</div></th><th><div class="me-1 me-sm-3">${ __html('Parent') }</div></th><th><div class="me-1 me-sm-3">${ __html('Title') }</div></th><th class="tp"><div class="me-1 me-sm-3">${ __html('Price') }</div></th><th class="tp"><div class="me-1 me-sm-3">${ __html('Unit') }</div></th><th></th></tr>
                                <tr class="new-item-row">
                                    <td>
        
                                    </td>
                                    <td class="tp">
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control price-id" style="max-width:100px;">
                                        </div>
                                    </td>
                                    <td>
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control price-parent" style="max-width:120px;">
                                            <select class="form-select price-parent- inp d-none" name="price_parent- " data-type="select">
        
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                    <div class="me-1 me-sm-3 mt-2">
                                        <input type="text" value="" autocomplete="off" placeholder=" " class="form-control price-title" data-id="" data-index="" list="item-suggestions">
                                    </div>
                                    </td>
                                    <td class="price">
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control text-right price-price" style="max-width:80px;">
                                        </div>
                                    </td>
                                    <td class="price">
                                        <div class="me-1 me-sm-3 mt-2">
                                            ${ this.measurementUnit(-1, "pc") }
                                        </div>
                                    </td>
                                    <td class="align-middle text-center pt-2"> 
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24" class="bi bi-plus-circle text-success align-middle add-price po"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"></path></svg>
                                    </td>
                                </tr>
                            </theader>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

    }

    measurementUnit(i, value){

        return `
        <select class="form-select price-unit inp" name="price_unit" data-type="select" data-i=${i}>
            <option value="pc" ${value == 'pc' ? "selected" : ""}>${ __html('Piece') }</option>
            <option value="set" ${value == 'set' ? "selected" : ""}>${ __html('Set') }</option>
            <option value="pair" ${value == 'pair' ? "selected" : ""} >${ __html('Pair') }</option>
            <option value="m" ${value == 'm' ? "selected" : ""}>${ __html('Meter') }</option>
            <option value="m2" ${value == 'm2' ? "selected" : ""}>${ __html('㎡') }</option>
            <option value="hour ${value == 'hour' ? "selected" : ""}">${ __html('Hour') }</option>
        </select>
        `;
    }

    addPrice(e){

        let self = this;
        
        let obj = {}

        obj.id = document.querySelector('.price-id').value; // document.querySelector('.price-id').value = '';
        obj.title = document.querySelector('.price-title').value.trim(); document.querySelector('.price-title').value = '';
        obj.parent = document.querySelector('.price-parent').value.trim(); // document.querySelector('.price-parent').value = '';
        obj.price = document.querySelector('.price-price').value.trim(); // document.querySelector('.price-price').value = '';
        obj.unit = document.querySelector('.price-unit').value.trim(); // document.querySelector('.price-unit').value = '';
        obj.public = true;

        if(obj.title.length < 1 || obj.price.length < 1) return false;

        // console.log(obj);

        let prices = document.querySelector('#price').value;

        // console.log(prices);

        if(prices){ prices = JSON.parse(prices); }else{ prices = []; }
        if(Array.isArray(prices)){ prices.push(obj); }else{ prices = []; }
        document.querySelector('#price').value = JSON.stringify(prices);

        if(document.querySelector('.price-table > tbody [data-parent="'+obj.parent+'"]:last-child')){ 
            document.querySelector('.price-table > tbody [data-parent="'+obj.parent+'"]:last-child').insertAdjacentHTML("afterend", self.structCoatingRow(obj, prices.length-1));
        }else{
            document.querySelector('.price-table').insertAdjacentHTML("beforeend", self.structCoatingRow(obj, prices.length-1));
        }

        // add price listener
        onClick('.remove-price',e => { self.removePrice(e); });

        // only nums for price
        onlyNumbers(".price-price", [8, 46]);

        // update price
        onChange('.price-price', e => { self.updatePrice(e); });

        // update unit
        onKeyUp('.price-unit', e => { self.updateUnit(e); });

        // price public
        onClick('.price-public', e => { self.publicPrice(e); });
    }

    removePrice(e){

        e.preventDefault();

        let c = confirm( __('Remove this record?') );

        if(!c) return;

        let hash = e.currentTarget.parentElement.parentElement.dataset.hash;

        let prices = JSON.parse(document.querySelector('#price').value);

        prices = prices.filter((obj) => { return escape(obj.id+obj.title+obj.parent) != hash });

        document.querySelector('#price').value = JSON.stringify(prices);

        e.currentTarget.parentElement.parentElement.remove();

    }

    updatePrice(e){

        e.preventDefault();

        // let i = e.currentTarget.dataset.i;

        let hash = (e.currentTarget.parentElement.parentElement.parentElement.dataset.hash);

        log(hash);

        if(!hash) return;

        let prices = JSON.parse(document.querySelector('#price').value);

        prices.forEach((obj, i) => { if(escape(obj.id+obj.title+obj.parent) == hash){ prices[i].price = e.currentTarget.value; } });

        // prices[i].price = e.currentTarget.value;

        // console.log(e.currentTarget.value);

        // console.log(prices);

        document.querySelector('#price').value = JSON.stringify(prices);

        // console.log(e.currentTarget.value);
    }

    updateUnit(e){

        e.preventDefault();

        let hash = (e.currentTarget.parentElement.parentElement.parentElement.dataset.hash);

        log(hash);

        if(!hash) return;

        let prices = JSON.parse(document.querySelector('#price').value);

        prices.forEach((obj, i) => { if(escape(obj.id+obj.title+obj.parent) == hash){ prices[i].unit = e.currentTarget.value; } });

        document.querySelector('#price').value = JSON.stringify(prices);
    }

    publicPrice(e){

        // let i = e.currentTarget.dataset.i;
        let hash = (e.currentTarget.parentElement.parentElement.dataset.hash);

        let prices = JSON.parse(document.querySelector('#price').value);

        prices.forEach((obj, i) => { if(escape(obj.id+obj.title+obj.parent) == hash){ prices[i].public = e.currentTarget.checked ? true : false; } });

        // console.log(i);

        // prices[i].public = e.currentTarget.checked ? true : false;

        // prices[i].public = e.currentTarget.value;

        document.querySelector('#price').value = JSON.stringify(prices);
    }

    listeners(){

        let self = this;

        // add price listener
        onClick('.remove-price', e => { self.removePrice(e); });
        
        // only nums for price
        onlyNumbers(".price-price", [8, 46]);

        // update price
        onKeyUp('.price-price', e => { self.updatePrice(e); });

        // update unit
        onChange('.price-unit', e => { self.updateUnit(e); });
        
        // price public
        onClick('.price-public', e => { self.publicPrice(e); });

        // add price listener
        onClick('.add-price', e => { self.addPrice(e); });

        // add paste event
        this.onPaste();

        // onPaste('.price-price', e => { self.handlePaste(e); });
    }

    onPaste(){

        const target = document.querySelector(".p-modal");
        target.addEventListener("paste", (event) => {

            let paste = (event.clipboardData || window.clipboardData).getData("text");
            let error = false;

            // console.log(paste);

            if(paste.length < 20) return true;

            event.preventDefault();

            try{

                JSON.parse(paste);
                 
            }catch(e){

                error = true;

                // console.log(e);
            }

            if(!error){

                let js = JSON.parse(paste);
                
                document.querySelector('#price').value = paste;

                // console.log(js);

                this.state.modalCont.hide();

                this.show();

                toast("Prices updated")
            }
        });
    }

    structCoatingRow (obj, i){

        return `
        <tr class="new-item-row ${ obj.parent ? "pr-parent" : "" }" data-parent="${ obj.parent ? obj.parent : "" }" data-title="${ obj.title }" data-hash="${ escape(obj.id+obj.title+obj.parent) }">
            <td style="max-width:25px;">
                <input class="form-check-input price-public" type="checkbox" value="" data-i="${i}" ${ obj.public ? 'checked' : "" } >
            </td>
            <td class="tp">
                <div class="me-1 me-sm-3 my-1 ">
                    ${ obj.id }
                </div>
            </td>
            <td>
                <div class="me-1 me-sm-3 my-1">
                    ${ obj.parent ? obj.parent : "" }
                </div>
            </td>
            <td>
                <div class="me-1 me-sm-3 my-1">
                    ${ obj.title }
                </div>
            </td>
            <td class="price">
                <div class="me-1 me-sm-3 my-1" >
                    <input type="text" autocomplete="off" class="form-control form-control-sm text-right price-price" style="max-width:80px;" data-i="${ i }" value="${ obj.price }">
                    <span class="d-none"> ${ priceFormat(this, obj.price) } </span>
                </div>
            </td>
            <td class="price">
                <div class="me-1 me-sm-3 my-1">
                    ${ this.measurementUnit(i, obj.unit) }
                    <span class="d-none"> ${ obj.unit } </span>
                </div>
            </td>
            <td class="align-middle text-center pt-2"> 
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff0079" class="remove-price bi bi-x-circle po" data-i="${ i }" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path>
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path>
                </svg>
            </td>
        </tr>`;
    }

    bind(){

        const d = document; 

        // // general section
        // d.querySelector("#p-title").value = this.state.product.title;
        // d.querySelector("#p-sdesc").value = this.state.product.sdesc;
        // d.querySelector("#p-ldesc").value = this.state.product.ldesc;
    }
}