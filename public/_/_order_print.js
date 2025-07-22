import { headers, showLoader, hideLoader, onClick, onKeyUp, simulateClick, parseApiError, spaceID, toast } from '@kenzap/k-cloud';
import { timeConverterAgo, priceFormat, getPageNumber, makeNumber, parseVariations, escape, unescape } from "../_/_helpers.js"
import { preview } from "../_/_order_preview.js"

export const print = {

    viewOrder: (_this) => {

        print._this = _this;
        onClick('.print-order', (e) => { print.renderOrder(_this, e); });
    },
    renderOrder: (_this, e) => {

        e.preventDefault();
        
        const date = new Date();
        let i = e.currentTarget.dataset.index; // _this.state.orderPreviewIndex = i;
        _this.state.orderSingle = _this.state.orders[i];
        let o = _this.state.orders[i];

        o.entity = "Fu Zhen Seafood";

        let data = {};
        data.print = _this.state.settings.receipt_template;

        // kenzapprint://kenzapprint.app?data=${ encodeURIComponent(JSON.stringify(applink)) }

        // var today = new Date();
        // var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        // var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

        // order id
        data.print = data.print.replace(/{{order_id_short}}/g, o.id.substr(0, 5));

        // current time
        data.print = data.print.replace(/{{date_time}}/g,   date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', }));

        // order items
        let items = '';
        for(let i in o.items){

            items += `[L]<b>${ o.items[i].qty } X ${ o.items[i].title }</b>[R]${ priceFormat(_this, o.items[i].total) }\n`;
            for(let v in o.items[i].variations){
    
                items += `[L]| ${ o.items[i].variations[v].title }:`;
                for(let l in  o.items[i].variations[v].list) items += ` ${ o.items[i].variations[v].list[l].title },`;

                if(items.endsWith(',')) items = items.substring(0, items.length - 1) + '\n';

                // parse variation list
                // let list = ''; for(let l in item[x].variations[v].list) list += item[x].variations[v].list[l].title + " ";
                // vars += '<div><b>' + item[x].variations[v].title + "</b> <span>" + list + "</span></div> ";
        
                // // meal note
                // if(item[x].variations[v].note !== undefined && item[x].variations[v].note.length > 0) vars += "<div><b>" + __('Note') + "</b> " + item[x].variations[v].note + "</div> ";
            }
        }
        if(items.endsWith('\n')) items = items.substring(0, items.length - 2);
        data.print = data.print.replace(/{{order_items}}/g, items);

        // order note
        let note = o.note.length == 0 || o.note == '<br>' ? '' : o.note;
        if(note.length>0){
            //  data.print += '[C]================================';
            data.print = data.print.replace(/{{order_note}}/g, '[C]================================\n' + note + '\n[C]================================\n');
        }
        // if(note.length>0) data.print += '[C]================================';

        // order totals
        data.print = data.print.replace(/{{total}}/g, priceFormat(_this, o.price.total));
        data.print = data.print.replace(/{{total_tax}}/g, priceFormat(_this, o.price.tax_total));
        data.print = data.print.replace(/{{grand_total}}/g, priceFormat(_this, o.price.grand_total));
        
        // debug vs actual print
        data.debug = false;


        // let click = document.querySelector(".print-order[data-id='"+e.currentTarget.dataset.id+"']");


        // click.setAttribute('href', 'kenzapprint://kenzapprint.app?data='+encodeURIComponent(JSON.stringify(data)));

        // e.currentTarget.setAttribute('href', 'kenzapprint://kenzapprint.app?data='+JSON.stringify(data));

        console.log('kenzapprint://kenzapprint.app?data='+encodeURIComponent(JSON.stringify(data)));

        toast(__('Printing j'));

        // return true;

        location.href = 'kenzapprint://kenzapprint.app?data='+encodeURIComponent(JSON.stringify(data));

        return false;
        
        // window.location.href = 'kenzapprint://kenzapprint.app?data='+JSON.stringify(data);
        // simulateClick(click);

        
    }
}