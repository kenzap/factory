import { EditPost } from "../_/components/blog/edit_post.js";
import { BlogPostRow, BlogService, SearchComponent } from "../_/components/blog/helpers.js";
import { Component } from "../_/components/component.js";
import { getPageNumber, getPagination, replaceQueryParam } from "../_/components/products/helpers.js";
import { __html, hideLoader, initBreadcrumbs, link, parseApiError, showLoader, toast } from "../_/helpers/global.js";
import { bus } from "../_/modules/bus.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

// Main Post List Component
class Blog extends Component {
    constructor() {
        super();
        this.state = {
            posts: [],
            loading: false,
            firstLoad: true,
            limit: 50,
            offset: 0,
            searchQuery: ''
        };

        this.blogService = new BlogService();
        this.searchComponent = new SearchComponent(this.handleSearch.bind(this));
        // this.postModal = new PostModal(this.blogService, this.refresh.bind(this));

        this.init();
    }

    async init() {

        new Modal();
        this.render();
        await this.loadData();
        new Session();
        new Footer();
    }

    render() {
        if (!this.state.firstLoad) return;

        document.querySelector('#app').innerHTML = this.getTemplate();
        this.initBreadcrumbs();
        this.attachListeners();
    }

    getTemplate() {
        return `
            <div class="container">
                <div class="d-sm-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                    <button class="btn btn-primary btn-add-post mt-2 mt-sm-0" data-postid="0" type="button">${__html('Add article')}</button>
                </div>
                <div class="row">
                    <div class="col-md-12 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
                        <div class="card border-white shadow-sm">
                            <div class="card-body">
                                <div class="no-footer">
                                    <div class="row">
                                        <div class="col-sm-12">
                                            <div class="table-responsive">
                                                <table
                                                    class="table table-hover table-borderless align-middle table-striped table-p-list" style="min-width: 800px;">
                                                    <thead>
                                                        <tr>
                                                            <th class="d-flex align-items-center justify-content-center" style="width: 40px;">
                                                                ${this.searchComponent.render()}
                                                            </th>
                                                            <th style="width: 410px;">
                                                                ${this.searchComponent.renderInput()}
                                                            </th>
                                                            <th>${__html("Status")}</th>
                                                            <th>${__html("Tags")}</th>
                                                            <th>${__html("Updated")}</th>
                                                            <th class="text-end pe-3"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody></tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-sm-12 col-md-5">
                                            <div class="dataTables_info mt-3 text-secondary fw-lighter" id="listing_info" role="status" aria-live="polite">&nbsp;</div>
                                        </div>
                                        <div class="col-sm-12 col-md-7">
                                            <div class="dataTables_paginate paging_simple_numbers mt-3" id="listing_paginate"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initBreadcrumbs() {
        initBreadcrumbs([
            { link: link('/home/'), text: __html('Home') },
            { text: __html('Blog') }
        ]);
    }

    attachListeners() {
        if (!this.state.firstLoad) return;

        this.addListener('.btn-add-post', 'click', this.handleAddPost.bind(this));
        this.addListener('.bi-search', 'click', this.handleSearchActivate.bind(this));

        bus.on('posts:refresh', () => {

            // console.log('Posts list refresh triggered');

            this.loadData();
        });
    }

    async loadData() {
        if (this.state.firstLoad) showLoader();

        this.setState({ loading: true });

        try {
            const params = {
                s: this.searchComponent.getValue(),
                limit: this.state.limit,
                offset: (getPageNumber() - 1) * this.state.limit
            };

            const response = await this.blogService.getPosts(params);

            hideLoader();

            new Locale(response);

            new Header({
                hidden: false,
                title: __html('Blog'),
                icon: 'card-text',
                style: 'navbar-light',
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.setState({
                posts: response.posts,
                settings: response.settings,
                meta: response.meta,
                loading: false,
                firstLoad: false
            });

            this.renderPosts();
            this.initPagination(response);

        } catch (error) {
            hideLoader();
            this.setState({ loading: false });
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    renderPosts() {
        const tbody = document.querySelector(".table tbody");

        if (this.state.posts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">${__html("No posts to display.")}</td></tr>`;
            return;
        }

        const postRows = this.state.posts.map((post, i) => {
            post.i = i;
            const row = new BlogPostRow(post, this.state.settings);
            return row.render();
        }).join('');

        tbody.innerHTML = postRows;

        // Attach listeners to each row
        this.state.posts.forEach(post => {
            const row = new BlogPostRow(post, this.state.settings);
            row.attachListeners();
        });
    }

    async handleDeletePost(postId) {

        await this.blogService.deletePost(postId);



        toast('Post removed successfully', 'success');

        this.refresh();
    }

    handleAddPost(e) {
        e.preventDefault();

        console.log('Add new post clicked', this.state);

        new EditPost({ _id: null, text: '' }, this.state.settings, this.refresh.bind(this));
    }

    handleSearchActivate(e) {
        if (e) e.preventDefault();
        this.searchComponent.activate();
    }

    handleSearch(query) {
        this.setState({ searchQuery: query });

        const str = replaceQueryParam('page', 1, window.location.search);
        window.history.replaceState("pagination", document.title, window.location.pathname + str);

        this.loadData();
    }

    initPagination(response) {
        getPagination(response.meta, this.loadData.bind(this));
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    refresh() {
        this.setState({ firstLoad: false });
        this.loadData();
    }
}

// Initialize the application
new Blog();