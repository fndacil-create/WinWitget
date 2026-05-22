const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("widget", {
  getWeather: () => ipcRenderer.invoke("weather:get"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  setActiveCity: (partial) => ipcRenderer.invoke("settings:setActiveCity", partial),
  searchCities: (query) => ipcRenderer.invoke("cities:search", query),
  toggleCompact: () => ipcRenderer.invoke("window:toggleCompact"),
  setDayDetailOpen: (open, extraHeight) =>
    ipcRenderer.invoke("window:setDayDetailOpen", open, extraHeight),
  getPowerInfo: () => ipcRenderer.invoke("power:getInfo"),
  getTheme: () => ipcRenderer.invoke("theme:get"),
  close: () => ipcRenderer.send("window:close"),
  quit: () => ipcRenderer.send("window:quit"),
  testNotification: () => ipcRenderer.invoke("notifications:test"),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdateNow: () => ipcRenderer.invoke("update:installNow"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings-changed", (_event, settings) => callback(settings));
  },
  onThemeChanged: (callback) => {
    ipcRenderer.on("theme-changed", (_event, isDark) => callback(isDark));
  },
  onWeatherUpdated: (callback) => {
    ipcRenderer.on("weather-updated", (_event, weather) => callback(weather));
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on("open-settings", () => callback());
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on("update:status", (_event, status) => callback(status));
  },
});
