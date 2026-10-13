const {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  dialog,
  screen,
  session,
} = require("electron");
const path = require("path");
const fs = require("fs");

// UI strings for the parts that live in the main process (tray menu, dialogs).
const UI_STRINGS = {
  en: {
    brand: "Pomodoro Cute",
    "tray.showHide": "Show / Hide",
    "tray.startPause": "Start / Pause (Space)",
    "tray.reset": "Reset (R)",
    "tray.stats": "Statistics (S)",
    "tray.quit": "Quit",
    "export.title": "Export work journal",
    "export.invalid": "Invalid journal export.",
    "export.writeError": "Could not write the export file. Choose a writable location and retry.",
  },
  "es-MX": {
    brand: "Jitomatito Bonito Cute",
    "tray.showHide": "Mostrar / Ocultar",
    "tray.startPause": "Iniciar / Pausar (Espacio)",
    "tray.reset": "Reiniciar (R)",
    "tray.stats": "Estadísticas (S)",
    "tray.quit": "Salir",
    "export.title": "Exportar bitácora de trabajo",
    "export.invalid": "Exportación de bitácora inválida.",
    "export.writeError": "No se pudo escribir el archivo. Elige una ubicación con permisos e inténtalo de nuevo.",
  },
};
let currentLang = "en";
const tr = (key) => (UI_STRINGS[currentLang] || UI_STRINGS.en)[key] || UI_STRINGS.en[key];

let tray = null;
let trayWindow = null;
let isQuitting = false;

const WINDOW_SIZES = {
  normal: { width: 1180, height: 780 },
  mini: { width: 200, height: 200 },
};

const isTestMode = !!process.env.POMODORO_TEST;
if (process.env.POMODORO_TEST_USERDATA) {
  app.setPath("userData", process.env.POMODORO_TEST_USERDATA);
} else {
  const base = path.join(app.getPath("appData"), "Pomodoro Cute");
  const legacy = path.join(app.getPath("appData"), "pomodoro-cute");
  fs.mkdirSync(base, { recursive: true });
  const newStore = path.join(base, "Local Storage", "leveldb");
  const legacyStore = path.join(legacy, "Local Storage", "leveldb");
  if (!fs.existsSync(newStore) && fs.existsSync(legacyStore)) {
    try {
      fs.cpSync(legacy, base, { recursive: true });
    } catch {
      /* ignore migration errors */
    }
  }
  app.setPath("userData", base);
}

app.setAppUserModelId("com.pomodoro.cute");

const windowModes = new WeakMap();
const normalWindows = new WeakMap();
let saveWindowTimer;
let latestWindowState;
const windowStatePath = () => path.join(app.getPath("userData"), "window-state.json");
function fitBounds(saved = {}) {
  if (!saved || typeof saved !== "object") saved = {};
  const sane = Number.isFinite(saved.width) && Number.isFinite(saved.height) && saved.width >= 600 && saved.height >= 480;
  const display = sane && Number.isFinite(saved.x) && Number.isFinite(saved.y)
    ? screen.getDisplayMatching(saved).workArea : screen.getPrimaryDisplay().workArea;
  const width = Math.min(sane ? saved.width : WINDOW_SIZES.normal.width, display.width - (sane ? 0 : 24));
  const height = Math.min(sane ? saved.height : WINDOW_SIZES.normal.height, display.height - (sane ? 0 : 24));
  return { width: Math.round(width), height: Math.round(height),
    x: Math.round(Math.max(display.x, Math.min(Number.isFinite(saved.x) ? saved.x : display.x + (display.width - width) / 2, display.x + display.width - width))),
    y: Math.round(Math.max(display.y, Math.min(Number.isFinite(saved.y) ? saved.y : display.y + (display.height - height) / 2, display.y + display.height - height))) };
}
function flushWindowState() {
  clearTimeout(saveWindowTimer);
  if (!latestWindowState) return;
  try {
    const file = windowStatePath();
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(latestWindowState));
    fs.renameSync(`${file}.tmp`, file);
  } catch { /* Window preferences must not interrupt focus or affect work data. */ }
}
function rememberWindow(win) {
  if (windowModes.get(win) !== "normal") return;
  const saved = { ...win.getNormalBounds(), maximized: win.isMaximized() };
  normalWindows.set(win, saved);
  latestWindowState = saved;
  clearTimeout(saveWindowTimer);
  saveWindowTimer = setTimeout(flushWindowState, 250);
}

function createWindow() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(windowStatePath(), "utf8")); } catch { /* First launch. */ }
  if (!saved || typeof saved !== "object") saved = {};
  const bounds = fitBounds(saved);
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 600,
    minHeight: 480,
    resizable: true,
    show: false,
    title: tr("brand"),
    autoHideMenuBar: true,
    icon: path.join(__dirname, "pomodoro.ico"),
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#2a1e22" : "#fff7ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  windowModes.set(win, "normal");
  normalWindows.set(win, { ...bounds, maximized: Boolean(saved.maximized) });
  if (saved.maximized) win.maximize();
  for (const event of ["resize", "move", "maximize", "unmaximize"]) win.on(event, () => rememberWindow(win));
  win.once("ready-to-show", () => win.show());
  win.on("close", (e) => {
    rememberWindow(win);
    flushWindowState();
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"), isTestMode ? { query: { test: "1" } } : undefined);
  return win;
}

function toggleWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isVisible() && win.isFocused()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

function sendCommand(win, command) {
  if (win && !win.isDestroyed() && win.webContents) {
    win.webContents.send("tray-command", command);
  }
}

function trayTemplate(win) {
  return [
    { label: tr("tray.showHide"), click: () => toggleWindow(win) },
    { type: "separator" },
    { label: tr("tray.startPause"), click: () => sendCommand(win, "toggle") },
    { label: tr("tray.reset"), click: () => sendCommand(win, "reset") },
    { label: tr("tray.stats"), click: () => sendCommand(win, "stats") },
    { type: "separator" },
    {
      label: tr("tray.quit"),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];
}

function refreshTrayLanguage() {
  if (tray && trayWindow && !trayWindow.isDestroyed()) {
    tray.setToolTip(tr("brand"));
    tray.setContextMenu(Menu.buildFromTemplate(trayTemplate(trayWindow)));
  }
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.setTitle(tr("brand"));
  });
}

function createTray(win) {
  let image = nativeImage.createFromPath(path.join(__dirname, "pomodoro.ico"));
  if (image.isEmpty()) {
    image = nativeImage.createFromPath(path.join(__dirname, "..", "assets", "pomodoro.png"));
  }
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  trayWindow = win;
  tray.setToolTip(tr("brand"));
  tray.setContextMenu(Menu.buildFromTemplate(trayTemplate(win)));
  tray.on("click", () => toggleWindow(win));
}

ipcMain.on("notify", (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.on("tray-update", (_event, text) => {
  if (tray) tray.setToolTip(text);
});

ipcMain.on("window-size", (event, mode) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  mode = mode === "mini" ? "mini" : "normal";
  if (windowModes.get(win) === mode) return;
  if (mode === "mini") {
    rememberWindow(win);
    flushWindowState();
    windowModes.set(win, "mini");
    if (win.isMaximized()) win.unmaximize();
    win.setMinimumSize(180, 180);
    win.setResizable(false);
    win.setAlwaysOnTop(true);
    win.setContentSize(WINDOW_SIZES.mini.width, WINDOW_SIZES.mini.height);
  } else {
    win.setAlwaysOnTop(false);
    win.setResizable(true);
    win.setMinimumSize(600, 480);
    const saved = normalWindows.get(win) || {};
    win.setBounds(fitBounds(saved));
    if (saved.maximized) win.maximize();
    windowModes.set(win, "normal");
  }
});

ipcMain.on("language", (_event, lang) => {
  if (!UI_STRINGS[lang] || lang === currentLang) return;
  currentLang = lang;
  refreshTrayLanguage();
});

ipcMain.handle("export-journal", async (event, payload) => {
  if (!payload || typeof payload.content !== "string" || typeof payload.filename !== "string" || !/^pomodoro-[a-z0-9-]+\.(md|csv|json)$/.test(payload.filename)) return { error: tr("export.invalid") };
  const extension = path.extname(payload.filename).slice(1);
  try {
    const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
      title: tr("export.title"), defaultPath: payload.filename,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.promises.writeFile(result.filePath, payload.content, "utf8");
    return { canceled: false };
  } catch { return { error: tr("export.writeError") }; }
});

function focusExistingWindow() {
  const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// A second launch (for example double-clicking the portable app while the first
// copy is hidden in the tray) must reuse the running profile instead of opening
// a competing Chromium profile, which could lock or empty the saved localStorage.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", focusExistingWindow);

  app.whenReady().then(() => {
    const win = createWindow();
    createTray(win);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        const w = BrowserWindow.getAllWindows()[0];
        if (w && !w.isVisible()) {
          w.show();
          w.focus();
        }
      }
    });
  });

  app.on("before-quit", () => {
    flushWindowState();
    isQuitting = true;
    try { session.defaultSession.flushStorageData(); } catch { /* Storage flush must not block quitting. */ }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !tray) app.quit();
  });
}
