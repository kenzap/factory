import { authenticateToken } from '../_/helpers/auth.js';
import { getSettings } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

// API route
function homeApi(app) {

    app.post('/api/home/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers);
        const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc"]);

        res.json({ success: true, user: _req.user, settings, locale });
    });
}

export default homeApi;