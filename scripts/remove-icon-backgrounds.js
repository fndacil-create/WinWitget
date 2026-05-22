const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ICON_DIR = path.join(__dirname, "..", "renderer", "icons", "gradient-3d");
const EDGE_TOLERANCE = 48;
const ICON_VERSION = "3";

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function sampleEdgeBackground(data, width, height) {
  const samples = [];

  for (let x = 0; x < width; x += 1) {
    samples.push([data[x * 4], data[x * 4 + 1], data[x * 4 + 2]]);
    const b = ((height - 1) * width + x) * 4;
    samples.push([data[b], data[b + 1], data[b + 2]]);
  }
  for (let y = 0; y < height; y += 1) {
    const l = (y * width) * 4;
    const r = (y * width + width - 1) * 4;
    samples.push([data[l], data[l + 1], data[l + 2]]);
    samples.push([data[r], data[r + 1], data[r + 2]]);
  }

  const r = samples.reduce((sum, c) => sum + c[0], 0) / samples.length;
  const g = samples.reduce((sum, c) => sum + c[1], 0) / samples.length;
  const b = samples.reduce((sum, c) => sum + c[2], 0) / samples.length;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function isBackgroundLike(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;

  if (max >= 248 && saturation <= 12) return true;
  if (max >= 235 && saturation <= 8) return true;
  return false;
}

function removeEdgeBackground(data, width, height) {
  const [bgR, bgG, bgB] = sampleEdgeBackground(data, width, height);
  const visited = new Uint8Array(width * height);
  const queue = [];

  const matchesBg = (i) =>
    colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= EDGE_TOLERANCE ||
    isBackgroundLike(data[i], data[i + 1], data[i + 2]);

  const pushIfMatch = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!matchesBg(i)) return;
    visited[idx] = 1;
    queue.push([x, y]);
  };

  for (let x = 0; x < width; x += 1) {
    pushIfMatch(x, 0);
    pushIfMatch(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfMatch(0, y);
    pushIfMatch(width - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    const i = (y * width + x) * 4;
    data[i + 3] = 0;

    if (x > 0) pushIfMatch(x - 1, y);
    if (x < width - 1) pushIfMatch(x + 1, y);
    if (y > 0) pushIfMatch(x, y - 1);
    if (y < height - 1) pushIfMatch(x, y + 1);
  }
}

function erodeBackgroundFromTransparency(data, width, height) {
  let changed = true;

  while (changed) {
    changed = false;
    const next = Buffer.from(data);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const i = idx * 4;
        if (data[i + 3] === 0) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (!isBackgroundLike(r, g, b)) continue;

        const touchesTransparent =
          x === 0 ||
          y === 0 ||
          x === width - 1 ||
          y === height - 1 ||
          data[((y - 1) * width + x) * 4 + 3] === 0 ||
          data[((y + 1) * width + x) * 4 + 3] === 0 ||
          data[(y * width + (x - 1)) * 4 + 3] === 0 ||
          data[(y * width + (x + 1)) * 4 + 3] === 0;

        if (touchesTransparent) {
          next[i + 3] = 0;
          changed = true;
        }
      }
    }

    next.copy(data);
  }
}

async function processIcon(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleaned = Buffer.from(data);
  removeEdgeBackground(cleaned, info.width, info.height);
  erodeBackgroundFromTransparency(cleaned, info.width, info.height);

  await sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim()
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(`${filePath}.tmp`);

  fs.renameSync(`${filePath}.tmp`, filePath);
  console.log(`ok ${path.basename(filePath)}`);
}

async function main() {
  const files = fs
    .readdirSync(ICON_DIR)
    .filter((f) => f.endsWith(".png") && !f.startsWith("_"));

  for (const file of files) {
    await processIcon(path.join(ICON_DIR, file));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { ICON_VERSION };
