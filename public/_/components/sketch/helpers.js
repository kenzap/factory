
import { showLoader, toast } from "../../helpers/global.js";

// has render files
export const hasRenderFiles = (product) => {

    const hasObjFile = product.cad_files.some(file => file.name.endsWith('.obj'));
    const hasMtlFile = product.cad_files.some(file => file.name.endsWith('.mtl'));

    if (hasObjFile && hasMtlFile) {
        return true;
    }

    return false;
}

/**
 * Converts degrees to radians
 * 
 * @param deg {Integer}
 * @returns {Integer} - radians
 */
export const degToRad = (deg) => {

    return (deg - 90) * Math.PI / 180.0;
}

export const saveSketchDefaults = (product, settings) => {

    // console.log(state.factory_settings);

    if (!settings.textures) settings.textures = [];

    let i = document.querySelector("#sketch_texture").selectedIndex;
    let texture = document.querySelector("#sketch_texture").options[i].value;

    // { coating: "matt-pural-rr11", colors: 2, roughness: 0.5, metallic: 0.1, energy: 1.5, background: "1,1,1" }

    settings.textures = settings.textures.filter(o => o.texture !== texture);

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

    settings.textures.push(obj);

    console.log('texture', texture);
    // console.log(state.factory_settings);

    toast('New defaults applied');

    // setTimeout(() => { toast('Please save product'); }, 2000);

    // return false;

    showLoader();

    // // send data
    // fetch(getAPI(), {
    //     method: 'post',
    //     headers: H(),
    //     body: JSON.stringify({
    //         query: {
    //             product: {
    //                 type: 'set',
    //                 key: '3dfactory-settings',
    //                 sid: spaceID(),
    //                 data: {
    //                     "textures": state.factory_settings.textures
    //                 }
    //             }
    //         }
    //     })
    // })
    //     .then(response => response.json())
    //     .then(response => {

    //         if (response.success) {

    //             hideLoader();

    //         } else {

    //             parseApiError(response);
    //         }
    //     })
    //     .catch(error => { parseApiError(error); });
}

// set modified textures as defaults for other renders as long as they are not in the list
export const setTextureDefaults = (product, settings) => {

    product.sketch.textures.forEach(element => {

        let add = true;

        if (settings.textures.some(o => o.texture === element.texture)) {

            add = false;
        }

        if (add) settings.textures.push(element);
    });

    return settings.textures;

    // console.log("setTextureDefaults");
    // console.log(this.state.factory_settings.textures);
}