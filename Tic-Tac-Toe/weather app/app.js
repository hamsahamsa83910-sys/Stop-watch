/* -------------------------------------------------------------
 * AetherWeather Core Logic & Controller
 * Integrates APIs, Geolocation, Voice Search, Mapping, and Particles
 * ------------------------------------------------------------- */

// Global Application State
const state = {
    units: 'celsius', // 'celsius' or 'fahrenheit'
    theme: 'dark', // 'dark' or 'light'
    utcOffsetSeconds: 0,
    clockInterval: null,
    weatherEffects: null,
    leafletMap: null,
    mapMarker: null,
    tileLayer: null,
    recentSearches: [],
    currentCoords: { lat: 51.5085, lon: -0.1257 }, // Default London
    currentCityName: "London",
    currentCountryCode: "GB"
};

// WMO Weather Code Directory (Code -> Info Mapping)
const WMO_CODES = {
    0: { label: "Clear Sky", icon: "fa-sun", effect: "clear" },
    1: { label: "Mainly Clear", icon: "fa-cloud-sun", effect: "clear" },
    2: { label: "Partly Cloudy", icon: "fa-cloud-sun", effect: "clouds" },
    3: { label: "Overcast", icon: "fa-cloud", effect: "clouds" },
    45: { label: "Foggy", icon: "fa-smog", effect: "fog" },
    48: { label: "Depositing Rime Fog", icon: "fa-smog", effect: "fog" },
    51: { label: "Light Drizzle", icon: "fa-cloud-rain", effect: "rain" },
    53: { label: "Moderate Drizzle", icon: "fa-cloud-rain", effect: "rain" },
    55: { label: "Dense Drizzle", icon: "fa-cloud-rain", effect: "rain" },
    56: { label: "Light Freezing Drizzle", icon: "fa-cloud-rain", effect: "rain" },
    57: { label: "Dense Freezing Drizzle", icon: "fa-cloud-rain", effect: "rain" },
    61: { label: "Slight Rain", icon: "fa-cloud-showers-heavy", effect: "rain" },
    63: { label: "Moderate Rain", icon: "fa-cloud-showers-heavy", effect: "rain" },
    65: { label: "Heavy Rain", icon: "fa-cloud-showers-heavy", effect: "rain" },
    66: { label: "Light Freezing Rain", icon: "fa-cloud-showers-heavy", effect: "rain" },
    67: { label: "Heavy Freezing Rain", icon: "fa-cloud-showers-heavy", effect: "rain" },
    71: { label: "Slight Snowfall", icon: "fa-snowflake", effect: "snow" },
    73: { label: "Moderate Snowfall", icon: "fa-snowflake", effect: "snow" },
    75: { label: "Heavy Snowfall", icon: "fa-snowflake", effect: "snow" },
    77: { label: "Snow Grains", icon: "fa-snowflake", effect: "snow" },
    80: { label: "Slight Rain Showers", icon: "fa-cloud-sun-rain", effect: "rain" },
    81: { label: "Moderate Rain Showers", icon: "fa-cloud-sun-rain", effect: "rain" },
    82: { label: "Violent Rain Showers", icon: "fa-cloud-sun-rain", effect: "rain" },
    85: { label: "Slight Snow Showers", icon: "fa-snowflake", effect: "snow" },
    86: { label: "Heavy Snow Showers", icon: "fa-snowflake", effect: "snow" },
    95: { label: "Thunderstorm", icon: "fa-cloud-bolt", effect: "thunderstorm" },
    96: { label: "Thunderstorm with Slight Hail", icon: "fa-cloud-bolt", effect: "thunderstorm" },
    99: { label: "Thunderstorm with Heavy Hail", icon: "fa-cloud-bolt", effect: "thunderstorm" }
};

// Tile Layer URLs for Leaflet Map
const MAP_TILES = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

// DOM Elements
const elements = {
    loaderOverlay: document.getElementById('loader-overlay'),
    voiceOverlay: document.getElementById('voice-overlay'),
    voiceTranscript: document.getElementById('voice-transcript'),
    closeVoiceBtn: document.getElementById('close-voice-btn'),
    voiceSearchBtn: document.getElementById('voice-search-btn'),
    geolocationBtn: document.getElementById('geolocation-btn'),
    citySearchInput: document.getElementById('city-search-input'),
    searchSuggestions: document.getElementById('search-suggestions'),
    unitToggleBtn: document.getElementById('unit-toggle-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    historyPills: document.getElementById('history-pills'),
    errorToast: document.getElementById('error-toast'),
    closeToastBtn: document.getElementById('close-toast-btn'),
    
    // Hero Elements
    heroCityName: document.getElementById('hero-city-name'),
    heroCountryCode: document.getElementById('hero-country-code'),
    liveTime: document.getElementById('live-time'),
    liveDate: document.getElementById('live-date'),
    heroTemp: document.getElementById('hero-temp-val'),
    heroTempUnit: document.getElementById('hero-temp-unit'),
    heroStatus: document.getElementById('hero-weather-status'),
    heroDesc: document.getElementById('hero-weather-description'),
    feelsLike: document.getElementById('feels-like-val'),
    precipitationChance: document.getElementById('precipitation-chance-val'),
    cloudCover: document.getElementById('cloud-cover-val'),
    weatherAnimIcon: document.getElementById('weather-anim-icon'),

    // Highlights Elements
    aqiVal: document.getElementById('aqi-val'),
    aqiBadge: document.getElementById('aqi-badge'),
    aqiIndicator: document.getElementById('aqi-indicator'),
    aqiSummaryDesc: document.getElementById('aqi-summary-desc'),
    pm25Val: document.getElementById('pm25-val'),
    pm10Val: document.getElementById('pm10-val'),
    no2Val: document.getElementById('no2-val'),
    o3Val: document.getElementById('o3-val'),
    sunriseTime: document.getElementById('sunrise-time'),
    sunsetTime: document.getElementById('sunset-time'),
    daylightDuration: document.getElementById('daylight-duration-label'),
    sunArcProgress: document.getElementById('sun-arc-progress'),
    sunNodeCircle: document.getElementById('sun-node-circle'),
    windSpeed: document.getElementById('wind-speed-val'),
    windDirectionDeg: document.getElementById('wind-direction-degrees'),
    windCompassNeedle: document.getElementById('wind-compass-needle'),
    humidityPct: document.getElementById('humidity-pct-val'),
    humidityProgressCircle: document.getElementById('humidity-progress-circle'),
    dewPoint: document.getElementById('dew-point-val'),
    humidityComfort: document.getElementById('humidity-comfort-status'),
    pressureVal: document.getElementById('pressure-val'),
    pressureNeedle: document.getElementById('pressure-needle'),
    pressureTrend: document.getElementById('pressure-trend-label'),
    uvIndex: document.getElementById('uv-index-val'),
    visibility: document.getElementById('visibility-val'),
    uvSafety: document.getElementById('uv-safety-label'),
    mapCoords: document.getElementById('map-coordinates-label'),
    
    // Forecast Containers
    dailyForecastList: document.getElementById('daily-forecast-list'),
    hourlyForecastList: document.getElementById('hourly-forecast-list')
};

/* -------------------------------------------------------------
 * 1. INITIALIZATION & EVENTS SETUP
 * ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Theme Initialisation
    initTheme();
    
    // LocalStorage Search History Initialisation
    initSearchHistory();
    
    // Background Weather Canvas Initialisation
    state.weatherEffects = new WeatherEffectsEngine('weather-effects-canvas');
    state.weatherEffects.start();

    // Event Bindings
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.unitToggleBtn.addEventListener('click', toggleUnits);
    elements.geolocationBtn.addEventListener('click', requestUserLocation);
    elements.voiceSearchBtn.addEventListener('click', startVoiceRecognition);
    elements.closeVoiceBtn.addEventListener('click', stopVoiceRecognition);
    elements.closeToastBtn.addEventListener('click', hideError);
    
    // Search Autocomplete Events
    elements.citySearchInput.addEventListener('input', debounce(handleSearchInput, 400));
    elements.citySearchInput.addEventListener('focus', () => {
        if (elements.searchSuggestions.children.length > 0) {
            elements.searchSuggestions.classList.remove('hidden');
        }
    });

    // Close Suggestion box on clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.citySearchInput.contains(e.target) && !elements.searchSuggestions.contains(e.target)) {
            elements.searchSuggestions.classList.add('hidden');
        }
    });

    // Default Load: Attempt Geolocation, Fallback to London if fails
    requestUserLocation();
});

// Theme Setup
function initTheme() {
    const savedTheme = localStorage.getItem('aetherweather_theme') || 'dark';
    state.theme = savedTheme;
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    if (state.theme === 'dark') {
        state.theme = 'light';
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        state.theme = 'dark';
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    localStorage.setItem('aetherweather_theme', state.theme);
    
    // Update Map Styling
    if (state.leafletMap && state.tileLayer) {
        state.leafletMap.removeLayer(state.tileLayer);
        state.tileLayer = L.tileLayer(MAP_TILES[state.theme], {
            attribution: MAP_TILES.attribution
        }).addTo(state.leafletMap);
    }
}

// Unit Setup
function toggleUnits() {
    if (state.units === 'celsius') {
        state.units = 'fahrenheit';
        elements.unitToggleBtn.querySelector('.unit-label:first-child').classList.remove('text-active');
        elements.unitToggleBtn.querySelector('.unit-label:last-child').classList.add('text-active');
    } else {
        state.units = 'celsius';
        elements.unitToggleBtn.querySelector('.unit-label:last-child').classList.remove('text-active');
        elements.unitToggleBtn.querySelector('.unit-label:first-child').classList.add('text-active');
    }
    // Re-render display metrics with new unit state
    fetchWeatherData(state.currentCoords.lat, state.currentCoords.lon, state.currentCityName, state.currentCountryCode);
}

/* -------------------------------------------------------------
 * 2. GEOLOCATION MANAGEMENT
 * ------------------------------------------------------------- */

function requestUserLocation() {
    showLoader("Awaiting GPS alignment...");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                state.currentCoords = { lat, lon };
                
                // Attempt Reverse Geocoding via open-source OpenStreetMap Nominatim API
                let cityName = "Current Location";
                let countryCode = "GPS";
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`);
                    const data = await response.json();
                    if (data && data.address) {
                        cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || "Your Coordinates";
                        countryCode = (data.address.country_code || "GPS").toUpperCase();
                    }
                } catch (e) {
                    console.warn("Nominatim Reverse geocoding failed, falling back to default labels", e);
                }
                
                state.currentCityName = cityName;
                state.currentCountryCode = countryCode;
                
                fetchWeatherData(lat, lon, cityName, countryCode);
            },
            (error) => {
                console.warn("Geolocation access denied or failed", error);
                // Fallback to default coordinates (London)
                showError("Location Permission Denied", "Defaulting to London weather coordinates. You can search for your city above.");
                fetchWeatherData(51.5085, -0.1257, "London", "GB");
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    } else {
        showError("Geolocation Unsupported", "Your browser does not support automatic location detection.");
        fetchWeatherData(51.5085, -0.1257, "London", "GB");
    }
}

/* -------------------------------------------------------------
 * 3. WEATHER DATA RETRIEVAL (OPEN-METEO API MESH)
 * ------------------------------------------------------------- */

async function fetchWeatherData(lat, lon, cityName, countryCode) {
    showLoader(`Syncing atmosphere parameters for ${cityName}...`);
    
    // Set active coords in state
    state.currentCoords = { lat, lon };
    state.currentCityName = cityName;
    state.currentCountryCode = countryCode;

    // Open-Meteo URL Construction
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,wind_speed_10m_max&timezone=auto`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide`;

    try {
        // Run concurrent fetches for performance
        const [weatherRes, aqiRes] = await Promise.all([
            fetch(forecastUrl),
            fetch(aqiUrl)
        ]);

        if (!weatherRes.ok || !aqiRes.ok) {
            throw new Error("Integrated weather data mesh response failure.");
        }

        const weatherData = await weatherRes.json();
        const aqiData = await aqiRes.json();

        // 1. Update Core timezone parameters for Timezone-Aware Clock
        state.utcOffsetSeconds = weatherData.utc_offset_seconds || 0;
        initTimezoneClock();

        // 2. Render all dashboard elements
        renderCurrentWeather(weatherData, cityName, countryCode);
        renderAQI(aqiData);
        renderWindAndCompass(weatherData.current);
        renderHumidity(weatherData.current, weatherData.hourly);
        renderPressure(weatherData.current);
        renderSunProgressArc(weatherData);
        renderOtherDetails(weatherData);
        renderHourlyForecast(weatherData.hourly);
        renderDailyForecast(weatherData.daily);
        
        // 3. Render Leaflet Map Integration
        updateLeafletMap(lat, lon, cityName, weatherData.current.temperature_2m);
        
        // 4. Save to Recent History
        addToSearchHistory(cityName, countryCode, lat, lon);

        hideLoader();
    } catch (error) {
        console.error("Atmosphere fetch exception", error);
        showError("Database Error", "Failed to retrieve local atmospheric parameters. Please try again later.");
        hideLoader();
    }
}

/* -------------------------------------------------------------
 * 4. UI METRICS RENDERING
 * ------------------------------------------------------------- */

// Helper to convert units dynamically
function tempFormat(celsius) {
    if (state.units === 'fahrenheit') {
        return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
}

// Helper to format values with decimals
function formatDec(val, precision = 1) {
    return Number(val).toFixed(precision);
}

// 4.1 HERO CARD RENDERING
function renderCurrentWeather(data, cityName, countryCode) {
    const cur = data.current;
    
    elements.heroCityName.textContent = cityName;
    elements.heroCountryCode.textContent = countryCode;
    
    // Values
    const formattedTemp = tempFormat(cur.temperature_2m);
    elements.heroTemp.textContent = formattedTemp;
    elements.heroTempUnit.textContent = state.units === 'celsius' ? '°C' : '°F';
    
    elements.feelsLike.textContent = `${tempFormat(cur.apparent_temperature)}°${state.units === 'celsius' ? 'C' : 'F'}`;
    elements.precipitationChance.textContent = `${Math.round(cur.precipitation)}mm`;
    elements.cloudCover.textContent = `${Math.round(cur.cloud_cover)}%`;

    // Map weather code details
    const wmo = WMO_CODES[cur.weather_code] || { label: "Variable Atmospheric Index", icon: "fa-cloud", effect: "clouds" };
    elements.heroStatus.textContent = wmo.label;
    
    // Dynamic detailed description based on variables
    const isDay = cur.is_day === 1;
    let timeOfDayDesc = isDay ? "Daylight conditions prevailing." : "Nighttime cycle active.";
    let windDescription = cur.wind_speed_10m > 25 ? "High kinetic wind activity detected." : "Stable low wind currents.";
    elements.heroDesc.textContent = `${wmo.label}. ${timeOfDayDesc} ${windDescription} Atmospheric humidity sitting at ${cur.relative_humidity_2m}%.`;

    // Set Premium Custom Icon representation in HTML
    renderPremiumWeatherIcon(cur.weather_code, isDay);
    
    // Set background animated canvas effect
    if (state.weatherEffects) {
        state.weatherEffects.setEffect(wmo.effect);
    }
}

// Renders an animated HTML/CSS icon structure inside the card header
function renderPremiumWeatherIcon(code, isDay) {
    let iconHtml = '';
    
    if (code === 0 || code === 1) {
        // Sunny/Clear
        if (isDay) {
            iconHtml = `
                <div class="premium-weather-icon shiny-sun">
                    <div class="sun-core"></div>
                    <div class="sun-ray"></div>
                </div>`;
        } else {
            iconHtml = `<div class="premium-weather-icon" style="font-size: 4rem; color: #fef08a;"><i class="fa-solid fa-moon float-anim"></i></div>`;
        }
    } else if ([2, 3].includes(code)) {
        // Cloudy
        iconHtml = `
            <div class="cloudy-icon-block">
                <i class="fa-solid fa-cloud-sun" style="font-size: 2.2rem; color: #f59e0b; position: absolute; top: 12px; left: 10px;"></i>
                <div class="premium-cloud" style="position: absolute; bottom: 12px; right: 8px;"></div>
            </div>`;
    } else if ([45, 48].includes(code)) {
        // Fog
        iconHtml = `<div class="premium-weather-icon" style="font-size: 3.8rem; color: #94a3b8; animation: float 6s infinite;"><i class="fa-solid fa-smog"></i></div>`;
    } else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        // Rain
        iconHtml = `<div class="premium-weather-icon" style="font-size: 4rem; color: #3b82f6; animation: float 4s infinite;"><i class="fa-solid fa-cloud-showers-heavy"></i></div>`;
    } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
        // Snow
        iconHtml = `<div class="premium-weather-icon" style="font-size: 3.8rem; color: #93c5fd; animation: rotate 20s linear infinite;"><i class="fa-solid fa-snowflake"></i></div>`;
    } else if ([95, 96, 99].includes(code)) {
        // Thunderstorm
        iconHtml = `<div class="premium-weather-icon" style="font-size: 4rem; color: #a855f7; animation: float 3s infinite;"><i class="fa-solid fa-cloud-bolt"></i></div>`;
    } else {
        iconHtml = `<div class="premium-weather-icon" style="font-size: 4rem; color: #3b82f6;"><i class="fa-solid fa-cloud-sun-rain"></i></div>`;
    }
    
    elements.weatherAnimIcon.innerHTML = iconHtml;
}

// 4.2 AIR QUALITY INDEX CARD
function renderAQI(aqiData) {
    const aq = aqiData.current;
    const val = Math.round(aq.us_aqi);
    elements.aqiVal.textContent = val;
    
    // Align details based on US-AQI thresholds
    let statusClass = "good";
    let text = "Good";
    let desc = "Clean atmospheric structure. Perfect for outdoor activities.";
    let pct = Math.min((val / 300) * 100, 100); // Caps indicator left % at 100%

    if (val > 50 && val <= 100) {
        statusClass = "moderate";
        text = "Moderate";
        desc = "Acceptable air quality. Extremely sensitive individuals should consider limiting heavy outdoor exertion.";
    } else if (val > 100 && val <= 150) {
        statusClass = "sensitive";
        text = "Unhealthy for Sensitive Groups";
        desc = "Members of sensitive groups may experience health effects. General public is less likely to be affected.";
    } else if (val > 150 && val <= 200) {
        statusClass = "unhealthy";
        text = "Unhealthy";
        desc = "Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects.";
    } else if (val > 200 && val <= 300) {
        statusClass = "very-unhealthy";
        text = "Very Unhealthy";
        desc = "Health alert: everyone may experience more serious health effects. Active children and adults should avoid outdoor exertion.";
    } else if (val > 300) {
        statusClass = "hazardous";
        text = "Hazardous";
        desc = "Health warning of emergency conditions. The entire population is more likely to be severely affected.";
    }

    elements.aqiBadge.className = `aqi-status-badge ${statusClass}`;
    elements.aqiBadge.textContent = text;
    elements.aqiSummaryDesc.textContent = desc;
    elements.aqiIndicator.style.left = `${pct}%`;

    // Breakdown metrics
    elements.pm25Val.textContent = `${formatDec(aq.pm2_5)} µg/m³`;
    elements.pm10Val.textContent = `${formatDec(aq.pm10)} µg/m³`;
    elements.no2Val.textContent = `${formatDec(aq.nitrogen_dioxide)} µg/m³`;
    elements.o3Val.textContent = `${formatDec(aq.ozone)} µg/m³`;
}

// 4.3 WIND COMPASS RENDERING
function renderWindAndCompass(current) {
    const speed = Math.round(current.wind_speed_10m);
    const direction = current.wind_direction_10m;
    
    elements.windSpeed.textContent = `${speed} km/h`;
    
    // Wind Direction Mapping
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round((direction % 360) / 22.5) % 16;
    const directionStr = directions[idx];
    
    elements.windDirectionDeg.textContent = `${direction}° ${directionStr}`;
    
    // Rotate Compass Needle dynamically
    elements.windCompassNeedle.style.transform = `rotate(${direction}deg)`;
}

// 4.4 HUMIDITY & DEW POINT RENDERING
function renderHumidity(current, hourly) {
    const pct = Math.round(current.relative_humidity_2m);
    elements.humidityPct.textContent = `${pct}%`;
    
    // Animate SVG circular progress gauge
    // Circumference = 2 * PI * R = 2 * 3.14159 * 40 = 251.2
    const circumference = 251.2;
    const offset = circumference - (pct / 100) * circumference;
    elements.humidityProgressCircle.style.strokeDasharray = circumference;
    elements.humidityProgressCircle.style.strokeDashoffset = offset;

    // Dew point from current metrics or default
    const dew = hourly.dew_point_2m ? Math.round(hourly.dew_point_2m[0]) : 12;
    elements.dewPoint.textContent = `${tempFormat(dew)}°${state.units === 'celsius' ? 'C' : 'F'}`;

    // Comfort assessment
    let comfort = "Comfortable";
    if (pct < 30) comfort = "Dry atmosphere";
    else if (pct > 70) comfort = "Sticky / Humid";
    elements.humidityComfort.textContent = comfort;
}

// 4.5 BAROMETRIC PRESSURE GAUGE RENDERING
function renderPressure(current) {
    const pressure = Math.round(current.pressure_msl);
    elements.pressureVal.textContent = `${pressure} hPa`;

    // Map gauge needle angle: 960 hPa = -90deg, 1060 hPa = 90deg
    // Interpolation: angle = -90 + (pressure - 960) / (1060 - 960) * 180
    const clampedPressure = Math.max(960, Math.min(1060, pressure));
    const angle = -90 + ((clampedPressure - 960) / 100) * 180;
    
    elements.pressureNeedle.style.transform = `rotate(${angle}deg)`;

    // Trend assessment
    let trend = "Standard Barometric Index";
    if (pressure < 1009) trend = "Low Pressure (Storm Risk)";
    else if (pressure > 1022) trend = "High Barometric Pressure (Dry/Stable)";
    elements.pressureTrend.textContent = trend;
}

// 4.6 SUN PROGRESSION ARC RENDERING
function renderSunProgressArc(data) {
    const daily = data.daily;
    const curTimeStr = data.current.time; // Format: "2026-05-27T12:00"
    
    // Parse times
    const sunriseStr = daily.sunrise[0];
    const sunsetStr = daily.sunset[0];

    const parseISO = (str) => new Date(str).getTime();
    
    const currentMs = parseISO(curTimeStr);
    const sunriseMs = parseISO(sunriseStr);
    const sunsetMs = parseISO(sunsetStr);
    
    // Format Display times cleanly
    const formatTime = (isoStr) => {
        const d = new Date(isoStr);
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; // 0 hour is 12
        return `${h}:${m} ${ampm}`;
    };

    elements.sunriseTime.textContent = formatTime(sunriseStr);
    elements.sunsetTime.textContent = formatTime(sunsetStr);

    const totalDaylightMs = sunsetMs - sunriseMs;
    const daylightHours = Math.floor(totalDaylightMs / (1000 * 60 * 60));
    const daylightMins = Math.floor((totalDaylightMs % (1000 * 60 * 60)) / (1000 * 60));
    elements.daylightDuration.textContent = `Daylight Duration: ${daylightHours}h ${daylightMins}m`;

    // Calculate progression percentage
    let progressPct = 0;
    if (currentMs > sunriseMs && currentMs < sunsetMs) {
        progressPct = (currentMs - sunriseMs) / totalDaylightMs;
    } else if (currentMs >= sunsetMs) {
        progressPct = 1; // Sun has set
    } else {
        progressPct = 0; // Sun has not risen yet
    }

    // Animate SVG path progress stroke
    // Circumference of half circle path = PI * R = 3.14159 * 40 = 125.6
    const pathLength = 142; // Predefined approximate SVG path dasharray length
    const offset = pathLength - (progressPct * pathLength);
    elements.sunArcProgress.style.strokeDashoffset = offset;

    // Calculate coordinates on semi-circle for sun node placement
    // SVGArc bounds: x goes from 5 to 95, y curves up to 5 at zenith and 45 at horizon
    // Angle goes from PI (180deg - sunrise) to 0 (sunset)
    const angleRad = Math.PI - (progressPct * Math.PI);
    const cx = 50 + 40 * Math.cos(angleRad);
    const cy = 45 - 40 * Math.sin(angleRad);
    
    elements.sunNodeCircle.setAttribute('cx', cx);
    elements.sunNodeCircle.setAttribute('cy', cy);
}

// 4.7 ENVIRONMENTAL DETAILS
function renderOtherDetails(data) {
    const daily = data.daily;
    const hourly = data.hourly;
    
    const uvMax = daily.uv_index_max ? daily.uv_index_max[0] : 0;
    const rawVis = hourly.visibility ? hourly.visibility[0] : 10000;
    const visKm = Math.round(rawVis / 1000);

    elements.uvIndex.textContent = formatDec(uvMax, 1);
    elements.visibility.textContent = `${visKm} km`;

    // UV Safety text
    let safety = "Low UV Risk";
    if (uvMax >= 3 && uvMax < 6) safety = "Moderate Risk (Wear Sunscreen)";
    else if (uvMax >= 6 && uvMax < 8) safety = "High Risk (Protection Essential)";
    else if (uvMax >= 8) safety = "Extreme UV Risk (Stay Indoors)";
    
    elements.uvSafety.textContent = safety;
}

// 4.8 HOURLY SLIDER FORECAST
function renderHourlyForecast(hourly) {
    elements.hourlyForecastList.innerHTML = '';
    
    // Capture next 24 data points
    const limit = 24;
    for (let i = 0; i < limit; i++) {
        const timeStr = hourly.time[i];
        const dateObj = new Date(timeStr);
        let hour = dateObj.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        const formattedHour = `${hour} ${ampm}`;

        const temp = tempFormat(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];
        const rainChance = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
        const wmo = WMO_CODES[code] || { label: "Cloudy", icon: "fa-cloud" };
        const windDirection = hourly.wind_direction_10m[i];

        const item = document.createElement('div');
        item.className = 'hourly-item';
        item.innerHTML = `
            <span class="hourly-time">${formattedHour}</span>
            <div class="hourly-icon" title="${wmo.label}">
                <i class="fa-solid ${wmo.icon}"></i>
            </div>
            <span class="hourly-temp">${temp}°</span>
            <span class="hourly-wind" title="Wind direction">
                <i class="fa-solid fa-arrow-up" style="transform: rotate(${windDirection}deg)"></i>
                <span>${rainChance}% Rain</span>
            </span>
        `;
        elements.hourlyForecastList.appendChild(item);
    }
}

// 4.9 5-DAY FORECAST SECTION
function renderDailyForecast(daily) {
    elements.dailyForecastList.innerHTML = '';
    
    // Fetch next 5 days
    for (let i = 0; i < 5; i++) {
        const timeStr = daily.time[i];
        const dateObj = new Date(timeStr);
        
        // Days of week format
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = i === 0 ? 'Today' : days[dateObj.getDay()];
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const maxTemp = tempFormat(daily.temperature_2m_max[i]);
        const minTemp = tempFormat(daily.temperature_2m_min[i]);
        const code = daily.weather_code[i];
        
        // Gather rain details
        const rainSum = daily.precipitation_sum ? Math.round(daily.precipitation_sum[i]) : 0;
        
        const wmo = WMO_CODES[code] || { label: "Variable Condition", icon: "fa-cloud" };

        const item = document.createElement('div');
        item.className = 'daily-forecast-item';
        item.innerHTML = `
            <div class="daily-date-block">
                <span class="daily-day">${dayName}</span>
                <span class="daily-date">${dateStr}</span>
            </div>
            <div class="daily-icon-block">
                <div class="daily-mini-icon" title="${wmo.label}">
                    <i class="fa-solid ${wmo.icon}"></i>
                </div>
                ${rainSum > 0 ? `
                    <span class="daily-precip" title="Expected precipitation">
                        <i class="fa-solid fa-droplet"></i>
                        <span>${rainSum}mm</span>
                    </span>` : ''
                }
            </div>
            <span class="daily-desc-text">${wmo.label}</span>
            <div class="daily-temp-block">
                <span class="temp-max">${maxTemp}°</span>
                <span class="temp-min">${minTemp}°</span>
            </div>
        `;
        elements.dailyForecastList.appendChild(item);
    }
}

/* -------------------------------------------------------------
 * 5. TIMEZONE-AWARE DYNAMIC CLOCK
 * ------------------------------------------------------------- */

function initTimezoneClock() {
    if (state.clockInterval) {
        clearInterval(state.clockInterval);
    }

    const updateClock = () => {
        // Calculate the target timezone exact local milliseconds
        // Date.getTime() is absolute UTC timestamp. Use getTimezoneOffset() to obtain browser delta,
        // then add our state.utcOffsetSeconds to get target location local time.
        const utcMs = Date.now() + (new Date().getTimezoneOffset() * 60 * 1000);
        const localDate = new Date(utcMs + (state.utcOffsetSeconds * 1000));

        // Format Date
        const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
        elements.liveDate.textContent = localDate.toLocaleDateString('en-US', dateOptions);

        // Format Clock Time
        let h = localDate.getHours();
        const m = localDate.getMinutes().toString().padStart(2, '0');
        const s = localDate.getSeconds().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        
        elements.liveTime.textContent = `${h}:${m}:${s} ${ampm}`;
    };

    updateClock(); // Initial run
    state.clockInterval = setInterval(updateClock, 1000);
}

/* -------------------------------------------------------------
 * 6. LEAFLET INTERACTIVE MAP SYSTEM
 * ------------------------------------------------------------- */

function updateLeafletMap(lat, lon, cityName, temp) {
    elements.mapCoords.textContent = `Lat: ${formatDec(lat, 4)} | Lon: ${formatDec(lon, 4)}`;

    if (!state.leafletMap) {
        // Build Leaflet map instance
        state.leafletMap = L.map('map-container').setView([lat, lon], 11);
        
        // Choose Tile providers matching light/dark states
        state.tileLayer = L.tileLayer(MAP_TILES[state.theme], {
            attribution: MAP_TILES.attribution
        }).addTo(state.leafletMap);

        // Build Custom visual label marker
        const markerIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<strong>${cityName}</strong> &bull; ${tempFormat(temp)}°`
        });
        
        state.mapMarker = L.marker([lat, lon], { icon: markerIcon }).addTo(state.leafletMap);
    } else {
        // Instantly fly to new search coordinates
        state.leafletMap.setView([lat, lon], 11);
        state.mapMarker.setLatLng([lat, lon]);
        
        const markerIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<strong>${cityName}</strong> &bull; ${tempFormat(temp)}°`
        });
        state.mapMarker.setIcon(markerIcon);
    }
}

/* -------------------------------------------------------------
 * 7. RECENT SEARCH HISTORY STORAGE & PILLES
 * ------------------------------------------------------------- */

function initSearchHistory() {
    const stored = localStorage.getItem('aetherweather_history');
    if (stored) {
        state.recentSearches = JSON.parse(stored);
        renderHistoryPills();
    }
}

function addToSearchHistory(cityName, countryCode, lat, lon) {
    // Avoid double entries
    state.recentSearches = state.recentSearches.filter(
        item => item.name.toLowerCase() !== cityName.toLowerCase()
    );

    // Prepend new search pill
    state.recentSearches.unshift({ name: cityName, country: countryCode, lat, lon });

    // Keep max 5 items
    if (state.recentSearches.length > 5) {
        state.recentSearches.pop();
    }

    localStorage.setItem('aetherweather_history', JSON.stringify(state.recentSearches));
    renderHistoryPills();
}

function deleteHistoryItem(index, event) {
    event.stopPropagation(); // Avoid triggering pill click handler
    state.recentSearches.splice(index, 1);
    localStorage.setItem('aetherweather_history', JSON.stringify(state.recentSearches));
    renderHistoryPills();
}

function renderHistoryPills() {
    elements.historyPills.innerHTML = '';
    
    if (state.recentSearches.length === 0) {
        elements.historyPills.innerHTML = '<span class="no-history-msg">No recent searches yet</span>';
        return;
    }

    state.recentSearches.forEach((item, idx) => {
        const pill = document.createElement('span');
        pill.className = 'history-pill';
        pill.innerHTML = `
            <i class="fa-solid fa-location-dot"></i>
            <span>${item.name}, ${item.country}</span>
            <span class="delete-pill" title="Delete record"><i class="fa-solid fa-xmark"></i></span>
        `;
        
        pill.addEventListener('click', () => {
            fetchWeatherData(item.lat, item.lon, item.name, item.country);
        });

        pill.querySelector('.delete-pill').addEventListener('click', (e) => {
            deleteHistoryItem(idx, e);
        });

        elements.historyPills.appendChild(pill);
    });
}

/* -------------------------------------------------------------
 * 8. AUTOCOMPLETE SEARCH & SUGGESTIONS
 * ------------------------------------------------------------- */

async function handleSearchInput() {
    const val = elements.citySearchInput.value.trim();
    if (val.length < 2) {
        elements.searchSuggestions.innerHTML = '';
        elements.searchSuggestions.classList.add('hidden');
        return;
    }

    // Geocoding API by Open-Meteo
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`;

    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data && data.results && data.results.length > 0) {
            elements.searchSuggestions.innerHTML = '';
            
            data.results.forEach((city) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                
                const adminName = city.admin1 ? `, ${city.admin1}` : '';
                const nameLabel = `${city.name}${adminName}`;
                
                item.innerHTML = `
                    <span class="suggestion-city">${nameLabel}</span>
                    <span class="suggestion-country">${city.country_code ? city.country_code.toUpperCase() : '--'}</span>
                `;

                item.addEventListener('click', () => {
                    elements.citySearchInput.value = '';
                    elements.searchSuggestions.classList.add('hidden');
                    elements.searchSuggestions.innerHTML = '';
                    fetchWeatherData(city.latitude, city.longitude, city.name, city.country_code ? city.country_code.toUpperCase() : '--');
                });

                elements.searchSuggestions.appendChild(item);
            });
            elements.searchSuggestions.classList.remove('hidden');
        } else {
            elements.searchSuggestions.innerHTML = '<div style="padding: 12px; font-size: 0.82rem; color: var(--text-muted); text-align: center;">No matches found</div>';
            elements.searchSuggestions.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Geocoding lookup failed", e);
    }
}

/* -------------------------------------------------------------
 * 9. VOICE SEARCH ENGINE (SPEECH RECOGNITION)
 * ------------------------------------------------------------- */

let speechEngine = null;

function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showError("Unsupported Browser", "Your browser does not support Speech Recognition. Try using Google Chrome or Microsoft Edge.");
        return;
    }

    elements.voiceOverlay.classList.add('active');
    elements.voiceTranscript.textContent = '"Try saying a city name, like \'Paris\' or \'Tokyo\'..."';

    speechEngine = new SpeechRecognition();
    speechEngine.continuous = false;
    speechEngine.interimResults = false;
    speechEngine.lang = 'en-US';

    speechEngine.onresult = async (event) => {
        const transcript = event.results[0][0].transcript.trim().replace(/[.,]/g, '');
        elements.voiceTranscript.textContent = `"${transcript}"`;
        
        setTimeout(async () => {
            elements.voiceOverlay.classList.remove('active');
            
            // Execute automated geocoding search for captured vocal input
            showLoader(`Vocal input captured: ${transcript}. Resolving coords...`);
            const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(transcript)}&count=1&language=en&format=json`;
            try {
                const response = await fetch(geocodeUrl);
                const data = await response.json();
                if (data && data.results && data.results.length > 0) {
                    const result = data.results[0];
                    fetchWeatherData(result.latitude, result.longitude, result.name, result.country_code ? result.country_code.toUpperCase() : '--');
                } else {
                    showError("Vocal Resolution Failed", `Could not resolve a coordinate mesh matching "${transcript}". Please speak clearly.`);
                }
            } catch (err) {
                showError("Database Error", "Voice search routing geocoding failure.");
            } finally {
                hideLoader();
            }
        }, 1200);
    };

    speechEngine.onerror = (event) => {
        console.error("Speech Recognition Error", event.error);
        if (event.error === 'not-allowed') {
            showError("Microphone Access Blocked", "Microphone permissions blocked. Please check your browser privacy preferences.");
        } else {
            showError("Acoustic Speech Error", "Failed to decode voice parameters. Please speak clearly.");
        }
        stopVoiceRecognition();
    };

    speechEngine.start();
}

function stopVoiceRecognition() {
    if (speechEngine) {
        speechEngine.abort();
        speechEngine = null;
    }
    elements.voiceOverlay.classList.remove('active');
}

/* -------------------------------------------------------------
 * 10. BACKGROUND CANVAS WEATHER PARTICLE SIMULATOR
 * ------------------------------------------------------------- */

class WeatherEffectsEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mode = 'clouds'; // 'clear', 'clouds', 'rain', 'snow', 'thunderstorm', 'fog'
        this.animationFrameId = null;

        // Manage Resize
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setEffect(effectMode) {
        if (this.mode === effectMode) return;
        this.mode = effectMode;
        this.particles = []; // Flush old frames
        this.initParticles();
    }

    initParticles() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.mode === 'clear') {
            // Sunny sparklers
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.5,
                    pulseSpeed: Math.random() * 0.02 + 0.01
                });
            }
        } else if (this.mode === 'clouds') {
            // Semi-opaque mist clouds drifting
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h * 0.7, // top area
                    r: Math.random() * 120 + 80,
                    dx: Math.random() * 0.2 + 0.1, // slow drift
                    alpha: Math.random() * 0.06 + 0.02
                });
            }
        } else if (this.mode === 'rain' || this.mode === 'thunderstorm') {
            // Speeding rain streaks falling downward
            const particleCount = this.mode === 'thunderstorm' ? 120 : 70;
            for (let i = 0; i < particleCount; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    length: Math.random() * 16 + 10,
                    dy: Math.random() * 8 + 6,
                    dx: -1.5,
                    alpha: Math.random() * 0.3 + 0.1
                });
            }
        } else if (this.mode === 'snow') {
            // Soft floating flakes
            for (let i = 0; i < 40; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 3 + 1,
                    dy: Math.random() * 1 + 0.5,
                    dx: Math.random() * 0.5 - 0.25,
                    alpha: Math.random() * 0.5 + 0.2
                });
            }
        } else if (this.mode === 'fog') {
            // Opaque mist blocks layering the screen bottom
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: h - Math.random() * 200,
                    r: Math.random() * 150 + 100,
                    dx: Math.random() * 0.1 - 0.05,
                    dy: Math.random() * 0.1 - 0.05,
                    alpha: Math.random() * 0.05 + 0.02
                });
            }
        }
    }

    start() {
        this.initParticles();
        const render = () => {
            this.update();
            this.draw();
            this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    }

    update() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.particles.forEach((p) => {
            if (this.mode === 'clear') {
                p.alpha += p.pulseSpeed;
                if (p.alpha > 0.6 || p.alpha < 0) {
                    p.pulseSpeed = -p.pulseSpeed;
                }
            } else if (this.mode === 'clouds' || this.mode === 'fog') {
                p.x += p.dx;
                if (p.dx > 0 && p.x - p.r > w) p.x = -p.r;
                if (p.dx < 0 && p.x + p.r < 0) p.x = w + p.r;
            } else if (this.mode === 'rain' || this.mode === 'thunderstorm') {
                p.y += p.dy;
                p.x += p.dx;
                if (p.y > h) {
                    p.y = -p.length;
                    p.x = Math.random() * w;
                }
            } else if (this.mode === 'snow') {
                p.y += p.dy;
                p.x += p.dx;
                if (p.y > h) {
                    p.y = -5;
                    p.x = Math.random() * w;
                }
            }
        });

        // Thunderstorm lightning flashes
        if (this.mode === 'thunderstorm' && Math.random() < 0.003) {
            this.lightningFlash();
        }
    }

    lightningFlash() {
        const prevBg = this.canvas.style.backgroundColor;
        this.canvas.style.backgroundColor = 'rgba(255,255,255,0.45)';
        setTimeout(() => {
            this.canvas.style.backgroundColor = prevBg;
        }, 80);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((p) => {
            ctx.beginPath();
            if (this.mode === 'clear') {
                // Gold particles
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
                grad.addColorStop(0, `rgba(251, 191, 36, ${p.alpha})`);
                grad.addColorStop(1, `rgba(251, 191, 36, 0)`);
                ctx.fillStyle = grad;
                ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.mode === 'clouds' || this.mode === 'fog') {
                // Mist spheres
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                const color = document.body.classList.contains('light-theme') ? '255,255,255' : '148,163,184';
                grad.addColorStop(0, `rgba(${color}, ${p.alpha})`);
                grad.addColorStop(1, `rgba(${color}, 0)`);
                ctx.fillStyle = grad;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.mode === 'rain' || this.mode === 'thunderstorm') {
                // Rain streaks
                ctx.strokeStyle = `rgba(59, 130, 246, ${p.alpha})`;
                ctx.lineWidth = 1.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.dx, p.y + p.length);
                ctx.stroke();
            } else if (this.mode === 'snow') {
                // Snowflake crystals
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}

/* -------------------------------------------------------------
 * 11. DEBOUNCE & ERROR UTILITIES
 * ------------------------------------------------------------- */

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

function showLoader(statusText) {
    elements.loaderOverlay.querySelector('.loader-status').textContent = statusText;
    elements.loaderOverlay.classList.add('active');
}

function hideLoader() {
    elements.loaderOverlay.classList.remove('active');
}

function showError(title, message) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    elements.errorToast.classList.add('active');

    // Auto dismiss after 6 seconds
    setTimeout(() => {
        hideError();
    }, 6000);
}

function hideError() {
    elements.errorToast.classList.remove('active');
}
