import { getTasks } from "../_/api/get_tasks.js";
import { saveTask } from "../_/api/save_task.js";
import { deleteTask } from "../_/api/delete_task.js";
import { getUsers } from "../_/api/get_users.js";
import { __html, attr, hideLoader, toast } from "../_/helpers/global.js";
import { TabulatorFull } from "../_/libs/tabulator_esm.min.mjs";
import { Footer } from "../_/modules/footer.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { taskUpdatesSSE } from "../_/modules/sse/task_updates.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class TasksJournal {
    constructor() {
        this.firstLoad = true;
        this.table = null;
        this.selectedRows = [];
        this.liveRefreshTimer = null;
        this.unsubscribeTaskUpdates = null;
        this.user = null;
        this.settings = {};
        this.users = [];
        this.tasks = [];
        this.modalElement = null;
        this.modalInstance = null;
        this.modalAssigneeOptions = [];
        this.modalSelectedAssigneeIds = new Set();
        this.modalAssigneeSearch = '';
        this.searchDebounce = null;
        this.viewMode = 'journal';
        this.calendarMonthStart = this.startOfMonth(new Date());
        this.filters = {
            search: '',
            status: 'active',
            priority: '',
            type: '',
            mine: false,
            limit: 500
        };

        this.categoryOptions = [
            'Procurement',
            'Compliance',
            'HR',
            'Sales Follow-up',
            'Operations',
            'Stock Replenishment',
            'Admin'
        ];

        this.init();
    }

    init = () => {
        new Modal();
        this.view();
        this.loadTasks();
    }

    canManageTasks = () => Boolean(this.user?.rights?.includes('tasks_management'));

    view = () => {
        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12 my-0">
                        <filters-header></filters-header>
                        <div class="card border-0">
                            <div class="card-body p-0">
                                <div class="table-shell" id="tasksJournalShell">
                                    <div id="tasksTable"></div>
                                </div>
                                <div class="calendar-shell d-none" id="tasksCalendarShell">
                                    <div id="tasksCalendar"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadTasks = () => {
        getTasks(this.filters, (response) => {
            if (!response.success) return;

            if (this.firstLoad) {
                this.user = response.user;
                this.settings = response.settings || {};
                new Locale(response);

                if (!isAuthorized(response, 'tasks_journal')) return;

                new Session();
                new Footer(response);
                this.renderHeader();
                this.bindHeaderListeners();
                this.bindTaskUpdates();
                this.fetchUsers();
                this.firstLoad = false;
                document.title = __html('Tasks');
            }

            this.tasks = response.tasks?.records || [];
            this.renderSummary();
            this.renderActiveView();
            hideLoader();
        });
    }

    fetchUsers = () => {
        getUsers({ limit: 500, portal: 'access' }, (response) => {
            this.users = this.sortTaskUsers(response?.users?.users || []);
        });
    }

    renderHeader = () => {
        document.querySelector('filters-header').innerHTML = /*html*/`
            <div class="toolbar">
                <div class="toolbar-row toolbar-identity">
                    <div class="toolbar-left">
                        <span class="toolbar-title">
                            <i class="bi bi-check2-square"></i>${__html('Tasks')}
                        </span>
                        <span class="toolbar-rule" aria-hidden="true"></span>
                        <div class="toolbar-stats" id="tasksSummary"></div>
                    </div>
                    <div class="toolbar-right">
                        <div class="view-toggle" role="group">
                            <button class="view-btn ${this.viewMode === 'journal' ? 'is-active' : ''}" id="viewJournalBtn" title="${attr(__html('Journal'))}">
                                <i class="bi bi-table"></i>
                            </button>
                            <button class="view-btn ${this.viewMode === 'calendar' ? 'is-active' : ''}" id="viewCalendarBtn" title="${attr(__html('Calendar'))}">
                                <i class="bi bi-calendar3"></i>
                            </button>
                        </div>
                        <div class="${this.viewMode === 'calendar' ? '' : 'd-none'}" id="taskCalendarNav" style="display:flex;gap:2px">
                            <button class="view-btn" id="taskCalendarPrevBtn"><i class="bi bi-chevron-left"></i></button>
                            <button class="view-btn calendar-month-label" id="taskCalendarTodayBtn">${attr(this.formatCalendarMonth(this.calendarMonthStart))}</button>
                            <button class="view-btn" id="taskCalendarNextBtn"><i class="bi bi-chevron-right"></i></button>
                        </div>
                        <span class="toolbar-rule" aria-hidden="true"></span>
                        <button class="btn-icon-ghost" id="refreshTasksBtn" title="${attr(__html('Refresh'))}">
                            <i class="bi bi-arrow-repeat"></i>
                        </button>
                        <button class="btn-icon-ghost btn-icon-danger" id="deleteTaskBtn" title="${attr(__html('Delete selected'))}" ${this.canManageTasks() ? '' : 'disabled'}>
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="btn-new-task" id="newTaskBtn" ${this.canManageTasks() ? '' : 'disabled'}>
                            <i class="bi bi-plus-lg"></i>${__html('New Task')}
                        </button>
                    </div>
                </div>
                <div class="toolbar-row toolbar-filters-row">
                    <div class="filter-search-wrap">
                        <i class="bi bi-search filter-search-icon"></i>
                        <input type="text" class="filter-search" id="taskSearch" placeholder="${__html('Search tasks…')}" value="${attr(this.filters.search)}">
                    </div>
                    <select class="filter-chip" id="taskStatusFilter">
                        <option value="active">${__html('Active')}</option>
                        <option value="">${__html('All statuses')}</option>
                        <option value="open">${__html('Open')}</option>
                        <option value="in_progress">${__html('In Progress')}</option>
                        <option value="waiting">${__html('Waiting')}</option>
                        <option value="done">${__html('Done')}</option>
                        <option value="canceled">${__html('Canceled')}</option>
                    </select>
                    <select class="filter-chip" id="taskPriorityFilter">
                        <option value="">${__html('Any priority')}</option>
                        <option value="high">${__html('High')}</option>
                        <option value="medium">${__html('Medium')}</option>
                        <option value="low">${__html('Low')}</option>
                    </select>
                    <label class="filter-mine-toggle" for="taskMineOnly">
                        <input type="checkbox" id="taskMineOnly" ${this.filters.mine ? 'checked' : ''}>
                        <span>${__html('Mine')}</span>
                    </label>
                </div>
            </div>
        `;

        document.getElementById('taskStatusFilter').value = this.filters.status;
        document.getElementById('taskPriorityFilter').value = this.filters.priority;
    }

    bindHeaderListeners = () => {
        document.getElementById('taskSearch').addEventListener('input', (event) => {
            clearTimeout(this.searchDebounce);
            this.searchDebounce = setTimeout(() => {
                this.filters.search = event.currentTarget.value.trim();
                this.loadTasks();
            }, 250);
        });

        document.getElementById('taskStatusFilter').addEventListener('change', (event) => {
            this.filters.status = event.currentTarget.value;
            this.loadTasks();
        });

        document.getElementById('taskPriorityFilter').addEventListener('change', (event) => {
            this.filters.priority = event.currentTarget.value;
            this.loadTasks();
        });

        document.getElementById('taskMineOnly').addEventListener('change', (event) => {
            this.filters.mine = event.currentTarget.checked;
            this.loadTasks();
        });

        document.getElementById('viewJournalBtn').addEventListener('click', () => this.setViewMode('journal'));
        document.getElementById('viewCalendarBtn').addEventListener('click', () => this.setViewMode('calendar'));
        document.getElementById('taskCalendarPrevBtn')?.addEventListener('click', () => this.shiftCalendarMonth(-1));
        document.getElementById('taskCalendarNextBtn')?.addEventListener('click', () => this.shiftCalendarMonth(1));
        document.getElementById('taskCalendarTodayBtn')?.addEventListener('click', () => this.resetCalendarMonth());
        document.getElementById('refreshTasksBtn').addEventListener('click', () => this.loadTasks());
        document.getElementById('newTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('deleteTaskBtn').addEventListener('click', () => this.deleteSelectedTask());
    }

    setViewMode = (mode = 'journal') => {
        if (mode === this.viewMode) return;
        this.viewMode = mode === 'calendar' ? 'calendar' : 'journal';
        this.renderHeader();
        this.bindHeaderListeners();
        this.renderActiveView();
    }

    shiftCalendarMonth = (offset = 0) => {
        const nextMonth = new Date(this.calendarMonthStart);
        nextMonth.setMonth(nextMonth.getMonth() + offset, 1);
        this.calendarMonthStart = this.startOfMonth(nextMonth);
        this.renderCalendar();
        this.updateCalendarHeaderLabel();
    }

    resetCalendarMonth = () => {
        this.calendarMonthStart = this.startOfMonth(new Date());
        this.renderCalendar();
        this.updateCalendarHeaderLabel();
    }

    updateCalendarHeaderLabel = () => {
        const labelNode = document.getElementById('taskCalendarTodayBtn');
        if (labelNode) labelNode.textContent = this.formatCalendarMonth(this.calendarMonthStart);
    }

    bindTaskUpdates = () => {
        taskUpdatesSSE.connect();
        this.unsubscribeTaskUpdates = taskUpdatesSSE.subscribe((payload) => {
            if (payload.type !== 'task-update' && payload.type !== 'task-delete') return;
            this.scheduleLiveRefresh();
        });

        window.addEventListener('beforeunload', () => {
            this.unsubscribeTaskUpdates?.();
            taskUpdatesSSE.disconnect();
        });
    }

    scheduleLiveRefresh = () => {
        clearTimeout(this.liveRefreshTimer);
        this.liveRefreshTimer = setTimeout(() => {
            this.loadTasks();
        }, 400);
    }

    renderSummary = () => {
        const summaryNode = document.getElementById('tasksSummary');
        if (!summaryNode) return;

        const summary = this.tasks.reduce((acc, task) => {
            const status = String(task.status || '').toLowerCase();
            const isActive = ['open', 'in_progress', 'waiting'].includes(status);

            if (isActive) acc.open += 1;
            if (this.isTaskOverdue(task)) acc.overdue += 1;
            if (this.isDueToday(task)) acc.dueToday += 1;
            if (task.assigned_users?.some((assignee) => String(assignee.id) === String(this.user?.id)) && isActive) {
                acc.mine += 1;
            }
            return acc;
        }, { open: 0, overdue: 0, dueToday: 0, mine: 0 });

        const stats = [
            { label: __html('open'), value: summary.open, cls: '' },
            { label: __html('overdue'), value: summary.overdue, cls: summary.overdue > 0 ? 'stat-overdue' : '' },
            { label: __html('today'), value: summary.dueToday, cls: summary.dueToday > 0 ? 'stat-today' : '' },
            { label: __html('mine'), value: summary.mine, cls: '' }
        ];

        summaryNode.innerHTML = stats.map((stat, i) => `
            ${i > 0 ? '<span class="stat-sep" aria-hidden="true">·</span>' : ''}
            <span class="stat-item ${stat.cls}">
                <strong>${stat.value}</strong> ${stat.label}
            </span>
        `).join('');
    }

    renderActiveView = () => {
        const journalShell = document.getElementById('tasksJournalShell');
        const calendarShell = document.getElementById('tasksCalendarShell');
        if (!journalShell || !calendarShell) return;

        if (this.viewMode === 'calendar') {
            journalShell.classList.add('d-none');
            calendarShell.classList.remove('d-none');
            this.renderCalendar();
        } else {
            calendarShell.classList.add('d-none');
            journalShell.classList.remove('d-none');
            this.renderTable();
        }
    }

    renderTable = () => {
        if (!this.table) {
            this.table = new TabulatorFull("#tasksTable", {
                height: "100%",
                layout: "fitColumns",
                pagination: true,
                paginationSize: 50,
                selectableRows: 1,
                selectable: true,
                data: this.tasks,
                columns: this.columns(),
                rowSelectionChanged: (_data, rows) => {
                    this.selectedRows = rows;
                },
                rowDblClick: (_event, row) => {
                    this.openTaskModal(row.getData());
                },
                rowFormatter: (row) => {
                    const rowData = row.getData();
                    const rowEl = row.getElement();
                    rowEl.classList.toggle('task-row-overdue', this.isTaskOverdue(rowData));
                    rowEl.classList.toggle('task-row-done', ['done', 'canceled'].includes(String(rowData.status || '').toLowerCase()));
                }
            });

            this.table.on("tableBuilt", () => { });
        } else {
            this.table.setData(this.tasks);
        }
    }

    renderCalendar = () => {
        const container = document.getElementById('tasksCalendar');
        if (!container) return;

        const monthStart = this.startOfMonth(this.calendarMonthStart);
        const gridStart = this.startOfWeek(monthStart);
        const weeks = [];
        const tasksByDay = this.groupTasksByCalendarDate();

        for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
            const days = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
                const date = this.addDays(gridStart, weekIndex * 7 + dayIndex);
                const key = this.toDateKey(date);
                const dayTasks = tasksByDay.get(key) || [];
                const isCurrentMonth = date.getMonth() === monthStart.getMonth();
                const isToday = this.toDateKey(date) === this.toDateKey(new Date());

                days.push(`
                    <div class="tasks-calendar-day ${isCurrentMonth ? '' : 'is-outside'} ${isToday ? 'is-today' : ''}">
                        <div class="tasks-calendar-day-top">
                            <span class="tasks-calendar-day-number">${date.getDate()}</span>
                            ${this.canManageTasks() ? `<button class="btn btn-sm btn-link tasks-calendar-add" data-date="${attr(key)}" title="${attr(__html('Add task for this day'))}"><i class="bi bi-plus-lg"></i></button>` : ''}
                        </div>
                        <div class="tasks-calendar-day-events">
                            ${this.renderCalendarDayEvents(dayTasks)}
                        </div>
                    </div>
                `);
            }
            weeks.push(days.join(''));
        }

        const undatedTasks = this.tasks
            .filter((task) => !this.getTaskEventDate(task))
            .sort((left, right) => this.compareTasksForCalendar(left, right));

        const upcomingTasks = this.tasks
            .filter((task) => {
                const eventDate = this.getTaskEventDate(task);
                return eventDate && this.toDateKey(eventDate) >= this.toDateKey(new Date());
            })
            .sort((left, right) => this.compareTasksForCalendar(left, right))
            .slice(0, 8);

        container.innerHTML = `
            <div class="tasks-calendar-layout">
                <div class="tasks-calendar-board">
                    <div class="tasks-calendar-weekdays">
                        ${[__html('Mon'), __html('Tue'), __html('Wed'), __html('Thu'), __html('Fri'), __html('Sat'), __html('Sun')]
                            .map((label) => `<div class="tasks-calendar-weekday">${label}</div>`).join('')}
                    </div>
                    <div class="tasks-calendar-grid">
                        ${weeks.join('')}
                    </div>
                </div>
                <aside class="tasks-calendar-sidebar">
                    <div class="tasks-calendar-panel">
                        <div class="panel-title">${__html('Upcoming')}</div>
                        <div class="tasks-calendar-list">
                            ${upcomingTasks.length
                ? upcomingTasks.map((task) => this.renderCalendarSidebarItem(task)).join('')
                : `<div class="task-calendar-empty">${__html('No upcoming tasks')}</div>`}
                        </div>
                    </div>
                    <div class="tasks-calendar-panel">
                        <div class="panel-title">${__html('Undated')}</div>
                        <div class="tasks-calendar-list">
                            ${undatedTasks.length
                ? undatedTasks.slice(0, 8).map((task) => this.renderCalendarSidebarItem(task, false)).join('')
                : `<div class="task-calendar-empty">${__html('No undated tasks')}</div>`}
                        </div>
                    </div>
                </aside>
            </div>
        `;

        this.bindCalendarListeners();
    }

    bindCalendarListeners = () => {
        document.querySelectorAll('.task-calendar-item[data-task-id], .tasks-calendar-list-item[data-task-id]').forEach((node) => {
            node.addEventListener('click', () => {
                const task = this.findTaskByRecordId(node.dataset.taskId);
                if (task) this.openTaskModal(task);
            });
        });

        document.querySelectorAll('.tasks-calendar-add[data-date]').forEach((node) => {
            node.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const dateKey = node.dataset.date;
                this.openTaskModal({
                    type: 'reminder',
                    status: 'open',
                    priority: 'medium',
                    category: '',
                    due_date: dateKey ? new Date(`${dateKey}T09:00:00`).toISOString() : '',
                    assigned_users: [],
                    description: '',
                    notes: ''
                });
            });
        });
    }

    renderCalendarDayEvents = (tasks = []) => {
        if (!tasks.length) return '';

        const visibleTasks = tasks.slice(0, 3);
        const moreCount = Math.max(0, tasks.length - visibleTasks.length);

        return `
            ${visibleTasks.map((task) => this.renderCalendarEvent(task)).join('')}
            ${moreCount ? `<div class="task-calendar-more">+${moreCount} ${__html('more')}</div>` : ''}
        `;
    }

    renderCalendarEvent = (task = {}) => {
        const priority = String(task.priority || 'medium').toLowerCase();
        const status = String(task.status || 'open').toLowerCase();
        const overdue = this.isTaskOverdue(task);

        return `
            <button class="task-calendar-item ${attr(priority)} ${attr(status)} ${overdue ? 'is-overdue' : ''}" data-task-id="${attr(task._id || '')}">
                <span class="task-calendar-item-title">${attr(task.title || __html('Untitled task'))}</span>
                <span class="task-calendar-item-time">${attr(this.formatCalendarItemTime(task))}</span>
            </button>
        `;
    }

    renderCalendarSidebarItem = (task = {}, showDate = true) => {
        const secondaryLabel = showDate
            ? this.formatCalendarSidebarDate(task)
            : (task.category || __html('No due date'));

        return `
            <button class="tasks-calendar-list-item" data-task-id="${attr(task._id || '')}">
                <div class="title-row">
                    <span class="title">${attr(task.title || __html('Untitled task'))}</span>
                    <span class="priority ${attr(String(task.priority || 'medium').toLowerCase())}">${attr(this.prettyPriority(task.priority))}</span>
                </div>
                <div class="meta-row">
                    <span>${attr(secondaryLabel)}</span>
                    <span>${attr(this.prettyStatus(task.status))}</span>
                </div>
            </button>
        `;
    }

    columns = () => ([
        {
            title: __html('Status'),
            field: 'status',
            width: 130,
            formatter: (cell) => {
                const value = String(cell.getValue() || 'open').toLowerCase();
                return `<span class="status-badge ${attr(value)}"><span class="badge-dot"></span>${this.prettyStatus(value)}</span>`;
            }
        },
        {
            title: __html('Priority'),
            field: 'priority',
            width: 110,
            formatter: (cell) => {
                const value = String(cell.getValue() || 'medium').toLowerCase();
                return `<span class="priority-badge ${attr(value)}"><span class="badge-dot"></span>${this.prettyPriority(value)}</span>`;
            }
        },
        {
            title: __html('Task'),
            field: 'title',
            minWidth: 240,
            formatter: (cell) => {
                const task = cell.getRow().getData();
                return `
                    <div class="task-cell-title">
                        <div class="task-title">${attr(task.title || '')}</div>
                        <div class="task-meta">
                            ${task.category ? `<span class="category-badge">${attr(task.category)}</span>` : ''}
                            ${task.description ? `<span class="task-description-snippet">${attr(task.description)}</span>` : ''}
                        </div>
                    </div>
                `;
            }
        },
        {
            title: __html('Date'),
            field: 'due_date',
            width: 160,
            formatter: (cell) => {
                const task = cell.getRow().getData();
                const taskDate = this.getTaskDateValue(task);
                if (!taskDate) return `<span class="task-date muted">${__html('No date')}</span>`;
                const overdue = this.isTaskOverdue(task);
                return `<span class="task-date ${overdue ? 'overdue' : ''}">${attr(this.formatDateTime(taskDate))}</span>`;
            }
        },
        {
            title: __html('Assigned'),
            field: 'assigned_users',
            minWidth: 180,
            formatter: (cell) => {
                const assigned = Array.isArray(cell.getValue()) ? cell.getValue() : [];
                if (!assigned.length) return `<span class="task-empty-note">${__html('Unassigned')}</span>`;
                return `<div class="task-assignees">${assigned.map((person) => `<span class="task-assignee-pill">${attr(this.userLabel(person))}</span>`).join('')}</div>`;
            }
        },
        {
            title: __html('Category'),
            field: 'category',
            width: 150,
            formatter: (cell) => attr(cell.getValue() || '—')
        },
        {
            title: '',
            field: '_actions',
            width: 68,
            hozAlign: 'center',
            formatter: () => `<button class="btn btn-sm btn-outline-secondary task-edit-btn"><i class="bi bi-pencil"></i></button>`,
            cellClick: (_event, cell) => {
                this.openTaskModal(cell.getRow().getData());
            }
        }
    ]);

    prettyStatus = (status = '') => {
        switch (status) {
            case 'in_progress': return __html('In Progress');
            case 'waiting': return __html('Waiting');
            case 'done': return __html('Done');
            case 'canceled': return __html('Canceled');
            default: return __html('Open');
        }
    }

    prettyPriority = (priority = '') => {
        switch (priority) {
            case 'high': return __html('High');
            case 'low': return __html('Low');
            default: return __html('Medium');
        }
    }

    userLabel = (user = {}) => {
        const first = String(user?.fname || '').trim();
        const last = String(user?.lname || '').trim();
        const email = String(user?.email || '').trim();
        const name = `${first}${last ? ` ${last.charAt(0)}.` : ''}`.trim();
        return name || email || __html('User');
    }

    sortTaskUsers = (users = []) => {
        const currentUserId = String(this.user?.id || this.user?._id || '');

        return [...users].sort((left, right) => {
            const leftId = String(left?._id || left?.id || '');
            const rightId = String(right?._id || right?.id || '');

            if (leftId === currentUserId && rightId !== currentUserId) return -1;
            if (rightId === currentUserId && leftId !== currentUserId) return 1;

            const leftName = this.userLabel(left);
            const rightName = this.userLabel(right);
            return leftName.localeCompare(rightName);
        });
    }

    isTaskOverdue = (task = {}) => {
        const status = String(task.status || '').toLowerCase();
        if (!['open', 'in_progress', 'waiting'].includes(status)) return false;
        const taskDate = this.getTaskDateValue(task);
        if (!taskDate) return false;

        const due = new Date(taskDate);
        return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
    }

    isDueToday = (task = {}) => {
        const taskDate = this.getTaskDateValue(task);
        if (!taskDate) return false;
        const due = new Date(taskDate);
        if (Number.isNaN(due.getTime())) return false;

        const now = new Date();
        return due.getFullYear() === now.getFullYear()
            && due.getMonth() === now.getMonth()
            && due.getDate() === now.getDate();
    }

    formatDateTime = (value = '') => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';

        return date.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCalendarMonth = (date) => date.toLocaleString([], {
        year: 'numeric',
        month: 'long'
    });

    formatCalendarItemTime = (task = {}) => {
        const eventDate = this.getTaskEventDate(task);
        if (!eventDate) return __html('No time');

        return eventDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    formatCalendarSidebarDate = (task = {}) => {
        const eventDate = this.getTaskEventDate(task);
        if (!eventDate) return __html('No date');

        return eventDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric'
        });
    }

    toDateTimeInputValue = (value = '') => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    }

    ensureUsersLoaded = (cb) => {
        if (this.users.length > 0) {
            cb();
            return;
        }

        getUsers({ limit: 500, portal: 'access' }, (response) => {
            this.users = this.sortTaskUsers(response?.users?.users || []);
            cb();
        });
    }

    openTaskModal = (task = null) => {
        this.ensureUsersLoaded(() => {
            const currentTask = task ? {
                ...structuredClone(task),
                type: 'reminder'
            } : {
                type: 'reminder',
                status: 'open',
                priority: 'medium',
                category: '',
                due_date: '',
                assigned_users: [],
                description: '',
                notes: ''
            };

            this.modalElement = document.querySelector('.modal');
            this.modalInstance = new bootstrap.Modal(this.modalElement);
            this.modalElement.querySelector('.modal-dialog').classList.add('modal-xl');
            this.modalElement.querySelector('.modal-title').innerHTML = currentTask?._id ? __html('Edit Task') : __html('New Task');

            this.modalElement.querySelector('.modal-body').innerHTML = this.modalBody(currentTask);
            this.modalElement.querySelector('.modal-footer').innerHTML = this.modalFooter(currentTask);

            this.bindModalListeners(currentTask);
            this.modalInstance.show();
        });
    }

    modalBody = (task) => {
        return /*html*/`
            <div class="task-modal-layout">
                <div class="task-modal-main">
                    <input type="hidden" id="taskType" value="${attr(task.type || 'reminder')}">
                    <input type="text" id="taskTitle" class="task-title-input"
                        value="${attr(task.title || '')}"
                        placeholder="${__html('What needs to be done?')}">
                    <div class="task-modal-field">
                        <label class="task-modal-label" for="taskDescription">${__html('Description')}</label>
                        <textarea id="taskDescription" class="form-control form-control-sm"
                            placeholder="${__html('Optional context or follow-up notes')}">${attr(task.description || '')}</textarea>
                    </div>
                    <div class="task-modal-field">
                        <label class="task-modal-label" for="taskNotes">${__html('Notes')}</label>
                        <textarea id="taskNotes" class="form-control form-control-sm"
                            placeholder="${__html('Internal notes')}">${attr(task.notes || '')}</textarea>
                    </div>
                </div>
                <div class="task-modal-sidebar">
                    <div class="task-sidebar-row">
                        <div class="task-sidebar-label">${__html('Status')}</div>
                        <select id="taskStatus" class="form-select form-select-sm">
                            <option value="open" ${task.status === 'open' ? 'selected' : ''}>${__html('Open')}</option>
                            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>${__html('In Progress')}</option>
                            <option value="waiting" ${task.status === 'waiting' ? 'selected' : ''}>${__html('Waiting')}</option>
                            <option value="done" ${task.status === 'done' ? 'selected' : ''}>${__html('Done')}</option>
                            <option value="canceled" ${task.status === 'canceled' ? 'selected' : ''}>${__html('Canceled')}</option>
                        </select>
                    </div>
                    <div class="task-sidebar-row">
                        <div class="task-sidebar-label">${__html('Priority')}</div>
                        <input type="hidden" id="taskPriority" value="${attr(task.priority || 'medium')}">
                        <div class="task-priority-pills" id="taskPriorityPicker">
                            <button type="button" class="task-priority-pill high" data-priority="high">
                                <span class="pill-dot"></span>${__html('High')}
                            </button>
                            <button type="button" class="task-priority-pill medium" data-priority="medium">
                                <span class="pill-dot"></span>${__html('Medium')}
                            </button>
                            <button type="button" class="task-priority-pill low" data-priority="low">
                                <span class="pill-dot"></span>${__html('Low')}
                            </button>
                        </div>
                    </div>
                    <div class="task-sidebar-row">
                        <div class="task-sidebar-label">${__html('Category')}</div>
                        <input list="taskCategoryOptions" id="taskCategory" class="form-control form-control-sm"
                            value="${attr(task.category || '')}"
                            placeholder="${__html('Category…')}">
                        <datalist id="taskCategoryOptions">
                            ${this.categoryOptions.map((option) => `<option value="${attr(option)}"></option>`).join('')}
                        </datalist>
                    </div>
                    <div class="task-sidebar-row">
                        <div class="task-sidebar-label">${__html('Due date')}</div>
                        <input type="datetime-local" id="taskDueDate" class="form-control form-control-sm"
                            value="${attr(this.toDateTimeInputValue(this.getTaskDateValue(task)))}">
                    </div>
                    <div class="task-sidebar-row">
                        <div class="task-sidebar-label">${__html('Assignees')}</div>
                        <div class="task-assignee-widget">
                            <div class="task-avatar-selected" id="taskAssigneeSelected"></div>
                            <input type="search" id="taskAssigneeSearch"
                                class="form-control form-control-sm task-assignee-search"
                                placeholder="${__html('Search people…')}" autocomplete="off">
                            <div class="task-avatar-grid" id="taskAssigneeOptions"></div>
                            <div class="task-assignee-hint" id="taskAssigneeSummary"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    modalFooter = (task) => {
        const canManage = this.canManageTasks();

        return /*html*/`
            ${task?._id && canManage ? `<button type="button" class="btn btn-outline-success me-auto" id="taskMarkDoneBtn">${__html('Mark Done')}</button>` : '<div class="me-auto"></div>'}
            ${task?._id && canManage ? `<button type="button" class="btn btn-outline-danger" id="taskDeleteBtnModal">${__html('Delete')}</button>` : ''}
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
            <button type="button" class="btn btn-primary" id="taskSaveBtn" ${!canManage ? 'disabled' : ''}>${__html('Save')}</button>
        `;
    }

    bindModalListeners = (task) => {
        if (!this.canManageTasks()) {
            this.modalElement.querySelectorAll('input, select, textarea').forEach((element) => {
                element.disabled = true;
            });
        }

        this.modalAssigneeOptions = this.buildModalAssigneeOptions(task);
        this.modalSelectedAssigneeIds = new Set((task.assigned_users || []).map((user) => String(user.id || user._id || '')));
        this.modalAssigneeSearch = '';
        this.bindPriorityPicker();
        this.bindAssigneePicker();

        const saveButton = document.getElementById('taskSaveBtn');
        const deleteButton = document.getElementById('taskDeleteBtnModal');
        const doneButton = document.getElementById('taskMarkDoneBtn');

        saveButton?.addEventListener('click', () => {
            const payload = this.collectTaskPayload(task);
            if (!payload.title) {
                toast(__html('Task title is required'));
                return;
            }

            saveTask(payload, () => {
                toast(__html('Task saved'));
                this.modalInstance?.hide();
                this.loadTasks();
            });
        });

        deleteButton?.addEventListener('click', () => {
            this.deleteTaskRecord(task);
        });

        doneButton?.addEventListener('click', () => {
            document.getElementById('taskStatus').value = 'done';
            saveButton?.click();
        });
    }

    bindPriorityPicker = () => {
        const input = document.getElementById('taskPriority');
        if (!input) return;

        const sync = () => {
            document.querySelectorAll('.task-priority-pill[data-priority]').forEach((button) => {
                const isSelected = button.dataset.priority === input.value;
                button.classList.toggle('is-selected', isSelected);
                button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            });
        };

        document.querySelectorAll('.task-priority-pill[data-priority]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!this.canManageTasks()) return;
                input.value = button.dataset.priority || 'medium';
                sync();
            });
        });

        sync();
    }

    buildModalAssigneeOptions = (task = {}) => {
        const byId = new Map();

        [...(Array.isArray(this.users) ? this.users : []), ...(Array.isArray(task.assigned_users) ? task.assigned_users : [])].forEach((person) => {
            const id = String(person?._id || person?.id || '').trim();
            if (!id) return;

            const existing = byId.get(id) || {};
            byId.set(id, {
                ...existing,
                ...person,
                _id: id,
                id
            });
        });

        return this.sortTaskUsers(Array.from(byId.values()));
    }

    bindAssigneePicker = () => {
        const searchInput = document.getElementById('taskAssigneeSearch');
        searchInput?.addEventListener('input', (event) => {
            this.modalAssigneeSearch = String(event.currentTarget.value || '').trim().toLowerCase();
            this.renderAssigneePicker();
        });

        this.renderAssigneePicker();
    }

    renderAssigneePicker = () => {
        const selectedNode = document.getElementById('taskAssigneeSelected');
        const optionsNode = document.getElementById('taskAssigneeOptions');
        const summaryNode = document.getElementById('taskAssigneeSummary');
        if (!selectedNode || !optionsNode || !summaryNode) return;

        const selectedUsers = this.modalAssigneeOptions.filter((person) => this.modalSelectedAssigneeIds.has(String(person._id || person.id || '')));
        const query = this.modalAssigneeSearch;
        const availableUsers = this.modalAssigneeOptions.filter((person) => {
            const id = String(person._id || person.id || '');
            if (this.modalSelectedAssigneeIds.has(id)) return false;
            if (!query) return true;

            const haystack = `${this.userLabel(person)} ${person.email || ''}`.toLowerCase();
            return haystack.includes(query);
        });

        selectedNode.innerHTML = selectedUsers.length
            ? selectedUsers.map((person) => this.renderAssigneeChip(person, true)).join('')
            : `<div class="task-assignee-empty">${__html('No one selected yet')}</div>`;

        optionsNode.innerHTML = availableUsers.length
            ? availableUsers.map((person) => this.renderAssigneeChip(person, false)).join('')
            : `<div class="task-assignee-empty">${query ? __html('No portal users match your search') : __html('No portal users available')}</div>`;

        const count = selectedUsers.length;
        summaryNode.textContent = count
            ? __html(`Selected people: %1$s`, count)
            : __html('Choose portal users who should see this reminder.');

        this.bindAssigneeChipListeners();
    }

    avatarInitials = (person = {}) => {
        const first = String(person?.fname || '').trim();
        const last = String(person?.lname || '').trim();
        if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
        if (first) return first.slice(0, 2).toUpperCase();
        const email = String(person?.email || '').trim();
        return email ? email.charAt(0).toUpperCase() : '?';
    }

    avatarColor = (userId = '') => {
        const palette = ['#364fc7', '#2b8a3e', '#d9480f', '#6741d9', '#0c8599', '#862e9c', '#c92a2a', '#1971c2'];
        const hash = String(userId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return palette[hash % palette.length];
    }

    renderAssigneeChip = (person = {}, selected = false) => {
        const userId = String(person._id || person.id || '');
        const initials = this.avatarInitials(person);
        const color = this.avatarColor(userId);
        const name = this.userLabel(person);

        if (selected) {
            return `
                <button type="button" class="task-sel-pill"
                    data-user-id="${attr(userId)}" aria-pressed="true"
                    title="${attr(__html('Click to remove'))}">
                    <span class="task-sel-pill-avatar" style="background:${attr(color)}">${attr(initials)}</span>
                    <span class="task-sel-pill-name">${attr(name)}</span>
                    <span class="task-sel-pill-x" aria-hidden="true">×</span>
                </button>
            `;
        }

        return `
            <button type="button" class="task-avatar-circle"
                data-user-id="${attr(userId)}" aria-pressed="false"
                title="${attr(name)}"
                style="--av-color:${attr(color)}">
                ${attr(initials)}
            </button>
        `;
    }

    bindAssigneeChipListeners = () => {
        document.querySelectorAll('.task-sel-pill[data-user-id], .task-avatar-circle[data-user-id]').forEach((chip) => {
            chip.addEventListener('click', () => {
                if (!this.canManageTasks()) return;

                const userId = String(chip.dataset.userId || '');
                if (!userId) return;

                if (this.modalSelectedAssigneeIds.has(userId)) {
                    this.modalSelectedAssigneeIds.delete(userId);
                } else {
                    this.modalSelectedAssigneeIds.add(userId);
                }

                this.renderAssigneePicker();
            });
        });
    }

    collectTaskPayload = (task = {}) => {
        const selectedIds = Array.from(this.modalSelectedAssigneeIds);
        const assignedUsers = this.modalAssigneeOptions
            .filter((person) => selectedIds.includes(String(person._id || person.id || '')))
            .map((person) => ({
                id: person._id || person.id,
                fname: person.fname || '',
                lname: person.lname || '',
                email: person.email || ''
            }));

        const dueValue = document.getElementById('taskDueDate').value;

        return {
            _id: task?._id,
            id: task?.id,
            type: document.getElementById('taskType').value,
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            category: document.getElementById('taskCategory').value.trim(),
            due_date: dueValue ? new Date(dueValue).toISOString() : null,
            remind_at: null,
            assigned_users: assignedUsers,
            notes: document.getElementById('taskNotes').value.trim()
        };
    }

    deleteSelectedTask = () => {
        if (!this.canManageTasks()) {
            toast(__html('You do not have rights to remove tasks'));
            return;
        }

        const selectedRow = this.selectedRows[0];
        if (!selectedRow) {
            toast(__html('Select a task first'));
            return;
        }

        this.deleteTaskRecord(selectedRow.getData());
    }

    deleteTaskRecord = (task) => {
        if (!this.canManageTasks()) {
            toast(__html('You do not have rights to remove tasks'));
            return;
        }

        if (!task?._id) return;
        if (!confirm(__html('Remove this task?'))) return;

        deleteTask({ _id: task._id, id: task.id }, () => {
            toast(__html('Task removed'));
            this.modalInstance?.hide();
            this.loadTasks();
        });
    }

    getTaskDateValue = (task = {}) => task?.due_date || task?.remind_at || '';

    getTaskEventDate = (task = {}) => {
        const raw = this.getTaskDateValue(task);
        if (!raw) return null;

        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    groupTasksByCalendarDate = () => {
        const map = new Map();

        this.tasks
            .filter((task) => this.getTaskEventDate(task))
            .sort((left, right) => this.compareTasksForCalendar(left, right))
            .forEach((task) => {
                const date = this.getTaskEventDate(task);
                const key = this.toDateKey(date);
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(task);
            });

        return map;
    }

    compareTasksForCalendar = (left = {}, right = {}) => {
        const leftDate = this.getTaskEventDate(left);
        const rightDate = this.getTaskEventDate(right);

        if (leftDate && rightDate && leftDate.getTime() !== rightDate.getTime()) {
            return leftDate.getTime() - rightDate.getTime();
        }

        const priorityWeight = { high: 0, medium: 1, low: 2 };
        const priorityDiff = (priorityWeight[left.priority] ?? 1) - (priorityWeight[right.priority] ?? 1);
        if (priorityDiff !== 0) return priorityDiff;

        return String(left.title || '').localeCompare(String(right.title || ''));
    }

    findTaskByRecordId = (taskId = '') => this.tasks.find((task) => String(task._id || '') === String(taskId)) || null;

    startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

    startOfWeek = (date) => {
        const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const day = normalized.getDay();
        const diff = (day + 6) % 7;
        normalized.setDate(normalized.getDate() - diff);
        return normalized;
    }

    addDays = (date, days) => {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    }

    toDateKey = (date) => {
        const copy = new Date(date);
        const year = copy.getFullYear();
        const month = String(copy.getMonth() + 1).padStart(2, '0');
        const day = String(copy.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

new TasksJournal();
