// Módulo para el mapa de focos de calor (NASA FIRMS)
const FireMap = (() => {
  let map = null;
  let markersLayer = null;
  let updateInterval = null;
  let mapInitialized = false;

  // Coordenadas centrales y bbox para El Bolsón y alrededores
  const CENTER = [-41.96, -71.53];
  const ZOOM = 9;
  const BBOX = '-72.5,-43.0,-70.5,-41.0'; // west,south,east,north

  // Clave API de NASA FIRMS
  const FIRMS_MAP_KEY = 'e439142c870bf7e2c39d07464f2a11be'; // ¡REEMPLAZA ESTO CON TU CLAVE!

  // Fuente de datos: VIIRS (Suomi-NPP) - 375m de resolución
  const FIRMS_SOURCE = 'VIIRS_SNPP_NRT';

  // Colores según el nivel de confianza
  const CONFIDENCE_COLORS = {
    'h': '#e74c3c', // Rojo intenso para alta confianza
    'n': '#f39c12', // Naranja para confianza nominal
    'l': '#f1c40f'  // Amarillo para baja confianza
  };

  // Inicializa el mapa de Leaflet
  function init() {
    const mapContainer = document.getElementById('fire-map');
    if (!mapContainer) return;

    // Crear el mapa
    map = L.map('fire-map', {
      center: CENTER,
      zoom: ZOOM,
      zoomControl: true,
      attributionControl: true
    });

    // Añadir capa de tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Capa para los marcadores de focos de calor
    markersLayer = L.layerGroup().addTo(map);

    mapInitialized = true;
    updateFireMap();
  }

  // Consulta la API de NASA FIRMS
  async function fetchFireData() {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/${FIRMS_SOURCE}/${BBOX}/1`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const csvText = await response.text();
      return parseCSV(csvText);
    } catch (error) {
      console.error('Error obteniendo datos de FIRMS:', error);
      throw error;
    }
  }

  // Parsea el CSV de respuesta de FIRMS
  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    // La primera línea son los encabezados
    const headers = lines[0].split(',');
    const latIndex = headers.indexOf('latitude');
    const lonIndex = headers.indexOf('longitude');
    const brightIndex = headers.indexOf('bright_ti4'); // VIIRS usa bright_ti4
    const dateIndex = headers.indexOf('acq_date');
    const timeIndex = headers.indexOf('acq_time');
    const satIndex = headers.indexOf('satellite');
    const confIndex = headers.indexOf('confidence');
    const frpIndex = headers.indexOf('frp');

    const fires = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      fires.push({
        lat: parseFloat(values[latIndex]),
        lon: parseFloat(values[lonIndex]),
        brightness: parseFloat(values[brightIndex]),
        date: values[dateIndex],
        time: values[timeIndex],
        satellite: values[satIndex],
        confidence: values[confIndex],
        frp: parseFloat(values[frpIndex]) || 0
      });
    }
    
    return fires;
  }

  // Actualiza los marcadores en el mapa
  async function updateFireMap() {
    const statusEl = document.getElementById('fire-map-status');
    if (!mapInitialized || !markersLayer) return;

    if (statusEl) statusEl.textContent = 'Actualizando focos de calor…';

    try {
      const fires = await fetchFireData();
      
      // Limpiar capa anterior
      markersLayer.clearLayers();
      
      if (fires.length === 0) {
        if (statusEl) statusEl.textContent = 'No se detectaron focos de calor en las últimas 24 horas.';
        return;
      }

      // Añadir marcadores
      fires.forEach(fire => {
        const color = CONFIDENCE_COLORS[fire.confidence] || CONFIDENCE_COLORS['n'];
        
        const marker = L.circleMarker([fire.lat, fire.lon], {
          radius: 6 + Math.min(fire.frp / 10, 8), // Tamaño según FRP
          fillColor: color,
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });

        // Formatear la hora (acq_time viene como HHMM sin ceros a la izquierda)
        const timeStr = String(fire.time).padStart(4, '0');
        const hour = timeStr.slice(0, 2);
        const minute = timeStr.slice(2, 4);
        
        const popupContent = `
          <strong>Foco de calor detectado</strong><br>
          <b>Fecha:</b> ${fire.date} ${hour}:${minute} UTC<br>
          <b>Satélite:</b> ${fire.satellite}<br>
          <b>Confianza:</b> ${fire.confidence === 'h' ? 'Alta' : fire.confidence === 'n' ? 'Nominal' : 'Baja'}<br>
          <b>FRP:</b> ${fire.frp.toFixed(1)} MW<br>
          <b>Coordenadas:</b> ${fire.lat.toFixed(4)}, ${fire.lon.toFixed(4)}
        `;

        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
      });

      if (statusEl) statusEl.textContent = `${fires.length} foco(s) de calor detectado(s) en las últimas 24 h.`;
      
    } catch (error) {
      if (statusEl) statusEl.textContent = `Error al obtener datos: ${error.message}`;
    }
  }

  // Inicia la actualización periódica
  function startAutoUpdate() {
    // Actualizar cada 30 minutos
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateFireMap, 30 * 60 * 1000);
  }

  // Detiene la actualización periódica
  function stopAutoUpdate() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  // Redimensiona el mapa (útil cuando se cambia de pestaña)
  function invalidateSize() {
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }

  return {
    init,
    updateFireMap,
    startAutoUpdate,
    stopAutoUpdate,
    invalidateSize
  };
})();