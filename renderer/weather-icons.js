const GRADIENT_3D_ICONS = {
  sun: "icons/gradient-3d/sun.png",
  "sun-hazy": "icons/gradient-3d/sun-hazy.png",
  partly: "icons/gradient-3d/partly.png",
  cloud: "icons/gradient-3d/cloud.png",
  fog: "icons/gradient-3d/fog.png",
  "rain-light": "icons/gradient-3d/rain-light.png",
  rain: "icons/gradient-3d/rain.png",
  snow: "icons/gradient-3d/snow.png",
  storm: "icons/gradient-3d/storm.png",
  default: "icons/gradient-3d/default.png",
};

function getWeatherIconType(code) {
  if (code === 0) return "sun";
  if (code === 1) return "sun-hazy";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 61].includes(code)) return "rain-light";
  if ([63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "default";
}

function getWeatherIconSrc(code) {
  const type = getWeatherIconType(code);
  return GRADIENT_3D_ICONS[type] || GRADIENT_3D_ICONS.default;
}

function getWeatherIconSvg(code) {
  const src = getWeatherIconSrc(code);
  return `<img src="${src}?v=4" alt="" draggable="false" decoding="async" />`;
}
