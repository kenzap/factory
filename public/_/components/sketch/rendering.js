import { __html, getProductId, getStorage, log, parseApiError, randomString, spaceID, toast } from "../../helpers/global.js";

export const structTexture = (state) => {

    // (s.parent.toLowerCase() + (s.title.length > 1 ? "-" + s.title.toLowerCase() : "")).replace(" ", "-")
}

export const renderProduction = (product) => {

    if (!product.sketch.textures) product.sketch.textures = product.sketch.textures;

    fetch('https://render.factory.app.kenzap.cloud:3999/?cmd=render&swap_colors=' + product.sketch.swap + '&files=' + JSON.stringify(product.cad_files) + '&camera=' + encodeURIComponent(JSON.stringify(product.sketch.camera)) + '&offset=' + encodeURIComponent(JSON.stringify(product.sketch.offset)) + '&textures=' + encodeURIComponent(JSON.stringify(product.sketch.textures)) + '&fov=' + product.sketch.fov + '&id=' + getProductId() + '&space=' + spaceID() + '&storage=' + encodeURIComponent(getStorage()) + '&hash=' + randomString(6), {
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

export const renderPreview = (product, e, type) => {

    console.log("renderPreview", product);

    let d = document;

    // map parameters
    product.sketch.texture = {
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

        d.querySelector(".camera-view").value.trim().split(',').forEach((el, i) => { product.sketch.camera['p' + (i + 1)] = parseInt(el) });
    } else {

        d.querySelector(".camera-view").value = `${product.sketch.camera.p1 + ',' + product.sketch.camera.p2 + ',' + product.sketch.camera.p3}`;
    }

    product.img_preview = product.img_preview ? product.img_preview : new Image();

    d.querySelector(".sketch_loader").classList.remove("d-none");

    let sel = ".images-sketch", _fi = 0;
    let img = 'https://render.factory.app.kenzap.cloud:3999/?cmd=preview&swap_colors=' + product.sketch.texture.swap_colors + '&texture=' + encodeURIComponent(JSON.stringify(product.sketch.texture)) + '&files=' + encodeURIComponent(JSON.stringify(product.cad_files)) + '&camera=' + encodeURIComponent(JSON.stringify(product.sketch.camera)) + '&offset=' + encodeURIComponent(JSON.stringify(product.sketch.offset)) + '&fov=' + product.sketch.fov + '&id=' + getProductId() + '&space=' + spaceID() + '&storage=' + encodeURIComponent(getStorage()) + '&hash=' + randomString(6); //https://render.factory.app.kenzap.cloud:3999/?cmd=preview&files=[{%22id%22:%22mmAEkUhgiowK%22,%22ext%22:%22obj%22,%22name%22:%22DetOsn-v10.obj%22},{%22id%22:%22fRYodDpVgowz%22,%22ext%22:%22mtl%22,%22name%22:%22DetOsn-v10.mtl%22}]&camera={%22p1%22:7,%22p2%22:145,%22p3%22:90}&id=7101f85c3a1ce918291d3f54354f27b2d42f5111&space=1002170

    document.querySelector("sketch-render .progress-bar").setAttribute('style', 'width: 0%');

    product.render_progress = 0;

    if (product.render_interval) clearInterval(product.render_interval);

    product.render_interval = setInterval(() => {
        product.render_progress += 0.16; // 100% / 60 seconds
        document.querySelector("sketch-render .progress-bar").setAttribute('style', `width: ${product.render_progress}%`);
        if (product.render_progress >= 100) {
            clearInterval(product.render_interval);
        }
    }, 50);

    product.img_preview.onload = () => {

        d.querySelectorAll(sel + _fi).forEach(el => el.setAttribute('src', img));
        d.querySelector(sel + _fi).parentElement.querySelector('.remove').classList.remove('hd');
        d.querySelector(".sketch_loader").classList.add("d-none");

        document.querySelector("sketch-render .progress-bar").setAttribute('style', `width: 100%`);
        clearInterval(product.render_interval);

        toast(__html("Sketch rendered successfully"));
    };

    setTimeout(() => { product.img_preview.src = img; }, 1000);
}