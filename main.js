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
      // Robust date parsing for sorting
      const dateA =
        a.date && a.time
          ? new Date(`${a.date}T${a.time}`)
          : new Date("2999-01-01T00:00:00"); // Fallback to a far future date
      const dateB =
        b.date && b.time
          ? new Date(`${b.date}T${b.time}`)
          : new Date("2999-01-01T00:00:00");

      if (isNaN(dateA.getTime())) return 1; // Put invalid date at the end
      if (isNaN(dateB.getTime())) return -1; // Put invalid date at the end

      return dateA.getTime() - dateB.getTime();
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
    this.alertTimeout = null; // For clearing alert messages

    this.initEventListeners();
    this.renderTodos(); // Initial render of all todos
    this.updateProgress();
    this.setInitialTheme();
  }

  initEventListeners() {
    this.addTaskButton.addEventListener("click", () => this.handleAddTodo());
    this.taskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleAddTodo();
      }
    });

    // *** CRITICAL FIX FOR MULTIPLE CLICKS ***
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
    // Ensure previous alert is cleared before showing new one
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    this.alertMessage.innerHTML = `<div class="alert alert-${type} shadow-md p-3 rounded">${message}</div>`;
    this.alertMessage.classList.add("show");
    this.alertMessage.classList.remove("hide");

    this.alertTimeout = setTimeout(() => {
      this.alertMessage.classList.remove("show");
      this.alertMessage.classList.add("hide");
      // Optional: clear content after transition for accessibility
      setTimeout(() => {
        this.alertMessage.innerHTML = "";
      }, 500);
    }, 3000);
  }

  // Debounce function for saving to localStorage
  debounceSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.todoManager.saveTodos();
    }, 300);
  }

  handleAddTodo() {
    const task = this.taskInput.value.trim();
    const date = this.dateInput.value;
    const time = this.timeInput.value;
    const priority = this.prioritySelect.value;

    if (task && date && time) {
      const newTodo = new Todo(task, date, time, priority);
      this.todoManager.addTodo(newTodo);
      // Only re-render if the new todo matches the current filter
      if (
        this.currentFilter === "all" ||
        (this.currentFilter === "pending" && !newTodo.completed)
      ) {
        this._addTodoCardToDOM(newTodo);
      }
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

  // *** CRITICAL FIX FOR MULTIPLE CLICKS ***
  handleTodoActions(e) {
    const card = e.target.closest(".card");
    if (!card) return; // Click was not inside a todo card

    const id = card.dataset.id;

    // Use closest() to find the button or checkbox element, even if an icon inside it was clicked
    const deleteButton = e.target.closest(".delete-button");
    const completeButton = e.target.closest(".complete-button"); // This will be the checkbox
    const editButton = e.target.closest(".edit-button");

    if (deleteButton) {
      this.todoManager.deleteTodo(id);
      this._removeTodoCardFromDOM(id);
      this.debounceSave();
      this.showAlertMessage("Task deleted!", "success");
    } else if (completeButton) {
      // Prevent event from bubbling up if it's the checkbox
      e.stopPropagation();
      this.todoManager.toggleTodoComplete(id);
      const updatedTodo = this.todoManager.todos.find((todo) => todo.id === id);
      this._updateTodoCardInDOM(updatedTodo);
      this.debounceSave();
      this.showAlertMessage("Task status updated!", "success");
    } else if (editButton) {
      this.handleEditTodo(id);
    }
    this.updateProgress();
  }

  handleEditTodo(id) {
    const todo = this.todoManager.todos.find((t) => t.id === id);
    if (!todo) return;

    // Using prompt as requested, no design change here.
    const newTask = prompt("Edit task:", todo.task);
    const newDate = prompt("Edit date (YYYY-MM-DD):", todo.date);
    const newTime = prompt("Edit time (HH:MM):", todo.time);
    const newPriority = prompt(
      "Edit priority (low, medium, high):",
      todo.priority
    );

    // Basic validation for non-empty and valid priority
    if (
      newTask !== null &&
      newDate !== null &&
      newTime !== null &&
      newPriority !== null
    ) {
      if (
        !newTask.trim() ||
        !newDate ||
        !newTime ||
        !["low", "medium", "high"].includes(newPriority.toLowerCase())
      ) {
        this.showAlertMessage(
          "Invalid input for editing. Please ensure all fields are valid.",
          "error"
        );
        return;
      }

      const updatedTodo = this.todoManager.updateTodo(
        id,
        newTask.trim(),
        newDate,
        newTime,
        newPriority.toLowerCase()
      );
      this._updateTodoCardInDOM(updatedTodo);
      this.debounceSave();
      this.showAlertMessage("Task updated!", "success");
    } else {
      this.showAlertMessage("Task update cancelled.", "info");
    }
  }

  showClearAllConfirm() {
    this.clearAllModal.showModal();
  }

  handleClearAllTodosConfirmed() {
    if (this.todoManager.clearAllTodos()) {
      this.renderTodos();
      this.debounceSave();
      this.showAlertMessage("All tasks deleted!", "success");
      this.updateProgress();
    }
    this.clearAllModal.close();
  }

  sortByDueDate() {
    this.todoManager.sortByDueDate();
    this.renderTodos();
    this.debounceSave();
    this.showAlertMessage("Tasks sorted by due date!", "success");
    this.updateProgress();
  }

  handleFilterTodos(filterType) {
    this.currentFilter = filterType;
    this.renderTodos();
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

    // Update progress bar color classes (no design change, just dynamic class assignment)
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
    if (!dateString) return "No Date";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [year, month, day] = dateString.split("-").map(Number);
    const inputDate = new Date(year, month - 1, day);

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
    if (!timeString) return "No Time";
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  _createTodoCardHtml(todo) {
    const priorityColors = {
      low: "text-green-600 dark:text-green-400",
      medium: "text-yellow-600 dark:text-yellow-400",
      high: "text-red-600 dark:text-red-400",
    };
    const priorityDotClass = `priority-dot ${todo.priority}`;
    const formattedDate = this.formatDate(todo.date);
    const formattedTime = this.formatTime(todo.time);

    // Apply line-through directly to the h3 based on completed status (no new CSS class for this)
    const taskTextClass = todo.completed
      ? "line-through text-gray-500 dark:text-gray-400"
      : "";

    return `
      <div class="card-item flex items-center p-4">
        <input type="checkbox" class="checkbox complete-button mr-4" ${
          todo.completed ? "checked" : ""
        } aria-label="Mark task as complete">
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-lg ${taskTextClass}">${todo.task}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">Due: ${formattedDate} at ${formattedTime}</p>
          <p class="text-sm ${priorityColors[todo.priority]}">
            <span class="${priorityDotClass}"></span>Priority: ${
      todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)
    }</p>
        </div>
        <div class="actions flex gap-2 ml-4">
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

  _addTodoCardToDOM(todo) {
    const todoCard = document.createElement("div");
    todoCard.dataset.id = todo.id;
    // Ensure existing classes are kept, no new visual classes added here
    todoCard.className = `card shadow-lg ${todo.completed ? "completed" : ""}`;
    todoCard.innerHTML = this._createTodoCardHtml(todo);
    this.todosList.appendChild(todoCard);
  }

  _removeTodoCardFromDOM(id) {
    const todoCard = this.todosList.querySelector(`[data-id="${id}"]`);
    if (todoCard) {
      // Remove without a fade-out animation to avoid adding new CSS properties.
      // If you had a CSS animation already tied to the 'remove' action, it would still work.
      todoCard.remove();
      // Re-render if the list becomes empty after deletion
      if (this.todoManager.getTodos(this.currentFilter).length === 0) {
        this.renderTodos();
      }
    }
  }

  _updateTodoCardInDOM(updatedTodo) {
    const existingCard = this.todosList.querySelector(
      `[data-id="${updatedTodo.id}"]`
    );
    if (existingCard) {
      // Toggle 'completed' class which your CSS already handles
      existingCard.classList.toggle("completed", updatedTodo.completed);

      const newCardHtml = this._createTodoCardHtml(updatedTodo);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = newCardHtml;
      const newCardContent = tempDiv.firstChild;

      existingCard.innerHTML = "";
      existingCard.appendChild(newCardContent);

      // Visibility based on filter (no design change)
      if (
        this.currentFilter === "all" ||
        (this.currentFilter === "pending" && !updatedTodo.completed) ||
        (this.currentFilter === "completed" && updatedTodo.completed)
      ) {
        existingCard.style.display = "";
      } else {
        existingCard.style.display = "none";
      }
    }
  }

  renderTodos() {
    const todosToRender = this.todoManager.getTodos(this.currentFilter);
    this.todosList.innerHTML = "";

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
      // Ensure existing classes are kept
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
