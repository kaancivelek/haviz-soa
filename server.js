require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { fork } = require("child_process");

const { fetchWeather } = require("./farApi");
const { logRequest } = require("./logger");
const { initSoapServer, fetchWeatherSOAP } = require("./soap/soapServer");

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// JSON ve raw body parse
app.use(express.raw({ type: "*/*", limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================== SOAP JSON endpoint =====================
app.get("/fetchWeather", async (req, res) => {
  try {
    const { lat, lon, startDate, numDays } = req.query;
    if (!lat || !lon) {
      const errorData = {
        error: "lat ve lon parametreleri gerekli",
        received: { lat, lon },
      };
      logRequest(
        "SOAP",
        { query: req.query },
        null,
        new Error("Missing parameters")
      );
      return res.status(400).json(errorData);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const start = startDate || new Date().toISOString().split("T")[0];
    const days = parseInt(numDays) || 3;

    logRequest("SOAP", {
      query: { lat: latitude, lon: longitude, startDate: start, numDays: days },
      method: req.method,
      url: req.originalUrl,
      headers: {
        "content-type": req.get("content-type"),
        "user-agent": req.get("user-agent"),
      },
      body: req.body
        ? Buffer.isBuffer(req.body)
          ? req.body.toString("utf8").substring(0, 1000)
          : req.body
        : null,
      clientIp: req.ip,
    });

    const weatherData = await fetchWeatherSOAP(
      latitude,
      longitude,
      start,
      days
    );

    logRequest(
      "SOAP",
      { query: req.query },
      {
        status: 200,
        type: "JSON",
        size: weatherData ? weatherData.toString().length : 0,
      }
    );
    res.set("Content-Type", "application/json");
    res.send(weatherData);
  } catch (error) {
    console.error("SOAP endpoint error:", error.message);
    logRequest("SOAP", { query: req.query }, null, error);
    res
      .status(500)
      .json({
        error: "Weather data could not be fetched",
        message: error.message,
      });
  }
});

// ===================== REST JSON endpoint =====================
app.get("/fetchWeatherJson", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      logRequest(
        "REST",
        { query: req.query },
        null,
        new Error("Missing parameters")
      );
      return res
        .status(400)
        .json({ error: "lat ve lon parametreleri gerekli" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    logRequest("REST", {
      query: { lat: latitude, lon: longitude },
      method: req.method,
      url: req.originalUrl,
      headers: {
        "content-type": req.get("content-type"),
        "user-agent": req.get("user-agent"),
      },
      body: req.body
        ? Buffer.isBuffer(req.body)
          ? req.body.toString("utf8").substring(0, 1000)
          : req.body
        : null,
      clientIp: req.ip,
    });

    const weatherData = await fetchWeather(latitude, longitude);

    logRequest(
      "REST",
      { query: req.query },
      {
        status: 200,
        type: "JSON",
        dataPoints: weatherData ? Object.keys(weatherData).length : 0,
      }
    );
    res.json(weatherData);
  } catch (error) {
    console.error("JSON endpoint error:", error.message);
    logRequest("REST", { query: req.query }, null, error);
    res
      .status(500)
      .json({
        error: "Weather data could not be fetched",
        message: error.message,
      });
  }
});

// ===================== Health endpoint =====================
app.get("/health", (req, res) =>
  res.json({ status: "OK", timestamp: new Date().toISOString() })
);

// ===================== Logs endpoint =====================
app.get("/logs", (req, res) => {
  const { protocol, count = 10, date } = req.query;
  const logger = require("./logger");

  try {
    const logs = protocol
      ? logger.filterLogs(protocol, date)
      : logger.getLastLogs(parseInt(count), date);
    res.json({
      timestamp: new Date().toISOString(),
      filter: { protocol, count, date },
      total: logs.length,
      logs: logs.slice(-parseInt(count) || 10),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/logs/files", (req, res) => {
  const logger = require("./logger");
  res.json({
    timestamp: new Date().toISOString(),
    logDirectory: logger.logsDir,
    files: logger.listLogFiles(),
  });
});

// ===================== HTTP Server & SOAP / gRPC =====================
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`\n=== SOAP/REST Server ===`);
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(
    `  GET /fetchWeather?lat=38.42&lon=27.14&startDate=2025-12-14&numDays=3 (SOAP->JSON)`
  );
  console.log(`  GET /fetchWeatherJson?lat=38.42&lon=27.14 (REST JSON)`);
  console.log(`  GET /health`);

  // -------------------- SOAP server --------------------
  initSoapServer(server);
  console.log("SOAP server initialized on same HTTP server");

  // -------------------- gRPC server --------------------
  try {
    delete require.cache[require.resolve("./grpc/grpcServer")];
    require(path.resolve(__dirname, "grpc/grpcServer"));
    console.log("gRPC server started");
  } catch (err) {
    console.error("gRPC server could not start:", err.message);
  }

  // -------------------- Core API push job --------------------
  try {
    const pushScript = path.resolve(__dirname, "pushToCoreApi.js");
    fork(pushScript, { stdio: "inherit" });
    console.log("pushToCoreApi.js başlatıldı (arka planda çalışıyor)");
  } catch (err) {
    console.error("pushToCoreApi.js başlatılamadı:", err.message);
  }
});
