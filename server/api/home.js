import { authenticateToken } from '../_/helpers/auth.js';
import { getLocale } from '../_/helpers/index.js';

// API route
function homeApi(app) {

    app.post('/api/home/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers.locale);

        res.json({ success: true, user: _req.user, locale });
    });
}

export default homeApi;