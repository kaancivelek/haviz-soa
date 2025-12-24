require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { fetchWeather } = require('../meteoblueClient');
const { logRequest } = require('../logger');

const GRPC_PORT = parseInt(process.env.GRPC_PORT) || 50051;

const pkgDef = protoLoader.loadSync(path.join(__dirname, 'weather.proto'));
const weatherProto = grpc.loadPackageDefinition(pkgDef).weather;

async function GetWeather(call, cb) {
  try {
    const { lat, lon } = call.request;

    // Request log
    const requestData = {
      type: 'gRPC',
      method: 'GetWeather',
      parameters: { lat, lon },
      peer: call.getPeer ? call.getPeer() : 'unknown'
    };

    console.log(`gRPC Request: GetWeather(lat=${lat}, lon=${lon})`);

    const data = await fetchWeather(lat, lon);

    // Response log
    logRequest('gRPC', requestData, {
      status: 'OK',
      type: 'JSON',
      dataSize: JSON.stringify(data).length
    });

    cb(null, { json: JSON.stringify(data) });
  } catch (error) {
    console.error('GetWeather error:', error.message);

    // Error log
    logRequest('gRPC', {
      type: 'gRPC',
      method: 'GetWeather',
      parameters: { lat: call.request.lat, lon: call.request.lon }
    }, null, error);

    cb({
      code: grpc.status.INTERNAL,
      message: `Weather fetch failed: ${error.message}`
    });
  }
}

const server = new grpc.Server();
server.addService(weatherProto.WeatherService.service, { GetWeather });
server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) {
    console.error('gRPC Server error:', err);
    process.exit(1);
  }
  console.log(`gRPC Server running on port ${GRPC_PORT}`);
});
