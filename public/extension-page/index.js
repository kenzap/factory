import { getExtensionRegistry } from "../_/api/get_extension_registry.js";
import { __html, H, hideLoader, initBreadcrumbs, parseApiError } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

class ExtensionPage {

    constructor() {
        this.init();
    }

    init = () => {
        new Modal();

        getExtensionRegistry(async (response) => {
            if (!response.success) return;

            hideLoader();

            this.response = response;
            this.registry = response.registry || { pages: [] };
            this.user = response.user;

            new Locale(response);
            new Session();

            const page = this.resolvePage();

            new Header({
                hidden: false,
                title: page?.title || __html('Extension'),
                icon: page?.icon || 'bi bi-puzzle',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            new Footer(response);

            this.renderShell(page);
            this.renderBreadcrumbs(page);

            if (!page) return;

            try {
                await this.loadPageModule(page);
            } catch (error) {
                this.renderError(`Failed to load extension page module. ${error?.message || error}`);
            }
        });
    }

    resolvePage = () => {
        const params = new URLSearchParams(window.location.search);
        const extension = (params.get('extension') || '').trim();
        const pageId = (params.get('page') || '').trim();

        if (!extension || !pageId) return null;

        return (this.registry.pages || []).find((page) => page.extension === extension && page.id === pageId) || null;
    }

    renderBreadcrumbs = (page) => {
        initBreadcrumbs([
            { link: '/home/', text: __html('Home') },
            { text: page?.title || __html('Extension') },
        ]);

        document.title = page?.title || __html('Extension');
    }

    renderShell = (page) => {
        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container p-edit extension-page-shell">
                <div class="d-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                </div>
                <div class="surface-card p-4 p-lg-5">
                    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-start mb-4">
                        <div>
                            <div class="extension-badge mb-3">
                                <i class="bi bi-puzzle"></i>
                                <span>${page?.extension_name || __html('Extension')}</span>
                            </div>
                            <h1 class="page-title mb-2">${page?.title || __html('Extension page not found')}</h1>
                            <p class="page-copy mb-0">${page?.desc || __html('This extension page is not available for the current account or the extension is disabled.')}</p>
                        </div>
                    </div>
                    <div id="extension-page-root"></div>
                </div>
            </div>
        `;

        if (!page) {
            this.renderError(__html('The requested extension page is not available.'));
        }
    }

    renderError = (message) => {
        const mount = document.querySelector('#extension-page-root');
        if (!mount) return;

        mount.innerHTML = /*html*/`
            <div class="alert alert-danger shell-error mb-0">${message}</div>
        `;
    }

    injectStyles = (page) => {
        (page?.style_urls || []).forEach((href) => {
            if (document.querySelector(`link[data-extension-style="${href}"]`)) return;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.dataset.extensionStyle = href;
            document.head.appendChild(link);
        });
    }

    loadPageModule = async (page) => {
        this.injectStyles(page);

        const module = await import(page.module_url);
        const mount = module.mount || module.default;

        if (typeof mount !== 'function') {
            throw new Error('Extension page must export a mount(context) function.');
        }

        await mount({
            mount: document.querySelector('#extension-page-root'),
            page,
            response: this.response,
            user: this.user,
            locale: this.response.locale,
            settings: this.response.settings,
            fetchJson: async (url, body = {}) => {
                const result = await fetch(url, {
                    method: 'post',
                    headers: H(),
                    body: JSON.stringify(body),
                });

                const data = await result.json();
                if (!result.ok || data?.success === false) {
                    parseApiError(data);
                    throw new Error(data?.error || `Request failed: ${result.status}`);
                }

                return data;
            }
        });
    }
}

window.extensionPage = new ExtensionPage();
