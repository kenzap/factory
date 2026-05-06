import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection } from '../_/helpers/index.js';
import { broadcastTaskUpdate } from '../_/helpers/task-live-update.js';
import { saveTask } from '../_/helpers/task.js';

function saveTaskApi(app) {
    app.post('/api/save-task/', authenticateToken, async (_req, res) => {
        const user = _req.user;

        if (!user?.rights?.includes('tasks_management')) {
            res.status(403).json({ success: false, error: 'forbidden', code: 403 });
            return;
        }

        const db = getDbConnection();

        try {
            await db.connect();

            const saved = await saveTask(db, _req.body || {}, user);
            const task = await broadcastTaskUpdate(db, saved._id, user);

            res.json({
                success: true,
                task
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'failed to save task',
                code: 400
            });
        } finally {
            await db.end();
        }
    });
}

export default saveTaskApi;
