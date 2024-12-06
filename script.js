const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const ROUTE_API_URL = "https://maps.googleapis.com/maps/api/directions/json"; // URL de Google Maps Directions
const API_KEY = "AIzaSyB20Q9jR-kc39RpOgTxTztGtj3jUOOv1H8"; // Tu clave API de Google Maps

// Configuración inicial del mapa
const map = L.map("map").setView([40.4168, -3.7038], 12); // Centro en Madrid inicialmente
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Variables globales
let userLocation = null;
let stations = [];

// Obtener las estaciones de servicio
async function loadStations() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    stations = data.ListaEESSPrecio;
    console.log("Gasolineras cargadas:", stations.length);
  } catch (error) {
    console.error("Error al cargar los datos de las estaciones:", error);
    alert("No se pudieron cargar las gasolineras.");
  }
}

// Función para mostrar gasolineras filtradas
function showStationsInRange(radius, maxPrice) {
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && !layer.options.title) {
      map.removeLayer(layer); // Limpiar marcadores antiguos
    }
  });

  if (!userLocation) {
    alert("No se pudo obtener la ubicación del usuario.");
    return;
  }

  const [userLat, userLon] = userLocation;
  const stationList = [];

  stations.forEach((station) => {
    try {
      const lat = parseFloat(station["Latitud"].replace(",", "."));
      const lon = parseFloat(station["Longitud (WGS84)"].replace(",", "."));
      const distance = haversineDistance(userLat, userLon, lat, lon);
      const price95 = parseFloat(station["Precio Gasolina 95 E5"].replace(",", ".")) || 0;

      // Aplicar filtros: distancia y precio
      if (distance <= radius && price95 <= maxPrice) {
        const name = station["Rótulo"] || "Sin nombre";
        const address = station["Dirección"] || "Dirección desconocida";

        // Crear tarjeta de gasolinera
        stationList.push({ lat, lon, name, price95, distance });

        // Mostrar el marcador en el mapa
        const marker = L.marker([lat, lon]).addTo(map).bindPopup(`
          <div style="text-align: center;">
            <strong>${name}</strong><br>
            Dirección: ${address}<br>
            Precio Gasolina 95: <strong>${price95} €</strong><br>
            Distancia: ${distance.toFixed(2)} km
            <br><br>
            <button onclick="showRouteToStation(${lat}, ${lon})">Ver Ruta</button>
          </div>
        `);
      }
    } catch (err) {
      console.warn("Error procesando una estación:", err);
    }
  });

  // Mostrar las estaciones en la lista debajo del mapa
  updateStationList(stationList);
}

// Mostrar la lista de gasolineras filtradas
function updateStationList(stationList) {
  const stationListDiv = document.getElementById("station-list");
  stationListDiv.innerHTML = ""; // Limpiar la lista antes de llenarla

  stationList.forEach((station) => {
    const card = document.createElement("div");
    card.classList.add("station-card");
    card.innerHTML = `
      <h3>${station.name}</h3>
      <p>Precio Gasolina 95: ${station.price95} €</p>
      <p>Distancia: ${station.distance.toFixed(2)} km</p>
      <button onclick="showRouteToStation(${station.lat}, ${station.lon})">Ver Ruta</button>
    `;
    stationListDiv.appendChild(card);
  });
}

// Función para obtener la ruta desde la ubicación del usuario hasta la gasolinera seleccionada
async function showRouteToStation(stationLat, stationLon) {
  if (!userLocation) {
    alert("No se pudo obtener la ubicación del usuario.");
    return;
  }

  const [userLat, userLon] = userLocation;
  const routeUrl = `${ROUTE_API_URL}?origin=${userLat},${userLon}&destination=${stationLat},${stationLon}&key=${API_KEY}`;

  try {
    const response = await fetch(routeUrl);
    const data = await response.json();

    // Verificar si la respuesta contiene una ruta válida
    if (data.status === "OK" && data.routes.length > 0) {
      const route = data.routes[0].legs[0];
      const coords = route.steps.map(step => [
        step.end_location.lat,
        step.end_location.lng
      ]);

      // Añadir la ruta al mapa
      L.polyline(coords, { color: 'blue', weight: 5, opacity: 0.7 }).addTo(map);

      // Mostrar distancia y tiempo estimado
      const distance = route.distance / 1000; // km
      const duration = route.duration / 60; // minutos
      alert(`Distancia: ${distance.toFixed(2)} km\nTiempo estimado: ${duration.toFixed(0)} minutos`);
    } else {
      console.error("Error: No se encontró una ruta válida.");
      alert("No se pudo calcular la ruta. Respuesta de la API: " + JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error al obtener la ruta:", error);
    alert("Hubo un problema al calcular la ruta. Detalles del error: " + error.message);
  }
}

// Calcular la distancia entre dos puntos usando la fórmula Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
}

// Convertir grados a radianes
function toRad(value) {
  return (value * Math.PI) / 180;
}

// Obtener la ubicación del usuario
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    userLocation = [latitude, longitude];

    // Centrar el mapa en la ubicación del usuario
    map.setView(userLocation, 14);
    L.marker(userLocation, { title: "Tu ubicación" })
      .addTo(map)
      .bindPopup("<strong>Tu ubicación</strong>")
      .openPopup();

    // Cargar las estaciones después de obtener la ubicación
    loadStations();
  },
  (error) => {
    console.error("Error al obtener la ubicación del usuario:", error);
    alert("No se pudo obtener tu ubicación. Se mostrará el mapa centrado en Madrid.");
    loadStations();
  }
);

// Filtrar gasolineras al hacer clic en el botón
document.getElementById("filterStations").addEventListener("click", () => {
  const radius = parseFloat(document.getElementById("distance").value);
  const maxPrice = parseFloat(document.getElementById("price").value);

  if (isNaN(radius) || radius <= 0) {
    alert("Por favor, introduce un valor de distancia válido.");
    return;
  }

  if (isNaN(maxPrice) || maxPrice <= 0) {
    alert("Por favor, introduce un valor de precio válido.");
    return;
  }

  // Llamar a la función de filtrado
  showStationsInRange(radius, maxPrice);
});

