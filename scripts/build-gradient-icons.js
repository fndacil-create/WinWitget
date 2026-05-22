const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE_DIR = path.join(__dirname, "..", "renderer", "icons", "_source");
const ICON_DIR = path.join(__dirname, "..", "renderer", "icons", "gradient-3d");
const TRAY_ICON = path.join(__dirname, "..", "assets", "tray.png");

const ICON_MAP = {
  "gs-sun.png": "sun.png",
  "gs-sun-hazy.png": "sun-hazy.png",
  "gs-partly.png": "partly.png",
  "gs-cloud.png": "cloud.png",
  "gs-fog.png": "fog.png",
  "gs-rain-light.png": "rain-light.png",
  "gs-rain.png": "rain.png",
  "gs-snow.png": "snow.png",
  "gs-storm.png": "storm.png",
  "gs-default.png": "default.png",
};

function isGreenScreen(r, g, b) {
  if (g < 90) return false;
  if (g < r + 25) return false;
  if (g < b + 25) return false;
  return true;
}

function removeGreenScreen(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isGreenScreen(r, g, b)) {
      data[i + 3] = 0;
      continue;
    }

    const greenness = g - Math.max(r, b);
    if (greenness > 12 && g > 70) {
      const alpha = Math.max(0, 255 - greenness * 10);
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  return data;
}

async function processIcon(sourcePath, targetPath) {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleaned = removeGreenScreen(Buffer.from(data));

  await sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim()
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
}

async function writeTrayIcon() {
  const partlyPath = path.join(ICON_DIR, "partly.png");
  if (!fs.existsSync(partlyPath)) return;

  await fs.promises.mkdir(path.dirname(TRAY_ICON), { recursive: true });
  await sharp(partlyPath)
    .resize(32, 32, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(TRAY_ICON);

  console.log("partly.png -> assets/tray.png");
}

async function main() {
  for (const [sourceName, targetName] of Object.entries(ICON_MAP)) {
    const sourcePath = path.join(SOURCE_DIR, sourceName);
    const targetPath = path.join(ICON_DIR, targetName);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing source icon: ${sourcePath}`);
    }

    await processIcon(sourcePath, targetPath);
    console.log(`${sourceName} -> ${targetName}`);
  }

  await writeTrayIcon();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
