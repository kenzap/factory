import { link, __attr, __html } from '@kenzap/k-cloud';

export const HTMLContent = () => {
 
    return `
        <div class="cat-controls">
            <div class="tags-holder">
                <div class="cata-sub-nav head">
                    <div class="arrow-holder-prev arrow-holder d-none">
                        <div class="nav-prev arrow">
                            <span>&lt;</span>
                        </div>
                    </div>
                    <div class="slideset">
                        <div class="slide"><a href="#" data-cat="${ __attr("Rainwater systems") }" class="cl">${ __html("Rainwater systems") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Window sill") }" class=" cl">${ __html("Window sill") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Stovepipe cap") }" class=" cl">${ __html("Stovepipe cap") }</a></div>
                        <div class="slide d-none"><a href="#" data-cat="${ __attr("Sheet metal") }" class=" cl">${ __html("Sheet metal") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Roofing") }" class=" cl">${ __html("Roofing") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Flange") }" class=" cl">${ __html("Flange") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Eaves element") }" class=" cl">${ __html("Eaves element") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Parapet") }" class=" cl">${ __html("Parapet") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Rake edge") }" class=" cl">${ __html("Rake edge") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Ridge") }" class=" cl">${ __html("Ridge") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Roof hatch") }" class=" cl">${ __html("Roof hatch") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Snow barrier system") }" class=" cl">${ __html("Snow barrier system") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Ventilation") }" class=" cl">${ __html("Ventilation") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Roof valley") }" class=" cl">${ __html("Roof valley") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Drip edge") }" class=" cl">${ __html("Drip edge") }</a></div>
                        <div class="slide"><a href="#" data-cat="${ __attr("Other Designs") }" class=" cl d-none">${ __html("Other Designs") }</a></div>
                    </div>
                    <div class="arrow-holder-next arrow-holder" style="display: none;">
                        <div class="nav-next arrow">
                            <span>&gt;</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="d-flex flex-nowrap bd-highlight align-items-center">
            <input id="search" autocomplete="off" class="form-control my-3 border-0" type="text" placeholder="${ __attr("Search..") }" style="max-width:200px;" aria-label="default input example">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#212529" class="clear-search bi bi-x-circle po text-start ms-3 d-none" data-i="0" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path>
            </svg>
        </div>

        <h3 class="search-title mb-4 d-none"></h3>

        <div class="contain"> 
            <div class="search-results row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2 g-lg-3 d-none">


            </div>
        </div>

        <div class="accordion" id="accordionPanelsStayOpenExample">

            <div class="accordion-item border-0">
            <h2 class="accordion-header" id="acc-heading-2">
                <button class="accordion-button first collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#acc-2" aria-expanded="false" aria-controls="panelsStayOpen-collapseTwo" data-cats="${ __attr("Stovepipe cap") }|${ __attr("Drip edge") }|${ __attr("Flange") }|${ __attr("Rake edge") }|${ __attr("Ridge") }|${ __attr("Roof hatch") }|${ __attr("Roofing panel") }|${ __attr("Ventilation Element") }|${ __attr("Snow Barrier System") }">
                ${ __html('ROOFING ELEMENTS') }
                </button>
            </h2>
            <div id="acc-2" class="accordion-collapse collapse" aria-labelledby="acc-heading-2">
                <div class="accordion-body p-0 pt-4 bg-light row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2 g-lg-3" data-cats="Stovepipe cap|Drip edge|Flange|Rake edge|Ridge|Roof hatch|Roofing panel|Ventilation Element|Snow Barrier System">


                </div>
            </div>
            </div>

            <div class="accordion-item border-0">
            <h2 class="accordion-header" id="acc-heading-3">
                <button class="accordion-button  collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#acc-3" aria-expanded="false" aria-controls="panelsStayOpen-collapseThree" data-cats="${ __attr("Window sill") }|${ __attr("Metal cap") }|${ __attr("Parapet") }">
                ${ __html('FOR FACADES') }
                </button>
            </h2>
            <div id="acc-3" class="accordion-collapse collapse" aria-labelledby="acc-heading-3">
                <div class="accordion-body p-0 pt-4 bg-light row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2 g-lg-3" >

                
                </div>
            </div>
            </div>

            <div class="accordion-item border-0">
            <h2 class="accordion-header" id="acc-heading-4">
                <button class="accordion-button  collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#acc-4" aria-expanded="false" aria-controls="panelsStayOpen-collapseThree" data-cats="${ __attr("Rainwater systems") }">
                ${ __html('RAINWATER SYSTEMS') }
                </button>
            </h2>
            <div id="acc-4" class="accordion-collapse collapse" aria-labelledby="acc-headin4">
                <div class="accordion-body p-0 pt-4 bg-light row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2 g-lg-3" data-cats="Rainwater systems">

                
                </div>
            </div>
            </div>

            <div class="accordion-item border-0 d-none">
            <h2 class="accordion-header" id="acc-heading-5">
                <button class="accordion-button  collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#acc-5" aria-expanded="false" aria-controls="panelsStayOpen-collapseThree" data-cats="${ __attr("Sheet metal") }">
                ${ __html('SHEET METAL') }
                </button>
            </h2>
            <div id="acc-5" class="accordion-collapse collapse" aria-labelledby="acc-heading-5">
                <div class="accordion-body p-0 pt-4 bg-light row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2 g-lg-3" data-cats="Sheet metal">

        
                </div>
            </div>
            </div>

            <div class="accordion-item border-0 d-none">
            <h2 class="accordion-header" id="acc-heading-5">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#acc-5" aria-expanded="false" aria-controls="panelsStayOpen-collapseThree">
                ${ __html('INSTRUMENTS') }
                </button>
            </h2>
            <div id="acc-5" class="accordion-collapse collapse" aria-labelledby="acc-heading-5">
                <div class="accordion-body p-0 pt-4 bg-light">
                <strong>This is the third item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body p-0 pt-4 bg-light</code>, though the transition does limit overflow.
                </div>
            </div>
            </div>
        </div>
    `;
}