process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { fetchWeatherSOAP } = require('./soap/soapServer');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const LAT = 38.423733;
const LON = 27.142826;

const CORE_OBS_BATCH_URL = 'https://localhost:7031/api/ingest/observations/batch';
const CORE_LOG_BATCH_URL = 'https://localhost:7031/api/api-log/batch';

const PROTO_PATH = './grpc/weather.proto';
const GRPC_ADDR = 'localhost:50051';

function toIsoNoZone(t) {
  if (typeof t !== 'string') return t;
  return t.length === 16 ? `${t}:00` : t;
}

function buildDtos(data) {
  const meta = {
    lat: data.latitude,
    lon: data.longitude,
    timezone: data.timezone,
    name: 'Izmir',
    city: 'Izmir',
    country_code: 'TR',
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
    ...meta,
    observed_at: toIsoNoZone(t),
    temperature_c: temp[i] ?? null,
    humidity_pct: hum[i] ?? null,
    wind_speed_kmh: wind[i] ?? null,
    precip_mm: precip[i] ?? null,
    cloud_cover_pct: cloud[i] ?? null,
    sunshine_min: sunSec[i] != null ? Math.round(sunSec[i] / 60) : null,
    shortwave_w_m2: rad[i] ?? null,
    wind_dir_deg: null,
  }));
}

async function sendApiLog(log) {
  try {
    await axios.post(
      CORE_LOG_BATCH_URL,
      [log],
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
    );
  } catch (e) {
    console.warn('api_log gönderilemedi:', e?.response?.status, e?.message);
  }
}

async function postObservationsWithLog(dtos, source) {
  const started = Date.now();
  try {
    const resp = await axios.post(
      CORE_OBS_BATCH_URL,
      dtos,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );

    const ms = Date.now() - started;
    await sendApiLog({
      user_id: null,
      endpoint: '/api/ingest/observations/batch',
      method: 'POST',
      request_ts: new Date().toISOString(),
      status_code: resp.status,
      response_ms: ms,
      client_ip: null,
      error_message: `OK (source=${source}, count=${dtos.length})`,
    });

    return resp;
  } catch (e) {
    const ms = Date.now() - started;
    const status = e?.response?.status ?? 0;
    await sendApiLog({
      user_id: null,
      endpoint: '/api/ingest/observations/batch',
      method: 'POST',
      request_ts: new Date().toISOString(),
      status_code: status,
      response_ms: ms,
      client_ip: null,
      error_message: `FAIL (source=${source}, count=${dtos.length}) :: ${e?.message}`,
    });
    throw e;
  }
}

// ------------------ gRPC fallback ------------------
async function fetchViaGrpc() {
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const pkg = grpc.loadPackageDefinition(def);
  const WeatherService = pkg.WeatherService || (pkg.weather && pkg.weather.WeatherService);
  if (!WeatherService) throw new Error('WeatherService bulunamadı (proto package adı farklı olabilir).');

  const client = new WeatherService(GRPC_ADDR, grpc.credentials.createInsecure());

  const jsonStr = await new Promise((resolve, reject) => {
    client.GetWeather({ lat: LAT, lon: LON }, (err, resp) => {
      if (err) return reject(err);
      resolve(resp.json);
    });
  });

  return JSON.parse(jsonStr);
}

// ------------------ Fallback mekanizması ------------------
async function fetchWeatherWithFallback() {
  // Önce SOAP
  try {
    const soapResult = await fetchWeatherSOAP(LAT, LON);
    if (soapResult?.json) {
      return { data: soapResult.json, source: 'SOAP->JSON' };
    }
  } catch (e) {
    console.warn('SOAP fetch failed:', e.message);
  }

  // SOAP başarısızsa gRPC
  try {
    const grpcData = await fetchViaGrpc();
    if (grpcData) {
      return { data: grpcData, source: 'gRPC' };
    }
  } catch (e) {
    console.warn('gRPC fetch failed:', e.message);
  }

  throw new Error('Her iki kaynak da çalışmadı (SOAP ve gRPC)');
}

// ------------------ Main ------------------
async function main() {
  const { data, source } = await fetchWeatherWithFallback();
  const dtos = buildDtos(data);
  console.log('DTO count:', dtos.length);

  const resp = await postObservationsWithLog(dtos, source);
  console.log('Core API response:', resp.status, resp.data);
}

main().catch(e => {
  console.error('FAILED:', { code: e?.code, message: e?.message, status: e?.response?.status, data: e?.response?.data });
});
