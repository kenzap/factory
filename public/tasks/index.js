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
                                <div class="summary-grid px-2 pt-2" id="tasksSummary"></div>
                                <div class="table-shell px-2 pb-2" id="tasksJournalShell">
                                    <div id="tasksTable"></div>
                                </div>
                                <div class="calendar-shell px-2 pb-2 d-none" id="tasksCalendarShell">
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
        getUsers({ limit: 500 }, (response) => {
            this.users = response?.users?.users || [];
        });
    }

    renderHeader = () => {
        document.querySelector('filters-header').innerHTML = /*html*/`
            <div class="toolbar">
                <div class="toolbar-top">
                    <div class="toolbar-page-title">
                        <i class="bi bi-check2-square"></i>
                        ${__html('Tasks')}
                    </div>
                    <div class="toolbar-actions">
                        <div class="btn-group" role="group">
                            <button class="btn ${this.viewMode === 'journal' ? 'btn-dark' : 'btn-outline-dark'}" id="viewJournalBtn">
                                <i class="bi bi-table"></i> ${__html('Journal')}
                            </button>
                            <button class="btn ${this.viewMode === 'calendar' ? 'btn-dark' : 'btn-outline-dark'}" id="viewCalendarBtn">
                                <i class="bi bi-calendar3"></i> ${__html('Calendar')}
                            </button>
                        </div>
                        <div class="btn-group ${this.viewMode === 'calendar' ? '' : 'd-none'}" id="taskCalendarNav">
                            <button class="btn btn-outline-secondary" id="taskCalendarPrevBtn"><i class="bi bi-chevron-left"></i></button>
                            <button class="btn btn-outline-secondary calendar-month-label" id="taskCalendarTodayBtn">${attr(this.formatCalendarMonth(this.calendarMonthStart))}</button>
                            <button class="btn btn-outline-secondary" id="taskCalendarNextBtn"><i class="bi bi-chevron-right"></i></button>
                        </div>
                        <button class="btn btn-primary" id="newTaskBtn" ${this.canManageTasks() ? '' : 'disabled'}>
                            <i class="bi bi-plus-lg"></i> ${__html('New Task')}
                        </button>
                        <button class="btn btn-outline-secondary" id="refreshTasksBtn" title="${attr(__html('Refresh'))}">
                            <i class="bi bi-arrow-repeat"></i>
                        </button>
                        <button class="btn btn-outline-danger" id="deleteTaskBtn" title="${attr(__html('Delete selected'))}" ${this.canManageTasks() ? '' : 'disabled'}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="toolbar-filters">
                    <span class="filter-label"><i class="bi bi-funnel me-1"></i>${__html('Filter')}</span>
                    <input type="text" class="form-control" id="taskSearch" placeholder="${__html('Search…')}" value="${attr(this.filters.search)}" style="width:200px">
                    <select class="form-select" id="taskStatusFilter" style="width:140px">
                        <option value="active">${__html('Active')}</option>
                        <option value="">${__html('All statuses')}</option>
                        <option value="open">${__html('Open')}</option>
                        <option value="in_progress">${__html('In Progress')}</option>
                        <option value="waiting">${__html('Waiting')}</option>
                        <option value="done">${__html('Done')}</option>
                        <option value="canceled">${__html('Canceled')}</option>
                    </select>
                    <select class="form-select" id="taskPriorityFilter" style="width:140px">
                        <option value="">${__html('All priorities')}</option>
                        <option value="high">${__html('High')}</option>
                        <option value="medium">${__html('Medium')}</option>
                        <option value="low">${__html('Low')}</option>
                    </select>
                    <select class="form-select" id="taskTypeFilter" style="width:130px">
                        <option value="">${__html('All types')}</option>
                        <option value="task">${__html('Task')}</option>
                        <option value="reminder">${__html('Reminder')}</option>
                    </select>
                    <div class="form-check mb-0 ms-1">
                        <input class="form-check-input" type="checkbox" id="taskMineOnly" ${this.filters.mine ? 'checked' : ''}>
                        <label class="form-check-label" for="taskMineOnly">${__html('Mine only')}</label>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('taskStatusFilter').value = this.filters.status;
        document.getElementById('taskPriorityFilter').value = this.filters.priority;
        document.getElementById('taskTypeFilter').value = this.filters.type;
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

        document.getElementById('taskTypeFilter').addEventListener('change', (event) => {
            this.filters.type = event.currentTarget.value;
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

        const cards = [
            { label: __html('Open'), value: summary.open, cls: 'card-open', icon: 'bi-list-task', urgent: false },
            { label: __html('Overdue'), value: summary.overdue, cls: 'card-overdue', icon: 'bi-exclamation-triangle', urgent: summary.overdue > 0 },
            { label: __html('Due Today'), value: summary.dueToday, cls: 'card-today', icon: 'bi-calendar-check', urgent: summary.dueToday > 0 },
            { label: __html('Assigned To Me'), value: summary.mine, cls: 'card-mine', icon: 'bi-person-check', urgent: false }
        ];

        summaryNode.innerHTML = cards.map((card) => `
            <div class="summary-card ${card.cls} ${card.urgent ? 'has-items' : ''}">
                <div class="summary-card-icon"><i class="bi ${card.icon}"></i></div>
                <div class="summary-card-body">
                    <div class="label">${card.label}</div>
                    <div class="value">${card.value}</div>
                </div>
            </div>
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
                    type: 'task',
                    status: 'open',
                    priority: 'medium',
                    category: '',
                    due_date: dateKey ? new Date(`${dateKey}T09:00:00`).toISOString() : '',
                    remind_at: '',
                    assigned_users: [],
                    linked_ref_type: '',
                    linked_ref_id: '',
                    linked_ref_label: '',
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
        return `
            <button class="tasks-calendar-list-item" data-task-id="${attr(task._id || '')}">
                <div class="title-row">
                    <span class="title">${attr(task.title || __html('Untitled task'))}</span>
                    <span class="priority ${attr(String(task.priority || 'medium').toLowerCase())}">${attr(this.prettyPriority(task.priority))}</span>
                </div>
                <div class="meta-row">
                    ${showDate ? `<span>${attr(this.formatCalendarSidebarDate(task))}</span>` : `<span>${attr(this.prettyType(task.type))}</span>`}
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
                            <span class="type-badge">${attr(this.prettyType(task.type))}</span>
                            ${task.description ? ` ${attr(task.description)}` : ''}
                        </div>
                    </div>
                `;
            }
        },
        {
            title: __html('Due'),
            field: 'due_date',
            width: 160,
            formatter: (cell) => {
                const task = cell.getRow().getData();
                if (!task.due_date) return `<span class="task-date muted">${__html('No date')}</span>`;
                const overdue = this.isTaskOverdue(task);
                return `<span class="task-date ${overdue ? 'overdue' : ''}">${attr(this.formatDateTime(task.due_date))}</span>`;
            }
        },
        {
            title: __html('Reminder'),
            field: 'remind_at',
            width: 160,
            formatter: (cell) => {
                const value = cell.getValue();
                if (!value) return `<span class="task-date muted">—</span>`;
                return `<span class="task-date">${attr(this.formatDateTime(value))}</span>`;
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
            title: __html('Linked'),
            field: 'linked_ref_label',
            minWidth: 180,
            formatter: (cell) => {
                const task = cell.getRow().getData();
                const label = task.linked_ref_label || '';
                if (!label) return `<span class="task-empty-note">—</span>`;
                const type = task.linked_ref_type ? `${this.prettyLinkType(task.linked_ref_type)}: ` : '';
                return `<span class="task-link-label">${attr(type + label)}</span>`;
            }
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

    prettyType = (type = '') => type === 'reminder' ? __html('Reminder') : __html('Task');

    prettyLinkType = (type = '') => {
        switch (type) {
            case 'order': return __html('Order');
            case 'client': return __html('Client');
            case 'supplier': return __html('Supplier');
            case 'product': return __html('Product');
            case 'stock_item': return __html('Stock');
            case 'vehicle': return __html('Vehicle');
            case 'employee': return __html('Employee');
            case 'supply_record': return __html('Supply');
            default: return __html('Linked');
        }
    }

    userLabel = (user = {}) => {
        const first = String(user?.fname || '').trim();
        const last = String(user?.lname || '').trim();
        const email = String(user?.email || '').trim();
        const name = `${first}${last ? ` ${last.charAt(0)}.` : ''}`.trim();
        return name || email || __html('User');
    }

    isTaskOverdue = (task = {}) => {
        const status = String(task.status || '').toLowerCase();
        if (!['open', 'in_progress', 'waiting'].includes(status)) return false;
        if (!task.due_date) return false;

        const due = new Date(task.due_date);
        return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
    }

    isDueToday = (task = {}) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
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

        getUsers({ limit: 500 }, (response) => {
            this.users = response?.users?.users || [];
            cb();
        });
    }

    openTaskModal = (task = null) => {
        this.ensureUsersLoaded(() => {
            const currentTask = task ? structuredClone(task) : {
                type: 'task',
                status: 'open',
                priority: 'medium',
                category: '',
                due_date: '',
                remind_at: '',
                assigned_users: [],
                linked_ref_type: '',
                linked_ref_id: '',
                linked_ref_label: '',
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
        const selectedAssigneeIds = new Set((task.assigned_users || []).map((user) => String(user.id)));

        return /*html*/`
            <div class="task-form-grid">
                <div class="full">
                    <label for="taskTitle">${__html('Title')}</label>
                    <input type="text" id="taskTitle" class="form-control" value="${attr(task.title || '')}" placeholder="${__html('What needs to be done?')}">
                </div>
                <div class="full">
                    <label for="taskDescription">${__html('Description')}</label>
                    <textarea id="taskDescription" class="form-control" placeholder="${__html('Optional context or follow-up notes')}">${attr(task.description || '')}</textarea>
                </div>
                <div>
                    <label for="taskType">${__html('Type')}</label>
                    <select id="taskType" class="form-select">
                        <option value="task" ${task.type === 'task' ? 'selected' : ''}>${__html('Task')}</option>
                        <option value="reminder" ${task.type === 'reminder' ? 'selected' : ''}>${__html('Reminder')}</option>
                    </select>
                </div>
                <div>
                    <label for="taskStatus">${__html('Status')}</label>
                    <select id="taskStatus" class="form-select">
                        <option value="open" ${task.status === 'open' ? 'selected' : ''}>${__html('Open')}</option>
                        <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>${__html('In Progress')}</option>
                        <option value="waiting" ${task.status === 'waiting' ? 'selected' : ''}>${__html('Waiting')}</option>
                        <option value="done" ${task.status === 'done' ? 'selected' : ''}>${__html('Done')}</option>
                        <option value="canceled" ${task.status === 'canceled' ? 'selected' : ''}>${__html('Canceled')}</option>
                    </select>
                </div>
                <div>
                    <label for="taskPriority">${__html('Priority')}</label>
                    <select id="taskPriority" class="form-select">
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${__html('High')}</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${__html('Medium')}</option>
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${__html('Low')}</option>
                    </select>
                </div>
                <div>
                    <label for="taskCategory">${__html('Category')}</label>
                    <input list="taskCategoryOptions" id="taskCategory" class="form-control" value="${attr(task.category || '')}" placeholder="${__html('Choose or type category')}">
                    <datalist id="taskCategoryOptions">
                        ${this.categoryOptions.map((option) => `<option value="${attr(option)}"></option>`).join('')}
                    </datalist>
                </div>
                <div>
                    <label for="taskDueDate">${__html('Due date')}</label>
                    <input type="datetime-local" id="taskDueDate" class="form-control" value="${attr(this.toDateTimeInputValue(task.due_date))}">
                </div>
                <div>
                    <label for="taskReminderDate">${__html('Reminder')}</label>
                    <input type="datetime-local" id="taskReminderDate" class="form-control" value="${attr(this.toDateTimeInputValue(task.remind_at))}">
                </div>
                <div>
                    <label for="taskLinkedType">${__html('Linked record type')}</label>
                    <select id="taskLinkedType" class="form-select">
                        <option value="">${__html('None')}</option>
                        <option value="order" ${task.linked_ref_type === 'order' ? 'selected' : ''}>${__html('Order')}</option>
                        <option value="client" ${task.linked_ref_type === 'client' ? 'selected' : ''}>${__html('Client')}</option>
                        <option value="supplier" ${task.linked_ref_type === 'supplier' ? 'selected' : ''}>${__html('Supplier')}</option>
                        <option value="product" ${task.linked_ref_type === 'product' ? 'selected' : ''}>${__html('Product')}</option>
                        <option value="stock_item" ${task.linked_ref_type === 'stock_item' ? 'selected' : ''}>${__html('Stock')}</option>
                        <option value="vehicle" ${task.linked_ref_type === 'vehicle' ? 'selected' : ''}>${__html('Vehicle')}</option>
                        <option value="employee" ${task.linked_ref_type === 'employee' ? 'selected' : ''}>${__html('Employee')}</option>
                        <option value="supply_record" ${task.linked_ref_type === 'supply_record' ? 'selected' : ''}>${__html('Supply')}</option>
                        <option value="other" ${task.linked_ref_type === 'other' ? 'selected' : ''}>${__html('Other')}</option>
                    </select>
                </div>
                <div>
                    <label for="taskLinkedId">${__html('Linked record ID')}</label>
                    <input type="text" id="taskLinkedId" class="form-control" value="${attr(task.linked_ref_id || '')}" placeholder="${__html('Optional internal record id')}">
                </div>
                <div class="full">
                    <label for="taskLinkedLabel">${__html('Linked record label')}</label>
                    <input type="text" id="taskLinkedLabel" class="form-control" value="${attr(task.linked_ref_label || '')}" placeholder="${__html('Example: Order #43006 or Truck VW Crafter')}">
                </div>
                <div class="full">
                    <label>${__html('Assign users')}</label>
                    <div class="task-users-grid">
                        ${this.users.map((person) => `
                            <label class="task-user-option">
                                <div>
                                    <div class="fw-semibold">${attr(this.userLabel(person))}</div>
                                    <div class="meta">${attr(person.email || '')}</div>
                                </div>
                                <input class="form-check-input task-assignee-check" type="checkbox" value="${attr(person._id)}" ${selectedAssigneeIds.has(String(person._id)) ? 'checked' : ''}>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="full">
                    <label for="taskNotes">${__html('Notes')}</label>
                    <textarea id="taskNotes" class="form-control" placeholder="${__html('Internal notes')}">${attr(task.notes || '')}</textarea>
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

    collectTaskPayload = (task = {}) => {
        const selectedIds = Array.from(document.querySelectorAll('.task-assignee-check:checked'))
            .map((node) => String(node.value));

        const assignedUsers = this.users
            .filter((person) => selectedIds.includes(String(person._id)))
            .map((person) => ({
                id: person._id,
                fname: person.fname || '',
                lname: person.lname || '',
                email: person.email || ''
            }));

        const dueValue = document.getElementById('taskDueDate').value;
        const reminderValue = document.getElementById('taskReminderDate').value;

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
            remind_at: reminderValue ? new Date(reminderValue).toISOString() : null,
            assigned_users: assignedUsers,
            linked_ref_type: document.getElementById('taskLinkedType').value,
            linked_ref_id: document.getElementById('taskLinkedId').value.trim(),
            linked_ref_label: document.getElementById('taskLinkedLabel').value.trim(),
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

    getTaskEventDate = (task = {}) => {
        const raw = task?.due_date || task?.remind_at || '';
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
