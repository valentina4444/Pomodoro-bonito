const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pomodoroExport", {
  save: payload => ipcRenderer.invoke("export-journal", payload),
});

contextBridge.exposeInMainWorld("pomodoroNotification", {
  show: (title, body) => ipcRenderer.send("notify", { title, body }),
});

contextBridge.exposeInMainWorld("pomodoroTray", {
  update: (text) => ipcRenderer.send("tray-update", text),
  onCommand: (callback) =>
    ipcRenderer.on("tray-command", (_event, command) => callback(command)),
});

contextBridge.exposeInMainWorld("pomodoroWindowSize", {
  set: (mode) => ipcRenderer.send("window-size", mode),
});

contextBridge.exposeInMainWorld("pomodoroLanguage", {
  set: (lang) => ipcRenderer.send("language", lang),
});
