/**
 * main.js
 * Application composition root:
 * - wires TaskModel <-> Storage <-> UI <-> Notifier
 * - sets event listeners and orchestrates flows
 *
 * This file keeps orchestration only and delegates responsibilities.
 */

import { Storage } from './storage.js';
import { TaskModel } from './taskModel.js';
import { Notifier } from './notifications.js';
import { UI } from './ui.js';
import { formatDueDate, tagsFromString } from './utils.js';

/* ---- Initialize model from storage ---- */
const initial = Storage.loadTasks();
const model = new TaskModel(initial);

/* ---- Wire up periodic due date check (simple) ---- */
function checkDueDatesAndNotify() {
  // Find tasks due within the next hour
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  model.getTasks().forEach(task => {
    if (!task.dueDate || task.completed) return;
    const due = new Date(task.dueDate);
    if (due > now && due <= soon) {
      // request permission once and then notify
      Notifier.requestPermission().then(granted => {
        if (granted) Notifier.notifySoonDue(task);
      });
    }
  });
}

/* ---- Rendering helper to apply current filters / search / sort --- */
/* Keep UI layer simple: filter/sort logic done here before rendering. */
const state = {
  currentFilter: 'all',
  currentCategory: 'all',
  currentSort: 'date-desc',
  searchQuery: ''
};

function applyFiltersAndSort(tasks) {
  let out = [...tasks];

  // status filter
  if (state.currentFilter === 'active') out = out.filter(t => !t.completed);
  else if (state.currentFilter === 'completed') out = out.filter(t => t.completed);

  // category
  if (state.currentCategory !== 'all') out = out.filter(t => t.category === state.currentCategory);

  // search
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    out = out.filter(t =>
      t.text.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // sort
  switch(state.currentSort) {
    case 'date-desc': out.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'date-asc': out.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'priority': {
      const order = { high: 3, medium: 2, low:1 };
      out.sort((a,b)=> order[b.priority] - order[a.priority]); break;
    }
    case 'alphabetical': out.sort((a,b) => a.text.localeCompare(b.text)); break;
    case 'duedate': out.sort((a,b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }); break;
    case 'category': out.sort((a,b) => a.category.localeCompare(b.category)); break;
    default: break;
  }

  return out;
}

/* ---- Render full view and persist ---- */
function refreshUI() {
  const tasks = applyFiltersAndSort(model.getTasks());
  UI.renderTasks(tasks);
  UI.renderStats(model.getStatistics());
  Storage.saveTasks(model.getTasks()); // debounce inside storage
}

/* ---- Event wiring ---- */
function bindEvents() {
  // Add task
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    const text = document.getElementById('taskInput').value.trim();
    if (!text) { document.getElementById('taskInput').focus(); return; }
    const priority = document.getElementById('prioritySelect').value;
    const category = document.getElementById('categorySelect').value;
    const dueDate = document.getElementById('dueDateInput').value || null;
    const tags = tagsFromString(document.getElementById('tagInput').value || '');
    model.addTask({ text, priority, category, dueDate, tags });
    // clear inputs
    document.getElementById('taskInput').value = '';
    document.getElementById('dueDateInput').value = '';
    document.getElementById('tagInput').value = '';
    document.getElementById('prioritySelect').value = 'medium';
    document.getElementById('categorySelect').value = 'personal';
    // UI response
    refreshUI();
    // confetti on add is intentionally not triggered; confetti reserved for completion.
  });

  // Enter key in task input adds
  document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('addTaskBtn').click();
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    refreshUI();
  });

  // Filter tabs
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentFilter = e.currentTarget.dataset.filter;
      refreshUI();
    });
  });

  // Category chips
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.currentCategory = e.currentTarget.dataset.category;
      refreshUI();
    });
  });

  // Sort select
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    refreshUI();
  });

  // Clear completed
  document.getElementById('clearCompletedBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all completed tasks?')) {
      model.clearCompleted();
      refreshUI();
    }
  });

  // Export / Import
  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = model.exportTasks();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (model.importTasks(ev.target.result)) {
        refreshUI();
        alert('Tasks imported successfully');
      } else alert('Failed to import tasks: invalid format');
    };
    reader.readAsText(file);
  });

  // Stats modal
  document.getElementById('floatingStatsBtn').addEventListener('click', () => {
    document.getElementById('statsModal').classList.add('show');
  });
  document.getElementById('closeStatsModal').addEventListener('click', () => {
    document.getElementById('statsModal').classList.remove('show');
  });

  // Undo
  document.getElementById('undoBtn').addEventListener('click', () => {
    model.undoDelete();
    UI.hideUndo();
    refreshUI();
  });

  // Keyboard shortcuts: Ctrl/Cmd+Enter => add; Ctrl/Cmd+Z => undo
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('addTaskBtn').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (model.deletedTask) {
        e.preventDefault();
        model.undoDelete();
        UI.hideUndo();
        refreshUI();
      }
    }
  });

  // Delegate clicks inside todoList for actions (single listener)
  const todoList = document.getElementById('todoList');
  todoList.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id || target.dataset.taskId);
    switch (action) {
      case 'toggle':
        model.toggleTask(id);
        // confetti on completion
        const task = model.getTasks().find(t => t.id === id);
        if (task && task.completed) {
          Notifier.confettiEffect(UI.getConfettiCanvas());
        }
        refreshUI();
        break;
      case 'delete':
        model.deleteTask(id);
        UI.showUndo('Task deleted');
        // hide undo after 5s
        setTimeout(() => UI.hideUndo(), 5000);
        refreshUI();
        break;
      case 'edit':
        // For inline edit: convert text to input and handle save
        inlineEdit(id);
        break;
      case 'expand':
        UI.toggleDetails(id, target);
        break;
      case 'toggle-subtask':
        const stId = Number(target.dataset.subtaskId);
        const tId = Number(target.dataset.taskId);
        model.toggleSubtask(tId, stId);
        refreshUI();
        break;
      default: break;
    }
  });

  // Add subtask via delegated listener for add-subtask button
  todoList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-subtask');
    if (!btn) return;
    const tId = Number(btn.dataset.taskId);
    const input = document.querySelector(`.subtask-input[data-task-id="${tId}"]`);
    if (input && input.value.trim()) {
      model.addSubtask(tId, input.value);
      input.value = '';
      refreshUI();
    }
  });

  // Blur-based notes update (delegated)
  todoList.addEventListener('blur', (e) => {
    if (e.target && e.target.classList.contains('notes-textarea')) {
      const tid = Number(e.target.dataset.taskId);
      model.updateNotes(tid, e.target.value);
      // persist immediately
      Storage.saveTasks(model.getTasks());
    }
  }, true); // use capture so blur fires properly

  /* Drag & drop simple reorder:
     - We update DOM order and persist a new order in model.tasks
     - This is a best-effort lightweight implementation
  */
  let dragged = null;
  todoList.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    dragged = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  todoList.addEventListener('dragend', (e) => {
    if (dragged) dragged.classList.remove('dragging');
    dragged = null;
    // rebuild order
    reorderModelFromDOM();
  });
  todoList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const after = getDragAfterElement(todoList, e.clientY);
    const dragging = document.querySelector('.dragging');
    if (!dragging) return;
    if (after == null) todoList.appendChild(dragging);
    else todoList.insertBefore(dragging, after);
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function reorderModelFromDOM() {
    const els = [...todoList.querySelectorAll('.todo-item')];
    const newOrder = [];
    els.forEach(el => {
      const id = Number(el.dataset.taskId);
      const t = model.getTasks().find(x => x.id === id);
      if (t) newOrder.push(t);
    });
    if (newOrder.length) model.tasks = newOrder;
    Storage.saveTasks(model.getTasks());
  }

  // inline edit helper
  function inlineEdit(id) {
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (!el) return;
    const textSpan = el.querySelector('.todo-text');
    if (!textSpan) return;
    const prev = textSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = prev;
    textSpan.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newVal = input.value.trim();
      if (newVal && newVal !== prev) model.updateTask(id, { text: newVal });
      refreshUI();
    };

    input.addEventListener('blur', save, { once: true });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  }
}

/* ---- Initial boot ---- */
function boot() {
  // initial render
  refreshUI();

  // wire events
  bindEvents();

  // due-date check every minute
  checkDueDatesAndNotify();
  setInterval(checkDueDatesAndNotify, 60000);
}

/* start application */
boot();
