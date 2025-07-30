import { authenticateToken } from '../_/helpers/auth.js';
import { locale } from '../_/helpers/index.js';

function clean_firm(firm) {
    firm = firm.replace(/^SIA\s/, "");
    firm = firm.replace(/^Sabiedrība ar ierobežotu atbildību ražošanas komercfirma\s/, "");
    firm = firm.replace(/^Ražošanas komercfirma SIA\s/, "");
    firm = firm.replace(/^Sabiedrība ar ierobežotu atbildību\s/, "");
    // firm = firm.replace(/^SIA tirdzniecības uzņēmums\s/, "");
    firm = firm.replace(/^IK\s/, "");
    firm = firm.replace(/^Individuālais komersants\s/, "");
    firm = firm.replace(/^AS\s/, "");
    firm = firm.replace(/^Akciju sabiedrība\s/, "");
    firm = firm.replace(/"/g, "");
    return firm;
}

function get_type(firm) {
    let type = "";

    if (firm.startsWith('SIA ')) {
        type = 'SIA';
    }
    if (firm.startsWith('Sabiedrība ar ierobežotu atbildību ražošanas komercfirma ')) {
        type = 'SIA';
    }
    // if (firm.startsWith('SIA tirdzniecības uzņēmums ')) {
    //     type = 'SIA';
    // }
    if (firm.startsWith('Ražošanas komercfirma SIA ')) {
        type = 'SIA';
    }
    if (firm.startsWith('Sabiedrība ar ierobežotu atbildību ')) {
        type = 'SIA';
    }
    if (firm.startsWith('IK ')) {
        type = 'IK';
    }
    if (firm.startsWith('Individuālais komersants ')) {
        type = 'IK';
    }
    if (firm.startsWith('AS ')) {
        type = 'AS';
    }
    if (firm.startsWith('Akciju sabiedrība ')) {
        type = 'AS';
    }

    return type;
}

/**
 * Create or save client data
 *
 * List orders
 *
 * @version 1.0
 * @param {JSON} data - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function verifyClient(data) {

    // TODO. add multi country support
    const cc = locale.toLocaleUpperCase();

    // set defaults
    const output = {
        success: true,
        pvncode: "",
        pvnStatus: "0",
        statuss: "0",
        adress_full: "",
        client_update: false
    };

    try {
        const response = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${data.reg_number}`);
        const js = await response.json();

        if (js.isValid && js.userError === "VALID") {
            output.statuss = "1";
            output.pvnStatus = "active";
            output.adress_full = js.address;
            output.pvncode = cc + js.vatNumber;
            output.name = js.name;
            output.type = get_type(js.name);
            output.firm = clean_firm(js.name);
            output.klients_new = clean_firm(js.name) + " " + output.type;
        }

        return output;
    } catch (error) {
        return { success: false, error: error.message };
    }

    // const client = getDbConnection();

    // if (!data) return { success: false, error: 'no data provided' };

    // // fac3f1a7e335d4fd27b0c20910e37157a234f3ed
    // if (!data._id) data._id = makeId();

    // let response = null;

    // // Get orders
    // let query = `
    //     INSERT INTO data (_id, pid, ref, sid, js)
    //     VALUES ($1, $2, $3, $4, $5)
    //     ON CONFLICT (_id)
    //     DO UPDATE SET
    //         js = EXCLUDED.js
    //     RETURNING _id`;

    // const params = [data._id, 0, '3dfactory-entity', sid, JSON.stringify({ data: data, meta: { created: Date.now(), updated: Date.now() } })];

    // try {

    //     await client.connect();

    //     const result = await client.query(query, params);

    //     response = result.rows;

    // } finally {
    //     await client.end();
    // }

    // return response;
}

// Simple API route
function verifyClientApi(app) {

    app.post('/api/verify-client/', authenticateToken, async (_req, res) => {

        // console.log('saveClientApi _req.body', _req.body);

        const data = _req.body;
        const response = await verifyClient(data);

        console.log('saveClient response', response);

        res.json({ success: true, client: response, message: 'client saved' });
    });
}

export default verifyClientApi;