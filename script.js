const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const BACKEND_URL = "https://rutas-d6ev.onrender.com"; // URL de tu backend

// Configuración inicial del mapa
const map = L.map("map").setView([40.4168, -3.7038], 12); // Centro inicial en Madrid
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let userLocation = null;
let userMarker = null; // Para el marcador de la ubicación del usuario
let stations = []; // Lista global de estaciones

// Obtener la ubicación del usuario
navigator.geolocation.getCurrentPosition(
  (position) => {
    userLocation = [position.coords.latitude, position.coords.longitude];
    map.setView(userLocation, 14);

    // Crear marcador persistente para la ubicación del usuario
    userMarker = L.marker(userLocation, { title: "Tu ubicación" })
      .addTo(map)
      .bindPopup("<strong>Tu ubicación</strong>")
      .openPopup();

    // Cargar estaciones una vez que tengamos la ubicación
    loadStations();
  },
  (error) => {
    console.error("Error al obtener la ubicación del usuario:", error.message);
    alert("No se pudo obtener tu ubicación. Se mostrará el mapa centrado en Madrid.");
    loadStations(); // Cargar estaciones incluso si no se obtiene la ubicación
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
    showStationsInRange(5, 1.50); // Mostrar estaciones por defecto
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

  // Limpia todos los marcadores, excepto el del usuario
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && layer !== userMarker) map.removeLayer(layer);
  });

  const [userLat, userLon] = userLocation;

  // Filtrar estaciones con datos válidos
  const filteredStations = stations.filter((station) => {
    try {
      const lat = parseFloat(station["Latitud"].replace(",", "."));
      const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
      const price95 = parseFloat(station["Precio Gasolina 95 E5"].replace(",", "."));
      const distance = haversineDistance(userLat, userLon, lat, lon);

      // Mostrar depuración de cada gasolinera
      console.log(
        `Procesando estación: ${station["Rótulo"]} | Distancia: ${distance.toFixed(
          2
        )} km | Precio: ${price95} €`
      );

      // Validar coordenadas, precios y distancia
      if (isNaN(lat) || isNaN(lon) || isNaN(price95)) {
        console.warn(`Estación inválida ignorada: ${station["Rótulo"]}`);
        return false;
      }

      return distance <= radius && price95 <= maxPrice;
    } catch (error) {
      console.warn("Error procesando una estación:", error.message);
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

// Actualizar la lista de estaciones en la parte inferior
function updateStationList(stations) {
  const stationListDiv = document.getElementById("station-list");
  stationListDiv.innerHTML = ""; // Limpiar la lista

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

// Filtrar gasolineras al hacer clic en el botón
document.getElementById("filterStations").addEventListener("click", () => {
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);
  showStationsInRange(radius, maxPrice);
});


