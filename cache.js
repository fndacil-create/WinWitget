const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getCachePath() {
  return path.join(app.getPath("userData"), "weather-cache.json");
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(getCachePath(), "utf8"));
  } catch {
    return null;
  }
}

function saveCache(data) {
  fs.mkdirSync(path.dirname(getCachePath()), { recursive: true });
  fs.writeFileSync(getCachePath(), JSON.stringify(data, null, 2), "utf8");
}

module.exports = { loadCache, saveCache };
