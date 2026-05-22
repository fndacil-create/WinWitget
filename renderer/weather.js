const WEATHER_MAP = {
  0: { label: "Açık", icon: "☀️" },
  1: { label: "Çoğunlukla açık", icon: "🌤️" },
  2: { label: "Parçalı bulutlu", icon: "⛅" },
  3: { label: "Kapalı", icon: "☁️" },
  45: { label: "Sisli", icon: "🌫️" },
  48: { label: "Sisli", icon: "🌫️" },
  51: { label: "Hafif çisenti", icon: "🌦️" },
  53: { label: "Çisenti", icon: "🌦️" },
  55: { label: "Yoğun çisenti", icon: "🌧️" },
  61: { label: "Hafif yağmur", icon: "🌧️" },
  63: { label: "Yağmur", icon: "🌧️" },
  65: { label: "Şiddetli yağmur", icon: "🌧️" },
  71: { label: "Hafif kar", icon: "🌨️" },
  73: { label: "Kar", icon: "🌨️" },
  75: { label: "Yoğun kar", icon: "❄️" },
  77: { label: "Kar taneleri", icon: "❄️" },
  80: { label: "Sağanak", icon: "🌦️" },
  81: { label: "Kuvvetli sağanak", icon: "🌧️" },
  82: { label: "Şiddetli sağanak", icon: "⛈️" },
  85: { label: "Kar sağanağı", icon: "🌨️" },
  86: { label: "Yoğun kar sağanağı", icon: "❄️" },
  95: { label: "Fırtına", icon: "⛈️" },
  96: { label: "Dolu fırtınası", icon: "⛈️" },
  99: { label: "Şiddetli dolu", icon: "⛈️" },
};

function getWeatherInfo(code) {
  return WEATHER_MAP[code] || { label: "Bilinmiyor", icon: "🌡️" };
}

function formatTime(isoString) {
  if (!isoString) return "--";
  return new Date(isoString).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHour(isoString) {
  return formatTime(isoString);
}

function formatDay(isoString) {
  if (!isoString) return "--";
  return new Date(isoString).toLocaleDateString("tr-TR", { weekday: "short" });
}

function formatFullDate(isoString) {
  if (!isoString) return "--";
  return new Date(isoString).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTemperature(value) {
  if (typeof value !== "number") return "--°";
  return `${Math.round(value)}°`;
}

function formatKm(value) {
  if (typeof value !== "number") return "-- km";
  return `${(value / 1000).toFixed(1)} km`;
}

function formatPressure(value) {
  if (typeof value !== "number") return "-- hPa";
  return `${Math.round(value)} hPa`;
}
