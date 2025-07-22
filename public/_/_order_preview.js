import { headers, showLoader, hideLoader, onClick, onKeyUp, simulateClick, parseApiError, spaceID } from '@kenzap/k-cloud';
import { priceFormat, getPageNumber, makeNumber, parseVariations, escape, unescape, getAPI, printReceipt } from "../_/_helpers.js"

export const preview = {

    _this: null,
    renderOrder: (_this, e) => {

        let modal = document.querySelector(".order-modal");
        _this.modalCont = new bootstrap.Modal(modal);
        _this.modalOpen = true;
        let i = e.currentTarget.dataset.index; // _this.state.orderPreviewIndex = i;
        
        // to properly handle back button on mobiles
        // window.history.pushState(null, 'editing');
        history.pushState({pageID: 'orders'}, 'Orders', window.location.pathname + window.location.search + "#editing");

        modal.addEventListener('hide.bs.modal', function (e) {
           
            if (window.location.href.indexOf("#editing")==-1) return;

            history.pushState({pageID: 'orders'}, 'Orders', window.location.pathname + window.location.search);
        });
        
        // is new order ?
        if(typeof(i) === 'undefined'){

            _this.state.orderSingle = {
                _id: "new",
                created: 1649831099,
                from: "no name",
                id: "",
                idd: "",
                items: [],
                kid: "0",
                name: "no name",
                note: "",
                sid: spaceID,
                status: "new",
                step: 1,
                table: "1",
                total: 0,
                updated: 1649833845
            }
        }else{

            _this.state.orderSingle = _this.state.orders[i];
        }

        // console.log(_this.state.orderSingle);
        let items = '';

        // get order status
        Object.keys(_this.state.statuses).forEach((key, index) => { items += `<li><a class="dppi dropdown-item" data-key="${ key }" href="#">${ _this.state.statuses[key].text }</a></li>` })
        let statusSelect = `
        <div class="d-flex justify-content-between">
            <div class="st-modal st-opts mb-3 me-1 me-sm-3 dropdown">
                <a class="btn btn-sm ${ _this.state.statuses[_this.state.orderSingle['status']].class } dropdown-toggle order-form" data-id="status" data-type="key" data-value="${ _this.state.orderSingle['status'] }" href="#" role="button" id="order-status-modal" data-bs-toggle="dropdown" aria-expanded="false" >
                    ${ _this.state.statuses[_this.state.orderSingle['status']].text }
                </a>
                <ul class="dropdown-menu" aria-labelledby="order-status-modal">
                    ${ items }
                </ul>
            </div>
            <a href="#" data-index="0" class="print-order text-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-printer" viewBox="0 0 16 16">
                    <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"></path>
                    <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"></path>
                </svg>
            </a>
        </div>
        `;
        // kenzapprint://kenzapprint.app?data=%7B%22print%22%3A%22%5BC%5D%3Cu%3E%3Cfont%20size%3D%5C%22big%5C%22%3EORDER%7B%7Border_id_short%7D%7D%3C%2Ffont%3E%3C%2Fu%3E%5Cn%5BC%5DFu%20Zhen%20Seafood%5Cn%5BC%5D%3Cu%20type%3Ddouble%3E%7B%7Bdate_time%7D%7D%3C%2Fu%3E%5Cn%5BC%5D%5Cn%5BC%5D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%5C%22%20%5Cn%5BL%5D%5Cn%5BL%5D%3Cb%3EBEAUTIFUL%20SHIRT%3C%2Fb%3E%5BR%5D9.99%E2%82%AC%5Cn%5BL%5D%20%20%2B%20Size%20%3A%20S%5Cn%5BL%5D%5Cn%5BL%5D%3Cb%3EAWESOME%20HAT%3C%2Fb%3E%5BR%5D24.99%E2%82%AC%5Cn%5BL%5D%20%20%2B%20Size%20%3A%2057%2F58%5Cn%5BL%5D%5Cn%5BC%5D--------------------------------%5Cn%5BR%5DTOTAL%20PRICE%20%3A%5BR%5D34.98%E2%82%AC%5Cn%5BR%5DTAX%20%3A%5BR%5D4.23%E2%82%AC%22%7D" data-id="72b42ad9111e7767aa68174227ba20b5e11d26e4

        // structure modal
        modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');
        modal.querySelector(".modal-header .modal-title").innerHTML =  _this.state.orderSingle['from'];
        modal.querySelector(".modal-footer .btn-confirm").innerHTML = _this.state.orderSingle._id == "new" ? __('Create') : __('Update');
        modal.querySelector(".btn-confirm").dataset.loading = false;
        modal.querySelector(".modal-footer .btn-secondary").innerHTML = __('Close');

        let html = statusSelect;

        // _id: {l: __("System ID")},
        let fields = { id: {l: __("ID"), classList: "order-form"},  from: {l: __("From"), e: "text", editable: true, classList: "order-form"}, items: {l: "", e: "items"}, fname: {l: __("Name"), e: "text"}, lname: {l: __("Surname"), e: "text"}, bios: {l: __("Bios"), e: "textarea"}, avatar: {l: __("Avatar"), e: "text"}, email: {l: __("Email"), e: "text"}, countryr: {l: __("Country"), e: "text"}, cityr: {l: __("City"), e: "text"}, addr1: {l: __("Address 1"), e: "textarea"}, addr2: {l: __("Address 2"), e: "textarea"}, post: {l: __("Post"), e: "text"}, state: {l: __("State"), e: "text"}, c1: {l: __("Whatsapp"), e: "text"}, c2: {l: __("Messenger"), e: "text"}, c3: {l: __("Line"), e: "text"}, c4: {l: __("Email"), e: "text"}, c5: {l: __("Telegram"), e: "text"}, email: {l: __("Email"), e: "text"}, bio: {l: __("Bio"), e: "text"}, y1: {l: __("Name"), e: "text"}, y2: {l: __("IBAN"), e: "text"}, y3: {l: __("SWIFT"), e: "text"}, y4: {l: __("Bank"), e: "text"}, y5: {l: __("Bank city"), e: "text"}, y6: {l: __("Bank country"), e: "text"}, note: {l: __("Note"), e: "textarea"}, total: {l: __("Total"), e: "price", classList: "order-form"}, total_tax: {l: __("Tax"), e: "price", classList: "order-form"}, total_with_tax: {l: __("Amount Payable"), e: "price", classList: "order-form"}, s3: {l: __("Link 3"), e: "text"}, company: {l: __("Company"), e: "text"}, vat: {l: __("Tax ID"), e: "text"}, grade: {l: __("Grade"), e: "text"}, kenzap_ida: {l: __("Kenzap IDA"), e: "text"}};

        // order table details
        for(let x in fields){

            if(_this.state.orderSingle[x] === undefined) continue;

            let val = _this.state.orderSingle[x];
            let field = fields[x].l;

            html += `
            <div class="mb-3 mt-3 order-row keyx-${ x } ${ x == '_id' || x == 'from' ? "elipsized": "" }"  >
                <b>${ field }</b>${ preview.renderField(_this, fields[x], val, x) }
            </div>`;
        }

        html += '';
        modal.querySelector(".modal-body").innerHTML = '<div class="modal-body-cont">' + html + '</div>';
        _this.modalCont.show();

        // table order item listners (remove, add note, adjust variations, etc)
        preview.tableOrderItemListeners();

        // order item product edit listener
        preview.suggestOrderItem(_this);

        // hide suggestion list if still present
        modal.querySelector(".edit-item").addEventListener('blur', (e) => { setTimeout(()=>{ document.querySelector('.s-list').dataset.toggle = false; }, 500); });
            
        // add product item to order table
        preview.addOrderItem(_this);

        // calculate totals for new orders only
        if(_this.state.orderSingle._id == 'new') preview.refreshTotals();

        // focus on item input fields
        if(_this.state.orderSingle._id == 'new') setTimeout(() => { document.querySelector('.edit-item').focus(); }, 300);
        
        // prevent modal closure if user clicks on white space areas
        // if(modal) modal.addEventListener('click', (e)=>{ e.preventDefault(); return false; });

        onClick('.print-order', (e) => {

            e.preventDefault();
            
            simulateClick(modal.querySelector(".btn-confirm"));

            _this.state.printLink = true;
        });

        // save changes to orders
        _this.listeners.modalSuccessBtnFunc = (e) => {

            e.preventDefault();

            _this.updateOrder(i, _this.state.orderSingle._id);
        }

        onClick('.st-modal li a', (e) => {

            e.preventDefault();

            let osm = document.querySelector('#order-status-modal');
            osm.innerHTML = _this.state.statuses[e.currentTarget.dataset.key].text;
            osm.dataset.value = e.currentTarget.dataset.key;
            let list = [];

            // clear previous classes
            Object.keys(_this.state.statuses).forEach((key) => {
                list = _this.state.statuses[key].class.split(' ');
                list.forEach((key) => { 
                    osm.classList.remove(key);
                });    
            });

            // add new classes
            list = _this.state.statuses[e.currentTarget.dataset.key].class.split(' ');
            list.forEach((key) => { 

                osm.classList.add(key);
            });
        });
    },
    newOrder: (_this) => {

        preview._this = _this;
        onClick('.add-order', (e) => { preview.renderOrder(_this, e); });
    },
    viewOrder: (_this) => {

        preview._this = _this;
        onClick('.view-order', (e) => { preview.renderOrder(_this, e); });
    },
    renderField: (_this, a, item, x) => {

        let html = '';
        switch(a.e){
            
            // case 'text': return '<input type="text" class="form-control pv" id="'+x+'" value="'+b+'">';
            case 'price': 

                html = `<div data-id="${x}" data-type="key-number" class="${ a.classList ? a.classList : "" } ms-2 d-inline-block" ${ a.editable ? 'contenteditable="true"':'' } data-id="${x}" data-value="${ item }">${ priceFormat(_this, item) }</div>`;
                return html;
            case 'text': 

                html = `<div data-id="${x}" data-type="text" class="${ a.classList ? a.classList : "" } ms-2 d-inline-block" ${ a.editable ? 'contenteditable="true"':'' } data-id="${x}">${ item }</div>`;
                return html;
            case 'textarea': return '<textarea type="text" rows="4" class="form-control order-form pv " data-type="textarea" id="'+x+'" value="'+item+'">'+item+'</textarea>';
            case 'items': 

                // parse product items
                html = `<table class="items order-form" data-type="items"><tr><th><div class="me-1 me-sm-3">${ __('Product') }</div></th><th class="qty"><div class="me-1 me-sm-3">${ __('Qty') }</div></th><th class="tp"><div class="me-1 me-sm-3">${ __('Total') }</div></th><th></th></tr>`;
                for(let x in item){ html += preview.structOrderItemTable(_this, x, item, false); }

                // add row for manual product entry
                html += `<tr class="new-item-row">
                            <td>
                                <div class="me-1 me-sm-3">
                                    <input type="text" value="" autocomplete="off" placeholder="${ __('Search..') }" class="form-control edit-item" data-id="" data-index="" list="item-suggestions">
                                    <span class="select-list-group__toggle"> </span>
                                    <ul class="s-list my-1 shadow-sm" data-toggle="false"></ul>
                                    <datalist id="item-suggestions" class="fs-12 d-none"></datalist>
                                </div>
                            </td>
                            <td class="qty">
                                <div class="me-1 me-sm-3">
                                    <input type="text" value="" autocomplete="off" class="form-control text-right edit-qty">
                                </div>
                            </td>
                            <td class="tp">
                                <div class="me-1 me-sm-3">
                                    <input type="text" value="" autocomplete="off" class="form-control edit-tp">
                                </div>
                            </td>
                            <td class="align-middle text-center"> 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24" class="bi bi-plus-circle text-success align-middle add-item"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"></path></svg>
                            </td>
                        </tr>`;

                html += `</table><div class="item-vars-input mt-3"> </div>`;

                return html;
            default: 
            
                if(x == '_id') item = item.substr(0, 6);

                html = `<div data-id="${x}" data-type="text" class="${ a.classList ? a.classList : "" } ms-2 d-inline-block" ${ a.editable ? 'contenteditable="true"':'' } data-id="${x}">${ item }</div>`;
                return html;
        }
  },
  itemOptions: (item) => {

    let options = `

        <div class="dropdown text-center">
            <a  href="#" role="button" id="order-item-options" data-id="status" data-value="" data-bs-toggle="dropdown" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots-vertical order-item-options" viewBox="0 0 16 16"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
            </a>
            <ul class="dropdown-menu" aria-labelledby="order-item-options" >
                <li><a class="oio dropdown-item edit-item-note" data-key="edit-item-note" href="#">${ __('Add note') }</a></li>
                <li><a class="oio dropdown-item d-none" data-key="edit-item-variation" href="#">${ __('Add variation') }</a></li>
                <li><a class="oio dropdown-ite d-none" data-key="edit-item-price" href="#">${ __('Adjust price') }</a></li>
                <li><a class="oio dropdown-item text-danger remove-item" data-key="remove-item" href="#">${ __('Remove') }</a></li>
            </ul>
        </div>
    `;

    return options;
  },
  structOrderItemTable: (_this, x, item, isNew = false, options = true) => {

    // console.log(item[x].variations);

    // parse variations
    let vars = '', output = ''
    for(let v in item[x].variations){

        // parse variation list
        let list = ''; for(let l in item[x].variations[v].list) list += item[x].variations[v].list[l].title + " ";
        vars += '<div><b>' + item[x].variations[v].title + "</b> <span>" + list + "</span></div> ";

        // meal note
        if(item[x].variations[v].note !== undefined && item[x].variations[v].note.length > 0) vars += "<div><b>" + __('Note') + "</b> " + item[x].variations[v].note + "</div> ";
    }

    output += '<tr class="order-item-row-active" data-x="'+x+'" data-id="'+item[x].id+'" data-vars="'+escape(JSON.stringify(item[x].variations))+'">';
    output += '<td ><div class="item-title" contenteditable="false" data-value="'+item[x].title+'" data-sdesc="'+(item[x].sdesc ? item[x].sdesc : "")+'">' + item[x].title + '</div><div class="item-note text-muted mb-1 '+( (item[x].note.length==0 || item[x].note == '<br>') && !isNew ? "d-none" : "" )+'" contenteditable="true" data-value="'+item[x].note+'">' + item[x].note + '</div><div class="vars border-primary item-variations my-1 ps-2 text-secondary" data-value="">' + vars + '</div></td><td class="qty"><div class="me-1 me-sm-3 item-qty" data-value="'+item[x].qty+'">' + item[x].qty + '</div></td><td class="tp"><div class="me-1 me-sm-3 item-total" data-price="'+item[x].price+'" data-value="'+item[x].total+'" >' + priceFormat(_this, item[x].total) + '</div><td class="'+(options?'':'d-none')+'">'+preview.itemOptions(item[x])+'</td></td>';
    output += '</tr>';

    return output;
  },
  suggestOrderItem: (_this) => {
            
    onKeyUp('.edit-item', (e) => {
        
      // disable some key for better UX
      var key = e.keyCode || e.charCode;
      if (key >= 34 && key <= 45) { return; }

      let s  = e.currentTarget.value;

      if(s.length == 1) document.querySelector('.modal-body').scrollTo({
        top: (document.querySelector('.edit-item').getBoundingClientRect().top - document.querySelector('.modal-body-cont').getBoundingClientRect().top) - 20,
        behavior: "smooth"
      });

      // empty search string
      if(s.length==0 || e.currentTarget !==document.activeElement) { document.querySelector('.s-list').dataset.toggle = false; return; }

      // do API query
      fetch(getAPI(), {
          method: 'post',
          headers: headers,
          body: JSON.stringify({
              query: {
                  products: {
                      type:       'find',
                      key:        'ecommerce-product',
                      fields:     ['_id', 'id', 'img', 'status', 'variations', 'price', 'title'],
                      limit:      _this.state.slist,
                      // only suggesting products with status public
                      term:       [
                                    {
                                        type: "string",
                                        field: "status",
                                        relation: "=",
                                        value: "1",
                                    }
                                  ],
                      offset:     s.length > 0 ? 0 : getPageNumber() * _this.state.slist - _this.state.slist,    // automatically calculate the offset of table pagination
                      search:     {                                                           // if s is empty search query is ignored
                                      field: 'title',
                                      s: s
                                  },
                      sortby:     {
                                      field: 'title',
                                      order: 'DESC'
                                  },
                  }
              }
          })
      })
      .then(response => response.json())
      .then(response => {

          // hide UI loader
          hideLoader();

          // console.log(response);

          if(response.success){

              _this.state.productsSuggestions = response.products;

              let options = ``;
              response.products.forEach((product, index) => {

                  // options += `<option class="pso" data-id="${ product._id }" data-title="${ product.title }" data-index="${ index }" value="${ product.title }">${ product.title }</option>`; 
                  options += `<li class="s-list-item py-1" data-id="${ product._id }" data-title="${ product.title }" data-index="${ index }"  data-display="true" data-highlight="false">${ product.title }</li>`; 
              });
              document.querySelector('.s-list').innerHTML = options;
              document.querySelector('.s-list').dataset.toggle = true;

              // suggestion click listener 
              onClick('.s-list-item', (e) => {

                  let index = e.currentTarget.dataset.index;

                  // console.log(index);
                  // console.log(_this.state.productsSuggestions[index]);
                  
                  document.querySelector('.edit-item').dataset.index = index;   
                  document.querySelector('.edit-item').dataset.id = _this.state.productsSuggestions[index]._id;   
                  document.querySelector('.edit-item').value = _this.state.productsSuggestions[index].title;   
                  document.querySelector('.edit-qty').value = 1;
                  document.querySelector('.edit-qty').dataset.price = _this.state.productsSuggestions[index].price;
                  document.querySelector('.edit-tp').value = _this.state.productsSuggestions[index].price;
                  document.querySelector('.edit-tp').dataset.price = _this.state.productsSuggestions[index].price;
                  document.querySelector('.s-list').dataset.toggle = false;

                  let calcItemTotal = () => {

                      let total = parseFloat(document.querySelector('.edit-qty').value) * parseFloat(document.querySelector('.edit-qty').dataset.price);
                      if(isNaN(total)) total = "";
                      document.querySelector('.edit-tp').value = total;
                  }

                  // auto update price when quantity is changed
                  document.querySelector('.edit-qty').addEventListener('keypress', (e)=>{

                      // console.log(e.which);
                      if(e.which != 8 && isNaN(String.fromCharCode(e.which))){

                          e.preventDefault(); // stop character from entering input
                          return false;
                      }

                  });

                  document.querySelector('.edit-qty').addEventListener('keydown', (e)=>{

                      // console.log('keydown');
                      setTimeout(() => { calcItemTotal(); }, 300);

                  });

                  // price can be float number only
                  document.querySelector('.edit-tp').addEventListener('keypress', (e)=>{

                      // console.log(e.which);
                      if(e.which != 8 && e.which != 46 && isNaN(String.fromCharCode(e.which))){

                          e.preventDefault(); // stop character from entering input
                          return false;
                      }
                  });

                  // focus on quantity field
                  document.querySelector('.edit-qty').focus();
                  document.querySelector('.edit-qty').select();   
                  
                  // parse selected product variations
                  // console.log('parseVariations');
                  document.querySelector('.item-vars-input').innerHTML = parseVariations(_this, _this.state.productsSuggestions[index]);

              });

          }else{

              parseApiError(response);
          }
      })
      .catch(error => { console.log(error); parseApiError(error); });

    });
  },
  tableOrderItemListeners: (e) => {

    // make note field visible below the order item
    onClick('.edit-item-note', (e) => {

        e.preventDefault();

        let noteEl = e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement.querySelector('.item-note');
        console.log(noteEl);
        noteEl.classList.remove('d-none');
        noteEl.focus();
    });

    // remove order item
    onClick('.remove-item', (e) => {

        e.preventDefault();

        e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement.remove();

        // if(preview._this.state.orderSingle._id == 'new') 
        preview.refreshTotals();
    });
  },
  refreshTotals: () => {

    // clear previous calculations
    if(document.querySelector('.order-total')) document.querySelector('.order-total').remove();
    if(document.querySelector('.keyx-total')) document.querySelector('.keyx-total').remove();
    if(document.querySelector('.keyx-total_tax')) document.querySelector('.keyx-total_tax').remove();
    if(document.querySelector('.keyx-total_with_tax')) document.querySelector('.keyx-total_with_tax').remove();

    let html = "", totals = { total: { title: __('Total'), amount: 0 }, total_tax: { title: __('Tax'), amount: 0 }, total_with_tax: { title: __('Paid'), amount: 0 } };
    for(let price of document.querySelectorAll('.item-total')){

        let tax = makeNumber(price.dataset.value) * 0.09;
        totals['total'].amount += makeNumber(price.dataset.value);
        totals['total_tax'].amount += tax
        totals['total_with_tax'].amount += (makeNumber(price.dataset.value) + tax);
    };

    for(let i in totals){

        let display = totals[i].title;
        if(i == 'total_tax') display = preview._this.state.settings.tax_display + " (" + preview._this.state.settings.tax_rate + "%):";

        html += `
        <div class="mb-3 mt-3 order-row elipsized keyx-${i}">
            <b>${ display }</b><div class="order-form ms-2 d-inline-block" data-id="${ i }" data-type="key-number" data-value="${ totals[i].amount }">${ priceFormat(preview._this, totals[i].amount) }</div>
        </div>`;
    }

    html = `<div class="order-total">${ html }</div>`;

    document.querySelector('.modal-body-cont').insertAdjacentHTML("beforeend", html);

    // return html;
  },
  /*
  order JSON structure example
  {
      "id": "pDqeWHGI1648563700945",
      "idd": "ItqvUvlY1648563462357",
      "kid": "7851",
      "sid": "1000452",
      "from": "1 - WP Asia",
      "name": "WP Asia",
      "customer": {


      },
      "note": "",
      "note_vendor": "",
      "step": 1,
      "items": [
          {
              "id": "24adf24670cf977efe9386b781c9dc18124ac54b",
              "qty": 2,
              "note": "",
              "type": "new",
              "index": "27",
              "price": 10,
              "sdesc": "Deep Fried Gyoza with Mentai Sauce",
              "title": "11. MENTAI GYOZA",
              "total": 20,
              "variations": []
          },
          {
              "id": "c070bdb900bb47605b0056f96e7c4c9108fa22fe",
              "qty": 1,
              "note": "",
              "type": "new",
              "index": "24",
              "price": 8,
              "sdesc": "Deep-fried Sweet Prawn",
              "title": "8. AMAEBI KARAAGE",
              "total": 8,
              "variations": []
          }
      ],
      "table": "1",
      "total": 28,
      "status": "new",
      "created": 1648563701,
      "updated": 1648563701
  }
  */
  addOrderItem: (_this) => {

    onClick('.add-item', (e) => {

      let x = 0, itemArr = [], item = {};

      item.id = document.querySelector('.edit-item').dataset.id;   
      item.title = document.querySelector('.edit-item').value;   
      item.total = parseFloat(document.querySelector('.edit-tp').value);
      item.price = parseInt(document.querySelector('.edit-tp').dataset.price);
      item.qty = parseInt(document.querySelector('.edit-qty').value);
      item.note = "";
      item.variations = [];

      // working
      let count = 0;
      let list = document.querySelectorAll(".item-vars-input input");
      for(const inp of list){

            // console.log(v.checked);
            // let v = parseInt(inp.dataset.indexv);

            let v = count;
            if(inp.checked){

                if(!item.variations[v]) item.variations[v] = {};

                if(!item.variations[v].list) item.variations[v].list = {};

                if(!item.variations[v].title) item.variations[v].title = inp.dataset.titlev;

                // cache selected variations
                item.variations[v].list["_"+inp.dataset.index] = { title: inp.dataset.title, price: parseFloat(inp.dataset.price) }; 

                item.total += item.qty * parseFloat(inp.dataset.price);
                
                count +=1;
            }
      }

      // console.log(item.variations);

      // handle variations
    //   let count = 0;
    //   for(const cbg of document.querySelectorAll(".item-vars-input .kp-check input[type=checkbox][data-indexv='"+v+"']")){

    //       // checks if this block is required and allows checkout
    //       if(cb.dataset.required=="1"){ if(count) item.variations[v].allow = true; }else{ cart.state.product.variations[v].allow = true; }

    //       // cache selected variations
    //       if(cbg.checked){ cart.state.product.variations[v].list["_"+cbg.dataset.index] = {title: cbg.dataset.title, price: parseFloat(cbg.dataset.price) }; count +=1; }
    //   }

    //   // let count = 0;
    //   for(const rag of document.querySelectorAll(".item-vars-input .kp-radio input[type=radio][data-indexv='"+v+"']")){
      
    //       // console.log(rag.dataset.price);

    //       // cache selected variations
    //       if(rag.checked){ cart.state.product.variations[v].list["_"+rag.dataset.index] = {title: rag.dataset.title, price: parseFloat(rag.dataset.price) }; count +=1; }
          
    //       // checks if this block is required and allows checkout
    //       if(cb.dataset.required=="1"){ if(count) cart.state.product.variations[v].allow = true; }else{ cart.state.product.variations[v].allow = true; }
    //   }


      if(item.title.length<2){ alert(__('Incorrect product data')); return; }

      itemArr.push(item);

      let itemRow = preview.structOrderItemTable(_this, x, itemArr, true);

      document.querySelector('.new-item-row').insertAdjacentHTML("beforebegin", itemRow);

      preview.tableOrderItemListeners();

      // calculate totals for new orders only
      // if(_this.state.orderSingle._id == 'new') 
      preview.refreshTotals();

      // clear fields
      document.querySelector('.edit-item').value = "";   
      document.querySelector('.edit-tp').value = "";
      document.querySelector('.edit-qty').value = "";
      document.querySelector(".item-vars-input").innerHTML = "";

      // focus back to the input field
      setTimeout(() => { document.querySelector('.edit-item').focus(); }, 300);
    });
  },
}