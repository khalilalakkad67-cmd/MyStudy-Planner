
function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return document.querySelectorAll(selector);
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function safeText(value) {
  return String(value ?? "").trim();
}

function toDateValue(value) {
  return value ? String(value) : "";
}

// Storage 
const STORAGE_KEYS = {
  TASKS: "msp_tasks",
  HABITS: "msp_habits",
  FAVS: "msp_favorites",
  THEME: "msp_theme",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


const state = {
  tasks: loadJSON(STORAGE_KEYS.TASKS, []),
  editingTaskId: null,

  habits: loadJSON(STORAGE_KEYS.HABITS, []),

  resources: [],
  favorites: loadJSON(STORAGE_KEYS.FAVS, []),

  theme: localStorage.getItem(STORAGE_KEYS.THEME) || "dark",
};


const navToggleBtn = $("#navToggle");
const appNav = $("#appNav");

// Pages
const pageSections = $all(".page-section");
const navLinks = $all(".nav-link");

// Footer year
const yearNowEl = $("#yearNow");

// Dashboard 
const dashSoonDueCount = $("#dashSoonDueCount");
const dashCompletedCount = $("#dashCompletedCount");
const dashHabitStreak = $("#dashHabitStreak");
const dashFavCount = $("#dashFavCount");
const dashProgressText = $("#dashProgressText");
const dashProgressBar = $("#dashProgressBar");
const dashProgressWrap = $(".progress");
const dashTodayList = $("#dashTodayList");
const dashTodayHint = $("#dashTodayHint");

// Tasks - Form
const taskForm = $("#taskForm");
const taskTitle = $("#taskTitle");
const taskDesc = $("#taskDesc");
const taskCategory = $("#taskCategory");
const taskPriority = $("#taskPriority");
const taskDue = $("#taskDue");

const taskTitleError = $("#taskTitleError");
const taskDueError = $("#taskDueError");
const taskSubmitBtn = $("#taskSubmitBtn");
const taskCancelEditBtn = $("#taskCancelEditBtn");

// Tasks - Controls
const taskStatusFilter = $("#taskStatusFilter");
const taskCategoryFilter = $("#taskCategoryFilter");
const taskSortBy = $("#taskSortBy");

// Tasks - List
const tasksList = $("#tasksList");
const tasksEmptyState = $("#tasksEmptyState");

// Habits
const habitForm = $("#habitForm");
const habitName = $("#habitName");
const habitGoal = $("#habitGoal");
const habitNameError = $("#habitNameError");
const habitGoalError = $("#habitGoalError");

const habitsList = $("#habitsList");
const habitsEmptyState = $("#habitsEmptyState");
const habitsSummary = $("#habitsSummary");

// Resources
const resourceSearch = $("#resourceSearch");
const resourceCategory = $("#resourceCategory");
const resourcesLoading = $("#resourcesLoading");
const resourcesError = $("#resourcesError");
const resourcesList = $("#resourcesList");
const resourcesEmptyState = $("#resourcesEmptyState");

// Settings
const themeToggleBtn = $("#themeToggleBtn");
const resetDataBtn = $("#resetDataBtn");

document.addEventListener("DOMContentLoaded", function () {
  if (yearNowEl) yearNowEl.textContent = new Date().getFullYear();

  applyTheme(state.theme);

  initNavigation();

  initTasksEvents();
  renderTasks();

  initHabitsEvents();
  renderHabits();

  initResourcesEvents();
  loadResources();

  initSettingsEvents();

  renderDashboard();
});

// Navigation  

function initNavigation() {
  if (navToggleBtn && appNav) {
    navToggleBtn.addEventListener("click", function () {
      const isOpen = appNav.classList.toggle("is-open");
      appNav.style.display = isOpen ? "block" : "";
      navToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const route = link.dataset.route;
      if (!route) return;

      window.location.hash = route;

      if (appNav) {
        appNav.classList.remove("is-open");
        appNav.style.display = "";
      }
      if (navToggleBtn) navToggleBtn.setAttribute("aria-expanded", "false");
    });
  });

  window.addEventListener("hashchange", function () {
    const route = getRouteFromHash();
    showPage(route);
  });

  const initialRoute = getRouteFromHash() || "dashboard";
  showPage(initialRoute);
}

function getRouteFromHash() {
  const hash = safeText(window.location.hash).replace("#", "");
  return hash || "dashboard";
}

function showPage(route) {
  pageSections.forEach(function (sec) {
    sec.classList.add("is-hidden");
  });

  const target = document.querySelector(`[data-page="${route}"]`);
  if (target) target.classList.remove("is-hidden");

  navLinks.forEach(function (link) {
    link.classList.remove("is-active");
    if (link.dataset.route === route) link.classList.add("is-active");
  });

  if (route === "dashboard") renderDashboard();
  if (route === "tasks") renderTasks();
  if (route === "habits") renderHabits();
  if (route === "resources") renderResources();
}

//Theme 

function applyTheme(theme) {
  if (theme === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");

  state.theme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

//Settings 

function initSettingsEvents() {
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
    });
  }

  if (resetDataBtn) {
    resetDataBtn.addEventListener("click", function () {
      const ok = confirm("Are you sure you want to reset all data?");
      if (!ok) return;

      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.HABITS);
      localStorage.removeItem(STORAGE_KEYS.FAVS);

      state.tasks = [];
      state.habits = [];
      state.favorites = [];

      cancelTaskEdit();

      renderTasks();
      renderHabits();
      renderResources();
      renderDashboard();

      alert("All data has been reset.");
    });
  }
}

// Dashboard 

function renderDashboard() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.completed).length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const soonDue = state.tasks.filter(function (t) {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate + "T00:00:00").getTime();
    return due >= todayStart && due <= todayStart + 7 * dayMs;
  });

  if (dashSoonDueCount) dashSoonDueCount.textContent = String(soonDue.length);
  if (dashCompletedCount) dashCompletedCount.textContent = String(completedTasks);
  if (dashFavCount) dashFavCount.textContent = String(state.favorites.length);

  if (dashProgressText) dashProgressText.textContent = `${progressPct}% completed`;
  if (dashProgressBar) dashProgressBar.style.width = `${progressPct}%`;
  if (dashProgressWrap) dashProgressWrap.setAttribute("aria-valuenow", String(progressPct));

  const urgent = state.tasks
    .filter(function (t) {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate + "T00:00:00").getTime();
      return due >= todayStart && due <= todayStart + 2 * dayMs;
    })
    .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));

  if (dashTodayList) {
    dashTodayList.innerHTML = "";
    urgent.slice(0, 6).forEach(function (t) {
      const li = document.createElement("li");
      li.className = "today-item";
      li.innerHTML = `
        <span class="today-title">${escapeHTML(t.title)}</span>
        <span class="today-meta">Due: ${escapeHTML(t.dueDate)}</span>
      `;
      dashTodayList.appendChild(li);
    });
  }

  if (dashTodayHint) {
    if (urgent.length === 0) {
      dashTodayHint.textContent = "No urgent tasks right now.";
      dashTodayHint.classList.remove("is-hidden");
    } else {
      dashTodayHint.textContent = "";
      dashTodayHint.classList.add("is-hidden");
    }
  }

  const todayIdx = getWeekIndexForToday();
  const dayHasAny = Array(7).fill(false);

  state.habits.forEach(function (h) {
    if (!Array.isArray(h.days)) return;
    for (let i = 0; i < 7; i++) {
      if (h.days[i]) dayHasAny[i] = true;
    }
  });

  let streak = 0;
  for (let i = todayIdx; i >= 0; i--) {
    if (!dayHasAny[i]) break;
    streak++;
  }

  if (dashHabitStreak) dashHabitStreak.textContent = String(streak);
}

function getWeekIndexForToday() {
  const d = new Date().getDay();
  const map = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
  return map[d] ?? 0;
}


function initTasksEvents() {
  if (taskSubmitBtn) taskSubmitBtn.disabled = false;

  if (taskTitle) {
    taskTitle.addEventListener("input", function () {
      if (taskTitleError) taskTitleError.textContent = "";
    });
  }

  if (taskDue) {
    taskDue.addEventListener("change", function () {
      if (taskDueError) taskDueError.textContent = "";
    });
  }

  if (taskForm) {
    taskForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const data = getTaskFormData();
      const valid = validateTask(data);
      if (!valid) return;

      if (state.editingTaskId) updateTask(state.editingTaskId, data);
      else addTask(data);

      resetTaskForm();
      renderTasks();
      renderDashboard();
    });
  }

  if (taskCancelEditBtn) {
    taskCancelEditBtn.addEventListener("click", function () {
      cancelTaskEdit();
      resetTaskForm();
    });
  }

  if (taskStatusFilter) taskStatusFilter.addEventListener("change", renderTasks);
  if (taskCategoryFilter) taskCategoryFilter.addEventListener("change", renderTasks);
  if (taskSortBy) taskSortBy.addEventListener("change", renderTasks);

  if (tasksList) {
    tasksList.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;

      const taskId = btn.dataset.id;
      const action = btn.dataset.action;
      if (!taskId || !action) return;

      if (action === "toggle") toggleTaskCompleted(taskId);
      if (action === "edit") startTaskEdit(taskId);
      if (action === "delete") deleteTask(taskId);

      renderTasks();
      renderDashboard();
    });
  }
}

function getTaskFormData() {
  return {
    title: safeText(taskTitle?.value),
    desc: safeText(taskDesc?.value),
    category: safeText(taskCategory?.value) || "Study",
    priority: safeText(taskPriority?.value) || "Medium",
    dueDate: toDateValue(taskDue?.value),
  };
}

function validateTask(data) {
  let ok = true;

  if (taskTitleError) taskTitleError.textContent = "";
  if (taskDueError) taskDueError.textContent = "";

  if (!data.title) {
    if (taskTitleError) taskTitleError.textContent = "Title is required.";
    ok = false;
  } else if (data.title.length < 3) {
    if (taskTitleError) taskTitleError.textContent = "Title must be at least 3 characters.";
    ok = false;
  }

  if (!data.dueDate) {
    if (taskDueError) taskDueError.textContent = "Due date is required.";
    ok = false;
  }

  return ok;
}

function addTask(data) {
  const task = {
    id: uid("task"),
    title: data.title,
    desc: data.desc,
    category: data.category,
    priority: data.priority,
    dueDate: data.dueDate,
    completed: false,
    createdAt: Date.now(),
  };

  state.tasks.push(task);
  saveJSON(STORAGE_KEYS.TASKS, state.tasks);
}

function updateTask(taskId, data) {
  const idx = state.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return;

  state.tasks[idx] = {
    ...state.tasks[idx],
    title: data.title,
    desc: data.desc,
    category: data.category,
    priority: data.priority,
    dueDate: data.dueDate,
  };

  saveJSON(STORAGE_KEYS.TASKS, state.tasks);
  cancelTaskEdit();
}

function deleteTask(taskId) {
  const ok = confirm("Delete this task?");
  if (!ok) return;

  state.tasks = state.tasks.filter((t) => t.id !== taskId);
  saveJSON(STORAGE_KEYS.TASKS, state.tasks);

  if (state.editingTaskId === taskId) cancelTaskEdit();
}

function toggleTaskCompleted(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  saveJSON(STORAGE_KEYS.TASKS, state.tasks);
}

function startTaskEdit(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  state.editingTaskId = taskId;

  if (taskTitle) taskTitle.value = task.title;
  if (taskDesc) taskDesc.value = task.desc;
  if (taskCategory) taskCategory.value = task.category;
  if (taskPriority) taskPriority.value = task.priority;
  if (taskDue) taskDue.value = task.dueDate || "";

  if (taskTitleError) taskTitleError.textContent = "";
  if (taskDueError) taskDueError.textContent = "";

  if (taskSubmitBtn) taskSubmitBtn.textContent = "Save Task";
  if (taskCancelEditBtn) taskCancelEditBtn.classList.remove("is-hidden");
}

function cancelTaskEdit() {
  state.editingTaskId = null;
  if (taskSubmitBtn) taskSubmitBtn.textContent = "Add Task";
  if (taskCancelEditBtn) taskCancelEditBtn.classList.add("is-hidden");
}

function resetTaskForm() {
  if (taskForm) taskForm.reset();
  if (taskTitleError) taskTitleError.textContent = "";
  if (taskDueError) taskDueError.textContent = "";
  if (taskDue) taskDue.value = "";
  cancelTaskEdit();
}

function getFilteredSortedTasks() {
  let list = [...state.tasks];

  const status = taskStatusFilter?.value || "all";
  if (status === "active") list = list.filter((t) => !t.completed);
  if (status === "completed") list = list.filter((t) => t.completed);

  const cat = taskCategoryFilter?.value || "all";
  if (cat !== "all") list = list.filter((t) => t.category === cat);

  const sortBy = taskSortBy?.value || "due";
  if (sortBy === "created") {
    list.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortBy === "priority") {
    const rank = { High: 3, Medium: 2, Low: 1 };
    list.sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0));
  } else {
    list.sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));
  }

  return list;
}

function renderTasks() {
  const list = getFilteredSortedTasks();
  if (!tasksList) return;

  tasksList.innerHTML = "";

  if (tasksEmptyState) {
    if (list.length === 0) tasksEmptyState.classList.remove("is-hidden");
    else tasksEmptyState.classList.add("is-hidden");
  }

  list.forEach(function (task) {
    const li = document.createElement("li");
    li.className = "task-item";

    li.innerHTML = `
      <div class="task-card">
        <div class="task-main">
          <p class="task-title">${escapeHTML(task.title)}</p>
          <p class="task-meta">
            <span>${escapeHTML(task.category)}</span> •
            <span>${escapeHTML(task.priority)}</span>
            ${task.dueDate ? ` • <span>Due: ${escapeHTML(task.dueDate)}</span>` : ""}
          </p>
          ${task.desc ? `<p class="task-desc">${escapeHTML(task.desc)}</p>` : ""}
        </div>

        <div class="task-actions">
          <button class="btn btn-ghost" data-action="toggle" data-id="${task.id}">
            ${task.completed ? "Uncomplete" : "Complete"}
          </button>
          <button class="btn btn-secondary" data-action="edit" data-id="${task.id}">Edit</button>
          <button class="btn btn-danger" data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </div>
    `;

    if (task.completed) li.classList.add("is-done");
    tasksList.appendChild(li);
  });
}


const WEEK_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function initHabitsEvents() {
  if (habitForm) {
    habitForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = safeText(habitName?.value);
      const goal = Number(habitGoal?.value);

      if (habitNameError) habitNameError.textContent = "";
      if (habitGoalError) habitGoalError.textContent = "";

      let ok = true;
      if (!name) {
        if (habitNameError) habitNameError.textContent = "Habit name is required.";
        ok = false;
      }
      if (!Number.isFinite(goal) || goal < 1 || goal > 7) {
        if (habitGoalError) habitGoalError.textContent = "Goal must be between 1 and 7.";
        ok = false;
      }
      if (!ok) return;

      addHabit(name, goal);
      habitForm.reset();
      if (habitGoal) habitGoal.value = 5;

      renderHabits();
      renderDashboard();
    });
  }

  if (habitsList) {
    habitsList.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;

      const habitId = btn.dataset.habitId;
      const dayIndex = btn.dataset.dayIndex;

      if (habitId && dayIndex !== undefined) {
        toggleHabitDay(habitId, Number(dayIndex));
        renderHabits();
        renderDashboard();
      }

      if (btn.dataset.action === "deleteHabit") {
        const id = btn.dataset.habitId;
        deleteHabit(id);
        renderHabits();
        renderDashboard();
      }
    });
  }
}

function addHabit(name, goal) {
  const habit = {
    id: uid("habit"),
    name,
    goal,
    days: Array(7).fill(false),
    createdAt: Date.now(),
  };

  state.habits.push(habit);
  saveJSON(STORAGE_KEYS.HABITS, state.habits);
}

function toggleHabitDay(habitId, dayIndex) {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;

  habit.days[dayIndex] = !habit.days[dayIndex];
  saveJSON(STORAGE_KEYS.HABITS, state.habits);
}

function deleteHabit(habitId) {
  const ok = confirm("Delete this habit?");
  if (!ok) return;

  state.habits = state.habits.filter((h) => h.id !== habitId);
  saveJSON(STORAGE_KEYS.HABITS, state.habits);
}

function renderHabits() {
  if (!habitsList) return;

  habitsList.innerHTML = "";

  if (habitsEmptyState) {
    if (state.habits.length === 0) habitsEmptyState.classList.remove("is-hidden");
    else habitsEmptyState.classList.add("is-hidden");
  }

  state.habits.forEach(function (habit) {
    const card = document.createElement("div");
    card.className = "habit-card";

    const doneCount = habit.days.filter(Boolean).length;

    const daysBtns = WEEK_DAYS.map(function (d, idx) {
      const active = habit.days[idx] ? "is-on" : "";
      return `
        <button class="day-btn ${active}" type="button"
          data-habit-id="${habit.id}" data-day-index="${idx}">
          ${d}
        </button>
      `;
    }).join("");

    card.innerHTML = `
      <div class="habit-head">
        <div>
          <p class="habit-title">${escapeHTML(habit.name)}</p>
          <p class="habit-meta">Progress: ${doneCount} / ${habit.goal}</p>
        </div>

        <button class="btn btn-danger" type="button" data-action="deleteHabit" data-habit-id="${habit.id}">
          Delete
        </button>
      </div>

      <div class="days-row">${daysBtns}</div>
    `;

    habitsList.appendChild(card);
  });

  renderHabitsSummary();
}

function renderHabitsSummary() {
  if (!habitsSummary) return;

  const total = state.habits.length;
  const achieved = state.habits.filter((h) => h.days.filter(Boolean).length >= h.goal).length;

  habitsSummary.innerHTML = `
    <p class="summary-text">
      Achieved goals: <strong>${achieved}</strong> / <strong>${total}</strong>
    </p>
  `;
}


function initResourcesEvents() {
  if (resourceSearch) resourceSearch.addEventListener("input", renderResources);
  if (resourceCategory) resourceCategory.addEventListener("change", renderResources);

  if (resourcesList) {
    resourcesList.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.action === "toggleFav") {
        const id = btn.dataset.id;
        toggleFavorite(id);
        renderResources();
        renderDashboard();
      }
    });
  }
}

function showResourcesLoading(show) {
  if (resourcesLoading) resourcesLoading.classList.toggle("is-hidden", !show);
}

function showResourcesError(show) {
  if (resourcesError) resourcesError.classList.toggle("is-hidden", !show);
}

async function loadResources() {
  showResourcesLoading(true);
  showResourcesError(false);

  try {
    const res = await fetch("./resources.json");
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();

    state.resources = Array.isArray(data) ? data : [];
    buildResourceCategories();
    renderResources();
  } catch (err) {
    state.resources = [];
    showResourcesError(true);
  } finally {
    showResourcesLoading(false);
    renderDashboard();
  }
}

function buildResourceCategories() {
  if (!resourceCategory) return;

  const set = new Set();
  state.resources.forEach(function (r) {
    if (r.category) set.add(String(r.category));
  });

  const categories = ["all", ...Array.from(set)];
  resourceCategory.innerHTML = categories
    .map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c === "all" ? "All" : c)}</option>`)
    .join("");
}

function toggleFavorite(resourceId) {
  const id = String(resourceId);
  const idx = state.favorites.indexOf(id);

  if (idx >= 0) state.favorites.splice(idx, 1);
  else state.favorites.push(id);

  saveJSON(STORAGE_KEYS.FAVS, state.favorites);
}

function getFilteredResources() {
  const q = safeText(resourceSearch?.value).toLowerCase();
  const cat = resourceCategory?.value || "all";

  return state.resources.filter(function (r) {
    const title = safeText(r.title).toLowerCase();
    const tags = Array.isArray(r.tags) ? r.tags.join(" ").toLowerCase() : "";
    const matchText = !q || title.includes(q) || tags.includes(q);

    const matchCat = cat === "all" || safeText(r.category) === cat;
    return matchText && matchCat;
  });
}

function renderResources() {
  if (!resourcesList) return;

  resourcesList.innerHTML = "";

  const list = getFilteredResources();

  if (resourcesEmptyState) {
    if (list.length === 0) resourcesEmptyState.classList.remove("is-hidden");
    else resourcesEmptyState.classList.add("is-hidden");
  }

  list.forEach(function (r) {
    const id = String(r.id);
    const isFav = state.favorites.includes(id);

    const card = document.createElement("div");
    card.className = "resource-card";

    card.innerHTML = `
      <div class="resource-head">
        <h4 class="resource-title">${escapeHTML(r.title)}</h4>
        <button class="btn btn-ghost" type="button" data-action="toggleFav" data-id="${escapeHTML(id)}">
          ${isFav ? "★" : "☆"}
        </button>
      </div>

      <p class="resource-meta">${escapeHTML(r.category || "General")}</p>
      ${r.description ? `<p class="resource-desc">${escapeHTML(r.description)}</p>` : ""}
      ${r.url ? `<a class="resource-link" href="${escapeAttr(r.url)}" target="_blank" rel="noopener">Open</a>` : ""}
    `;

    resourcesList.appendChild(card);
  });
}


function escapeHTML(str) {
  const s = String(str ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHTML(str).replaceAll("`", "&#096;");
}
