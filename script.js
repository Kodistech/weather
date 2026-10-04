// script.js - Phiên bản mới (OpenWeatherMap + Alternative API)

const API_KEY = 'ecbfdd2ba5c308f8ac6b5660419127a5';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const ICON_BASE = 'https://openweathermap.org/img/wn';

// ==================== NEW: Alternative Weather API ====================
const ALTERNATIVE_API = 'https://api.weatherapi.com/v1/forecast.json';
const ALTERNATIVE_KEY = 'c6e3a6e70ec9483ba29115945241710'; // API miễn phí, ổn định hơn

// ==================== HELPERS ====================
function updateTime() {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    document.getElementById('current-time').textContent = `${displayHour}:${m} ${ampm}`;
}

function updateDetail(labelId, valueId, label, value) {
    document.getElementById(labelId).textContent = label;
    document.getElementById(valueId).textContent = value;
}

function renderHourly(forecastList) {
    const container = document.getElementById('hourly-grid');
    container.innerHTML = '';
    const next8 = forecastList.slice(1, 9);
    
    next8.forEach(item => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours();
        const timeStr = `${hour}:00`;
        const iconCode = item.weather[0].icon;
        const iconUrl = `${ICON_BASE}/${iconCode}.png`;
        const temp = Math.round(item.main.temp - 273.15);
        
        const html = `
            <div class="hourly-item">
                <div class="hourly-time">${timeStr}</div>
                <img class="hourly-icon" src="${iconUrl}" alt="">
                <div class="hourly-temp">${temp}°</div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

// ==================== MAIN FETCH (ưu tiên OpenWeatherMap) ====================
async function fetchWeather(city = 'Biên Hòa, VN') {
    const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=vi`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod !== 200) throw new Error(data.message);
        return data;
    } catch (error) {
        console.log('OpenWeatherMap failed, trying Alternative API...');
        return await fetchAlternative(city);
    }
}

// ==================== ALTERNATIVE API (vì lỗi kết nối) ====================
async function fetchAlternative(city) {
    const url = `${ALTERNATIVE_API}?key=${ALTERNATIVE_KEY}&q=${encodeURIComponent(city)}&days=3&aqi=no&alerts=no`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        // Chuyển dữ liệu sang format giống OpenWeatherMap
        return {
            name: data.location.name,
            weather: [{ description: data.current.condition.text }],
            main: {
                temp: data.current.temp_c,
                feels_like: data.current.feelslike_c,
                humidity: data.current.humidity,
                pressure: data.current.pressure_mb,
                uvi: data.current.uv || 4
            },
            wind: { speed: data.current.wind_kph / 3.6, deg: data.current.wind_dir },
            visibility: data.current.vis_km * 1000,
            list: data.forecast.forecastday[0].hour.map(hour => ({
                dt: hour.time_epoch,
                weather: [{ icon: hour.condition.icon.split('/').pop().split('.').shift() }],
                main: { temp: hour.temp_c }
            }))
        };
    } catch (e) {
        console.error('Alternative API also failed:', e);
        throw new Error('Không kết nối mạng');
    }
}

// ==================== RENDER ====================
function renderWeather(data) {
    updateTime();
    const iconCode = data.weather[0].icon || data.weather[0].icon;
    document.getElementById('weather-icon').src = `${ICON_BASE}/${iconCode}@2x.png`;
    
    const temp = Math.round(data.main.temp);
    document.getElementById('temp-value').textContent = `${temp}°`;
    document.getElementById('weather-desc').textContent = data.weather[0].description || 'Overcast Clouds';
    document.getElementById('feels-like').textContent = `Feels like ${Math.round(data.main.feels_like)}°`;
    
    updateDetail('wind-label', 'wind-value', 'Wind', `${data.wind.speed.toFixed(1)} m/s ${data.wind.deg}`);
    updateDetail('humidity-label', 'humidity-value', 'Humidity', `${data.main.humidity}%`);
    updateDetail('visibility-label', 'visibility-value', 'Visibility', `${(data.visibility / 1000).toFixed(0)}km`);
    updateDetail('pressure-label', 'pressure-value', 'Pressure', `${data.main.pressure} hPa`);
    updateDetail('uv-label', 'uv-value', 'UV Index', `${data.main.uvi} UV`);
    updateDetail('dewpoint-label', 'dewpoint-value', 'Dew Point', `${Math.round(data.main.dew_point || 25)}°C`);
    
    renderHourly(data.list || []);
    
    // Background
    const bgContainer = document.querySelector('.weather-card');
    bgContainer.style.backgroundImage = `url('${ICON_BASE}/${data.weather[0].icon}.png')`;
    bgContainer.style.backgroundSize = 'cover';
    bgContainer.style.backgroundPosition = 'center';
}

// ==================== EVENT LISTENERS ====================
function attachEventListeners() {
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');
    
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) loadWeather(city);
    });
    
    cityInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) loadWeather(city);
        }
    });
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const city = cityInput.value.trim();
        loadWeather(city || 'Biên Hòa, VN');
    });
    
    document.getElementById('ai-button').addEventListener('click', () => {
        showToast("AI Weather giúp bạn dễ hiểu hơn về thời tiết hôm nay!");
    });
}

// ==================== MAIN ====================
async function loadWeather(city) {
    const card = document.querySelector('.weather-card');
    card.style.opacity = '0.6';
    card.style.pointerEvents = 'none';
    
    try {
        const data = await fetchWeather(city);
        renderWeather(data);
        showToast(`✅ Đã tải thời tiết cho ${data.name}`);
    } catch (error) {
        showToast('Không kết nối mạng');
        // Fallback default
        if (city !== 'Biên Hòa, VN') loadWeather('Biên Hòa, VN');
    } finally {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadWeather('Biên Hòa, VN');
    setInterval(updateTime, 60000);
    attachEventListeners();
});