import { BlogService } from "../../components/blog/helpers.js";
import { __html, onClick, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";
import { ImageDrop } from "./image_drop.js";

export class EditPost {

    constructor(post, settings, cb) {

        this.post = post;
        this.settings = settings || {};
        this.cb = cb;

        // console.log('EditPost', this.post);

        this.blogService = new BlogService();

        this.init();
    }

    init = () => {

        let self = this;

        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        this.modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');

        if (!this.post._id) {
            this.post.text = localStorage.getItem('article_new') || '';
            this.modal.querySelector(".modal-title").innerHTML = __html('Add Article');
            this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-outline-dark btn-add-post-modal btn-modal">
                <i class="bi bi-plus-circle me-1"></i> ${__html('Add')}
            </button>
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>`;
        } else {
            this.post.text == '' ? localStorage.getItem('article_' + this.post._id) : this.post.text;
            this.modal.querySelector(".modal-title").innerHTML = __html('Edit Article');
            this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-outline-dark btn-update-post btn-modal">
                <i class="bi bi-check-circle me-1"></i> ${__html('Update')}
            </button>
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button> `;
        }

        this.modal.querySelector(".modal-title").innerHTML = '\
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" class="bi bi-code-square ql-html-edit" width="24" height="24" >\
                    <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"></path>\
                    <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"></path>\
                </svg>';

        let title = '', sdesc = '';
        let modalHTML = `\
                <div class="form-cont" style="height:100%">\
                    <div class="form-editor d-none" >
                        <div id="editor" class="html-editor inp" data-type="editor" style="min-height:600px;"></div>
                        <pre class="ql-syntax d-none" spellcheck="false"  data-gramm="false" contenteditable="true"></pre>
                    </div>
                    <div class="form-group mb-3 d-none">\
                        <div class="form-floating mb-3">
                            <input type="text" class="form-control" id="floatingInput" placeholder="">
                            <label for="floatingInput">Title</label>
                        </div>
                        <label for="p-title" class="form-label d-none">${__html('Title')}</label>\
                        <input type="text" class="form-control" id="p-title" autocomplete="off" placeholder="" value="${title}">\
                    </div>\
                    <div class="form-quill form-group mb-3 scrolling-container">\
                        <label for="p-sdesc" class="form-label d-none">${__html('Content')}</label>\
                        <div id="msginp" data-key="msginp" data-type="richtext" name="msginp" class="richtext-input inps"> </div>\
                        <input type="text" class="form-control d-none" id="p-sdesc" autocomplete="off" placeholder="" value="${sdesc}">\
                    </div>\
                </div>`;

        this.modal.querySelector(".modal-body").innerHTML = modalHTML;

        // initiate quill rich text editor
        let elem = this.modal.querySelector(".richtext-input");
        elem.classList.add('blog');

        // paste listener
        elem.addEventListener("paste", function (e) {

            console.log('paste');
        });

        Quill.register('modules/imageDrop', ImageDrop);

        this.quill = new Quill(elem, {

            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'link'],
                    // [ 'image' ],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['blockquote', 'code-block', { 'background': [] }],
                    // [ { 'script': 'sub'}, { 'script': 'super' } ],      // superscript/subscript
                    // [ { 'indent': '-1'}, { 'indent': '+1' } ], 
                ]
                // ,clipboard: {
                //     // matchVisual: false
                // }
                , imageDrop: true

            },
            scrollingContainer: 'scrolling-container',
            placeholder: __html('Start typing..'),
            theme: 'bubble'
        });

        // text change listener
        this.quill.on('text-change', (delta, oldDelta, source) => {

            // clean garbage
            let text = self.quill.container.firstChild.innerHTML;

            self.post.text = self.cleanMsg(text);

            // cache in browser in case window refreshes
            localStorage.setItem('article_' + (self.post._id ? self.post._id : "new"), self.cleanMsg(text));
        });

        // restore previous text
        this.quill.container.firstChild.innerHTML = this.post.text;

        // html editor listener
        onClick('.ql-html-edit', this.editHtml.bind(this));

        // remove default quill styling
        document.querySelector('.ql-editor').classList.add('entry-content');
        document.querySelector('html').style.fontSize = '70%';

        // revert jumping scroll state
        document.querySelector('.modal-body').addEventListener("scroll", (event) => {

            if (self.scrollOffset != event.target.scrollTop && event.target.scrollTop == 0) {

                event.target.scrollTop = self.scrollOffset;
                console.log('restore scroll state');
            } else {

                self.scrollOffset = event.target.scrollTop;
            }
        });

        // modal close listener
        this.modal.addEventListener('hidden.bs.modal', function (event) {

            document.querySelector('html').style.fontSize = '100%';
        });

        // save button listener
        onClick('.btn-update-post', (e) => { this.handleUpdate(e); });
        onClick('.btn-add-post-modal', (e) => { this.handleAdd(e); });

        this.modal_cont.show();
    }

    handleAdd = async (e) => {

        e.preventDefault();

        try {
            // Get the HTML content from the Quill editor
            const htmlContent = this.quill.container.firstChild.innerHTML;

            // Clean the HTML content
            const cleanedContent = this.cleanMsg(htmlContent);

            // Prepare the post data
            const postData = {
                _id: null,
                text: this.mode == 'editor' ? this.getHtmlEditorValue() : cleanedContent,
                img: '',
                tags: [],
                slug: '',
                title: '',
                status: '0'
            }

            await this.blogService.createPost(postData);

            toast('Post created');

            this.modal_cont.hide();

            // Trigger a refresh of the posts list
            bus.emit('posts:refresh');

            // Clear the local storage for new article
            localStorage.removeItem('article_new');

            // If a callback is provided, call it
            if (this.cb) this.cb();

        } catch (error) {
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    handleUpdate = async (e) => {

        e.preventDefault();
        try {
            // Get the HTML content from the Quill editor
            const htmlContent = this.quill.container.firstChild.innerHTML;

            // Clean the HTML content
            const cleanedContent = this.cleanMsg(htmlContent);

            // Prepare the post data
            const postData = {
                _id: this.post._id,
                text: this.mode == 'editor' ? this.getHtmlEditorValue() : cleanedContent,
            };

            // console.log('Updating post with data:', postData);
            // return;

            // Call the blog service to update the post
            await this.blogService.updatePost(postData);

            toast('Post updated successfully');
            this.modal_cont.hide();
        } catch (error) {
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    getHtmlEditorValue() {

        let val = this.htmlEditor.getValue();
        val = html_beautify(val, { indent_size: 0, space_in_empty_paren: false });
        val = val.replace(/(^|>)[\n\t]+/g, ">");

        return val;
    }

    editHtml = (e) => {

        e.preventDefault();

        if (e.currentTarget.classList.contains('enabled')) {

            this.mode = 'quill';

            // toast(__html('HTML editor mode off'));
            document.querySelector('.form-editor').classList.add('d-none');
            document.querySelector('.form-quill').classList.remove('d-none');

            // let val = this.getHtmlEditorValue();
            // this.quill.container.firstChild.innerHTML = val.replace( /(^|>)[\n\t]+/g, ">" );

            this.quill.container.firstChild.innerHTML = this.getHtmlEditorValue();

            e.currentTarget.classList.remove('enabled');

            this.htmlEditor = '';

            // restore scroll
            document.querySelector('.modal-body').scrollTop = this.scrollOffset;

        } else {

            this.mode = 'editor';

            // toast(__html('HTML editor mode on'));
            document.querySelector('.form-editor').classList.remove('d-none');
            document.querySelector('.form-quill').classList.add('d-none');

            // editor not yet enabled
            if (!this.htmlEditor) {
                this.htmlEditor = ace.edit(this.mode);
                ace.config.set('basePath', 'https://account.kenzap.com/js/ace/');
                this.htmlEditor.getSession().setMode("ace/mode/html");
            }

            // add html code to editor
            this.htmlEditor.setValue(html_beautify(this.post.text, { indent_size: 2, space_in_empty_paren: false }), -1);

            e.currentTarget.classList.add('enabled');
        }
    }

    cleanMsg(text) {

        return text;
    }
}