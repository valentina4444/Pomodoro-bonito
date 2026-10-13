(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const t = window.i18n.t;
  const views = { focus: "focus-view", tasks: "tasks-modal", journal: "journal-modal", stats: "stats-modal", settings: "settings-modal" };
  const titles = { focus: ["view.focus.title", "view.focus.subtitle"], tasks: ["view.tasks.title", "view.tasks.subtitle"], journal: ["view.journal.title", "view.journal.subtitle"], stats: ["view.stats.title", "view.stats.subtitle"], settings: ["view.settings.title", "view.settings.subtitle"] };
  let current = "focus";
  let previous = "focus";
  const scrollPositions = {};
  const shell = document.createElement("div"); shell.className = "app-shell";
  shell.innerHTML = `<aside class="sidebar"><div class="app-brand"><span class="brand-fruit" aria-hidden="true">🍅</span><div data-i18n-html="brand.line">Pomodoro<span>Cute little focus club</span></div></div><nav class="desktop-nav" aria-label="Main navigation" data-i18n-aria="shell.mainNavAria"><button class="utility-btn nav-button" id="btn-focus">🌷 <span data-i18n="nav.focus">Focus</span></button></nav><div class="sidebar-note"><span aria-hidden="true">🌱</span><p data-i18n-html="shell.sidebarNote">Small steps.<br>Lovely progress.</p></div><button class="utility-btn nav-button" id="desktop-mini" title="Open the tiny timer">⤢ <span data-i18n="shell.tinyTimer">Tiny timer</span></button></aside><div class="desktop-main"><header class="workspace-header"><div><p class="eyebrow" id="desktop-date"></p><h1 id="workspace-title"></h1><p id="workspace-subtitle"></p></div><span class="header-sticker" aria-hidden="true">✿</span></header><div class="app-layout"><div class="timer-dock"></div><main class="workspace" id="workspace"><section class="workspace-view" id="focus-view" aria-label="Focus dashboard" data-i18n-aria="region.focus"><div class="welcome-card"><div><p class="eyebrow" data-i18n="welcome.eyebrow">YOUR COZY CORNER</p><h2 data-i18n-html="welcome.headline">One tomato.<br>One little win.</h2><p data-i18n-html="welcome.body">You don't have to do it all.<br>Just the next small thing.</p><p class="motivational-phrase" id="motivational-phrase"></p><button class="utility-btn" id="plan-task" data-i18n="welcome.plan">＋ Plan a little task</button></div><div class="garden-illustration" aria-hidden="true"><span class="garden-sparkle sparkle-one">✦</span><span class="garden-sparkle sparkle-two">✿</span><div class="plant-stem"></div><div class="plant-leaf leaf-left"></div><div class="plant-leaf leaf-right"></div><div class="plant-pot"><span>•ᴗ•</span></div><div class="garden-ground"></div></div></div><div class="today-heading"><h2 data-i18n="today.title">Today's little wins</h2><span id="today-label"></span></div><div class="today-cards"><div class="today-card"><span>🍅</span><strong id="today-sessions">0</strong><small data-i18n="today.sessions">focus sessions</small></div><div class="today-card"><span>☁️</span><strong id="today-minutes">0 min</strong><small data-i18n="today.minutes">time well spent</small></div><div class="today-card"><span>🌼</span><strong id="today-completed">0</strong><small data-i18n="today.completed">tasks completed</small></div></div><div class="next-task-panel"><div class="today-heading"><h2 data-i18n="next.title">Up next</h2><button class="text-button" id="all-tasks" data-i18n="next.seeAll">See all tasks →</button></div><div id="next-tasks"></div></div><p class="desktop-footer" data-i18n="shell.footer">A gentle reminder: taking a break is part of the work. ♡</p></section></main></div></div>`;
  document.body.prepend(shell);
  i18n.apply();
  document.querySelector(".timer-dock").append(document.querySelector(".card"));
  const nav = document.querySelector(".desktop-nav");
  for (const name of ["tasks", "journal", "stats", "settings"]) {
    const button = $("btn-" + name); button.classList.add("nav-button"); nav.append(button);
    const panel = $(views[name]); panel.classList.add("workspace-view"); panel.classList.remove("modal-overlay");
    panel.querySelector(".modal").classList.add("view-content");
    panel.querySelector(".modal").removeAttribute("aria-modal");
    panel.querySelector(".modal").setAttribute("role", "region");
    const back = panel.querySelector(".modal-close");
    back.textContent = "←";
    $("workspace").append(panel);
  }
  const mini = $("btn-mini"); mini.classList.add("nav-button");
  mini.innerHTML = `⤢ <span data-i18n="shell.tinyTimer">Tiny timer</span>`;
  $("desktop-mini").replaceWith(mini);

  function decorateViews() {
    const names = Object.keys(views);
    for (const name of names) {
      const panel = $(views[name]);
      const modal = panel.querySelector(".modal");
      if (modal) modal.setAttribute("aria-label", t("region." + name));
      const back = panel.querySelector(".modal-close");
      if (back) { back.title = t("shell.back"); back.setAttribute("aria-label", t("shell.back")); }
      const button = $("btn-" + name);
      button.title = `${t("navName." + name)} · Ctrl+${names.indexOf(name) + 1}`;
      button.setAttribute("aria-keyshortcuts", `Control+${names.indexOf(name) + 1}`);
    }
    mini.title = t("shell.tinyTimer"); mini.setAttribute("aria-label", t("shell.tinyTimer"));
  }

  function refreshPhrase() {
    const el = $("motivational-phrase");
    if (el && window.phrases) el.textContent = window.phrases.pick(window.i18n.getLang());
  }

  function show(name, focus = false) {
    if (!views[name]) name = "focus";
    if (document.body.dataset.view && document.querySelector("#task-modal:not([hidden]), #completion-modal:not([hidden])")) return;
    if (name !== current) { scrollPositions[current] = $("workspace").scrollTop; previous = current; }
    current = name;
    for (const [key, id] of Object.entries(views)) {
      $(id).hidden = key !== name;
      const button = $("btn-" + key);
      button.classList.toggle("nav-active", key === name);
      button.setAttribute("aria-current", key === name ? "page" : "false");
    }
    $("workspace-title").textContent = t(titles[name][0]);
    $("workspace-subtitle").textContent = t(titles[name][1]);
    document.body.dataset.view = name;
    $("workspace").scrollTop = scrollPositions[name] || 0;
    try { localStorage.setItem("pomodoro_view", name); } catch { /* Navigation remains usable without storage. */ }
    if (focus) $(views[name]).querySelector("input, button, select")?.focus();
  }
  function refresh() {
    const store = window.workTracker;
    const today = store.dateKey();
    const data = store.getData();
    const sessions = store.entries(today, today);
    $("desktop-date").textContent = new Date().toLocaleDateString(window.i18n.locale(), { weekday: "long", month: "long", day: "numeric" });
    $("today-label").textContent = t("today.label");
    $("today-sessions").textContent = sessions.length;
    $("today-minutes").textContent = `${store.minutes(sessions.reduce((n, s) => n + s.duration, 0))} min`;
    $("today-completed").textContent = data.tasks.filter(t => t.completedAt && store.dateKey(t.completedAt) === today).length;
    const list = $("next-tasks"); list.replaceChildren();
    const tasks = data.tasks.filter(t => t.status !== "completed").sort((a, b) => (a.status === "in_progress" ? 0 : 1) - (b.status === "in_progress" ? 0 : 1)).slice(0, 3);
    if (!tasks.length) {
      const empty = document.createElement("p"); empty.className = "dashboard-empty"; empty.textContent = t("next.empty"); list.append(empty);
    }
    tasks.forEach(task => {
      const row = document.createElement("div"); row.className = "next-task";
      const dot = document.createElement("span"); dot.className = `task-status-dot ${task.status}`;
      const title = document.createElement("button"); title.className = "text-button next-task-title"; title.textContent = task.title;
      title.addEventListener("click", () => { show("tasks"); window.trackerUI.showTask(task.id); });
      const focus = document.createElement("button"); focus.className = "utility-btn"; focus.textContent = t("next.focus");
      focus.addEventListener("click", () => {
        if ($("focus-task").disabled) { window.trackerUI.error(t("tracker.finishFirst")); return; }
        $("focus-task").value = task.id; $("btn-start").focus();
      });
      row.append(dot, title, focus); list.append(row);
    });
  }
  $("btn-focus").addEventListener("click", () => show("focus"));
  decorateViews();
  $("plan-task").addEventListener("click", () => { $("btn-tasks").click(); $("new-task-title").focus(); });
  $("all-tasks").addEventListener("click", () => $("btn-tasks").click());
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && ["1", "2", "3", "4", "5"].includes(e.key)) {
      e.preventDefault(); const name = Object.keys(views)[Number(e.key) - 1]; $("btn-" + name).click();
    } else if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); $("btn-" + previous).click(); }
  });
  document.addEventListener("languagechange", () => {
    decorateViews();
    $("workspace-title").textContent = t(titles[current][0]);
    $("workspace-subtitle").textContent = t(titles[current][1]);
    refresh();
    refreshPhrase();
  });
  window.addEventListener("tracker-change", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setInterval(refresh, 60000);
  window.desktopUI = { show, current: () => current, refreshPhrase };
  let saved = "focus";
  try { saved = localStorage.getItem("pomodoro_view") || "focus"; } catch { /* default */ }
  show(saved); refresh(); refreshPhrase();
  if (saved === "stats") $("btn-stats").click();
})();
