function createRoundedRectShape(width, height, radius) {
  const r = Math.min(radius, Math.floor(Math.min(width, height) / 2));
  const rects = [];

  for (let y = 0; y < height; y += 1) {
    let xStart = 0;
    let xEnd = width;

    if (y < r) {
      const dy = r - y - 0.5;
      const dx = Math.sqrt(r * r - dy * dy);
      xStart = Math.max(0, Math.ceil(r - dx));
      xEnd = Math.min(width, Math.floor(width - r + dx));
    } else if (y >= height - r) {
      const dy = y - (height - r) + 0.5;
      const dx = Math.sqrt(r * r - dy * dy);
      xStart = Math.max(0, Math.ceil(r - dx));
      xEnd = Math.min(width, Math.floor(width - r + dx));
    }

    const spanWidth = xEnd - xStart;
    if (spanWidth > 0) {
      rects.push({ x: xStart, y, width: spanWidth, height: 1 });
    }
  }

  return rects;
}

function applyRoundedWindowShape(window, radius = 16) {
  if (process.platform !== "win32" && process.platform !== "linux") {
    return;
  }

  if (typeof window.setShape !== "function") {
    return;
  }

  const [width, height] = window.getContentSize();
  window.setShape(createRoundedRectShape(width, height, radius));
}

module.exports = { applyRoundedWindowShape, createRoundedRectShape };
