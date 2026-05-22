const { loadCache, saveCache } = require("./cache");

const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82]);
const STORM_CODES = new Set([95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

const DEFAULT_LOCATION = {
  latitude: 41.0082,
  longitude: 28.9784,
  name: "Istanbul",
};

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,uv_index,surface_pressure,visibility",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    forecast_days: "15",
    timezone: "auto",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  return response.json();
}

async function fetchAirQuality(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "us_aqi,pm2_5",
    timezone: "auto",
  });

  const response = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) {
    return { us_aqi: null, pm2_5: null };
  }

  const data = await response.json();
  return {
    us_aqi: data.current?.us_aqi ?? null,
    pm2_5: data.current?.pm2_5 ?? null,
  };
}

async function detectLocationByIp() {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return DEFAULT_LOCATION;
    }

    const data = await response.json();

    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        name: data.city || data.region || DEFAULT_LOCATION.name,
      };
    }
  } catch {
    // Fall back when IP lookup fails.
  }

  return DEFAULT_LOCATION;
}

function resolveLocation(settings) {
  if (settings.activeCityId && settings.activeCityId !== "auto") {
    const saved = settings.savedCities.find(
      (city) => city.id === settings.activeCityId
    );
    if (saved) {
      return saved;
    }
  }

  if (settings.locationMode === "manual" && settings.manualLocation) {
    return settings.manualLocation;
  }

  return detectLocationByIp();
}

function locationKey(location) {
  return `${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`;
}

async function resolveMonitorLocations(settings) {
  const locations = [];
  const seen = new Set();

  const add = (location) => {
    const key = locationKey(location);
    if (seen.has(key)) return;
    seen.add(key);
    locations.push(location);
  };

  (settings.savedCities || []).forEach((city) => {
    add({
      id: city.id,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    });
  });

  const includeAuto =
    settings.activeCityId === "auto" || !(settings.savedCities || []).length;

  if (includeAuto) {
    if (settings.locationMode === "manual" && settings.manualLocation) {
      add({
        id: "auto",
        name: settings.manualLocation.name,
        latitude: settings.manualLocation.latitude,
        longitude: settings.manualLocation.longitude,
      });
    } else {
      const auto = await detectLocationByIp();
      add({
        id: "auto",
        name: auto.name,
        latitude: auto.latitude,
        longitude: auto.longitude,
      });
    }
  }

  return locations;
}

function buildHourlyForecast(data) {
  const now = Date.now();
  const hours = [];

  for (let i = 0; i < data.hourly.time.length && hours.length < 8; i += 1) {
    const time = data.hourly.time[i];
    if (new Date(time).getTime() >= now - 30 * 60 * 1000) {
      hours.push({
        time,
        temperature: data.hourly.temperature_2m[i],
        weatherCode: data.hourly.weather_code[i],
        precipProbability: data.hourly.precipitation_probability[i],
      });
    }
  }

  return hours;
}

function buildDailyForecast(data) {
  const days = [];

  for (let i = 0; i < data.daily.time.length; i += 1) {
    days.push({
      date: data.daily.time[i],
      weatherCode: data.daily.weather_code[i],
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
      precipProbability: data.daily.precipitation_probability_max[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
    });
  }

  return days;
}

function getAqiLabel(aqi) {
  if (aqi == null) return "Bilinmiyor";
  if (aqi <= 50) return "İyi";
  if (aqi <= 100) return "Orta";
  if (aqi <= 150) return "Hassas";
  if (aqi <= 200) return "Sağlıksız";
  return "Tehlikeli";
}

function buildWeatherPayload(location, data, airQuality) {
  const today = buildDailyForecast(data)[0] || {};

  return {
    location: location.name,
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    weatherCode: data.current.weather_code,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    uvIndex: data.current.uv_index,
    pressure: data.current.surface_pressure,
    visibility: data.current.visibility,
    aqi: airQuality.us_aqi,
    aqiLabel: getAqiLabel(airQuality.us_aqi),
    pm25: airQuality.pm2_5,
    sunrise: today.sunrise,
    sunset: today.sunset,
    updatedAt: data.current.time,
    hourly: buildHourlyForecast(data),
    daily: buildDailyForecast(data),
    cached: false,
  };
}

async function getWeatherDataForLocation(location) {
  const data = await fetchWeather(location.latitude, location.longitude);
  return buildWeatherPayload(location, data, { us_aqi: null, pm2_5: null });
}

async function getWeatherData(settings) {
  const location = await resolveLocation(settings);

  try {
    const [data, airQuality] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAirQuality(location.latitude, location.longitude),
    ]);

    const payload = buildWeatherPayload(location, data, airQuality);
    saveCache({ ...payload, cachedAt: Date.now() });
    return payload;
  } catch (error) {
    const cached = loadCache();
    if (cached) {
      return { ...cached, cached: true };
    }
    throw error;
  }
}

function detectAlerts(weather, settings, cityKey = "default") {
  const alerts = [];
  const now = Date.now();
  const code = weather.weatherCode;
  const temp = weather.temperature;
  const alertPrefix = `${cityKey}:`;

  if (!settings.notifications?.enabled) {
    return alerts;
  }

  if (settings.notifications.stormAlert && STORM_CODES.has(code)) {
    alerts.push({
      id: `${alertPrefix}storm-now`,
      title: "Fırtına uyarısı",
      body: `${weather.location}: Fırtına koşulları mevcut.`,
    });
  }

  if (settings.notifications.rainAlert && RAIN_CODES.has(code)) {
    alerts.push({
      id: `${alertPrefix}rain-now`,
      title: "Yağmur uyarısı",
      body: `${weather.location}: Yağmur bekleniyor.`,
    });
  }

  if (settings.notifications.extremeTemp) {
    if (temp >= 35) {
      alerts.push({
        id: `${alertPrefix}heat-now`,
        title: "Aşırı sıcak",
        body: `${weather.location}: Sıcaklık ${Math.round(temp)}°C`,
      });
    } else if (temp <= -5) {
      alerts.push({
        id: `${alertPrefix}cold-now`,
        title: "Aşırı soğuk",
        body: `${weather.location}: Sıcaklık ${Math.round(temp)}°C`,
      });
    }
  }

  if (settings.notifications.umbrellaAlert) {
    const soon = weather.hourly.find((hour) => {
      const diff = new Date(hour.time).getTime() - now;
      return diff >= 0 && diff <= 30 * 60 * 1000;
    });

    if (
      soon &&
      soon.precipProbability >= 40 &&
      (RAIN_CODES.has(soon.weatherCode) || soon.precipProbability >= 60)
    ) {
      alerts.push({
        id: `${alertPrefix}umbrella-soon`,
        title: "Şemsiye al",
        body: `${weather.location}: 30 dk içinde yağmur olasılığı %${Math.round(soon.precipProbability)}`,
      });
    }
  }

  return alerts;
}

function filterNewAlerts(alerts, lastAlerts) {
  const next = { ...lastAlerts };
  const fresh = [];
  const cooldownMs = 60 * 60 * 1000;

  alerts.forEach((alert) => {
    const lastSent = next[alert.id] || 0;
    if (Date.now() - lastSent > cooldownMs) {
      fresh.push(alert);
      next[alert.id] = Date.now();
    }
  });

  return { alerts: fresh, lastAlerts: next };
}

async function checkAllNotifications(settings) {
  if (!settings.notifications?.enabled) {
    return { alerts: [], lastAlerts: settings.lastAlerts || {} };
  }

  const locations = await resolveMonitorLocations(settings);
  const allAlerts = [];

  for (const location of locations) {
    try {
      const weather = await getWeatherDataForLocation(location);
      allAlerts.push(...detectAlerts(weather, settings, location.id));
    } catch (error) {
      console.error(`Notification check failed for ${location.name}:`, error);
    }
  }

  return filterNewAlerts(allAlerts, settings.lastAlerts || {});
}

async function searchCities(query) {
  const params = new URLSearchParams({
    name: query,
    count: "6",
    language: "tr",
    format: "json",
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.results || []).map((item) => ({
    name: item.name,
    admin1: item.admin1 || "",
    country: item.country || "",
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}

module.exports = {
  getWeatherData,
  getWeatherDataForLocation,
  detectAlerts,
  filterNewAlerts,
  checkAllNotifications,
  resolveMonitorLocations,
  searchCities,
  RAIN_CODES,
  STORM_CODES,
  SNOW_CODES,
};
