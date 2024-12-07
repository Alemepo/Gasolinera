const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const BACKEND_URL = "https://rutas-d6ev.onrender.com"; // URL de tu backend

const map = L.map("map").setView([40.4168, -3.7038], 12); // Centro en Madrid inicialmente
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let userLocation = null;
let userMarker = null; // Marcador persistente del usuario
let stations = []; // Lista global de estaciones

// Obtener la ubicación del usuario
navigator.geolocation.getCurrentPosition(
  (position) => {
    userLocation = [position.coords.latitude, position.coords.longitude];
    map.setView(userLocation, 14);

    // Agregar marcador persistente para la ubicación del usuario
    userMarker = L.marker(userLocation, { title: "Tu ubicación" })
      .addTo(map)
      .bindPopup("<strong>Tu ubicación</strong>")
      .openPopup();

    loadStations(); // Cargar estaciones después de obtener la ubicación
  },
  (error) => {
    console.error("Error al obtener la ubicación del usuario:", error.message);
    alert("No se pudo obtener tu ubicación. Se mostrará el mapa centrado en Madrid.");
    loadStations(); // Cargar estaciones aunque no se obtenga la ubicación
  }
);

// Cargar estaciones desde la API
async function loadStations() {
  try {
    console.log("Cargando estaciones de servicio...");
    const response = await fetch(API_URL);
    const data = await response.json();
    stations = data.ListaEESSPrecio;
    console.log(`Estaciones cargadas: ${stations.length}`);
    showStationsInRange(5, 1.50); // Mostrar rango inicial por defecto
  } catch (error) {
    console.error("Error al cargar las estaciones:", error.message);
    alert("No se pudieron cargar las estaciones de servicio. Intenta nuevamente más tarde.");
  }
}

// Mostrar estaciones dentro del rango especificado
function showStationsInRange(radius, maxPrice) {
  if (!userLocation) {
    alert("Ubicación del usuario no disponible.");
    return;
  }

  // Limpia marcadores, excepto el marcador del usuario
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && layer !== userMarker) map.removeLayer(layer);
  });

  const [userLat, userLon] = userLocation;

  const filteredStations = stations.filter((station) => {
    try {
      const lat = parseFloat(station["Latitud"].replace(",", "."));
      const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
      const distance = haversineDistance(userLat, userLon, lat, lon);
      const price95 = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));

      // Validar valores válidos antes de filtrar
      if (!isNaN(lat) && !isNaN(lon) && !isNaN(price95)) {
        return distance <= radius && price95 <= maxPrice;
      } else {
        console.warn(`Gasolinera inválida ignorada: ${station["Rótulo"]}`);
        return false;
      }
    } catch (error) {
      console.error("Error procesando una estación:", error.message);
      return false;
    }
  });

  console.log(`Estaciones filtradas: ${filteredStations.length}`);
  updateStationList(filteredStations);

  filteredStations.forEach((station) => {
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

// Actualizar la lista de estaciones
function updateStationList(stations) {
  const stationListDiv = document.getElementById("station-list");
  stationListDiv.innerHTML = ""; // Limpiar lista

  stations.forEach((station) => {
    const lat = parseFloat(station["Latitud"].replace(",", "."));
    const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
    const name = station["Rótulo"];
    const price95 = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));

    const card = document.createElement("div");
    card.classList.add("station-card");
    card.innerHTML = `
      <h3>${name}</h3>
      <p>Precio Gasolina 95: ${price95.toFixed(2)} €</p>
      <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
    `;
    stationListDiv.appendChild(card);
  });
}

// Mostrar la ruta hacia una estación seleccionada
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
    const polyline = L.polyline(decodePolyline(points), { color: "blue", weight: 5 }).addTo(map);

    const distance = data.routes[0].legs[0].distance.text;
    const duration = data.routes[0].legs[0].duration.text;
    alert(`Distancia: ${distance}\nDuración: ${duration}`);
  } catch (error) {
    console.error("Error al obtener la ruta:", error.message);
    alert("Hubo un problema al calcular la ruta.");
  }
}

// Decodificar polyline
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

// Calcular distancia entre dos puntos
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





