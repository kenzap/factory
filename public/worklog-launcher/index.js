import { getHome } from "../_/api/get_home.js";
import { PreviewWorkLog } from "../_/components/order/preview_worklog.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Main navigation menu page of the dashboard.
 * Loads HTMLContent from _cnt_home.js file.
 * Renders menu items in a list view manner
 * 
 * @version 1.0 
 */
class Launcher {

    // construct class
    constructor() {

        this.filters = ['K-style', 'Ø 125/100', 'Ø 150/120', 'Ø 150/140', 'Snow retention'];

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getHome((response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.user = response.user;

            // console.log(this.user.rights);

            // locale
            new Locale(response);

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                title: __html('Work Report'),
                icon: 'bi bi-journal-text',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            // init footer
            new Footer(response);

            // init navigation blocks
            this.initBlocks();

            // load page html 
            this.html();

            // render page
            this.render();
        });
    }

    initBlocks = () => {

        // add or remove navigation blocks to the dashboard
        this.blocks = [
            {
                id: "ccb33b325da0bf4bb549cf5fe628ee35f1dd801a",
                name: 'Teknes āķis, īsais',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://cdn.skarda.design/ccb33b325da0bf4bb549cf5fe628ee35f1dd801a-polyester-2h3-1500.webp?1770631046',
                actions: [
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'rounding', label: 'Noapaļojums', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-deg-bending', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "a285fbea7ea44db7d013baf8d14c4bf7aa3fb95f",
                name: 'Teknes āķis, garais',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://cdn.skarda.design/a285fbea7ea44db7d013baf8d14c4bf7aa3fb95f-polyester-2h3-1500.webp?1770298926',
                actions: [
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'rounding', label: 'Noapaļojums', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-deg-bending', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "8sgr31mh7x74qz29xtoma26xzr6h11s8xh88ryfc",
                name: 'Notekcaurules stiprinājums, ▢ A',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-e440dce02c04e62e10bed94443c1721795326d9e-1-500x500.jpeg?1770112847',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "rolling", tag: 'strip-rolling', label: 'Velmēšana', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "stamping", tag: 'rivet-assembly', label: 'Kniede', icon: '&#8548;', style: 'danger' },
                ]
            },
            {
                id: "6vllgat1um2s33lbm261rqa3u83zxlyhhlsb08w3",
                name: 'Notekcaurules stiprinājums, ▢ B',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-e440dce02c04e62e10bed94443c1721795326d9e-1-500x500.jpeg?1770112847',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "rolling", tag: 'strip-rolling', label: 'Velmēšana', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "stamping", tag: 'rivet-assembly', label: 'Kniede', icon: '&#8548;', style: 'danger' },
                ]
            },
            {
                id: "89911cfe658ab585333dd41d0cba1cb54b79ece6",
                name: 'Konektors',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://cdn.skarda.design/89911cfe658ab585333dd41d0cba1cb54b79ece6-polyester-2h3-1500.webp?1770282975',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "stamping", tag: 'cutting', label: 'Izgriešana', icon: '&#8544;&#8548;', style: 'warning' }
                ]
            },
            {
                id: "9a86fa4a62c37c566702dd5909c98c0b80e75cb6",
                name: 'Teknes gals, kreisais',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-9a86fa4a62c37c566702dd5909c98c0b80e75cb6-1-500x500.jpeg?1770284995',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "76f018d8083d99b46d8a40a2874cf5eacf9440df",
                name: 'Teknes gals, labais',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-76f018d8083d99b46d8a40a2874cf5eacf9440df-1-500x500.jpeg?1770284992',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "46b763e569fe5a5fec518f570012ccf6f7757af3",
                name: 'Teknes stūris, iekšējais',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-46b763e569fe5a5fec518f570012ccf6f7757af3-1-500x500.jpeg?1770285870',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "5bdfb7d0598bd4cf5cc98ee8f263cdf125a75e8a",
                name: 'Teknes stūris, ārējais',
                tags: [{ label: 'K-style', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-5bdfb7d0598bd4cf5cc98ee8f263cdf125a75e8a-1-500x500.jpeg?1770285873',
                actions: [
                    { type: "cutting", tag: 'strip-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "ba7f123a4ada5c56837971787bf797dd2f08ce90",
                name: 'Teknes āķa pagarinājums (leņķis)',
                tags: [{ label: 'K-style', cls: '' }, { label: 'Ø 125/100', cls: '' }, { label: 'Ø 150/120', cls: '' }, { label: 'Ø 150/140', cls: '' }],
                image: 'https://cdn.skarda.design/ba7f123a4ada5c56837971787bf797dd2f08ce90-polyester-2h3-1500.webp?1770298951',
                actions: [
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'oval-cutting', label: 'Ovāls', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '135-deg-bending', label: '135° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "0733c025924e3126b88b8166c01967c045158d5f",
                name: 'Teknes āķis, īsais Ø125',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://cdn.skarda.design/0733c025924e3126b88b8166c01967c045158d5f-polyester-2h3-1500.webp?1770298744',
                actions: [
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Noapaļojums', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'oval-cutout', label: 'Ovāls', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'clamp-assembly', label: 'Klemmeris', icon: '&#8544;&#8548;', style: 'warning' },
                ]
            },
            {
                id: "d9c8e1b3a0c8c9fbbacfa4e5b2a7c8f1e7a9b3c6d",
                name: 'Teknes āķis, garais Ø125',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://cdn.skarda.design/0cc6ed971fee4ce60ebdcf26b3da94b35cebd588-polyester-2h3-1500.webp?1770298911',
                actions: [
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Noapaļojums', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'oval-cutout', label: 'Ovāls', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurule', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'clamp-assembly', label: 'Klemmeris', icon: '&#8548;', style: 'danger' },
                ]
            },
            {
                id: "9du63ilsov3250y8w8l4tze4u4orlngzrw309l5x",
                name: 'Notekcaurules stiprinājums, ▢ A',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-6a74ea45d278d7f45b94c934e6eb040f3e872f9f-1-500x500.jpeg?1770363313',
                actions: [
                    { type: "cutting", tag: 'cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'strip-rolling', label: 'Velmēšana', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'rivet-assembly', label: 'Kniede', icon: '&#8548;', style: 'danger' },
                ]
            },
            {
                id: "gw9s1zftiyagk45fbx7xpsx51z6up06hqselgaey",
                name: 'Notekcaurules stiprinājums, ▢ B',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-6a74ea45d278d7f45b94c934e6eb040f3e872f9f-1-500x500.jpeg?1770363313',
                actions: [
                    { type: "cutting", tag: 'cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'strip-rolling', label: 'Velmēšana', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'rivet-assembly', label: 'Kniede', icon: '&#8548;', style: 'danger' },
                ]
            },
            {
                id: "85ea7560e183a0bbae9d50d2b71c776959dfba7d",
                name: 'Teknes gals Ø125 (pāris)',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-85ea7560e183a0bbae9d50d2b71c776959dfba7d-1-500x500.jpeg?1770285289',
                actions: [
                    { type: "cutting", tag: 'cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "stamping", tag: 'workpiece-preparation', label: 'Sagatave', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-taper', label: 'Sašaurinājums', icon: '&#8544;&#8548;', style: 'warning' },
                ]
            },
            {
                id: "4ad7b31d0a62f0b960fd86fc3567ceaa13d9c68a",
                name: 'Konektors Ø125/100',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-4ad7b31d0a62f0b960fd86fc3567ceaa13d9c68a-1-500x500.jpeg?1770361977',
                actions: [
                    { type: "cutting", tag: 'cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                ]
            },
            {
                id: "b10f7d2ead324118b75db26f48e2e870af209660",
                name: 'Teknes stūris, iekšējais Ø125',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-b10f7d2ead324118b75db26f48e2e870af209660-1-500x500.jpeg?1770286145',
                actions: [
                    { type: "cutting", tag: 'cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                ]
            },
            {
                id: "c95858c9d98f1020557c33b4e778972ea7ea9b97",
                name: 'Teknes stūris, ārējais Ø125',
                tags: [{ label: 'Ø 125/100', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-c95858c9d98f1020557c33b4e778972ea7ea9b97-1-500x500.jpeg?1770286142',
                actions: [
                    { type: "cutting", tag: 'cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                ]
            },
            {
                id: "e2de74f32b4edcb2fbc39e7ee32132dcf9bde48c",
                name: 'Sniega barjera stiprinājums, apaļai caurulei',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: 'https://cdn.skarda.design/e2de74f32b4edcb2fbc39e7ee32132dcf9bde48c-polyester-2h3-1500.webp?1770301845',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' }
                ]
            },
            {
                id: "73a8ce3cdd801ec74e21e597d8de09c19c9e8be9",
                name: 'Sniega barjera stiprinājums, apaļai caurulei (15mm metāla dakstiņveida jumtam)',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: 'https://cdn.skarda.design/73a8ce3cdd801ec74e21e597d8de09c19c9e8be9-polyester-2h3-1500.webp?1770299168',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'tail-forming', label: 'Aste', icon: '&#8544;', style: 'danger' },
                ]
            },
            {
                id: "a5baac79b35cd9abfa1387fb9bac5082872330d2",
                name: 'Sniega barjera stiprinājums, apaļai caurulei (35mm metāla dakstiņveida jumtam)',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: 'https://cdn.skarda.design/a5baac79b35cd9abfa1387fb9bac5082872330d2-polyester-2h3-1500.webp?1770299184',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'tail-forming', label: 'Aste', icon: '&#8544;', style: 'danger' },
                ]
            },
            {
                id: "27426689a5b18197a05a4ff3b643c6ac891e8bfe",
                name: 'Sniega barjera stiprinājums, ovālai caurulei',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: 'https://cdn.skarda.design/27426689a5b18197a05a4ff3b643c6ac891e8bfe-polyester-2h3-1500.webp?1770301849',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                ]
            },
            {
                id: "73a8ce3cdd801ec74e21e597d8de09c19c9e8be9",
                name: 'Sniega barjera stiprinājums, ovālai caurulei (15mm metāla dakstiņveida jumtam)',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: 'https://cdn.skarda.design/002d5c97a84ac24f9efb20458b062988b35a3e48-polyester-2h3-1500.webp',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'tail-forming', label: 'Aste', icon: '&#8544;', style: 'danger' },
                ]
            },
            {
                id: "890da7910731bdd1a73d10dfb79016ed42a4b3d8",
                name: 'Sniega barjera stiprinājums, ovālai caurulei (35mm metāla dakstiņveida jumtam)',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: 'https://cdn.skarda.design/890da7910731bdd1a73d10dfb79016ed42a4b3d8-polyester-2h3-1500.webp',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'hole-cutout', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' },
                    { type: "forming", tag: 'tail-forming', label: 'Aste', icon: '&#8544;', style: 'danger' },
                ]
            },
            {
                id: "zuag9fbxl35o7uat4mpy9z3xeks8yo5oiax946c2",
                name: 'Pretplāksne',
                tags: [{ label: 'Snow retention', cls: '' }],
                image: '',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'holes', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                    { type: "forming", tag: 'baseshape-forming', label: 'Formēšana', icon: '&#8544;&#8548;', style: 'warning' }
                ]
            },
            {
                id: "d769081bd7e0f55b298a7e9bae2fe8f667724524",
                name: 'Apakškore',
                tags: [{ label: 'Bending', cls: '' }],
                image: 'https://cdn.skarda.design/d769081bd7e0f55b298a7e9bae2fe8f667724524-polyester-2h3-1500.webp?1764010632',
                actions: [
                    { type: "cutting", tag: 'laser-cutting', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'holes', label: 'Caurules', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "bending", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "d769081bd7e0f55b298a7e9bae2fe8f667724524",
                name: 'Valcprofila fiksētie stiprinājumi',
                tags: [{ label: 'Bending', cls: '' }],
                image: 'https://cdn.skarda.design/43a2616a2ca44ed9466d045c4884e0b12da6786c-polyester-2h3-1500.webp?1770371759',
                actions: [
                    { type: "cutting", tag: 'baseshape-forming', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'forming', label: '1-daļa', icon: '&#8544;&#8544;', style: 'success' },
                    // { type: "bending", tag: '90-degree-angle', label: '90° leņķis', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
            {
                id: "b53b9dd346b121e181a0f6972f91373895f23b02",
                name: 'Valcprofila slīdošie stiprinājumi',
                tags: [{ label: 'Bending', cls: '' }],
                image: 'https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S1002170/sketch-b53b9dd346b121e181a0f6972f91373895f23b02-1-500x500.jpeg?1770371818',
                actions: [
                    { type: "cutting", tag: 'baseshape-forming', label: 'Griešana', icon: '&#8544;', style: 'secondary' },
                    { type: "forming", tag: 'forming-1', label: '1-daļa', icon: '&#8544;&#8544;', style: 'success' },
                    { type: "forming", tag: 'forming-2', label: '2-daļa', icon: '&#8544;&#8544;&#8544;', style: 'info' },
                ]
            },
        ]
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container">
                <div class="filter-tabs">
                    <div class="filter-tab active" data-filter="all" onclick="launcher.filter(this, '')">${__html('All')}</div>
                    ${this.filters.map((filter) => { return `<div class="filter-tab" onclick="launcher.filter(this)" data-filter="${filter}">${__html(filter)}</div>`; }).join('')}
                </div>
                <div class="d-flex justify-content-between bd-highlight mb-3 d-none">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                </div>
                <div id="cards" class="row grid"></div>
            </div>
        </div>`;
    }

    // generate card HTML for a product
    card = (p, pi) => {

        // product
        const tagsHtml = p.tags.map(t => `<span class="tag ${t.cls}">${__html(t.label)}</span>`).join('');

        // actions
        const btnsHtml = p.actions.map((a, ai) => `<button class="action-btn ${a.style}" onclick="launcher.openWorkLog('${pi}', '${ai}')"><span class="btn-icon">${a.icon}</span>${a.label}</button>`).join('');

        return /*html*/`
            <div class="card" data-filter="${p.tags.map(t => t.label).join(' ')}">
                <div class="card-stripe d-none"></div>
                <div class="card-header bg-white border-0">
                    <div class="product-img-wrap">
                        <img src="${p.image}" alt="${p.name}" onerror="this.outerHTML='<span class=\\'img-fallback\\'>⚙️</span>'"/>
                    </div>
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-tags">${tagsHtml}</div>
                    </div>
                </div>
                <div class="card-divider"></div>
                <div class="btn-grid">${btnsHtml}</div>
            </div>
        `;
    }

    // render page
    render = () => {

        const grid = document.getElementById('cards');

        const cardsHtml = this.blocks.map((p, index) => this.card(p, index)).join('');
        grid.innerHTML = cardsHtml;

        document.title = __html('Home');
    }

    // init page listeners
    listeners = () => {


    }

    filter = (el) => {

        const filterTabs = document.querySelectorAll('.filter-tab');
        const cards = document.querySelectorAll('.card');
        // const filter = this.filters.find(f => f === filter);

        // if (!filter) return;

        // Remove active class from all tabs
        filterTabs.forEach(t => t.classList.remove('active'));

        // Add active class to clicked tab
        el.classList.add('active');

        const filterType = el.dataset.filter;

        if (filterType === 'all') {
            cards.forEach(card => card.style.display = 'block');
        } else {
            cards.forEach(card => {
                if (card.dataset.filter.indexOf(filterType) !== -1) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    }

    // open work log modal for a specific product and action
    openWorkLog(pi, ai) {

        let block = this.blocks[pi];
        let action = block.actions[ai];

        let tag = action?.tag;
        let label = action?.label;

        let id = "", order_id = "", item_id = "", product_id = block.id, product_name = block.name, type = action.type, qty = 0, color = "-", coating = "-";

        new PreviewWorkLog({ type, tag, label, id, order_id, item_id, product_id, product_name, color, coating, qty, user_id: this.user.id }, (response) => {
            if (!response.success) {
                toast(__html('Error opening work log'));
                return;
            }
            if (response.success) {
                this.loadOrders();
            }
        });
    }
}

window.launcher = new Launcher();
