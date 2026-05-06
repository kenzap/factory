import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection } from '../_/helpers/index.js';
import { broadcastTaskDelete } from '../_/helpers/task-live-update.js';
import { softDeleteTask } from '../_/helpers/task.js';

function deleteTaskApi(app) {
    app.post('/api/delete-task/', authenticateToken, async (_req, res) => {
        const user = _req.user;

        if (!user?.rights?.includes('tasks_management')) {
            res.status(403).json({ success: false, error: 'forbidden', code: 403 });
            return;
        }

        const db = getDbConnection();

        try {
            await db.connect();

            const deleted = await softDeleteTask(db, _req.body || {}, user);
            broadcastTaskDelete(deleted, user);

            res.json({
                success: true,
                task: deleted
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'failed to delete task',
                code: 400
            });
        } finally {
            await db.end();
        }
    });
}

export default deleteTaskApi;
