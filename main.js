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
    this.currentFilter = "all"; // Default filter

    this.alertTimeout = null;

    this.initEventListeners();
    this.setInitialTheme();
    this.renderTodos(); // Initial render based on loaded todos and current filter
    this.updateProgress(); // Update progress bar on load
    this.initializeCustomPlaceholders(); // Set initial state of placeholders
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

    // Event listeners for custom placeholder labels (input, change, focus, blur)
    const customPlaceholderInputs = document.querySelectorAll(
      ".custom-placeholder-input"
    );
    customPlaceholderInputs.forEach((input) => {
      input.addEventListener("input", () => this.togglePlaceholderLabel(input));
      input.addEventListener("change", () =>
        this.togglePlaceholderLabel(input)
      ); // Crucial for date/time pickers
      input.addEventListener("focus", () =>
        this.togglePlaceholderLabel(input, true)
      );
      input.addEventListener("blur", () => this.togglePlaceholderLabel(input));
    });
  }

  // Ensures placeholders are correctly shown/hidden on initial load and after data changes
  initializeCustomPlaceholders() {
    const customPlaceholderInputs = document.querySelectorAll(
      ".custom-placeholder-input"
    );
    customPlaceholderInputs.forEach((input) => {
      this.togglePlaceholderLabel(input);
    });
  }

  // Toggles the visibility of the custom placeholder label
  togglePlaceholderLabel(inputElement) {
    const label = inputElement.nextElementSibling;
    if (!label || !label.classList.contains("custom-placeholder-label")) return;

    // Check if the input has a non-empty string value or a 'valid' (filled by browser) state
    // For type="date" and type="time", .value is empty until a selection is made
    // but the browser might show "dd/mm/yyyy" as an implicit placeholder, so :not(:placeholder-shown) is key
    if (inputElement.value.trim() !== "") {
      label.style.opacity = "0";
      label.style.visibility = "hidden"; // Fully hide
      label.style.transform = "translateY(-50%) scale(0.9)";
    } else {
      label.style.opacity = "1";
      label.style.visibility = "visible"; // Show
      label.style.transform = "translateY(-50%) scale(1)";
    }
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

  handleAddTodo() {
    const task = this.taskInput.value.trim();
    const date = this.dateInput.value;
    const time = this.timeInput.value;
    const priority = this.prioritySelect.value;

    if (task && date && time) {
      const newTodo = new Todo(task, date, time, priority);
      this.todoManager.addTodo(newTodo);
      this.renderTodos(); // Re-render to show new task and handle "No tasks yet!" removal
      this.taskInput.value = "";
      this.dateInput.value = "";
      this.timeInput.value = "";
      this.prioritySelect.value = "low";
      this.showAlertMessage("Task added successfully!", "success");
      this.updateProgress();
      this.initializeCustomPlaceholders(); // Re-initialize placeholders after input clear
    } else {
      this.showAlertMessage(
        "Please fill in all fields (Task, Date, Time)!",
        "error"
      );
    }
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
      !newDate ||
      !newTime ||
      !["low", "medium", "high"].includes(newPriority.toLowerCase())
    ) {
      this.showAlertMessage(
        "Invalid input for editing. Please ensure task, date, time are filled, and priority is 'low', 'medium', or 'high'.",
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
    if (!dateString) return "No Date";
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
    if (!timeString) return "No Time";
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

      // Apply filter display logic if the filter is active
      const shouldDisplay =
        this.currentFilter === "all" ||
        (this.currentFilter === "pending" && !updatedTodo.completed) ||
        (this.currentFilter === "completed" && updatedTodo.completed);
      existingCard.style.display = shouldDisplay ? "" : "none"; // Hide/show based on filter
    }
  }

  // Renders all todos based on the current filter
  renderTodos() {
    const todosToRender = this.todoManager.getTodos(this.currentFilter);
    this.todosList.innerHTML = ""; // Clear existing list content

    if (todosToRender.length === 0) {
      // Display "No tasks yet!" message if the list is empty
      this.todosList.innerHTML = `
        <div class="col-span-full text-center py-8">
            <i class='bx bx-list-check bx-lg text-gray-400 dark:text-gray-600 mb-4'></i>
            <p class="text-xl text-gray-500 dark:text-gray-400 font-semibold">No tasks yet!</p>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Add a new task above to get started.</p>
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
    this.initializeCustomPlaceholders(); // Ensure placeholders are correct after any render
  }
}

// Initialize the application
const todoManager = new TodoManager();
const uiManager = new UIManager(todoManager);
