Lo primero aclarar que cuando le das al boton " ver ruta " tardará unos minutos con la primera solicitud, una vez cargada el resto de solicitudes irán como un tiro.
Me gustaría añadir nuevas cosas y funcionalidades, quizas cuando leas esto no esten todavía, pero lo que entrego ahora mismo lo veo basntante completo, sobretodo el como he conseguido saltarme el filtro del cors. ( explicado abajo ).

A continuacion mi proyecto. en el proyecto te pedirá tu ubicacion actual y mediante los filtros podremos añadir a los km que queremos que nos marque las gasolineras que tenemos a esa distancia de nuestra posicion. tambien podemos pedir que nos ordene por gasolinera mas barata y por gasolinera mas barata/distancia.
Despues podemos darle a ver ruta y nos dirá la distancia que hay en coche desde nuestra ubicación ( la primera vez que le demos a ver ruta tardará unos minutos en cargar ).
Si le damos a ver ruta de una nueva gasolinera, se borrará la anterior petición y se sutituirá la línea que marca la ruta.
Si acercamos el raton donde los cuadros donde sale la informacion completa de cada gasolinera, el cuadro hace un pelin de zoom para que sea mas agradable y si lo pones encima de " ver ruta " hace mas zoom



1. Archivo Styles.css (Estilos CSS)

controls: Define el diseño de los controles (inputs, botones, y etiquetas) en la parte superior de la página. Se utilizan para que el usuario filtre las estaciones de gasolineras según la distancia y el precio.
Añadimos : 
- Más redondeo de bordes (border-radius).
- Sombras (box-shadow) para un efecto más moderno.
- Efecto de hover (transformación y cambio de color) en los botones.
  
map: Define el diseño del contenedor del mapa interactivo.
- Añadimos un borde, sombras y espaciados. 
- station-list y station-card: Controlan cómo se muestran las tarjetas de las gasolineras en la lista.
Añadimos:
-Efectos de hover y sombras para que las tarjetas tengan una sensación de elevación al pasar el ratón.
-Bordes redondeados y espaciados.

Responsive Design: Se añadió soporte para dispositivos móviles mediante media queries:
- En pantallas pequeñas, los controles se reorganizan verticalmente.
- El mapa y la lista de gasolineras ajustan su tamaño.

2. Archivo index.html (Estructura HTML)

Lo que hace:
Encabezado <head>:
- Incluye los enlaces a las librerías externas (Leaflet.js y su CSS).
- Vincula el archivo de estilos Styles.css.
  
Cuerpo <body>:
- Controles: Inputs para rango de distancia, precio máximo y orden.
- Mapa: Un contenedor <div id="map"> donde se renderiza el mapa interactivo con Leaflet.
- Lista de estaciones: Un contenedor <div id="station-list"> que muestra las tarjetas de las estaciones.
  
Script externo: Se incluye el archivo script.js que contiene toda la lógica interactiva.


3. Archivo script.js (Lógica JavaScript)


Componentes clave:
1 Mapa interactivo con Leaflet.js:

-Configura un mapa centrado en coordenadas predefinidas ([40.4168, -3.7038], Madrid).
-Añade una capa base de OpenStreetMap.
-Integra un marcador personalizado para la ubicación del usuario.
-Cambio realizado: Añadimos un ícono diferente (userIcon) para diferenciarlo de los marcadores de gasolineras.

2. Cargar estaciones desde la API:
- Llama a la API oficial de estaciones de servicio en España (API_URL) para obtener datos de las gasolineras.
Cambio realizado:
- Se manejaron errores en caso de que la API falle.
- 
3. Filtrar y ordenar estaciones:

- Filtrado: Calcula qué estaciones están dentro del rango de distancia y precio especificado por el usuario.
- Ordenamiento: Clasifica las estaciones por cercanía o precio, dependiendo de la selección del usuario.
- 
4. Renderizar estaciones en el mapa y lista:

Mapa:
-Limpia los marcadores existentes (excepto el del usuario).
-Añade nuevos marcadores para las estaciones que cumplen los criterios de filtro.
Lista:
-Genera dinámicamente tarjetas HTML con los detalles de cada estación.
-Incluye un botón en cada tarjeta para calcular una ruta hacia esa estación.
-Cambio realizado: Mejoramos el diseño de las tarjetas en el CSS.

5. Cálculo de rutas:
   
-Llama al backend (BACKEND_URL) para obtener la ruta entre la ubicación del usuario y la estación seleccionada.
-Dibuja la ruta en el mapa usando Leaflet.

6. Geolocalización del usuario:

-Usa la API de geolocalización del navegador para obtener la ubicación del usuario.
-Centra el mapa en la ubicación del usuario y coloca un marcador con el ícono personalizado.


Decir que mi idea principal era hacerlo sobre playas, accidentes de trafico etc, pero el CORS (  mecanismo de seguridad implementado en los navegadores modernos para proteger a los usuarios)
bloqueaba todo el acceso y me era imposible por más que probara cosas. La cosa es que una vez tenia ya mi web creada tuve dos dudas.
La primera era que si queria que la ruta se viese en mi pagina web o queria que saltara un enlace a google maps ( esto era mucho mas sencillo )
y dos cual llevar a cabo.
me decidí por que en mi misma pagina web se marcase la ruta. pero me topé de nuevo con un dilema del cors por lo que me tocó investigar.
Despues de unas horas vi que necesitaba una api de rutas ( me tocó crearme cuenta en google y dar datos etc para que me diese una ) y crear un backend que actuase como intermediario.
 ¿Qué hace exactamente el backend en este caso?
En mi proyecto, el backend tiene la siguiente lógica:

Recibe una solicitud del frontend:
El frontend envía una solicitud HTTP a la ruta /directions con los parámetros origin (ubicación del usuario) y destination (coordenadas de la gasolinera seleccionada).
Llama a la API de Google Directions:
El backend toma los parámetros recibidos y los reenvía a la API de Google Directions junto con la clave de API.
Devuelve los datos al frontend:
Una vez que obtiene la respuesta de Google, el backend la reenvía al frontend.
Como el navegador ahora se comunica solo con el backend, no hay problemas de CORS.
Todo esto lo creé en " https://render.com/ " . y por eso he tenido que crear otro repositorio " https://github.com/Alemepo/Rutas "
y ahí encontraremos.

1. Archivo package.json (Configuración de dependencias)
Este archivo es utilizado por Node.js para definir las dependencias necesarias para mi backend.

Dependencias:
- express: Framework de Node.js para manejar rutas y servidores.
- node-fetch: Para hacer peticiones HTTP a la API de Google Directions.
- cors: Habilita solicitudes entre dominios desde tu frontend al backend.

2. Archivo server.js (Backend en Node.js)
Este archivo implementa un backend simple que actúa como un proxy para la API de Google Directions.

Lo que hace:
1 Define un servidor usando express.
2 Expone una ruta /directions:
-Recibe los parámetros origin (ubicación del usuario) y destination (coordenadas de la estación).
-Llama a la API de Google Directions para obtener los datos de la ruta.
-Devuelve los datos al frontend.
3 Manejo de errores:
-Verifica que los parámetros origin y destination estén presentes.
-Maneja errores si la API de Google Directions falla o devuelve un error.


Conclusión. 
tuve varios problemas con el tema de manterner el marcador de mi ubicación cuando se filtraban los de la gasolinera.
solucióne el problema haciendo que no se borrase al filtrar capas con lo de rastrear los km de gasolineras.
el mayor problema fue el reto de conseguir filtrar el cors ( explicado más arriba )
Escogí varias api. la de google maps ( para las rutas )
la de minetur ( para las gasolineras ) 
la de Node.js ( para hacer el backend ) 

A pesar de que creó que puedo añadir nuevas funcionalidades como digo al principio ( como añadir a favoritos algunas gasolineras ) y algunas tonterias visuales más. voy algo justo de tiempo con todos los examenes finales
y el tema de solucionar el cors ya me llevo como 6h solucionar todo eso y enlazarlo al github y que funcionase con la api de google.
Creo que un 8/9 sería bastante justo solo por el tema de cors, ya que dudo que ningun compañero haya conseguido trazar la ruta sin hacer que se vaya a un navegador externo. Ademas creo que visualmente no es agradable.



