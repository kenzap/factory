import { __html, getStorage, parseApiError, spaceID, toast } from '@kenzap/k-cloud';
import { getProductId, log, randomString } from "../_helpers.js";

export const structTexture = (state) => {

    // (s.parent.toLowerCase() + (s.title.length > 1 ? "-" + s.title.toLowerCase() : "")).replace(" ", "-")
}

export const renderProduction = (state) => {

    if (!state.sketch.textures) state.sketch.textures = state.sketch.textures;

    fetch('https://render.factory.app.kenzap.cloud:3999/?cmd=render&swap_colors=' + state.sketch.swap + '&files=' + JSON.stringify(state.product.cad_files) + '&camera=' + encodeURIComponent(JSON.stringify(state.sketch.camera)) + '&offset=' + encodeURIComponent(JSON.stringify(state.sketch.offset)) + '&textures=' + encodeURIComponent(JSON.stringify(state.sketch.textures)) + '&fov=' + state.sketch.fov + '&id=' + getProductId() + '&space=' + spaceID() + '&storage=' + encodeURIComponent(getStorage()) + '&hash=' + randomString(6), {
        method: 'get',
        // headers: H()
    })
        .then(response => response.json())
        .then(response => {

            toast(__html("Sketch added to rendering queue"));

            log(response);
        })
        .catch(error => { parseApiError(error); });
}

export const renderPreview = (state, e, type) => {

    let d = document;

    // map parameters
    state.sketch.texture = {
        swap_colors: document.querySelector("#sketch_swap_colors").checked ? 1 : 0,
        background: "1,1,1",
        alignment: document.querySelector("#sketch_alignment").value,
        texture: document.querySelector("#sketch_texture").value,
        coating_side: parseInt(document.querySelector("#sketch_coating_side").value),
        energy: parseFloat(document.querySelector("#sketch_energy").value),
        roughness: parseFloat(document.querySelector("#sketch_roughness").value),
        metallic: parseFloat(document.querySelector("#sketch_metallic").value),
        ratio: parseFloat(document.querySelector("#sketch_ratio").value),
    };

    if (type == "cam") {

        d.querySelector(".camera-view").value.trim().split(',').forEach((el, i) => { state.sketch.camera['p' + (i + 1)] = parseInt(el) });
    } else {

        d.querySelector(".camera-view").value = `${state.sketch.camera.p1 + ',' + state.sketch.camera.p2 + ',' + state.sketch.camera.p3}`;
    }

    state.img_preview = state.img_preview ? state.img_preview : new Image();

    d.querySelector(".sketch_loader").classList.remove("d-none");

    let sel = ".images-sketch", _fi = 0;
    let img = 'https://render.factory.app.kenzap.cloud:3999/?cmd=preview&swap_colors=' + state.sketch.texture.swap_colors + '&texture=' + encodeURIComponent(JSON.stringify(state.sketch.texture)) + '&files=' + encodeURIComponent(JSON.stringify(state.product.cad_files)) + '&camera=' + encodeURIComponent(JSON.stringify(state.sketch.camera)) + '&offset=' + encodeURIComponent(JSON.stringify(state.sketch.offset)) + '&fov=' + state.sketch.fov + '&id=' + getProductId() + '&space=' + spaceID() + '&storage=' + encodeURIComponent(getStorage()) + '&hash=' + randomString(6); //https://render.factory.app.kenzap.cloud:3999/?cmd=preview&files=[{%22id%22:%22mmAEkUhgiowK%22,%22ext%22:%22obj%22,%22name%22:%22DetOsn-v10.obj%22},{%22id%22:%22fRYodDpVgowz%22,%22ext%22:%22mtl%22,%22name%22:%22DetOsn-v10.mtl%22}]&camera={%22p1%22:7,%22p2%22:145,%22p3%22:90}&id=7101f85c3a1ce918291d3f54354f27b2d42f5111&space=1002170

    document.querySelector("sketch-render .progress-bar").setAttribute('style', 'width: 0%');

    state.render_progress = 0;

    if (state.render_interval) clearInterval(state.render_interval);

    state.render_interval = setInterval(() => {
        state.render_progress += 0.16; // 100% / 60 seconds
        document.querySelector("sketch-render .progress-bar").setAttribute('style', `width: ${state.render_progress}%`);
        if (state.render_progress >= 100) {
            clearInterval(state.render_interval);
        }
    }, 50);

    state.img_preview.onload = () => {

        d.querySelectorAll(sel + _fi).forEach(el => el.setAttribute('src', img));
        d.querySelector(sel + _fi).parentElement.querySelector('.remove').classList.remove('hd');
        d.querySelector(".sketch_loader").classList.add("d-none");

        document.querySelector("sketch-render .progress-bar").setAttribute('style', `width: 100%`);
        clearInterval(state.render_interval);

        toast(__html("Sketch rendered successfully"));
    };

    setTimeout(() => { state.img_preview.src = img; }, 1000);
}