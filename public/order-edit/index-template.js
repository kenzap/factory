import { getOrder } from "/_/api/get_order.js";
import { hideLoader } from "/_/helpers/global.js";
import { Modal } from "/_/modules/modal.js";
import { Session } from "/_/modules/session.js";

/**
 * Order Crteate/Edit Page
 * 
 * @version 1.0
 */
class OrderEdit {

    // construct class
    constructor() {

        // get id from url parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        this.id = urlParams.get('id');

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getOrder(this.id, (response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;

            // session
            new Session();

            // init header
            // new Header(response);

            console.log(response);

            // no authenticated => stop here
            // if (!response.user) return;

            // console.log(response);

            // load page html 
            this.html();

            // render page
            this.render();

            // init footer
            // new Footer(response);

            console.log(response);
        });
    }

    // load page
    html = () => {

        // document.querySelector('#app').innerHTML = /*html*/`
        //     <div class="container p-edit">
        //         <div class="d-flex justify-content-between bd-highlight mb-3">
        //             <nav class="bc" aria-label="breadcrumb"></nav>
        //         </div>
        //         <div class="row">
        //         ${this.blocks.map((block) => {
        //     return `
        //                 <div class="col-lg-4 grid-margin stretch-card mb-4">
        //                     <div class="card border-white shadow-sm p-sm-2 anm br" >
        //                         <div class="card-body">
        //                             <div class="d-flex flex-row">
        //                                 ${block.icon}
        //                                 <div class="mr-4 mr-md-0 mr-lg-4 text-left text-lg-left ">
        //                                     <h5 class="card-title mb-0">${__html(block.title)} <button type="button" class="d-none btn-close float-end fs-6 rm-ext"></button></h5>
        //                                     <p class="card-description mt-1 mb-0">${__html(block.desc)}</p>
        //                                     <div class="link-group">
        //                                         ${block.links.map((link) => {
        //         return `<a class="mt-2 me-2 text-md-tight text-primary" href="${attr(link.link)}" target="${attr(link.target ? link.target : "_self")} data-ext="pages">${html(link.text)}</a>`
        //     }).join('')}
        //                                     </div>
        //                                 </div>
        //                             </div>                  
        //                         </div>
        //                     </div>
        //                 </div>
        //                 `
        // }).join('')}
        //         </div>
        //     </div>
        // </div>`;
    }

    // render page
    render = () => {

        // initiate breadcrumbs
        // initBreadcrumbs(
        //     [
        //         { text: __html('Home') },
        //     ]
        // );
    }

    // listeners
    listeners = () => {


    }
}

new OrderEdit();