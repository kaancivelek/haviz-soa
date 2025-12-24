const fs = require('fs');
const path = require('path');

// Log dizini oluştur
const logsDir = path.join(__dirname, 'logs', 'requests');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Request debug logging
 * @param {string} protocol - Protokol türü ('SOAP', 'gRPC', 'REST')
 * @param {object} requestData - Request veri
 * @param {object} responseData - Response veri (optional)
 * @param {object} error - Hata (optional)
 */
function logRequest(protocol, requestData, responseData = null, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    protocol,
    request: requestData,
    response: responseData,
    error: error ? {
      message: error.message,
      code: error.code,
      stack: error.stack
    } : null
  };

  // Dosya adı: requests-2025-12-14.log
  const dateStr = timestamp.split('T')[0];
  const logFile = path.join(logsDir, `requests-${dateStr}.log`);

  // JSON formatında append et
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

  // Console'a da yazdır (renkli)
  console.log(`\n[${protocol}] ${timestamp}`);
  console.log('Request:', JSON.stringify(requestData, null, 2));
  if (responseData) {
    console.log('Response Status:', responseData.status || 'OK');
  }
  if (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Tüm logları oku
 * @param {string} date - Tarih (YYYY-MM-DD) veya undefined (günün logları)
 */
function readLogs(date = null) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `requests-${dateStr}.log`);

  if (!fs.existsSync(logFile)) {
    return [];
  }

  const content = fs.readFileSync(logFile, 'utf8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * Logları filtrele
 * @param {string} protocol - Protokol türü ('SOAP', 'gRPC', 'REST')
 * @param {string} date - Tarih
 */
function filterLogs(protocol, date = null) {
  const logs = readLogs(date);
  return logs.filter(log => log.protocol === protocol);
}

/**
 * En son N log'u getir
 * @param {number} count - Kaç tane
 * @param {string} date - Tarih
 */
function getLastLogs(count = 10, date = null) {
  const logs = readLogs(date);
  return logs.slice(-count);
}

/**
 * Tüm log dosyalarını listele
 */
function listLogFiles() {
  if (!fs.existsSync(logsDir)) {
    return [];
  }
  return fs.readdirSync(logsDir);
}

module.exports = {
  logRequest,
  readLogs,
  filterLogs,
  getLastLogs,
  listLogFiles,
  logsDir
};
