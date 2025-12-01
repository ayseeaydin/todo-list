/**
 * utils.js
 * Shared pure helper functions (no side effects).
 * - escapeHtml: safe text rendering
 * - formatDueDate: human-friendly due date
 * - tagsFromString: parse comma-separated tags
 * - debounce: general utility
 */

export function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/* Format due date into relative-friendly text */
export function formatDueDate(dueISO) {
  if (!dueISO) return '';
  const date = new Date(dueISO);
  const now = new Date();
  // Normalize to date differences
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return date.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
}

export function tagsFromString(tagString = '') {
  return tagString.split(',').map(s => s.trim()).filter(Boolean);
}

export function debounce(fn, wait = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}
