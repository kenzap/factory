import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Get Client Details
 *
 * @version 1.0
 * @param {string} id - entity ID of the client
 * @returns {Array<Object>} - Array of clients
*/
async function getClientIdByRegNumber(reg_number, cc) {

    const client = getDbConnection();

    let data = {};

    // Querry 
    const query = `
        SELECT 
            _id,
            js->'data'->>'reg_number' as "reg_number",
            js->'data'->>'legal_name' as "legal_name",
            js->'data'->>'tax_region' as "tax_region"
        FROM data 
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'reg_number' = $3
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['entity', sid, reg_number]);

        if (result.rows) data = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return data;
}

function clean_firm(firm) {
    firm = firm.replace(/^SIA\s/, "");
    firm = firm.replace(/^Sabiedrība ar ierobežotu atbildību ražošanas komercfirma\s/, "");
    firm = firm.replace(/^Firma SIA\s/, "");
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
    if (firm.startsWith('Firma SIA ')) {
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
        } else if (js.userError === "SERVICE_UNAVAILABLE") {
            output.success = false;
            output.error = "Service temporarily unavailable";
            output.statuss = "0";
        } else {
            output.success = false;
            output.statuss = "0";
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
        const client = await verifyClient(data, logger);
        const details = await getClientIdByRegNumber(data.reg_number, data.tax_region?.toUpperCase() || locale?.toUpperCase());

        res.json({ success: true, client: { ...client, ...details } });
    });
}

export default verifyClientApi;