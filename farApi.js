// meteoblueClient.js (Open-Meteo API kullanıyor)
require("dotenv").config();
const axios = require("axios");

const OPEN_METEO_API_URL =
  process.env.OPEN_METEO_API_URL || "https://api.open-meteo.com/v1/forecast";
const DEFAULT_LAT = parseFloat(process.env.DEFAULT_LAT) || 38.4127;
const DEFAULT_LON = parseFloat(process.env.DEFAULT_LON) || 27.1384;
const REST_TIMEOUT = parseInt(process.env.REST_TIMEOUT) || 30000;

async function fetchWeather(lat, lon) {
  try {
    const latitude = lat || DEFAULT_LAT;
    const longitude = lon || DEFAULT_LON;

    const { data } = await axios.get(OPEN_METEO_API_URL, {
      params: {
        latitude: latitude,
        longitude: longitude,
        hourly:
          "temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation,sunshine_duration,direct_radiation,pressure_msl",
        current:
          "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,cloud_cover,pressure_msl",
        timezone: "auto",
        past_days: 3,
        forecast_days: 0,
      },
      timeout: REST_TIMEOUT,
    });
    return data;
  } catch (error) {
    console.error("Weather fetch error:", error.message);
    if (error.response) {
      console.error(
        "API Response:",
        error.response.status,
        error.response.data
      );
    }
    throw error;
  }
}

module.exports = { fetchWeather };
