import { sseManager } from './sse.js';
import { getTaskByRecordId } from './task.js';

export async function broadcastTaskUpdate(db, taskRecordId, user) {
    const task = await getTaskByRecordId(db, taskRecordId);
    if (!task || task.deleted) return null;

    sseManager.broadcast({
        type: 'task-update',
        task,
        updated_by: {
            user_id: user?.id || null,
            name: user?.fname || ''
        },
        timestamp: new Date().toISOString()
    });

    return task;
}

export function broadcastTaskDelete(task, user) {
    if (!task?._id && !task?.id) return;

    sseManager.broadcast({
        type: 'task-delete',
        task: {
            _id: task._id || null,
            id: task.id || null,
            deleted_at: task.deleted_at || new Date().toISOString()
        },
        updated_by: {
            user_id: user?.id || null,
            name: user?.fname || ''
        },
        timestamp: new Date().toISOString()
    });
}
