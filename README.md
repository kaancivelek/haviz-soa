# Havadurumu SOA - Weather Service

## Genel Bakış

Bu proje ASP.NET backend'ten gelen istekleri iki farklı protokolle destekler:
1. **SOAP/REST** - XML formatında hava durumu verisi
2. **gRPC** - JSON formatında hava durumu verisi

## Kurulum

```bash
npm install
```

## Yapılandırma

PORT=3000
GRPC_PORT=50051
```

## Başlatma

```bash
node server.js
```

Başarılı başlatma çıktısı:
```
=== SOAP/REST Server ===
Server listening on http://localhost:3000

Endpoints:
  GET /fetchWeather?lat=38.42&lon=27.14&startDate=2025-12-14&numDays=3 (SOAP)
  GET /fetchWeatherJson?lat=38.42&lon=27.14 (JSON)
  GET /health

=== Starting gRPC Server ===

gRPC Server running on port 50051
```

## API Endpoints

### 1. SOAP/REST Endpoint (Port 3000)

**SOAP Formatında:**
```
GET http://localhost:3000/fetchWeather?lat=38.423733&lon=27.142826&startDate=2025-12-14&numDays=3
```

**Parametreler:**
- `lat` (float, required): Enlem
- `lon` (float, required): Boylam
- `startDate` (string, optional): Başlangıç tarihi YYYY-MM-DD formatında
- `numDays` (number, optional): Gün sayısı (varsayılan: 3)

**Response:** XML formatında

---

**JSON Formatında:**
```
GET http://localhost:3000/fetchWeatherJson?lat=38.423733&lon=27.142826
```

**Response:** JSON formatında

### 2. gRPC Endpoint (Port 50051)

**Proto Tanımı:**
```protobuf
service WeatherService {
  rpc GetWeather (WeatherRequest) returns (WeatherResponse);
}

message WeatherRequest {
  double lat = 1;
  double lon = 2;
}

message WeatherResponse {
  string json = 1;
}
```

**Proto dosyası:** `grpc/weather.proto`

### 3. Health Check

```
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

## ASP.NET Integration

### SOAP Request Örneği (.NET Minimal API)

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/weather/soap", async (HttpContext http) =>
{
    var lat = 38.423733;
    var lon = 27.142826;
    var startDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
    var numDays = 3;

    var nodeJsUrl = $"http://localhost:3000/fetchWeather?lat={lat}&lon={lon}&startDate={startDate}&numDays={numDays}";

    using var client = new HttpClient();
    var response = await client.GetAsync(nodeJsUrl);
    var body = await response.Content.ReadAsStringAsync();

    return Results.Content(body, "application/xml");
});

app.Run();
```

### gRPC Request Örneği (.NET)

```csharp
using Grpc.Net.Client;

var channel = GrpcChannel.ForAddress("http://localhost:50051");
var client = new WeatherService.WeatherServiceClient(channel);

var request = new WeatherRequest 
{ 
    Lat = 38.423733,
    Lon = 27.142826 
};

var response = await client.GetWeatherAsync(request);
Console.WriteLine(response.Json);
```

## Yapı

```
havadurumu-soa/
├── server.js                    # Ana Express sunucusu
├── meteoblueClient.js           # Meteoblue API istemcisi
├── grpc/
│   ├── grpcServer.js           # gRPC sunucu
│   └── weather.proto           # gRPC proto tanımı
├── soap/
│   └── soapServer.js           # SOAP servisi
├── testSOAP.js                 # SOAP test
├── DOTNET_INTEGRATION.js       # .NET entegrasyon rehberi
└── package.json
```

## Error Handling

Her iki protokol de hataları düzgün şekilde işler:

- **SOAP/REST:**
  ```json
  {
    "error": "Weather data could not be fetched",
    "message": "Error details..."
  }
  ```

- **gRPC:**
  ```
  Status: INTERNAL
  Message: Weather fetch failed: Error details...
  ```

## Test Etme

Terminal 1'de sunucuyu başlat:
```bash
node server.js
```

Bu komut **her iki protokolü de başlatır:**
- REST/SOAP Server: http://localhost:3000
- gRPC Server: localhost:50051

### SOAP Test

Terminal 2'de:
```bash
node testSOAP.js
```

### gRPC Test

Terminal 2'de:
```bash
node testGRPC.js
```



### Debug Logları

Terminal 2'de logları görüntüle:
```bash
# En son 10 log
curl http://localhost:3000/logs

# Sadece gRPC logları
curl "http://localhost:3000/logs?protocol=gRPC"

# Sadece SOAP logları  
curl "http://localhost:3000/logs?protocol=SOAP"

# Log dosyalarını listele
curl http://localhost:3000/logs/files
```

Loglar şurada depolanır: `./logs/requests/requests-YYYY-MM-DD.log`

## Veri Kaynakları

- **Birincil:** Meteoblue API (JSON)
- **Yedek:** NOAA SOAP Servisi (XML)

Birincil kaynak başarısız olursa, sistem otomatik olarak yedek kaynağa geçer.

## Timeout Ayarları

- REST/SOAP: 30 saniye
- gRPC: Sunucu timeout'u yok (client tarafında ayarlanmalı)

## Notlar

- Weatherblue API Key'i güvenli bir yere taşıyın (environment variables)
- Üretim ortamında HTTPS/TLS kullanın
- Rate limiting ekleyin
- Veri caching mekanizması ekleyin
