import { createPost } from "../../api/create_post.js";
import { deletePost } from "../../api/delete_post.js";
import { getPosts } from "../../api/get_posts.js";
import { savePost } from "../../api/save_post.js";
import { __html, FILES, spaceID } from "../../helpers/global.js";
import { Component } from "../component.js";

export class Post {
    constructor(data, settings) {

        this.settings = settings || {};

        Object.assign(this, data);
    }

    get imageUrl() {
        if (this.cad_files?.length) {
            return `${FILES}/${this._id}-250.webp`;
        }

        if (this.img?.[0]) {
            return `${FILES}/S${spaceID()}/post-${this._id}-1-100x100.jpeg?${this.updated}`;
        }

        return 'https://cdn.kenzap.com/loading.png';
    }

    get displayTitle() {
        return this.title || this.title_default || '';
    }

    get displayDescription() {
        return this.sdesc || this.sdesc_default || '';
    }

    get formattedStatus() {
        return this.status ? this.status.charAt(0).toUpperCase() + this.status.slice(1) : '';
    }

    get formattedTime() {
        return this.updated ? new Date(this.updated).toLocaleDateString() : '';
    }
}

// Search Component
export class SearchComponent extends Component {
    constructor(onSearch) {
        super();
        this.onSearch = onSearch;
        this.isActive = false;
    }

    render() {
        return `
            <div class="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#212529" class="bi bi-search mb-0" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
            </div>
        `;
    }

    renderInput() {
        return `
            <div class="search-cont input-group input-group-sm mb-0 p-0 justify-content-start">
                <input type="text" placeholder="${__html('Search posts')}" class="form-control border-top-0 p-0 border-start-0 border-end-0 rounded-0" style="max-width: 200px;">
            </div>
            <span>${__html("Title")}</span>
        `;
    }

    activate() {
        if (this.isActive) return;

        const titleSpan = document.querySelector('.table-p-list thead tr th:nth-child(2) span');
        const searchCont = document.querySelector('.table-p-list thead tr th:nth-child(2) .search-cont');
        const input = document.querySelector('.table-p-list thead tr th:nth-child(2) .search-cont input');

        titleSpan.style.display = 'none';
        searchCont.style.display = 'flex';
        input.focus();

        this.addListener(input, 'keyup', this.handleSearch.bind(this));
        this.isActive = true;
    }

    handleSearch(e) {
        e.preventDefault();
        this.onSearch(e.target.value);
    }

    getValue() {
        const input = document.querySelector('.search-cont input');
        return input ? input.value : '';
    }
}

//  Service
export class BlogService {
    constructor() {
        this.controller = null;
    }

    async getPosts(params = {}) {
        if (this.controller) this.controller.abort();

        this.controller = new AbortController();

        return new Promise((resolve, reject) => {
            getPosts(
                { ...params, signal: this.controller.signal },
                (response) => {
                    if (response.error) reject(response.error);
                    else resolve(response);
                }
            );
        });
    }

    async createPost(data) {
        return new Promise((resolve, reject) => {
            createPost(data, (response) => {
                if (response.error) reject(response.error);
                else resolve(response);
            });
        });
    }

    async deletePost(id) {
        return new Promise((resolve, reject) => {
            deletePost({ id }, (response) => {
                if (response.error) reject(response.error);
                else resolve(response);
            });
        });
    }

    async updatePost(data) {
        return new Promise((resolve, reject) => {
            savePost(data, (response) => {
                if (response.error) reject(response.error);
                else resolve(response);
            });
        });
    }
}