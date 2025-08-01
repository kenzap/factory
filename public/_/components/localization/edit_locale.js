import { saveLocale } from "../../api/save_locale.js";
import { __html, countries, languages, onChange, onClick, showLoader } from "../../helpers/global.js";

/**
 * Edit locale modal.
 * 
 * @class EditLocale
 * @export
 */
export class EditLocale {

	constructor(locales, locale, cb) {

		this.locales = locales;
		this.locale = locale;

		this.state = {};
		this.cb = cb;

		// check if header is already present
		this.init();

		this.listeners();
	}

	init = () => {

		this.modal = document.querySelector(".modal");
		this.cont = new bootstrap.Modal(this.modal);

		this.modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');
		this.modal.querySelector(".modal-title").innerHTML = this.locale.title;

		let sourceLocaleList = ``, languagesList = ''; // <option value="" data-title="" data-language="" data-id="" >${__html('Choose locale')}</option>
		languages.forEach((lang) => { languagesList += `<option value="${lang.code}" >${lang.name}</option>`; });

		// render table rows
		this.locales.forEach((el, i) => {

			let l = languages.filter((obj) => { return obj.code === el.locale });
			let c = countries.filter((obj) => { return obj.code.toLocaleUpperCase() === el.locale });
			let localeTitle = __html(l[0].name) + (c[0] ? ' (' + __html(c[0].name) + ')' : '');

			if (localeTitle == this.locale.title) return;

			sourceLocaleList += `<option value="${el._id}" data-title="${localeTitle}" data-language="${el.language}" data-id="${el._id}" >${localeTitle}${el.location ? '<img class="ms-2 cc-flag" src="https://cdn.kenzap.com/flag/' + el.location.toLowerCase() + '.svg" alt="location footer flag">' : ''}</option>`;
		});

		let cached = '';

		let modalHTml = `
	
			<div class="row">
				<div class="col-sm-12">
					<div class="search-db border-start border-primary border-3 ps-3 my-2 d-none">
						<div class="form-cont">
							<div class="d-flex">
								<div class="form-group mb-2 mt-1 me-3">
									<label for="db-path" class="form-label">${__html('Cloud storage key')}</label>
									<input id="db-path" type="text" placeholder="${__html('ecommerce-product/title')}" class="form-control " aria-label="${__html('Search products')}" aria-describedby="inputGroup-sizing-sm" style="max-width: 400px;">
									<p class="form-text">${__html("Search cloud stored texts and add to translation list below.")}</p>
								</div>
								<div class="form-group mb-2 mt-1 me-3">
									<label for="source-language" class="form-label">${__html('Source language')}</label>
									<select id="source-language" class="form-control" name="select-language">
										<option value="">${__html('No language selected')}</option>
										<optgroup label="${__html('Source language')}"> 
											${languagesList}
										</optgroup>
									</select>
									<p class="form-text">${__html("Default language of original texts.")}</p>
								</div>
								<div class="form-group align-self-center mb-3 mt-0">
									<button type="button" class="btn btn-primary btn-search-db btn-modal">${__html("Search")}</button>
								</div>
							</div>
						</div>
					</div>
	
					<div class="table-responsive">
						<table class="table table-hover table-borderless align-middle table-striped table-t-list" style="min-width: 800px;">
							<thead>
								<tr>
									<th>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#212529" class="bi justify-content-end bi-search search-icon po mb-1 me-3" viewBox="0 0 16 16" >
											<path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"></path>
										</svg>
										<div class="search-cont input-group input-group-sm mb-0 justify-content-start d-none">     
											<input type="text" placeholder="${__html('Search products')}" class="form-control border-top-0 border-start-0 border-end-0 rounded-0" aria-label="${__html('Search products')}" aria-describedby="inputGroup-sizing-sm" style="max-width: 200px;">
										</div>
										<span>${__html("Original")}</span>
									</th>
									<th class="d-flex justify-content-between align-items-center">
										<div>${__html("Translated")}</div>
										<div class="ms-2 d-flex align-items-center">
											<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-translate copy-locale-tray text-primary po me-2 " viewBox="0 0 16 16">
												<path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z"/>
												<path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31"/>
											</svg>
											<select id="copy-locale" class="form-select form-select-sm copy-locale d-none" name="select-copy-locale">
												<option value="">${__html('No locales selected')}</option>
												<optgroup label="${__html('Available locales:')}">
													${sourceLocaleList}
												</optgroup>
											</select>
										</div>
									</th>
									<th></th>
								</tr>
							</thead>
							<tbody>`;

		// header
		let rows = `
							<tr class="add-row">
								<td class="py-1">
									<textarea class="form-control add-original" data-original="${cached}" rows="1"></textarea>
								</td>
								<td class="py-1">
									<textarea class="form-control add-translated" data-translated="${cached}" rows="1"></textarea>
								</td>
								<td class="text-end"> 
									<a href="#" data-id="${this.locale._id}" title="${__html('add translation to the table')}" class="add-trans-row text-success me-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-square" viewBox="0 0 16 16">
									<path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
									<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
								</svg></a>
								</td>
							</tr>
							`;

		// populate table with content translation strings
		let texts = "";
		if (this.locale.content) {

			texts = this.locale.content;
			Object.keys(texts).forEach((text) => { rows += this.getLocalModalRow({ id: this.locale._id, original: text, translated: texts[text], type: 'content' }) });
		}

		// // popoulate table modal rows with translation texts provided by extension
		// let def = state.locales[state.currentRow.dataset.language] ? state.locales[state.currentRow.dataset.language] : state.locales.default;
		// if (def == '404: Not Found') def = state.locales.default;

		// texts = { ...JSON.parse(def).texts, ...state.localesDB.data.extension };
		// Object.keys(texts).forEach((text) => { rows += state.getLocalModalRow({ id: state.currentRow.dataset.id, original: text, translated: texts[text], type: 'extension' }) });

		modalHTml += rows;

		modalHTml += `</tbody>
						</table>
					</div>
				</div>
			</div>`;

		// add generated HTML code to the modal body 
		this.modal.querySelector(".modal-body").innerHTML = modalHTml;

		// modal footer buttons
		this.modal.querySelector(".modal-footer").innerHTML = `
			<button type="button" class="btn btn-primary btn-update-locale btn-modal">${__html('Save')}</button>
			<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
		`;
	}

	listeners = () => {

		// view localization tray
		onClick('.copy-locale-tray', (e) => {

			document.querySelector('.copy-locale').classList.toggle('d-none');
		});

		// TODO. copy and localise texts
		onChange('.copy-locale', (e) => {

			if (!e.target.selectedIndex) return;

			let locale = { id: e.target.value, from: { name: e.target.options[e.target.selectedIndex].innerHTML }, to: { name: this.locale.title } };

			if (!confirm(__("Copy locale texts from %1$ and translate to %2$?", e.target.options[e.target.selectedIndex].innerHTML, this.locale.title))) { e.preventDefault(); return false; }

			showLoader();

			let override = confirm(__("Override existing translations?"));
		});

		// add translation row on click listener
		onClick('.add-trans-row', this.addTransRow);

		// remove translation raw listener
		onClick('.remove-locale-text', this.removeTransRow);

		// search texts in cloud db 
		onClick('.btn-search-db', this.searchTexts);

		// call search cloud texts feature
		onClick('.search-icon', this.searchTextsCont);

		// modal button save listener
		onClick('.btn-update-locale', (e) => {

			e.preventDefault();

			let data = {};

			data['extension'] = {};
			data['content'] = {};

			// get all translation strings
			for (let trans of this.modal.querySelectorAll(".edit-translated")) {

				data[trans.dataset.type][trans.dataset.original] = trans.value;
			}

			// save locale
			saveLocale(this.locale._id, data, (response) => {

				this.cont.hide();

				this.cb(response);
			});
		});

		this.cont.show();
	}

	/**
	 * Adds a new translation row to the list.
	 *
	 * @param {Event} e - The event object.
	 */
	addTransRow = (e) => {

		let o = document.querySelector('.add-original').value, t = document.querySelector('.add-translated').value;

		if (o.length == 0) { alert(__html('Original text can not be empty')); return; }
		if (t.length == 0) { alert(__html('Translated text can not be empty')); return; }

		// check for repeated rows
		if (!document.querySelector('.edit-original[data-title="' + o + '"]')) {

			let row = this.getLocalModalRow({ id: e.currentTarget.id, original: o, translated: t, type: 'content' });
			document.querySelector('.add-row').insertAdjacentHTML('afterend', row);

			// reassign translation raw listener
			onClick('.remove-locale-text', this.removeTransRow);

			// clear current values
			document.querySelector('.add-original').value = "";
			document.querySelector('.add-translated').value = "";
		} else {

			alert(__html("Text is already in the list"));
		}

		setTimeout(() => document.querySelector(".add-original").focus(), 100);
	}

	/**
	 * Removes a translation row from the DOM.
	 *
	 * @param {Event} e - The event object.
	 * @returns {void}
	 */
	removeTransRow = (e) => {

		e.preventDefault();

		let c = confirm(__html('Remove this translation raw?'));

		if (!c) return;

		e.currentTarget.parentElement.parentElement.remove();

	}

	/**
	 * Handles the event when searching for texts.
	 * @param {Event} e - The event object.
	 */
	searchTextsCont = (e) => {

		document.querySelector(".search-db").classList.remove("d-none");
	}

	/**
	 * Searches for texts using the specified path and language.
	 * @param {Event} e - The event object.
	 */
	searchTexts = (e) => {

		let path = document.querySelector("#db-path").value;
		let from = document.querySelector("#source-language").value;
		let pa = path.split("/");

		if (path.length < 5) { alert(__html("Please specify valid path")); return; }
		if (from.length < 1) { alert(__html("Please select language")); return; }
		if (pa.length < 1) { alert(__html("Please specify valid path")); return; }

		showLoader();

		// todo: implement new API call to handle AI localizations
	}

	/**
	 * Generates a HTML string representing a table row for a local modal.
	 * @param {Object} obj - The object containing the data for the table row.
	 * @param {string} obj.bg - The background color of the table row.
	 * @param {string} obj.original - The original text.
	 * @param {string} obj.id - The ID of the locale.
	 * @param {string} obj.translated - The translated text.
	 * @param {string} obj.type - The type of the row.
	 * @returns {string} - The HTML string representing the table row.
	 */
	getLocalModalRow = (obj) => {

		return `<tr ${obj.bg ? 'style="background-color:' + obj.bg + '"' : ""}>
                        <td class="py-1">
                            <span class="edit-original" data-title="${obj.original}" data-id="${obj.id}">${obj.original}</span>
                        </td>
                        <td class="py-1">
                            <textarea class="form-control edit-translated" data-original="${obj.original}" data-type="${obj.type}" rows="1">${obj.translated}</textarea>
                        </td>
                        <td class="text-end">
                            <a href="#" data-id="${obj.id}" title="${__html('remove translation from the table')}" class="remove-locale-text text-danger me-2 ${obj.type == 'extension' ? 'd-none' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg></a>
                        </td>
                    </tr>`;
	}
}