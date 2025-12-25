// gRPC test client
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Proto yükle
const pkgDef = protoLoader.loadSync(path.join(__dirname, "grpc/weather.proto"));
const weatherProto = grpc.loadPackageDefinition(pkgDef).weather;

async function testGrpc() {
  console.log("\n📡 gRPC Test İstemcisi Başlatılıyor...\n");

  // gRPC sunucusuna bağlan
  const client = new weatherProto.WeatherService(
    "localhost:50051",
    grpc.credentials.createInsecure()
  );

  const request = {
    lat: 38.423733,
    lon: 27.142826,
  };

  console.log("📤 Gönderilen Request:");
  console.log(JSON.stringify(request, null, 2));

  return new Promise((resolve, reject) => {
    client.GetWeather(request, (err, response) => {
      if (err) {
        console.error("❌ gRPC Error:", err.message);
        reject(err);
      } else {
        console.log("\n✅ gRPC Response Alındı:");
        console.log("Veri boyutu:", response.json.length, "bytes");
        console.log(
          "Veri (ilk 200 char):",
          response.json.substring(0, 200) + "..."
        );
        resolve(response);
      }
    });
  });
}

testGrpc()
  .then(() => {
    console.log("\n✅ gRPC Testi Başarılı!\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ gRPC Testi Başarısız!\n", err);
    process.exit(1);
  });
