# Havadurumu SOA - Weather Service

## Genel Bakış

Bu proje, Open‑Meteo API'den hava durumu verisi alıp bunu farklı protokoller üzerinden .NET Core backend'e sunan bir **SOA (Service-Oriented Architecture) weather gateway**'dir.

- **Gerçek SOAP**: `soap/weather.wsdl` + `soap/soapServer.js` ile `/soap` path'inde çalışan SOAP servisi
- **REST → SOAP → REST köprüsü**: `/fetchWeather` endpoint'i, dışarıya JSON verir ama içeride gerçek SOAP `GetWeather` çağrısı yapar
- **Doğrudan REST**: `/fetchWeatherJson` endpoint'i, Open‑Meteo'dan JSON'u direkt döner
- **gRPC**: `grpc/grpcServer.js` üzerinden `WeatherService.GetWeather` çağrısı ile JSON döner

Bu tasarım, sektörde genellikle:

- **API Gateway / Facade / BFF (Backend‑for‑Frontend)**,
- **Protocol Adapter / SOAP–REST Bridge**

olarak adlandırılan yaklaşıma örnektir:  
İstemciler için tek ve sade bir REST/gRPC yüzü, içeride ise gerçek SOAP ve harici API çağrıları.

## Kurulum

```bash
npm install
```

## Yapılandırma

`.env` içinden:

- `PORT=3000`
- `GRPC_PORT=50051`

İsteğe bağlı:

- `OPEN_METEO_API_URL` (varsayılan: `https://api.open-meteo.com/v1/forecast`)
- `DEFAULT_LAT`, `DEFAULT_LON`

## Başlatma

```bash
node server.js
```

Başarılı başlatma çıktısı (özet):

```text
=== SOAP/REST Server ===
Server listening on http://localhost:3000

Endpoints:
  GET /fetchWeather?lat=38.42&lon=27.14&startDate=2025-12-14&numDays=3 (SOAP(XML)- to JSON)
  GET /fetchWeatherJson?lat=38.42&lon=27.14 (JSON)
  GET /health

=== Starting SOAP Server ===
SOAP server running at /soap

=== Starting gRPC Server ===
gRPC Server running on port 50051
```

## API Endpoints

### 1. REST → SOAP → REST Endpoint: `/fetchWeather` (Port 3000)

**Dışarıdan bakınca (REST/JSON):**

```http
GET http://localhost:3000/fetchWeather?lat=38.423733&lon=27.142826&startDate=2025-12-14&numDays=3
Accept: application/json
```

**Parametreler:**

- `lat` (float, required): Enlem
- `lon` (float, required): Boylam
- `startDate` (string, optional): Başlangıç tarihi YYYY-MM-DD formatında (şu an log amaçlı)
- `numDays` (number, optional): Gün sayısı (şu an log amaçlı)

**Response (JSON):**

```json
{
  "observations": [
    {
      "lat": 38.42,
      "lon": 27.14,
      "name": "Izmir",
      "city": "Izmir",
      "country_code": "TR",
      "timezone": "Europe/Istanbul",
      "observed_at": "2025-12-14T00:00:00",
      "temperature_c": 10.5,
      "sunshine_min": 0,
      "shortwave_w_m2": 0.0,
      "precip_mm": 0.0,
      "humidity_pct": 82,
      "cloud_cover_pct": 40,
      "wind_speed_kmh": 12.3,
      "wind_dir_deg": null
    }
  ],
  "json": { },
  "temperature": 10.5,
  "humidity": 82,
  "status": "OK"
}
```

**İçeride ne oluyor? (REST → SOAP → REST köprüsü)**

- `server.js` içindeki `/fetchWeather` handler'ı:
  - Parametreleri valide eder.
  - `fetchWeatherSOAP(lat, lon)` fonksiyonunu çağırır.
- `fetchWeatherSOAP` (`soap/soapServer.js` içinde):
  - `http://localhost:3000/soap?wsdl` üzerinden bir SOAP client oluşturur.
  - Gerçek SOAP endpoint'i olan `WeatherService.WeatherPort.GetWeather`'i çağırır.
  - SOAP cevabındaki:
    - `Json` (Open‑Meteo JSON string),
    - `Observations.Observation` (ObservationIngestDto ile uyumlu liste),
    - `Temperature`, `Humidity`, `Status`
    alanlarını alıp JSON'a çevirir.
- `/fetchWeather` endpoint'i bu JSON'u dış dünyaya döner.

Bu sayede:

- **Dışarıdan**: Sadece basit bir REST/JSON endpoint'i görürsün.
- **İçeride**: Tüm iş gerçek SOAP servisi (`/soap`) üzerinden döner.

Bu desen, sektörde **"SOAP–REST bridge"**, **"facade"** veya **"protocol adapter"** olarak bilinir.

### 2. Doğrudan REST Endpoint: `/fetchWeatherJson` (Port 3000)

```http
GET http://localhost:3000/fetchWeatherJson?lat=38.423733&lon=27.142826
Accept: application/json
```

Bu endpoint, SOAP katmanını **kullanmaz**:

- Doğrudan `meteoblueClient.fetchWeather` fonksiyonunu çağırır.
- Open‑Meteo API'den aldığı HTTP JSON'u loglayıp aynen döner.

### 3. gRPC Endpoint (Port 50051)

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

### 4. Health Check

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

### 1. REST → SOAP → REST Endpoint'ini Tüketmek (.NET Minimal API)

Bu senaryoda .NET tarafı **SOAP bilmek zorunda değildir**. Sadece `/fetchWeather`'den JSON alır.

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/weather/observations", async (HttpContext http) =>
{
    var lat = http.Request.Query["lat"].ToString() ?? "38.423733";
    var lon = http.Request.Query["lon"].ToString() ?? "27.142826";
    var startDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
    var numDays = "3";

    var nodeJsUrl =
        $"http://localhost:3000/fetchWeather?lat={lat}&lon={lon}&startDate={startDate}&numDays={numDays}";

    using var client = new HttpClient();
    var response = await client.GetAsync(nodeJsUrl);
    var body = await response.Content.ReadAsStringAsync();

    // body JSON olduğu için doğrudan ObservationIngestDto listesine map edilebilir
    return Results.Content(body, "application/json");
});

app.Run();
```

Bu yaklaşım:

- Node.js tarafını **SOAP–REST köprüsü** (adapter) olarak kullanır.
- .NET tarafını SOAP detaylarından izole eder.

### 2. gRPC Request Örneği (.NET)

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
├── server.js                    # Ana Express sunucusu (REST -> SOAP -> REST + gRPC + pushToCoreApi)
├── meteoblueClient.js           # Open‑Meteo API istemcisi
├── grpc/
│   ├── grpcServer.js           # gRPC sunucu
│   └── weather.proto           # gRPC proto tanımı
├── soap/
│   ├── soapServer.js           # SOAP servisi + REST->SOAP helper
│   └── weather.wsdl            # SOAP WSDL tanımı
├── testSOAP.js                 # REST -> SOAP -> REST akışını test eden script
├── pushToCoreApi.js           # Core API'ye ObservationIngestDto batch push eden job
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

Bu komut aşağıdakileri başlatır:

- REST/SOAP Bridge Server: http://localhost:3000
- Gerçek SOAP Server: http://localhost:3000/soap (+ ?wsdl)
- gRPC Server: localhost:50051
- pushToCoreApi.js: Core API'ye veri push eden job (arka planda)

### REST → SOAP → REST Akış Testi

Terminal 2'de:

```bash
node testSOAP.js
```

Bu script:

- GET /fetchWeather?... endpoint'ini çağırır.
- JSON cevap bekler, içinde observations listesini kontrol eder.
- Arka planda bu çağrı gerçek SOAP GetWeather metoduna yapılır.

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
