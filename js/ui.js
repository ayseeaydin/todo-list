/**
 * ui.js
 * Single responsibility: DOM rendering & UI helpers.
 * - Uses pure DOM APIs (no templating libs) to build accessible, minimal markup.
 * - Exposes UI.renderTasks(tasks, options) and small helpers for notifications and toggles.
 *
 * NOTE: UI does not modify business state. It only reads it and emits events through callbacks provided by main.js.
 */

import { escapeHtml, formatDueDate, tagsFromString } from './utils.js';

export const UI = {
  // root selectors cached for reuse
  selectors: {
    todoList: '#todoList',
    totalTasks: '#totalTasks',
    activeTasks: '#activeTasks',
    completedTasks: '#completedTasks',
    completionRate: '#completionRate',
    progressBar: '#progressBar',
    progressText: '#progressText',
    todayCompleted: '#todayCompleted',
    weekCompleted: '#weekCompleted',
    monthCompleted: '#monthCompleted',
    undoNotification: '#undoNotification',
    undoMessage: '#undoMessage',
    undoBtn: '#undoBtn',
    confettiCanvas: '#confettiCanvas',
    statsModal: '#statsModal'
  },

  /**
   * Render the entire list from a tasks array.
   * - tasks: array of task objects
   * - options: { filter, search } not used for rendering specifics here (already filtered)
   */
  renderTasks(tasks) {
    const listEl = document.querySelector(this.selectors.todoList);
    if (!listEl) return;
    if (!tasks || tasks.length === 0) {
      listEl.innerHTML = this.emptyStateHTML();
      return;
    }

    // Build document fragment for performance
    const frag = document.createDocumentFragment();
    tasks.forEach(task => {
      frag.appendChild(this._createTaskItem(task));
    });

    listEl.innerHTML = ''; // clear
    listEl.appendChild(frag);
  },

  /**
   * Create a single li element for a task.
   * This keeps markup creation centralized and consistent.
   */
  _createTaskItem(task) {
    const liWrap = document.createElement('div');
    liWrap.className = `todo-item ${task.completed ? 'completed' : ''} ${this._isOverdue(task) ? 'overdue' : ''}`;
    liWrap.setAttribute('data-task-id', String(task.id));
    liWrap.setAttribute('draggable','true');

    // checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = !!task.completed;
    checkbox.setAttribute('data-action','toggle');
    checkbox.setAttribute('data-id',String(task.id));

    // content container
    const content = document.createElement('div');
    content.className = 'todo-content';

    // header row
    const header = document.createElement('div');
    header.className = 'todo-header';

    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.setAttribute('data-action','edit');
    textSpan.setAttribute('data-id',String(task.id));
    textSpan.innerHTML = escapeHtml(task.text);

    const badges = document.createElement('div');
    badges.className = 'todo-badges';

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `priority-badge priority-${task.priority}`;
    priorityBadge.textContent = task.priority.toUpperCase();

    const categoryBadge = document.createElement('span');
    categoryBadge.className = `category-badge category-${task.category}`;
    categoryBadge.innerHTML = `<i class="bi bi-tag"></i> ${escapeHtml(task.category)}`;

    badges.append(priorityBadge, categoryBadge);
    header.append(textSpan, badges);

    // due date area
    let dueDateEl = document.createElement('div');
    dueDateEl.className = 'todo-due-date' + (this._isOverdue(task) ? ' overdue' : '');
    if (task.dueDate) {
      dueDateEl.innerHTML = `<i class="bi bi-calendar-event"></i> ${formatDueDate(task.dueDate)}`;
    } else {
      dueDateEl = null;
    }

    // tags
    const tagsEl = document.createElement('div');
    tagsEl.className = 'todo-tags';
    if (Array.isArray(task.tags) && task.tags.length) {
      task.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag-chip';
        tagSpan.textContent = `#${tag}`;
        tagsEl.appendChild(tagSpan);
      });
    } else {
      tagsEl.style.display = 'none';
    }

    // subtasks progress
    let subtasksContainer = document.createElement('div');
    subtasksContainer.className = 'subtasks-container';
    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter(s => s.completed).length;
      const progress = Math.round((completed / task.subtasks.length) * 100);
      subtasksContainer.innerHTML = `
        <div class="subtasks-progress">
          <div class="subtasks-progress-bar" style="width:${progress}%"></div>
        </div>
        <small>${completed}/${task.subtasks.length} subtasks completed</small>
      `;
    } else {
      subtasksContainer.style.display = 'none';
    }

    // actions
    const actions = document.createElement('div');
    actions.className = 'todo-actions';
    actions.innerHTML = `
      <button class="btn-action-small" data-action="expand" data-id="${task.id}" title="Expand"><i class="bi bi-chevron-down"></i></button>
      <button class="btn-action-small" data-action="edit" data-id="${task.id}" title="Edit"><i class="bi bi-pencil"></i></button>
      <button class="btn-delete" data-action="delete" data-id="${task.id}" title="Delete"><i class="bi bi-trash"></i></button>
    `;

    // details area (hidden by default)
    const details = document.createElement('div');
    details.id = `details-${task.id}`;
    details.className = 'todo-details';
    details.setAttribute('aria-hidden','true');

    // subtasks list HTML inside details
    const subtasksHtml = document.createElement('div');
    subtasksHtml.className = 'subtasks-section';
    subtasksHtml.innerHTML = `<h5>Subtasks</h5>`;
    const subList = document.createElement('div');
    subList.className = 'subtasks-list';
    if (task.subtasks && task.subtasks.length) {
      task.subtasks.forEach(st => {
        const row = document.createElement('div');
        row.className = `subtask-item ${st.completed ? 'completed' : ''}`;
        row.innerHTML = `
          <input type="checkbox" ${st.completed ? 'checked' : ''} data-action="toggle-subtask" data-task-id="${task.id}" data-subtask-id="${st.id}">
          <span>${escapeHtml(st.text)}</span>
        `;
        subList.appendChild(row);
      });
    }
    subtasksHtml.appendChild(subList);
    subtasksHtml.innerHTML += `
      <div class="add-subtask">
        <input type="text" class="subtask-input" placeholder="Add a subtask..." data-task-id="${task.id}">
        <button class="btn-add-subtask" data-task-id="${task.id}"><i class="bi bi-plus"></i></button>
      </div>
    `;

    const notesHtml = document.createElement('div');
    notesHtml.className = 'notes-section';
    notesHtml.innerHTML = `
      <h5>Notes</h5>
      <textarea class="notes-textarea" placeholder="Add notes..." data-task-id="${task.id}">${escapeHtml(task.notes || '')}</textarea>
    `;

    details.append(subtasksHtml, notesHtml);

    // assemble content
    if (dueDateEl) content.appendChild(header), content.appendChild(dueDateEl);
    else content.appendChild(header);
    content.appendChild(tagsEl);
    content.appendChild(subtasksContainer);
    content.appendChild(actions);

    // append parts to wrapper
    liWrap.appendChild(checkbox);
    liWrap.appendChild(content);
    liWrap.appendChild(details);

    return liWrap;
  },

  /* Update statistics UI */
  renderStats(stats) {
    document.querySelector(this.selectors.totalTasks).textContent = String(stats.total);
    document.querySelector(this.selectors.activeTasks).textContent = String(stats.active);
    document.querySelector(this.selectors.completedTasks).textContent = String(stats.completed);

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    document.querySelector(this.selectors.completionRate).textContent = `${completionRate}%`;
    const bar = document.querySelector(this.selectors.progressBar);
    const text = document.querySelector(this.selectors.progressText);
    if (bar) bar.style.width = `${completionRate}%`;
    if (text) text.textContent = `${completionRate}%`;

    document.querySelector(this.selectors.todayCompleted).textContent = String(stats.todayCompleted);
    document.querySelector(this.selectors.weekCompleted).textContent = String(stats.weekCompleted);
    document.querySelector(this.selectors.monthCompleted).textContent = String(stats.monthCompleted);
  },

  /* Show undo notification briefly */
  showUndo(message = 'Task deleted') {
    const el = document.querySelector(this.selectors.undoNotification);
    const msg = document.querySelector(this.selectors.undoMessage);
    if (!el || !msg) return;
    msg.textContent = message;
    el.classList.add('show');
  },
  hideUndo() {
    const el = document.querySelector(this.selectors.undoNotification);
    if (!el) return;
    el.classList.remove('show');
  },

  /* Toggle task details panel (show/hide) */
  toggleDetails(taskId, buttonEl) {
    const details = document.getElementById(`details-${taskId}`);
    if (!details) return;
    const icon = buttonEl.querySelector('i');
    if (details.style.display === 'block') {
      details.style.display = 'none';
      details.setAttribute('aria-hidden','true');
      if (icon) icon.classList.replace('bi-chevron-up','bi-chevron-down');
    } else {
      details.style.display = 'block';
      details.setAttribute('aria-hidden','false');
      if (icon) icon.classList.replace('bi-chevron-down','bi-chevron-up');
    }
  },

  /* Private helper: overdue check */
  _isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const due = new Date(task.dueDate);
    return due < new Date();
  },

  /* Empty state HTML */
  emptyStateHTML() {
    return `
      <li class="empty-state" role="status">
        <i class="bi bi-inbox"></i>
        <h4>No tasks found</h4>
        <p>Add a task to get started!</p>
      </li>
    `;
  },

  /* Expose canvas for confetti */
  getConfettiCanvas() {
    return document.querySelector(this.selectors.confettiCanvas);
  }
};
