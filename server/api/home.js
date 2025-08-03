import { authenticateToken } from '../_/helpers/auth.js';
import { getLocale, getSettings } from '../_/helpers/index.js';

// API route
function homeApi(app) {

    app.post('/api/home/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers.locale);
        const settings = await getSettings();

        res.json({ success: true, user: _req.user, settings, locale });
    });
}

export default homeApi;