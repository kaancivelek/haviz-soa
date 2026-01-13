## Weather SOA Service

Node.js service that exposes the same weather data over REST, SOAP, and gRPC. It pulls hourly observations for the last 3 days from the Open-Meteo API and can forward observations to an external .NET Core backend.

## Features

- REST JSON endpoint for direct weather fetches
- SOAP service with WSDL under `/soap` plus a REST-to-SOAP bridge at `/fetchWeather`
- gRPC server with `GetWeather` returning the raw JSON payload
- Structured request logging to rotating daily files in `logs/requests`
- Background job (`pushToCoreApi.js`) that fetches via SOAP with gRPC fallback and posts batches to a Core API
- Health check and lightweight test clients for SOAP and gRPC

## Requirements

- Node.js 18+ recommended
- Internet access to reach `https://api.open-meteo.com`

## Setup

```bash
npm install
```

Environment variables (optional, defaults shown):

```
PORT=3000
GRPC_PORT=50051
OPEN_METEO_API_URL=https://api.open-meteo.com/v1/forecast
DEFAULT_LAT=38.4127
DEFAULT_LON=27.1384
REST_TIMEOUT=30000
```

## Run

```bash
node server.js
```

What starts:

- REST/SOAP server on `http://localhost:3000`
- SOAP service at `/soap` with WSDL at `/soap?wsdl`
- gRPC server on `localhost:${GRPC_PORT}`
- Background job `pushToCoreApi.js` (posts to the Core API URLs hard-coded in that file)

Example startup log:

```
=== SOAP/REST Server ===
Server listening on http://localhost:3000
Endpoints:
  GET /fetchWeather?lat=38.42&lon=27.14&startDate=2025-12-14&numDays=3 (SOAP->JSON)
  GET /fetchWeatherJson?lat=38.42&lon=27.14 (REST JSON)
  GET /health
SOAP server initialized on same HTTP server
gRPC server started
```

## Endpoints

- REST JSON: `GET /fetchWeatherJson?lat=38.423733&lon=27.142826`
  - Returns the raw Open-Meteo JSON. `lat` and `lon` are required.

- REST to SOAP bridge: `GET /fetchWeather?lat=38.423733&lon=27.142826&startDate=2025-12-14&numDays=3`
  - Invokes the local SOAP service and responds with JSON shaped like:
  ```json
  {
    "observations": [ { "lat": 38.42, "lon": 27.14, "observed_at": "2025-12-14T00:00:00", ... } ],
    "json": { "latitude": 38.42, "hourly": { "time": [...] } },
    "temperature": 8.1,
    "humidity": 70,
    "status": "OK"
  }
  ```

- SOAP service: `POST /soap` (WSDL at `/soap?wsdl`)
  - Operation `GetWeather` expects `Latitude` and `Longitude` (double).
  - Response contains `Json` (string), `Observations` (array of observation DTOs), `Temperature`, `Humidity`, and `Status`.

- gRPC: `GetWeather` on `WeatherService` (proto in `grpc/weather.proto`)
  ```proto
  service WeatherService {
    rpc GetWeather (WeatherRequest) returns (WeatherResponse);
  }

  message WeatherRequest { double lat = 1; double lon = 2; }
  message WeatherResponse { string json = 1; }
  ```

- Health check: `GET /health` → `{ "status": "OK", "timestamp": "2025-12-14T10:30:00.000Z" }`

- Logs:
  - `GET /logs?protocol=SOAP|REST|gRPC&count=10&date=YYYY-MM-DD` (defaults to last 10 of today)
  - `GET /logs/files` to list existing log files

Log files are written to `logs/requests/requests-YYYY-MM-DD.log` in JSON-per-line format.

## Background push job

`pushToCoreApi.js` runs automatically on startup. It:

- Fetches data via SOAP (`/fetchWeather`) and falls back to gRPC if SOAP fails
- Builds observation DTOs and posts them to the Core API batch ingest endpoint
- Logs successes/failures to the Core API log endpoint
- Uses HTTPS with certificate verification disabled; adjust the URLs and TLS handling before production use

## Testing

- SOAP path (REST→SOAP): `node testSOAP.js`
- gRPC path: `node testGRPC.js`

## Project layout

```
server.js                 # Express entry point, starts SOAP, REST, gRPC, logs, push job
farApi.js                 # Open-Meteo client
grpc/grpcServer.js        # gRPC server using weather.proto
grpc/weather.proto        # Proto definition
soap/soapServer.js        # SOAP service implementation and client helper
soap/weather.wsdl         # WSDL served at /soap?wsdl
pushToCoreApi.js          # Background job to push observations to Core API
logger.js                 # File-based JSON request logger
testSOAP.js / testGRPC.js # Simple smoke tests for SOAP and gRPC
DOTNET_INTEGRATION.js     # Detailed .NET integration guide (non-runtime)
```

## Notes and recommendations

- Provide your own `.env` and avoid hard-coding Core API URLs in `pushToCoreApi.js` for production
- Enable TLS and certificates for any real deployment
- Add rate limiting and caching if this will be exposed publicly
- Client-side timeouts are recommended for gRPC calls; REST uses the `REST_TIMEOUT` value
