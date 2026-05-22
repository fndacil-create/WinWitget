const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULT_SETTINGS = {
  locationMode: "auto",
  manualLocation: {
    name: "Istanbul",
    latitude: 41.0082,
    longitude: 28.9784,
  },
  savedCities: [],
  activeCityId: "auto",
  autoStart: true,
  closeToTray: true,
  alwaysOnTop: true,
  windowPosition: null,
  compactMode: false,
  theme: "dark",
  opacity: 92,
  size: "medium",
  notifications: {
    enabled: true,
    rainAlert: true,
    stormAlert: true,
    extremeTemp: true,
    umbrellaAlert: true,
  },
  batteryFriendly: true,
  lastAlerts: {},
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function deepMerge(base, patch) {
  const result = { ...base };

  Object.keys(patch).forEach((key) => {
    if (
      patch[key] &&
      typeof patch[key] === "object" &&
      !Array.isArray(patch[key]) &&
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], patch[key]);
    } else {
      result[key] = patch[key];
    }
  });

  return result;
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), "utf8");
    return deepMerge(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(partial) {
  const merged = deepMerge(loadSettings(), partial);
  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

module.exports = { DEFAULT_SETTINGS, loadSettings, saveSettings, deepMerge };
