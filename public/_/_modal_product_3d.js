// https://codyhouse.co/demo/add-to-cart-interaction/index.html
import { onClick, onChange, onKeyUp, toast, __, __attr, __html, getCookie } from '@kenzap/k-cloud';
import { Util } from "../_/_cart_util.js"
import { priceFormat, onlyNumbers, degToRad, stringToHash, lazyLoad, getStorage, spaceID, randomString, setCookie, unescape} from "../_/_helpers.js"

export const productModal = {
    
    // cache state locally
    _this: null,

    // render product modal
    render: (_this) => {

        productModal._this = _this;

        let urlParams = new URLSearchParams(window.location.search);
        
        document.querySelector(".modal-item .modal-title").innerHTML = (_this.state.item.N ? _this.state.item.N + ". " : "") + _this.state.item.title;

        let parts = [], parts_options = '', coating_options = '', color_options = '', parent_list = [];

        // coating options
        let ic = localStorage.getItem('input-coating') ? localStorage.getItem('input-coating') : parent_list[0];

        // preview mode = cart
        if(_this.state.item_preview == "cart"){
    
            // preload with existing sizes
            _this.state.item.input_fields.forEach((field, i)=>{

                field.default = _this.state.item.input_fields_values['input'+field.label];
            });

            ic = _this.state.item.coating;
        }
  
        // preview mode = order
        if(_this.state.item_preview == "order"){
            
            // override coating option when 
            ic = _this.state.item.coating;
        }

        // override params from iframe
        if(urlParams.get('iframe')){

            let input_fields_values;

            // normalize coating
            if(urlParams.get('coating')) ic = urlParams.get('coating');
            if(ic == "MattPE") ic = "Matt Polyester";
            if(ic == "Pural Matt") ic = "Matt Pural";
            if(ic == "ZN") ic = "Zinc";

            // input fields
            if(urlParams.get('input_fields_values')) input_fields_values = JSON.parse(unescape(urlParams.get('input_fields_values')));
            if(input_fields_values) _this.state.item.input_fields.forEach((field, i)=>{

                field.default = input_fields_values['input'+field.label] ? input_fields_values['input'+field.label] : field.default;
            });

            // set quantity
            if(urlParams.get('qty')) _this.state.item.qty = urlParams.get('qty');
        }

        console.log(_this.state.item);

        // calc price options
        switch(_this.state.item.calc_price){

            case 'variable': 

                // console.log(_this.state.item.var_price);
                // let parent = [];
                _this.state.item.var_price.forEach((price, i) => {

                    if(!parent_list.includes(price.parent)) parent_list.push(price.parent);
                });

                parent_list.forEach((parent, i) => { coating_options += `<option ${ ic == parent ? "selected" : "" } value="${ parent }">${ __html(parent) }</option>`; });

            break;
            case 'formula':
            default:

                // prepare array for coating options
                for(let price of _this.state.factory_settings.price){

                    if(price.public){

                        if(!parent_list.includes(price.parent)) parent_list.push(price.parent) 
                    }
                }

                parent_list.forEach((parent, i) => { coating_options += `<option ${ ic == parent ? "selected" : "" } value="${ parent }">${ __html(parent) }</option>`; });
            break;
        }
        
        // parts options
        if(_this.state.item.parts){ parts = _this.state.item.parts; }

        // item < parts options
        if(_this.state.item_parent) if(_this.state.item_parent.parts){ parts = _this.state.item_parent.parts; } 

        // price calc model
        if(!_this.state.item.calc_price){ _this.state.item.calc_price = 'default'; }

        // find selected part
        parts.forEach(part => {

            let item_part = _this.state.items.filter(item => { return part.id == item._id });
            if(item_part[0]) parts_options += `<option ${ _this.state.item._id == part.id ? "selected" : "" } data-parent="${ _this.state.item_parent ? _this.state.item_parent._id : _this.state.item._id }" value="${ part.id }">${ item_part[0].title }</option>`;
        });

        // struct breadcrumbs
        if(_this.state.bc[1]){
            _this.state.bc[1] = { id: _this.state.item._id, title: _this.state.item.title };
        }else{
            _this.state.bc.push({ id: _this.state.item._id, title: _this.state.item.title });
        }

        let html = `
        <div class="form-cont">
            <nav style="--bs-breadcrumb-divider: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M2.5 0L1 1.5 3.5 4 1 6.5 2.5 8l4-4-4-4z' fill='currentColor'/%3E%3C/svg%3E&quot;);" aria-label="breadcrumb">
                <ol class="breadcrumb"></ol>
            </nav>
            <div class="form-group mt-3">
                <div class="alert alert-warning alert-dismissible ${ getCookie("size-warning") == "1" ? "d-none" : "" }" role="alert">${ __html('Enter product sizes in millimeters') }<button type="button" class="btn-close size-warning" data-bs-dismiss="alert" aria-label="Close"></button></div>
                <label for="mprice" class="form-label d-none">${ __html('Price') }</label>
                <div class="input-group mb-3">
        
                    <div class="sketch-3d-controls d-flex">

                        <div class="form-check form-switch sketch-3d-switch color-danger ${ _this.state.item.modelling == "1" ? "" : "d-none" }">
                            <input class="form-check-input" type="checkbox" id="sketch3d" >
                            <label class="form-check-label text-muted" for="sketch3d">3D</label>
                        </div>
                        <div style="margin-left: 128px;z-index:10; position:absolute;">
                            <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('Iso').setAttribute('set_bind','true');">
                            ${ __html('Default') }
                            </button>

                            <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('Iso').setAttribute('set_bind','true');">
                            ${ __html('Side') }
                            </button>

                            <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('Front').setAttribute('set_bind','true');">
                            ${ __html('Front') }        
                            </button>

                            <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('Bottom').setAttribute('set_bind','true');">
                            ${ __html('Bottom') }        
                            </button>

                            <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('Left').setAttribute('set_bind','true');">
                            ${ __html('Left') }        
                            </button>

                            <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('Right').setAttribute('set_bind','true');">
                            ${ __html('Right') }        
                            </button>
                        </div>
                    </div>

                    <div class="sketch-3d d-none">
                        <div data-index="sketch0" style="position: relative;"></div>
                    </div>
                    <div class="sketch float-start" data-mode="editing" style="max-width:100%;">
                        <div data-index="sketch0" style="position: relative;overflow:scroll;">

                            <img class="images-sketch0 lazys" width="550" height="550" data-index="sketch0" src="${ getStorage() }/S${ spaceID() }/sketch-${ _this.state.item._id }-1-500x500.jpeg?${ _this.state.item.updated }" data-srcset="${ getStorage() }/S${ spaceID() }/sketch-${ _this.state.item._id }-1-500x500.jpeg?${ _this.state.item.updated }">
                            <svg id="svg" xmlns="http://www.w3.org/2000/svg">
                                `;
                            
                            let htmlLabels = '', htmlLines = '';
                            _this.state.item.input_fields.forEach((field, i) => {

                                // console.log(field);

                                let points = field.points.split(' '), x, y;
                                let xi = 0, yi = 0, scale = 1.1;

                                // scale poligon. ex 500px to 550px
                                let pointsScaled = ""; points.forEach(p => { pointsScaled += isNaN(p) ? p : (p * scale) + " "; });

                                switch(field.type){

                                    case 'polyline':

                                        field.ext = "";
                                        // xi = Math.abs(parseFloat(points[0]) - parseFloat(points[2]));
                                        // yi = Math.abs(parseFloat(points[1]) - parseFloat(points[3]));

                                        x = (parseFloat(points[0]) + parseFloat(points[2])) / 2;
                                        y = (parseFloat(points[1]) + parseFloat(points[3])) / 2;

                                        htmlLines += `
                                        <g data-id="${ field.id }">
                                            <polyline data-id="${ field.id }" points="${ pointsScaled }" style=""></polyline>
                                            <rect data-id="start${ field.id }" x="${ parseFloat(points[0])*scale-4 }" y="${ parseFloat(points[1])*scale-4 }" width="8" height="8" rx="8" "></rect>
                                            <rect data-id="end${ field.id }" x="${ parseFloat(points[2])*scale-4 }" y="${ parseFloat(points[3])*scale-4 }" width="8" height="8" rx="8" ></rect>
                                        </g>
                                        `;

                                    break;
                                    case 'arc':

                                        x = field.params.x;
                                        y = field.params.y;

                                        field.ext = '°';

                                        xi = x;
                                        yi = y;
                                        
                                        let deg = field.params.startAngle + ((field.params.endAngle - field.params.startAngle) / 2);

                                        console.log(field.points);
                                        console.log(pointsScaled);

                                        x = field.params.x + field.params.radius / 2 + (((field.params.radius*2) * Math.cos(degToRad(deg)))) + 5;;
                                        y = field.params.y + field.params.radius / 2 + (((field.params.radius*2) * Math.sin(degToRad(deg)))) - 5;;

                                        htmlLines += `
                                        <g data-id="${ field.id }">
                                            <path data-id="${ field.id }" d="${ pointsScaled }" stroke-linecap="round" style=""></path>
                                        </g>
                                        `;

                                    break;
                                }

                                // // load previous values
                                // if(_this.state.item_preview == "cart"){

                                //     field.default
                                // }
                                
                                htmlLabels += `
                                <div class="svg-input m-2"  style="left:${ x * scale }px;top:${ y * scale }px;" data-id="${ field.id }" >
                                    <label for="input${ field.label }">${ field.label + field.ext }</label>
                                    <input type="text" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-container="body" ${ (i==0 && getCookie("first-time") != "1") ? 'data-bs-toggle="popover" data-bs-trigger="focus" data-bs-placement="bottom" data-bs-content="'+ __attr("Hit enter to continue") + '"' : '' } class="form-control input-label form-control-sm" autocomplete="off" data-lable=${ field.label } id="input${ field.label }" placeholder="${ field.default }" value="${ field.default }" data-valuemin="${ field.min }" data-valuemax="${ field.max }" maxlength="5" tabindex="${ i+1 }" >
                                </div>
                                `;

                            });

                            html += htmlLines;

                            html += '</svg>';

                            html += htmlLabels;

                            html += `
                        </div>
                    </div>
                    <div class="ps-lg-4 ps-0">
                        
                        <div>
                            <div class="form-group mt-1">
                                <div class="input-parts-cnt d-none">
                                    <h4>${ __html('Part') }</h4>
                                    <div class="input-group">
                                        <select class="form-select input-parts form-select-lg mb-3">
                                            <option value="${ _this.state.item_parent ? _this.state.item_parent._id : _this.state.item._id }" data-back="true" >${ __html('Choose part') }</option>
                                            ${ parts_options }
                                        </select>
                                    </div>
                                </div>
                                <div class="input-coating-cnt">
                                    <h4>${ __html('Coating') }</h4>
                                    <div class="input-group">
                                        <select class="form-select input-coating form-select-lg mb-3">
                                            ${ coating_options }
                                        </select>
                                    </div>
                                </div>
                                <div class="input-color-cnt">
                                    <h4 class="input-group">${ __html('Color') }</h4>
                                    <div class="input-group">
                                        <select class="form-select input-color form-select-lg mb-3" >

                                        </select>
                                    </div>
                                </div>
                                <div class="input-quantity-cnt">
                                    <h4>${ __html('Quantity') }</h4>
                                    <div class="input-group">
                                        <input type="text" class="qty form-control input-qty form-select-lg mb-3" value="${ _this.state.item.qty }" >
                                    </div>
                                </div>
                                <div class="input-notes">
                                    <h4>${ __html('Notes') }</h4>
                                    <div class="input-group">
                                        <textarea type="text" class="notes form-control input-note form-select-lg mb-3" rows="1" >${ _this.state.item.note ? _this.state.item.note : "" }</textarea>
                                    </div>
                                </div>
                                <div class="input-price-cnt">
                                    <h4>${ __html('Price') }</h4>
                                    <div> 
                                        <input type="text" class="price form-control input-price form-select-lg mb-3" value="1" data-total="0" data-price="0" disabled>
                                        <p class="form-text">${ __html('* VAT is not included in the price above.') }</p>
                                        <p class="form-text price-desc ${ getCookie("admin") ? "" : "d-none" }"> </p
                                    </div>
                                </div>
                            </div>
                        </div>
                    
                    </div>
                </div>
            </div>
        </div>`;

        document.querySelector(".modal-body").innerHTML = html;

        // hide popover on mobile devices
        if(screen.width>700){
            let popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
            let popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
                return new bootstrap.Popover(popoverTriggerEl)
            });

            // focus first input field
            if(document.querySelector(".svg-input [tabindex='1']")){
                
                document.querySelector(".svg-input [tabindex='1']").focus();
                document.querySelector(".svg-input [tabindex='1']").select();
            }
        }

        // load & init x3d sketch
        onClick('.sketch-3d-switch > input', (e) => {

            // e.preventDefault();

            if(!e.currentTarget.checked){
                
                document.querySelector(".sketch").classList.remove("d-none");
                document.querySelector(".sketch-3d").classList.add("d-none");
                return;

            }else{

                document.querySelector(".sketch").classList.add("d-none");
                document.querySelector(".sketch-3d").classList.remove("d-none");
            }

            if(document.querySelector(".sketch-3d > div").innerHTML.length > 10){ return;}

            // let id = 'a6959988164ddd62e94a5a12398e7b7b343a434f';
            fetch('/assets/x3d/'+_this.state.item._id+'.xhtml', {
                method: 'get',
                headers: {
                    // 'Accept': 'application/json',
                    // 'Content-Type': 'text/plain',
                    // 'Authorization': 'Bearer ' + getCookie('kenzap_api_key'),
                    // 'Kenzap-Header': localStorage.hasOwnProperty('header'),
                    // 'Kenzap-Token': getCookie('kenzap_token'),
                    // 'Kenzap-Sid': spaceID(),
                }
            })
            .then(response => response.text())
            .then(response => {
    
                _this.state.x3d_response = response;

                productModal.render3dSketch(_this);
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });

        // dismiss millimiters notification bar
        onClick('.size-warning', (e) => {

            console.log("size-warning");
            setCookie("size-warning", "1");
        });

        // coating change listener
        onChange('.input-coating', (e) => {

            localStorage.setItem('input-coating', e.currentTarget.value);

            _this.loadColors(e.currentTarget.value);

            // productModal.render3dSketch(productModal._this);
        });

        // color change listener
        onChange('.input-color', (e) => {

            localStorage.setItem('input-color', e.currentTarget.value);

            // productModal.render3dSketch(productModal._this);
        });

        // capture enter click event
        onKeyUp('.input-label', (e) => {
            
            // Array.from(document.querySelectorAll('.tooltip')).forEach((el) => {el.remove();});
            // init tooltip array
            if(!productModal._this.tooltips) productModal._this.tooltips = [];

            // remove previous tooltips
            productModal._this.tooltips.forEach((tooltip, i) => {

                tooltip.dispose();
                productModal._this.tooltips.splice(i,1);
            });

            // check min max input values
            setTimeout((el) => {

                let tooltip = null, value = el.value;

                if(value == "") value = 0;

                if(parseFloat(value) < parseFloat(el.dataset.valuemin)){

                    tooltip = new bootstrap.Tooltip(el, { title: __html("Value should be greater than %1$", el.dataset.valuemin), offset: [0, 8] });
                    tooltip.show();

                    productModal._this.tooltips.push(tooltip);
                    console.log("tooltip show");
                }

                if(parseFloat(value) > parseFloat(el.dataset.valuemax)){

                    tooltip = new bootstrap.Tooltip(el, { title: __html("Value should be smaller than %1$", el.dataset.valuemax), offset: [0, 8] });
                    tooltip.show();

                    productModal._this.tooltips.push(tooltip);
                    console.log("tooltip show");
                }

            }, 1500, e.currentTarget);

            // console.log(e.which);
            if(e.which == 13){

                let tabindex = parseInt(e.currentTarget.getAttribute("tabindex"));

                tabindex+=1;

                // console.log(tabindex);

                if(document.querySelector(".input-label[tabindex='"+tabindex+"']")){

                    document.querySelector(".input-label[tabindex='"+tabindex+"']").focus();
                    document.querySelector(".input-label[tabindex='"+tabindex+"']").select();
                }else{

                    if(!e.currentTarget.classList.contains("qty")){

                        document.querySelector(".qty").focus();
                        document.querySelector(".qty").select();
                    }
                }
            }
        });

        // parts change listener
        onChange('.input-parts', e => {

            const el = document.querySelector(".input-parts");
            // console.log(el.options[el.selectedIndex].value);

            // reset breadcrumbs
            if(el.options[el.selectedIndex].dataset.back) { productModal._this.state.bc = []; }

            let item = productModal._this.state.items.filter(item => { return item._id == el.options[el.selectedIndex].value });
            let item_parent = productModal._this.state.items.filter(item => { return item._id == el.options[el.selectedIndex].dataset.parent });

            productModal._this.state.item = item[0];
            productModal._this.state.item_parent = item_parent[0];

            productModal._this.state.item.qty = 1;

            productModal.render(productModal._this);

            // el.options[el.selectedIndex].value
        });

        // parts select visibility
        if(parts_options){ document.querySelector(".input-parts-cnt").classList.remove('d-none'); }
        // console.log(parts_options);
        // document.querySelector(".input-parts-cnt").classList.remove('d-none');

        // calc price options
        switch(_this.state.item.calc_price){

            // hide price variation input fields
            case 'complex': 

                document.querySelector(".input-coating-cnt").classList.add("d-none");
                document.querySelector(".input-color-cnt").classList.add("d-none");
                document.querySelector(".input-quantity-cnt").classList.add("d-none");
                document.querySelector(".input-price-cnt").classList.add("d-none");
                document.querySelector(".input-notes").classList.add("d-none");
                document.querySelector(".modal .btn-primary").classList.add("d-none");
            break;

            default:
                document.querySelector(".modal .btn-primary").classList.remove("d-none");
            break;
        }

        // add to cart listener
        _this.listeners.modalSuccessBtnFunc = (e) => {

            e.preventDefault();

            let obj = {};

            obj['_id'] = _this.state.item._id;
            obj['title'] = _this.state.item.title;
            obj['coating'] = _this.state.modal.querySelector(".input-coating").value;
            obj['color'] = _this.state.modal.querySelector(".input-color").value;
            obj['qty'] = _this.state.modal.querySelector(".input-qty").value;
            obj['price'] = _this.state.modal.querySelector(".input-price").dataset.price;
            obj['total'] = _this.state.modal.querySelector(".input-price").dataset.total;
            obj['note'] = _this.state.modal.querySelector(".input-note").value;
            obj['formula'] = _this.state.item.formula;
            obj['formula_price'] = _this.state.item.formula_price;
            obj['input_fields'] = _this.state.item.input_fields;
            obj['input_fields_values'] = {};

            // validate quantity
            if(obj['qty'] == ""){

                alert( __("Please enter quantity") );
                return;
            }

            for(let lable of document.querySelectorAll(".input-label")){

                // validate input fields
                if(lable.value == ""){

                    alert( __("Please enter %1$ field", lable.dataset.lable) );
                    return;
                }

                obj['input_fields_values'][lable.id] = lable.value;
            }

            // console.log(obj['total']);

            // validate price
            if(isNaN(obj['total']) || obj['total'] == 0){

                alert( __("Make sure all fields are entered properly") );
                return;
            }

            // cart - update existing product
            if(_this.state.item_preview == "cart"){

                obj['cid'] = _this.state.item_cid;
            }

            // feed - add new product
            if(_this.state.item_preview == "feed"){

                // to match product configuration
                // obj['cid'] = stringToHash(obj.coating + obj.color + obj.id + JSON.stringify(obj.input_fields_values));
                obj['cid'] = randomString(12);
            }

            console.log(obj);

            // parse URL
            let urlParams = new URLSearchParams(window.location.search);
            let iframe = urlParams.get('iframe') ? urlParams.get('iframe') : "";

            // send to parent iframe
            if(iframe){
               
                let msg = {cmd: 'confirm', inputs: {}, inputs_label: {}, input_fields: obj['input_fields'], input_fields_values: obj['input_fields_values'], viewpoint: null, id: urlParams.get('id'), _id: obj['_id'], qty: obj['qty'], price: obj['price'], total: obj['total'], color: obj['color'], coating: obj['coating']};
      
                // console.log(msg);
      
                parent.postMessage(JSON.stringify(msg), "*");

                _this.state.modal.cont.hide();

                // return;

            // add to cart
            }else{

                _this.state.cart.addToCart(obj);
            }

            // console.log(obj);

            _this.state.modal.cont.hide();

            toast( __('Added to cart') );

            // setTimeout(() => _this.initListeners('partial'), 10);
        }

        // refresh sketch price
        onKeyUp(".modal-item .svg-input input", _this.listeners.refreshSketchPrice);
        onKeyUp(".modal-item .qty", _this.listeners.refreshSketchPrice);

        // input key change listener
        onlyNumbers(".modal-item .svg-input input", [8]);
        onlyNumbers(".modal-item .qty", [8]);

        _this.listeners.refreshSketchPrice();

        // capture svg-input focus event
        _this.listeners.focusListener();

        _this.loadColors(ic);

        productModal.bc();

        lazyLoad();

        setCookie("first-time", "1");

        // prevents window closure on androids
        if(window.location.hash != "#editing") history.pushState({pageID: 'design'}, 'Design', window.location.pathname + window.location.search + "#editing");

        // console.log(window.location.pathname + window.location.search + "#editing");

        // android back pressed
        setTimeout(() => {

            window.addEventListener("hashchange", function(e) {

                if(document.querySelector('body').classList.contains('modal-open')){
    
                    console.log("closing");

                    e.preventDefault();
    
                    productModal.closeModal();
    
                    return false;
                }
            });
              
        }, 500);

        // android scroll into view chrome problem
        // try{
        //     if(/Android/.test(navigator.appVersion)) {
        //         const handleAndroidResizeEvents = () => {
        //             if ( typeof window === 'object' && document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        //                 const intervals = [0,5,10,20,40,50,60,200]
        //                 intervals.forEach(interval => {
        //                     window.setTimeout(function () {
        //                         try {
        //                             document?.activeElement?.scrollIntoView({"block": "center"})
        //                         } catch (e) {
        //                         }
        //                     }, interval)
        //                 })
        //             }
        //         }
        //         handleAndroidResizeEvents();
        //         // window.addEventListener("resize", function() {
        //         // if(document.activeElement.tagName=="INPUT" || document.activeElement.tagName=="TEXTAREA") {
        //         //     document.activeElement.scrollIntoView();
        //         // }
        //         // })
        //     } 
        // }catch(e){   
        // }
        // enable tooltips
        // var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        // var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        //     return new bootstrap.Tooltip(tooltipTriggerEl)
        // })
        // document.querySelector("[data-toggle=popover]").popover();
    },

    closeModal: () => {

        productModal._this.state.modal.cont.hide();
    },

    render3dSketch: (_this) => {

        if(!document.querySelector('.sketch-3d-switch > input').checked) return;

        // Initialize the DOM parser
        let parser = new DOMParser();

        // Parse the text
        let x3d = parser.parseFromString(_this.state.x3d_response, "text/xml");

        // x3d.get
        let x3dRoot = x3d.getRootNode();

        // x3dRoot.querySelector("Background").setAttribute("groundColor", "1 1 1"); 
        // x3dRoot.querySelector("Background").setAttribute("skyColor", "1 1 1"); 

        let material = document.createElement("Material"); 
        material.setAttribute('shininess', '0.9'); 
        material.setAttribute('specularColor', '1 1 1');
        x3dRoot.querySelector("Appearance").appendChild(material);
        x3dRoot.querySelector("X3D").style.width = '550px';
        x3dRoot.querySelector("X3D").style.height = '550px';
        x3dRoot.querySelector("X3D").setAttribute('width', '550px');
        x3dRoot.querySelector("X3D").setAttribute('height', '550px');

        let textureTransform = document.createElement("TextureTransform"); textureTransform.setAttribute('translation', '0.000000 0.000000'); textureTransform.setAttribute('scale', '1 1');
        x3dRoot.querySelector("Appearance").appendChild(textureTransform);

        // get current coating and color
        let coating = document.querySelector(".input-coating").value.toLowerCase().replace(" ", "-");
        let color = document.querySelector(".input-color").value.toLowerCase().replace(" ", "-");

        // this seems to be more clear, darks coatings not looking good
        coating = "polyester";
        color = "rr20";

        // apply texture
        let imageTexture = document.createElement("ImageTexture"); 
        imageTexture.setAttribute('repeatT', 'false');
        imageTexture.setAttribute('url', ' "/assets/textures/'+coating+'-'+color+'.png" "https://www.web3d.org/x3d/content/examples/ConformanceNist/vts.jpg"');
        x3dRoot.querySelector("Appearance").appendChild(imageTexture); 

        // add sketch to DOM               
        document.querySelector(".sketch-3d > div").innerHTML = x3dRoot.querySelector("X3D").outerHTML;

        x3dom.reload();
    },

    // render breadcrumbs
    bc: () => {

        let _this = productModal._this;

        let html = '';
        _this.state.bc.forEach((el, i) => {

            // last link
            if (_this.state.bc.length == i+1) {

                html += `<li class="breadcrumb-item" data-id="${ el.id }">${ el.title }</li>`;

            // prev links
            }else{

                html += `<li class="breadcrumb-item "><a class="bc-click" data-id="${ el.id }" href="#">${ el.title }</a></li>`;
            }
            // ${ _this.state.bc.length == 0 ? "active" : "" }
        });
        
        document.querySelector(".breadcrumb").innerHTML = html;

        onClick(".bc-click", (e) => {

            e.preventDefault();

            productModal._this.state.bc = [];

            let item = productModal._this.state.items.filter(item => { return item._id == e.currentTarget.dataset.id});

            productModal._this.state.item = item[0];

            _this.state.item.qty = 1;

            productModal.render(productModal._this);
        });

        // <li class="breadcrumb-item"><a href="#">K-style rainwater system</a></li>
        // <li class="breadcrumb-item active" aria-current="page">Downspout strap</li>
    }
}