// Abstract formatter class
class TodoItemFormatter {
  formatTask(task) {
    return task.length > 14 ? task.slice(0, 14) + "..." : task;
  }

  formatDueDate(dueDate) {
    return dueDate || "No due date";
  }

  formatStatus(completed) {
    return completed ? "Completed" : "Pending";
  }
}

class TodoManager {
  constructor(todoItemFormatter) {
    this.todos = JSON.parse(localStorage.getItem("todos")) || [];
    this.todoItemFormatter = todoItemFormatter;
  }

  addTodo(task, dueDate) {
    const newTodo = {
      id: this.getRandomId(),
      task: this.todoItemFormatter.formatTask(task),
      dueDate: this.todoItemFormatter.formatDueDate(dueDate),
      completed: false,
    };
    this.todos.push(newTodo);
    this.saveToLocalStorage();
    return newTodo;
  }

  editTodo(id, updatedTask) {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.task = updatedTask;
      this.saveToLocalStorage();
    }
    return todo;
  }

  deleteTodo(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
    this.saveToLocalStorage();
  }

  toggleTodoStatus(id) {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveToLocalStorage();
    }
  }

  clearAllTodos() {
    this.todos = [];
    this.saveToLocalStorage();
  }

  filterTodos(status) {
    switch (status) {
      case "all":
        return this.todos;
      case "pending":
        return this.todos.filter((todo) => !todo.completed);
      case "completed":
        return this.todos.filter((todo) => todo.completed);
      default:
        return [];
    }
  }

  getRandomId() {
    return (
      Math.random().toString(36).substring(2, 9) +
      Math.random().toString(36).substring(2, 9)
    );
  }

  saveToLocalStorage() {
    localStorage.setItem("todos", JSON.stringify(this.todos));
  }
}

class UIManager {
  constructor(todoManager, todoItemFormatter) {
    this.todoManager = todoManager;
    this.todoItemFormatter = todoItemFormatter;

    this.taskInput = document.querySelector("input[type='text']");
    this.dateInput = document.querySelector(".schedule-date");
    this.addBtn = document.querySelector(".add-task-button");
    this.todosListBody = document.querySelector(".todos-list-body");
    this.alertMessage = document.querySelector(".alert-message");
    this.deleteAllBtn = document.querySelector(".delete-all-btn");

    this.addEventListeners();
    this.showAllTodos();
  }

  addEventListeners() {
    this.addBtn.addEventListener("click", () => this.handleAddTodo());

    this.taskInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter" && this.taskInput.value.trim() !== "") {
        this.handleAddTodo();
      }
    });

    this.deleteAllBtn.addEventListener("click", () =>
      this.handleClearAllTodos()
    );

    document.querySelectorAll(".todos-filter li").forEach((btn) => {
      btn.addEventListener("click", () => {
        const status = btn.querySelector("a").textContent.trim().toLowerCase();
        this.handleFilterTodos(status);
      });
    });
  }

  handleAddTodo() {
    const task = this.taskInput.value.trim();
    const dueDate = this.dateInput.value;

    if (!task) {
      this.showAlertMessage("Please enter a task", "error");
      return;
    }

    this.todoManager.addTodo(task, dueDate);
    this.showAllTodos();
    this.taskInput.value = "";
    this.dateInput.value = "";
    this.showAlertMessage("Task added successfully", "success");
  }

  handleClearAllTodos() {
    this.todoManager.clearAllTodos();
    this.showAllTodos();
    this.showAlertMessage("All todos cleared", "success");
  }

  showAllTodos() {
    const allTodos = this.todoManager.filterTodos("all");
    this.displayTodos(allTodos);
  }

  displayTodos(todos) {
    if (todos.length === 0) {
      this.todosListBody.innerHTML = `
        <tr><td colspan="4" class="text-center">No task found</td></tr>
      `;
      return;
    }

    this.todosListBody.innerHTML = todos
      .map((todo) => {
        return `
        <tr class="todo-item" data-id="${todo.id}">
          <td>${this.todoItemFormatter.formatTask(todo.task)}</td>
          <td>${this.todoItemFormatter.formatDueDate(todo.dueDate)}</td>
          <td>${this.todoItemFormatter.formatStatus(todo.completed)}</td>
          <td>
            <button class="btn btn-warning btn-sm" onclick="uiManager.handleEditTodo('${
              todo.id
            }')">
              <i class="bx bx-edit-alt bx-xs"></i>
            </button>
            <button class="btn btn-success btn-sm" onclick="uiManager.handleToggleStatus('${
              todo.id
            }')">
              <i class="bx bx-check bx-xs"></i>
            </button>
            <button class="btn btn-error btn-sm" onclick="uiManager.handleDeleteTodo('${
              todo.id
            }')">
              <i class="bx bx-trash bx-xs"></i>
            </button>
          </td>
        </tr>`;
      })
      .join("");
  }

  handleEditTodo(id) {
    const todo = this.todoManager.todos.find((t) => t.id === id);
    if (todo) {
      this.taskInput.value = todo.task;

      const handleUpdate = () => {
        const updatedTask = this.taskInput.value.trim();
        if (updatedTask) {
          todo.task = updatedTask;
          this.todoManager.saveToLocalStorage();
          this.showAllTodos();
          this.showAlertMessage("Todo updated", "success");
        }
        this.addBtn.innerHTML = "<i class='bx bx-plus bx-sm'></i>";
        this.addBtn.removeEventListener("click", handleUpdate);
      };

      this.addBtn.innerHTML = "<i class='bx bx-check bx-sm'></i>";
      this.addBtn.addEventListener("click", handleUpdate);
    }
  }

  handleToggleStatus(id) {
    this.todoManager.toggleTodoStatus(id);
    this.showAllTodos();
  }

  handleDeleteTodo(id) {
    this.todoManager.deleteTodo(id);
    this.showAllTodos();
    this.showAlertMessage("Todo deleted", "success");
  }

  handleFilterTodos(status) {
    const filtered = this.todoManager.filterTodos(status);
    this.displayTodos(filtered);
  }

  showAlertMessage(message, type) {
    this.alertMessage.innerHTML = `
      <div class="alert alert-${type} shadow-lg mb-5 w-full">
        <div><span>${message}</span></div>
      </div>`;
    this.alertMessage.classList.remove("hide");
    this.alertMessage.classList.add("show");
    setTimeout(() => {
      this.alertMessage.classList.remove("show");
      this.alertMessage.classList.add("hide");
      this.alertMessage.innerHTML = "";
    }, 3000);
  }
}

class ThemeSwitcher {
  constructor(themes, html, body) {
    this.themes = themes;
    this.html = html;
    this.body = body;
    this.init();
  }

  init() {
    const theme = this.getThemeFromLocalStorage();
    if (theme) this.setTheme(theme);
    this.themes.forEach((t) => {
      t.addEventListener("click", () => {
        const themeName = t.getAttribute("theme");
        this.setTheme(themeName);
        this.saveThemeToLocalStorage(themeName);
      });
    });
  }

  setTheme(themeName) {
    this.html.setAttribute("data-theme", themeName);
    this.body.className = themeName;
  }

  saveThemeToLocalStorage(themeName) {
    localStorage.setItem("theme", themeName);
  }

  getThemeFromLocalStorage() {
    return localStorage.getItem("theme");
  }
}

// Initialize everything
const todoItemFormatter = new TodoItemFormatter();
const todoManager = new TodoManager(todoItemFormatter);
const uiManager = new UIManager(todoManager, todoItemFormatter);
const themes = document.querySelectorAll(".theme-item");
const html = document.querySelector("html");
const body = document.querySelector("body");
const themeSwitcher = new ThemeSwitcher(themes, html, body);
