// ===============================
// TaskFlow — Modern Todo Logic
// Using template cloning & event delegation
// ===============================

// Store tasks in memory
let tasks = [];
let currentFilter = "all";

// Select DOM elements once (best practice)
const todoList = document.getElementById("todoList");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterButtons = document.querySelectorAll(".filter-btn");
const template = document.getElementById("todo-template");

// ===============================
// Load tasks on page ready
// ===============================
window.addEventListener("DOMContentLoaded", renderTasks);

// ===============================
// Add new task
// ===============================
taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = taskInput.value.trim();
    if (!text) {
        taskInput.focus();
        return;
    }

    const task = {
        id: Date.now(),
        text,
        completed: false,
        priority: prioritySelect.value,
        createdAt: new Date().toISOString(),
    };

    tasks.push(task);

    taskInput.value = "";
    renderTasks();
});

// ===============================
// Clear completed
// ===============================
clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter(t => !t.completed);
    renderTasks();
});

// ===============================
// Filter buttons
// ===============================
filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        // update filter
        currentFilter = btn.dataset.filter;

        // update UI state
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        renderTasks();
    });
});

// ===============================
// Event Delegation for clicks
// (instead of inline onclick)
// ===============================
todoList.addEventListener("click", (event) => {
    const item = event.target.closest(".todo-item");
    if (!item) return;

    const id = Number(item.dataset.id);

    // Toggle checkbox
    if (event.target.classList.contains("todo-checkbox")) {
        toggleTask(id);
        return;
    }

    // Delete button
    if (event.target.classList.contains("btn-delete") ||
        event.target.closest(".btn-delete")) {
        deleteTask(id);
        return;
    }
});

// ===============================
// Task actions
// ===============================
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        renderTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
}

// ===============================
// Render tasks using <template>
// ===============================
function renderTasks() {
    todoList.innerHTML = "";

    // Filter tasks
    let filteredTasks = tasks;
    if (currentFilter === "active") filteredTasks = tasks.filter(t => !t.completed);
    if (currentFilter === "completed") filteredTasks = tasks.filter(t => t.completed);

    // Update Stats
    updateStats();

    // Empty state
    if (filteredTasks.length === 0) {
        todoList.innerHTML = `
            <li class="empty-state">
                <i class="bi bi-inbox"></i>
                <h4>No tasks found</h4>
                <p>${currentFilter === "completed" ? "Complete tasks to see them here!" : "Add a task to get started!"}</p>
            </li>`;
        return;
    }

    // Render each task using template clone
    filteredTasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        const li = clone.querySelector("li");

        li.dataset.id = task.id;

        // elements inside the template
        const checkbox = clone.querySelector(".todo-checkbox");
        const textSpan = clone.querySelector(".todo-text");
        const badge = clone.querySelector(".priority-badge");

        // fill content
        checkbox.checked = task.completed;
        textSpan.textContent = task.text;

        badge.classList.add(`priority-${task.priority}`);
        badge.textContent = task.priority.toUpperCase();

        if (task.completed) li.classList.add("completed");

        todoList.appendChild(clone);
    });
}

// ===============================
// Stats Updating
// ===============================
function updateStats() {
    document.getElementById("totalTasks").textContent = tasks.length;
    document.getElementById("activeTasks").textContent = tasks.filter(t => !t.completed).length;
    document.getElementById("completedTasks").textContent = tasks.filter(t => t.completed).length;
}


// Dark mode toggle
document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    // Save theme
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
});

// Load saved theme
window.addEventListener("load", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
