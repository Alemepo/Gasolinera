const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const BACKEND_URL = "https://rutas-d6ev.onrender.com";

const map = L.map("map").setView([40.4168, -3.7038], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let userLocation = null;
let stations = [];
let currentRoute = null; // Variable para la ruta actual
let favorites = JSON.parse(localStorage.getItem("favorites")) || []; // Cargar favoritos de localStorage

// Cargar estaciones desde la API
async function loadStations() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    stations = data.ListaEESSPrecio;
    showStationsInRange(5, 1.50, "Precio Gasolina 95 E5");
  } catch (error) {
    console.error("Error al cargar las estaciones:", error.message);
    alert("No se pudieron cargar las estaciones de servicio.");
  }
}

// Mostrar estaciones dentro del rango
function showStationsInRange(radius, maxPrice, fuelType) {
  if (!userLocation) {
    alert("Ubicación del usuario no disponible.");
    return;
  }

  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  const [userLat, userLon] = userLocation;

  const filteredStations = stations.filter((station) => {
    try {
      const lat = parseFloat(station["Latitud"].replace(",", "."));
      const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
      const distance = haversineDistance(userLat, userLon, lat, lon);
      const price = parseFloat(station[fuelType]?.replace(",", "."));
      return distance <= radius && price <= maxPrice && !isNaN(price);
    } catch {
      return false;
    }
  });

  updateStationList(filteredStations, fuelType);

  filteredStations.forEach((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const address = station["Dirección"];

    L.marker([lat, lon]).addTo(map).bindPopup(`
      <strong>${name}</strong><br>
      Dirección: ${address}<br>
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
    `);
  });
}

// Actualizar lista de estaciones
function updateStationList(stations, fuelType) {
  const stationListDiv = document.getElementById("station-list");
  stationListDiv.innerHTML = "";

  stations.forEach((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const address = station["Dirección"];
    const municipality = station["Municipio"];
    const price = parseFloat(station[fuelType]?.replace(",", "."));
    const distance = haversineDistance(userLocation[0], userLocation[1], lat, lon);
    const isFavorite = favorites.some((fav) => fav.name === name && fav.address === address);

    const card = document.createElement("div");
    card.classList.add("station-card");
    card.innerHTML = `
      <h3>${name}</h3>
      <p><strong>Dirección:</strong> ${address}, ${municipality}</p>
      <p><strong>Distancia:</strong> ${distance.toFixed(2)} km</p>
      <p><strong>Precio:</strong> ${price.toFixed(2)} €</p>
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
      <button onclick="toggleFavorite('${name}', '${address}', ${lat}, ${lon})">
        ${isFavorite ? "Quitar de Favoritos" : "Agregar a Favoritos"}
      </button>
    `;
    stationListDiv.appendChild(card);
  });
}

// Alternar favoritos
function toggleFavorite(name, address, lat, lon) {
  const favoriteIndex = favorites.findIndex((fav) => fav.name === name && fav.address === address);

  if (favoriteIndex >= 0) {
    favorites.splice(favoriteIndex, 1); // Eliminar de favoritos
  } else {
    favorites.push({ name, address, lat, lon }); // Agregar a favoritos
  }

  localStorage.setItem("favorites", JSON.stringify(favorites)); // Guardar en localStorage
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);
  const fuelType = document.getElementById("fuelType").value;
  showStationsInRange(radius, maxPrice, fuelType); // Actualizar la lista
}

// Mostrar favoritos
function showFavorites() {
  updateStationList(favorites.map((fav) => ({
    "Rótulo": fav.name,
    "Dirección": fav.address,
    "Latitud": fav.lat.toString(),
    "Longitud (WGS84)": fav.lon.toString(),
    "Municipio": "",
  })), "Precio Gasolina 95 E5");
}

// Calcular distancia
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

// Mostrar ruta
async function showRouteToStation(lat, lon) {
  if (!userLocation) {
    alert("No se pudo obtener la ubicación del usuario.");
    return;
  }

  if (currentRoute) {
    map.removeLayer(currentRoute);
  }

  const [userLat, userLon] = userLocation;
  const points = [[userLat, userLon], [lat, lon]];
  currentRoute = L.polyline(points, { color: "blue", weight: 5 }).addTo(map);
  map.fitBounds(currentRoute.getBounds());
}

// Alternar modo claro/oscuro
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// Aplicar tema desde localStorage
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
}

// Obtener ubicación del usuario
navigator.geolocation.getCurrentPosition(
  (position) => {
    userLocation = [position.coords.latitude, position.coords.longitude];
    map.setView(userLocation, 14);
    L.marker(userLocation).addTo(map).bindPopup("Tu ubicación").openPopup();
    loadStations();
  },
  () => {
    alert("No se pudo obtener tu ubicación.");
    loadStations();
  }
);

// Manejar eventos
document.getElementById("filterStations").addEventListener("click", () => {
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);
  const fuelType = document.getElementById("fuelType").value;
  showStationsInRange(radius, maxPrice, fuelType);
});

document.getElementById("showFavorites").addEventListener("click", showFavorites);
document.getElementById("toggleTheme").addEventListener("click", toggleTheme);



