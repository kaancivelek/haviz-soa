require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { fork } = require('child_process');

const { fetchWeather } = require('./meteoblueClient');
const { logRequest } = require('./logger');
const { initSoapServer, fetchWeatherSOAP } = require('./soap/soapServer');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// Raw body ve JSON body'i kaydet
app.use(express.raw({ type: '*/*', limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SOAP isteği için endpoint (ASP.NET Minimal API'den gelecek) - JSON döner
app.get('/fetchWeather', async (req, res) => {
  try {
    const { lat, lon, startDate, numDays } = req.query;

    // Parametreleri valide et
    if (!lat || !lon) {
      const errorData = {
        error: 'lat ve lon parametreleri gerekli',
        received: { lat, lon }
      };
      logRequest('SOAP', { query: req.query }, null, new Error('Missing parameters'));
      return res.status(400).json(errorData);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const start = startDate || new Date().toISOString().split('T')[0];
    const days = parseInt(numDays) || 3;

    // Request log
    const requestData = {
      type: 'SOAP',
      method: req.method,
      url: req.originalUrl,
      query: { lat: latitude, lon: longitude, startDate: start, numDays: days },
      headers: {
        'content-type': req.get('content-type'),
        'user-agent': req.get('user-agent')
      },
      body: req.body ? (Buffer.isBuffer(req.body) ? req.body.toString('utf8').substring(0, 1000) : req.body) : null,
      clientIp: req.ip
    };

    console.log(`SOAP Request: lat=${latitude}, lon=${longitude}, startDate=${start}, numDays=${days}`);

    const weatherData = await fetchWeatherSOAP(latitude, longitude, start, days);

    // Response log
    logRequest('SOAP', requestData, {
      status: 200,
      type: 'JSON',
      size: weatherData ? weatherData.toString().length : 0
    });

    res.set('Content-Type', 'application/json');
    res.send(weatherData);
  } catch (error) {
    console.error('SOAP endpoint error:', error.message);
    
    logRequest('SOAP', { query: req.query }, null, error);

    res.status(500).json({
      error: 'Weather data could not be fetched',
      message: error.message
    });
  }
});

// Test endpoint - Meteoblue JSON formatında doğrudan al
app.get('/fetchWeatherJson', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      logRequest('REST', { query: req.query }, null, new Error('Missing parameters'));
      return res.status(400).json({
        error: 'lat ve lon parametreleri gerekli'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // Request log
    const requestData = {
      type: 'REST',
      method: req.method,
      url: req.originalUrl,
      query: { lat: latitude, lon: longitude },
      headers: {
        'content-type': req.get('content-type'),
        'user-agent': req.get('user-agent')
      },
      body: req.body ? (Buffer.isBuffer(req.body) ? req.body.toString('utf8').substring(0, 1000) : req.body) : null,
      clientIp: req.ip
    };

    console.log(`JSON Request: lat=${latitude}, lon=${longitude}`);

    const weatherData = await fetchWeather(latitude, longitude);

    // Response log
    logRequest('REST', requestData, {
      status: 200,
      type: 'JSON',
      dataPoints: weatherData ? Object.keys(weatherData).length : 0
    });

    res.json(weatherData);
  } catch (error) {
    console.error('JSON endpoint error:', error.message);
    
    logRequest('REST', { query: req.query }, null, error);

    res.status(500).json({
      error: 'Weather data could not be fetched',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint - Logları getir
app.get('/logs', (req, res) => {
  const { protocol, count = 10, date } = req.query;
  const logger = require('./logger');

  try {
    let logs;
    if (protocol) {
      logs = logger.filterLogs(protocol, date);
    } else {
      logs = logger.getLastLogs(parseInt(count), date);
    }

    res.json({
      timestamp: new Date().toISOString(),
      filter: { protocol, count, date },
      total: logs.length,
      logs: logs.slice(-parseInt(count) || 10)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - Log dosyalarını listele
app.get('/logs/files', (req, res) => {
  const logger = require('./logger');
  const files = logger.listLogFiles();
  
  res.json({
    timestamp: new Date().toISOString(),
    logDirectory: logger.logsDir,
    files: files
  });
});

// Tek HTTP server üzerinden Express + SOAP + gRPC
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`\n=== SOAP/REST Server ===`);
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /fetchWeather?lat=38.42&lon=27.14&startDate=2025-12-14&numDays=3 (SOAP(XML)- to JSON)`);
  console.log(`  GET /fetchWeatherJson?lat=38.42&lon=27.14 (JSON)`);
  console.log(`  GET /health`);
  console.log(`\n=== Starting SOAP Server ===`);

  // Gerçek SOAP server'ı aynı HTTP server üzerinde başlat
  initSoapServer(server);

  console.log(`\n=== Starting gRPC Server ===\n`);

  // gRPC sunucusunu başlat - mutlak yol ile
  delete require.cache[require.resolve('./grpc/grpcServer')];
  require(require('path').resolve(__dirname, 'grpc/grpcServer'));

  // Core API'ye veri push eden job'u server start'ta tetikle
  try {
    const pushScript = path.resolve(__dirname, 'pushToCoreApi.js');
    fork(pushScript, { stdio: 'inherit' });
    console.log('pushToCoreApi.js başlatıldı (arka planda çalışıyor)');
  } catch (err) {
    console.error('pushToCoreApi.js başlatılamadı:', err.message);
  }
});
