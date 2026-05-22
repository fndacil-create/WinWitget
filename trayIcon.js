const path = require("path");
const fs = require("fs");
const { nativeImage } = require("electron");

const WEATHER_TRAY_ICON = path.join(
  __dirname,
  "renderer",
  "icons",
  "gradient-3d",
  "partly.png"
);
const FALLBACK_TRAY_ICON = path.join(__dirname, "assets", "tray.png");

function getTrayIconPath() {
  if (fs.existsSync(WEATHER_TRAY_ICON)) return WEATHER_TRAY_ICON;
  if (fs.existsSync(FALLBACK_TRAY_ICON)) return FALLBACK_TRAY_ICON;

  require(path.join(__dirname, "scripts", "create-tray-icon.js"));
  return FALLBACK_TRAY_ICON;
}

function getTrayIcon() {
  const iconPath = getTrayIconPath();
  let image = nativeImage.createFromPath(iconPath);

  if (image.isEmpty()) {
    image = nativeImage.createFromBuffer(fs.readFileSync(iconPath));
  }

  const size = process.platform === "win32" ? 16 : 20;
  return image.resize({ width: size, height: size });
}

function getNotificationIcon() {
  return getTrayIconPath();
}

module.exports = { getTrayIcon, getNotificationIcon };
