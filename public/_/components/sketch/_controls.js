import { __html, attr, html, onChange, onClick } from '@kenzap/k-cloud';
import slugify from 'slugify';
import { hasRenderFiles, saveSketchDefaults } from "./_helpers.js";
import { renderPreview, renderProduction } from "./_rendering.js";

export class SketchControls {

    constructor(state) {

        this.state = state;

        this.initTextures();

        this.init("");
    }

    init(texture) {

        this.view(texture);

        this.listeneres();
    }

    // set default textures
    initTextures() {

        // merge default textures with sketch textures
        this.state.factory_settings.textures.forEach(element => {

            let add = true;

            if (this.state.sketch.textures.some(o => o.texture === element.texture)) {

                add = false;
            }

            if (add) this.state.sketch.textures.push(element);
        });
    }

    // set modified textures as defaults for other renders as long as they are not in the list
    setTextureDefaults() {

        this.state.sketch.textures.forEach(element => {

            let add = true;

            if (this.state.factory_settings.textures.some(o => o.texture === element.texture)) {

                add = false;
            }

            if (add) this.state.factory_settings.textures.push(element);
        });

        // console.log("setTextureDefaults");
        // console.log(this.state.factory_settings.textures);
    }

    view(texture) {

        if (texture == "") texture = document.querySelector('#sketch_texture') ? document.querySelector('#sketch_texture').value : "";

        if (!texture.length) texture = this.state.factory_settings.textures[0].texture;

        // find slected texture in sketch textures
        if (this.state.sketch.textures) if (this.state.sketch.textures.length) this.state.sketch.texture = this.state.sketch.textures.filter(o => o.texture == texture)[0];

        if (!hasRenderFiles(this.state)) { document.querySelector('sketch-controls').innerHTML = ``; return; }

        document.querySelector('sketch-viewer-controls').innerHTML = `
            <div class="viewer-controls">
                <div class="po cnt arw" style="right:28px;top:8px;" data-direction="up">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-up-circle po" viewBox="0 0 16 16" >
                    <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707z"></path>
                    </svg>
                </div>
                <div class="po cnt arw" style="right:8px;top:26px;" data-direction="right">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-right-circle po" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5z"/>
                    </svg>
                </div>
                <div class="po cnt arw" style="right:48px;top:26px;" data-direction="left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-left-circle po" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-4.5-.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5z"/>
                    </svg>
                </div>
                <div class="po cnt arw" style="right:28px;top:44px;" data-direction="down">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-down-circle po" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293z"/>
                    </svg>
                </div>
                <div class="po cnt" style="right:8px;top:80px;">
                    <div class="mb-2 mw">
                    <div class="d-flex align-items-center">
                        <input type="range" class="form-range form-range-sm" id="camera_fov" min="0" max="100" step="1" style="width: 65px;" value="${this.state.sketch.fov || 50}" ></input>
                        <span id="camera_fov_value" class="ms-2 small text-muted position-absolute" style="left: 70px;">${this.state.sketch.fov || 50}</span>
                    </div>
                    <p class="form-text"> </p>
                    </div>
                </div>
                <div class="po cnt d-none" style="right:8px;top:80px;" data-direction="cw">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
                    </svg>
                </div>
                <div class="po cnt d-none" style="right:48px;top:80px;" data-direction="ccw">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
                    </svg>
                </div>
            </div>
        `;

        // Add input event listener to update the value display in real-time
        document.getElementById('camera_fov').addEventListener('input', function () {
            document.getElementById('camera_fov_value').textContent = this.value;
        });

        document.querySelector('sketch-controls').innerHTML = `
            <div class="controls">
            <div class="mb-2 mw">
                <label class="form-label form-text mb-0 mt-0" for="sketch_texture">${__html('Texture')}</label>
                <select id="sketch_texture" class="form-select form-select-sm inp-">
                    ${this.state.factory_settings.price
                .sort((a, b) => a.parent.localeCompare(b.parent) || a.title.localeCompare(b.title))
                .map((rec, i) => {

                    return rec.public ?
                        `<option data-i="${attr(i)}" value="${this.slugify(rec.parent + "-" + rec.title)}" ${this.state.sketch.texture.texture == this.slugify(rec.parent + "-" + rec.title) ? "selected" : ""}>${html(rec.parent) + " " + html(rec.title)}</option>`
                        :
                        ``

                }).join('')
            }
                </select>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw">
                <label class="form-label form-text mb-0" for="sketch_coating_side">${__html('Coating')}</label>
                <select id="sketch_coating_side" class="form-select form-select-sm inp-">
                    <option value="1" ${this.state.sketch.texture.coating_side == 1 ? "selected" : ""}>${__html('One side')}</option>
                    <option value="2" ${this.state.sketch.texture.coating_side == 2 ? "selected" : ""}>${__html('Both sides')}</option>
                </select>
                <p class="form-text"> </p>
            </div>   
            <div class="mb-2 mw ${this.state.sketch.texture.coating_side == 2 ? "d-none" : ""}" style="" data-direction="swap">
                <p class="form-text">${__html('Color')}</p>
                <div class="form-check form-switch form-switch-sm">
                    <input class="form-check-input" type="checkbox" role="switch" id="sketch_swap_colors" ${this.state.sketch.texture.swap_colors == 1 ? "checked" : ""} >
                    <label class="form-check-label" for="sketch_swap_colors">${__html('Inverted')}</label>
                </div>
            </div>             
            <div class="mb-2 mw d-none">
                <label class="form-label" for="sketch_color_sequence">${__html('Color Sequence')}</label>
                <select id="sketch_color_sequence" class="form-select form-select-sm inp-">
                    <option value="0">${__html('Original')}</option>
                    <option value="1">${__html('Inverted')}</option>
                </select>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw d-none">
                <label class="form-label form-text mb-0" for="sketch_alignment">${__html('Alignment')}</label>
                <select id="sketch_alignment" class="form-select form-select-sm inp-">
                    <option value="original" ${this.state.sketch.texture.alignment == "original" ? "selected" : ""}>${__html('Original')}</option>
                    <option value="center" ${this.state.sketch.texture.alignment == "center" ? "selected" : ""}>${__html('Center')}</option>
                </select>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw">
                <label class="form-label form-text mb-0" for="sketch_energy">${__html('Energy')}</label>
                <div class="d-flex align-items-center">
                    <input type="range" class="form-range form-range-sm" id="sketch_energy" min="0" max="2.5" step="0.01" value="${this.state.sketch.texture.energy ?? 1}" ></input>
                    <span id="sketch_energy_value" class="ms-2 small text-muted">${this.state.sketch.texture.energy ?? 1}</span>
                </div>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw">
                <label class="form-label form-text mb-0" for="sketch_roughness">${__html('Roughness')}</label>
                <div class="d-flex align-items-center">
                    <input type="range" class="form-range form-range-sm" id="sketch_roughness" min="0" max="1" step="0.01" value="${this.state.sketch.texture.roughness ?? 1}"></input>
                    <span id="sketch_roughness_value" class="ms-2 small text-muted">${this.state.sketch.texture.roughness ?? 1}</span>
                </div>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw">
                <label class="form-label form-text mb-0" for="sketch_metallic">${__html('Metallic')}</label>
                <div class="d-flex align-items-center">
                    <input type="range" class="form-range form-range-sm" id="sketch_metallic" min="0" max="1" step="0.01" value="${this.state.sketch.texture.metallic ?? 1}"></input>
                    <span id="sketch_metallic_value" class="ms-2 small text-muted">${this.state.sketch.texture.metallic ?? 1}</span>
                </div>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw">
                <label class="form-label form-text mb-0" for="sketch_ratio">${__html('Pattern ratio')}</label>
                <div class="d-flex align-items-center">
                    <input type="range" class="form-range form-range-sm" id="sketch_ratio" min="1" max="100" step="1" value="${this.state.sketch.texture.ratio ?? 7}"></input>
                    <span id="sketch_ratio_value" class="ms-2 small text-muted">${this.state.sketch.texture.ratio ?? 7}</span>
                </div>
                <p class="form-text"> </p>
            </div>
            <div class="mb-2 mw d-flex form-text">
                <a href="#" class="sketch_defaults">${__html('Set as default')}</a> <span class="mx-2">|</span> <a href="#" class="sketch_render_all">${__html('Render all')}</a>
            </div>
            </div>
            `;

        // Add input event listeners to update value displays in real-time
        ['sketch_energy', 'sketch_roughness', 'sketch_metallic', 'sketch_ratio'].forEach(id => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + '_value');
            if (slider && valueDisplay) {
                slider.addEventListener('input', function () {
                    valueDisplay.textContent = this.value;
                });
            }
        });
    }

    slugify(str) {

        return slugify(str, {
            replacement: '-',  // replace spaces with replacement character, defaults to `-`
            remove: undefined, // remove characters that match regex, defaults to `undefined`
            lower: true,       // convert to lower case, defaults to `false`
            strict: true,      // strip special characters except replacement, defaults to `false`
            locale: "en",    // language code of the locale to use
            trim: true         // trim leading and trailing replacement chars, defaults to `true`
        });
    }

    sync() {

        let self = this;

        // map parameters
        let texture = {
            swap_colors: document.querySelector("#sketch_swap_colors").checked ? 1 : 0,
            alignment: document.querySelector("#sketch_alignment").value,
            texture: document.querySelector("#sketch_texture").value,
            coating_side: parseInt(document.querySelector("#sketch_coating_side").value),
            energy: parseFloat(document.querySelector("#sketch_energy").value),
            roughness: parseFloat(document.querySelector("#sketch_roughness").value),
            metallic: parseFloat(document.querySelector("#sketch_metallic").value),
            ratio: parseInt(document.querySelector("#sketch_ratio").value),
        };

        // console.log("this.state.sketch.textures");

        // sync texture with state
        let updated = false;
        self.state.sketch.textures.forEach((el, i) => { if (el.texture == texture.texture) { self.state.sketch.textures[i] = texture; updated = true; } });
        if (!updated) self.state.sketch.textures.push(texture);

        // console.log("sync", self.state.sketch.textures);
    }

    listeneres() {

        let self = this;

        onChange('.controls input', e => { if (e.currentTarget.id != 'sketch_texture') self.sync(); self.init(document.querySelector('.controls #sketch_texture').value); renderPreview(self.state, e, "cnt"); });

        onChange('.controls select', e => { if (e.currentTarget.id != 'sketch_texture') self.sync(); self.init(document.querySelector('.controls #sketch_texture').value); renderPreview(self.state, e, "cnt"); });

        onClick('.controls .sketch_defaults', e => { e.preventDefault(); saveSketchDefaults(self.state); });

        onClick('.controls .sketch_render_all', e => { e.preventDefault(); renderProduction(self.state); });

        onChange('.viewer-controls #camera_fov', e => {

            self.state.sketch.fov = parseInt(e.currentTarget.value);

            if (self.state.sketch.fov < 1) self.state.sketch.fov = 1;
            if (self.state.sketch.fov > 100) self.state.sketch.fov = 100;

            self.state.ProductViewer.refresh();
        });

        onClick('.viewer-controls .arw', e => {

            e.preventDefault();

            switch (e.currentTarget.dataset.direction) {
                case 'up': self.state.sketch.offset.y = Math.round((self.state.sketch.offset.y + 0.05) * 100) / 100; break;
                case 'down': self.state.sketch.offset.y = Math.round((self.state.sketch.offset.y - 0.05) * 100) / 100; break;
                case 'left': self.state.sketch.offset.x = Math.round((self.state.sketch.offset.x - 0.05) * 100) / 100; break;
                case 'right': self.state.sketch.offset.x = Math.round((self.state.sketch.offset.x + 0.05) * 100) / 100; break;
            }

            if (self.state.sketch.offset.x > 5) self.state.sketch.offset.x = 5;
            if (self.state.sketch.offset.x < -5) self.state.sketch.offset.x = -5;
            if (self.state.sketch.offset.y > 5) self.state.sketch.offset.y = 5;
            if (self.state.sketch.offset.y < -5) self.state.sketch.offset.y = -5;

            self.state.sketch.offset.z = 0;

            self.state.ProductViewer.refresh();
        });
    }
}