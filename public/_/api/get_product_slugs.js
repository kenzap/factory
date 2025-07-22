import { H, getAPI, hideLoader } from '@kenzap/k-cloud';
import { parseApiError } from "../../_/_helpers.js";

export const getProductSlugs = (state) => {

    // do API query
    fetch(getAPI(), {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {
                locales: {
                    type: "find",
                    key: "locale-ecommerce",
                    fields: ["_id", "language", "location", "locale", "ext", "content", "updated"],
                }
            }
        })
    })
        .then(response => response.json())
        .then(response => {

            console.log("getProductSlugs", response);

            // hide UI loader
            hideLoader();

            if (response.success) {

                state.cb(response)

            } else {

                parseApiError(response);
            }
        })
        .catch(error => { parseApiError(error); });
}