process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // DEV ONLY (https localhost)

const axios = require("axios");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const LAT = 38.423733;
const LON = 27.142826;

// 1) HTTP kaynaklar
const URL_PRIMARY = `http://localhost:3000/fetchWeatherJson?lat=${LAT}&lon=${LON}`;
const URL_FALLBACK = `http://localhost:3000/fetchWeather?lat=${LAT}&lon=${LON}&startDate=2025-12-15&numDays=3`;

// 2) gRPC kaynak
const GRPC_ADDR = "localhost:50051";
const PROTO_PATH = "./grpc/weather.proto";

// 3) Core API (DB’ye yazan)
const CORE_OBS_BATCH_URL = "https://localhost:7031/api/ingest/observations/batch";

// 4) Core API (api_log ingest)
const CORE_LOG_BATCH_URL = "https://localhost:7031/api/api-log/batch";

// "2025-12-18T15:00" -> "2025-12-18T15:00:00"
function toIsoNoZone(t) {
  if (typeof t !== "string") return t;
  return t.length === 16 ? `${t}:00` : t;
}

/**
 * SOA’dan gelen hourly json -> CoreApi ObservationIngestDto listesine çevirir
 * (Senin Core API ingest endpointin bu listeyi alıp upsert yapıyor)
 */
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
  if (!WeatherService) throw new Error("WeatherService bulunamadı (proto package adı farklı olabilir).");

  const client = new WeatherService(GRPC_ADDR, grpc.credentials.createInsecure());

  const jsonStr = await new Promise((resolve, reject) => {
    client.GetWeather({ lat: LAT, lon: LON }, (err, resp) => {
      if (err) return reject(err);
      resolve(resp.json);
    });
  });

  return JSON.parse(jsonStr);
}

/**
 * Önce SOAP(jsonified) -> gRPC -> REST JSON fallback
 */
async function fetchWithFallback() {
  try {
    console.log("Trying SOAP(jsonified):", URL_FALLBACK);
    const r1 = await axios.get(URL_FALLBACK, { timeout: 30000 });
    console.log("SOAP(jsonified) OK");
    return { data: r1.data, source: "fetchWeather (soap->json)" };
  } catch (e) {
    console.log("SOAP(jsonified) FAIL:", e?.code, e?.message);
  }

  try {
    console.log("Trying gRPC:", GRPC_ADDR);
    const g = await fetchViaGrpc();
    console.log("gRPC OK");
    return { data: g, source: "gRPC" };
  } catch (e) {
    console.log("gRPC FAIL:", e?.code, e?.message);
  }

  console.log("Trying REST JSON:", URL_PRIMARY);
  const r3 = await axios.get(URL_PRIMARY, { timeout: 30000 });
  console.log("REST JSON OK");
  return { data: r3.data, source: "fetchWeatherJson" };
}

/**
 * Core API’ye api_log gönderir.
 * - batch endpoint array bekler (biz tek log’u array içinde yolluyoruz)
 */
async function sendApiLog(log) {
  try {
    await axios.post(CORE_LOG_BATCH_URL, [log], {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
  } catch (e) {
    // Log atma başarısızsa ana akışı bozmayalım
    console.warn("api_log gönderilemedi:", e?.response?.status, e?.message);
  }
}

/**
 * Observation batch POST işlemini yapar ve sonucunu api_log’a yazar.
 */
async function postObservationsWithLog(dtos, source) {
  const started = Date.now();

  try {
    const resp = await axios.post(CORE_OBS_BATCH_URL, dtos, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const ms = Date.now() - started;

    // ✅ Başarılı çağrıyı logla
    await sendApiLog({
      user_id: null,
      endpoint: "/api/ingest/observations/batch",
      method: "POST",
      request_ts: new Date().toISOString(),
      status_code: resp.status,
      response_ms: ms,
      client_ip: null, // server fallback ile dolduracak
      error_message: `OK (source=${source}, count=${dtos.length})`,
    });

    return resp;
  } catch (e) {
    const ms = Date.now() - started;
    const status = e?.response?.status ?? 0;

    // ✅ Hatalı çağrıyı da logla
    await sendApiLog({
      user_id: null,
      endpoint: "/api/ingest/observations/batch",
      method: "POST",
      request_ts: new Date().toISOString(),
      status_code: status,
      response_ms: ms,
      client_ip: null,
      error_message: `FAIL (source=${source}, count=${dtos.length}) :: ${e?.message}`,
    });

    throw e;
  }
}

async function main() {
  const { data, source } = await fetchWithFallback();
  console.log("Using source:", source);

  const dtos = buildDtos(data);
  console.log("DTO count:", dtos.length);

  const resp = await postObservationsWithLog(dtos, source);
  console.log("Core API response:", resp.status, resp.data);
}

main().catch((e) => {
  console.error("FAILED:", {
    code: e?.code,
    message: e?.message,
    status: e?.response?.status,
    data: e?.response?.data,
  });
});
