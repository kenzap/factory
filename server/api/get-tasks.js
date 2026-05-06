import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getSettings } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';
import { getTasks } from '../_/helpers/task.js';

async function getTasksApiData(filters = {}, user = null) {
    const db = getDbConnection();

    try {
        await db.connect();
        return await getTasks(db, filters, user);
    } finally {
        await db.end();
    }
}

function getTasksApi(app) {
    app.post('/api/get-tasks/', authenticateToken, async (_req, res) => {
        const user = _req.user;

        if (!user?.rights?.includes('tasks_journal')) {
            res.status(403).json({ success: false, error: 'forbidden', code: 403 });
            return;
        }

        const [locale, settings, tasks] = await Promise.all([
            getLocale(_req.headers),
            getSettings(['default_timezone']),
            getTasksApiData(_req.body?.filters || {}, user)
        ]);

        res.json({
            success: true,
            user,
            settings,
            locale,
            tasks
        });
    });
}

export default getTasksApi;
