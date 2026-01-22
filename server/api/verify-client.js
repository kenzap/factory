import { authenticateToken } from '../_/helpers/auth.js';

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
async function verifyClient(data, logger) {

    // tax region code
    const cc = data.tax_region?.toUpperCase() || locale?.toUpperCase();

    // set defaults
    const output = {
        success: true,
        pvncode: "",
        pvnStatus: "0",
        vatNumber: "",
        vatStatus: "0",
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
            output.vatStatus = "1";
            output.vatNumber = cc + js.vatNumber;
            output.regNumber = js.vatNumber;
            output.adress_full = js.address;
            output.pvncode = cc + js.vatNumber;
            output.name = js.name;
            output.type = get_type(js.name);
            output.firm = clean_firm(js.name);
            output.klients_new = clean_firm(js.name) + " " + output.type;
        }

        return output;
    } catch (error) {

        logger.error('verifyClient error:', error);

        return { success: false, error: error.message };
    }
}

// Simple API route
function verifyClientApi(app, logger) {

    app.post('/api/verify-client/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await verifyClient(data, logger);

        res.json({ success: true, client: response, message: 'client saved' });
    });
}

export default verifyClientApi;