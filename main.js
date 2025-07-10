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
    this.saveTodos(); // Save immediately after adding
  }

  deleteTodo(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
    this.saveTodos(); // Save immediately after deleting
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
      const dateA =
        a.date && a.time
          ? new Date(`${a.date}T${a.time}`)
          : new Date("2999-01-01T00:00:00");
      const dateB =
        b.date && b.time
          ? new Date(`${b.date}T${b.time}`)
          : new Date("2999-01-01T00:00:00");

      // Handle invalid dates (e.g., if date string is malformed, though our inputs prevent this)
      if (isNaN(dateA.getTime())) return 1; // Put invalid date at the end
      if (isNaN(dateB.getTime())) return -1; // Put invalid date at the end

      return dateA.getTime() - dateB.getTime();
    });
    this.saveTodos(); // Save after sorting
  }

  clearAllTodos() {
    if (this.todos.length === 0) return false; // Indicate nothing was cleared
    this.todos = [];
    this.saveTodos(); // Save after clearing
    return true; // Indicate tasks were cleared
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
    this.searchInput = document.querySelector(".search-input"); // NEW: Search input element

    this.currentFilter = "all"; // Default filter
    this.currentSearchQuery = ""; // NEW: Default search query

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

    // Event delegation for todo actions (complete, edit, delete) on the todosList container
    this.todosList.addEventListener("click", (e) => this.handleTodoActions(e));

    // Theme switching event listeners
    document.querySelectorAll(".theme-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const theme = e.currentTarget.getAttribute("theme");
        this.setTheme(theme);
      });
    });

    // Clear All confirmation button listener
    this.confirmClearAllBtn.addEventListener("click", () =>
      this.handleClearAllTodosConfirmed()
    );

    // NEW: Search input event listener
    this.searchInput.addEventListener("input", () => this.handleSearch());

    // Filter buttons (assuming these exist in your HTML, e.g., for All, Pending, Completed)
    // Add event listeners for your filter buttons, e.g.:
    // document.getElementById('filter-all-btn').addEventListener('click', () => this.handleFilterTodos('all'));
    // document.getElementById('filter-pending-btn').addEventListener('click', () => this.handleFilterTodos('pending'));
    // document.getElementById('filter-completed-btn').addEventListener('click', () => this.handleFilterTodos('completed'));
    // document.getElementById('sort-by-date-btn').addEventListener('click', () => this.sortByDueDate()); // Add this if you have a sort button
  }

  setInitialTheme() {
    const savedTheme = localStorage.getItem("theme") || "theme-light";
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.className = theme; // This sets the class for CSS variables
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

  // Helper for date validation (YYYY-MM-DD)
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regex)) return false;
    const date = new Date(dateString);
    const [year, month, day] = dateString.split("-").map(Number);
    // Check for valid date parts and if Date object parses it correctly
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  // Helper for time validation (HH:MM)
  isValidTime(timeString) {
    const regex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/; // 00:00 to 23:59
    return timeString.match(regex);
  }

  handleAddTodo() {
    const task = this.taskInput.value.trim();
    const date = this.dateInput.value.trim();
    const time = this.timeInput.value.trim();
    const priority = this.prioritySelect.value;

    if (!task) {
      this.showAlertMessage("Task description cannot be empty!", "error");
      return;
    }
    if (!date) {
      this.showAlertMessage("Date cannot be empty!", "error");
      return;
    }
    if (!time) {
      this.showAlertMessage("Time cannot be empty!", "error");
      return;
    }

    if (!this.isValidDate(date)) {
      this.showAlertMessage(
        "Please enter a valid date in YYYY-MM-DD format!",
        "error"
      );
      return;
    }

    if (!this.isValidTime(time)) {
      this.showAlertMessage(
        "Please enter a valid time in HH:MM format (e.g., 09:30 or 14:00)!",
        "error"
      );
      return;
    }

    const newTodo = new Todo(task, date, time, priority);
    this.todoManager.addTodo(newTodo);
    this.renderTodos(); // Re-render to show new task and handle "No tasks yet!" removal
    this.taskInput.value = "";
    this.dateInput.value = "";
    this.timeInput.value = "";
    this.prioritySelect.value = "low";
    this.showAlertMessage("Task added successfully!", "success");
    this.updateProgress();
  }

  handleTodoActions(e) {
    const card = e.target.closest(".card");
    if (!card) return; // Click was not inside a todo card

    const id = card.dataset.id; // Get the ID from the card's data attribute

    const deleteButton = e.target.closest(".delete-button");
    const completeButton = e.target.closest(".complete-button");
    const editButton = e.target.closest(".edit-button");

    if (deleteButton) {
      this.todoManager.deleteTodo(id);
      this.renderTodos(); // Re-render after deletion to update list and "No tasks yet!" state
      this.showAlertMessage("Task deleted!", "success");
    } else if (completeButton) {
      e.stopPropagation(); // Prevent card's click event from firing if checkbox is clicked directly
      this.todoManager.toggleTodoComplete(id);
      const updatedTodo = this.todoManager.todos.find((todo) => todo.id === id);
      if (updatedTodo) {
        this._updateTodoCardInDOM(updatedTodo); // Update just the single card's appearance
      }
      this.showAlertMessage("Task status updated!", "success");
    } else if (editButton) {
      this.handleEditTodo(id);
    }
    this.updateProgress(); // Always update progress after any action
  }

  handleEditTodo(id) {
    const todo = this.todoManager.todos.find((t) => t.id === id);
    if (!todo) return;

    // Use prompt for simplicity; for a more polished UI, a modal would be better
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

    // Basic validation for new inputs
    if (
      !newTask.trim() ||
      !newDate.trim() ||
      !newTime.trim() ||
      !this.isValidDate(newDate.trim()) || // Validate new date
      !this.isValidTime(newTime.trim()) || // Validate new time
      !["low", "medium", "high"].includes(newPriority.toLowerCase())
    ) {
      this.showAlertMessage(
        "Invalid input for editing. Please ensure task is filled, date is YYYY-MM-DD, time is HH:MM, and priority is 'low', 'medium', or 'high'.",
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
    // Directly update the DOM for the specific card instead of full re-render
    if (updatedTodo) {
      this._updateTodoCardInDOM(updatedTodo);
      this.showAlertMessage("Task updated successfully!", "success");
      this.updateProgress();
    } else {
      this.showAlertMessage("Failed to update task.", "error");
    }
  }

  showClearAllConfirm() {
    this.clearAllModal.showModal(); // DaisyUI modal method
  }

  handleClearAllTodosConfirmed() {
    const cleared = this.todoManager.clearAllTodos();
    if (cleared) {
      this.renderTodos(); // Re-render to show "No tasks yet!"
      this.showAlertMessage("All tasks deleted!", "success");
    } else {
      this.showAlertMessage("No tasks to delete!", "info");
    }
    this.updateProgress(); // Update progress bar
    this.clearAllModal.close(); // Close modal
  }

  sortByDueDate() {
    this.todoManager.sortByDueDate();
    this.renderTodos(); // Re-render to show sorted list
    this.showAlertMessage("Tasks sorted by due date!", "success");
    this.updateProgress();
  }

  handleFilterTodos(filterType) {
    this.currentFilter = filterType;
    this.renderTodos(); // Re-render to show filtered list
    this.showAlertMessage(`Showing ${filterType} tasks.`, "info");
  }

  // NEW: Handle search input
  handleSearch() {
    this.currentSearchQuery = this.searchInput.value.trim().toLowerCase();
    this.renderTodos(); // Re-render to show filtered tasks based on search
    // No alert message needed for every keypress, it's a continuous filter
  }

  updateProgress() {
    const totalTodos = this.todoManager.todos.length; // Progress is always based on total tasks
    const completedTodos = this.todoManager.todos.filter(
      (todo) => todo.completed
    ).length;
    let progress = 0;
    if (totalTodos > 0) {
      progress = Math.round((completedTodos / totalTodos) * 100);
    }

    this.progressText.textContent = `Progress: ${progress}%`;
    this.progressBar.value = progress;

    // Update progress bar color based on percentage
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

  // Helper to format date for display
  formatDate(dateString) {
    if (!dateString || !this.isValidDate(dateString)) return "Invalid Date";
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [year, month, day] = dateString.split("-").map(Number);
    const inputDate = new Date(year, month - 1, day); // Month is 0-indexed

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

  // Helper to format time for display
  formatTime(timeString) {
    if (!timeString || !this.isValidTime(timeString)) return "Invalid Time";
    const [hours, minutes] = timeString.split(":");
    const date = new Date(); // Use a dummy date to format time
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true, // Use 12-hour format with AM/PM
    });
  }

  // Creates the HTML string for a single todo card
  _createTodoCardHtml(todo) {
    const priorityColors = {
      low: "text-green-600 dark:text-green-400",
      medium: "text-yellow-600 dark:text-yellow-400",
      high: "text-red-600 dark:text-red-400",
    };
    const priorityDotClass = `priority-dot ${todo.priority}`;
    const formattedDate = this.formatDate(todo.date);
    const formattedTime = this.formatTime(todo.time);

    // Apply line-through and text color if completed
    const taskTextClass = todo.completed
      ? "line-through text-gray-500 dark:text-gray-400"
      : "";

    // The inner content of the card div (excluding the outer card div itself)
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

  // Updates the content of an existing todo card in the DOM
  _updateTodoCardInDOM(updatedTodo) {
    const existingCard = this.todosList.querySelector(
      `[data-id="${updatedTodo.id}"]`
    );
    if (existingCard) {
      // Toggle 'completed' class on the outer card div
      existingCard.classList.toggle("completed", updatedTodo.completed);

      // Re-generate the inner HTML content to reflect all changes (task text, completion status, priority etc.)
      const newInnerHtml = this._createTodoCardHtml(updatedTodo);
      existingCard.innerHTML = newInnerHtml; // Replace inner content

      // Apply filter and search display logic if active
      const shouldDisplay =
        (this.currentFilter === "all" ||
          (this.currentFilter === "pending" && !updatedTodo.completed) ||
          (this.currentFilter === "completed" && updatedTodo.completed)) &&
        (this.currentSearchQuery === "" ||
          updatedTodo.task.toLowerCase().includes(this.currentSearchQuery));

      existingCard.style.display = shouldDisplay ? "" : "none"; // Hide/show based on filter and search
    }
  }

  // Renders all todos based on the current filter AND search query
  renderTodos() {
    // Pass both currentFilter and currentSearchQuery to getTodos
    const todosToRender = this.todoManager.getTodos(
      this.currentFilter,
      this.currentSearchQuery
    );
    this.todosList.innerHTML = ""; // Clear existing list content

    if (todosToRender.length === 0) {
      // Display "No tasks yet!" or "No matching tasks!" message if the list is empty after filters/search
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
      // Append each todo card to the list
      todosToRender.forEach((todo) => {
        const todoCard = document.createElement("div");
        todoCard.dataset.id = todo.id; // Store ID on the card element
        todoCard.className = `card shadow-lg ${
          todo.completed ? "completed" : ""
        }`; // Apply 'completed' class
        todoCard.innerHTML = this._createTodoCardHtml(todo); // Set inner HTML
        this.todosList.appendChild(todoCard);
      });
    }

    this.updateProgress(); // Always update progress after any render

    // --- NEW: Display alert for pending tasks ---
    // Only show this alert if not currently searching or filtering,
    // to avoid redundant messages when user is actively looking for something else.
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
