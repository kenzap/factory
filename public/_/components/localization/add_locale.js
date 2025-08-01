import { createLocale } from "../../api/create_locale.js";
import { __html, countries, languages, onClick, toast } from "../../helpers/global.js";

export const addLocaleModal = (cb) => {

	let modal = document.querySelector(".modal");
	let modalCont = new bootstrap.Modal(modal);

	modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
	modal.querySelector(".modal-title").innerHTML = __html('Add Locale');

	let languagesList = '', locationList;
	languages.forEach((lang) => { languagesList += `<option value="${lang.code}" >${lang.name}</option>`; });
	countries.forEach((lang) => { locationList += `<option value="${lang.code}" >${lang.name}</option>`; });

	let modalHTml = `
    <div class="form-cont">
        <div class="form-group mb-3">
            <label for="p-title" class="form-label">${__html('Language')}</label>
            <select id="s-language" class="form-control" name="select-language">
                <option value="">${__html('No language selected')}</option>
                <optgroup label="${__html('Available languages')}"> 
                    ${languagesList}
                </optgroup>
            </select>
        </div>
        <div class="form-group mb-3">
            <label for="p-sdesc" class="form-label">${__html('Location')}</label>
            <select id="s-location" class="form-control" name="select-location">
                <option value="">${__html('Universal')}</option>
                <optgroup label="${__html('Available countries')}"> 
                    ${locationList}
                </optgroup>
            </select>
        </div>
    </div>`;

	modal.querySelector(".modal-body").innerHTML = modalHTml;

	// modal footer buttons
	modal.querySelector(".modal-footer").innerHTML = `
        <button type="button" class="btn btn-primary btn-locale-add btn-modal">${__html('Add')}</button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
    `;

	onClick('.btn-locale-add', (e) => {

		e.preventDefault();

		let data = {};
		data.language = modal.querySelector("#s-language").value;
		data.location = modal.querySelector("#s-location").value;
		data.locale = data.language + (data.location.length ? "_" + data.location : '');
		data.ext = "ecommerce";
		data.extension = {}; // user overriden translations from extension hardcoded texts
		data.content = {};  // user added translations, ex. dynamic data localization

		if (data.language.length < 2) { alert(__html('Please choose language first')); return; }

		// send data
		createLocale(data, (response) => {

			// if (!response.meta) { parseApiError(response); return; }

			modalCont.hide();

			toast(__html('Locale added'));

			cb(response);

			console.log('Success:', response);
		});
	});

	modalCont.show();
}