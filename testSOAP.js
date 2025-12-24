// Test örneği - SOAP isteği (ASP.NET Minimal API'den çağrılacak)
const http = require('http');

async function testSOAPEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/fetchWeather?lat=38.423733&lon=27.142826&startDate=2025-12-14&numDays=3',
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Test çalıştır
testSOAPEndpoint()
  .then(result => {
    console.log('SOAP Response Status:', result.status);
    console.log('SOAP Response Data (first 500 chars):', result.data.substring(0, 500));
  })
  .catch(err => console.error('Error:', err.message));
