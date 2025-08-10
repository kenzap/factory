import { BlogService, postTags } from "../../components/blog/helpers.js";
import { __html, hideLoader, languages, onClick, showLoader, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class EditPostSettings {

    constructor(post, settings, cb) {

        this.post = post;
        this.settings = settings || {};
        this.cb = cb;

        console.log('EdEditPostSettingsitPost', this.post);

        this.blogService = new BlogService();

        this.init();
    }

    init = () => {

        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-title").innerHTML = this.post.title;
        this.modal.querySelector(".modal-title").style.minWidth = '200px';
        this.modal.querySelector(".modal-title").classList.add('px-2');
        this.modal.querySelector(".modal-title").setAttribute('contenteditable', 'true');

        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-update-settings-modal btn-modal">
                <i class="bi bi-check-circle me-1"></i> ${__html('Update')}
            </button>
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>`;

        let languagesList = '';
        languages.forEach((lang) => { languagesList += `<option value="${lang.code}" ${this.post.language == lang.code ? 'selected' : ''}>${lang.name}</option>`; });

        let modalHTml = `
        <div class="form-cont">
            <div class="form-group mb-3 row">
                <label for="status" class="form-label ">${__html('Status')}</label>
                <div class="col-sm-12 col-md-4">
                    <div class="mt-3" role="status" aria-live="polite">
                        <label class="form-check-label status-publish form-label">
                            <input type="radio" class="form-check-input me-1" name="status" id="status0" value="0" ${this.post.status == "0" ? 'checked' : ''}>
                                ${__html('Draft')}
                        </label>
                    </div>
                </div>
                <div class="col-sm-12 col-md-4">
                    <div class="mt-3"> 
                        <label class="form-check-label status-publish form-label">
                            <input type="radio" class="form-check-input me-1" name="status" id="status2" value="2" ${this.post.status == "2" ? 'checked' : ''}>
                                ${__html('Private')}
                        </label>
                    </div>
                </div>
                <div class="col-sm-12 col-md-4">
                    <div class="mt-3"> 
                        <label class="form-check-label status-publish form-label">
                            <input type="radio" class="form-check-input me-1" name="status" id="status1" value="1" ${this.post.status == "1" ? 'checked' : ''}>
                                ${__html('Published')}
                        </label>
                    </div>
                </div>
            </div>
            <div class="form-group mb-3">
                <label for="author" class="form-label">${__html('Author')}</label>
                <input type="text" class="form-control" id="author" autocomplete="off" placeholder="" value="${this.post.author ? this.post.author : ''}">
            </div>
            <div class="form-group mb-3">
                <label for="p-slug" class="form-label">${__html('Slug')}</label>
                <input type="text" id="slug" class="form-control form-control-sm" autocomplete="off" placeholder="" value="${this.post.slug ? this.post.slug : ''}">
            </div>
            <div class="form-group mb-3">
                <label for="p-language" class="form-label">${__html('Language')}</label>
                <select id="p-language" class="form-select form-select-sm" name="select-language">
                    <option value="">${__html('No language selected')}</option>
                    <optgroup label="${__html('Available languages')}"> 
                        ${languagesList}
                    </optgroup>
                </select>
            </div>
            <div class="form-group mb-3">
                <label for="p-sdesc" class="form-label">${__html('Tags')}</label>
                <div id="tags" class="simple-tags mb-4" data-simple-tags=""></div>
            </div>
        </div>`;

        this.modal.querySelector(".modal-body").innerHTML = modalHTml;

        let tags = this.modal.querySelector('#tags');
        if (this.post.tags) tags.setAttribute('data-simple-tags', this.post.tags);
        const sTags = postTags(tags);

        onClick('.btn-update-settings-modal', async (e) => {
            e.preventDefault();

            let status = this.modal.querySelector('input[name="status"]:checked').value;
            let author = this.modal.querySelector('#author').value.trim();
            let slug = this.modal.querySelector('#slug').value.trim();
            let language = this.modal.querySelector('#p-language').value;
            let tags = Array.from(this.modal.querySelectorAll('#tags ul li')).map(tag =>
                tag.innerHTML.replace('<a>×</a>', '').trim()
            );

            if (!slug) {
                toast(__html('Slug cannot be empty'), 'error');
                return;
            }

            showLoader();

            try {
                let postData = {
                    _id: this.post._id,
                    title: this.modal.querySelector(".modal-title").textContent.trim(),
                    status,
                    author,
                    slug,
                    language,
                    tags
                };

                await this.blogService.updatePost(postData);

                hideLoader();

                bus.emit('posts:refresh');

                this.modal_cont.hide();

                toast('Changes applied');

                if (this.cb) this.cb(response);
            } catch (error) {

                hideLoader();
                toast("Error occured: " + error.message);
            }
        });

        this.modal_cont.show();
    }
}