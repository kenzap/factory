import { getCoatings } from "../_/api/get_coatings.js";
import { getMetalLog } from "../_/api/get_metal_log.js";
import { getOrdersCuttingSummary } from "../_/api/get_orders_cutting_summary.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

/**  
 * Main navigation menu page of the dashboard.
 * Loads HTMLContent from _cnt_home.js file.
 * Renders menu items in a list view manner
 * 
 * @version 1.0
 */
class Cutting {

    // construct class
    constructor() {

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getCoatings((response) => {

            console.log(response);

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'cutting_journal')) return

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                title: __html('Metal Cutting'),
                icon: 'gear-fill',
                style: 'navbar-dark bg-dark',
                user: response?.user,
                controls: `     
                    <!-- Search Container -->
                    <div class="search-container d-flex align-items-center">
                        <div class="me-0">
                            <input type="text" id="coatingSearch" class="form-control search-input" placeholder="${__html('Search colors (e.g., RAL-3005, RR-23)...')}" style="width: 350px;">
                        </div>
                    </div>
                    `,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            // init footer
            new Footer(response);

            // Merge coating/color pairs from metal log so missing blocks are visible in cutting journal.
            getMetalLog({}, (metalResponse) => {
                this.metalRecords = metalResponse?.records || [];

                // init navigation blocks
                this.initBlocks();

                // load page html
                this.html();

                this.listeners();

                // set page title
                document.title = __html('Metal Cutting');
            });
        });

        // get cutting summary
        getOrdersCuttingSummary({}, (response) => {

            response.summary.forEach((item) => {

                const selector = `.color-card[data-slug="${item.coating.toLowerCase().replace(/\s+/g, '-')}-${item.color.toLowerCase().replace(/\s+/g, '-')}"] .counter-bubble`;

                const counterBubble = document.querySelector(selector);

                if (counterBubble) {
                    counterBubble.textContent = item.count;
                    counterBubble.style.display = item.count > 0 ? 'block' : 'none';
                }
            });
        });
    }

    initBlocks = () => {

        const normalize = (value) => String(value || '').trim();
        const slugify = (value) => normalize(value).toLowerCase().replace(/\s+/g, '-');
        const isAvailable = (status) => normalize(status).toLowerCase() === 'available';

        this.blocks = [
            {
                coating: "Client Material",
                colors: [
                    { slug: "cm", color: "CM" }
                ]
            },
            {
                coating: "Other",
                colors: [
                    { slug: "", color: "" }
                ]
            },
        ];

        const coatingSet = new Set(
            (this.settings.var_parent || '')
                .split('\n')
                .map(normalize)
                .filter(Boolean)
        );

        // Include coating names that exist in settings.price.
        (this.settings.price || []).forEach((priceItem) => {
            if (priceItem?.parent) coatingSet.add(normalize(priceItem.parent));
        });

        // Include coating names from supplylog (metallog source of truth for available metal).
        (this.metalRecords || []).forEach((record) => {
            if (!isAvailable(record?.status)) return;
            if (record?.coating) coatingSet.add(normalize(record.coating));
        });

        [...coatingSet].forEach((coating) => {
            if (!coating) return;

            this.blocks.push({
                coating: coating,
                colors: [],
            })
        });

        // Fill colors from settings price matrix.
        (this.settings.price || []).forEach((priceItem) => {
            if (priceItem.parent) {
                // Find the matching block by parent name
                const block = this.blocks.find(b => b.coating === normalize(priceItem.parent));
                if (block) {
                    block.colors.push({
                        // /assets/textures/matt-polyester-2h3.jpeg
                        slug: `${slugify(priceItem.parent)}-${slugify(priceItem.title || '*')}`,
                        color: priceItem.title || priceItem.id || '*',
                    });
                }
            }
        });

        // Fill colors from supplylog records to ensure missing blocks/cards appear in cutting journal.
        (this.metalRecords || []).forEach((record) => {
            if (!isAvailable(record?.status)) return;
            const coating = normalize(record?.coating);
            const color = normalize(record?.color);
            if (!coating || !color) return;

            const block = this.blocks.find(b => b.coating === coating);
            if (!block) return;

            const slug = `${slugify(coating)}-${slugify(color)}`;
            if (!block.colors.some((c) => c.color === color)) {
                block.colors.push({ slug, color });
            }
        });

        this.blocks.reverse();
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container">
                    <div class="filter-tabs">
                        <div class="filter-tab active" data-filter="all">${__html('All')}</div>
                        ${this.blocks
                .map((b) => b.coating)
                .filter((coating) => coating !== 'Client Material' && coating !== 'Other')
                .map((filter) => {
                    return `<div class="filter-tab" data-filter="${filter}">${filter}</div>`;
                }).join('')}
                        <div class="filter-tab" data-filter="others">${__html('Others')}</div>
                    </div>
                ${this.blocks.map((o) => {
                    return `

        <div id="matpe-section" class="coating-section">
            <div class="section-title d-none">${__html(o.coating)}</div>
            <div class="color-grid" data-type="${o.coating}">
                ${o.colors.sort((a, b) => a.color.localeCompare(b.color)).map((c) => {
                        return `
                    <div class="color-card" data-code="${c.color}" data-type="${o.coating}" data-slug="${c.slug}" >
                        <div class="color-preview" style="background-image: url('/assets/textures/${c.slug}.jpeg'); background-size: cover; background-position: center;">
                            <div class="counter-bubble">0</div>
                        </div>
                        <div class="color-info">  
                            <div class="color-code">${__html(c.color)}</div>
                            <div class="color-type">${__html(o.coating)}</div>
                        </div>
                    </div>`;
                    }).join('')}
            </div>
        </div>    
                        `
                }).join('')}
  
        </div>`;
    }

    // init page listeners
    listeners = () => {

        // Search functionality
        const searchInput = document.getElementById('coatingSearch');
        const colorCards = document.querySelectorAll('.color-card');
        const filterTabs = document.querySelectorAll('.filter-tab');
        const coatingSections = document.querySelectorAll('.coating-section');

        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();

            colorCards.forEach(card => {
                const colorCode = card.dataset.code.toLowerCase();
                const colorType = card.dataset.type.toLowerCase();

                if (colorCode.includes(searchTerm) || colorType.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        // Filter functionality
        filterTabs.forEach(tab => {
            tab.addEventListener('click', function () {

                // Remove active class from all tabs
                filterTabs.forEach(t => t.classList.remove('active'));

                // Add active class to clicked tab
                this.classList.add('active');

                const filterType = this.dataset.filter;

                if (filterType === 'all') {
                    coatingSections.forEach(section => section.style.display = 'block');
                    colorCards.forEach(card => card.style.display = 'block');
                } else if (filterType === 'others') {
                    coatingSections.forEach(section => {
                        const sectionType = section.querySelector('.color-grid').dataset.type;
                        if (sectionType === 'Client Material' || sectionType === 'Other') {
                            section.style.display = 'block';
                        } else {
                            section.style.display = 'none';
                        }
                    });
                } else {
                    coatingSections.forEach(section => {
                        const sectionType = section.querySelector('.color-grid').dataset.type;
                        if (sectionType === filterType) {
                            section.style.display = 'block';
                        } else {
                            section.style.display = 'none';
                        }
                    });
                }

                // Hide coating sections that have no visible colors
                coatingSections.forEach(section => {
                    const visibleCards = section.querySelectorAll('.color-card[style*="display: block"], .color-card:not([style*="display: none"])');
                    if (visibleCards.length === 0) {
                        section.style.display = 'none';
                    }
                });
            });
        });

        // Color card click functionality
        colorCards.forEach(card => {
            card.addEventListener('click', function () {

                // Add click animation
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 300);

                // Get color info
                const colorCode = this.dataset.code;
                const colorType = this.dataset.type;
                const slug = this.dataset.slug;

                location.href = `/cutting-list/?color=${colorCode}&coating=${colorType}&slug=${slug}`;
            });
        });

        // Add hover effects for better UX
        colorCards.forEach(card => {
            card.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-5px) scale(1.02)';
            });

            card.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
}

new Cutting();
