const { test, expect, _electron: electron } = require("@playwright/test");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MAIN = path.join(ROOT, "src/core/main.js");
const ELECTRON_BINARY = require("electron");

function makeUserDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pomocute-test-"));
}

async function launch(userData) {
  const app = await electron.launch({
    args: [MAIN],
    cwd: ROOT,
    env: {
      ...process.env,
      POMODORO_TEST: "1",
      POMODORO_TEST_USERDATA: userData || makeUserDataDir(),
    },
  });
  const page = await app.firstWindow();
  await page.waitForSelector("#time-display");
  await page.waitForFunction(() => !!window.__pomodoroTest);
  return { app, page };
}

async function closeSafely(app) {
  if (!app) return;
  try {
    await Promise.race([
      app.close(),
      new Promise((resolve) => {
        setTimeout(() => {
          try {
            app.process().kill();
          } catch {
            /* already dead */
          }
          resolve();
        }, 5000);
      }),
    ]);
  } catch {
    /* ignore close errors */
  }
}

async function withApp(userData, fn) {
  const ctx = await launch(userData);
  try {
    await fn(ctx);
  } finally {
    await closeSafely(ctx.app);
  }
}

async function openSettings(page) {
  if (await page.locator("#completion-modal").isVisible()) await page.click('[data-close="completion-modal"]');
  await page.click("#btn-settings");
  await expect(page.locator("#settings-modal")).toBeVisible();
}

async function closeSettings(page) {
  await page.click("#close-settings");
  await expect(page.locator("#settings-modal")).toBeHidden();
}

function todayKeyInPage(page) {
  return page.evaluate(() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
}

test("boot state", async () => {
  await withApp(null, async ({ page }) => {
    await expect(page.locator("#time-display")).toHaveText("25:00");
    await expect(page.locator("#timer-mode")).toHaveText("WORK");
    await expect(page.locator("#mode-label")).toHaveText("Time to focus!");
    await expect(page.locator("#btn-start")).toHaveText("Start");
    const st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st).toMatchObject({ mode: "work", running: false, totalSeconds: 1500 });
    expect(st.remainingSeconds).toBe(1500);
  });
});

test("start, pause and reset", async () => {
  await withApp(null, async ({ page }) => {
    await page.click("#btn-start");
    await expect(page.locator("#btn-start")).toHaveText("Pause");
    let st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.running).toBe(true);

    await page.waitForTimeout(2100);
    st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.remainingSeconds).toBeLessThan(st.totalSeconds);

    const hasRuntime = await page.evaluate(() => !!localStorage.getItem("pomodoro_runtime"));
    expect(hasRuntime).toBe(true);

    await page.click("#btn-start");
    await expect(page.locator("#btn-start")).toHaveText("Start");
    st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.running).toBe(false);

    const runtime = await page.evaluate(() => localStorage.getItem("pomodoro_runtime"));
    expect(runtime).toBeNull();

    await page.click("#btn-reset");
    st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.remainingSeconds).toBe(st.totalSeconds);
  });
});

test("completing work advances to break and records the session", async () => {
  await withApp(null, async ({ page }) => {
    await page.click("#btn-start");
    await page.evaluate(() => window.__pomodoroTest.fastForward(25 * 60 * 1000));
    await expect(page.locator("#timer-mode")).toHaveText("BREAK");

    const calls = await page.evaluate(() => window.__pomodoroTest.getCalls());
    expect(calls.notifications.length).toBe(1);
    expect(calls.notifications[0].title).toContain("Great job");
    expect(calls.chimes).toBe(1);

    const sessions = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_sessions"))
    );
    expect(sessions.count).toBe(1);
    expect(sessions.cycle).toBe(1);

    const history = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_work_tracker"))
    ).sessions;
    expect(history.length).toBe(1);
    expect(history[0]).toMatchObject({ duration: 1500, taskId: null, notes: "" });
    expect(history[0].completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const runtime = await page.evaluate(() => localStorage.getItem("pomodoro_runtime"));
    expect(runtime).toBeNull();
  });
});

test("long break triggers after every N sessions", async () => {
  await withApp(null, async ({ page }) => {
    await openSettings(page);
    await page.fill("#long-every", "2");
    await closeSettings(page);

    const complete = () => page.evaluate(() => window.__pomodoroTest.completeNow(true));

    await complete();
    await expect(page.locator("#timer-mode")).toHaveText("BREAK");
    await complete();
    await expect(page.locator("#timer-mode")).toHaveText("WORK");
    await complete();
    await expect(page.locator("#timer-mode")).toHaveText("LONG BREAK");
    await expect(page.locator("#mascot")).toHaveText("🌴");
    await complete();
    await expect(page.locator("#timer-mode")).toHaveText("WORK");

    const sessions = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_sessions"))
    );
    expect(sessions.count).toBe(2);
    expect(sessions.cycle).toBe(0);
  });
});

test("running timer resumes after a full restart", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "pomodoro_runtime",
        JSON.stringify({ mode: "work", endTime: Date.now() + 600000 })
      );
    });
  });

  await withApp(userData, async ({ page }) => {
    const st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.running).toBe(true);
    expect(st.mode).toBe("work");
    expect(st.remainingSeconds).toBeGreaterThan(595);
    expect(st.remainingSeconds).toBeLessThanOrEqual(600);
  });
});

test("session finished while closed is counted on next launch", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    const today = await todayKeyInPage(page);
    await page.evaluate(
      ({ today }) => {
        localStorage.setItem(
          "pomodoro_runtime",
          JSON.stringify({ mode: "work", endTime: Date.now() - 5000 })
        );
        localStorage.setItem(
          "pomodoro_sessions",
          JSON.stringify({ date: today, count: 0, cycle: 0 })
        );
      },
      { today }
    );
  });

  await withApp(userData, async ({ page }) => {
    const st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.running).toBe(false);
    expect(st.mode).toBe("break");

    const sessions = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_sessions"))
    );
    expect(sessions.count).toBe(1);

    const history = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_work_tracker"))
    ).sessions;
    expect(history.length).toBe(1);

    const calls = await page.evaluate(() => window.__pomodoroTest.getCalls());
    expect(calls.notifications.length).toBe(0);
    expect(calls.chimes).toBe(0);
  });
});

test("daily stats show only today; weekly and monthly render", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    const today = await todayKeyInPage(page);
    const yesterday = new Date(Date.now() - 86400000);
    const p = (n) => String(n).padStart(2, "0");
    const yKey = `${yesterday.getFullYear()}-${p(yesterday.getMonth() + 1)}-${p(yesterday.getDate())}`;
    await page.evaluate(
      ({ today, yesterday, yKey }) => {
        localStorage.removeItem("pomodoro_work_tracker");
        localStorage.setItem(
          "pomodoro_history",
          JSON.stringify([
            { d: today, t: Date.now(), m: 25 },
            { d: today, t: Date.now() - 3600000, m: 25 },
            { d: yKey, t: yesterday, m: 50 },
          ])
        );
      },
      { today, yesterday: yesterday.getTime(), yKey }
    );
  });

  await withApp(userData, async ({ page }) => {
    await page.click("#btn-stats");
    await expect(page.locator("#stats-modal")).toBeVisible();

    await expect(page.locator("#chart-summary")).toContainText("Today");
    await expect(page.locator("#chart-summary")).toContainText("2 sessions");
    await expect(page.locator("#chart-summary")).toContainText("50 min focus");
    expect(await page.locator(".chart-wrap .bar-fill").count()).toBe(24);

    await page.click('.tab-btn[data-tab="weekly"]');
    await expect(page.locator("#chart-summary")).toContainText("This week");
    expect(await page.locator(".chart-wrap .bar-fill").count()).toBe(7);

    await page.click('.tab-btn[data-tab="monthly"]');
    await expect(page.locator("#chart-summary")).toContainText("This month");
    await expect(page.locator(".chart-wrap.line svg")).toBeVisible();
    expect(await page.locator(".chart-wrap .bar-fill").count()).toBe(0);
  });
});

test("daily stats are today-only", async () => {
  await withApp(null, async ({ page }) => {
    const y = new Date(Date.now() - 86400000);
    const p = (n) => String(n).padStart(2, "0");
    const yKey = `${y.getFullYear()}-${p(y.getMonth() + 1)}-${p(y.getDate())}`;
    await page.evaluate(
      ({ yKey, t }) =>
        localStorage.setItem(
          "pomodoro_history",
          JSON.stringify([{ d: yKey, t, m: 25 }, { d: yKey, t: t + 1000, m: 25 }])
        ),
      { yKey, t: y.getTime() }
    );
    await page.evaluate(() => localStorage.removeItem("pomodoro_work_tracker"));
    await page.reload();
    await page.waitForFunction(() => !!window.__pomodoroTest);
    await page.click("#btn-stats");
    await expect(page.locator("#chart-summary")).toContainText("No sessions yet today");
    expect(await page.locator(".chart-wrap .bar-fill").count()).toBe(24);
  });
});

test("theme and appearance switch and persist", async () => {
  await withApp(null, async ({ page }) => {
    await openSettings(page);

    await page.click('#theme-picker .theme-swatch[data-theme="blueberry"]');
    let theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("blueberry");

    await page.click('#mode-picker .mode-swatch[data-mode="dark"]');
    let mode = await page.evaluate(() => document.documentElement.dataset.mode);
    expect(mode).toBe("dark");

    const stored = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_settings"))
    );
    expect(stored).toMatchObject({ theme: "blueberry", appearance: "dark" });

    await closeSettings(page);
  });
});

test("keyboard shortcuts", async () => {
  await withApp(null, async ({ page }) => {
    await page.keyboard.press("Space");
    await expect(page.locator("#btn-start")).toHaveText("Pause");
    await page.keyboard.press("Space");
    await expect(page.locator("#btn-start")).toHaveText("Start");

    await page.keyboard.press("KeyS");
    await expect(page.locator("#stats-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#stats-modal")).toBeHidden();

    await page.keyboard.press("KeyR");
    const st = await page.evaluate(() => window.__pomodoroTest.getState());
    expect(st.remainingSeconds).toBe(st.totalSeconds);
  });
});

test("sound and notification toggles are honored", async () => {
  await withApp(null, async ({ page }) => {
    await page.evaluate(() => window.__pomodoroTest.completeNow(false));
    let calls = await page.evaluate(() => window.__pomodoroTest.getCalls());
    expect(calls.chimes).toBe(1);
    expect(calls.notifications.length).toBe(1);

    await openSettings(page);
    await page.click("#sound-toggle");
    await closeSettings(page);
    await page.evaluate(() => window.__pomodoroTest.completeNow(false));
    calls = await page.evaluate(() => window.__pomodoroTest.getCalls());
    expect(calls.chimes).toBe(1);
    expect(calls.notifications.length).toBe(2);

    await openSettings(page);
    await page.click("#sound-toggle");
    await closeSettings(page);
    await page.evaluate(() => window.__pomodoroTest.completeNow(false));
    calls = await page.evaluate(() => window.__pomodoroTest.getCalls());
    expect(calls.chimes).toBe(2);
  });
});

test("mini mode shows only timer + pause, resizes, and persists", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await page.click("#btn-mini");
    await expect(page.locator("body")).toHaveClass(/mini/);
    await expect(page.locator("#btn-expand")).toBeVisible();
    await expect(page.locator("#btn-start")).toBeVisible();
    await expect(page.locator("#btn-settings")).toBeHidden();
    await expect(page.locator(".mascot")).toBeHidden();

    const width = await page.evaluate(() => window.outerWidth);
    const height = await page.evaluate(() => window.outerHeight);
    expect(width).toBeLessThan(260);
    expect(height).toBeLessThan(260);

    let st = await page.evaluate(() => window.__pomodoroTest.getSettings());
    expect(st.size).toBe("mini");

    await page.click("#btn-expand");
    await expect(page.locator("body")).not.toHaveClass(/mini/);
    await expect(page.locator("#btn-settings")).toBeVisible();

    st = await page.evaluate(() => window.__pomodoroTest.getSettings());
    expect(st.size).toBe("normal");

    await page.click("#btn-mini");
  });

  await withApp(userData, async ({ page }) => {
    await expect(page.locator("body")).toHaveClass(/mini/);
    await expect(page.locator("#btn-expand")).toBeVisible();
    const st = await page.evaluate(() => window.__pomodoroTest.getSettings());
    expect(st.size).toBe("mini");
  });
});

test("settings persist across restart and are clamped", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await openSettings(page);
    await page.fill("#work-min", "7");
    await closeSettings(page);
    await expect(page.locator("#time-display")).toHaveText("07:00");

    await openSettings(page);
    await page.fill("#work-min", "999");
    await closeSettings(page);
    const stored = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_settings"))
    );
    expect(stored.workMin).toBe(120);
    await expect(page.locator("#time-display")).toHaveText("120:00");
  });

  await withApp(userData, async ({ page }) => {
    const stored = JSON.parse(
      await page.evaluate(() => localStorage.getItem("pomodoro_settings"))
    );
    expect(stored.workMin).toBe(120);
    await expect(page.locator("#time-display")).toHaveText("120:00");
  });
});

test("task workflow, journal, history snapshots, and native exports persist after restart", async () => {
  const userData = makeUserDataDir();
  let taskId;
  await withApp(userData, async ({ page, app }) => {
    await page.click("#btn-tasks");
    await page.fill("#new-task-title", "Write proposal");
    await page.locator("#quick-task button").click();
    const card = page.locator(".task-card");
    await expect(card).toHaveCount(1);
    await page.screenshot({ path: path.join(userData, "board.png") });
    taskId = await card.getAttribute("data-task-id");
    await card.locator("select").selectOption("in_progress");
    await expect(page.locator('[data-status="in_progress"] .task-title')).toHaveText("Write proposal");
    await card.getByText("Focus on this").click();
    await expect(page.locator("#focus-task")).toHaveValue(taskId);
    await page.click("#btn-start");
    await expect(page.locator("#focus-task")).toBeDisabled();
    await page.evaluate(() => window.__pomodoroTest.fastForward(1500000));
    await expect(page.locator("#completion-modal")).toBeVisible();
    await expect(page.locator("#completion-task")).toHaveValue(taskId);
    await page.screenshot({ path: path.join(userData, "completion.png") });
    await page.fill("#session-notes", 'Drafted intro, scope and "timeline".\nNext: budget.');
    await page.check("#complete-task");
    await page.locator("#completion-form button").click();
    await page.click("#btn-tasks");
    await expect(page.locator('[data-status="completed"] .task-title')).toHaveText("Write proposal");
    await expect(card).toContainText("1 🍅 · 25 min focus");
    await card.locator(".task-title").click();
    await expect(page.locator("#task-history")).toContainText("Drafted intro");
    await page.fill("#task-title", "Proposal revised");
    await page.selectOption("#task-status", "todo");
    await page.locator("#task-form button").click();
    await expect(page.locator('[data-status="todo"] .task-title')).toHaveText("Proposal revised");
    await page.click('[data-close="tasks-modal"]');
    await page.click("#btn-journal");
    await expect(page.locator("#journal-entries")).toContainText("Write proposal");
    await expect(page.locator("#journal-entries")).toContainText("Task completed in this session");
    await page.locator("#journal-entries").getByText("Edit notes").click();
    await expect(page.locator("#completion-modal")).toBeVisible();
    await page.locator("#completion-form button").click();
    expect(await page.evaluate(() => window.workTracker.getData().tasks[0].status)).toBe("todo");
    await page.locator(".export-panel summary").click();
    const today = await todayKeyInPage(page);
    const exportDir = path.join(userData, "exports");
    fs.mkdirSync(exportDir);
    for (const scope of ["day", "week", "month", "all", "custom"]) {
      await page.selectOption("#export-period", scope);
      if (scope === "custom") {
        await page.fill("#export-start", today);
        await page.fill("#export-end", today);
      }
      for (const format of ["md", "csv", "json"]) {
        const filePath = path.join(exportDir, `${scope}.${format}`);
        await app.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, filePath);
        await page.selectOption("#export-format", format);
        await page.click("#export-journal");
        await expect.poll(() => fs.existsSync(filePath)).toBe(true);
        const text = fs.readFileSync(filePath, "utf8");
        expect(text).toContain("Write proposal");
        expect(text).toContain("Drafted intro");
        if (format === "json") expect(JSON.parse(text)[0]).toMatchObject({ taskId, duration: 1500, taskCompleted: true });
        if (format === "csv") expect(text).toContain('""timeline""');
        if (format === "md") expect(text).toContain(`## ${today}`);
      }
    }
    await page.selectOption("#export-period", "custom");
    await page.fill("#export-start", "2027-01-01");
    await page.fill("#export-end", "2026-01-01");
    await page.click("#export-journal");
    await expect(page.locator("#tracker-error")).toContainText("in order");
    await page.click('[data-close="journal-modal"]');
  });
  await withApp(userData, async ({ page }) => {
    const saved = await page.evaluate(() => window.workTracker.getData());
    expect(saved.tasks[0]).toMatchObject({ id: taskId, title: "Proposal revised", status: "todo", completedAt: null });
    expect(saved.sessions[0]).toMatchObject({ taskTitle: "Write proposal", duration: 1500, taskCompleted: true });
    await page.click("#btn-tasks");
    await page.locator(".task-title").click();
    await page.click("#delete-task");
    await expect(page.locator(".task-card")).toHaveCount(0);
    await page.click('[data-close="tasks-modal"]');
    await page.click("#btn-journal");
    await expect(page.locator("#journal-entries")).toContainText("Write proposal");
    await page.locator('[data-period="week"]').click();
    await expect(page.locator("#journal-summary")).toContainText("1 sessions");
    await page.locator('[data-period="month"]').click();
    await expect(page.locator("#journal-summary")).toContainText("1 sessions");
    await page.click("#journal-prev");
    await expect(page.locator("#journal-summary")).toContainText("0 sessions");
    await page.click("#journal-next");
    await expect(page.locator("#journal-summary")).toContainText("1 sessions");
    await page.screenshot({ path: path.join(userData, "journal.png") });
  });
});

test("unassigned completion is saved before notes and recovered exactly once", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await page.click("#btn-start");
    await page.evaluate(() => window.__pomodoroTest.fastForward(1500000));
    const saved = await page.evaluate(() => window.workTracker.getData());
    expect(saved.sessions).toHaveLength(1);
    expect(saved.sessions[0].taskId).toBeNull();
    expect(saved.pendingSessionId).toBe(saved.sessions[0].id);
  });
  await withApp(userData, async ({ page }) => {
    await expect(page.locator("#completion-modal")).toBeVisible();
    await page.locator("#completion-form button").click();
    const saved = await page.evaluate(() => window.workTracker.getData());
    expect(saved.sessions).toHaveLength(1);
    expect(saved.pendingSessionId).toBeNull();
  });
});

test("task-linked paused timer keeps original duration through settings and restart; skip creates no log", async () => {
  const userData = makeUserDataDir();
  let taskId;
  await withApp(userData, async ({ page }) => {
    taskId = await page.evaluate(() => window.workTracker.saveTask(null, "Keep context", "", "todo"));
    await page.selectOption("#focus-task", taskId);
    await page.click("#btn-start");
    await page.evaluate(() => window.__pomodoroTest.fastForward(60000));
    await page.click("#btn-start");
    await openSettings(page);
    await page.fill("#work-min", "7");
    await closeSettings(page);
    await expect(page.locator("#time-display")).toHaveText("24:00");
    await page.evaluate(taskId => window.workTracker.move(taskId, "completed"), taskId);
  });
  await withApp(userData, async ({ page }) => {
    await expect(page.locator("#time-display")).toHaveText("24:00");
    await expect(page.locator("#focus-task")).toHaveValue(taskId);
    await page.click("#btn-start");
    await page.evaluate(() => window.__pomodoroTest.fastForward(1440000));
    await expect(page.locator("#completion-task")).toHaveValue(taskId);
    await page.locator("#completion-form button").click();
    expect(await page.evaluate(() => window.workTracker.getData().sessions[0].duration)).toBe(1500);
    await page.click("#btn-skip");
    await page.click("#btn-start");
    await page.click("#btn-skip");
    expect(await page.evaluate(() => window.workTracker.getData().sessions.length)).toBe(1);
  });
});

test("migration preserves more than 1000 sessions, corrupt store blocks writes and preserves original", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("pomodoro_work_tracker");
      localStorage.setItem("pomodoro_history", JSON.stringify(Array.from({ length: 1005 }, (_, i) => ({ d: "2026-01-02", t: new Date("2026-01-02T12:00:00").getTime() + i * 1000, m: 10 }))));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.__pomodoroTest);
    expect(await page.evaluate(() => window.workTracker.getData().sessions.length)).toBe(1005);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pomodoro_history")).length)).toBe(1005);
    await page.evaluate(() => window.workTracker.saveTask(null, "Backup test", "", "todo"));
    await page.evaluate(() => localStorage.setItem("pomodoro_work_tracker", "broken original"));
    await page.reload();
    await page.waitForFunction(() => !!window.__pomodoroTest);
    await expect(page.locator("#tracker-error")).toContainText("read-only");
    await page.click("#btn-start");
    await expect(page.locator("#btn-start")).toHaveText("Start");
    expect(await page.evaluate(() => localStorage.getItem("pomodoro_work_tracker"))).toBe("broken original");
    expect(await page.evaluate(() => window.workTracker.getData().sessions.length)).toBe(1005);
  });
});

test("offline completion uses scheduled date, task snapshot and stable ID without double counting", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await page.evaluate(() => {
      const taskId = window.workTracker.saveTask(null, "Offline focus", "", "in_progress");
      const endTime = new Date("2026-01-02T23:59:00").getTime();
      const runtime = { mode: "work", endTime, totalSeconds: 600, activeSession: { id: "offline-session", taskId, taskTitle: "Offline focus", startedAt: new Date(endTime - 600000).toISOString() } };
      localStorage.setItem("pomodoro_runtime", JSON.stringify(runtime));
    });
  });
  await withApp(userData, async ({ page }) => {
    await expect(page.locator("#completion-modal")).toBeVisible();
    const saved = await page.evaluate(() => window.workTracker.getData());
    expect(saved.sessions).toHaveLength(1);
    expect(saved.sessions[0]).toMatchObject({ id: "offline-session", taskTitle: "Offline focus", duration: 600 });
    expect(await page.evaluate(() => window.workTracker.dateKey(window.workTracker.getData().sessions[0].completedAt))).toBe("2026-01-02");
    await page.locator("#completion-form button").click();
    // Simulate termination after the canonical log write but before clearing runtime.
    await page.evaluate(() => {
      const session = window.workTracker.getData().sessions[0];
      localStorage.setItem("pomodoro_runtime", JSON.stringify({ mode: "work", endTime: Date.parse(session.completedAt), totalSeconds: session.duration, activeSession: { id: session.id, taskId: session.taskId, taskTitle: session.taskTitle, startedAt: session.startedAt } }));
    });
  });
  await withApp(userData, async ({ page }) => {
    expect(await page.evaluate(() => window.workTracker.getData().sessions.length)).toBe(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pomodoro_sessions")).cycle)).toBe(1);
    await page.click("#btn-journal");
    await page.fill("#journal-date", "2026-01-02");
    await expect(page.locator("#journal-entries")).toContainText("Offline focus");
  });
});

test("full storage reports failed completion and allows retry without losing or duplicating session", async () => {
  await withApp(null, async ({ page }) => {
    await page.click("#btn-start");
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      window.restoreStorage = () => { Storage.prototype.setItem = original; };
      Storage.prototype.setItem = function(key, value) {
        if (key === "pomodoro_work_tracker") throw new DOMException("Full", "QuotaExceededError");
        return original.call(this, key, value);
      };
      window.__pomodoroTest.fastForward(1500000);
    });
    await expect(page.locator("#tracker-error")).toContainText("Could not save");
    await expect(page.locator("#btn-start")).toHaveText("Retry save");
    expect(await page.evaluate(() => window.workTracker.getData().sessions.length)).toBe(0);
    await page.evaluate(() => window.restoreStorage());
    await page.click("#btn-start");
    await expect(page.locator("#completion-modal")).toBeVisible();
    expect(await page.evaluate(() => window.workTracker.getData().sessions.length)).toBe(1);
    await page.locator("#completion-form button").click();
    await expect(page.locator("#tracker-error")).toBeHidden();
  });
});

test("journal ranges cross calendar boundaries and CSV protects formula notes", async () => {
  await withApp(null, async ({ page }) => {
    const result = await page.evaluate(() => {
      const store = window.workTracker;
      return {
        week: store.range("week", "2026-01-01"),
        leap: store.range("month", "2024-02-29"),
        csv: store.exportText("csv", [{ id: "csv", taskId: null, taskTitle: "=SUM(A1)", startedAt: "2026-01-01T12:00:00Z", completedAt: "2026-01-01T12:25:00Z", duration: 1500, notes: '  @danger\n"quoted"', taskCompleted: false }]),
      };
    });
    expect(result.week).toEqual({ start: "2025-12-29", end: "2026-01-04" });
    expect(result.leap).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(result.csv).toContain('"\'=SUM(A1)"');
    expect(result.csv).toContain("'  @danger");
    expect(result.csv).toContain('""quoted""');
  });
});

test("desktop pages, task search and drag movement keep the timer available across window sizes", async ({}, testInfo) => {
  await withApp(null, async ({ page, app }) => {
    await expect(page.locator("#focus-view")).toBeVisible();
    await expect(page.locator("#btn-focus")).toHaveAttribute("aria-current", "page");
    await page.evaluate(() => {
      window.workTracker.saveTask(null, "Sketch a cozy homepage", "Try soft colors and a little plant", "in_progress");
      window.workTracker.saveTask(null, "Read a chapter", "", "todo");
      window.workTracker.saveTask(null, "Send the finished report", "", "completed");
    });
    await page.screenshot({ path: testInfo.outputPath("desktop-focus.png") });
    await page.keyboard.press("Control+2");
    await expect(page.locator("#tasks-modal")).toBeVisible();
    await expect(page.locator("#focus-view")).toBeHidden();
    await expect(page.locator("#btn-start")).toBeVisible();
    await page.fill("#task-search", "cozy");
    await expect(page.locator(".task-card")).toHaveCount(1);
    await page.fill("#task-search", "");
    const task = page.locator('.task-card').filter({ hasText: "Read a chapter" });
    await task.locator(".card-grip").dragTo(page.locator('[data-status="in_progress"]'));
    await expect(page.locator('[data-status="in_progress"]')).toContainText("Read a chapter");
    await page.screenshot({ path: testInfo.outputPath("desktop-tasks.png") });
    await page.click("#btn-start");
    await page.keyboard.press("Control+3");
    await expect(page.locator("#journal-modal")).toBeVisible();
    expect(await page.evaluate(() => window.__pomodoroTest.getState().running)).toBe(true);
    await page.click("#btn-start");
    for (const width of [900, 660, 1180]) {
      await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setBounds({ width, height: 680 }), width);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator("#btn-start")).toBeVisible();
      await expect(page.locator("#btn-tasks")).toBeVisible();
      await expect(page.locator("#journal-date")).toBeVisible();
    }
    await page.click("#btn-focus");
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ width: 660, height: 680 }));
    await page.screenshot({ path: testInfo.outputPath("compact-focus.png") });
    await page.click("#btn-settings");
    await page.click('#mode-picker [data-mode="dark"]');
    await page.click("#btn-focus");
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ width: 1180, height: 780 }));
    await page.waitForTimeout(500); // Finish the theme transition before visual QA.
    await page.screenshot({ path: testInfo.outputPath("dark-focus.png") });
  });
});

test("desktop bounds and last page survive restart and mini mode restores the previous size", async () => {
  const userData = makeUserDataDir();
  let normalBounds;
  await withApp(userData, async ({ page, app }) => {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ width: 1000, height: 660 }));
    normalBounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
    await page.click("#btn-mini");
    await expect(page.locator("body")).toHaveClass(/mini/);
    await page.click("#btn-expand");
    await expect(page.locator("body")).not.toHaveClass(/mini/);
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())).toEqual(normalBounds);
    await page.click("#btn-journal");
  });
  await withApp(userData, async ({ page, app }) => {
    await expect(page.locator("#journal-modal")).toBeVisible();
    const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
    expect(bounds.width).toBe(normalBounds.width);
    expect(bounds.height).toBe(normalBounds.height);
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isResizable())).toBe(true);
  });
});

test("language switches to es-MX, translates the UI, shows a phrase and persists", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await openSettings(page);
    await page.selectOption("#language-select", "es-MX");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
    await expect(page.locator("#btn-start")).toHaveText("Empezar");
    await expect(page.locator("#mode-label")).toHaveText("¡Hora de concentrarte!");
    await expect(page.locator(".title span").first()).toHaveText("Jitomatito Bonito");
    await expect(page.locator("#btn-tasks")).toHaveText("📝 Tareas");
    await expect(page.locator("#settings-modal h2")).toHaveText("⚙ Configuración");
    await expect(page.locator("#workspace-title")).toHaveText("Siéntete como en casa");
    await expect(page.locator("#workspace-subtitle")).toHaveText("Tu ritmo, tus colores, tu rinconcito favorito.");
    await expect(page.locator("#motivational-phrase")).not.toHaveText("");
    const phrase = await page.locator("#motivational-phrase").textContent();
    expect(phrase).toMatch(/jitomatito|poquito|ganitas|bolas|ánimo|rindas|concéntrate|cuenta|sigue/i);
    await page.click("#btn-stats");
    await expect(page.locator("#stats-modal .tab-btn").first()).toHaveText("Diario");
    await expect(page.locator("#chart-summary")).toContainText("Aún no hay sesiones hoy");
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("pomodoro_settings")));
    expect(stored.language).toBe("es-MX");
    const phraseList = await page.evaluate(() => window.phrases.list("es-MX"));
    expect(phraseList.length).toBeGreaterThanOrEqual(5);
    await page.click("#btn-focus");
  });
  await withApp(userData, async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
    await expect(page.locator("#btn-start")).toHaveText("Empezar");
    await expect(page.locator("#motivational-phrase")).not.toHaveText("");
    await openSettings(page);
    await page.selectOption("#language-select", "en");
    await expect(page.locator("#btn-start")).toHaveText("Start");
    await expect(page.locator("#mode-label")).toHaveText("Time to focus!");
    await closeSettings(page);
  });
});

test("a second launch focuses the running app instead of opening a competing profile", async () => {
  const userData = makeUserDataDir();
  await withApp(userData, async ({ page }) => {
    await page.click("#btn-tasks");
    await page.fill("#new-task-title", "Only one me");
    await page.locator("#quick-task button").click();
    await expect(page.locator(".task-card")).toHaveCount(1);

    const second = spawn(ELECTRON_BINARY, [MAIN], {
      cwd: ROOT,
      env: { ...process.env, POMODORO_TEST: "1", POMODORO_TEST_USERDATA: userData },
      stdio: "ignore",
    });
    const exitCode = await Promise.race([
      new Promise((resolve) => second.on("exit", resolve)),
      new Promise((_, reject) => {
        setTimeout(() => {
          try { second.kill(); } catch { /* already gone */ }
          reject(new Error("second instance did not exit: single-instance lock is missing"));
        }, 15000);
      }),
    ]);
    expect(exitCode).toBe(0);

    // The original instance keeps the profile and its saved task.
    await expect(page.locator(".task-card")).toHaveCount(1);
    await expect(page.locator(".task-card")).toContainText("Only one me");
  });
});
