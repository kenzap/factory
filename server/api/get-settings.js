import { authenticateToken } from '../_/helpers/auth.js';
import { loadIntegrationManifests } from '../_/helpers/extensions/manifest.js';
import { getLocale, log } from '../_/helpers/index.js';
import { getSettings } from '../_/helpers/settings.js';

// API route
function getSettingsApi(app) {

    app.post('/api/get-settings/', authenticateToken, async (req, res) => {
        try {

            const locale = await getLocale(req.headers.locale);
            const settings = await getSettings();
            const extensions = loadIntegrationManifests();
            // const config = mergeSettings(extensions, settings);

            res.send({ success: true, settings, extensions, locale, sid: 0, user: req.user, });
        } catch (err) {

            res.status(500).json({ error: 'failed to get settings' });
            log(`Error getting settings: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getSettingsApi;