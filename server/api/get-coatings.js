import { authenticateToken } from '../_/helpers/auth.js';
import { getLocale, getSettings } from '../_/helpers/index.js';

// API route
function getCoatingsApi(app) {

    app.post('/api/get-coatings/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers.locale);
        const settings = await getSettings(["var_parent", "textures"]);

        res.json({ success: true, user: _req.user, settings, locale, user: _req.user, });
    });
}

export default getCoatingsApi;