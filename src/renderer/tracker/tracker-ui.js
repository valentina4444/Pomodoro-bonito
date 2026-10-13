(() => {
  "use strict";
  const store = window.workTracker;
  const i18n = window.i18n;
  const tr = i18n.t;
  const $ = id => document.getElementById(id);
  let editTaskId = null;
  let editSessionId = null;
  let period = "day";
  const openers = new Map();
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function error(message) {
    $("tracker-error").textContent = message;
    $("tracker-error").hidden = !message;
  }
  function attempt(fn) {
    try { const result = fn(); error(store.getError()); return result; }
    catch (err) { error(err.message); return false; }
  }
  function open(id) {
    if (id === "tasks-modal" || id === "journal-modal") {
      if (window.desktopUI) { window.desktopUI.show(id === "tasks-modal" ? "tasks" : "journal"); return; }
    }
    openers.set(id, document.activeElement);
    $(id).hidden = false;
    $(id).querySelector("input, select, textarea, button")?.focus();
  }
  function close(id) {
    if (id === "completion-modal") {
      if (!saveCompletion()) return;
    } else if ((id === "tasks-modal" || id === "journal-modal") && window.desktopUI) window.desktopUI.show("focus");
    else $(id).hidden = true;
    openers.get(id)?.focus();
  }
  function options(select, selected, all = false, snapshot = "") {
    select.replaceChildren(new Option(tr("task.unassigned"), ""));
    store.getData().tasks.filter(t => all || t.status !== "completed" || t.id === selected).forEach(t => select.add(new Option(t.title, t.id)));
    if (selected && ![...select.options].some(o => o.value === selected)) select.add(new Option(tr("tracker.deleted", { name: snapshot || tr("tracker.taskFallback") }), selected));
    select.value = selected || "";
  }
  function summary(taskId) {
    const sessions = store.getData().sessions.filter(s => s.taskId === taskId);
    const last = sessions.reduce((latest, s) => s.completedAt > latest ? s.completedAt : latest, "");
    const focus = tr("unit.minFocus", { n: store.minutes(sessions.reduce((n, s) => n + s.duration, 0)) });
    return `${sessions.length} 🍅 · ${focus}${last ? ` · ${tr("tracker.lastWorked", { date: store.dateKey(last) })}` : ""}`;
  }
  function sessionCard(session) {
    const card = node("article", undefined, "journal-entry");
    card.append(node("h4", session.taskTitle || tr("task.unassigned")));
    card.append(node("small", `${store.dateKey(session.startedAt)} ${store.time(session.startedAt)} → ${store.time(session.completedAt)} · ${tr("unit.minFocus", { n: store.minutes(session.duration) })}`));
    if (session.notes) card.append(node("p", session.notes));
    if (session.taskCompleted) card.append(node("p", tr("tracker.completedInSession")));
    const edit = node("button", tr("tracker.editNotes"), "utility-btn");
    edit.addEventListener("click", () => showCompletion(session.id));
    card.append(edit);
    return card;
  }
  function renderBoard() {
    const { tasks } = store.getData();
    const labels = store.statusLabels();
    const query = $("task-search").value.trim().toLocaleLowerCase();
    $("task-board").replaceChildren();
    Object.keys(store.statuses).forEach((status) => {
      const name = labels[status];
      const column = node("section", undefined, "task-column");
      column.dataset.status = status;
      const matching = tasks.filter(t => t.status === status && (!query || `${t.title} ${t.description}`.toLocaleLowerCase().includes(query)));
      column.append(node("h3", `${name} · ${matching.length}`));
      if (!matching.length) column.append(node("p", query ? tr("tracker.noMatch") : tr("tracker.emptyColumn"), "tracker-empty"));
      column.addEventListener("dragover", e => { if (e.dataTransfer.types.includes("text/plain")) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; column.classList.add("drop-target"); } });
      column.addEventListener("dragleave", e => { if (!column.contains(e.relatedTarget)) column.classList.remove("drop-target"); });
      column.addEventListener("drop", e => {
        e.preventDefault(); column.classList.remove("drop-target");
        const taskId = e.dataTransfer.getData("text/plain");
        if (tasks.some(t => t.id === taskId)) attempt(() => store.move(taskId, status));
      });
      matching.forEach(task => {
        const card = node("article", undefined, "task-card");
        card.dataset.taskId = task.id;
        card.draggable = true;
        const grip = node("span", "⠿", "card-grip");
        grip.draggable = true; grip.title = tr("tracker.dragTitle");
        grip.setAttribute("aria-hidden", "true");
        card.append(grip);
        card.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; card.classList.add("dragging"); });
        card.addEventListener("dragend", () => { card.classList.remove("dragging"); document.querySelectorAll(".drop-target").forEach(el => el.classList.remove("drop-target")); });
        const title = node("button", task.title, "task-title");
        title.addEventListener("click", () => showTask(task.id));
        card.append(title, node("p", summary(task.id)));
        const statusPicker = node("select");
        statusPicker.setAttribute("aria-label", tr("tracker.statusFor", { title: task.title }));
        Object.keys(store.statuses).forEach(value => statusPicker.add(new Option(labels[value], value)));
        statusPicker.value = task.status;
        statusPicker.addEventListener("change", () => attempt(() => store.move(task.id, statusPicker.value)));
        card.append(statusPicker);
        if (task.status !== "completed") {
          const focus = node("button", tr("tracker.focusOn"), "utility-btn");
          focus.addEventListener("click", () => {
            if ($("focus-task").disabled) { error(tr("tracker.finishFirstFocus")); return; }
            $("focus-task").value = task.id;
            close("tasks-modal");
            $("btn-start").focus();
          });
          card.append(focus);
        }
        column.append(card);
      });
      $("task-board").append(column);
    });
  }
  function progressText(task) {
    return `${summary(task.id)} · ${tr("tracker.created")} ${store.dateKey(task.createdAt)}${task.completedAt ? ` · ${tr("tracker.completedOn")} ${store.dateKey(task.completedAt)}` : ""}`;
  }
  function fillTaskDetails(taskId) {
    const task = store.getData().tasks.find(t => t.id === taskId);
    if (!task) return false;
    editTaskId = taskId;
    $("task-title").value = task.title;
    $("task-description").value = task.description;
    $("task-status").value = task.status;
    $("task-progress").textContent = progressText(task);
    $("task-history").replaceChildren(...store.getData().sessions.filter(s => s.taskId === taskId).reverse().map(sessionCard));
    return true;
  }
  function showTask(taskId) {
    if (!fillTaskDetails(taskId)) return;
    open("task-modal");
  }
  function showCompletion(sessionId) {
    const session = store.getData().sessions.find(s => s.id === sessionId);
    if (!session) return;
    editSessionId = sessionId;
    options($("completion-task"), session.taskId, true, session.taskTitle);
    $("session-notes").value = session.notes;
    $("complete-task").checked = session.taskCompleted;
    completionTaskChanged();
    open("completion-modal");
  }
  function completionTaskChanged() {
    $("complete-task").disabled = !store.getData().tasks.some(t => t.id === $("completion-task").value);
    if ($("complete-task").disabled) $("complete-task").checked = false;
  }
  function saveCompletion() {
    return attempt(() => {
      store.finish(editSessionId, $("completion-task").value, $("session-notes").value, $("complete-task").checked);
      $("completion-modal").hidden = true;
      editSessionId = null;
      return true;
    });
  }
  function renderJournal() {
    const selected = $("journal-date").value;
    if (!selected) return;
    const bounds = store.range(period, selected);
    const sessions = store.entries(bounds.start, bounds.end);
    document.querySelectorAll("[data-period]").forEach(b => {
      b.classList.toggle("active", b.dataset.period === period);
      b.setAttribute("aria-pressed", String(b.dataset.period === period));
    });
    const rangeText = `${bounds.start}${bounds.end !== bounds.start ? ` → ${bounds.end}` : ""}`;
    const countText = i18n.count("journal.sessions", sessions.length);
    const focusText = tr("unit.minFocus", { n: store.minutes(sessions.reduce((n, s) => n + s.duration, 0)) });
    $("journal-summary").textContent = `${rangeText} · ${countText} · ${focusText}`;
    $("journal-entries").replaceChildren();
    if (!sessions.length) $("journal-entries").append(node("p", tr("tracker.sessionsEmpty"), "tracker-empty"));
    [...new Set(sessions.map(s => store.dateKey(s.completedAt)))].forEach(day => {
      $("journal-entries").append(node("h3", day, "journal-day"));
      sessions.filter(s => store.dateKey(s.completedAt) === day).forEach(s => $("journal-entries").append(sessionCard(s)));
    });
  }
  function navigate(direction) {
    const date = new Date(`${$("journal-date").value}T12:00:00`);
    if (period === "month") { date.setDate(1); date.setMonth(date.getMonth() + direction); }
    else date.setDate(date.getDate() + direction * (period === "week" ? 7 : 1));
    $("journal-date").value = store.dateKey(date);
    renderJournal();
  }
  function exportSelection() {
    const scope = $("export-period").value;
    if (scope === "all") return store.entries();
    const bounds = scope === "custom" ? { start: $("export-start").value, end: $("export-end").value } : store.range(scope, $("journal-date").value);
    if (!bounds.start || !bounds.end || bounds.start > bounds.end) throw new Error(tr("tracker.exportInvalidRange"));
    return store.entries(bounds.start, bounds.end);
  }
  async function exportJournal() {
    try {
      const format = $("export-format").value;
      const content = store.exportText(format, exportSelection());
      const filename = `pomodoro-${$("export-period").value}-${$("journal-date").value}.${format}`;
      if (window.pomodoroExport) {
        const result = await window.pomodoroExport.save({ filename, content });
        if (result.error) throw new Error(result.error);
        $("export-result").textContent = result.canceled ? tr("tracker.exportCanceled") : tr("tracker.exportDone");
      } else {
        const url = URL.createObjectURL(new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" }));
        const link = node("a"); link.href = url; link.download = filename;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        $("export-result").textContent = tr("tracker.exportDone");
      }
    } catch (err) { error(err.message); }
  }
  $("journal-date").value = store.dateKey();
  $("export-start").value = store.dateKey();
  $("export-end").value = store.dateKey();
  $("btn-tasks").addEventListener("click", () => { renderBoard(); open("tasks-modal"); });
  $("btn-journal").addEventListener("click", () => { renderJournal(); open("journal-modal"); });
  $("quick-task").addEventListener("submit", e => {
    e.preventDefault();
    if (attempt(() => store.saveTask(null, $("new-task-title").value, "", "todo"))) { $("new-task-title").value = ""; $("task-search").value = ""; renderBoard(); $("new-task-title").focus(); }
  });
  $("task-search").addEventListener("input", renderBoard);
  $("task-form").addEventListener("submit", e => {
    e.preventDefault();
    if (attempt(() => store.saveTask(editTaskId, $("task-title").value, $("task-description").value, $("task-status").value))) close("task-modal");
  });
  $("delete-task").addEventListener("click", () => {
    if (attempt(() => { store.deleteTask(editTaskId); return true; })) close("task-modal");
  });
  $("completion-task").addEventListener("change", completionTaskChanged);
  $("completion-form").addEventListener("submit", e => { e.preventDefault(); close("completion-modal"); });
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => close(btn.dataset.close)));
  ["task-modal", "completion-modal"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) close(id); }));
  // Trap focus in the topmost tracker dialog; keep timer shortcuts out of forms.
  document.addEventListener("keydown", e => {
    const modal = ["completion-modal", "task-modal"].map($).find(el => !el.hidden);
    if (!modal) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(modal.id); }
    else if (e.key === "Tab") {
      const focusable = [...modal.querySelectorAll("button, input, select, textarea, summary")].filter(el => !el.disabled && el.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    e.stopImmediatePropagation();
  });
  document.querySelectorAll("[data-period]").forEach(btn => btn.addEventListener("click", () => { period = btn.dataset.period; renderJournal(); }));
  $("journal-date").addEventListener("change", renderJournal);
  $("journal-prev").addEventListener("click", () => navigate(-1));
  $("journal-next").addEventListener("click", () => navigate(1));
  $("journal-today").addEventListener("click", () => { $("journal-date").value = store.dateKey(); renderJournal(); });
  $("export-period").addEventListener("change", () => { $("export-custom").hidden = $("export-period").value !== "custom"; });
  $("export-journal").addEventListener("click", exportJournal);
  window.addEventListener("tracker-change", () => {
    const selected = $("focus-task").value;
    const session = window.pomodoroActiveSession?.();
    options($("focus-task"), session?.taskId || selected, false, session?.taskTitle);
    renderBoard(); renderJournal();
    if (!$("task-modal").hidden && editTaskId) {
      $("task-progress").textContent = summary(editTaskId);
      $("task-history").replaceChildren(...store.getData().sessions.filter(s => s.taskId === editTaskId).reverse().map(sessionCard));
    }
  });
  document.addEventListener("languagechange", () => {
    renderBoard();
    renderJournal();
    error(store.getError());
    if (!$("task-modal").hidden && editTaskId) {
      const task = store.getData().tasks.find(x => x.id === editTaskId);
      if (task) $("task-progress").textContent = progressText(task);
    }
  });
  options($("focus-task"), "");
  renderBoard(); renderJournal(); error(store.getError());
  window.trackerUI = { showCompletion, showTask, error, saveCompletion,
    restoreFocus: session => options($("focus-task"), session?.taskId, false, session?.taskTitle),
    hasPending: () => Boolean(store.getData().pendingSessionId),
    resumePending: () => { const pending = store.getData().pendingSessionId; if (pending) showCompletion(pending); },
  };
})();
