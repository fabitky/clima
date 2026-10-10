// Módulo autocontenido de Emergencia Ígnea
// Fuente: NASA FIRMS + Open-Meteo (viento) + SNMF (reporte PDF) + Leaflet (local)
const FireEmergency = (() => {

  // ==========================================
  // CONFIGURACIÓN
  // ==========================================
  const FIRMS_MAP_KEY = 'e439142c870bf7e2c39d07464f2a11be';
  const FIRMS_SOURCE = 'VIIRS_SNPP_NRT';
  const BBOX = '-72.5,-43.0,-70.5,-41.0';
  const CENTER = { lat: -41.96, lon: -71.53 };
  const INITIAL_ZOOM = 9;
  const CACHE_MS = 30 * 60 * 1000;
  const CACHE_VIENTO_MS = 30 * 60 * 1000;

  const WMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/';
  const WMS_LAYER_TYPE = 'time_since_detection_4';
  const WMS_LAYER_NAME = 'tsd_4_viirs_all';

  const VIENTO_LATS = [-42.8, -42.4, -42.0, -41.6, -41.2];
  const VIENTO_LONS = [-72.4, -71.9, -71.4, -70.9, -70.4];

  // SNMF
  const MESES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const MESES_LABEL = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const SNMF_STORE = 'historical';
  const SNMF_PREFIX = 'snmf_';

  let cacheFocos = { data: null, ts: 0 };
  let cacheViento = { data: null, ts: 0 };

  let mapa = null;
  let capaFocos = null;
  let capaWMS = null;
  let capaViento = null;
  let wmsActiva = false;
  let vientoActivo = false;
  let leafletCargando = null;
  let mapaInicializado = false;

  let snmfBlobUrl = null;

  // ==========================================
  // CLASIFICACIÓN POR FRP
  // ==========================================
  function clasificarFRP(frp) {
    if (frp == null || isNaN(frp)) {
      return { nivel: 0, label: 'Sin datos', color: '#8fa8ba', radioMapa: 6, tamanoLista: 30 };
    }
    if (frp < 5) {
      return { nivel: 1, label: 'Débil', color: '#2ecc71', radioMapa: 6, tamanoLista: 30 };
    }
    if (frp < 20) {
      const t = (frp - 5) / 15;
      return { nivel: 2, label: 'Moderado', color: '#f1c40f', radioMapa: Math.round(9 + t * 3), tamanoLista: 33 };
    }
    if (frp < 50) {
      const t = (frp - 20) / 30;
      return { nivel: 3, label: 'Intenso', color: '#f39c12', radioMapa: Math.round(13 + t * 4), tamanoLista: 37 };
    }
    const t = Math.min((frp - 50) / 100, 1);
    return { nivel: 4, label: 'Muy intenso', color: '#e74c3c', radioMapa: Math.round(18 + t * 4), tamanoLista: 42 };
  }

  // ==========================================
  // CARGA DINÁMICA DE LEAFLET
  // ==========================================
  function cargarLeaflet() {
    if (typeof L !== 'undefined' && L.map) return Promise.resolve();
    if (leafletCargando) return leafletCargando;

    leafletCargando = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './leaflet/leaflet.css';
      link.onerror = () => reject(new Error('No se pudo cargar el CSS de Leaflet'));
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = './leaflet/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (typeof L !== 'undefined' && L.map) resolve();
        else reject(new Error('Leaflet no se inicializó correctamente'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar el JS de Leaflet'));
      document.body.appendChild(script);
    });

    return leafletCargando;
  }

  // ==========================================
  // UTILIDADES
  // ==========================================
  function distanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function direccionDesde(lat, lon) {
    const dLat = lat - CENTER.lat;
    const dLon = lon - CENTER.lon;
    if (Math.abs(dLat) < 0.001 && Math.abs(dLon) < 0.001) return '—';
    const ang = Math.atan2(dLon, dLat) * 180 / Math.PI;
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    const idx = Math.round(((ang % 360) + 360) % 360 / 45) % 8;
    return dirs[idx];
  }

  function fmtHora(t) {
    const s = String(t).padStart(4, '0');
    return s.slice(0, 2) + ':' + s.slice(2, 4);
  }

  function fmtFecha(f) {
    if (!f) return '';
    const [a, m, d] = f.split('-');
    return `${d}/${m}`;
  }

  function fmtBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ==========================================
  // CONSULTA A FIRMS
  // ==========================================
  async function fetchFocos() {
    const ahora = Date.now();
    if (cacheFocos.data && (ahora - cacheFocos.ts) < CACHE_MS) {
      return cacheFocos.data;
    }

    if (!FIRMS_MAP_KEY || FIRMS_MAP_KEY === 'TU_API_KEY_AQUI') {
      throw new Error('Falta configurar la API key de FIRMS');
    }

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/${FIRMS_SOURCE}/${BBOX}/1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);

    const csv = await r.text();
    const focos = parseCSV(csv);

    cacheFocos.data = focos;
    cacheFocos.ts = ahora;
    return focos;
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const idx = {};
    headers.forEach((h, i) => { idx[h] = i; });

    const focos = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      if (c.length < headers.length) continue;

      const lat = parseFloat(c[idx.latitude]);
      const lon = parseFloat(c[idx.longitude]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const frp = parseFloat(c[idx.frp]) || 0;
      const clasif = clasificarFRP(frp);

      focos.push({
        lat, lon,
        bright: parseFloat(c[idx.bright_ti4]) || null,
        fecha: c[idx.acq_date] || '',
        hora: c[idx.acq_time] || '',
        satelite: c[idx.satellite] || '?',
        confianza: (c[idx.confidence] || 'n').toLowerCase(),
        frp, clasif,
        distancia: distanciaKm(CENTER.lat, CENTER.lon, lat, lon),
        direccion: direccionDesde(lat, lon)
      });
    }

    focos.sort((a, b) => a.distancia - b.distancia);
    return focos;
  }

  // ==========================================
  // CONSULTA A OPEN-METEO (viento)
  // ==========================================
  async function fetchViento() {
    const ahora = Date.now();
    if (cacheViento.data && (ahora - cacheViento.ts) < CACHE_VIENTO_MS) {
      return cacheViento.data;
    }

    const lats = [], lons = [];
    for (let i = 0; i < VIENTO_LATS.length; i++) {
      for (let j = 0; j < VIENTO_LONS.length; j++) {
        lats.push(VIENTO_LATS[i]);
        lons.push(VIENTO_LONS[j]);
      }
    }

    const params = new URLSearchParams({
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: 'wind_speed_10m,wind_direction_10m',
      forecast_days: '1',
      timezone: 'America/Argentina/Salta'
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);

    const json = await r.json();
    const arr = Array.isArray(json) ? json : [json];
    const horaActual = new Date().getHours();

    const puntos = arr.map(lugar => {
      const idx = lugar.hourly.time.findIndex(t => new Date(t).getHours() === horaActual);
      const i = idx >= 0 ? idx : 0;
      return {
        lat: lugar.latitude,
        lon: lugar.longitude,
        viento: lugar.hourly.wind_speed_10m[i],
        direccion: lugar.hourly.wind_direction_10m[i]
      };
    });

    cacheViento.data = puntos;
    cacheViento.ts = ahora;
    return puntos;
  }

  // ==========================================
  // RENDER: RESUMEN
  // ==========================================
  function renderResumen(focos) {
    const cont = document.getElementById('fire-resumen');
    if (!cont) return;

    if (!focos.length) {
      cont.innerHTML = '';
      return;
    }

    const cercano = focos[0];
    const masReciente = [...focos].sort((a, b) => {
      const ka = a.fecha + String(a.hora).padStart(4, '0');
      const kb = b.fecha + String(b.hora).padStart(4, '0');
      return kb.localeCompare(ka);
    })[0];
    const masIntenso = [...focos].sort((a, b) => b.frp - a.frp)[0];

    cont.innerHTML = `
      <div class="fire-resumen-item">
        <span class="fri-lbl">Focos detectados</span>
        <span class="fri-val">${focos.length}</span>
        <span class="fri-sub">últimas 24 h</span>
      </div>
      <div class="fire-resumen-item">
        <span class="fri-lbl">Más cercano</span>
        <span class="fri-val">${cercano.distancia < 10 ? cercano.distancia.toFixed(1) : Math.round(cercano.distancia)} km</span>
        <span class="fri-sub">al ${cercano.direccion} · ${cercano.clasif.label}</span>
      </div>
      <div class="fire-resumen-item">
        <span class="fri-lbl">Más intenso</span>
        <span class="fri-val" style="color:${masIntenso.clasif.color}">${masIntenso.frp.toFixed(0)} MW</span>
        <span class="fri-sub">${masIntenso.clasif.label}</span>
      </div>
    `;
  }

  // ==========================================
  // RENDER: LISTA
  // ==========================================
  function renderLista(focos) {
    const cont = document.getElementById('fire-listado');
    if (!cont) return;

    if (!focos.length) {
      cont.innerHTML = `
        <div class="fire-empty">
          <span class="fire-empty-icon">✅</span>
          <p>No se detectaron focos de calor en las últimas 24 horas en la zona.</p>
          <span class="fire-empty-sub">Fuente: NASA FIRMS · VIIRS · Actualizado cada 30 min</span>
        </div>
      `;
      return;
    }

    cont.innerHTML = focos.map((f, i) => {
      const confClase = f.confianza === 'h' ? 'high' : f.confianza === 'l' ? 'low' : 'nominal';
      const confTxt = f.confianza === 'h' ? 'Alta' : f.confianza === 'l' ? 'Baja' : 'Nominal';
      const distTxt = f.distancia < 10 ? f.distancia.toFixed(1) + ' km' : Math.round(f.distancia) + ' km';
      const bgColor = f.clasif.color;
      const tamano = f.clasif.tamanoLista;
      const colorTexto = f.clasif.nivel >= 3 ? '#fff' : '#06202e';

      return `<div class="fire-item" data-idx="${i}">
        <div class="fire-marker-frp" style="width:${tamano}px;height:${tamano}px;background:${bgColor};color:${colorTexto};font-size:${Math.round(tamano * 0.42)}px">${i + 1}</div>
        <div class="fire-item-body">
          <div class="fire-item-head">
            <span class="fire-dist">${distTxt} · ${f.direccion}</span>
            <span class="fire-fecha">${fmtFecha(f.fecha)} ${fmtHora(f.hora)} UTC</span>
          </div>
          <div class="fire-item-meta">
            <span class="fire-badge-intensidad" style="background:${bgColor};color:${colorTexto}">🔥 ${f.clasif.label}</span>
            <span class="fire-meta-item">⚡ ${f.frp.toFixed(1)} MW</span>
          </div>
          <div class="fire-item-meta" style="margin-top:2px">
            <span class="fire-badge ${confClase}">Conf. ${confTxt}</span>
            <span class="fire-meta-item">🛰️ ${f.satelite}</span>
          </div>
          <div class="fire-coords">${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}</div>
        </div>
      </div>`;
    }).join('');

    cont.querySelectorAll('.fire-item').forEach(el => {
      el.onclick = () => {
        const i = Number(el.dataset.idx);
        const foco = focos[i];
        if (mapa && foco) {
          mapa.setView([foco.lat, foco.lon], 13);
          capaFocos.eachLayer(layer => {
            const ll = layer.getLatLng();
            if (Math.abs(ll.lat - foco.lat) < 0.0001 && Math.abs(ll.lng - foco.lon) < 0.0001) {
              layer.openPopup();
            }
          });
          const wrapper = document.getElementById('fire-map-wrapper');
          if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
    });
  }

  // ==========================================
  // MAPA
  // ==========================================
  function inicializarMapa() {
    const contenedor = document.getElementById('fire-map');
    if (!contenedor) return;
    if (mapaInicializado && mapa) return;

    mapa = L.map(contenedor, {
      center: [CENTER.lat, CENTER.lon],
      zoom: INITIAL_ZOOM,
      zoomControl: true,
      attributionControl: true,
      tap: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, minZoom: 6,
      attribution: '© OpenStreetMap',
      crossOrigin: true
    }).addTo(mapa);

    capaFocos = L.layerGroup().addTo(mapa);
    capaViento = L.layerGroup().addTo(mapa);

    L.circleMarker([CENTER.lat, CENTER.lon], {
      radius: 8, fillColor: '#62b6cb', color: '#ffffff',
      weight: 2.5, opacity: 1, fillOpacity: 0.9
    }).bindPopup('<strong>El Bolsón</strong><br>Centro de referencia').addTo(mapa);

    const btnRecenter = document.getElementById('fire-map-recenter');
    if (btnRecenter) {
      btnRecenter.onclick = () => {
        if (mapa) mapa.setView([CENTER.lat, CENTER.lon], INITIAL_ZOOM);
      };
    }

    mapaInicializado = true;
    setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 150);
  }

  function renderFocosEnMapa(focos) {
    if (!mapa || !capaFocos) return;
    capaFocos.clearLayers();

    focos.forEach((f, i) => {
      const colorRelleno = f.clasif.color;
      const colorBorde = f.confianza === 'h' ? '#e74c3c' : f.confianza === 'l' ? '#f1c40f' : '#f39c12';
      const radio = f.clasif.radioMapa;

      const marker = L.circleMarker([f.lat, f.lon], {
        radius: radio, fillColor: colorRelleno, color: colorBorde,
        weight: 2, opacity: 1, fillOpacity: 0.85
      });

      const confTxt = f.confianza === 'h' ? 'Alta' : f.confianza === 'l' ? 'Baja' : 'Nominal';
      const distTxt = f.distancia < 10 ? f.distancia.toFixed(1) + ' km' : Math.round(f.distancia) + ' km';

      marker.bindPopup(`
        <div style="font-family: -apple-system, sans-serif; min-width: 180px;">
          <strong style="color:${colorRelleno}; font-size:14px;">🔥 Foco #${i + 1} · ${f.clasif.label}</strong><br>
          <span style="font-size:11px;color:#666;">${fmtFecha(f.fecha)} ${fmtHora(f.hora)} UTC</span><br><br>
          <b>Intensidad (FRP):</b> ${f.frp.toFixed(1)} MW<br>
          <b>Distancia:</b> ${distTxt} (${f.direccion})<br>
          <b>Confianza:</b> ${confTxt}<br>
          <b>Satélite:</b> ${f.satelite}<br>
          <b>Coords:</b> ${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}
        </div>
      `);

      capaFocos.addLayer(marker);
    });
  }

  // ==========================================
  // CAPA WMS
  // ==========================================
  function toggleWMS() {
    if (!mapa) return;

    if (wmsActiva) {
      if (capaWMS) { mapa.removeLayer(capaWMS); capaWMS = null; }
      wmsActiva = false;
      document.getElementById('btn-toggle-wms')?.classList.remove('active');
    } else {
      if (!FIRMS_MAP_KEY || FIRMS_MAP_KEY === 'TU_API_KEY_AQUI') return;
      const wmsUrl = `${WMS_BASE}${WMS_LAYER_TYPE}/${FIRMS_MAP_KEY}/`;
      capaWMS = L.tileLayer.wms(wmsUrl, {
        layers: WMS_LAYER_NAME, format: 'image/png',
        transparent: true, version: '1.1.1',
        opacity: 0.7, attribution: 'NASA FIRMS'
      }).addTo(mapa);
      wmsActiva = true;
      document.getElementById('btn-toggle-wms')?.classList.add('active');
    }
  }

  // ==========================================
  // CAPA VIENTO
  // ==========================================
  function colorViento(v) {
    if (v < 10) return '#2ecc71';
    if (v < 25) return '#f1c40f';
    if (v < 45) return '#f39c12';
    return '#e74c3c';
  }
  function tamañoFlecha(v) {
    if (v < 10) return 20;
    if (v < 25) return 24;
    if (v < 45) return 28;
    return 32;
  }
  function gradosADireccion(deg) {
    if (deg == null || isNaN(deg)) return '—';
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return dirs[idx];
  }

  async function toggleViento() {
    if (!mapa) return;
    const btn = document.getElementById('btn-toggle-viento');
    const leyenda = document.getElementById('fire-viento-leyenda');

    if (vientoActivo) {
      capaViento.clearLayers();
      vientoActivo = false;
      btn?.classList.remove('active');
      leyenda?.classList.add('hidden');
      return;
    }

    try {
      if (btn) btn.disabled = true;
      const puntos = await fetchViento();
      capaViento.clearLayers();

      puntos.forEach(p => {
        const rotacion = (p.direccion + 180) % 360;
        const color = colorViento(p.viento);
        const tam = tamañoFlecha(p.viento);

        const html = `
          <div style="width:${tam}px;height:${tam}px;transform:rotate(${rotacion}deg);
                      filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));transition:transform 0.3s;">
            <svg viewBox="0 0 24 24" width="${tam}" height="${tam}">
              <path d="M12 3 L12 21 M12 3 L7 9 M12 3 L17 9"
                    stroke="${color}" stroke-width="2.8" fill="none"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>`;

        const icon = L.divIcon({
          html, className: 'viento-arrow-marker',
          iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2]
        });

        const marker = L.marker([p.lat, p.lon], { icon });
        marker.bindPopup(`
          <div style="font-family: -apple-system, sans-serif; min-width: 150px;">
            <strong>💨 Viento</strong><br><br>
            <b>Velocidad:</b> ${p.viento.toFixed(1)} km/h<br>
            <b>Dirección:</b> ${Math.round(p.direccion)}° (${gradosADireccion(p.direccion)})<br>
            <span style="font-size:10px;color:#888;font-style:italic;">La flecha indica hacia dónde SOPLA</span>
          </div>
        `);

        capaViento.addLayer(marker);
      });

      vientoActivo = true;
      btn?.classList.add('active');
      leyenda?.classList.remove('hidden');
    } catch (e) {
      console.warn('Fallo cargando el viento:', e);
      alert('No se pudo cargar el viento: ' + (e.message || 'error'));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ==========================================
  // REPORTE SNMF
  // ==========================================

  function mesEsperado() {
    const hoy = new Date();
    let mes = hoy.getMonth();
    let año = hoy.getFullYear();
    mes = mes - 1;
    if (mes < 0) { mes = 11; año -= 1; }
    return { año, mes };
  }

  function snmfKey(año, mes) {
    const mm = String(mes + 1).padStart(2, '0');
    return `${SNMF_PREFIX}${año}-${mm}`;
  }

  // Devuelve las URLs candidatas para un mes/año
  function snmfUrls(año, mes) {
    const nombreMes = MESES_ES[mes];
    return [
      `https://www.argentina.gob.ar/sites/default/files/${nombreMes}_${año}.pdf`,
      `https://back.argentina.gob.ar/sites/default/files/2018/05/${nombreMes}_${año}.pdf`,
      `https://www.argentina.gob.ar/sites/default/files/2018/05/${nombreMes}_${año}.pdf`
    ];
  }

  // Intenta descargar el PDF con fetch (modo offline). Puede fallar por CORS.
  async function descargarReporte(año, mes, onProgress) {
    const urls = snmfUrls(año, mes);
    let ultimoError = null;

    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) {
          ultimoError = new Error('HTTP ' + r.status);
          continue;
        }
        const contentLength = parseInt(r.headers.get('Content-Length') || '0', 10);
        const reader = r.body.getReader();
        const chunks = [];
        let recibido = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          recibido += value.length;
          if (onProgress) onProgress(recibido, contentLength);
        }

        const blob = new Blob(chunks, { type: 'application/pdf' });
        return { blob, url };
      } catch (e) {
        ultimoError = e;
      }
    }

    throw ultimoError || new Error('No se encontró el reporte');
  }

  // Detecta si un error fue causado por CORS o mixed content (fetch bloqueado)
  function esErrorCORS(e) {
    if (!e) return false;
    const msg = String(e.message || e).toLowerCase();
    return msg.includes('failed to fetch') ||
           msg.includes('networkerror') ||
           msg.includes('cors');
  }

  // Renderiza el bloque SNMF según el estado
  async function renderSNMF() {
    const cont = document.getElementById('snmf-contenido');
    if (!cont) return;

    const { año, mes } = mesEsperado();
    const key = snmfKey(año, mes);

    let guardado = null;
    try {
      guardado = await Storage.get(SNMF_STORE, key);
    } catch (e) { /* no hay */ }

    // Marca si ya avisamos del error CORS en esta sesión para no repetir
    const yaFalloCORS = cont.dataset.corsFallado === '1';

    if (guardado && guardado.blob) {
      // ===== HAY PDF DESCARGADO =====
      const tamaño = guardado.tamaño || guardado.blob.size;
      const fechaDesc = new Date(guardado.descargadoEn || Date.now());
      const fechaDescTxt = fechaDesc.toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      cont.innerHTML = `
        <div class="snmf-info snmf-info-ok">
          <div class="snmf-info-head">
            <span class="snmf-icon">📄</span>
            <div class="snmf-info-text">
              <span class="snmf-titulo">${MESES_LABEL[mes]} ${año}</span>
              <span class="snmf-meta">${fmtBytes(tamaño)} · descargado el ${fechaDescTxt}</span>
            </div>
          </div>
          <div class="snmf-acciones">
            <button id="snmf-btn-ver" class="snmf-btn snmf-btn-primary">👁 Ver</button>
            <button id="snmf-btn-borrar" class="snmf-btn snmf-btn-danger">🗑 Borrar</button>
          </div>
        </div>
      `;

      document.getElementById('snmf-btn-ver').onclick = () => mostrarVisorSNMF(guardado);
      document.getElementById('snmf-btn-borrar').onclick = () => borrarReporteSNMF(key);
      return;
    }

    // ===== NO HAY PDF DESCARGADO =====
    // Si ya sabemos que el fetch falla por CORS, mostramos directamente el modo "abrir"
    if (yaFalloCORS) {
      const urls = snmfUrls(año, mes);
      const urlPrincipal = urls[0];
      cont.innerHTML = `
        <div class="snmf-info snmf-info-empty">
          <div class="snmf-info-head">
            <span class="snmf-icon">📄</span>
            <div class="snmf-info-text">
              <span class="snmf-titulo">${MESES_LABEL[mes]} ${año}</span>
              <span class="snmf-meta">Descarga directa no disponible (CORS).</span>
            </div>
          </div>
          <p class="snmf-nota">
            El servidor del gobierno no permite descargar el PDF desde esta app.
            Podés abrirlo en una pestaña del navegador y verlo ahí.
          </p>
          <div class="snmf-acciones">
            <a href="${urlPrincipal}" target="_blank" rel="noopener" class="snmf-btn snmf-btn-primary">
              🌐 Abrir reporte
            </a>
            <button id="snmf-btn-reintentar" class="snmf-btn snmf-btn-secondary">🔄 Reintentar</button>
          </div>
        </div>
      `;
      document.getElementById('snmf-btn-reintentar').onclick = () => {
        delete cont.dataset.corsFallado;
        renderSNMF();
      };
      return;
    }

    // Estado inicial: botón de descarga con fetch (intenta el modo offline)
    cont.innerHTML = `
      <div class="snmf-info snmf-info-empty">
        <div class="snmf-info-head">
          <span class="snmf-icon">📥</span>
          <div class="snmf-info-text">
            <span class="snmf-titulo">Sin descargar</span>
            <span class="snmf-meta">El reporte más reciente es el de ${MESES_LABEL[mes]} ${año}</span>
          </div>
        </div>
        <div class="snmf-acciones">
          <button id="snmf-btn-descargar" class="snmf-btn snmf-btn-primary">📥 Descargar</button>
        </div>
      </div>
      <div id="snmf-progreso" class="snmf-progreso hidden"></div>
    `;

    document.getElementById('snmf-btn-descargar').onclick = () =>
      descargarYGuardarSNMF(año, mes, key, cont);
  }

  async function descargarYGuardarSNMF(año, mes, key, contRef) {
    const progCont = document.getElementById('snmf-progreso');
    const btnDesc = document.getElementById('snmf-btn-descargar');
    if (btnDesc) btnDesc.disabled = true;

    if (progCont) {
      progCont.classList.remove('hidden');
      progCont.innerHTML = `
        <div class="snmf-prog-label">Preparando descarga…</div>
        <div class="snmf-prog-bar"><div class="snmf-prog-fill" style="width:0%"></div></div>
      `;
    }

    try {
      const { blob } = await descargarReporte(año, mes, (recibido, total) => {
        if (!progCont) return;
        const pct = total > 0 ? Math.min(100, Math.round(recibido / total * 100)) : 0;
        const label = total > 0
          ? `${fmtBytes(recibido)} de ${fmtBytes(total)} (${pct}%)`
          : `${fmtBytes(recibido)} descargados`;
        progCont.querySelector('.snmf-prog-label').textContent = label;
        progCont.querySelector('.snmf-prog-fill').style.width = pct + '%';
      });

      await Storage.put(SNMF_STORE, {
        id: key,
        año, mes,
        blob,
        tamaño: blob.size,
        descargadoEn: Date.now()
      });

      await renderSNMF();
    } catch (e) {
      const esCors = esErrorCORS(e);
      // Guardamos en el contenedor que ya falló por CORS, así el próximo render
      // muestra directamente el modo "abrir en pestaña".
      if (esCors && contRef) {
        contRef.dataset.corsFallado = '1';
      }
      // Re-render para que se aplique el nuevo modo
      await renderSNMF();
    }
  }

  function mostrarVisorSNMF(guardado) {
    const viewer = document.getElementById('snmf-viewer');
    const frame = document.getElementById('snmf-viewer-frame');
    const titulo = document.getElementById('snmf-viewer-titulo');
    if (!viewer || !frame) return;

    if (snmfBlobUrl) {
      URL.revokeObjectURL(snmfBlobUrl);
      snmfBlobUrl = null;
    }

    snmfBlobUrl = URL.createObjectURL(guardado.blob);
    titulo.textContent = `${MESES_LABEL[guardado.mes]} ${guardado.año}`;

    frame.innerHTML = `
      <iframe src="${snmfBlobUrl}" class="snmf-iframe" title="Reporte SNMF"></iframe>
      <div class="snmf-iframe-fallback">
        <p class="muted" style="font-size:12px">
          ¿No ves el PDF? <a href="${snmfBlobUrl}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">Abrilo en una pestaña</a>.
        </p>
      </div>
    `;

    viewer.classList.remove('hidden');

    setTimeout(() => {
      viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function cerrarVisorSNMF() {
    const viewer = document.getElementById('snmf-viewer');
    const frame = document.getElementById('snmf-viewer-frame');
    if (viewer) viewer.classList.add('hidden');
    if (frame) frame.innerHTML = '';
    if (snmfBlobUrl) {
      URL.revokeObjectURL(snmfBlobUrl);
      snmfBlobUrl = null;
    }
  }

  async function borrarReporteSNMF(key) {
    if (!confirm('¿Borrar el reporte descargado? Vas a tener que volver a bajarlo si lo necesitás.')) {
      return;
    }
    try {
      await Storage.del(SNMF_STORE, key);
    } catch (e) { /* no existe, igual seguimos */ }
    cerrarVisorSNMF();
    await renderSNMF();
  }

  // ==========================================
  // ESTADOS DEL MAPA
  // ==========================================
  function mostrarMapa() {
    document.getElementById('fire-map-wrapper')?.classList.remove('hidden');
    document.getElementById('fire-map-error')?.classList.add('hidden');
  }
  function ocultarMapa() {
    document.getElementById('fire-map-wrapper')?.classList.add('hidden');
  }
  function mostrarErrorMapa() {
    ocultarMapa();
    document.getElementById('fire-map-error')?.classList.remove('hidden');
  }

  function renderEstado(msg, esError = false) {
    const cont = document.getElementById('fire-listado');
    if (!cont) return;
    cont.innerHTML = `
      <div class="fire-empty ${esError ? 'error' : ''}">
        <span class="fire-empty-icon">${esError ? '⚠️' : '⏳'}</span>
        <p>${msg}</p>
      </div>
    `;
  }

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  async function render() {
    const listado = document.getElementById('fire-listado');
    if (!listado) return;

    renderSNMF();

    if (!cacheFocos.data) renderEstado('Consultando focos de calor…');

    try {
      const focos = await fetchFocos();
      renderResumen(focos);
      renderLista(focos);

      try {
        await cargarLeaflet();
        mostrarMapa();
        inicializarMapa();
        renderFocosEnMapa(focos);
      } catch (eMap) {
        console.warn('Fallo cargando el mapa:', eMap);
        mostrarErrorMapa();
      }
    } catch (e) {
      renderEstado('No se pudieron obtener datos: ' + (e.message || 'error de red'), true);
      try {
        await cargarLeaflet();
        mostrarMapa();
        inicializarMapa();
      } catch (eMap) {
        mostrarErrorMapa();
      }
    }
  }

  // ==========================================
  // INIT
  // ==========================================
  function init() {
    document.querySelectorAll('.tab').forEach(btn => {
      if (btn.dataset.tab === 'emergencia') {
        btn.addEventListener('click', () => {
          setTimeout(render, 60);
        });
      }
    });

    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'emergencia') {
      setTimeout(render, 500);
    }

    const btnRetry = document.getElementById('fire-map-retry');
    if (btnRetry) {
      btnRetry.onclick = () => {
        leafletCargando = null;
        render();
      };
    }

    const btnWMS = document.getElementById('btn-toggle-wms');
    if (btnWMS) btnWMS.addEventListener('click', toggleWMS);

    const btnViento = document.getElementById('btn-toggle-viento');
    if (btnViento) btnViento.addEventListener('click', toggleViento);

    const btnCerrarVisor = document.getElementById('snmf-cerrar-viewer');
    if (btnCerrarVisor) btnCerrarVisor.addEventListener('click', cerrarVisorSNMF);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { render };
})();