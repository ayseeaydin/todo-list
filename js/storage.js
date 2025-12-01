/**
 * storage.js
 * Single responsibility: persistent storage abstraction.
 * - exposes: loadTasks(), saveTasks(tasks)
 * - implements: JSON serialization, simple error handling, debounce for writes
 */

/* Debounce helper (used only inside this module) */
const debounce = (fn, delay = 250) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

const STORAGE_KEY = 'taskflow_tasks_v1';

export const Storage = {
  /**
   * Load tasks from localStorage. Returns array or empty array on error.
   */
  loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Storage.loadTasks error', err);
      return [];
    }
  },

  /**
   * Save tasks to localStorage using debounced write to reduce IO.
   * Accepts array of plain objects.
   */
  saveTasks: debounce((tasks) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Storage.saveTasks error', err);
    }
  }, 300),

  /**
   * Replace storage key (useful for migrations). Not typically needed.
   */
  setKey(newKey) {
    // Exposed for future-proofing; not used in main flow.
  }
};
