// ============================================================================
// ASP.NET 7 Minimal API - Weather Service Integration Documentation
// ============================================================================
// Bu dosya .NET entegrasyonu için kapsamlı dokümantasyon içerir
// Open-Meteo API kullanılarak hava durumu verileri sağlanmaktadır
// ============================================================================

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║        ASP.NET 7 Minimal API - Weather Service Integration Guide         ║
║                    Open-Meteo API Integration                            ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 1. REST/SOAP ENDPOINT - Hava Durumu Verisi Çekme
// ============================================================================

/*
Endpoint: GET /fetchWeather
Content-Type: application/json
Base URL: http://localhost:3000

PARAMETRELER:
  - lat (required): Enlem (latitude) - double
  - lon (required): Boylam (longitude) - double  
  - startDate (optional): Başlangıç tarihi (YYYY-MM-DD) - string
    Varsayılan: Bugünün tarihi
    Not: Open-Meteo API past_days=3 kullanıyor, bu parametre log için
  - numDays (optional): Gün sayısı - int
    Varsayılan: 3
    Not: Open-Meteo API forecast_days=1 kullanıyor, bu parametre log için

RESPONSE FORMAT:
  Content-Type: application/json
  Status Code: 200 (Success), 400 (Bad Request), 500 (Server Error)

  Success Response (Open-Meteo API formatı):
  {
    "latitude": 38.375,
    "longitude": 27.125,
    "generationtime_ms": 0.143,
    "utc_offset_seconds": 10800,
    "timezone": "Europe/Istanbul",
    "timezone_abbreviation": "GMT+3",
    "elevation": 114.0,
    "current_units": {
      "time": "iso8601",
      "interval": "seconds",
      "temperature_2m": "°C",
      "relative_humidity_2m": "%",
      "wind_speed_10m": "km/h",
      "precipitation": "mm",
      "cloud_cover": "%",
      "pressure_msl": "hPa"
    },
    "current": {
      "time": "2025-12-16T21:00",
      "interval": 900,
      "temperature_2m": 8.1,
      "relative_humidity_2m": 70,
      "wind_speed_10m": 3.6,
      "precipitation": 0,
      "cloud_cover": 0,
      "pressure_msl": 1022.3
    },
    "hourly_units": {
      "time": "iso8601",
      "temperature_2m": "°C",
      "relative_humidity_2m": "%",
      "cloud_cover": "%",
      "wind_speed_10m": "km/h",
      "precipitation": "mm",
      "sunshine_duration": "s",
      "direct_radiation": "W/m²",
      "pressure_msl": "hPa"
    },
    "hourly": {
      "time": ["2025-12-13T00:00", "2025-12-13T01:00", ...],
      "temperature_2m": [7.3, 6.7, ...],
      "relative_humidity_2m": [82, 83, ...],
      "cloud_cover": [14, 27, ...],
      "wind_speed_10m": [2.5, 2.9, ...],
      "precipitation": [0, 0, ...],
      "sunshine_duration": [0, 0, ...],
      "direct_radiation": [0, 0, ...],
      "pressure_msl": [1020.5, 1020.7, ...]
    }
  }

  Error Response:
  {
    "error": "Weather data could not be fetched",
    "message": "Error details"
  }

.NET ÖRNEK KOD:
─────────────────────────────────────────────────────────────────────────────

using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// SOAP/REST Endpoint - Hava Durumu Verisi
app.MapGet("/weather/soap", async (HttpContext http) =>
{
    // Parametreleri al (query string'den)
    var lat = http.Request.Query["lat"].ToString();
    var lon = http.Request.Query["lon"].ToString();
    var startDate = http.Request.Query["startDate"].ToString();
    var numDays = http.Request.Query["numDays"].ToString();

    // Varsayılan değerler
    if (string.IsNullOrEmpty(lat)) lat = "38.4127";
    if (string.IsNullOrEmpty(lon)) lon = "27.1384";
    if (string.IsNullOrEmpty(startDate)) 
        startDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
    if (string.IsNullOrEmpty(numDays)) numDays = "3";

    // Node.js sunucusunun REST endpoint'i
    var nodeJsUrl = $"http://localhost:3000/fetchWeather?lat={lat}&lon={lon}&startDate={startDate}&numDays={numDays}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        // JSON response döndür
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Alternatif: JSON olarak parse edip döndür
app.MapGet("/weather/soap/parsed", async (HttpContext http) =>
{
    var lat = http.Request.Query["lat"].ToString() ?? "38.4127";
    var lon = http.Request.Query["lon"].ToString() ?? "27.1384";
    var startDate = http.Request.Query["startDate"].ToString() ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
    var numDays = http.Request.Query["numDays"].ToString() ?? "3";

    var nodeJsUrl = $"http://localhost:3000/fetchWeather?lat={lat}&lon={lon}&startDate={startDate}&numDays={numDays}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var jsonString = await response.Content.ReadAsStringAsync();
        
        // JSON'u parse et
        var jsonDoc = JsonDocument.Parse(jsonString);
        
        // Typed object olarak döndür
        return Results.Ok(jsonDoc);
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.Run();
*/

// ============================================================================
// 2. REST ENDPOINT - JSON Formatında Hava Durumu (Doğrudan)
// ============================================================================

/*
Endpoint: GET /fetchWeatherJson
Content-Type: application/json
Base URL: http://localhost:3000

PARAMETRELER:
  - lat (required): Enlem (latitude) - double
  - lon (required): Boylam (longitude) - double

RESPONSE FORMAT:
  Aynı Open-Meteo API formatı (yukarıdaki gibi)

.NET ÖRNEK KOD:
─────────────────────────────────────────────────────────────────────────────

app.MapGet("/weather/json", async (HttpContext http) =>
{
    var lat = http.Request.Query["lat"].ToString() ?? "38.4127";
    var lon = http.Request.Query["lon"].ToString() ?? "27.1384";

    var nodeJsUrl = $"http://localhost:3000/fetchWeatherJson?lat={lat}&lon={lon}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});
*/

// ============================================================================
// 3. gRPC ENDPOINT - Hava Durumu Verisi
// ============================================================================

/*
Service: WeatherService
Address: http://localhost:50051
RPC Method: GetWeather

PROTOBUF DEFINITION (weather.proto):
─────────────────────────────────────────────────────────────────────────────
syntax = "proto3";
package weather;

service WeatherService {
  rpc GetWeather (WeatherRequest) returns (WeatherResponse);
}

message WeatherRequest {
  double lat = 1;
  double lon = 2;
}

message WeatherResponse {
  string json = 1;  // JSON string olarak Open-Meteo API response'u
}
─────────────────────────────────────────────────────────────────────────────

.NET PROJE KURULUMU:
─────────────────────────────────────────────────────────────────────────────
1. .proto dosyasını projeye ekle (grpc/weather.proto)
2. .csproj dosyasına ekle:

<ItemGroup>
  <Protobuf Include="grpc\\weather.proto" GrpcServices="Client" />
</ItemGroup>

3. NuGet paketleri:
   - Grpc.Net.Client
   - Google.Protobuf

.NET ÖRNEK KOD:
─────────────────────────────────────────────────────────────────────────────

using Grpc.Net.Client;
using Weather; // Proto'dan generate edilen namespace
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/weather/grpc", async () =>
{
    try
    {
        // gRPC sunucusuna bağlan (Node.js gRPC sunucusu)
        using var channel = GrpcChannel.ForAddress("http://localhost:50051");
        var client = new WeatherService.WeatherServiceClient(channel);

        // Request oluştur
        var request = new WeatherRequest 
        { 
            Lat = 38.4127,
            Lon = 27.1384 
        };

        // gRPC çağrısı yap
        var response = await client.GetWeatherAsync(request);

        // JSON string'i parse et
        var jsonDoc = JsonDocument.Parse(response.Json);

        // JSON olarak döndür
        return Results.Ok(jsonDoc);
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Parametreli versiyon
app.MapGet("/weather/grpc/{lat}/{lon}", async (double lat, double lon) =>
{
    try
    {
        using var channel = GrpcChannel.ForAddress("http://localhost:50051");
        var client = new WeatherService.WeatherServiceClient(channel);

        var request = new WeatherRequest { Lat = lat, Lon = lon };
        var response = await client.GetWeatherAsync(request);
        var jsonDoc = JsonDocument.Parse(response.Json);

        return Results.Ok(jsonDoc);
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.Run();
*/

// ============================================================================
// 4. LOG ENDPOINT'LERİ - İstek Loglarını Çekme
// ============================================================================

/*
Endpoint: GET /logs
Content-Type: application/json
Base URL: http://localhost:3000

PARAMETRELER:
  - protocol (optional): Protokol türü - string
    Değerler: "SOAP", "gRPC", "REST"
    Belirtilmezse tüm protokoller
  - count (optional): Kaç log getirilecek - int
    Varsayılan: 10
  - date (optional): Tarih filtresi (YYYY-MM-DD) - string
    Varsayılan: Bugünün tarihi

RESPONSE FORMAT:
{
  "timestamp": "2025-12-16T21:00:00.000Z",
  "filter": {
    "protocol": "SOAP",
    "count": 10,
    "date": "2025-12-16"
  },
  "total": 25,
  "logs": [
    {
      "timestamp": "2025-12-16T20:30:00.000Z",
      "protocol": "SOAP",
      "request": {
        "type": "SOAP",
        "method": "GET",
        "url": "/fetchWeather?lat=38.4127&lon=27.1384",
        "query": {
          "lat": 38.4127,
          "lon": 27.1384,
          "startDate": "2025-12-16",
          "numDays": 3
        },
        "headers": {...},
        "clientIp": "127.0.0.1"
      },
      "response": {
        "status": 200,
        "type": "JSON",
        "size": 15234
      },
      "error": null
    },
    ...
  ]
}

.NET ÖRNEK KOD:
─────────────────────────────────────────────────────────────────────────────

app.MapGet("/logs", async (HttpContext http) =>
{
    var protocol = http.Request.Query["protocol"].ToString();
    var count = http.Request.Query["count"].ToString();
    var date = http.Request.Query["date"].ToString();

    var queryParams = new List<string>();
    if (!string.IsNullOrEmpty(protocol))
        queryParams.Add($"protocol={protocol}");
    if (!string.IsNullOrEmpty(count))
        queryParams.Add($"count={count}");
    if (!string.IsNullOrEmpty(date))
        queryParams.Add($"date={date}");

    var queryString = queryParams.Any() ? "?" + string.Join("&", queryParams) : "";
    var nodeJsUrl = $"http://localhost:3000/logs{queryString}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});
*/

// ============================================================================
// 5. LOG DOSYALARI ENDPOINT - Log Dosyalarını Listele
// ============================================================================

/*
Endpoint: GET /logs/files
Content-Type: application/json
Base URL: http://localhost:3000

PARAMETRELER:
  Yok

RESPONSE FORMAT:
{
  "timestamp": "2025-12-16T21:00:00.000Z",
  "logDirectory": "C:\\...\\logs\\requests",
  "files": [
    "requests-2025-12-14.log",
    "requests-2025-12-15.log",
    "requests-2025-12-16.log"
  ]
}

.NET ÖRNEK KOD:
─────────────────────────────────────────────────────────────────────────────

app.MapGet("/logs/files", async () =>
{
    var nodeJsUrl = "http://localhost:3000/logs/files";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});
*/

// ============================================================================
// 6. HEALTH CHECK ENDPOINT
// ============================================================================

/*
Endpoint: GET /health
Content-Type: application/json
Base URL: http://localhost:3000

RESPONSE FORMAT:
{
  "status": "OK",
  "timestamp": "2025-12-16T21:00:00.000Z"
}

.NET ÖRNEK KOD:
─────────────────────────────────────────────────────────────────────────────

app.MapGet("/health", async () =>
{
    var nodeJsUrl = "http://localhost:3000/health";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message, status = "DOWN" }, statusCode: 503);
    }
});
*/

// ============================================================================
// 7. TAM ÖRNEK - TÜM ENDPOINT'LERİ İÇEREN .NET UYGULAMASI
// ============================================================================

/*
using System.Text.Json;
using Grpc.Net.Client;
using Weather;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// CORS ayarları (gerekirse)
app.UseCors(builder => builder
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

// ========== 1. SOAP/REST Endpoint ==========
app.MapGet("/weather/soap", async (HttpContext http) =>
{
    var lat = http.Request.Query["lat"].ToString() ?? "38.4127";
    var lon = http.Request.Query["lon"].ToString() ?? "27.1384";
    var startDate = http.Request.Query["startDate"].ToString() ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
    var numDays = http.Request.Query["numDays"].ToString() ?? "3";

    var nodeJsUrl = $"http://localhost:3000/fetchWeather?lat={lat}&lon={lon}&startDate={startDate}&numDays={numDays}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ========== 2. JSON Endpoint ==========
app.MapGet("/weather/json", async (HttpContext http) =>
{
    var lat = http.Request.Query["lat"].ToString() ?? "38.4127";
    var lon = http.Request.Query["lon"].ToString() ?? "27.1384";

    var nodeJsUrl = $"http://localhost:3000/fetchWeatherJson?lat={lat}&lon={lon}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ========== 3. gRPC Endpoint ==========
app.MapGet("/weather/grpc", async (HttpContext http) =>
{
    var lat = double.Parse(http.Request.Query["lat"].ToString() ?? "38.4127");
    var lon = double.Parse(http.Request.Query["lon"].ToString() ?? "27.1384");

    try
    {
        using var channel = GrpcChannel.ForAddress("http://localhost:50051");
        var client = new WeatherService.WeatherServiceClient(channel);

        var request = new WeatherRequest { Lat = lat, Lon = lon };
        var response = await client.GetWeatherAsync(request);
        var jsonDoc = JsonDocument.Parse(response.Json);

        return Results.Ok(jsonDoc);
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ========== 4. Logs Endpoint ==========
app.MapGet("/logs", async (HttpContext http) =>
{
    var protocol = http.Request.Query["protocol"].ToString();
    var count = http.Request.Query["count"].ToString();
    var date = http.Request.Query["date"].ToString();

    var queryParams = new List<string>();
    if (!string.IsNullOrEmpty(protocol)) queryParams.Add($"protocol={protocol}");
    if (!string.IsNullOrEmpty(count)) queryParams.Add($"count={count}");
    if (!string.IsNullOrEmpty(date)) queryParams.Add($"date={date}");

    var queryString = queryParams.Any() ? "?" + string.Join("&", queryParams) : "";
    var nodeJsUrl = $"http://localhost:3000/logs{queryString}";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ========== 5. Log Files Endpoint ==========
app.MapGet("/logs/files", async () =>
{
    var nodeJsUrl = "http://localhost:3000/logs/files";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ========== 6. Health Check ==========
app.MapGet("/health", async () =>
{
    var nodeJsUrl = "http://localhost:3000/health";

    using var client = new HttpClient();
    try 
    {
        var response = await client.GetAsync(nodeJsUrl);
        var body = await response.Content.ReadAsStringAsync();
        
        return Results.Content(body, "application/json");
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = ex.Message, status = "DOWN" }, statusCode: 503);
    }
});

app.Run();
*/

// ============================================================================
// 8. TYPED MODELS (.NET için C# Class'ları)
// ============================================================================

/*
// Open-Meteo API Response Models
public class WeatherResponse
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double GenerationTimeMs { get; set; }
    public int UtcOffsetSeconds { get; set; }
    public string Timezone { get; set; } = string.Empty;
    public string TimezoneAbbreviation { get; set; } = string.Empty;
    public double Elevation { get; set; }
    public CurrentUnits CurrentUnits { get; set; } = new();
    public CurrentData Current { get; set; } = new();
    public HourlyUnits HourlyUnits { get; set; } = new();
    public HourlyData Hourly { get; set; } = new();
}

public class CurrentUnits
{
    public string Time { get; set; } = string.Empty;
    public string Interval { get; set; } = string.Empty;
    public string Temperature2m { get; set; } = string.Empty;
    public string RelativeHumidity2m { get; set; } = string.Empty;
    public string WindSpeed10m { get; set; } = string.Empty;
    public string Precipitation { get; set; } = string.Empty;
    public string CloudCover { get; set; } = string.Empty;
    public string PressureMsl { get; set; } = string.Empty;
}

public class CurrentData
{
    public string Time { get; set; } = string.Empty;
    public int Interval { get; set; }
    public double Temperature2m { get; set; }
    public int RelativeHumidity2m { get; set; }
    public double WindSpeed10m { get; set; }
    public double Precipitation { get; set; }
    public int CloudCover { get; set; }
    public double PressureMsl { get; set; }
}

public class HourlyUnits
{
    public string Time { get; set; } = string.Empty;
    public string Temperature2m { get; set; } = string.Empty;
    public string RelativeHumidity2m { get; set; } = string.Empty;
    public string CloudCover { get; set; } = string.Empty;
    public string WindSpeed10m { get; set; } = string.Empty;
    public string Precipitation { get; set; } = string.Empty;
    public string SunshineDuration { get; set; } = string.Empty;
    public string DirectRadiation { get; set; } = string.Empty;
    public string PressureMsl { get; set; } = string.Empty;
}

public class HourlyData
{
    public List<string> Time { get; set; } = new();
    public List<double> Temperature2m { get; set; } = new();
    public List<int> RelativeHumidity2m { get; set; } = new();
    public List<int> CloudCover { get; set; } = new();
    public List<double> WindSpeed10m { get; set; } = new();
    public List<double> Precipitation { get; set; } = new();
    public List<double> SunshineDuration { get; set; } = new();
    public List<double> DirectRadiation { get; set; } = new();
    public List<double> PressureMsl { get; set; } = new();
}

// Kullanım:
var jsonString = await response.Content.ReadAsStringAsync();
var weatherData = JsonSerializer.Deserialize<WeatherResponse>(jsonString, new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true
});
*/

// ============================================================================
// 9. ÖZET - ENDPOINT LİSTESİ
// ============================================================================

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ENDPOINT ÖZETİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GET /fetchWeather
   📍 Hava durumu verisi (SOAP/REST)
   📥 Parametreler: lat, lon, startDate (opt), numDays (opt)
   📤 Response: JSON (Open-Meteo formatı)

2. GET /fetchWeatherJson
   📍 Hava durumu verisi (JSON)
   📥 Parametreler: lat, lon
   📤 Response: JSON (Open-Meteo formatı)

3. gRPC WeatherService.GetWeather
   📍 Hava durumu verisi (gRPC)
   📥 Request: { lat: double, lon: double }
   📤 Response: { json: string }

4. GET /logs
   📍 İstek loglarını getir
   📥 Parametreler: protocol (opt), count (opt), date (opt)
   📤 Response: JSON (log array)

5. GET /logs/files
   📍 Log dosyalarını listele
   📥 Parametreler: Yok
   📤 Response: JSON (file list)

6. GET /health
   📍 Health check
   📥 Parametreler: Yok
   📤 Response: JSON ({ status: "OK", timestamp: ... })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 PORT BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REST/SOAP Server: http://localhost:3000
gRPC Server:      http://localhost:50051

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 NUGET PAKETLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Grpc.Net.Client (gRPC için)
- Google.Protobuf (gRPC için)
- System.Text.Json (JSON işlemleri için)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TEST ENDPOINT'LERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REST/SOAP:
  http://localhost:3000/fetchWeather?lat=38.4127&lon=27.1384
  http://localhost:3000/fetchWeatherJson?lat=38.4127&lon=27.1384
  http://localhost:3000/logs?protocol=SOAP&count=10
  http://localhost:3000/logs/files
  http://localhost:3000/health

gRPC:
  testGRPC.js dosyasını çalıştırarak test edebilirsiniz

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
