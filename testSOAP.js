// testSOAP.js
// Bu script, REST -> SOAP -> REST akışını test eder.
// /fetchWeather endpoint'i JSON döner ama arka planda gerçek SOAP GetWeather çağrısı yapılır.

const http = require("http");

async function testSOAPEndpoint() {
  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/fetchWeather?lat=38.423733&lon=27.142826&startDate=2025-12-14&numDays=3",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, json });
        } catch (err) {
          reject(new Error("JSON parse error: " + err.message));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// Test çalıştır
testSOAPEndpoint()
  .then((result) => {
    console.log("Status:", result.status);
    console.log("Body keys:", Object.keys(result.json));
    if (result.json.observations) {
      console.log("Observation count:", result.json.observations.length);
    }
  })
  .catch((err) => console.error("Error:", err.message));
