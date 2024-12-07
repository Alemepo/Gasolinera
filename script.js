const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const ROUTE_API_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const API_KEY = "5b3ce3597851110001cf6248b48e1e3a23e64a9b02e19cd97b30b2e498d00b53";

const map = L.map("map").setView([40.4168, -3.7038], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let userLocation = null;
let stations = [];

document.getElementById("filterStations").addEventListener("click", () => {
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);
  
  if (isNaN(radius) || radius <= 0 || isNaN(maxPrice) || maxPrice <= 0) {
    alert("Por favor, introduce valores válidos.");
    return;
  }

  showLoading(true);
  showStationsInRange(radius, maxPrice);
  showLoading(false);
});

function showLoading(show) {
  const spinner = document.getElementById("loading-spinner");
  if (show) {
    spinner.classList.remove("hidden");
  } else {
    spinner.classList.add("hidden");
  }
}

async function loadStations() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    stations = data.ListaEESSPrecio;
    showStationsInRange(5, 1.50);
  } catch (error) {
    console.error("Error al cargar gasolineras:", error);
    alert("No se pudieron cargar las gasolineras.");
  }
}

function showStationsInRange(radius, maxPrice) {
  if (!userLocation) {
    alert("Ubicación del usuario no disponible.");
    return;
  }

  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && !layer.options.title) map.removeLayer(layer);
  });

  const [userLat, userLon] = userLocation;
  const filteredStations = stations.filter((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const distance = haversineDistance(userLat, userLon, lat, lon);
    const price = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));
    return distance <= radius && price <= maxPrice;
  });

  filteredStations.forEach((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const address = station["Dirección"];
    const price = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));

    L.marker([lat, lon]).addTo(map).bindPopup(`
      <strong>${name}</strong><br>
      Dirección: ${address}<br>
      Precio: ${price.toFixed(2)} €<br>
    `);
  });

  updateStationList(filteredStations);
}

function updateStationList(stations) {
  const listDiv = document.getElementById("station-list");
  listDiv.innerHTML = "";

  stations.forEach((station) => {
    const card = document.createElement("div");
    card.classList.add("station-card");
    card.innerHTML = `
      <h3>${station["Rótulo"]}</h3>
      <p>Precio: ${parseFloat(station["Precio Gasolina 95 E5"]).toFixed(2)} €</p>
    `;
    listDiv.appendChild(card);
  });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

navigator.geolocation.getCurrentPosition((position) => {
  userLocation = [position.coords.latitude, position.coords.longitude];
  map.setView(userLocation, 12);
  loadStations();
});




