const axios = require('axios');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const WeatherHistory = require('../models/WeatherHistory');

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const DISTRICT_COORDS = {
  'Northern': { lat: 9.4084, lon: -0.8527 },
  'Tamale Metro': { lat: 9.4008, lon: -0.8393 },
  'Sagnarigu': { lat: 9.4505, lon: -0.8379 },
  'Tolon': { lat: 9.4569, lon: -1.0789 },
  'Kumbungu': { lat: 9.5457, lon: -0.9779 },
  'Nanton': { lat: 9.8012, lon: -0.6948 },
  'Savelugu': { lat: 9.6244, lon: -0.8241 },
  'Karaga': { lat: 10.0113, lon: -0.4363 },
  'Gushegu': { lat: 10.1728, lon: -0.2191 },
  'Yendi': { lat: 9.4418, lon: -0.0105 },
  'default': { lat: 9.4084, lon: -0.8527 },
};

function getCurrentSeason(month = new Date().getMonth() + 1) {
  return month >= 4 && month <= 10 ? 'wet season (April–October)' : 'dry season (November–March)';
}

async function getWeatherForCoords(lat, lon, district) {
  // Check cache
  const cached = await query(
    `SELECT * FROM weather_cache WHERE district = $1 AND expires_at > NOW() ORDER BY fetched_at DESC LIMIT 1`,
    [district]
  );
  if (cached.rows.length) {
    const data = cached.rows[0].weather_data;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  const response = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,precipitation,windspeed_10m,relative_humidity_2m',
      hourly: 'precipitation,precipitation_probability,temperature_2m',
      forecast_days: 2,
      timezone: 'Africa/Accra',
    },
    timeout: 10000,
  });

  const data = response.data;
  const hourly = data.hourly;
  const next24hPrecip = (hourly.precipitation || []).slice(0, 24).reduce((a, b) => a + b, 0);
  const maxPrecipRate = Math.max(...(hourly.precipitation || [0]).slice(0, 24));
  const avgRainProb = (hourly.precipitation_probability || []).slice(0, 24).reduce((a, b) => a + b, 0) / 24;

  const weatherData = {
    current: {
      temperature: data.current?.temperature_2m,
      precipitation: data.current?.precipitation,
      windspeed: data.current?.windspeed_10m,
      humidity: data.current?.relative_humidity_2m,
    },
    forecast: {
      total_precipitation_24h: Math.round(next24hPrecip * 10) / 10,
      max_precipitation_rate: Math.round(maxPrecipRate * 10) / 10,
      avg_rain_probability_percent: Math.round(avgRainProb),
      hourly_precipitation: (hourly.precipitation || []).slice(0, 24),
    },
    season: getCurrentSeason(),
    district,
    fetched_at: new Date().toISOString(),
  };

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  await query(
    `INSERT INTO weather_cache (id, district, latitude, longitude, weather_data, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [uuidv4(), district, lat, lon, JSON.stringify(weatherData), expiresAt]
  );

  // Permanently archive every fresh fetch
  WeatherHistory.save({
    district, latitude: lat, longitude: lon,
    temperature_c: weatherData.current?.temperature || null,
    precipitation_mm: weatherData.current?.precipitation || 0,
    humidity_pct: weatherData.current?.humidity || null,
    windspeed_kmh: weatherData.current?.windspeed || null,
    max_precip_rate_mm: weatherData.forecast?.max_precipitation_rate || null,
    total_precip_24h: weatherData.forecast?.total_precipitation_24h || null,
    hourly_precip: weatherData.forecast?.hourly_precipitation || null,
    raw_api_data: data,
    season: weatherData.season,
    source: 'open_meteo',
    cron_run: false,
  }).catch(err => console.error('[WeatherHistory] Archive error:', err.message));

  return weatherData;
}

async function getWeatherForDistrict(district) {
  const coords = DISTRICT_COORDS[district] || DISTRICT_COORDS['default'];
  return getWeatherForCoords(coords.lat, coords.lon, district);
}

async function getWeatherForUnit(unit) {
  if (unit.latitude && unit.longitude) {
    return getWeatherForCoords(unit.latitude, unit.longitude, unit.district);
  }
  return getWeatherForDistrict(unit.district);
}

module.exports = { getWeatherForDistrict, getWeatherForUnit, getCurrentSeason };
