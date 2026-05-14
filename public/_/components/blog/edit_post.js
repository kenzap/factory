import { Editor, Image, Link, StarterKit, TableKit } from "../../../assets/js/tiptap-vendor.js";
import { BlogService } from "../../components/blog/helpers.js";
import { __html, parseApiError, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";
import { uploadBlogImageFile } from "./image_drop.js";

export class EditPost {

    constructor(post, settings, cb) {

        this.post = post || {};
        this.settings = settings || {};
        this.cb = cb;
        this.mode = 'visual';
        this.rawHtml = this.post?.text || '';
        this.blogService = new BlogService();

        this.init();
    }

    init = () => {

        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);
        this.modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');

        const isNewPost = !this.post._id;
        if (isNewPost) {
            this.post.text = localStorage.getItem(this.getDraftKey()) || '';
        } else if (this.post.text === '') {
            this.post.text = localStorage.getItem(this.getDraftKey()) || '';
        }

        this.rawHtml = this.post.text || '';

        this.renderModalChrome(isNewPost);
        this.renderModalBody();
        this.initEditor();
        this.bindUi();

        this.modal_cont.show();
    }

    renderModalChrome(isNewPost) {
        const modalTitleText = isNewPost ? __html('Add Article') : __html('Edit Article');

        // Restructure the modal header into two rows: title row + toolbar row
        const modalHeader = this.modal.querySelector('.modal-header');
        modalHeader.classList.add('blog-modal-header');
        modalHeader.innerHTML = `
            <div class="blog-header-top">
                <h5 class="modal-title">${modalTitleText}</h5>
                <div class="blog-header-controls">
                    <button type="button" class="blog-html-toggle" title="${__html('HTML editor')}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"></path>
                            <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"></path>
                        </svg>
                        HTML
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" tabindex="-1"></button>
                </div>
            </div>
            <div class="blog-editor-toolbar" role="toolbar" aria-label="${__html('Blog editor toolbar')}">
                <div class="blog-toolbar-group">
                    <button type="button" class="blog-tb-btn" data-editor-action="setParagraph" title="${__html('Paragraph')}">P</button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleHeading" data-level="1" title="H1">H1</button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleHeading" data-level="2" title="H2">H2</button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleHeading" data-level="3" title="H3">H3</button>
                </div>
                <div class="blog-toolbar-group">
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleBold" title="${__html('Bold')}"><i class="bi bi-type-bold"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleItalic" title="${__html('Italic')}"><i class="bi bi-type-italic"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleBulletList" title="${__html('Bullet list')}"><i class="bi bi-list-ul"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleOrderedList" title="${__html('Ordered list')}"><i class="bi bi-list-ol"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleBlockquote" title="${__html('Blockquote')}"><i class="bi bi-blockquote-left"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleCodeBlock" title="${__html('Code block')}"><i class="bi bi-code-square"></i></button>
                </div>
                <div class="blog-toolbar-group">
                    <button type="button" class="blog-tb-btn" data-editor-action="setLink" title="${__html('Link')}"><i class="bi bi-link-45deg"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="unsetLink" title="${__html('Remove link')}"><i class="bi bi-link-45deg"></i><i class="bi bi-x" style="margin-left:-3px"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="insertImage" title="${__html('Add image')}"><i class="bi bi-image"></i></button>
                    <button type="button" class="blog-tb-btn" data-editor-action="insertTable" title="${__html('Insert table')}"><i class="bi bi-table"></i></button>
                </div>
                <div class="blog-toolbar-group blog-table-tools">
                    <button type="button" class="blog-tb-btn" data-editor-action="addRowAfter" title="${__html('Add row')}">+${__html('Row')}</button>
                    <button type="button" class="blog-tb-btn" data-editor-action="addColumnAfter" title="${__html('Add column')}">+${__html('Col')}</button>
                    <button type="button" class="blog-tb-btn" data-editor-action="toggleHeaderRow" title="${__html('Toggle header')}">${__html('Header')}</button>
                    <button type="button" class="blog-tb-btn" data-editor-action="mergeOrSplit" title="${__html('Merge or split cells')}">${__html('Merge')}</button>
                    <button type="button" class="blog-tb-btn blog-tb-btn-danger" data-editor-action="deleteRow" title="${__html('Delete row')}">${__html('Del Row')}</button>
                    <button type="button" class="blog-tb-btn blog-tb-btn-danger" data-editor-action="deleteColumn" title="${__html('Delete column')}">${__html('Del Col')}</button>
                    <button type="button" class="blog-tb-btn blog-tb-btn-danger" data-editor-action="deleteTable" title="${__html('Delete table')}">${__html('Del Table')}</button>
                </div>
                <input type="file" class="blog-editor-image-input d-none" accept="image/*">
            </div>`;

        if (isNewPost) {
            this.modal.querySelector(".modal-footer").innerHTML = `
                <button type="button" class="btn btn-outline-dark btn-add-post-modal btn-modal">
                    <i class="bi bi-plus-circle me-1"></i> ${__html('Add')}
                </button>
                <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                    ${__html('Close')}
                </button>`;
            return;
        }

        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-outline-dark btn-update-post btn-modal">
                <i class="bi bi-check-circle me-1"></i> ${__html('Update')}
            </button>
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>`;
    }

    renderModalBody() {
        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont blog-editor-layout" style="height:100%">
                <div class="form-editor d-none">
                    <div id="editor" class="html-editor inp" data-type="editor" style="min-height:600px;"></div>
                </div>
                <div class="form-visual">
                    <div class="blog-editor-surface-wrapper">
                        <div class="blog-editor-surface"></div>
                    </div>
                </div>
            </div>`;
    }

    initEditor() {
        const editorElement = this.modal.querySelector('.blog-editor-surface');

        this.editor = new Editor({
            element: editorElement,
            extensions: [
                StarterKit.configure({
                    heading: {
                        levels: [1, 2, 3]
                    }
                }),
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        rel: 'noopener noreferrer',
                        target: '_blank'
                    }
                }),
                Image.configure({
                    inline: true,
                    HTMLAttributes: {
                        class: 'blog-inline-image'
                    }
                }),
                TableKit.configure({
                    table: {
                        resizable: false,
                        HTMLAttributes: {
                            class: 'blog-editor-table'
                        }
                    }
                })
            ],
            editorProps: {
                attributes: {
                    class: 'entry-content tiptap-content'
                },
                handleDrop: (view, event) => {
                    const imageFile = Array.from(event.dataTransfer?.files || []).find(file => file.type?.startsWith('image/'));
                    if (!imageFile) return false;

                    event.preventDefault();
                    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                    this.insertUploadedImage(imageFile, coords?.pos ?? null);
                    return true;
                },
                handlePaste: (_view, event) => {
                    const imageFile = Array.from(event.clipboardData?.files || []).find(file => file.type?.startsWith('image/'));
                    if (!imageFile) return false;

                    event.preventDefault();
                    this.insertUploadedImage(imageFile);
                    return true;
                }
            },
            onUpdate: ({ editor }) => {
                if (this.mode === 'editor') return;
                this.syncEditorContent(editor.getHTML());
                this.refreshToolbarState();
            },
            onSelectionUpdate: () => {
                this.refreshToolbarState();
            }
        });

        this.editor.commands.setContent(this.rawHtml || '<p></p>', {
            emitUpdate: false,
            parseOptions: {
                preserveWhitespace: 'full'
            }
        });
        this.syncEditorContent(this.editor.getHTML());
        this.refreshToolbarState();
    }

    bindUi() {
        this.modal.querySelector('.blog-html-toggle')?.addEventListener('click', this.toggleHtmlMode);
        this.modal.querySelector('.btn-update-post')?.addEventListener('click', this.handleUpdate);
        this.modal.querySelector('.btn-add-post-modal')?.addEventListener('click', this.handleAdd);
        this.modal.querySelectorAll('[data-editor-action]').forEach(button => {
            button.addEventListener('click', this.handleToolbarAction);
        });

        const imageInput = this.modal.querySelector('.blog-editor-image-input');
        imageInput?.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (file) this.insertUploadedImage(file);
            event.target.value = '';
        });

        this.modal.querySelector('.modal-body')?.addEventListener("scroll", (event) => {
            if (this.scrollOffset !== event.target.scrollTop && event.target.scrollTop === 0) {
                event.target.scrollTop = this.scrollOffset;
            } else {
                this.scrollOffset = event.target.scrollTop;
            }
        });

        this.modal.addEventListener('hidden.bs.modal', () => {
            this.destroyEditor();
        }, { once: true });
    }

    handleToolbarAction = (event) => {
        event.preventDefault();
        if (!this.editor) return;

        const button = event.currentTarget;
        const action = button.dataset.editorAction;
        const level = Number(button.dataset.level || 0);

        switch (action) {
            case 'setParagraph':
                this.editor.chain().focus().setParagraph().run();
                break;
            case 'toggleHeading':
                this.editor.chain().focus().toggleHeading({ level }).run();
                break;
            case 'toggleBold':
                this.editor.chain().focus().toggleBold().run();
                break;
            case 'toggleItalic':
                this.editor.chain().focus().toggleItalic().run();
                break;
            case 'toggleBulletList':
                this.editor.chain().focus().toggleBulletList().run();
                break;
            case 'toggleOrderedList':
                this.editor.chain().focus().toggleOrderedList().run();
                break;
            case 'toggleBlockquote':
                this.editor.chain().focus().toggleBlockquote().run();
                break;
            case 'toggleCodeBlock':
                this.editor.chain().focus().toggleCodeBlock().run();
                break;
            case 'setLink':
                this.promptForLink();
                break;
            case 'unsetLink':
                this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
                break;
            case 'insertImage':
                this.modal.querySelector('.blog-editor-image-input')?.click();
                break;
            case 'insertTable':
                this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
            case 'addRowAfter':
                this.editor.chain().focus().addRowAfter().run();
                break;
            case 'addColumnAfter':
                this.editor.chain().focus().addColumnAfter().run();
                break;
            case 'toggleHeaderRow':
                this.editor.chain().focus().toggleHeaderRow().run();
                break;
            case 'mergeOrSplit':
                this.editor.chain().focus().mergeOrSplit().run();
                break;
            case 'deleteRow':
                this.editor.chain().focus().deleteRow().run();
                break;
            case 'deleteColumn':
                this.editor.chain().focus().deleteColumn().run();
                break;
            case 'deleteTable':
                this.editor.chain().focus().deleteTable().run();
                break;
            default:
                break;
        }

        this.refreshToolbarState();
    }

    promptForLink() {
        const previousUrl = this.editor.getAttributes('link').href || '';
        const url = window.prompt(__html('Enter URL'), previousUrl);

        if (url === null) return;

        if (url.trim() === '') {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        this.editor.chain().focus().extendMarkRange('link').setLink({
            href: url.trim()
        }).run();
    }

    insertUploadedImage(file, position = null) {
        if (!this.editor) return;

        uploadBlogImageFile(file, {
            onSuccess: (uploadedUrl) => {
                const chain = this.editor.chain().focus();
                if (typeof position === 'number') {
                    chain.setTextSelection(position);
                }

                chain.setImage({ src: uploadedUrl, alt: '' }).run();
                this.syncEditorContent(this.editor.getHTML());
                this.refreshToolbarState();
            }
        });
    }

    refreshToolbarState() {
        if (!this.editor) return;

        const inTable = this.editor.isActive('table');

        this.modal.querySelectorAll('[data-editor-action]').forEach(button => {
            const action = button.dataset.editorAction;
            const level = Number(button.dataset.level || 0);
            let isActive = false;
            let isDisabled = false;

            switch (action) {
                case 'setParagraph':
                    isActive = this.editor.isActive('paragraph');
                    break;
                case 'toggleHeading':
                    isActive = this.editor.isActive('heading', { level });
                    break;
                case 'toggleBold':
                    isActive = this.editor.isActive('bold');
                    break;
                case 'toggleItalic':
                    isActive = this.editor.isActive('italic');
                    break;
                case 'toggleBulletList':
                    isActive = this.editor.isActive('bulletList');
                    break;
                case 'toggleOrderedList':
                    isActive = this.editor.isActive('orderedList');
                    break;
                case 'toggleBlockquote':
                    isActive = this.editor.isActive('blockquote');
                    break;
                case 'toggleCodeBlock':
                    isActive = this.editor.isActive('codeBlock');
                    break;
                case 'setLink':
                case 'unsetLink':
                    isActive = this.editor.isActive('link');
                    isDisabled = action === 'unsetLink' && !isActive;
                    break;
                case 'insertImage':
                case 'insertTable':
                    isActive = action === 'insertTable' && inTable;
                    break;
                case 'addRowAfter':
                case 'addColumnAfter':
                case 'toggleHeaderRow':
                case 'mergeOrSplit':
                case 'deleteRow':
                case 'deleteColumn':
                case 'deleteTable':
                    isDisabled = !inTable;
                    break;
                default:
                    break;
            }

            button.classList.toggle('active', isActive);
            button.disabled = this.mode === 'editor' || isDisabled;
        });

        const tableTools = this.modal.querySelector('.blog-table-tools');
        if (tableTools) {
            tableTools.hidden = this.mode === 'editor';
            tableTools.classList.toggle('blog-table-tools-active', inTable);
        }

        const toggle = this.modal.querySelector('.blog-html-toggle');
        if (toggle) {
            toggle.classList.toggle('enabled', this.mode === 'editor');
        }
    }

    toggleHtmlMode = (event) => {
        event.preventDefault();

        const toggle = event.currentTarget;
        const visualSection = this.modal.querySelector('.form-visual');
        const editorSection = this.modal.querySelector('.form-editor');

        if (this.mode === 'editor') {
            const htmlFromEditor = this.getHtmlEditorValue();
            this.mode = 'visual';

            this.rawHtml = htmlFromEditor || this.rawHtml || '<p></p>';
            this.syncEditorContent(this.rawHtml);
            this.editor.commands.setContent(this.rawHtml || '<p></p>', {
                emitUpdate: false,
                parseOptions: {
                    preserveWhitespace: 'full'
                }
            });

            editorSection.classList.add('d-none');
            visualSection.classList.remove('d-none');
            toggle.classList.remove('enabled');
            this.refreshToolbarState();

            this.modal.querySelector('.modal-body').scrollTop = this.scrollOffset;
            return;
        }

        const sourceHtml = this.editor ? this.cleanMsg(this.editor.getHTML()) : this.cleanMsg(this.rawHtml || '');

        visualSection.classList.add('d-none');
        editorSection.classList.remove('d-none');
        this.mode = 'editor';

        if (!this.htmlEditor) {
            ace.config.set('basePath', 'https://account.kenzap.com/js/ace/');
            this.htmlEditor = ace.edit('editor');
            this.htmlEditor.setOption('fontSize', '13px');
            this.htmlEditor.getSession().setMode("ace/mode/html");
        }

        this.htmlEditor.setValue(html_beautify(sourceHtml, { indent_size: 2, space_in_empty_paren: false }), -1);
        requestAnimationFrame(() => {
            this.htmlEditor.resize(true);
            this.htmlEditor.focus();
        });
        toggle.classList.add('enabled');
        this.refreshToolbarState();
    }

    getCurrentPostHtml() {
        if (this.mode === 'editor') {
            return this.getHtmlEditorValue();
        }

        if (this.editor) {
            return this.cleanMsg(this.editor.getHTML());
        }

        return this.cleanMsg(this.rawHtml || '');
    }

    getHtmlEditorValue() {
        if (!this.htmlEditor) {
            return this.cleanMsg(this.rawHtml || '');
        }

        let val = this.htmlEditor.getValue();
        val = html_beautify(val, { indent_size: 0, space_in_empty_paren: false });
        return val.replace(/(^|>)[\n\t]+/g, ">");
    }

    cleanMsg(text) {
        return text;
    }

    syncEditorContent(html = '') {
        const cleanedHtml = this.cleanMsg(html);
        this.rawHtml = cleanedHtml;
        this.post.text = cleanedHtml;
        localStorage.setItem(this.getDraftKey(), cleanedHtml);
    }

    getDraftKey() {
        return `article_${this.post._id ? this.post._id : "new"}`;
    }

    handleAdd = async (event) => {
        event.preventDefault();

        try {
            const postData = {
                _id: null,
                text: this.getCurrentPostHtml(),
                img: '',
                tags: [],
                slug: '',
                title: '',
                status: '0'
            };

            await this.blogService.createPost(postData);

            toast('Post created');
            this.modal_cont.hide();
            bus.emit('posts:refresh');
            localStorage.removeItem(this.getDraftKey());

            if (this.cb) this.cb();
        } catch (error) {
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    handleUpdate = async (event) => {
        event.preventDefault();

        try {
            const postData = {
                _id: this.post._id,
                text: this.getCurrentPostHtml(),
            };

            await this.blogService.updatePost(postData);

            toast('Post updated successfully');
            this.modal_cont.hide();
        } catch (error) {
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    destroyEditor() {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }
}
