(() => {
  "use strict";
  const i18n = window.i18n;
  const tr = i18n.t;
  const KEY = "pomodoro_work_tracker";
  const BACKUP = `${KEY}_backup`;
  const statuses = { todo: "To Do", in_progress: "In Progress", completed: "Completed" };
  const statusKeys = { todo: "status.todo", in_progress: "status.inProgress", completed: "status.completed" };
  const fail = (key) => { const error = new Error(tr(key)); error.key = key; return error; };
  const id = () => crypto.randomUUID();
  const dateKey = (date = new Date()) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const validDate = (s) => typeof s === "string" && Number.isFinite(Date.parse(s));
  let data;
  let storageError = null;

  function storageMessage() {
    if (!storageError) return null;
    const base = storageError.key ? tr(storageError.key) : storageError.detail;
    return `${base} ${tr("tracker.readOnly")}`;
  }

  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.tasks) || !Array.isArray(value.sessions) ||
      !value.tasks.every(t => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.description === "string" && Object.hasOwn(statuses, t.status) && validDate(t.createdAt) && (t.completedAt === null || validDate(t.completedAt))) ||
      !value.sessions.every(s => s && typeof s.id === "string" && (s.taskId === null || typeof s.taskId === "string") && typeof s.taskTitle === "string" && validDate(s.startedAt) && validDate(s.completedAt) && Number.isFinite(s.duration) && s.duration > 0 && typeof s.notes === "string" && typeof s.taskCompleted === "boolean") ||
      new Set(value.tasks.map(t => t.id)).size !== value.tasks.length || new Set(value.sessions.map(s => s.id)).size !== value.sessions.length ||
      (value.pendingSessionId !== null && !value.sessions.some(s => s.id === value.pendingSessionId))) {
      throw fail("tracker.damaged");
    }
    return value;
  }

  function commit(next) {
    if (storageError) throw new Error(storageMessage());
    validate(next);
    try {
      const previous = localStorage.getItem(KEY);
      if (previous) localStorage.setItem(BACKUP, previous);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw fail("tracker.full");
    }
    data = next;
    window.dispatchEvent(new Event("tracker-change"));
  }

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = validate(JSON.parse(raw));
    else {
      const legacy = JSON.parse(localStorage.getItem("pomodoro_history") || "[]");
      if (!Array.isArray(legacy)) throw fail("tracker.invalidLegacy");
      const legacySettings = JSON.parse(localStorage.getItem("pomodoro_settings") || "{}");
      data = { version: 1, tasks: [], sessions: legacy.map((entry, i) => {
        const key = typeof entry === "string" ? entry : entry.d;
        const end = entry && typeof entry.t === "number" ? new Date(entry.t) : new Date(`${key}T12:00:00`);
        const minutes = entry && entry.m > 0 ? entry.m : (Number.isFinite(legacySettings.workMin) && legacySettings.workMin > 0 ? legacySettings.workMin : 25);
        return { id: `legacy-${i}`, taskId: null, taskTitle: "", startedAt: new Date(end.getTime() - minutes * 60000).toISOString(), completedAt: end.toISOString(), duration: minutes * 60, notes: "", taskCompleted: false };
      }), pendingSessionId: null };
      commit(data);
    }
  } catch (error) {
    storageError = error && error.key ? { key: error.key } : { key: null, detail: error.message };
    // A valid backup remains readable/exportable without replacing the original.
    try { data = validate(JSON.parse(localStorage.getItem(BACKUP))); }
    catch { data = { version: 1, tasks: [], sessions: [], pendingSessionId: null }; }
  }

  function mutate(fn) {
    const next = structuredClone(data);
    const result = fn(next);
    commit(next);
    return result;
  }

  function setStatus(task, status) {
    if (!Object.hasOwn(statuses, status)) throw fail("tracker.invalidStatus");
    if (task.status !== status) task.completedAt = status === "completed" ? new Date().toISOString() : null;
    task.status = status;
  }

  function saveTask(taskId, title, description, status) {
    title = title.trim();
    if (!title || title.length > 160 || description.length > 4000) throw fail("tracker.titleRules");
    return mutate(next => {
      let task = next.tasks.find(t => t.id === taskId);
      if (taskId && !task) throw fail("tracker.taskMissing");
      if (!task) {
        task = { id: id(), title, description, status: "todo", createdAt: new Date().toISOString(), completedAt: null };
        next.tasks.push(task);
      }
      Object.assign(task, { title, description });
      setStatus(task, status);
      return task.id;
    });
  }

  function record(session) {
    const existing = data.sessions.find(s => s.id === session.id);
    if (existing) return existing.id;
    return mutate(next => {
      next.sessions.push({ ...session, notes: "", taskCompleted: false });
      next.pendingSessionId = session.id;
      return session.id;
    });
  }

  function finish(sessionId, taskId, notes, complete) {
    if (notes.length > 8000) throw fail("tracker.notesLimit");
    mutate(next => {
      const session = next.sessions.find(s => s.id === sessionId);
      if (!session) throw fail("tracker.sessionMissing");
      const task = next.tasks.find(t => t.id === taskId);
      if (taskId && !task && taskId !== session.taskId) throw fail("tracker.taskMissing");
      if (taskId !== session.taskId) {
        session.taskTitle = task ? task.title : "";
        session.taskCompleted = false;
      }
      session.taskId = taskId || null;
      session.notes = notes.trim();
      if (complete && task && !session.taskCompleted) {
        setStatus(task, "completed");
        session.taskCompleted = true;
      }
      if (next.pendingSessionId === sessionId) next.pendingSessionId = null;
    });
  }

  function range(period, selected) {
    const start = new Date(`${selected}T12:00:00`);
    if (!Number.isFinite(start.getTime())) throw fail("tracker.invalidDate");
    let end = new Date(start);
    if (period === "week") {
      start.setDate(start.getDate() - (start.getDay() + 6) % 7);
      end = new Date(start); end.setDate(end.getDate() + 6);
    } else if (period === "month") {
      start.setDate(1); end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
    }
    return { start: dateKey(start), end: dateKey(end) };
  }
  function entries(start, end) {
    return data.sessions.filter(s => (!start || dateKey(s.completedAt) >= start) && (!end || dateKey(s.completedAt) <= end)).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  }
  const time = iso => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const minutes = duration => Math.round(duration / 60 * 100) / 100;
  const md = value => String(value).replace(/[\\`*_{}\[\]<>#|!]/g, "\\$&");
  function exportText(format, list) {
    if (format === "json") return JSON.stringify(list, null, 2);
    if (format === "csv") {
      const quote = v => {
        let text = String(v ?? "");
        if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      const rows = [[tr("export.date"), tr("export.start"), tr("export.end"), tr("export.startIso"), tr("export.endIso"), tr("export.task"), tr("export.taskId"), tr("export.focusMinutes"), tr("export.notes"), tr("export.taskCompleted"), tr("export.sessionId")]];
      list.forEach(s => rows.push([dateKey(s.completedAt), time(s.startedAt), time(s.completedAt), s.startedAt, s.completedAt, s.taskTitle || tr("export.unassigned"), s.taskId, minutes(s.duration), s.notes, s.taskCompleted ? tr("export.yes") : tr("export.no"), s.id]));
      return "\uFEFF" + rows.map(row => row.map(quote).join(",")).join("\r\n");
    }
    let output = `# ${tr("export.header")}\n\n${i18n.count("unit.session", list.length)} · ${tr("unit.minFocus", { n: minutes(list.reduce((n, s) => n + s.duration, 0)) })}\n`;
    const days = [...new Set(list.map(s => dateKey(s.completedAt)))];
    days.forEach(day => {
      output += `\n## ${day}\n`;
      const daily = list.filter(s => dateKey(s.completedAt) === day);
      const taskIds = [...new Set(daily.map(s => s.taskId))];
      taskIds.forEach(taskId => {
        const group = daily.filter(s => s.taskId === taskId);
        output += `\n### ${md(group[0].taskTitle || tr("export.unassigned"))}\n`;
        group.forEach(s => {
          output += `\n- ${time(s.startedAt)}–${time(s.completedAt)} · ${tr("unit.minutes", { n: minutes(s.duration) })} · ${md(s.taskTitle || tr("export.unassigned"))}${s.taskCompleted ? ` · ${tr("export.doneCheck")}` : ""}\n`;
          if (s.notes) output += `\n${s.notes.split("\n").map(line => `  ${md(line)}`).join("\n")}\n`;
        });
      });
    });
    return output;
  }

  window.workTracker = {
    statuses, id, dateKey, range, entries, exportText, time, minutes,
    statusLabels: () => Object.fromEntries(Object.entries(statusKeys).map(([key, labelKey]) => [key, tr(labelKey)])),
    getData: () => structuredClone(data), getError: storageMessage,
    saveTask, record, finish,
    move: (taskId, status) => mutate(next => {
      const task = next.tasks.find(t => t.id === taskId);
      if (!task) throw fail("tracker.taskMissing");
      setStatus(task, status);
    }),
    deleteTask: taskId => mutate(next => { next.tasks = next.tasks.filter(t => t.id !== taskId); }),
  };
})();
