class Todo {
  constructor(task, date, time, priority) {
    this.id = Date.now().toString();
    this.task = task;
    this.date = date;
    this.time = time;
    this.priority = priority;
    this.completed = false;
  }
}

class TodoManager {
  constructor() {
    this.todos = this.loadTodos();
  }

  addTodo(todo) {
    this.todos.push(todo);
  }

  deleteTodo(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  }

  toggleTodoComplete(id) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }

  updateTodo(id, newTask, newDate, newTime, newPriority) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.task = newTask;
      todo.date = newDate;
      todo.time = newTime;
      todo.priority = newPriority;
    }
    return todo; // Return updated todo for UI update
  }

  getTodos(filter = "all") {
    if (filter === "pending") {
      return this.todos.filter((todo) => !todo.completed);
    } else if (filter === "completed") {
      return this.todos.filter((todo) => todo.completed);
    }
    return this.todos;
  }

  sortByDueDate() {
    this.todos.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
  }

  clearAllTodos() {
    this.todos = [];
    return true;
  }

  saveTodos() {
    localStorage.setItem("todos", JSON.stringify(this.todos));
  }

  loadTodos() {
    const todosJson = localStorage.getItem("todos");
    return todosJson ? JSON.parse(todosJson) : [];
  }
}

class UIManager {
  constructor(todoManager) {
    this.todoManager = todoManager;
    this.taskInput = document.querySelector(".task-input");
    this.dateInput = document.querySelector(".schedule-date");
    this.timeInput = document.querySelector(".schedule-time");
    this.prioritySelect = document.querySelector(".priority-select");
    this.addTaskButton = document.querySelector(".add-task-button");
    this.todosList = document.getElementById("todos-list");
    this.alertMessage = document.querySelector(".alert-message");
    this.progressText = document.getElementById("progress-text");
    this.progressBar = document.getElementById("progress-bar");
    this.clearAllModal = document.getElementById("clear_all_modal");
    this.confirmClearAllBtn = document.getElementById("confirm-clear-all");
    this.currentFilter = "all";

    this.saveTimeout = null; // For debouncing localStorage saves

    this.initEventListeners();
    this.renderTodos(); // Initial render of all todos
    this.updateProgress();
    this.setInitialTheme();
  }

  initEventListeners() {
    this.addTaskButton.addEventListener("click", () => this.handleAddTodo());
    this.todosList.addEventListener("click", (e) => this.handleTodoActions(e));

    document.querySelectorAll(".theme-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const theme = e.currentTarget.getAttribute("theme");
        this.setTheme(theme);
      });
    });

    this.confirmClearAllBtn.addEventListener("click", () =>
      this.handleClearAllTodosConfirmed()
    );
  }

  setInitialTheme() {
    const savedTheme = localStorage.getItem("theme") || "theme-light";
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }

  showAlertMessage(message, type = "success") {
    this.alertMessage.innerHTML = `<div class="alert alert-${type} shadow-md p-3 rounded">${message}</div>`;
    this.alertMessage.classList.add("show");
    this.alertMessage.classList.remove("hide");

    setTimeout(() => {
      this.alertMessage.classList.remove("show");
      this.alertMessage.classList.add("hide");
    }, 3000);
  }

  // Debounce function for saving to localStorage
  debounceSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.todoManager.saveTodos();
    }, 300); // Wait 300ms after the last change before saving
  }

  handleAddTodo() {
    const task = this.taskInput.value.trim();
    const date = this.dateInput.value;
    const time = this.timeInput.value;
    const priority = this.prioritySelect.value;

    if (task && date && time) {
      const newTodo = new Todo(task, date, time, priority);
      this.todoManager.addTodo(newTodo);
      this._addTodoCardToDOM(newTodo);
      this.debounceSave();
      this.taskInput.value = "";
      this.dateInput.value = "";
      this.timeInput.value = "";
      this.prioritySelect.value = "low";
      this.showAlertMessage("Task added successfully!", "success");
    } else {
      this.showAlertMessage("Please fill in all fields!", "error");
    }
    this.updateProgress();
  }

  handleTodoActions(e) {
    const id = e.target.closest(".card")?.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("delete-button")) {
      this.todoManager.deleteTodo(id);
      this._removeTodoCardFromDOM(id);
      this.debounceSave();
      this.showAlertMessage("Task deleted!", "success");
    } else if (e.target.classList.contains("complete-button")) {
      this.todoManager.toggleTodoComplete(id);
      const updatedTodo = this.todoManager.todos.find((todo) => todo.id === id);
      this._updateTodoCardInDOM(updatedTodo);
      this.debounceSave();
      this.showAlertMessage("Task status updated!", "success");
    } else if (e.target.classList.contains("edit-button")) {
      this.handleEditTodo(id);
    }
    this.updateProgress();
  }

  handleEditTodo(id) {
    const todo = this.todoManager.todos.find((t) => t.id === id);
    if (!todo) return;

    const newTask = prompt("Edit task:", todo.task);
    const newDate = prompt("Edit date (YYYY-MM-DD):", todo.date);
    const newTime = prompt("Edit time (HH:MM):", todo.time);
    const newPriority = prompt(
      "Edit priority (low, medium, high):",
      todo.priority
    );

    if (
      newTask !== null &&
      newDate !== null &&
      newTime !== null &&
      newPriority !== null
    ) {
      const updatedTodo = this.todoManager.updateTodo(
        id,
        newTask,
        newDate,
        newTime,
        newPriority
      );
      this._updateTodoCardInDOM(updatedTodo);
      this.debounceSave();
      this.showAlertMessage("Task updated!", "success");
    } else if (
      newTask !== null ||
      newDate !== null ||
      newTime !== null ||
      newPriority !== null
    ) {
      if (!newTask || !newDate || !newTime || !newPriority) {
        this.showAlertMessage("Update cancelled or invalid input!", "error");
      }
    }
  }

  showClearAllConfirm() {
    this.clearAllModal.showModal();
  }

  handleClearAllTodosConfirmed() {
    if (this.todoManager.clearAllTodos()) {
      this.renderTodos(); // Full re-render needed as all tasks are gone
      this.debounceSave();
      this.showAlertMessage("All tasks deleted!", "success");
      this.updateProgress();
    }
    this.clearAllModal.close();
  }

  sortByDueDate() {
    this.todoManager.sortByDueDate();
    this.renderTodos(); // Full re-render needed as order changes
    this.debounceSave();
    this.showAlertMessage("Tasks sorted by due date!", "success");
    this.updateProgress();
  }

  handleFilterTodos(filterType) {
    this.currentFilter = filterType;
    this.renderTodos(); // Full re-render needed as visible tasks change
  }

  updateProgress() {
    const totalTodos = this.todoManager.todos.length;
    const completedTodos = this.todoManager.todos.filter(
      (todo) => todo.completed
    ).length;
    let progress = 0;
    if (totalTodos > 0) {
      progress = Math.round((completedTodos / totalTodos) * 100);
    }

    this.progressText.textContent = `Progress: ${progress}%`;
    this.progressBar.value = progress;

    this.progressBar.classList.remove(
      "progress-error",
      "progress-warning",
      "progress-success"
    );
    if (progress <= 33) {
      this.progressBar.classList.add("progress-error");
    } else if (progress <= 66) {
      this.progressBar.classList.add("progress-warning");
    } else {
      this.progressBar.classList.add("progress-success");
    }
  }

  formatDate(dateString) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const inputDate = new Date(dateString + "T00:00:00");

    if (inputDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (inputDate.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return inputDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  formatTime(timeString) {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Helper to create HTML string for a single todo card
  _createTodoCardHtml(todo) {
    const priorityColors = {
      low: "text-green-600 dark:text-green-400",
      medium: "text-yellow-600 dark:text-yellow-400",
      high: "text-red-600 dark:text-red-400",
    };
    const priorityDotClass = `priority-dot ${todo.priority}`;
    const formattedDate = this.formatDate(todo.date);
    const formattedTime = this.formatTime(todo.time);

    return `
      <div class="card-item">
        <input type="checkbox" class="checkbox complete-button" ${
          todo.completed ? "checked" : ""
        }>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-lg">${todo.task}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">Due: ${formattedDate} at ${formattedTime}</p>
          <p class="text-sm ${priorityColors[todo.priority]}">
            <span class="${priorityDotClass}"></span>Priority: ${
      todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)
    }</p>
        </div>
        <div class="actions flex">
          <button class="btn btn-sm btn-info edit-button" aria-label="Edit Task">
            <i class="bx bx-edit bx-sm"></i>
          </button>
          <button class="btn btn-sm btn-error delete-button" aria-label="Delete Task">
            <i class="bx bx-trash bx-sm"></i>
          </button>
        </div>
      </div>
    `;
  }

  // DOM Manipulation Helpers
  _addTodoCardToDOM(todo) {
    // Only add if the current filter allows it
    if (
      this.currentFilter === "all" ||
      (this.currentFilter === "pending" && !todo.completed) ||
      (this.currentFilter === "completed" && todo.completed)
    ) {
      const todoCard = document.createElement("div");
      todoCard.dataset.id = todo.id;
      todoCard.className = `card shadow-lg ${
        todo.completed ? "completed" : ""
      }`;
      todoCard.innerHTML = this._createTodoCardHtml(todo);
      this.todosList.appendChild(todoCard);
    }
  }

  _removeTodoCardFromDOM(id) {
    const todoCard = this.todosList.querySelector(`[data-id="${id}"]`);
    if (todoCard) {
      todoCard.remove();
    }
  }

  _updateTodoCardInDOM(updatedTodo) {
    const existingCard = this.todosList.querySelector(
      `[data-id="${updatedTodo.id}"]`
    );
    if (existingCard) {
      const newCardHtml = this._createTodoCardHtml(updatedTodo);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = newCardHtml;
      const newCardContent = tempDiv.firstChild;

      existingCard.className = `card shadow-lg ${
        updatedTodo.completed ? "completed" : ""
      }`;

      existingCard.querySelector(".card-item").replaceWith(newCardContent);

      // Re-evaluate visibility based on current filter
      if (
        this.currentFilter === "all" ||
        (this.currentFilter === "pending" && !updatedTodo.completed) ||
        (this.currentFilter === "completed" && updatedTodo.completed)
      ) {
        existingCard.style.display = ""; // Show it
      } else {
        existingCard.style.display = "none"; // Hide it
      }
    }
  }

  // Main render method (for initial load, sort, filter)
  renderTodos() {
    const todosToRender = this.todoManager.getTodos(this.currentFilter);
    this.todosList.innerHTML = ""; // Clear all for full re-render

    if (todosToRender.length === 0) {
      this.todosList.innerHTML = `
        <div class="col-span-full text-center py-8">
            <i class='bx bx-list-check bx-lg text-gray-400 dark:text-gray-600 mb-4'></i>
            <p class="text-xl text-gray-500 dark:text-gray-400 font-semibold">No tasks yet!</p>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Add a new task above to get started.</p>
        </div>
      `;
      return;
    }

    todosToRender.forEach((todo) => {
      const todoCard = document.createElement("div");
      todoCard.dataset.id = todo.id;
      todoCard.className = `card shadow-lg ${
        todo.completed ? "completed" : ""
      }`;
      todoCard.innerHTML = this._createTodoCardHtml(todo);
      this.todosList.appendChild(todoCard);
    });
    this.updateProgress();
  }
}

const todoManager = new TodoManager();
const uiManager = new UIManager(todoManager);
