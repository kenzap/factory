// import { authenticateToken } from '../_/helpers/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

// API route for product export
function syncMoneoIDsApi(app) {

    // app.get('/api/sync-moneo/', authenticateToken, async (req, res) => {
    app.get('/api/sync-moneo-ids/', async (req, res) => {

        try {

            const response = [], response_missing = [];

            const db = getDbConnection();

            await db.connect();

            // Read the bank codes JSON file
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const _path = path.join(__dirname, '../_/assets/clients.json');
            const data = JSON.parse(fs.readFileSync(_path, 'utf8'));

            console.log('Searching for bank code:', data.data);

            let matches = 0, non_matches = 0;

            for (const element of data[2]['data']) {

                // Querry 
                const query = `
                    SELECT 
                        _id,
                        js->'data'->>'name' as name,
                        js->'data'->>'legal_name' as legal_name
                    FROM data 
                    WHERE ref = $1 AND sid = $2 AND (js->'data'->>'legal_name' = $3 ${element.regnum.length == 11 ? "OR js->'data'->>'reg_number' = '" + element.regnum + "'" : ""})
                `;

                const result = await db.query(query, ['3dfactory-entity', sid, element.nosaukums]);

                let row = {};

                // 3073
                if (result.rows) {

                    matches++;
                    row = result.rows[0] || {};
                    let moneo_id = JSON.parse(element.extra).moneoid;

                    if (row._id) {

                        response.push({ _id: row._id, legal_name: element.nosaukums, match: row?.legal_name || row?.name || row._id, reg_number: element.regnum.replaceAll('-', '').trim(), phone: element.telefons, moneoid: moneo_id });

                        // Update the order with moneo receipt ID in integrations path
                        const query_update = `
                            UPDATE data 
                            SET js = jsonb_set(
                                        jsonb_set(
                                            COALESCE(js, '{}'),
                                            '{integrations}',
                                            COALESCE(js->'integrations', '{}'),
                                            true
                                        ),
                                        '{integrations,moneo}', 
                                        jsonb_build_object('id', $1::text),
                                        true
                                    )
                            WHERE _id = $2 AND ref = $3 AND sid = $4
                        `;

                        // Update matching records with moneoid from JSON
                        let query_response = await db.query(query_update, [moneo_id, row._id, '3dfactory-entity', sid]);
                    } else {

                        non_matches++;
                        response_missing.push({ id: element.id, legal_name: element.nosaukums, match: null, reg_number: element.regnum.replaceAll('-', '').trim(), phone: element.telefons, moneoid: null });
                        // TODO: inser client records as new if no match found
                    }
                }

                // break;
            };

            await db.end();

            res.send({ success: true, data: response, matches, non_matches });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records ' + err.message });
            log(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default syncMoneoIDsApi;