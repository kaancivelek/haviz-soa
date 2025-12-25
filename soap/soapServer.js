const soap = require("soap");
const fs = require("fs");
const path = require("path");
const { fetchWeather } = require("../farApi");

const wsdl = fs.readFileSync(path.join(__dirname, "weather.wsdl"), "utf8");

function toIsoNoZone(t) {
  if (typeof t !== "string") return t;
  return t.length === 16 ? `${t}:00` : t;
}

function buildDtos(data) {
  const meta = {
    lat: data.latitude,
    lon: data.longitude,
    timezone: data.timezone,
    name: "Izmir",
    city: "Izmir",
    country_code: "TR",
  };

  const h = data.hourly || {};

  const times = h.time || [];
  const temp = h.temperature_2m || [];
  const hum = h.relative_humidity_2m || [];
  const wind = h.wind_speed_10m || [];
  const precip = h.precipitation || [];
  const cloud = h.cloud_cover || [];
  const sunSec = h.sunshine_duration || [];
  const rad = h.direct_radiation || [];

  return times.map((t, i) => ({
    lat: meta.lat,
    lon: meta.lon,
    name: meta.name,
    city: meta.city,
    country_code: meta.country_code,
    timezone: meta.timezone,
    observed_at: toIsoNoZone(t),
    temperature_c: temp[i] ?? null,
    sunshine_min: sunSec[i] != null ? Math.round(sunSec[i] / 60) : null,
    shortwave_w_m2: rad[i] ?? null,
    precip_mm: precip[i] ?? null,
    humidity_pct: hum[i] ?? null,
    cloud_cover_pct: cloud[i] ?? null,
    wind_speed_kmh: wind[i] ?? null,
    wind_dir_deg: null,
  }));
}

const service = {
  WeatherService: {
    WeatherPort: {
      async GetWeather({ Latitude, Longitude }) {
        const lat = parseFloat(Latitude);
        const lon = parseFloat(Longitude);

        const data = await fetchWeather(lat, lon);
        const current = data.current;
        const observations = buildDtos(data);

        // SOAP sadece veri üretir, REST push yapılmaz

        return {
          Json: JSON.stringify(data),
          Observations: {
            Observation: observations,
          },
          Temperature: current?.temperature_2m ?? 0,
          Humidity: current?.relative_humidity_2m ?? 0,
          Status: "OK",
        };
      },
    },
  },
};

function initSoapServer(server) {
  soap.listen(server, "/soap", service, wsdl);
  console.log("SOAP server running at /soap");
}

async function fetchWeatherSOAP(lat, lon) {
  const wsdlUrl =
    "http://localhost:" + (process.env.PORT || 3000) + "/soap?wsdl";
  const client = await soap.createClientAsync(wsdlUrl);
  const [result] = await client.GetWeatherAsync({
    Latitude: lat,
    Longitude: lon,
  });

  return {
    observations: result.Observations?.Observation || [],
    json: result.Json ? JSON.parse(result.Json) : null,
    temperature: result.Temperature ?? null,
    humidity: result.Humidity ?? null,
    status: result.Status ?? "UNKNOWN",
  };
}

module.exports = { initSoapServer, fetchWeatherSOAP };
