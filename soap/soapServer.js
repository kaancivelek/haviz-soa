const { fetchWeather } = require('../meteoblueClient');

/**
 * Open-Meteo API'den hava durumu verisini çeker
 * @param {number} lat Enlem
 * @param {number} lon Boylam
 * @param {string} startDate Başlangıç tarihi (YYYY-MM-DD) - Open-Meteo'da kullanılmıyor, past_days kullanılıyor
 * @param {number} numDays Kaç gün alınacak - Open-Meteo'da kullanılmıyor, forecast_days kullanılıyor
 */
async function fetchWeatherSOAP(lat, lon, startDate, numDays) {
  try {
    // Open-Meteo API'den JSON formatında veri al
    const weatherData = await fetchWeather(lat, lon);
    // JSON'u string olarak döndür (SOAP endpoint'i için)
    return JSON.stringify(weatherData);
  } catch (err) {
    console.error('SOAP Fetch Error:', err.message);
    throw new Error(`Open-Meteo API'ye ulaşılamadı: ${err.message}`);
  }
}

module.exports = { fetchWeatherSOAP };
