const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'grpc', 'weather.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH);
const weatherProto = grpc.loadPackageDefinition(packageDef).weather;

const client = new weatherProto.WeatherService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

client.GetWeather({ lat: 59.3294, lon: 18.0687 }, (err, res) => {
  if (err) return console.error(err);
  console.log(JSON.parse(res.json));
});
