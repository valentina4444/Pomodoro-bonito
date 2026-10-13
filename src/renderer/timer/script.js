(() => {
  "use strict";

  const CIRCUMFERENCE = 2 * Math.PI * 88;
  const i18n = window.i18n;
  const t = i18n.t;
  const SETTINGS_KEY = "pomodoro_settings";
  const SESSIONS_KEY = "pomodoro_sessions";
  const RUNTIME_KEY = "pomodoro_runtime";
  const PAUSED_KEY = "pomodoro_paused";
  const tracker = window.workTracker;
  const focusTask = document.getElementById("focus-task");
  let activeSession = null;
  window.pomodoroActiveSession = () => activeSession;

  const THEMES = {
    tomato: { nameKey: "theme.tomato", swatch: "#ff5d5d" },
    mint: { nameKey: "theme.mint", swatch: "#4fc48d" },
    blueberry: { nameKey: "theme.blueberry", swatch: "#6ba7f5" },
    peach: { nameKey: "theme.peach", swatch: "#ff8f5e" },
    lavender: { nameKey: "theme.lavender", swatch: "#a98fe8" },
  };

  const APPEARANCES = {
    light: { nameKey: "appearance.light", symbol: "☀️" },
    dark: { nameKey: "appearance.dark", symbol: "🌙" },
    system: { nameKey: "appearance.system", symbol: "🌓" },
  };

  const DEFAULT_SETTINGS = {
    workMin: 25,
    breakMin: 5,
    longBreakEvery: 4,
    longBreakMin: 15,
    sound: true,
    notif: true,
    theme: "tomato",
    appearance: "system",
    size: "normal",
    language: "en",
  };

  const MODE_META = {
    work: { wordKey: "mode.work.word", labelKey: "mode.work.label", mascot: "🍅" },
    break: { wordKey: "mode.break.word", labelKey: "mode.break.label", mascot: "🥑" },
    longBreak: { wordKey: "mode.long.word", labelKey: "mode.long.label", mascot: "🌴" },
  };

  const SUMMARY_KEYS = {
    daily: ["stats.todaySummary", "stats.emptyToday"],
    weekly: ["stats.weekSummary", "stats.emptyWeek"],
    monthly: ["stats.monthSummary", "stats.emptyMonth"],
  };

  const timeDisplay = document.getElementById("time-display");
  const timerModeEl = document.getElementById("timer-mode");
  const ringEl = document.querySelector(".timer-ring");
  const ringProgress = document.getElementById("ring-progress");
  const mascot = document.getElementById("mascot");
  const modeLabel = document.getElementById("mode-label");
  const sessionsEl = document.getElementById("sessions");
  const cycleDotsEl = document.getElementById("cycle-dots");
  const btnStart = document.getElementById("btn-start");
  const btnReset = document.getElementById("btn-reset");
  const btnSkip = document.getElementById("btn-skip");

  const settingsModal = document.getElementById("settings-modal");
  const statsModal = document.getElementById("stats-modal");
  const btnSettings = document.getElementById("btn-settings");
  const btnStats = document.getElementById("btn-stats");
  const btnMini = document.getElementById("btn-mini");
  const btnExpand = document.getElementById("btn-expand");
  const closeSettings = document.getElementById("close-settings");
  const closeStats = document.getElementById("close-stats");
  const themePicker = document.getElementById("theme-picker");
  const modePicker = document.getElementById("mode-picker");

  const workMinInput = document.getElementById("work-min");
  const breakMinInput = document.getElementById("break-min");
  const longEveryInput = document.getElementById("long-every");
  const longMinInput = document.getElementById("long-min");
  const soundToggle = document.getElementById("sound-toggle");
  const notifToggle = document.getElementById("notif-toggle");
  const languageSelect = document.getElementById("language-select");

  const tabBtns = document.querySelectorAll(".tab-btn");
  const chartEl = document.getElementById("chart");
  const chartSummaryEl = document.getElementById("chart-summary");

  let settings = { ...DEFAULT_SETTINGS, ...load(SETTINGS_KEY, {}) };
  settings.language = i18n.getLang();

  let startLabelKey = "timer.start";

  let state = {
    mode: "work",
    running: false,
    endTime: null,
    intervalId: null,
    totalSeconds: settings.workMin * 60,
    remainingSeconds: settings.workMin * 60,
  };

  let currentTab = "daily";
  let lastTraySec = null;
  let lastTrayText = null;

  const isTest = new URLSearchParams(window.location.search).has("test");
  const testLog = { notifications: [], chimes: 0 };

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing */
    }
  }

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

  function weekdayLetter(date) {
    return WEEKDAY_LETTERS[date.getDay()];
  }

  function toDateKey(entry) {
    return typeof entry === "string" ? entry : entry.d;
  }

  function entryMinutes(entry) {
    return entry && typeof entry === "object" && entry.m ? entry.m : settings.workMin;
  }

  function loadSessions() {
    const data = load(SESSIONS_KEY, {});
    if (data.date !== localDateKey()) return { date: localDateKey(), count: 0, cycle: 0 };
    return { cycle: 0, ...data };
  }

  function loadHistory() {
    return tracker.getData().sessions.map(s => ({ d: localDateKey(new Date(s.completedAt)), t: Date.parse(s.completedAt), m: s.duration / 60 }));
  }

  function addSession() {
    const completedAt = new Date(state.endTime && state.remainingSeconds <= 0 ? state.endTime : Date.now()).toISOString();
    const session = activeSession || { id: tracker.id(), taskId: null, taskTitle: "", startedAt: new Date(Date.parse(completedAt) - state.totalSeconds * 1000).toISOString() };
    const alreadySaved = tracker.getData().sessions.some(s => s.id === session.id);
    tracker.record({ id: session.id, taskId: session.taskId, taskTitle: session.taskTitle, startedAt: session.startedAt, completedAt, duration: state.totalSeconds });
    const data = loadSessions();
    if (!alreadySaved) data.cycle = (data.cycle || 0) + 1;
    data.count = loadHistory().filter(s => s.d === localDateKey()).length;
    save(SESSIONS_KEY, data);

    if (data.count % 4 === 0) {
      sessionsEl.classList.add("celebrate");
      setTimeout(() => sessionsEl.classList.remove("celebrate"), 700);
    }
    return data;
  }

  function renderSessions() {
    const { cycle } = loadSessions();
    const count = loadHistory().filter(s => s.d === localDateKey()).length;
    const full = Math.floor(count / 4);
    const extra = count % 4;
    let html = "🏆".repeat(full) + "🍅".repeat(extra);
    if (count > 0) {
      html += `<span class="done">${i18n.count("unit.session", count)} ${t("unit.today")}</span>`;
    }
    sessionsEl.innerHTML = html;

    let dots = "";
    const every = settings.longBreakEvery;
    for (let i = 0; i < every; i++) {
      dots += `<span class="dot ${i < cycle ? "dot-done" : ""}"></span>`;
    }
    cycleDotsEl.innerHTML = dots;
  }

  function playChime() {
    if (!settings.sound) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    if (isTest) testLog.chimes += 1;
    const now = audioCtx.currentTime;
    [880, 660, 880, 1175].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = now + i * 0.28;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  function notify(title, body) {
    if (!settings.notif) return;
    if (isTest) testLog.notifications.push({ title, body });

    if (window.pomodoroNotification && window.pomodoroNotification.show) {
      window.pomodoroNotification.show(title, body);
      return;
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body });
        return;
      } catch {
        /* fall through to title flash */
      }
    }

    const original = document.title;
    document.title = `⏰ ${title}`;
    setTimeout(() => (document.title = original), 4000);
  }

  function requestNotificationPermission() {
    if (
      !window.pomodoroNotification &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }

  function modeMinutes(mode) {
    if (mode === "work") return settings.workMin;
    if (mode === "break") return settings.breakMin;
    return settings.longBreakMin;
  }

  function applyModeMeta() {
    const meta = MODE_META[state.mode];
    timerModeEl.textContent = t(meta.wordKey);
    modeLabel.textContent = t(meta.labelKey);
    mascot.textContent = meta.mascot;
  }

  function updateStartButton() {
    btnStart.textContent = t(startLabelKey);
  }

  function setMode(mode) {
    state.mode = mode;
    state.totalSeconds = modeMinutes(mode) * 60;
    state.remainingSeconds = state.totalSeconds;

    applyModeMeta();
    mascot.classList.toggle("break", mode === "break");
    mascot.classList.toggle("longBreak", mode === "longBreak");
    ringEl.dataset.mode = mode;
    render();
    renderSessions();
    focusTask.disabled = mode !== "work" || Boolean(activeSession);
  }

  function render() {
    const remain = state.remainingSeconds;
    const mm = String(Math.floor(remain / 60)).padStart(2, "0");
    const ss = String(remain % 60).padStart(2, "0");
    timeDisplay.textContent = `${mm}:${ss}`;
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (remain / state.totalSeconds);
    document.title = `${timeDisplay.textContent} · ${timerModeEl.textContent}`;

    const sec = Math.ceil(remain);
    if (sec !== lastTraySec) {
      lastTraySec = sec;
      const trayText = `${timeDisplay.textContent} · ${timerModeEl.textContent}`;
      if (window.pomodoroTray && trayText !== lastTrayText) {
        lastTrayText = trayText;
        window.pomodoroTray.update(trayText);
      }
    }
  }

  function tick() {
    const remain = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
    state.remainingSeconds = remain;
    render();
    if (remain <= 0) completePhase(false);
  }

  function startTimer() {
    if (tracker.getError()) { window.trackerUI.error(tracker.getError()); return; }
    if (window.trackerUI.hasPending()) { window.trackerUI.resumePending(); return; }
    if (state.remainingSeconds <= 0 && activeSession) { completePhase(false); return; }
    requestNotificationPermission();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    if (state.remainingSeconds <= 0) setMode(state.mode);
    if (state.mode === "work" && !activeSession) {
      const task = tracker.getData().tasks.find(t => t.id === focusTask.value);
      activeSession = { id: tracker.id(), taskId: task?.id || null, taskTitle: task?.title || "", startedAt: new Date().toISOString() };
      focusTask.disabled = true;
    }
    state.endTime = Date.now() + state.remainingSeconds * 1000;
    save(RUNTIME_KEY, { mode: state.mode, endTime: state.endTime, totalSeconds: state.totalSeconds, activeSession });
    remove(PAUSED_KEY);
    state.intervalId = setInterval(tick, 200);
    state.running = true;
    startLabelKey = "timer.pause";
    updateStartButton();
  }

  function pauseTimer() {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.running = false;
    startLabelKey = "timer.start";
    updateStartButton();
    save(PAUSED_KEY, { mode: state.mode, remainingSeconds: state.remainingSeconds, totalSeconds: state.totalSeconds, activeSession });
    remove(RUNTIME_KEY);
  }

  function toggleStart() {
    if (state.running) pauseTimer();
    else startTimer();
  }

  function completePhase(silent) {
    let data;
    if (state.mode === "work") {
      try { data = addSession(); }
      catch (error) {
        clearInterval(state.intervalId);
        state.intervalId = null;
        state.running = false;
        startLabelKey = "timer.retry";
        updateStartButton();
        window.trackerUI.error(error.message);
        return;
      }
    }
    pauseTimer();
    state.endTime = null;
    activeSession = null;
    remove(PAUSED_KEY);
    if (!silent) playChime();

    if (state.mode === "work") {
      renderSessions();

      if (data.cycle >= settings.longBreakEvery) {
        data.cycle = 0;
        save(SESSIONS_KEY, data);
        if (!silent) notify(t("notify.longTitle"), t("notify.longBody"));
        setMode("longBreak");
      } else {
        if (!silent) notify(t("notify.workTitle"), t("notify.workBody"));
        setMode("break");
      }
      if (!silent) {
        if (settings.size === "mini") setWindowSize("normal");
        window.trackerUI.resumePending();
      }
    } else {
      if (!silent) notify(t("notify.breakTitle"), t("notify.breakBody"));
      setMode("work");
    }
    if (!silent && window.desktopUI && window.desktopUI.refreshPhrase) window.desktopUI.refreshPhrase();
  }

  function resetTimer() {
    pauseTimer();
    activeSession = null;
    state.endTime = null;
    remove(PAUSED_KEY);
    setMode(state.mode);
  }

  function skipPhase() {
    pauseTimer();
    activeSession = null;
    state.endTime = null;
    remove(PAUSED_KEY);
    setMode(state.mode === "work" ? "break" : "work");
  }

  function restoreRuntime() {
    const saved = load(RUNTIME_KEY, null);
    if (!saved) {
      const paused = load(PAUSED_KEY, null);
      if (paused && MODE_META[paused.mode] && Number.isFinite(paused.remainingSeconds) && paused.remainingSeconds > 0 && paused.remainingSeconds <= paused.totalSeconds) {
        activeSession = paused.activeSession || null;
        setMode(paused.mode);
        state.totalSeconds = paused.totalSeconds;
        state.remainingSeconds = paused.remainingSeconds;
        if (activeSession) window.trackerUI.restoreFocus(activeSession);
        render();
      }
      return;
    }
    if (!saved.mode || typeof saved.endTime !== "number") return;
    if (saved.mode !== "work" && saved.mode !== "break" && saved.mode !== "longBreak") return;

    const now = Date.now();
    activeSession = saved.activeSession || (saved.mode === "work" ? { id: `recovered-${saved.endTime}`, taskId: null, taskTitle: "", startedAt: new Date(saved.endTime - modeMinutes(saved.mode) * 60000).toISOString() } : null);
    setMode(saved.mode);
    if (Number.isFinite(saved.totalSeconds) && saved.totalSeconds > 0) state.totalSeconds = saved.totalSeconds;
    if (activeSession) window.trackerUI.restoreFocus(activeSession);
    if (saved.endTime > now) {
      state.remainingSeconds = Math.max(1, Math.ceil((saved.endTime - now) / 1000));
      startTimer();
    } else {
      state.endTime = saved.endTime;
      state.remainingSeconds = 0;
      completePhase(true);
    }
  }

  function computeStats(type) {
    const history = loadHistory();
    const counts = {};
    const minutes = {};
    history.forEach((entry) => {
      const k = toDateKey(entry);
      counts[k] = (counts[k] || 0) + 1;
      minutes[k] = (minutes[k] || 0) + entryMinutes(entry);
    });

    const entries = [];
    let sessionsTotal = 0;
    let minutesTotal = 0;

    if (type === "daily") {
      const todayKey = localDateKey();
      sessionsTotal = counts[todayKey] || 0;
      minutesTotal = minutes[todayKey] || 0;
      const hourCounts = new Array(24).fill(0);
      history.forEach((entry) => {
        if (toDateKey(entry) === todayKey) {
          const h = entry && typeof entry === "object" && entry.t
            ? new Date(entry.t).getHours()
            : new Date().getHours();
          hourCounts[h] += 1;
        }
      });
      hourCounts.forEach((c, h) => {
        entries.push({ label: h % 4 === 0 ? `${h}h` : "", count: c });
      });
    } else if (type === "weekly") {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const k = localDateKey(d);
        const count = counts[k] || 0;
        sessionsTotal += count;
        minutesTotal += minutes[k] || 0;
        entries.push({ label: weekdayLetter(d), count });
      }
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const todayKey = localDateKey();
      for (let day = 1; day <= lastDay; day++) {
        const k = localDateKey(new Date(year, month, day));
        if (k > todayKey) break;
        const count = counts[k] || 0;
        sessionsTotal += count;
        minutesTotal += minutes[k] || 0;
        entries.push({ label: String(day), count });
      }
    }

    return { entries, sessionsTotal, minutesTotal };
  }

  function renderBars(entries) {
    chartEl.classList.remove("line");
    const max = Math.max(1, ...entries.map((e) => e.count));
    chartEl.innerHTML = entries
      .map(
        (e) => `
          <div class="bar-col" title="${i18n.count("unit.session", e.count)}">
            <span class="bar-val">${e.count || ""}</span>
            <div class="bar-fill" style="height: ${Math.round((e.count / max) * 100)}%"></div>
            <span class="bar-label">${e.label}</span>
          </div>`
      )
      .join("");
  }

  function renderLine(entries) {
    chartEl.classList.add("line");
    const w = 340;
    const h = 150;
    const pad = { top: 10, right: 10, bottom: 22, left: 10 };
    const innerW = w - pad.left - pad.right;
    const innerH = h - pad.top - pad.bottom;
    const max = Math.max(1, ...entries.map((e) => e.count));
    const n = entries.length;
    const stepX = n > 1 ? innerW / (n - 1) : 0;

    const points = entries.map((e, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + innerH - (e.count / max) * innerH;
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });

    const polyline = points.map((p) => `${p[0]},${p[1]}`).join(" ");
    const dots = points
      .map(
        (p, i) =>
          `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--accent)" ${
            entries[i].count > 0 ? "" : 'opacity="0.25"'
          }/>`
      )
      .join("");

    const labels = entries
      .map((e, i) => {
        const day = i + 1;
        if (i === 0 || day % 5 === 0 || i === n - 1) {
          return `<text x="${points[i][0]}" y="${h - 6}" class="line-label" text-anchor="middle">${day}</text>`;
        }
        return "";
      })
      .join("");

    chartEl.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="line-chart">
      <polyline points="${polyline}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}${labels}
    </svg>`;
  }

  function renderStats(type) {
    const { entries, sessionsTotal, minutesTotal } = computeStats(type);
    if (type === "monthly") renderLine(entries);
    else renderBars(entries);

    const s = i18n.count("unit.session", sessionsTotal);
    const m = t("unit.minFocus", { n: minutesTotal });
    const [summaryKey, emptyKey] = SUMMARY_KEYS[type] || SUMMARY_KEYS.daily;
    chartSummaryEl.textContent = sessionsTotal === 0 ? t(emptyKey) : t(summaryKey, { sessions: s, minutes: m });
  }

  function openStats() {
    renderStats(currentTab);
    if (window.desktopUI) { window.desktopUI.show("stats"); return; }
    statsModal.hidden = false;
  }

  function toggleStats() {
    if (statsModal.hidden) openStats();
    else if (window.desktopUI) window.desktopUI.show("focus");
    else statsModal.hidden = true;
  }

  function openSettings() {
    if (window.desktopUI) { window.desktopUI.show("settings"); return; }
    settingsModal.hidden = false;
  }

  function applyTheme() {
    document.documentElement.dataset.theme = settings.theme || "tomato";
    document.querySelectorAll(".theme-swatch").forEach((s) => {
      s.classList.toggle("active", s.dataset.theme === settings.theme);
    });
  }

  function effectiveAppearance() {
    if (settings.appearance === "dark") return "dark";
    if (settings.appearance === "light") return "light";
    return prefersDark.matches ? "dark" : "light";
  }

  function applyAppearance() {
    document.documentElement.dataset.mode = effectiveAppearance();
    document.querySelectorAll(".mode-swatch").forEach((s) => {
      s.classList.toggle("active", s.dataset.mode === settings.appearance);
    });
  }

  function applyWindowSize() {
    const mini = settings.size === "mini";
    document.body.classList.toggle("mini", mini);
    if (window.pomodoroWindowSize && window.pomodoroWindowSize.set) {
      window.pomodoroWindowSize.set(mini ? "mini" : "normal");
    }
  }

  function setWindowSize(size) {
    if (size === "mini" && window.trackerUI.hasPending()) { window.trackerUI.resumePending(); return; }
    settings.size = size === "mini" ? "mini" : "normal";
    save(SETTINGS_KEY, settings);
    applyWindowSize();
    if (window.desktopUI) window.desktopUI.show("focus");
    else { settingsModal.hidden = true; statsModal.hidden = true; }
  }

  function buildThemePicker() {
    Object.keys(THEMES).forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "theme-swatch";
      btn.style.background = THEMES[key].swatch;
      btn.title = t(THEMES[key].nameKey);
      btn.dataset.theme = key;
      btn.addEventListener("click", () => {
        settings.theme = key;
        save(SETTINGS_KEY, settings);
        applyTheme();
      });
      themePicker.appendChild(btn);
    });
  }

  function buildModePicker() {
    Object.keys(APPEARANCES).forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "theme-swatch mode-swatch";
      btn.textContent = APPEARANCES[key].symbol;
      btn.title = t(APPEARANCES[key].nameKey);
      btn.dataset.mode = key;
      btn.addEventListener("click", () => {
        settings.appearance = key;
        save(SETTINGS_KEY, settings);
        applyAppearance();
      });
      modePicker.appendChild(btn);
    });
  }

  function refreshPickerLabels() {
    themePicker.querySelectorAll(".theme-swatch").forEach((btn) => {
      if (THEMES[btn.dataset.theme]) btn.title = t(THEMES[btn.dataset.theme].nameKey);
    });
    modePicker.querySelectorAll(".mode-swatch").forEach((btn) => {
      if (APPEARANCES[btn.dataset.mode]) btn.title = t(APPEARANCES[btn.dataset.mode].nameKey);
    });
  }

  function refreshLabels() {
    applyModeMeta();
    updateStartButton();
    renderSessions();
    refreshPickerLabels();
    renderStats(currentTab);
    render();
  }

  function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function applySettings() {
    settings = {
      ...settings,
      workMin: clampInt(workMinInput.value, 1, 120, DEFAULT_SETTINGS.workMin),
      breakMin: clampInt(breakMinInput.value, 1, 60, DEFAULT_SETTINGS.breakMin),
      longBreakEvery: clampInt(longEveryInput.value, 2, 8, DEFAULT_SETTINGS.longBreakEvery),
      longBreakMin: clampInt(longMinInput.value, 5, 60, DEFAULT_SETTINGS.longBreakMin),
      sound: soundToggle.checked,
      notif: notifToggle.checked,
    };
    save(SETTINGS_KEY, settings);
    if (!state.running && !activeSession) setMode(state.mode);
  }

  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (window.desktopUI) { window.desktopUI.show("focus"); return; }
        if (!settingsModal.hidden) settingsModal.hidden = true;
        if (!statsModal.hidden) statsModal.hidden = true;
        return;
      }

      const tag = e.target && e.target.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target && e.target.isContentEditable);
      if (typing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (window.desktopUI && window.desktopUI.current() !== "focus" && e.code !== "KeyS") return;

      if (e.code === "Space") {
        if (tag === "BUTTON") return;
        e.preventDefault();
        toggleStart();
      } else if (e.code === "KeyR") {
        resetTimer();
      } else if (e.code === "KeyS") {
        toggleStats();
      }
    });
  }

  function init() {
    workMinInput.value = settings.workMin;
    breakMinInput.value = settings.breakMin;
    longEveryInput.value = settings.longBreakEvery;
    longMinInput.value = settings.longBreakMin;
    soundToggle.checked = settings.sound;
    notifToggle.checked = settings.notif;
    languageSelect.value = i18n.getLang();
    settings.language = i18n.getLang();

    languageSelect.addEventListener("change", () => {
      const lang = languageSelect.value;
      if (!i18n.setLang(lang)) {
        languageSelect.value = i18n.getLang();
        return;
      }
      settings.language = i18n.getLang();
      save(SETTINGS_KEY, settings);
    });
    if (window.pomodoroLanguage && window.pomodoroLanguage.set) window.pomodoroLanguage.set(i18n.getLang());
    document.addEventListener("languagechange", refreshLabels);

    buildThemePicker();
    buildModePicker();
    applyTheme();
    applyAppearance();
    applyWindowSize();
    renderSessions();
    setMode(state.mode);
    updateStartButton();

    btnStart.addEventListener("click", toggleStart);
    btnReset.addEventListener("click", resetTimer);
    btnSkip.addEventListener("click", skipPhase);

    btnMini.addEventListener("click", () => setWindowSize("mini"));
    btnExpand.addEventListener("click", () => setWindowSize("normal"));

    btnSettings.addEventListener("click", openSettings);
    btnStats.addEventListener("click", openStats);
    closeSettings.addEventListener("click", () => window.desktopUI ? window.desktopUI.show("focus") : (settingsModal.hidden = true));
    closeStats.addEventListener("click", () => window.desktopUI ? window.desktopUI.show("focus") : (statsModal.hidden = true));

    settingsModal.addEventListener("click", (e) => {
      if (!window.desktopUI && e.target === settingsModal) settingsModal.hidden = true;
    });
    statsModal.addEventListener("click", (e) => {
      if (!window.desktopUI && e.target === statsModal) statsModal.hidden = true;
    });

    [workMinInput, breakMinInput, longEveryInput, longMinInput, soundToggle, notifToggle].forEach(
      (el) => el.addEventListener("change", applySettings)
    );

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
        currentTab = btn.dataset.tab;
        renderStats(currentTab);
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state.running) tick();
    });

    prefersDark.addEventListener("change", () => {
      if (settings.appearance === "system") applyAppearance();
    });

    if (window.pomodoroTray) {
      window.pomodoroTray.onCommand((command) => {
        if (command === "toggle") toggleStart();
        else if (command === "reset") resetTimer();
        else if (command === "stats") toggleStats();
      });
    }

    initShortcuts();
    restoreRuntime();
    if (window.trackerUI.hasPending()) {
      if (settings.size === "mini") setWindowSize("normal");
      window.trackerUI.resumePending();
    }
  }

  init();

  if (isTest) {
    window.__pomodoroTest = {
      getState: () => ({
        mode: state.mode,
        running: state.running,
        remainingSeconds: state.remainingSeconds,
        totalSeconds: state.totalSeconds,
      }),
      getSettings: () => ({ ...settings }),
      getCalls: () => ({ ...testLog }),
      fastForward: (ms) => {
        if (state.running && state.endTime) {
          state.endTime -= ms;
          tick();
        }
      },
      completeNow: (silent = true) => {
        state.remainingSeconds = 0;
        completePhase(silent);
      },
    };
  }
})();
