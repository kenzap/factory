import { createPost } from "../../api/create_post.js";
import { deletePost } from "../../api/delete_post.js";
import { getPost } from "../../api/get_post.js";
import { getPosts } from "../../api/get_posts.js";
import { savePost } from "../../api/save_post.js";
import { __html, FILES, formatTime, spaceID, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";
import { Component } from "../component.js";
import { EditPost } from "./edit_post.js";
import { EditPostSettings } from "./edit_post_settings.js";

export const formatTags = (tags) => {

    let html = '';
    if (tags) tags.forEach(tag => {

        html += '<div class="badge bg-light text-dark fw-light me-1">' + tag + '</div>';
    });

    return html;
}

export const formatStatus = (st) => {

    st = parseInt(st);
    switch (st) {
        case 0: return '<div class="badge bg-warning text-dark fw-light">Draft</div>';
        case 1: return '<div class="badge bg-primary fw-light">Published</div>';
        case 2: return '<div class="badge bg-dark fw-light">Private</div>';
        case 3: return '<div class="badge bg-secondary fw-light">Unpublished</div>';
        default: return '<div class="badge bg-secondary fw-light">Drafts</div>';
    }
}

export const postTags = (element) => {

    if (!element) {
        throw new Error("DOM Element is undifined! Please choose HTML target element.")
    }

    let DOMParent = element
    let DOMList
    let DOMInput
    let dataAttribute
    let arrayOfList

    function DOMCreate() {
        let ul = document.createElement("ul")
        let input = document.createElement("input")

        input.setAttribute('placeholder', 'new entry');

        DOMParent.appendChild(ul)
        DOMParent.appendChild(input)

        // first child is <ul>
        DOMList = DOMParent.firstElementChild
        // last child is <input>
        DOMInput = DOMParent.lastElementChild
    }

    function DOMRender() {
        // clear the entire <li> inside <ul>
        DOMList.innerHTML = ""

        // render each <li> to <ul>
        arrayOfList.forEach((currentValue, index) => {

            if (currentValue) {

                let li = document.createElement("li")
                li.innerHTML = `${currentValue} <a>&times;</a>`
                li.querySelector("a").addEventListener("click", function () {
                    onDelete(index)
                })

                DOMList.appendChild(li)
            }
        })

        setAttribute()
    }

    function onKeyUp() {
        DOMInput.addEventListener("keyup", function (event) {
            let text = this.value.trim()

            // check if ',' or 'enter' key was press
            if (text.includes(",") || event.keyCode === 13) {
                // check if empty text when ',' is remove
                if (text.replace(",", "") !== "") {
                    // push to array and remove ','
                    arrayOfList.push(text.replace(",", ""))
                }
                // clear input
                this.value = ""
            }

            DOMRender()
        })
    }

    function onDelete(id) {
        arrayOfList = arrayOfList.filter(function (currentValue, index) {
            if (index === id) {
                return false
            }
            return currentValue
        })

        DOMRender()
    }

    function getAttribute() {
        dataAttribute = DOMParent.getAttribute("data-simple-tags")
        dataAttribute = dataAttribute.split(",")

        // store array of data attribute in arrayOfList
        arrayOfList = dataAttribute.map((currentValue) => {
            return currentValue.trim()
        })
    }

    function setAttribute() {
        DOMParent.setAttribute("data-simple-tags", arrayOfList.toString())
    }

    getAttribute()
    DOMCreate()
    DOMRender()
    onKeyUp()
}

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

// Row Component
export class BlogPostRow extends Component {
    constructor(post, settings) {
        super();
        this.post = new Post(post);
        this.settings = settings || {};

        let img = 'https://cdn.kenzap.com/loading.png';

        if (!this.post.img) this.post.img = [];
        if (this.post.img[0]) img = this.post.img[0].replace('-720.jpeg', '-100.jpeg') + '?' + this.post.updated;

        this.post.img = img || 'https://cdn.kenzap.com/loading.png';
    }

    render() {
        return `
            <tr>
                <td>
                    <div class="timgc ">
                        <a class="edit-post" data-action="edit" href="#" data-id="${this.post._id}"><img src="${this.post.img}" data-srcset="${this.post.img}" class="img-fluid rounded" alt="${__html("Product placeholder")}" srcset="${this.post.img}" ></a>
                    </div>
                </td>
                <td class="destt" style="max-width:250px;min-width:250px;">
                    <div class="mb-2 mt-2"> 
                        <a class="post-title edit-post" data-id="${this.post._id}" href="#" data-action="edit" >
                            ${this.post.title}<i style="color:#9b9b9b;font-size:15px;margin-left:8px;" title="${__html("Edit post")}" class="mdi mdi-pencil menu-icon edit-page"></i></a>
                            ${this.post.slug ? `<div class="form-text mt-0 fst-italic" style="font-size: 0.8rem;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
    <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
    <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
    </svg>${this.post.slug}</div>` : ``}
                    </div>
                </td>
                <td>
                    <span class="edit-settings" data-i="${this.post.i}" data-id="${this.post._id}" data-title="${this.post.title}">${formatStatus(this.post.status)}</span>
                </td>
                <td style="max-width:200px;">
                    <span class="edit-settings" data-i="${this.post.i}" data-id="${this.post._id}" data-title="${this.post.title}">${formatTags(this.post.tags)}</span>
                </td>
                <td>
                    <span>${formatTime(this.post.updated)}</span>
                </td>
                <td class="d-none"> 
                    <a href="#" data-id="${this.post._id}" class="remove-post text-danger ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </a>
                    <i title="${__html("Remove this post")}" data-key="${this.post.id}" class="mdi mdi-trash-can-outline list-icon remove-post"></i>
                </td>
                <td style="text-align:right;" class="">
                    <button class="btn btn-sm dropdown-toggle" type="button" id="dropdownMenuSizeButton${this.post.i}" data-i="${this.post.i}" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">${__html('Option')}</button>
                    <div class="dropdown-menu" aria-labelledby="dropdownMenuSizeButton${this.post.i}" >
                        <a class="dropdown-item preview" href="${`https://${this.settings.domain_name}/${this.post.language}/${this.post.slug}`}" target="_blank" data-id="${this.post._id}" >${__html('Preview')}</a>
                        <a class="dropdown-item edit-post" data-action="edit"  href="#" target="_self" data-id="${this.post._id}" >${__html('Edit')}</a>
                        <a class="dropdown-item rename-layout d-none" href="#" data-toggle="modal" data-id="${this.post._id}" >${__html('Preview')}</a>
                        <a class="dropdown-item edit-settings" data-action="settings" href="#" data-toggle="modal" data-i="${this.post.i}" data-id="${this.post._id}" data-title="${this.post.title}">${__html('Settings')}</a>
                        <a class="dropdown-item duplicate-layout d-none" href="#" data-toggle="modal" data-id="${this.post._id}" >${__html('Duplicate')}</a>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item remove-post text-danger " href="#" data-toggle="modal" data-action="delete" data-id="${this.post._id}" >${__html('Remove')}</a>
                    </div>
                </td>
            </tr>
        `;
    }

    attachListeners() {
        this.addListener(`[data-id="${this.post._id}"][data-action="edit"]`, 'click', this.handleEdit.bind(this));
        this.addListener(`[data-id="${this.post._id}"][data-action="delete"]`, 'click', this.handleDelete.bind(this));
        this.addListener(`[data-id="${this.post._id}"][data-action="settings"]`, 'click', this.handleSettings.bind(this));
    }

    async handleDelete(e) {
        e.preventDefault();

        const confirmed = confirm(__html('Remove post?'));
        if (!confirmed) return;

        deletePost({ id: this.post._id }, (response) => {

            if (response.error) {
                toast(__html('Error removing post: ') + response.error);
                return;
            }

            // Trigger a refresh of the posts list
            bus.emit('posts:refresh');

            toast('Post removed');
        });
    }

    async handleEdit(e) {
        e.preventDefault();

        console.log('Edit post clicked', e.currentTarget.dataset.id);

        getPost(e.currentTarget.dataset.id, (response) => {
            if (response.error) {
                toast({ type: 'error', text: response.error });
                return;
            }

            new EditPost(response.post, response.settings);
        });
    }

    async handleSettings(e) {
        e.preventDefault();

        console.log('Settings post clicked', e.currentTarget.dataset.id);

        getPost(e.currentTarget.dataset.id, (response) => {
            if (response.error) {
                toast({ type: 'error', text: response.error });
                return;
            }

            new EditPostSettings(response.post, response.settings);
        });
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