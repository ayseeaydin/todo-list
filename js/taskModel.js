/**
 * taskModel.js
 * Single responsibility: provide domain-level operations for tasks.
 * - TaskModel is a lightweight state manager with pure methods (no DOM).
 * - Methods return current state; callers are responsible for rendering.
 *
 * Task object shape:
 * {
 *   id: number,
 *   text: string,
 *   completed: boolean,
 *   priority: 'low'|'medium'|'high',
 *   category: string,
 *   dueDate: string|null (ISO),
 *   tags: string[],
 *   notes: string,
 *   subtasks: [{id, text, completed}],
 *   createdAt: ISO,
 *   completedAt: ISO|null
 * }
 */

export class TaskModel {
  constructor(initialTasks = []) {
    // Single source of truth for tasks in memory
    this.tasks = Array.isArray(initialTasks) ? initialTasks : [];
    // deletedTask for undo functionality
    this.deletedTask = null;
  }

  /* --- Basic CRUD --- */
  addTask({ text, priority = 'medium', category = 'personal', dueDate = null, tags = [] }) {
    const task = {
      id: Date.now(),
      text: String(text).trim(),
      completed: false,
      priority,
      category,
      dueDate: dueDate || null,
      tags: tags.map(t => String(t).trim()).filter(Boolean),
      notes: '',
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    this.tasks.unshift(task);
    return task;
  }

  updateTask(id, patch = {}) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const updated = { ...this.tasks[idx], ...patch };
    this.tasks[idx] = updated;
    return updated;
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    return task;
  }

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.deletedTask = { task: this.tasks[idx], index: idx };
    this.tasks.splice(idx, 1);
    return this.deletedTask;
  }

  undoDelete() {
    if (!this.deletedTask) return null;
    const { task, index } = this.deletedTask;
    this.tasks.splice(index, 0, task);
    this.deletedTask = null;
    return task;
  }

  clearCompleted() {
    this.tasks = this.tasks.filter(t => !t.completed);
  }

  /* --- Subtasks --- */
  addSubtask(taskId, text) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !text.trim()) return null;
    const subtask = { id: Date.now(), text: String(text).trim(), completed: false };
    task.subtasks.push(subtask);
    return subtask;
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    const st = task.subtasks.find(s => s.id === subtaskId);
    if (!st) return null;
    st.completed = !st.completed;
    return st;
  }

  updateNotes(taskId, notes) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    task.notes = String(notes);
    return task;
  }

  /* --- Import/Export --- */
  exportTasks() {
    return JSON.stringify(this.tasks, null, 2);
  }

  importTasks(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) throw new Error('Invalid format: expected array');
      // Basic hygiene: ensure each item has id and text
      this.tasks = parsed.map(p => ({
        id: Number(p.id) || Date.now() + Math.floor(Math.random() * 1000),
        text: String(p.text || ''),
        completed: !!p.completed,
        priority: p.priority || 'medium',
        category: p.category || 'personal',
        dueDate: p.dueDate || null,
        tags: Array.isArray(p.tags) ? p.tags : [],
        notes: p.notes || '',
        subtasks: Array.isArray(p.subtasks) ? p.subtasks : [],
        createdAt: p.createdAt || new Date().toISOString(),
        completedAt: p.completedAt || null
      }));
      return true;
    } catch (err) {
      console.error('TaskModel.importTasks error', err);
      return false;
    }
  }

  /* --- Utility getters --- */
  getTasks() { return this.tasks.slice(); } // return shallow copy

  getStatistics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const active = total - completed;

    return {
      total,
      completed,
      active,
      todayCompleted: this.tasks.filter(t => t.completed && new Date(t.completedAt) >= todayStart).length,
      weekCompleted: this.tasks.filter(t => t.completed && new Date(t.completedAt) >= weekStart).length,
      monthCompleted: this.tasks.filter(t => t.completed && new Date(t.completedAt) >= monthStart).length
    };
  }
}
