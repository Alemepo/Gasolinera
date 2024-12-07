const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const BACKEND_URL = "https://rutas-d6ev.onrender.com"; // Tu URL pública del backend

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

  showStationsInRange(radius, maxPrice);
});

navigator.geolocation.getCurrentPosition(
  (position) => {
    userLocation = [position.coords.latitude, position.coords.longitude];
    console.log("Ubicación del usuario:", userLocation);
    map.setView(userLocation, 12); // Centra el mapa
    loadStations(); // Carga las estaciones
  },
  (error) => {
    console.error("Error al obtener la ubicación:", error.message);
    alert("No se pudo obtener tu ubicación. Habilita la geolocalización.");
  }
);

async function loadStations() {
  try {
    console.log("Cargando estaciones de servicio...");
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Error al cargar estaciones.");
    const data = await response.json();

    if (!data.ListaEESSPrecio) {
      throw new Error("Datos de estaciones no válidos.");
    }

    stations = data.ListaEESSPrecio;
    console.log("Estaciones cargadas:", stations.length);
    showStationsInRange(5, 1.50); // Mostrar gasolineras dentro de un rango por defecto
  } catch (error) {
    console.error("Error al cargar estaciones:", error.message);
    alert("No se pudieron cargar las estaciones de servicio. Intenta nuevamente más tarde.");
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
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
    `);
  });

  updateStationList(filteredStations);
}

function updateStationList(stations) {
  const listDiv = document.getElementById("station-list");
  listDiv.innerHTML = ""; // Limpia la lista antes de actualizarla

  stations.forEach((station) => {
    const card = document.createElement("div");
    card.classList.add("station-card");

    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const price = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));

    card.innerHTML = `
      <h3>${name}</h3>
      <p>Precio: ${price.toFixed(2)} €</p>
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
    `;
    listDiv.appendChild(card);
  });
}

async function showRouteToStation(lat, lon) {
  if (!userLocation) {
    alert("No se pudo obtener la ubicación del usuario.");
    return;
  }

  const [userLat, userLon] = userLocation;
  const routeUrl = `${BACKEND_URL}/directions?origin=${userLat},${userLon}&destination=${lat},${lon}`;

  try {
    const response = await fetch(routeUrl);
    if (!response.ok) throw new Error("Error al obtener la ruta del backend.");

    const data = await response.json();

    const points = data.routes[0].overview_polyline.points;
    const polyline = L.polyline(decodePolyline(points), { color: "blue" }).addTo(map);

    const distance = data.routes[0].legs[0].distance.text;
    const duration = data.routes[0].legs[0].duration.text;
    alert(`Distancia: ${distance}\nDuración: ${duration}`);
  } catch (error) {
    console.error("Error al obtener la ruta:", error);
    alert("Hubo un problema al calcular la ruta.");
  }
}

function decodePolyline(encoded) {
  let points = [];
  let index = 0,
    lat = 0,
    lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lat2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}


