import { makeId, sid } from './index.js';

export const TASK_REF = 'task';
export const TASK_ACTIVE_STATUSES = new Set(['open', 'in_progress', 'waiting']);
export const TASK_CLOSED_STATUSES = new Set(['done', 'canceled']);
const DEFAULT_TASK_LIMIT = 500;

const ALLOWED_TYPES = new Set(['task', 'reminder']);
const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'waiting', 'done', 'canceled']);
const ALLOWED_PRIORITIES = new Set(['high', 'medium', 'low']);
const ALLOWED_LINK_TYPES = new Set(['order', 'client', 'supplier', 'product', 'stock_item', 'vehicle', 'employee', 'supply_record', 'other']);

const toTrimmedString = (value = '') => String(value || '').trim();

const normalizeOptionalDate = (value) => {
    const raw = toTrimmedString(value);
    if (!raw) return null;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString();
};

const normalizeUserSnapshot = (user = {}) => {
    const id = toTrimmedString(user?.id || user?._id);
    if (!id) return null;

    return {
        id,
        fname: toTrimmedString(user?.fname),
        lname: toTrimmedString(user?.lname),
        email: toTrimmedString(user?.email)
    };
};

const normalizeUserSnapshots = (users = []) => {
    const seen = new Set();

    return (Array.isArray(users) ? users : [])
        .map(normalizeUserSnapshot)
        .filter((user) => {
            if (!user?.id || seen.has(user.id)) return false;
            seen.add(user.id);
            return true;
        });
};

const makeTaskPublicId = () => makeId().slice(0, 8).toUpperCase();

const normalizeTaskPayload = (input = {}, existingData = {}, user = null) => {
    const currentDate = new Date().toISOString();
    const currentTime = Math.floor(Date.now() / 1000);
    const isCreate = !existingData?._id;

    const title = toTrimmedString(input.title || existingData.title);
    if (!title) {
        throw new Error('Task title is required');
    }

    const typeRaw = toTrimmedString(input.type || existingData.type || 'task').toLowerCase();
    const statusRaw = toTrimmedString(input.status || existingData.status || 'open').toLowerCase();
    const priorityRaw = toTrimmedString(input.priority || existingData.priority || 'medium').toLowerCase();
    const linkTypeRaw = toTrimmedString(input.linked_ref_type || existingData.linked_ref_type).toLowerCase();

    const type = ALLOWED_TYPES.has(typeRaw) ? typeRaw : 'task';
    const status = ALLOWED_STATUSES.has(statusRaw) ? statusRaw : 'open';
    const priority = ALLOWED_PRIORITIES.has(priorityRaw) ? priorityRaw : 'medium';
    const linkedRefType = linkTypeRaw ? (ALLOWED_LINK_TYPES.has(linkTypeRaw) ? linkTypeRaw : 'other') : '';

    const createdBy = normalizeUserSnapshot(existingData.created_by || user) || existingData.created_by || null;
    const assignedUsers = normalizeUserSnapshots(input.assigned_users ?? existingData.assigned_users ?? []);
    const watchers = normalizeUserSnapshots(input.watchers ?? existingData.watchers ?? []);

    const data = {
        ...existingData,
        _id: existingData._id || makeId(),
        id: toTrimmedString(existingData.id || input.id || makeTaskPublicId()),
        type,
        title,
        description: toTrimmedString(input.description ?? existingData.description),
        status,
        priority,
        category: toTrimmedString(input.category ?? existingData.category),
        due_date: normalizeOptionalDate(input.due_date ?? existingData.due_date),
        remind_at: normalizeOptionalDate(input.remind_at ?? existingData.remind_at),
        assigned_users: assignedUsers,
        watchers,
        created_by: createdBy,
        linked_ref_type: linkedRefType,
        linked_ref_id: toTrimmedString(input.linked_ref_id ?? existingData.linked_ref_id),
        linked_ref_label: toTrimmedString(input.linked_ref_label ?? existingData.linked_ref_label),
        notes: toTrimmedString(input.notes ?? existingData.notes),
        source: toTrimmedString(existingData.source || input.source || 'manual'),
        pinned: input.pinned ?? existingData.pinned ?? false,
        private: input.private ?? existingData.private ?? false,
        reminder_sent_at: existingData.reminder_sent_at || null,
        overdue_notified_at: existingData.overdue_notified_at || null,
        deleted: existingData.deleted || null,
        created_at: existingData.created_at || currentDate,
        updated_at: currentDate
    };

    if (TASK_CLOSED_STATUSES.has(status)) {
        data.completed_at = existingData.completed_at || currentDate;
        data.completed_by = normalizeUserSnapshot(user) || existingData.completed_by || null;
    } else {
        data.completed_at = null;
        data.completed_by = null;
    }

    const meta = {
        created: existingData?.meta?.created || currentTime,
        updated: currentTime
    };

    if (isCreate) {
        meta.created = currentTime;
    }

    return { data, meta };
};

export const formatTaskRow = (row = {}) => ({
    _id: row._id,
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    due_date: row.due_date,
    remind_at: row.remind_at,
    assigned_users: row.assigned_users || [],
    watchers: row.watchers || [],
    created_by: row.created_by || null,
    linked_ref_type: row.linked_ref_type || '',
    linked_ref_id: row.linked_ref_id || '',
    linked_ref_label: row.linked_ref_label || '',
    notes: row.notes || '',
    source: row.source || 'manual',
    pinned: row.pinned || false,
    private: row.private || false,
    completed_at: row.completed_at || null,
    completed_by: row.completed_by || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    deleted: row.deleted || null
});

export async function getTaskByRecordId(db, recordId) {
    const id = toTrimmedString(recordId);
    if (!id) return null;

    const query = `
        SELECT
            _id,
            js->'data'->>'id' as id,
            js->'data'->>'type' as type,
            js->'data'->>'title' as title,
            js->'data'->>'description' as description,
            js->'data'->>'status' as status,
            js->'data'->>'priority' as priority,
            js->'data'->>'category' as category,
            js->'data'->>'due_date' as due_date,
            js->'data'->>'remind_at' as remind_at,
            js->'data'->'assigned_users' as assigned_users,
            js->'data'->'watchers' as watchers,
            js->'data'->'created_by' as created_by,
            js->'data'->>'linked_ref_type' as linked_ref_type,
            js->'data'->>'linked_ref_id' as linked_ref_id,
            js->'data'->>'linked_ref_label' as linked_ref_label,
            js->'data'->>'notes' as notes,
            js->'data'->>'source' as source,
            COALESCE((js->'data'->'pinned')::boolean, false) as pinned,
            COALESCE((js->'data'->'private')::boolean, false) as private,
            js->'data'->>'completed_at' as completed_at,
            js->'data'->'completed_by' as completed_by,
            js->'data'->>'created_at' as created_at,
            js->'data'->>'updated_at' as updated_at,
            js->'data'->>'deleted' as deleted
        FROM data
        WHERE ref = $1 AND sid = $2 AND _id = $3
        LIMIT 1
    `;

    const result = await db.query(query, [TASK_REF, sid, id]);
    const row = result.rows[0];

    return row ? formatTaskRow(row) : null;
}

async function getTaskRecordIdByPublicId(db, publicId) {
    const id = toTrimmedString(publicId);
    if (!id) return null;

    const result = await db.query(
        `SELECT _id FROM data WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 LIMIT 1`,
        [TASK_REF, sid, id]
    );

    return result.rows?.[0]?._id || null;
}

export async function getTasks(db, filters = {}, user = null) {
    const params = [TASK_REF, sid];
    const where = [`ref = $1`, `sid = $2`, `js->'data'->>'deleted' IS NULL`];

    const search = toTrimmedString(filters.search);
    if (search) {
        where.push(`(
            COALESCE(js->'data'->>'title', '') ILIKE $${params.length + 1}
            OR COALESCE(js->'data'->>'description', '') ILIKE $${params.length + 1}
            OR COALESCE(js->'data'->>'linked_ref_label', '') ILIKE $${params.length + 1}
            OR COALESCE(js->'data'->>'category', '') ILIKE $${params.length + 1}
        )`);
        params.push(`%${search}%`);
    }

    const type = toTrimmedString(filters.type).toLowerCase();
    if (type && ALLOWED_TYPES.has(type)) {
        where.push(`COALESCE(js->'data'->>'type', 'task') = $${params.length + 1}`);
        params.push(type);
    }

    const priority = toTrimmedString(filters.priority).toLowerCase();
    if (priority && ALLOWED_PRIORITIES.has(priority)) {
        where.push(`COALESCE(js->'data'->>'priority', 'medium') = $${params.length + 1}`);
        params.push(priority);
    }

    const category = toTrimmedString(filters.category);
    if (category) {
        where.push(`COALESCE(js->'data'->>'category', '') = $${params.length + 1}`);
        params.push(category);
    }

    const status = toTrimmedString(filters.status).toLowerCase();
    if (status === 'active') {
        where.push(`COALESCE(js->'data'->>'status', 'open') IN ('open', 'in_progress', 'waiting')`);
    } else if (status && ALLOWED_STATUSES.has(status)) {
        where.push(`COALESCE(js->'data'->>'status', 'open') = $${params.length + 1}`);
        params.push(status);
    }

    if (filters.mine && user?.id) {
        where.push(`EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(js->'data'->'assigned_users', '[]'::jsonb)) AS assignee
            WHERE assignee->>'id' = $${params.length + 1}
        )`);
        params.push(String(user.id));
    }

    const assignedUserId = toTrimmedString(filters.assigned_user_id);
    if (assignedUserId) {
        where.push(`EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(js->'data'->'assigned_users', '[]'::jsonb)) AS assignee
            WHERE assignee->>'id' = $${params.length + 1}
        )`);
        params.push(assignedUserId);
    }

    const dueFrom = normalizeOptionalDate(filters.due_from);
    if (dueFrom) {
        where.push(`COALESCE(js->'data'->>'due_date', '') >= $${params.length + 1}`);
        params.push(dueFrom);
    }

    const dueTo = normalizeOptionalDate(filters.due_to);
    if (dueTo) {
        where.push(`COALESCE(js->'data'->>'due_date', '') <= $${params.length + 1}`);
        params.push(dueTo);
    }

    const limit = Math.min(
        Math.max(1, Number.parseInt(filters.limit || DEFAULT_TASK_LIMIT, 10) || DEFAULT_TASK_LIMIT),
        1000
    );

    const query = `
        SELECT
            _id,
            js->'data'->>'id' as id,
            js->'data'->>'type' as type,
            js->'data'->>'title' as title,
            js->'data'->>'description' as description,
            js->'data'->>'status' as status,
            js->'data'->>'priority' as priority,
            js->'data'->>'category' as category,
            js->'data'->>'due_date' as due_date,
            js->'data'->>'remind_at' as remind_at,
            js->'data'->'assigned_users' as assigned_users,
            js->'data'->'watchers' as watchers,
            js->'data'->'created_by' as created_by,
            js->'data'->>'linked_ref_type' as linked_ref_type,
            js->'data'->>'linked_ref_id' as linked_ref_id,
            js->'data'->>'linked_ref_label' as linked_ref_label,
            js->'data'->>'notes' as notes,
            js->'data'->>'source' as source,
            COALESCE((js->'data'->'pinned')::boolean, false) as pinned,
            COALESCE((js->'data'->'private')::boolean, false) as private,
            js->'data'->>'completed_at' as completed_at,
            js->'data'->'completed_by' as completed_by,
            js->'data'->>'created_at' as created_at,
            js->'data'->>'updated_at' as updated_at,
            js->'data'->>'deleted' as deleted
        FROM data
        WHERE ${where.join(' AND ')}
        ORDER BY
            CASE
                WHEN COALESCE(js->'data'->>'status', 'open') IN ('open', 'in_progress', 'waiting')
                    AND COALESCE(js->'data'->>'due_date', '') <> ''
                    AND (js->'data'->>'due_date')::timestamptz < NOW()
                THEN 0
                WHEN COALESCE(js->'data'->>'due_date', '') <> ''
                THEN 1
                WHEN COALESCE(js->'data'->>'remind_at', '') <> ''
                THEN 2
                ELSE 3
            END,
            CASE COALESCE(js->'data'->>'priority', 'medium')
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
            END,
            NULLIF(js->'data'->>'due_date', '')::timestamptz ASC NULLS LAST,
            NULLIF(js->'data'->>'remind_at', '')::timestamptz ASC NULLS LAST,
            COALESCE(js->'data'->>'updated_at', '') DESC
        LIMIT $${params.length + 1}
    `;

    const countQuery = `
        SELECT COUNT(*) as total
        FROM data
        WHERE ${where.join(' AND ')}
    `;

    const [result, countResult] = await Promise.all([
        db.query(query, [...params, limit]),
        db.query(countQuery, params)
    ]);

    return {
        records: result.rows.map(formatTaskRow),
        total: Number.parseInt(countResult.rows?.[0]?.total || '0', 10)
    };
}

export async function saveTask(db, input = {}, user = null) {
    const selectorId = toTrimmedString(input._id);
    const selectorPublicId = toTrimmedString(input.id);
    let existing = null;
    let existingMeta = null;

    if (selectorId || selectorPublicId) {
        const whereClause = selectorId
            ? `ref = $1 AND sid = $2 AND _id = $3`
            : `ref = $1 AND sid = $2 AND js->'data'->>'id' = $3`;

        const result = await db.query(
            `
                SELECT
                    _id,
                    js->'data' as data,
                    js->'meta' as meta
                FROM data
                WHERE ${whereClause}
                LIMIT 1
            `,
            [TASK_REF, sid, selectorId || selectorPublicId]
        );

        existing = result.rows?.[0]?.data || null;
        existingMeta = result.rows?.[0]?.meta || null;
        if (existing && existingMeta) {
            existing.meta = existingMeta;
        }
    }

    const normalized = normalizeTaskPayload(input, existing || {}, user);
    const query = `
        INSERT INTO data (_id, pid, ref, sid, js)
        VALUES ($1, 0, $2, $3, $4::jsonb)
        ON CONFLICT (_id)
        DO UPDATE SET js = EXCLUDED.js
        RETURNING _id
    `;

    const result = await db.query(query, [
        normalized.data._id,
        TASK_REF,
        sid,
        JSON.stringify({ data: normalized.data, meta: normalized.meta })
    ]);

    return {
        _id: result.rows?.[0]?._id || normalized.data._id,
        id: normalized.data.id
    };
}

export async function softDeleteTask(db, input = {}, user = null) {
    const selectorId = toTrimmedString(input._id);
    const selectorPublicId = toTrimmedString(input.id);
    if (!selectorId && !selectorPublicId) {
        throw new Error('Task identifier is required');
    }

    const taskRecordId = selectorId || await getTaskRecordIdByPublicId(db, selectorPublicId);
    const task = await getTaskByRecordId(db, taskRecordId);

    if (!task) {
        throw new Error('Task not found');
    }

    const deletedAt = new Date().toISOString();
    const updatedAt = Math.floor(Date.now() / 1000);
    const query = `
        UPDATE data
        SET js = jsonb_set(
            jsonb_set(
                jsonb_set(js, '{data,deleted}', to_jsonb($4::text), true),
                '{data,updated_at}', to_jsonb($5::text), true
            ),
            '{meta,updated}', to_jsonb($6::int), true
        )
        WHERE _id = $1 AND ref = $2 AND sid = $3
    `;

    await db.query(query, [task._id, TASK_REF, sid, deletedAt, deletedAt, updatedAt]);

    return {
        _id: task._id,
        id: task.id,
        deleted_at: deletedAt,
        updated_by: normalizeUserSnapshot(user)
    };
}
