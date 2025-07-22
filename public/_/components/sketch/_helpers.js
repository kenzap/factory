import { getAPI, H, hideLoader, showLoader, spaceID, toast } from '@kenzap/k-cloud';
import { parseApiError } from "../_helpers.js";

// has render files
export const hasRenderFiles = (state) => {

    const hasObjFile = state.product.cad_files.some(file => file.name.endsWith('.obj'));
    const hasMtlFile = state.product.cad_files.some(file => file.name.endsWith('.mtl'));

    if (hasObjFile && hasMtlFile) {
        return true;
    }

    return false;
}

export const saveSketchDefaults = (state) => {

    // console.log(state.factory_settings);

    if (!state.factory_settings.textures) state.factory_settings.textures = [];

    let i = document.querySelector("#sketch_texture").selectedIndex;
    // let datasetI = document.querySelector("#sketch_texture").options[i].dataset.i;
    let texture = document.querySelector("#sketch_texture").options[i].value;

    // { coating: "matt-pural-rr11", colors: 2, roughness: 0.5, metallic: 0.1, energy: 1.5, background: "1,1,1" }

    state.factory_settings.textures = state.factory_settings.textures.filter(o => o.texture !== texture);

    let obj = {
        swap_colors: document.querySelector("#sketch_swap_colors").checked ? 1 : 0,
        coating_side: parseInt(document.querySelector("#sketch_coating_side").value),
        texture: document.querySelector("#sketch_texture").value,
        roughness: parseFloat(document.querySelector("#sketch_roughness").value),
        metallic: parseFloat(document.querySelector("#sketch_metallic").value),
        energy: parseFloat(document.querySelector("#sketch_energy").value),
        ratio: parseInt(document.querySelector("#sketch_ratio").value),
        background: "1,1,1"
    };

    state.factory_settings.textures.push(obj);

    console.log('texture', texture);
    // console.log(state.factory_settings);

    toast('New defaults applied');

    // setTimeout(() => { toast('Please save product'); }, 2000);

    // return false;

    showLoader();

    // send data
    fetch(getAPI(), {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {
                product: {
                    type: 'set',
                    key: '3dfactory-settings',
                    sid: spaceID(),
                    data: {
                        "textures": state.factory_settings.textures
                    }
                }
            }
        })
    })
        .then(response => response.json())
        .then(response => {

            if (response.success) {

                hideLoader();

            } else {

                parseApiError(response);
            }
        })
        .catch(error => { parseApiError(error); });
}