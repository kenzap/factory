import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../_/helpers/auth.js';
import { log, log_error } from '../_/helpers/index.js';

/**
 * Get bank details by IBAN code
 *
 * @version 1.0
 * @param {string} code - cank code, ex. UNLALV
 * @returns {Object} - Bank details
*/
async function getBankDetails(code) {

    let data = {};

    try {

        // Read the bank codes JSON file
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const bankCodesPath = path.join(__dirname, '../_/assets/bank-codes-lv.json');
        const bankCodesData = JSON.parse(fs.readFileSync(bankCodesPath, 'utf8'));

        console.log('Searching for bank code:', bankCodesData);

        // Find bank by code, ex., LV78UNLA0050000100888
        const bank = bankCodesData.find(bank => bank?.code?.startsWith(code));

        if (bank) {
            data = {
                id: bank.id,
                name: bank.name,
                code: bank.code
            };
        }

    } catch (e) {

        log_error(e);
    }

    return data;
}

// API route
function getBankDetailsApi(app) {

    app.post('/api/get-bank-details/', authenticateToken, async (req, res) => {
        try {
            const data = await getBankDetails(req.body.code);

            console.log('getBankDetails req.body.code', req.body.code);

            res.send({ success: true, data });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getBankDetailsApi;