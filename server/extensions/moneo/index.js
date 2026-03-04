import { syncClients, syncOldClientIds } from './src/clients.js';
import { syncDocuments } from './src/documents.js';

/* Moneo Extension for ERP Factory
    * 
    * This extension synchronizes clients and documents (invoices and receipts) between ERP Factory and Moneo.
    * It provides API endpoints for manual synchronization and is designed to be extended with scheduled cron jobs for automated sync in the future.
    * 
    * 1. Sync Clients: http://localhost:3000/extension/moneo/sync-ids?limit=1&dry_run=true
    * 2. Sync Documents: http://localhost:3000/extension/moneo/sync-documents?limit=1&dry_run=true
    *
*/
export function register({ router, cron, db, logger, config }) {

    logger.info('Moneo extension registered', config.get("default_timezone"));

    // sync client ids with moneo http://localhost:3000/extension/moneo/sync-ids?limit=10
    if (process.env.NODE_ENV !== 'production')
        router.get('/sync-ids', async (req, res) => {

            logger.info('Starting client sync with Moneo...');

            const dryRunParam = String(req.query?.dry_run || req.query?.dryRun || '').toLowerCase();
            const dryRun = dryRunParam === '1' || dryRunParam === 'true' || dryRunParam === 'yes';
            const limitRaw = Number.parseInt(String(req.query?.limit ?? ''), 10);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;
            const result = await syncClients(db, logger, config, { dryRun, limit });
            return res.json(result);
        });

    if (process.env.NODE_ENV !== 'production')
        router.get('/sync-old-ids', async (req, res) => {

            logger.info('Starting client old IDs sync with Moneo...');
            const dryRunParam = String(req.query?.dry_run || req.query?.dryRun || '').toLowerCase();
            const dryRun = dryRunParam === '1' || dryRunParam === 'true' || dryRunParam === 'yes';
            const result = await syncOldClientIds(db, logger, { dryRun });
            return res.json(result);

        });

    // sync receipts and invoices with moneo http://localhost:3000/extension/moneo/sync-documents?limit=1&dry_run=true
    router.get('/sync-documents', async (req, res) => {

        const dryRunParam = String(req.query?.dry_run || req.query?.dryRun || '').toLowerCase();
        const dryRun = dryRunParam === '1' || dryRunParam === 'true' || dryRunParam === 'yes';
        const limitRaw = Number.parseInt(String(req.query?.limit ?? ''), 10);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;
        const result = await syncDocuments(db, logger, config, { limit, dryRun });
        return res.json(result);
    });

    // TODO: implement cron job
};
