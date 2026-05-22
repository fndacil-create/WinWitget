const locationEl = document.getElementById("location");
const temperatureEl = document.getElementById("temperature");
const feelsLikeEl = document.getElementById("feelsLike");
const conditionEl = document.getElementById("condition");
const weatherIconEl = document.getElementById("weatherIcon");
const metaEl = document.getElementById("meta");
const updatedAtEl = document.getElementById("updatedAt");
const errorEl = document.getElementById("error");
const cacheBadgeEl = document.getElementById("cacheBadge");
const hourlyRowEl = document.getElementById("hourlyRow");
const dailyRowEl = document.getElementById("dailyRow");
const cityTabsEl = document.getElementById("cityTabs");
const mainContentEl = document.getElementById("mainContent");
const widgetEl = document.getElementById("widget");

const uvMetaEl = document.getElementById("uvMeta");
const pressureMetaEl = document.getElementById("pressureMeta");
const visibilityMetaEl = document.getElementById("visibilityMeta");
const aqiMetaEl = document.getElementById("aqiMeta");
const sunMetaEl = document.getElementById("sunMeta");

const closeBtn = document.getElementById("closeBtn");
const compactBtn = document.getElementById("compactBtn");
const settingsBtn = document.getElementById("settingsBtn");
const refreshBtn = document.getElementById("refreshBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const citySearchEl = document.getElementById("citySearch");
const cityResultsEl = document.getElementById("cityResults");
const addCityBtn = document.getElementById("addCityBtn");
const savedCitiesEl = document.getElementById("savedCities");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const autoLocationToggle = document.getElementById("autoLocationToggle");
const autoStartToggle = document.getElementById("autoStartToggle");
const closeToTrayToggle = document.getElementById("closeToTrayToggle");
const alwaysOnTopToggle = document.getElementById("alwaysOnTopToggle");
const batteryFriendlyToggle = document.getElementById("batteryFriendlyToggle");
const themeSelect = document.getElementById("themeSelect");
const sizeSelect = document.getElementById("sizeSelect");
const opacityRange = document.getElementById("opacityRange");
const opacityValue = document.getElementById("opacityValue");

const notificationsToggle = document.getElementById("notificationsToggle");
const rainAlertToggle = document.getElementById("rainAlertToggle");
const stormAlertToggle = document.getElementById("stormAlertToggle");
const extremeTempToggle = document.getElementById("extremeTempToggle");
const umbrellaAlertToggle = document.getElementById("umbrellaAlertToggle");
const dayDetailPanel = document.getElementById("dayDetailPanel");
const dayDetailTitle = document.getElementById("dayDetailTitle");
const dayDetailBody = document.getElementById("dayDetailBody");
const closeDayDetailBtn = document.getElementById("closeDayDetailBtn");
const testNotificationBtn = document.getElementById("testNotificationBtn");
const testNotificationResult = document.getElementById("testNotificationResult");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const updateStatusEl = document.getElementById("updateStatus");
const updateVersionLabel = document.getElementById("updateVersionLabel");
const installUpdateBtn = document.getElementById("installUpdateBtn");

const MAX_SAVED_CITIES = 10;

let refreshTimer = null;
let searchTimer = null;
let currentSettings = null;
let selectedCity = null;
let lastDailyData = [];
let selectedDayIndex = null;

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function applyTheme(isDark) {
  document.body.dataset.theme = isDark ? "dark" : "light";
}

function applySettingsToUi(settings) {
  currentSettings = settings;
  document.body.dataset.size = settings.size || "medium";
  document.body.classList.toggle("compact", !!settings.compactMode);
  compactBtn.classList.toggle("active-compact", !!settings.compactMode);
  compactBtn.title = settings.compactMode
    ? "Tam görünüme geç"
    : "Kompakt görünüm — sadece sıcaklık ve ikon";
}


function renderHourly(hourly) {
  hourlyRowEl.innerHTML = "";
  hourly.forEach((item, index) => {
    const node = document.createElement("div");
    node.className = "hour-item";
    node.innerHTML = `
      <div class="time">${formatHour(item.time)}</div>
      <div class="weather-icon-3d icon-sm">${getWeatherIconSvg(item.weatherCode, `h${index}`)}</div>
      <div class="temp">${formatTemperature(item.temperature)}</div>
      <div class="precip">%${Math.round(item.precipProbability || 0)}</div>
    `;
    hourlyRowEl.appendChild(node);
  });
}

async function waitForLayout() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function syncDayDetailWindowHeight(open) {
  if (!open) {
    await window.widget.setDayDetailOpen(false, 0);
    return;
  }

  await waitForLayout();
  const height = Math.ceil(dayDetailPanel.offsetHeight + 8);
  await window.widget.setDayDetailOpen(true, height);
}

async function closeDayDetail() {
  selectedDayIndex = null;
  dayDetailPanel.classList.add("hidden");
  dailyRowEl.querySelectorAll(".day-item").forEach((el) => {
    el.classList.remove("selected");
  });
  await syncDayDetailWindowHeight(false);
}

async function openDayDetail(item, index) {
  const info = getWeatherInfo(item.weatherCode);
  selectedDayIndex = index;

  dailyRowEl.querySelectorAll(".day-item").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });

  dayDetailTitle.textContent = formatFullDate(item.date);
  dayDetailBody.innerHTML = `
    <div class="day-detail-row"><span>Durum</span><span class="day-detail-icon"><span class="weather-icon-3d icon-xs">${getWeatherIconSvg(item.weatherCode, `detail-${index}`)}</span>${info.label}</span></div>
    <div class="day-detail-row"><span>Sıcaklık</span><span>${formatTemperature(item.min)} / ${formatTemperature(item.max)}</span></div>
    <div class="day-detail-row"><span>Yağmur olasılığı</span><span>%${Math.round(item.precipProbability || 0)}</span></div>
    <div class="day-detail-row"><span>Gün doğumu</span><span>${formatTime(item.sunrise)}</span></div>
    <div class="day-detail-row"><span>Gün batımı</span><span>${formatTime(item.sunset)}</span></div>
  `;
  dayDetailPanel.classList.remove("hidden");
  await syncDayDetailWindowHeight(true);
  dayDetailPanel.querySelectorAll("img").forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => syncDayDetailWindowHeight(true), { once: true });
    }
  });
}

function renderDaily(daily) {
  lastDailyData = daily;
  dailyRowEl.innerHTML = "";

  if (selectedDayIndex !== null && selectedDayIndex >= daily.length) {
    closeDayDetail();
  }

  daily.forEach((item, index) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `day-item${selectedDayIndex === index ? " selected" : ""}`;
    node.innerHTML = `
      <div class="day">${formatDay(item.date)}</div>
      <div class="weather-icon-3d icon-sm">${getWeatherIconSvg(item.weatherCode, `d${index}`)}</div>
      <div class="temp">${formatTemperature(item.max)}</div>
      <div class="precip">%${Math.round(item.precipProbability || 0)}</div>
      <div class="range">${formatTemperature(item.min)} / ${formatTemperature(item.max)}</div>
    `;
    node.addEventListener("click", async () => {
      if (selectedDayIndex === index) {
        await closeDayDetail();
      } else {
        await openDayDetail(item, index);
      }
    });
    dailyRowEl.appendChild(node);
  });

  if (selectedDayIndex !== null && daily[selectedDayIndex]) {
    openDayDetail(daily[selectedDayIndex], selectedDayIndex);
  }
}

function showCityLoadingState(cityName) {
  // Sekme tıklamasında anında görsel feedback. Önceki şehrin verileri ekranda
  // kalmasın; eski daily/hourly da temizlensin ki kullanıcı yanlış veri görmesin.
  locationEl.textContent = cityName || "Yükleniyor...";
  temperatureEl.textContent = "--°";
  feelsLikeEl.textContent = "";
  conditionEl.textContent = "Yükleniyor...";
  metaEl.textContent = "";
  uvMetaEl.textContent = "UV --";
  pressureMetaEl.textContent = "-- hPa";
  visibilityMetaEl.textContent = "-- km";
  aqiMetaEl.textContent = "AQI --";
  sunMetaEl.textContent = "☀ -- · 🌙 --";
  hourlyRowEl.innerHTML = "";
  dailyRowEl.innerHTML = "";
  cacheBadgeEl.classList.add("hidden");
  clearError();
}

async function switchToCity(partial, displayName) {
  // 1. Önce yerel state'i optimistik güncelle ve sekmeyi anında highlight et.
  currentSettings = { ...currentSettings, ...partial };
  renderCityTabs(currentSettings);
  showCityLoadingState(displayName);

  // 2. Disk yazımını arka planda başlat (await'i refreshWeather ile paralel yürüt)
  //    ama yarış durumlarını önlemek için yine de await et — bu IPC hafif, hızlı.
  try {
    await window.widget.setActiveCity(partial);
  } catch (error) {
    console.error("Aktif şehir kaydedilemedi:", error);
  }

  // 3. Yeni şehrin verisini çek.
  refreshWeather();
}

function renderCityTabs(settings) {
  cityTabsEl.innerHTML = "";

  const autoBtn = document.createElement("button");
  autoBtn.className = `city-tab${settings.activeCityId === "auto" ? " active" : ""}`;
  autoBtn.textContent = "Otomatik";
  autoBtn.addEventListener("click", () => {
    if (currentSettings?.activeCityId === "auto") return;
    switchToCity({ activeCityId: "auto", locationMode: "auto" }, "Otomatik konum");
  });
  cityTabsEl.appendChild(autoBtn);

  (settings.savedCities || []).forEach((city) => {
    const btn = document.createElement("button");
    btn.className = `city-tab${settings.activeCityId === city.id ? " active" : ""}`;
    btn.textContent = city.name;
    btn.addEventListener("click", () => {
      if (currentSettings?.activeCityId === city.id) return;
      switchToCity(
        {
          activeCityId: city.id,
          locationMode: "manual",
          manualLocation: {
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
          },
        },
        city.name
      );
    });
    cityTabsEl.appendChild(btn);
  });
}

function renderWeather(data) {
  const info = getWeatherInfo(data.weatherCode);

  locationEl.textContent = data.location;
  temperatureEl.textContent = formatTemperature(data.temperature);
  feelsLikeEl.textContent =
    typeof data.feelsLike === "number"
      ? `(hissedilen ${formatTemperature(data.feelsLike)})`
      : "";
  conditionEl.textContent = info.label;
  weatherIconEl.innerHTML = getWeatherIconSvg(data.weatherCode, "main");

  metaEl.textContent = `Nem ${Math.round(data.humidity)}% · Rüzgar ${Math.round(data.windSpeed)} km/s`;
  updatedAtEl.textContent = data.cached
    ? `Önbellek ${formatTime(data.updatedAt)}`
    : `Güncellendi ${formatTime(data.updatedAt)}`;

  uvMetaEl.textContent = `UV ${Math.round(data.uvIndex ?? 0)}`;
  pressureMetaEl.textContent = formatPressure(data.pressure);
  visibilityMetaEl.textContent = formatKm(data.visibility);
  aqiMetaEl.textContent = `AQI ${data.aqi ?? "--"} (${data.aqiLabel || "--"})`;
  sunMetaEl.textContent = `☀ ${formatTime(data.sunrise)} · 🌙 ${formatTime(data.sunset)}`;

  cacheBadgeEl.classList.toggle("hidden", !data.cached);
  renderHourly(data.hourly || []);
  renderDaily(data.daily || []);
}

async function refreshWeather() {
  try {
    const data = await window.widget.getWeather();
    renderWeather(data);
    clearError();
  } catch (error) {
    showError("Hava durumu alınamadı. İnternet bağlantını kontrol et.");
    console.error(error);
  }
}

async function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  const power = await window.widget.getPowerInfo();
  refreshTimer = setInterval(refreshWeather, power.refreshIntervalMs);
}

function renderCityResults(cities) {
  cityResultsEl.innerHTML = "";
  if (cities.length === 0) {
    cityResultsEl.innerHTML = '<div class="city-option">Sonuç bulunamadı</div>';
    return;
  }

  cities.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "city-option";
    button.innerHTML = `
      ${city.name}
      <span class="sub">${[city.admin1, city.country].filter(Boolean).join(", ")}</span>
    `;
    button.addEventListener("click", () => {
      selectedCity = city;
      citySearchEl.value = city.name;
      cityResultsEl.querySelectorAll(".city-option").forEach((el) => {
        el.classList.remove("selected");
      });
      button.classList.add("selected");
      autoLocationToggle.checked = false;
    });
    cityResultsEl.appendChild(button);
  });
}

function renderSavedCities() {
  savedCitiesEl.innerHTML = "";
  (currentSettings.savedCities || []).forEach((city) => {
    const row = document.createElement("div");
    row.className = "saved-city";
    row.innerHTML = `<span>${city.name}</span>`;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Sil";
    removeBtn.addEventListener("click", async () => {
      const savedCities = currentSettings.savedCities.filter((c) => c.id !== city.id);
      const activeCityId =
        currentSettings.activeCityId === city.id ? "auto" : currentSettings.activeCityId;
      currentSettings = await window.widget.saveSettings({ savedCities, activeCityId });
      renderCityTabs(currentSettings);
      renderSavedCities();
      refreshWeather();
    });
    row.appendChild(removeBtn);
    savedCitiesEl.appendChild(row);
  });
}

async function searchCities(query) {
  try {
    renderCityResults(await window.widget.searchCities(query));
  } catch (error) {
    cityResultsEl.innerHTML = '<div class="city-option">Arama başarısız</div>';
    console.error(error);
  }
}

function openSettings() {
  settingsPanel.classList.remove("hidden");
}

function closeSettings() {
  settingsPanel.classList.add("hidden");
}

async function loadSettingsIntoForm() {
  currentSettings = await window.widget.getSettings();
  applySettingsToUi(currentSettings);
  renderCityTabs(currentSettings);
  renderSavedCities();

  autoLocationToggle.checked = currentSettings.locationMode === "auto";
  autoStartToggle.checked = currentSettings.autoStart;
  closeToTrayToggle.checked = currentSettings.closeToTray !== false;
  alwaysOnTopToggle.checked = currentSettings.alwaysOnTop !== false;
  batteryFriendlyToggle.checked = currentSettings.batteryFriendly !== false;
  themeSelect.value = currentSettings.theme || "dark";
  sizeSelect.value = currentSettings.size || "medium";
  opacityRange.value = currentSettings.opacity || 92;
  opacityValue.textContent = currentSettings.opacity || 92;
  citySearchEl.value = currentSettings.manualLocation?.name || "";
  selectedCity = currentSettings.manualLocation || null;

  const n = currentSettings.notifications || {};
  notificationsToggle.checked = n.enabled !== false;
  rainAlertToggle.checked = n.rainAlert !== false;
  stormAlertToggle.checked = n.stormAlert !== false;
  extremeTempToggle.checked = n.extremeTemp !== false;
  umbrellaAlertToggle.checked = n.umbrellaAlert !== false;

  const theme = await window.widget.getTheme();
  applyTheme(theme === "dark");
}

async function saveSettings() {
  const nextSettings = {
    locationMode: autoLocationToggle.checked ? "auto" : "manual",
    activeCityId: autoLocationToggle.checked ? "auto" : currentSettings.activeCityId,
    autoStart: autoStartToggle.checked,
    closeToTray: closeToTrayToggle.checked,
    alwaysOnTop: alwaysOnTopToggle.checked,
    batteryFriendly: batteryFriendlyToggle.checked,
    theme: themeSelect.value,
    size: sizeSelect.value,
    opacity: Number(opacityRange.value),
    notifications: {
      enabled: notificationsToggle.checked,
      rainAlert: rainAlertToggle.checked,
      stormAlert: stormAlertToggle.checked,
      extremeTemp: extremeTempToggle.checked,
      umbrellaAlert: umbrellaAlertToggle.checked,
    },
    savedCities: currentSettings.savedCities || [],
  };

  if (!autoLocationToggle.checked) {
    if (!selectedCity && currentSettings.manualLocation) {
      selectedCity = currentSettings.manualLocation;
    }
    if (!selectedCity) {
      showError("Manuel konum için bir şehir seç.");
      return;
    }
    nextSettings.manualLocation = {
      name: selectedCity.name,
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
    };
    nextSettings.activeCityId =
      currentSettings.savedCities.find(
        (city) =>
          city.latitude === selectedCity.latitude &&
          city.longitude === selectedCity.longitude
      )?.id || currentSettings.activeCityId;
  }

  currentSettings = await window.widget.saveSettings(nextSettings);
  applySettingsToUi(currentSettings);
  renderCityTabs(currentSettings);
  closeSettings();
  clearError();
  await startAutoRefresh();
  refreshWeather();
}

closeDayDetailBtn.addEventListener("click", closeDayDetail);

testNotificationBtn.addEventListener("click", async () => {
  testNotificationResult.classList.remove("hidden", "error");
  try {
    const result = await window.widget.testNotification();
    if (result.ok) {
      testNotificationResult.textContent =
        "Test bildirimi gönderildi. Windows sağ alt köşeye bak.";
    } else {
      testNotificationResult.textContent = result.reason || "Bildirim gönderilemedi.";
      testNotificationResult.classList.add("error");
    }
  } catch (error) {
    testNotificationResult.textContent = "Bildirim testi başarısız.";
    testNotificationResult.classList.add("error");
    console.error(error);
  }
});

function setUpdateStatus(text, type = "info") {
  if (!text) {
    updateStatusEl.textContent = "";
    updateStatusEl.classList.add("hidden");
    return;
  }
  updateStatusEl.textContent = text;
  updateStatusEl.classList.remove("hidden", "error", "success");
  if (type === "error") updateStatusEl.classList.add("error");
  if (type === "success") updateStatusEl.classList.add("success");
}

async function loadAppVersion() {
  try {
    const version = await window.widget.getVersion();
    updateVersionLabel.textContent = `Sürüm ${version}`;
  } catch {
    updateVersionLabel.textContent = "Sürüm bilinmiyor";
  }
}

checkUpdateBtn.addEventListener("click", async () => {
  checkUpdateBtn.disabled = true;
  setUpdateStatus("Güncellemeler kontrol ediliyor...", "info");
  try {
    const result = await window.widget.checkForUpdates();
    if (!result.ok) {
      setUpdateStatus(result.reason || "Güncelleme kontrolü başarısız.", "error");
    } else if (result.available) {
      setUpdateStatus(
        `Yeni sürüm bulundu (${result.version}). İndiriliyor...`,
        "info"
      );
    } else {
      setUpdateStatus("Zaten en güncel sürümü kullanıyorsun.", "success");
    }
  } catch (error) {
    setUpdateStatus("Güncelleme kontrolü başarısız.", "error");
    console.error(error);
  } finally {
    checkUpdateBtn.disabled = false;
  }
});

installUpdateBtn.addEventListener("click", () => {
  window.widget.installUpdateNow();
});

window.widget.onUpdateStatus((status) => {
  switch (status.state) {
    case "checking":
      setUpdateStatus("Güncellemeler kontrol ediliyor...", "info");
      break;
    case "none":
      // Otomatik kontrol durumlarında "güncel" mesajını bastırmıyoruz —
      // sadece kullanıcı manuel kontrol ettiyse "güncel" yazısı checkUpdateBtn handler'ında zaten gösterildi.
      break;
    case "available":
      setUpdateStatus(
        `Yeni sürüm bulundu (${status.version}). Arka planda indiriliyor...`,
        "info"
      );
      break;
    case "downloading":
      if (typeof status.percent === "number") {
        setUpdateStatus(`İndiriliyor... %${Math.round(status.percent)}`, "info");
      }
      break;
    case "downloaded":
      setUpdateStatus(
        `Sürüm ${status.version} indirildi. Kurulum için yeniden başlat.`,
        "success"
      );
      installUpdateBtn.classList.remove("hidden");
      break;
    case "error":
      setUpdateStatus(status.message || "Güncelleme hatası.", "error");
      break;
  }
});

closeBtn.addEventListener("click", () => window.widget.close());
compactBtn.addEventListener("click", async () => {
  currentSettings = await window.widget.toggleCompact();
  applySettingsToUi(currentSettings);
});
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
saveSettingsBtn.addEventListener("click", saveSettings);

refreshBtn.addEventListener("click", async (event) => {
  event.stopPropagation();
  if (refreshBtn.disabled) return;

  refreshBtn.disabled = true;
  refreshBtn.classList.add("spinning");
  refreshBtn.title = "Yenileniyor...";

  // API çağrısı çok hızlı dönebileceği için animasyonun en az 600ms
  // görünür olmasını sağlıyoruz; kullanıcı tıklamanın işlendiğini hissetsin.
  const minSpin = new Promise((resolve) => setTimeout(resolve, 600));
  try {
    await Promise.all([refreshWeather(), minSpin]);
  } finally {
    refreshBtn.classList.remove("spinning");
    refreshBtn.disabled = false;
    refreshBtn.title = "Hava durumunu yenile";
  }
});

widgetEl.addEventListener("click", async (event) => {
  if (!document.body.classList.contains("compact")) return;
  if (event.target.closest(".header-actions")) return;
  currentSettings = await window.widget.toggleCompact();
  applySettingsToUi(currentSettings);
});

mainContentEl.addEventListener("click", async () => {
  if (!document.body.classList.contains("compact")) return;
  currentSettings = await window.widget.toggleCompact();
  applySettingsToUi(currentSettings);
});

addCityBtn.addEventListener("click", async () => {
  if (!selectedCity) {
    showError("Önce bir şehir seç.");
    return;
  }

  const savedCities = [...(currentSettings.savedCities || [])];
  if (savedCities.length >= MAX_SAVED_CITIES) {
    showError(`En fazla ${MAX_SAVED_CITIES} şehir kaydedebilirsin.`);
    return;
  }

  const exists = savedCities.some(
    (city) =>
      city.latitude === selectedCity.latitude &&
      city.longitude === selectedCity.longitude
  );
  if (exists) {
    showError("Bu şehir zaten kayıtlı.");
    return;
  }

  const id = `city-${Date.now()}`;
  savedCities.push({
    id,
    name: selectedCity.name,
    latitude: selectedCity.latitude,
    longitude: selectedCity.longitude,
  });

  currentSettings = await window.widget.saveSettings({
    savedCities,
    activeCityId: id,
    locationMode: "manual",
    manualLocation: {
      name: selectedCity.name,
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
    },
  });

  renderCityTabs(currentSettings);
  renderSavedCities();
  refreshWeather();
  clearError();
});

citySearchEl.addEventListener("input", () => {
  if (searchTimer) clearTimeout(searchTimer);
  const query = citySearchEl.value.trim();
  if (query.length < 2) {
    cityResultsEl.innerHTML = "";
    return;
  }
  searchTimer = setTimeout(() => searchCities(query), 300);
});

opacityRange.addEventListener("input", async () => {
  opacityValue.textContent = opacityRange.value;
  currentSettings = await window.widget.saveSettings({
    opacity: Number(opacityRange.value),
  });
  applySettingsToUi(currentSettings);
});

sizeSelect.addEventListener("change", async () => {
  currentSettings = await window.widget.saveSettings({
    size: sizeSelect.value,
    compactMode: false,
  });
  applySettingsToUi(currentSettings);
});

themeSelect.addEventListener("change", async () => {
  currentSettings = await window.widget.saveSettings({
    theme: themeSelect.value,
  });
  applySettingsToUi(currentSettings);
  const theme = await window.widget.getTheme();
  applyTheme(theme === "dark");
});

alwaysOnTopToggle.addEventListener("change", async () => {
  currentSettings = await window.widget.saveSettings({
    alwaysOnTop: alwaysOnTopToggle.checked,
  });
  applySettingsToUi(currentSettings);
});

autoLocationToggle.addEventListener("change", () => {
  if (autoLocationToggle.checked) {
    selectedCity = null;
    cityResultsEl.innerHTML = "";
  }
});

window.widget.onSettingsChanged(async (settings) => {
  currentSettings = settings;
  applySettingsToUi(settings);
  renderCityTabs(settings);
  // Panel hâlâ açık VE DOM'da görünürse yeniden ölç. Gizli paneli ölçmek
  // offsetHeight=0 verir ve sahte bir "büyüt" komutuna sebep olur.
  if (
    selectedDayIndex !== null &&
    !dayDetailPanel.classList.contains("hidden")
  ) {
    await syncDayDetailWindowHeight(true);
  }
});

window.widget.onThemeChanged((isDark) => applyTheme(isDark));
window.widget.onWeatherUpdated((weather) => renderWeather(weather));
window.widget.onOpenSettings(openSettings);

loadSettingsIntoForm();
loadAppVersion();
refreshWeather();
startAutoRefresh();
