const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  globalShortcut,
  nativeTheme,
  powerMonitor,
  Notification,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { autoUpdater } = require("electron-updater");
const { loadSettings, saveSettings } = require("./settings");
const { applyRoundedWindowShape } = require("./windowShape");
const {
  getWeatherData,
  checkAllNotifications,
  searchCities,
} = require("./weatherService");
const { getTrayIcon, getNotificationIcon } = require("./trayIcon");

const userDataPath = path.join(
  process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
  "win-witget"
);

app.setPath("userData", userDataPath);

const cachePath = path.join(userDataPath, "Cache");
const gpuCachePath = path.join(userDataPath, "GPUCache");

[cachePath, gpuCachePath].forEach((dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Ignore if directory already exists or cannot be created.
  }
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.winwitget.app");
  app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
  app.commandLine.appendSwitch("disk-cache-dir", cachePath);
  app.commandLine.appendSwitch("gpu-disk-cache-dir", gpuCachePath);
}

const CORNER_RADIUS = 16;
const WINDOW_SIZES = {
  small: { full: [260, 480], compact: [200, 88] },
  medium: { full: [300, 520], compact: [220, 92] },
  large: { full: [360, 580], compact: [240, 96] },
};
const DAY_DETAIL_EXTRA_FALLBACK = 168;

let mainWindow = null;
let tray = null;
let refreshTimer = null;
let isQuitting = false;
let dayDetailOpen = false;
let dayDetailExtra = 0;

function getWindowSize(settings) {
  const preset = WINDOW_SIZES[settings.size] || WINDOW_SIZES.medium;
  const [width, baseHeight] = settings.compactMode ? preset.compact : preset.full;
  const height =
    dayDetailOpen && !settings.compactMode
      ? baseHeight + dayDetailExtra
      : baseHeight;
  return [width, height];
}

function applyAlwaysOnTop(settings) {
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(settings.alwaysOnTop !== false, "floating");
}

function setContentSizeSafely(width, height) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Windows + transparent + frame:false + resizable:false kombinasyonunda
  // setContentSize pencereyi büyütebiliyor ama küçültemiyor (bilinen Electron kısıtlaması).
  // Kalıcı çözüm için: resizable'ı geçici aç, minimum boyutu sıfırla,
  // setBounds ile mutlak konum+boyut yaz, sonra eski kısıtları geri koy.
  const wasResizable = mainWindow.isResizable();
  if (!wasResizable) mainWindow.setResizable(true);

  // Electron resizable:false iken minimum boyutu mevcut boyuta sabitliyor;
  // bu küçültmeyi engelliyor. Önce minimumu kaldır.
  mainWindow.setMinimumSize(0, 0);

  const [x, y] = mainWindow.getPosition();
  // frame:false olduğu için outer ~ content; setBounds Windows'ta setContentSize'a
  // göre çok daha güvenilir küçülme yapıyor.
  mainWindow.setBounds({ x, y, width, height }, false);

  if (!wasResizable) mainWindow.setResizable(false);
}

function refreshWindowShapeSoon() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // setContentSize sonrası içerik boyutu hemen güncellenmediği için
  // shape'i bir sonraki tick'te ve mevcut content boyutuyla yeniden uyguluyoruz.
  setImmediate(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      applyRoundedWindowShape(mainWindow, CORNER_RADIUS);
    }
  });
}

function applyWindowSize(settings) {
  if (!mainWindow) return;
  const [width, height] = getWindowSize(settings);
  setContentSizeSafely(width, height);
  refreshWindowShapeSoon();
}

function applyWindowAppearance(settings, { broadcast = true } = {}) {
  if (!mainWindow) return;

  applyAlwaysOnTop(settings);

  const opacity = Math.min(100, Math.max(70, settings.opacity || 92)) / 100;
  mainWindow.setOpacity(opacity);

  applyWindowSize(settings);

  if (!broadcast) return;

  mainWindow.webContents.send("settings-changed", settings);
  mainWindow.webContents.send(
    "theme-changed",
    settings.theme === "auto"
      ? nativeTheme.shouldUseDarkColors
      : settings.theme === "dark"
  );
}

function createWindow() {
  const settings = loadSettings();
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const [width, height] = getWindowSize(settings);
  const saved = settings.windowPosition;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: saved?.x ?? screenWidth - width - 20,
    y: saved?.y ?? 24,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    alwaysOnTop: settings.alwaysOnTop !== false,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: false,
    thickFrame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
    },
  });

  mainWindow.setBackgroundColor("#00000000");
  mainWindow.setOpacity(Math.min(100, Math.max(70, settings.opacity || 92)) / 100);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  const updateWindowShape = () => {
    applyRoundedWindowShape(mainWindow, CORNER_RADIUS);
    mainWindow.setBackgroundColor("#00000000");
  };

  mainWindow.webContents.once("did-finish-load", updateWindowShape);

  mainWindow.once("ready-to-show", () => {
    updateWindowShape();
    mainWindow.show();
    applyWindowAppearance(loadSettings());
  });

  mainWindow.on("move", () => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    saveSettings({ windowPosition: { x, y } });
  });

  mainWindow.on("close", (event) => {
    const settings = loadSettings();
    if (!isQuitting && settings.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function applyAutoStart(enabled) {
  const loginSettings = { openAtLogin: enabled };

  if (process.platform === "win32") {
    loginSettings.path = process.execPath;
    if (!app.isPackaged) {
      // Windows registry'sine yazılırken argümanlar boşlukla birleştirilir.
      // Uygulama klasörünün yolunda boşluk varsa (örn. "fatih yazilim"),
      // tırnak içine almazsak Electron yolu yanlış parçalar ve uygulamayı bulamaz.
      const appPath = path.resolve(process.argv[1] || __dirname);
      loginSettings.args = [`"${appPath}"`];
    }
  }

  app.setLoginItemSettings(loginSettings);
}

function getRefreshIntervalMs() {
  const settings = loadSettings();
  const onBattery =
    settings.batteryFriendly &&
    typeof powerMonitor.isOnBatteryPower === "function" &&
    powerMonitor.isOnBatteryPower();

  return onBattery ? 15 * 60 * 1000 : 5 * 60 * 1000;
}

function sendNotification(title, body) {
  if (!Notification.isSupported()) {
    return { ok: false, reason: "Bildirimler bu sistemde desteklenmiyor." };
  }

  const notification = new Notification({
    title,
    body,
    icon: getNotificationIcon(),
    silent: false,
  });

  notification.show();
  return { ok: true };
}

function sendNotifications(alerts) {
  alerts.forEach((alert) => {
    sendNotification(alert.title, alert.body);
  });
}

async function refreshWeatherAndNotify() {
  if (!mainWindow) return;

  try {
    const settings = loadSettings();
    const weather = await getWeatherData(settings);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("weather-updated", weather);
    }

    // Bildirim kontrolünü ana akışı bloklamayacak şekilde arka planda yap.
    runNotificationCheckInBackground(settings);
  } catch (error) {
    console.error(error);
  }
}

function startRefreshLoop() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(refreshWeatherAndNotify, getRefreshIntervalMs());
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function buildTrayMenu() {
  const settings = loadSettings();
  return Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? "Gizle" : "Göster",
      click: toggleWindow,
    },
    {
      label: settings.compactMode ? "Genişlet" : "Kompakt mod",
      click: () => {
        const next = saveSettings({ compactMode: !settings.compactMode });
        applyWindowAppearance(next);
      },
    },
    {
      label: "Ayarları aç",
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.show();
        mainWindow.webContents.send("open-settings");
      },
    },
    {
      label: "Test bildirimi gönder",
      click: () => {
        sendNotification(
          "WinWitget Test",
          "Bildirimler çalışıyor. Hava durumu uyarıları bu şekilde görünecek."
        );
      },
    },
    { type: "separator" },
    {
      label: "Çıkış",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }

  const icon = getTrayIcon();
  if (icon.isEmpty()) {
    console.error("Tray icon could not be loaded.");
    return;
  }

  tray = new Tray(icon);
  tray.setToolTip("WinWitget — Hava Durumu");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", toggleWindow);
  tray.on("double-click", toggleWindow);
}

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+W", toggleWindow);
}

function setupThemeWatcher() {
  nativeTheme.on("updated", () => {
    const settings = loadSettings();
    if (settings.theme === "auto" && mainWindow) {
      mainWindow.webContents.send(
        "theme-changed",
        nativeTheme.shouldUseDarkColors
      );
    }
  });
}

function setupPowerWatcher() {
  powerMonitor.on("on-ac", startRefreshLoop);
  powerMonitor.on("on-battery", startRefreshLoop);
}

let updateCheckInProgress = false;
let updateDialogOpen = false;

function setupAutoUpdater() {
  if (!app.isPackaged) {
    // Dev modunda autoUpdater'ı kullanmıyoruz — paketlenmemiş uygulamada
    // metadata bulunmadığı için hata fırlatır.
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.error("[updater] hata:", error?.message || error);
    if (updateCheckInProgress) {
      updateCheckInProgress = false;
      mainWindow?.webContents.send("update:status", {
        state: "error",
        message: error?.message || "Güncelleme kontrolü başarısız",
      });
    }
  });

  autoUpdater.on("checking-for-update", () => {
    mainWindow?.webContents.send("update:status", { state: "checking" });
  });

  autoUpdater.on("update-not-available", () => {
    updateCheckInProgress = false;
    mainWindow?.webContents.send("update:status", { state: "none" });
  });

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("update:status", {
      state: "available",
      version: info.version,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("update:status", {
      state: "downloading",
      percent: progress.percent,
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    updateCheckInProgress = false;
    mainWindow?.webContents.send("update:status", {
      state: "downloaded",
      version: info.version,
    });

    if (updateDialogOpen) return;
    updateDialogOpen = true;

    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Şimdi yeniden başlat", "Daha sonra"],
      defaultId: 0,
      cancelId: 1,
      title: "WinWitget güncellemesi hazır",
      message: `Sürüm ${info.version} indirildi.`,
      detail:
        "Yeni sürümü uygulamak için WinWitget'in yeniden başlatılması gerekiyor. Şimdi yapmak ister misin?",
    });

    updateDialogOpen = false;

    if (result.response === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  // İlk kontrol: kullanıcıyı meşgul etmemek için açılıştan 10 saniye sonra.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error("[updater] ilk kontrol başarısız:", error?.message || error);
    });
  }, 10 * 1000);

  // Sonrasında her 6 saatte bir kontrol et.
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 6 * 60 * 60 * 1000);
}

let notificationCheckRunning = false;

function runNotificationCheckInBackground(settings) {
  if (notificationCheckRunning) return;
  notificationCheckRunning = true;
  checkAllNotifications(settings)
    .then(({ alerts: freshAlerts, lastAlerts }) => {
      if (freshAlerts.length > 0) {
        saveSettings({ lastAlerts });
        sendNotifications(freshAlerts);
      }
    })
    .catch((error) => console.error("Bildirim kontrolü başarısız:", error))
    .finally(() => {
      notificationCheckRunning = false;
    });
}

ipcMain.handle("weather:get", async () => {
  const settings = loadSettings();
  const weather = await getWeatherData(settings);
  // Bildirim kontrolü ana çağrıyı bloklamasın; arka planda fire-and-forget çalışsın.
  // (Periyodik refreshWeatherAndNotify zaten 5 dk'da bir bildirim kontrolü yapıyor.)
  runNotificationCheckInBackground(settings);
  return weather;
});

ipcMain.handle("settings:get", () => loadSettings());

ipcMain.handle("settings:save", (_event, partial) => {
  const settings = saveSettings(partial);
  applyAutoStart(settings.autoStart);
  applyWindowAppearance(settings);
  startRefreshLoop();

  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }

  return settings;
});

// Sadece aktif şehri değiştirmek için hafif handler.
// Pencere, tray, otomatik başlatma ve refresh-loop'a dokunmaz; bu sayede
// sekmeler arası geçiş anlık olur, kullanıcı yazma/IPC gecikmesi hissetmez.
ipcMain.handle("settings:setActiveCity", (_event, partial) => {
  return saveSettings(partial);
});

ipcMain.handle("cities:search", async (_event, query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  return searchCities(query.trim());
});

ipcMain.handle("window:toggleCompact", () => {
  const settings = loadSettings();
  const next = saveSettings({ compactMode: !settings.compactMode });
  if (next.compactMode) {
    dayDetailOpen = false;
  }
  applyWindowAppearance(next);
  return next;
});

ipcMain.handle("window:setDayDetailOpen", (_event, open, extraHeight) => {
  dayDetailOpen = !!open;
  dayDetailExtra = open
    ? Math.max(120, Math.round(extraHeight || DAY_DETAIL_EXTRA_FALLBACK))
    : 0;
  const settings = loadSettings();
  // Sadece pencere boyutunu güncelle; settings-changed broadcast etmiyoruz
  // çünkü renderer onu alıp tekrar setDayDetailOpen çağırarak sonsuz döngü yapar.
  applyWindowSize(settings);
  return { ok: true };
});

ipcMain.handle("power:getInfo", () => ({
  onBattery: powerMonitor.isOnBatteryPower(),
  refreshIntervalMs: getRefreshIntervalMs(),
}));

ipcMain.handle("theme:get", () => {
  const settings = loadSettings();
  if (settings.theme === "auto") {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }
  return settings.theme;
});

ipcMain.handle("notifications:test", () =>
  sendNotification(
    "WinWitget Test",
    "Bildirimler çalışıyor. Hava durumu uyarıları bu şekilde görünecek."
  )
);

ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("update:check", async () => {
  if (!app.isPackaged) {
    return { ok: false, reason: "Geliştirme modunda güncelleme kontrolü yapılamaz." };
  }
  if (updateCheckInProgress) {
    return { ok: false, reason: "Zaten kontrol ediliyor." };
  }
  updateCheckInProgress = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    const available =
      result && result.updateInfo && result.updateInfo.version !== app.getVersion();
    if (!available) {
      updateCheckInProgress = false;
    }
    return {
      ok: true,
      available: !!available,
      version: result?.updateInfo?.version || null,
    };
  } catch (error) {
    updateCheckInProgress = false;
    return { ok: false, reason: error?.message || "Bilinmeyen hata" };
  }
});

ipcMain.handle("update:installNow", () => {
  if (!app.isPackaged) return { ok: false };
  isQuitting = true;
  autoUpdater.quitAndInstall();
  return { ok: true };
});

ipcMain.handle("app:openExternal", (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    shell.openExternal(url);
    return { ok: true };
  }
  return { ok: false };
});

ipcMain.on("window:close", () => {
  if (mainWindow) {
    const settings = loadSettings();
    if (settings.closeToTray) {
      mainWindow.hide();
    } else {
      isQuitting = true;
      mainWindow.close();
    }
  }
});

ipcMain.on("window:quit", () => {
  isQuitting = true;
  app.quit();
});

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  app.whenReady().then(() => {
    const settings = loadSettings();
    applyAutoStart(settings.autoStart);
    createWindow();
    createTray();
    registerShortcuts();
    setupThemeWatcher();
    setupPowerWatcher();
    startRefreshLoop();
    setupAutoUpdater();
  });

  app.on("window-all-closed", () => {
    // Tray'de calismaya devam et.
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("activate", () => {
    if (!mainWindow) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
}
