let tasks = [];
let currentFilter = 'all';

// Load tasks from localStorage on page load
window.addEventListener('load', () => {
    const saved = localStorage.getItem('tasks');
    if (saved) tasks = JSON.parse(saved);
    renderTasks();
});

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function addTask() {
    const input = document.getElementById('taskInput');
    const priority = document.getElementById('prioritySelect').value;
    const text = input.value.trim();

    if (text === '') {
        input.focus();
        return;
    }

    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: priority,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    input.value = '';
    renderTasks();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function filterTasks(filter) {
    currentFilter = filter;
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.filter-btn').classList.add('active');
    renderTasks();
}

function clearCompleted() {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
}

function renderTasks() {
    const todoList = document.getElementById('todoList');
    let filteredTasks = tasks;

    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    }

    // Update stats
    document.getElementById('totalTasks').textContent = tasks.length;
    document.getElementById('activeTasks').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('completedTasks').textContent = tasks.filter(t => t.completed).length;

    if (filteredTasks.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h4>${currentFilter === 'completed' ? 'No completed tasks' : 'No tasks yet'}</h4>
                <p>${currentFilter === 'completed' ? 'Complete some tasks to see them here!' : 'Add a task to get started!'}</p>
            </div>
        `;
        return;
    }

    todoList.innerHTML = filteredTasks.map(task => `
        <div class="todo-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" class="todo-checkbox"
                   ${task.completed ? 'checked' : ''}
                   onchange="toggleTask(${task.id})">
            <span class="todo-text">${task.text}</span>
            <span class="priority-badge priority-${task.priority}">
                ${task.priority.toUpperCase()}
            </span>
            <button class="btn-delete" onclick="deleteTask(${task.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `).join('');
}

// Add task on Enter key
document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});
