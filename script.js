const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const BACKEND_URL = "https://rutas-d6ev.onrender.com";

const map = L.map("map").setView([40.4168, -3.7038], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let userLocation = null;
let stations = [];

// Cargar estaciones desde la API
async function loadStations() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    stations = data.ListaEESSPrecio;
    showStationsInRange(5, 1.50);
  } catch (error) {
    console.error("Error al cargar las estaciones:", error.message);
    alert("No se pudieron cargar las estaciones de servicio.");
  }
}

// Ordenar estaciones
function sortStations(stations, sortBy, userLat, userLon) {
  return stations.sort((a, b) => {
    const latA = parseFloat(a["Latitud"].replace(",", "."));
    const lonA = parseFloat(a["Longitud (WGS84)"].replace(",", "."));
    const latB = parseFloat(b["Latitud"].replace(",", "."));
    const lonB = parseFloat(b["Longitud (WGS84)"].replace(",", "."));

    const distanceA = haversineDistance(userLat, userLon, latA, lonA);
    const distanceB = haversineDistance(userLat, userLon, latB, lonB);

    const priceA = parseFloat(a["Precio Gasolina 95 E5"].replace(",", "."));
    const priceB = parseFloat(b["Precio Gasolina 95 E5"].replace(",", "."));

    if (sortBy === "nearest-cheapest") {
      if (distanceA === distanceB) return priceA - priceB;
      return distanceA - distanceB;
    } else if (sortBy === "cheapest") {
      return priceA - priceB;
    }
  });
}

// Mostrar estaciones dentro del rango
function showStationsInRange(radius, maxPrice) {
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
      const price95 = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));
      return distance <= radius && price95 <= maxPrice;
    } catch {
      return false;
    }
  });

  const sortCriteria = document.getElementById("sortCriteria").value;
  const sortedStations = sortStations(filteredStations, sortCriteria, userLat, userLon);

  updateStationList(sortedStations);

  sortedStations.forEach((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const address = station["Dirección"];
    const price = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));

    L.marker([lat, lon]).addTo(map).bindPopup(`
      <strong>${name}</strong><br>
      Dirección: ${address}<br>
      Precio Gasolina 95: <strong>${price.toFixed(2)} €</strong><br>
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
    `);
  });
}

// Actualizar lista de estaciones
function updateStationList(stations) {
  const stationListDiv = document.getElementById("station-list");
  stationListDiv.innerHTML = "";

  stations.forEach((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const address = station["Dirección"];
    const municipality = station["Municipio"];
    const province = station["Provincia"];
    const schedule = station["Horario"];
    const price95 = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));
    const distance = haversineDistance(userLocation[0], userLocation[1], lat, lon);

    const card = document.createElement("div");
    card.classList.add("station-card");
    card.innerHTML = `
      <h3>${name}</h3>
      <p><strong>Dirección:</strong> ${address}, ${municipality}, ${province}</p>
      <p><strong>Horario:</strong> ${schedule}</p>
      <p><strong>Distancia:</strong> ${distance.toFixed(2)} km</p>
      <p><strong>Precio Gasolina 95:</strong> ${price95.toFixed(2)} €</p>
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
    `;
    stationListDiv.appendChild(card);
  });
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
  if (!userLocation) return;
  alert("Aquí mostraríamos la ruta a la gasolinera seleccionada.");
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

document.getElementById("filterStations").addEventListener("click", () => {
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);
  showStationsInRange(radius, maxPrice);
});

document.getElementById("sortCriteria").addEventListener("change", () => {
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);
  showStationsInRange(radius, maxPrice);
});



