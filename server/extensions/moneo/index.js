import { syncClients } from './src/clients.js';
import { syncDocuments } from './src/documents.js';

export function register({ router, cron, db, logger }) {

    // sync client ids with moneo
    router.get('/sync-ids', async (req, res) => {

        await syncClients(db, logger);
    });

    // sync receipts and invoices with moneo
    router.get('/sync-documents', async (req, res) => {

        await syncDocuments(db, logger);
    });

    // TODO: imoplement cron job
};