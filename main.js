class Todo {
  constructor(task, date, time, priority) {
    this.id = Date.now().toString(); // Unique ID based on timestamp
    this.task = task;
    this.date = date; // Will be YYYY-MM-DD from HTML date input
    this.time = time; // Will be HH:MM from HTML time input
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
    this.saveTodos(); // Save immediately after adding
  }

  deleteTodo(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
    this.saveTodos(); // Save immediately after deleting
  }

  deleteAllTodos() {
    this.todos = []; // Empty the array
    this.saveTodos(); // Save the empty array
  }

  toggleTodoComplete(id) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveTodos(); // Save immediately after toggling
    }
  }

  updateTodo(id, newTask, newDate, newTime, newPriority) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.task = newTask;
      todo.date = newDate;
      todo.time = newTime;
      todo.priority = newPriority;
      this.saveTodos(); // Save immediately after updating
    }
    return todo; // Return the updated todo for UI refresh
  }

  // Modified: Now accepts a search query
  getTodos(filter = "all", searchQuery = "") {
    let filteredTodos = [];
    if (filter === "pending") {
      filteredTodos = this.todos.filter((todo) => !todo.completed);
    } else if (filter === "completed") {
      filteredTodos = this.todos.filter((todo) => todo.completed);
    } else {
      filteredTodos = this.todos;
    }

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filteredTodos = filteredTodos.filter((todo) =>
        todo.task.toLowerCase().includes(lowerCaseQuery)
      );
    }

    return filteredTodos;
  }

  sortByDueDate() {
    this.todos.sort((a, b) => {
      // Treat tasks without dates/times as very far in the future
      // If date or time is empty, treat it as a very late date
      const dateA =
        a.date && a.time
          ? new Date(`${a.date}T${a.time}`)
          : new Date("2999-01-01T00:00:00");
      const dateB =
        b.date && b.time
          ? new Date(`${b.date}T${b.time}`)
          : new Date("2999-01-01T00:00:00");

      return dateA.getTime() - dateB.getTime();
    });
    this.saveTodos(); // Save after sorting
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
    this.dateInput = document.querySelector(".schedule-date"); // This will now be type="date"
    this.timeInput = document.querySelector(".schedule-time"); // This will now be type="time"
    this.prioritySelect = document.querySelector(".priority-select");
    this.addTaskButton = document.querySelector(".add-task-button");
    this.todosList = document.getElementById("todos-list");
    this.alertMessage = document.querySelector(".alert-message");
    this.progressText = document.getElementById("progress-text");
    this.progressBar = document.getElementById("progress-bar");

    this.searchInput = document.querySelector(".search-input");
    this.deleteAllButton = document.querySelector(".delete-all-button");

    this.currentFilter = "all"; // Default filter
    this.currentSearchQuery = ""; // Default search query

    this.alertTimeout = null;

    this.initEventListeners();
    this.setInitialTheme();
    this.renderTodos(); // Initial render based on loaded todos and current filter
    this.updateProgress(); // Update progress bar on load
  }

  initEventListeners() {
    this.addTaskButton.addEventListener("click", () => this.handleAddTodo());
    this.taskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleAddTodo();
      }
    });

    this.todosList.addEventListener("click", (e) => this.handleTodoActions(e));

    document.querySelectorAll(".theme-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const theme = e.currentTarget.getAttribute("theme");
        this.setTheme(theme);
      });
    });

    this.searchInput.addEventListener("input", () => this.handleSearch());

    this.deleteAllButton.addEventListener("click", () =>
      this.handleDeleteAllTodos()
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
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    this.alertMessage.innerHTML = `<div class="alert alert-${type} shadow-md p-3 rounded">${message}</div>`;
    this.alertMessage.classList.add("show");
    this.alertMessage.classList.remove("hide");

    this.alertTimeout = setTimeout(() => {
      this.alertMessage.classList.remove("show");
      this.alertMessage.classList.add("hide");
      setTimeout(() => {
        this.alertMessage.innerHTML = "";
      }, 500); // Clear content after animation
    }, 3000);
  }

  handleAddTodo() {
    const task = this.taskInput.value.trim();
    const date = this.dateInput.value;
    const time = this.timeInput.value;
    const priority = this.prioritySelect.value;

    if (!task) {
      this.showAlertMessage("Task description cannot be empty!", "error");
      return;
    }

    // New logic: Check if date is empty
    if (!date) {
      this.showAlertMessage(
        "Date cannot be empty! Please select a date.",
        "error"
      );
      return;
    }

    // New logic: Check if time is empty
    if (!time) {
      this.showAlertMessage(
        "Time cannot be empty! Please select a time.",
        "error"
      );
      return;
    }

    const newTodo = new Todo(task, date, time, priority);
    this.todoManager.addTodo(newTodo);
    this.renderTodos();
    this.taskInput.value = "";
    this.dateInput.value = ""; // Clear HTML date input
    this.timeInput.value = ""; // Clear HTML time input
    this.prioritySelect.value = "low";
    this.showAlertMessage("Task added successfully!", "success");
    this.updateProgress();
  }

  handleTodoActions(e) {
    const card = e.target.closest(".card");
    if (!card) return;

    const id = card.dataset.id;

    const deleteButton = e.target.closest(".delete-button");
    const completeButton = e.target.closest(".complete-button");
    const editButton = e.target.closest(".edit-button");

    if (deleteButton) {
      this.todoManager.deleteTodo(id);
      this.renderTodos();
      this.showAlertMessage("Task deleted!", "success");
    } else if (completeButton) {
      e.stopPropagation();
      this.todoManager.toggleTodoComplete(id);
      const updatedTodo = this.todoManager.todos.find((todo) => todo.id === id);
      if (updatedTodo) {
        this._updateTodoCardInDOM(updatedTodo);
      }
      this.showAlertMessage("Task status updated!", "success");
    } else if (editButton) {
      this.handleEditTodo(id);
    }
    this.updateProgress();
  }

  handleDeleteAllTodos() {
    if (this.todoManager.todos.length === 0) {
      this.showAlertMessage("No tasks to delete!", "info");
      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete all tasks? This action cannot be undone."
    );
    if (confirmDelete) {
      this.todoManager.deleteAllTodos();
      this.renderTodos();
      this.showAlertMessage("All tasks deleted successfully!", "success");
    } else {
      this.showAlertMessage("Deletion cancelled.", "info");
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

    // Check if user cancelled any prompt
    if (
      newTask === null ||
      newDate === null ||
      newTime === null ||
      newPriority === null
    ) {
      this.showAlertMessage("Task update cancelled.", "info");
      return;
    }

    // Basic validation for new inputs (task, date, time, and priority)
    if (
      !newTask.trim() ||
      !newDate.trim() || // Now check if date is empty
      !newTime.trim() || // Now check if time is empty
      !["low", "medium", "high"].includes(newPriority.toLowerCase())
    ) {
      this.showAlertMessage(
        "Invalid input for editing. Please ensure task, date, and time are filled, and priority is 'low', 'medium', or 'high'.",
        "error"
      );
      return;
    }

    const updatedTodo = this.todoManager.updateTodo(
      id,
      newTask.trim(),
      newDate.trim(),
      newTime.trim(),
      newPriority.toLowerCase()
    );

    if (updatedTodo) {
      this._updateTodoCardInDOM(updatedTodo);
      this.showAlertMessage("Task updated successfully!", "success");
      this.updateProgress();
    } else {
      this.showAlertMessage("Failed to update task.", "error");
    }
  }

  sortByDueDate() {
    this.todoManager.sortByDueDate();
    this.renderTodos();
    this.showAlertMessage("Tasks sorted by due date!", "success");
    this.updateProgress();
  }

  handleFilterTodos(filterType) {
    this.currentFilter = filterType;
    this.renderTodos();
    this.showAlertMessage(`Showing ${filterType} tasks.`, "info");
  }

  handleSearch() {
    this.currentSearchQuery = this.searchInput.value.trim().toLowerCase();
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
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const inputDate = new Date(dateString);
      if (isNaN(inputDate.getTime())) return "Invalid Date";

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
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  }

  formatTime(timeString) {
    if (!timeString) return "No Time";
    try {
      const [hours, minutes] = timeString.split(":");
      if (hours === undefined || minutes === undefined) return "Invalid Time";

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
    } catch (e) {
      console.error("Error formatting time:", e);
      return "Invalid Time";
    }
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

  _updateTodoCardInDOM(updatedTodo) {
    const existingCard = this.todosList.querySelector(
      `[data-id="${updatedTodo.id}"]`
    );
    if (existingCard) {
      existingCard.classList.toggle("completed", updatedTodo.completed);

      const newInnerHtml = this._createTodoCardHtml(updatedTodo);
      existingCard.innerHTML = newInnerHtml;

      const shouldDisplay =
        (this.currentFilter === "all" ||
          (this.currentFilter === "pending" && !updatedTodo.completed) ||
          (this.currentFilter === "completed" && updatedTodo.completed)) &&
        (this.currentSearchQuery === "" ||
          updatedTodo.task.toLowerCase().includes(this.currentSearchQuery));

      existingCard.style.display = shouldDisplay ? "" : "none";
    }
  }

  renderTodos() {
    const todosToRender = this.todoManager.getTodos(
      this.currentFilter,
      this.currentSearchQuery
    );
    this.todosList.innerHTML = "";

    if (todosToRender.length === 0) {
      let message = "No tasks yet!";
      let subMessage = "Add a new task above to get started.";
      if (
        this.todoManager.todos.length > 0 &&
        (this.currentFilter !== "all" || this.currentSearchQuery !== "")
      ) {
        message = "No matching tasks!";
        subMessage = "Try adjusting your filters or search query.";
      }
      this.todosList.innerHTML = `
        <div class="col-span-full text-center py-8">
            <i class='bx bx-list-check bx-lg text-gray-400 dark:text-gray-600 mb-4'></i>
            <p class="text-xl text-gray-500 dark:text-gray-400 font-semibold">${message}</p>
            <p class="text-gray-500 dark:text-gray-400 mt-2">${subMessage}</p>
        </div>
      `;
    } else {
      todosToRender.forEach((todo) => {
        const todoCard = document.createElement("div");
        todoCard.dataset.id = todo.id;
        todoCard.className = `card shadow-lg ${
          todo.completed ? "completed" : ""
        }`;
        todoCard.innerHTML = this._createTodoCardHtml(todo);
        this.todosList.appendChild(todoCard);
      });
    }

    this.updateProgress();

    if (this.currentFilter === "all" && this.currentSearchQuery === "") {
      const pendingTasks = this.todoManager.todos.filter(
        (todo) => !todo.completed
      );
      if (pendingTasks.length > 0) {
        this.showAlertMessage(
          `You have ${pendingTasks.length} pending task(s)!`,
          "warning"
        );
      }
    }
  }
}

// Initialize the application
const todoManager = new TodoManager();
const uiManager = new UIManager(todoManager);
