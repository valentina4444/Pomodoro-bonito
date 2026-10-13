# 🍅 Pomodoro Cute — Teacher's Guide

*Welcome, student! This document explains every file and every piece of logic in this
little app. Read it top to bottom and you'll understand not just *what* the code does,
but *why* it's written that way.*

---

## 📁 The files

| File | Job |
|------|-----|
| `index.html` | The **structure** — what appears on the page |
| `styles.css` | The **look** — colors, themes, shapes, animations |
| `script.js` | The **behavior** — timing, notifications, stats, saving data |
| `main.js` | The **Electron "main" process** — opens the window, shows OS notifications |
| `preload.js` | The **bridge** — connects the page to Electron safely |
| `package.json` | The **recipe** — app name, start command, Electron dependency |
| `playwright.config.js` | Test runner config (`npm test`) |
| `tests/pomodoro.spec.js` | 12 automated smoke tests driving the real app |
| `EXPLANATION.md` | This file — teaching you! |

**HTML = skeleton, CSS = skin, JS = brain.** Electron packages it all into a real
desktop app, but the same page still runs in a plain browser if you open `index.html`.

---

# 1. index.html — the skeleton 🦴

HTML describes the *content* with tags.

### The mascot, title and timer ring

```html
<div class="mascot" id="mascot">🍅</div>
<h1 class="title">Pomodoro<span class="title-accent">.</span></h1>
<p class="subtitle" id="mode-label">Time to focus!</p>

<div class="timer-ring" data-mode="work">
  <svg viewBox="0 0 200 200">
    <circle class="ring-track" cx="100" cy="100" r="88" />
    <circle class="ring-progress" id="ring-progress" cx="100" cy="100" r="88" />
  </svg>
  <div class="timer-time">
    <span id="time-display">25:00</span>
    <span class="timer-mode" id="timer-mode">WORK</span>
  </div>
</div>
```

The `id`s are the phone numbers JavaScript uses to find elements. And `data-mode="work"` is
a *data attribute* — any `data-*` attribute is a little label you can read and write from JS.
We use it to recolor the ring for work/break/long break.

The ring trick: two stacked `circle`s. One grey (`ring-track`), one red (`ring-progress`),
both with `r="88"`. The red one has a dashed stroke (`stroke-dasharray: 553` = the
circumference `2πr`). JS slides that dash around with `stroke-dashoffset` so the ring
"eats itself" as time passes.

### Buttons

```html
<button class="btn btn-reset"  id="btn-reset" aria-label="Reset">↺</button>
<button class="btn btn-primary" id="btn-start">Start</button>
<button class="btn btn-skip"   id="btn-skip"   aria-label="Skip phase">⏭</button>
```

Reset (↺), start/pause (the big pill), skip (⏭). `aria-label` helps screen readers.

```html
<div class="sessions" id="sessions"></div>
<div class="cycle-dots" id="cycle-dots"></div>
```

Both empty on purpose — JS fills them. `sessions` shows 🍅/🏆, `cycle-dots` shows little
dots counting how close you are to the **long break**.

```html
<div class="utility-buttons">
  <button class="utility-btn" id="btn-settings">⚙ Settings</button>
  <button class="utility-btn" id="btn-stats">📊 Stats</button>
</div>
```

Two buttons that **pop up modals** (the overlay dialogs at the bottom of the file).

### The modals

```html
<div class="modal-overlay" id="settings-modal" hidden>
  <div class="modal">
    <div class="modal-head">
      <h2>⚙ Settings</h2>
      <button class="modal-close" id="close-settings" aria-label="Close">×</button>
    </div>
    <div class="settings">
      <div class="settings-row">
        <label for="work-min">Work (min)</label>
        <input type="number" id="work-min" min="1" max="120" value="25" />
      </div>
      ...
    </div>
  </div>
</div>
```

The big idea of a **modal**: a translucent overlay (`modal-overlay`) sits over the whole
page, and a card (`modal`) floats on top. The `hidden` attribute hides it until JS removes
it. Clicking the dark backdrop *outside* the card closes it (`e.target === overlay`).

The stats modal is identical in shape but holds a **tab bar** (Daily/Weekly/Monthly), a
`<div class="chart-wrap" id="chart">` that JS fills with bar columns, and a summary line.

Notice `for="work-min"` on labels: clicking the label focuses the input. Small, friendly.

---

# 2. styles.css — the skin 🎨

### Design tokens = 5 color themes

```css
:root,
:root[data-theme="tomato"] {
  --accent: #ff5d5d;
  --accent-dark: #e84343;
  --accent-soft: #7fd8b0;
  --bg-top: #fff7ef;
  --bg-bottom: #ffe3c8;
  ...
}

:root[data-theme="mint"] {
  --accent: #4fc48d;
  --accent-dark: #34a873;
  --accent-soft: #ffc98a;
  ...
}
```

Every color in the whole app is a **CSS variable** (also called a *design token*).
Instead of typing `#ff5d5d` everywhere, components say `var(--accent)`.

Now the **theme system is nearly free**: when JS sets `data-theme="mint"` on the `<html>`
element, browsers swap in the matching variable block, and every component re-colors.
That's why all five themes stay perfectly coherent — they reuse the same *roles*
(accent, text, background…) with different values:

| Theme | Accent | Soft accent |
|-------|--------|-------------|
| Tomato 🍅 | red | mint |
| Mint 🌿 | green | warm peach |
| Blueberry 🫐 | blue | peach |
| Peach 🍑 | orange | teal |
| Lavender 💜 | purple | pink |

### Gradients + flexbox centering

```css
body {
  background: linear-gradient(160deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
```

A *gradient* blends two colors (soft, dreamy). Flexbox centers the card perfectly.

### Shadows that match the theme

```css
.card {
  box-shadow: 0 18px 40px color-mix(in srgb, var(--accent) 18%, transparent);
}
```

`color-mix()` lets the shadow accent color show through — so the glow is tomato-red in the
Tomato theme and blue in Blueberry. Theme-coherent shadows with one line.

### The mode ring

```css
.timer-ring[data-mode="break"],
.timer-ring[data-mode="longBreak"] {
  --ring-stroke: var(--accent-soft);
}
.ring-progress {
  stroke: var(--ring-stroke, var(--accent));
}
```

The *parent* sets `--ring-stroke`, the child reads it with a fallback (`var(--ring-stroke,
var(--accent))`). This is a mini design system: break modes turn the ring a different color
without any JavaScript even knowing about colors.

### The animations

- `bounce` — the tomato hops forever, `animation: bounce 2.4s infinite`.
- `pop` — a one-shot "you rock!" scale-up when you complete a batch.
- `modal-in` — modals slide up + fade in (`@keyframes` with `opacity` and `transform`).
- `:hover` / `:active` micro-interactions — buttons lift and squish.

### The bar chart (stats)

```css
.chart-wrap  { display: flex; align-items: flex-end; height: 160px; }
.bar-col     { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
.bar-fill    { background: linear-gradient(180deg, var(--accent), var(--accent-dark)); }
```

No chart library! A bar chart is just a row of columns (`flex` with `align-items:
flex-end`), and each column's height IS the data — JS writes `style="height: xx%"`.
Cute, tiny, and always matches the theme.

---

# 3. script.js — the brain 🧠

Biggest file. We go concept by concept.

## 3.0 The wrapper

```js
(() => {
  "use strict";
  ...
})();
```

An **IIFE** (Immediately Invoked Function Expression) keeps every variable private — nothing
leaks into the global scope. Our whole app is one big shared `state` object:

```js
let state = {
  mode: "work",          // "work" | "break" | "longBreak"
  running: false,
  endTime: null,
  intervalId: null,
  totalSeconds: settings.workMin * 60,
  remainingSeconds: settings.workMin * 60,
};
```

## 3.1 Constants & a "dictionary" for modes

```js
const THEMES = { tomato: {name: "Tomato", swatch: "#ff5d5d"}, ... };

const MODE_META = {
  work:      { word: "WORK",       label: "Time to focus!",            mascot: "🍅" },
  break:     { word: "BREAK",      label: "Take a breather ☁️",        mascot: "🥑" },
  longBreak: { word: "LONG BREAK", label: "You earned it! 🌈",         mascot: "🌴" },
};
```

`MODE_META` is a tiny **data table** — instead of writing three `if/else` chains to update
word + label + mascot, we just look up the current mode and copy its row. Adding a mode =
adding one row. This idea (data instead of code) makes apps easy to extend.

## 3.2 localStorage & the daily reset

```js
function load(key, fallback) {
  try { ... JSON.parse(localStorage.getItem(key)) ... } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
```

`localStorage` is a tiny key/value store *inside the browser*. It only holds strings, so we
`JSON.stringify` to write objects and `JSON.parse` to read them. The `try/catch` guards
against corrupted data.

**Timezone trick (important!):** the first version used `new Date().toISOString().slice(0,10)`.
`toISOString()` returns **UTC** — a user past midnight in a +timezone would see tomorrow's
date. The fix builds the key from local fields:

```js
function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
```

`padStart(2, "0")` turns `9` into `"09"` so keys sort/compare correctly.

## 3.3 Sessions + the long-break cycle

```js
function loadSessions() {
  const data = load(SESSIONS_KEY, {});
  if (data.date !== localDateKey()) return { date: localDateKey(), count: 0, cycle: 0 };
  return { cycle: 0, ...data };
}
```

We store `{date, count, cycle}`. `cycle` = completed work sessions *since the last long
break*. If the date changed, the whole object resets to zero — that's our automatic daily
reset in one small function. (`{ cycle: 0, ...data }` guarantees `cycle` exists even if old
saved data predates this feature.)

```js
function addSession() {
  const data = loadSessions();
  data.count += 1;
  data.cycle = (data.cycle || 0) + 1;
  save(SESSIONS_KEY, data);

  const history = loadHistory();
  history.push(localDateKey());       // one entry per finished work session
  save(HISTORY_KEY, history);
  if (data.count % 4 === 0) { /* celebrate pop */ }
  return data;
}
```

`HISTORY_KEY` is a **list of date strings** — one per finished work session, forever (capped
at 1000). Statistics are just *counting* entries in that list.

The visible badges come from number theory:

```js
const full = Math.floor(count / 4);   // whole batches -> 🏆
const extra = count % 4;              // remainder     -> 🍅
```

And the cycle dots show progress toward the long break:

```js
for (let i = 0; i < every; i++) {
  dots += `<span class="dot ${i < cycle ? "dot-done" : ""}"></span>`;
}
cycleDotsEl.innerHTML = dots;
```

`cycle < count`? No — `i < cycle` means "dot number *i* is already earned".

## 3.4 Sound with the Web Audio API

```js
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playChime() {
  ...
  [880, 660, 880, 1175].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();   // generates a tone
    const gain = audioCtx.createGain();        // controls its volume
    const t = now + i * 0.28;                  // stagger notes by 0.28s
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);   // swell in
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); // fade out
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
```

`[880, 660, 880, 1175]` is the little *"ta-dah!"* fanfare. Each note is an oscillator
feeding a gain node; `exponentialRampToValueAtTime` creates a natural bell-like swell.
No audio files needed — we *synthesize* it.

**Browser rule:** audio autoplay is blocked until the user clicks something, so we call
`audioCtx.resume()` inside the Start handler.

## 3.5 Notifications — desktop style ⭐

A web page can ask the browser for permission to show `Notification`s. But in Electron we
have something *better*: the operating system's own notification center, usable straight from
`main.js`.

```js
// preload.js  — the safe bridge
contextBridge.exposeInMainWorld("pomodoroNotification", {
  show: (title, body) => ipcRenderer.send("notify", { title, body }),
});

// main.js — the Electron main process
ipcMain.on("notify", (_event, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});
```

**Why a bridge?** Security. In Electron, the page runs with *no access to Node*. The renderer
can only talk to the main process through `ipc` (inter-process communication) channels that
`preload.js` deliberately exposes. It's all `show`/`notify` — nothing else is leaked.

Our renderer handler tries, in order:

```js
if (window.pomodoroNotification && window.pomodoroNotification.show) {  // 1. Electron IPC
  window.pomodoroNotification.show(title, body);
} else if (Notification.permission === "granted") {                     // 2. Browser API
  new Notification(title, body);
} else {                                                                // 3. Title flash
  document.title = `⏰ ${title}`; setTimeout(...);
}
```

Electron → OS notification → tab-title flash. **Defense in depth.** And permission is only
requested inside a click (browser rule), guarded so we never ask twice:

```js
function requestNotificationPermission() {
  if (!window.pomodoroNotification && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
```

## 3.6 The drift-proof timer ⏱

A naive beginner writes:

```js
setInterval(() => secondsLeft -= 1, 1000);  // ❌ drifts when tab is throttled
```

Browsers **throttle** `setInterval` in background tabs to save battery, so counting ticks
would make a 25-minute timer take 40 minutes. Our fix: **never count ticks, count against
the wall clock.**

```js
function startTimer() {
  state.endTime = Date.now() + state.remainingSeconds * 1000;
  state.intervalId = setInterval(tick, 200);
}

function tick() {
  const remain = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
  state.remainingSeconds = remain;
  render();
  if (remain <= 0) completePhase();
}
```

Every 200ms we just re-ask "how far from `endTime` are we?" If the tab slept for 10 seconds,
the next tick instantly jumps to the *correct* time. Timers can't drift now. 🎯

## 3.7 The phase machine — work ↔ break ↔ long break

```js
function setMode(mode) {
  state.mode = mode;
  state.totalSeconds = modeMinutes(mode) * 60;
  state.remainingSeconds = state.totalSeconds;
  const meta = MODE_META[mode];          // one row from the dictionary
  timerModeEl.textContent = meta.word;
  modeLabel.textContent = meta.label;
  mascot.textContent = meta.mascot;
  ringEl.dataset.mode = mode;
  render(); renderSessions();
}
```

One function updates *everything* for a mode. `modeMinutes` picks work/break/long digits
from the settings.

```js
function completePhase() {
  pauseTimer();
  playChime();

  if (state.mode === "work") {
    const data = addSession();
    if (data.cycle >= settings.longBreakEvery) {
      data.cycle = 0;  save(SESSIONS_KEY, data);
      notify("You earned it! 🌈", "Time for a long break.");
      setMode("longBreak");
    } else {
      notify("Great job! 🍅", "Time for a little break!");
      setMode("break");
    }
  } else {
    notify("Break is over! ✨", "Ready to focus again?");
    setMode("work");
  }
}
```

`longBreakEvery` is user-configurable. Reading it as `settings.longBreakEvery` in one line
means changing "long break after 4" to "after 3" is a single settings input.

## 3.8 Statistics — counting history 📊

History now stores richer records — not just a date, but the **exact timestamp** and
**length** of each finished session:

```js
history.push({ d: localDateKey(), t: Date.now(), m: settings.workMin });
```

That one upgrade unlocks everything: `t` (time-of-day) lets the **daily** chart show *when*
you focused, and `m` (minutes) lets us show real *focus time*, not just counts. Old records
saved as plain date strings still work thanks to the normalizers in
`toDateKey()` / `entryMinutes()`.

```js
function computeStats(type) {
  const counts = {}; const minutes = {};
  history.forEach(e => { counts[toDateKey(e)]++; minutes[toDateKey(e)] += entryMinutes(e); });
  if (type === "daily") {
    // ONLY today: today's sessions + focus minutes + 24 hourly bars
  } else if (type === "weekly") {
    // Mon–Sun bars (unchanged)
  } else {
    // this month, rendered as a LINE GRAPH
  }
}
```

- **Daily** = *today only*: total sessions, total focus minutes, and a 24-slot hourly bar
  chart mapping "when today did you focus" (`new Date(entry.t).getHours()`).
- **Weekly** = Mon–Sunday bars (unchanged).
- **Monthly** = a polyline drawn in raw SVG — no chart library.

Why can we convert between stores? `history.push({ d, t, m })` is a *record with three
fields*; counting them for a *date key* is the same operation whether the record was
written yesterday or last year.

Notes worth teaching on the date math:

- **`today.getDay()`** returns 0–6 starting **Sunday**. `(getDay() + 6) % 7` converts to
  Monday-first ordering (Mon=0), the classic "make weeks start on Monday" idiom.
- **`new Date(year, month + 1, 0).getDate()`** = how many days are in `month`
  ("day 0 of the next month" is the last day of this one). Elegant calendar math.
- `new Date(year, month, day)` with out-of-range values *rolls over* — e.g. day 35 becomes
  next month. JS dates are surprisingly forgiving.

Rendering is proportional sizing:

```js
const max = Math.max(1, ...entries.map(e => e.count));
chartEl.innerHTML = entries.map(e => `
  <div class="bar-col" title="${e.count} ...">
    <span class="bar-val">${e.count || ""}</span>
    <div class="bar-fill" style="height: ${Math.round((e.count / max) * 100)}%"></div>
    <span class="bar-label">${e.label}</span>
  </div>`).join("");
```

`Math.max(1, ...)` prevents dividing by zero when no sessions exist. `style="height: xx%"`
is the entire chart — no libraries.

The **monthly line graph** is the same idea but drawn in SVG. Map day 1..today to x
coordinates (evenly spaced), count to y coordinates (scaled by the max), then connect them:

```js
const stepX = n > 1 ? innerW / (n - 1) : 0;
const points = entries.map((e, i) => [pad.left + i * stepX, pad.top + innerH - (e.count / max) * innerH]);
chartEl.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="line-chart">
  <polyline points="${points.map(p => p.join(",")).join(" ")}" fill="none"
            stroke="var(--accent)" stroke-width="2.5" .../>
  <!-- + one <circle> per day + sparse day labels -->
</svg>`;
```

Because the line graph reuses the theme's `--accent`, it recolors itself in every theme
*and* in dark mode for free. `switch` between bar and line rendering is just an extra CSS
class on the container (`.chart-wrap.line`).

Tab switching just re-runs the same renderer with a different `type`:

```js
tabBtns.forEach(btn => btn.addEventListener("click", () => {
  tabBtns.forEach(b => b.classList.toggle("active", b === btn));
  renderStats(btn.dataset.tab);
}));
```

## 3.9 Themes — five looks, one system 🎨

```js
function applyTheme() {
  document.documentElement.dataset.theme = settings.theme || "tomato";
  document.querySelectorAll(".theme-swatch").forEach(s =>
    s.classList.toggle("active", s.dataset.theme === settings.theme));
}
```

Setting `data-theme` on `<html>` flips the CSS variable block (section 2). The swatch
buttons are **generated**, not hand-typed:

```js
function buildThemePicker() {
  Object.keys(THEMES).forEach(key => {
    const btn = document.createElement("button");
    btn.className = "theme-swatch";
    btn.style.background = THEMES[key].swatch;
    btn.dataset.theme = key;
    btn.addEventListener("click", () => { settings.theme = key; save(...); applyTheme(); });
    themePicker.appendChild(btn);
  });
}
```

Loop over `THEMES`, build buttons. Add a sixth theme later = add one line to `THEMES`
and one CSS block. The theme itself is just another setting, persisted in localStorage.

## 3.10 Settings that survive

```js
function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
```

`parseInt("25")` → 25. `parseInt("abc")` → NaN → fallback. `Math.min/max` keep it in range.
So typing "42" into a 1–120 work field gives 42, "-99" becomes 1, "hello" becomes 25.
Garbage in → safe default out.

Every settings input has a `change` listener that runs `applySettings()`: rebuild the
settings object (spreading the old one, so `theme` survives), save, then rebuild the timer
*only if not running* (so you can't sabotage a live session).

```js
settings = { ...settings, workMin: clampInt(...), ..., sound: soundToggle.checked };
```

---

# 4. Electron — turning the page into an app 🖥

Electron runs `package.json`'s `"main": "main.js"`. That file creates a `BrowserWindow`
and loads `index.html` — our exact webpage — as the app's UI.

```js
const win = new BrowserWindow({
  width: 430, height: 760, resizable: false, show: false,
  webPreferences: { preload: path.join(__dirname, "preload.js"),
                    contextIsolation: true, nodeIntegration: false, sandbox: true },
});
win.once("ready-to-show", () => win.show());
```

Security flags worth memorizing:
- `contextIsolation: true` — the page can't reach Node directly.
- `nodeIntegration: false` — no `require()` in the page.
- `sandbox: true` — the renderer is locked down.
- `preload` — a *privileged middle-man* that exposes exactly one safe channel.

Then `win.loadFile("index.html")` shows `index.html`. Notifications route through
`ipcMain.on("notify", ...)` → OS notification (section 3.5).

To run it: `npm install` then `npm start`. (That downloads Electron once.)

---

# 5. The cute factor ✨

- **5 coherent pastel themes** driven by CSS variables — swap the whole mood with one click.
- **A changing mascot** 🍅 → 🥑 → 🌴 depending on your phase.
- **Micro-interactions** — buttons lift/squish, ring sweeps smoothly, modals float in.
- **Redundant encouragement** — 🍅 badges, 🏆 trophies, cycle dots, and a little "pop".
- **Emoji everywhere** — zero image files, always on-theme.
- **Warm copy** — "You earned it! Let it sink in 🌈".

---

# 6. Concepts you can now brag about 🏁

| Concept | Where you saw it |
|---|---|
| IIFE & module privacy | the outer `(() => {...})()` |
| Centralized `state` object | `state = { mode, running, ... }` |
| Data tables over `if/else` | `MODE_META`, `THEMES`, `APPEARANCES` |
| `localStorage` persistence | settings, daily sessions, full history, **runtime timer** |
| Date-based daily reset | `localDateKey()` comparison |
| Timestamp timing (drift-proof) | `endTime - Date.now()` |
| Timestamp-aware records | `{d, t, m}` history for hourly + focus-minutes stats |
| SVG ring progress | `stroke-dasharray` + `stroke-dashoffset` |
| SVG line graph (no library) | polyline + day dots for the monthly tab |
| CSS variables as design tokens | 5 themes × 2 modes via `data-theme` + `data-mode` |
| `color-mix()` theme shadows | glow matches accent |
| Web Audio synthesis | oscillators + gain envelopes |
| Notification fallback chain | Electron IPC → browser API → title flash |
| Electron security model | `preload` + `contextIsolation` + IPC |
| System tray | `Tray` + context menu + live tooltip |
| IPC in both directions | renderer→main (`notify`, `tray-update`), main→renderer (`tray-command`) |
| Patterns in date math | `(dayOfWeek + 6) % 7`, `new Date(y, m+1, 0)` |
| CSS bar chart (no library) | flex columns with `height: %` |
| Input sanitization | `clampInt` |

## Suggested challenges 🧗

1. ~~Persist a running timer across app restarts~~ ✅ (done — see section 7.1)
2. **A loud alarm mode** — a looping tone until you click, not a one-shot chime.
3. **A "streak" stat** — longest run of consecutive days with ≥1 session.
4. ~~Keyboard shortcuts~~ ✅ (done — `Space`, `R`, `S`, `Esc`, see section 7.3)
5. **Export stats** to CSV from the app menu.
6. ~~Tray icon with live countdown~~ ✅ (done — see section 7.2)

---

# 7. Desktop polish — v2 🖥

## 7.1 Persistent running timer ⏱➡🌙

The timer now survives a full app restart:

```js
function startTimer() {
  state.endTime = Date.now() + state.remainingSeconds * 1000;
  save(RUNTIME_KEY, { mode: state.mode, endTime: state.endTime });
  ...
}
function pauseTimer() { ... remove(RUNTIME_KEY); }
```

Why this works: we already store the *deadline* (`endTime`), not a counter. So on launch:

```js
function restoreRuntime() {
  const saved = load(RUNTIME_KEY, null);
  if (saved.endTime > Date.now()) {     // still counting down...
    startTimer();                       // ...resume from the real remaining time
  } else {                              // it finished while the app was closed
    setMode(saved.mode);
    completePhase(true);                // silent: count it, no chime at launch
  }
}
```

A session that finished while the app was closed is **still counted** (number of pomodoros
and stats), but `silent = true` skips the chime and notification — you weren't there to
hear them, so it just moves to the next phase. Nice behavior, one boolean parameter.

## 7.2 System tray 🍅

`main.js` builds a tray from our generated icon:

```js
const image = nativeImage.createFromPath(path.join(__dirname, "pomodoro.ico"));
tray = new Tray(image.resize({ width: 16, height: 16 }));
tray.setToolTip("Pomodoro Cute");
tray.setContextMenu(Menu.buildFromTemplate([...]));
tray.on("click", () => toggleWindow(win));
```

- **Click** the tray → show/hide the window.
- **Context menu** → Show/Hide, Start/Pause, Reset, Statistics, Quit.
- Closing the window (X) now **hides to tray** instead of quitting:

```js
win.on("close", (e) => {
  if (!isQuitting) { e.preventDefault(); win.hide(); }
});
```

The hidden window keeps running, so the timer keeps counting. In the renderer, `render()`
pushes the live remaining time to the tray tooltip:

```js
if (window.pomodoroTray && trayText !== lastTrayText) window.pomodoroTray.update(trayText);
```

Tray clicks send commands *back* to the page (`win.webContents.send("tray-command", ...)`),
exposed by the preload bridge as `window.pomodoroTray.onCommand(...)`. This is **two-way
IPC**: the renderer can notify the OS, and the OS can ask the renderer to do things.

## 7.3 Keyboard shortcuts ⌨

```js
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModals(); return; }
  const typing = e.target.tagName === "INPUT" || /* ... textarea, select ... */;
  if (typing) return;                 // don't hijack typing in Settings!
  if (e.code === "Space") { if (tag === "BUTTON") return; toggleStart(); }
  else if (e.code === "KeyR") resetTimer();
  else if (e.code === "KeyS") toggleStats();
});
```

- `Space` — start/pause. If a *button* already has focus, we let the button handle it
  (otherwise we'd toggle twice: the keydown handler *and* the focused button's click).
- `R` — reset. `S` — statistics. `Esc` — close any modal.
- The **typing guard** checks `e.target.tagName`: while you're editing the Settings
  number fields, `R` or `Space` must type letters, not reset the timer.

## 7.4 Dark mode 🌙 (appearance options)

Personalization now has **two axes**: color *theme* (Tomato, Mint, …) and *appearance*
(Light ☀️ / Dark 🌙 / Follow system 🌓).

```js
function effectiveAppearance() {
  if (settings.appearance === "dark") return "dark";
  if (settings.appearance === "light") return "light";
  return prefersDark.matches ? "dark" : "light";   // matchMedia OS preference
}
```

Same trick as themes — set one attribute on `<html>`:

```css
:root[data-theme="mint"][data-mode="dark"] {
  --bg-top: #22302a;  --bg-bottom: #18241e;
  --ink: #e6f7ec;     --ink-soft: #93b3a3;
  /* accent colors stay the same — dark mode only swaps surfaces & text */
}
```

Each of the 5 themes has its own hand-matched dark surface palette (dark is *not* a
global "just invert it"). `prefersColorScheme.addEventListener("change", ...)` auto-switches
when "Follow system" is on and the OS flips between light and dark.

---

# 8. The tests — proof the app works ✅

`npm test` drives the **real Electron app** with Playwright and asserts the outcomes of every
major feature (12 tests, ~30s).

```js
const { test, expect, _electron: electron } = require("@playwright/test");
const app = await electron.launch({ args: [MAIN], env: { ...process.env, POMODORO_TEST: "1", ... } });
const page = await app.firstWindow();
```

Three pieces make this clean and safe:

1. **Isolated storage.** `main.js` reads `POMODORO_TEST_USERDATA` and runs
   `app.setPath("userData", dir)` *before* `ready`. Every test launches with a throwaway
   temp folder — your real settings/history are never touched.

2. **A test-only bridge.** When launched with `?test=1`, the app exposes a small
   `window.__pomodoroTest` API. It doesn't add features — it lets tests *drive* what already
   exists: `getState()`, `fastForward(ms)` (push `endTime` into the past → `tick()` completes
   instantly), `completeNow()`, and `getCalls()` (records `notify`/`playChime` invocations so
   OS notifications — flaky to assert — are verified as calls instead).

3. **`withApp()` harness.** Opens the app, waits for the bridge, runs your assertions,
   and force-closes if shutdown stalls.

The suite covers: boot state, start/pause/reset, work→break + history record `{d,t,m}`,
long-break cycle, restart-resume from a saved `pomodoro_runtime`, a session that *finished
while closed* being counted silently, all three stat tabs (daily today-only, weekly bars,
monthly line), theme + appearance switching, keyboard shortcuts, sound/notification toggles,
and settings clamping + persistence across restarts.

This is how the real bugs got caught on the first run:

- **Bug:** old saved settings (without the newer `appearance` key) meant *no* appearance
  swatch was highlighted. **Fix:** `settings = { ...DEFAULT_SETTINGS, ...load(...) }` — merge
  defaults under whatever the disk held.
- **Bug:** `audioCtx.resume()` outside a user gesture returns a rejected promise → unhandled
  rejection. **Fix:** `.catch(() => {})`.

Rest easy: it's verified end to end now. 🍅

---

*Built with 💖. Now go use your Pomodoro — 25 minutes of focus, one tomato at a time!*