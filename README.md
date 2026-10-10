# 🌦️ El Bolsón Clima Local

App web progresiva (PWA) de pronóstico del tiempo, memoria climática y
monitoreo de incendios para El Bolsón, Río Negro, Argentina. Funciona **100%
offline**, sin depender de conexión constante ni APIs pagas.

Diseñada exclusivamente para uso en celulares Android, instalable desde el
navegador sin pasar por Google Play.

---

## ✨ Características principales

- **100% offline:** todos los datos se guardan en IndexedDB. Funciona sin
  conexión desde el primer uso.
- **Sin costos:** usa Open-Meteo (gratuita, sin API key) y datasets abiertos.
- **Tres microclimas del valle:** El Bolsón centro, Mallín Ahogado y Lago
  Puelo.
- **Pronóstico + memoria climática:** combina predicción operativa con la
  serie histórica 1940–2025.
- **Monitoreo de incendios:** integración con NASA FIRMS para focos de calor
  en tiempo casi real, mapa interactivo con capas de antigüedad y viento.
- **Reporte SNMF descargable:** informe mensual del Servicio Nacional de
  Manejo del Fuego para la Regional Patagonia.
- **Gráfico del sol tipo meteored:** arco SVG con posición animada y horas
  del día.
- **Iconos del cielo animados:** sol, nubes, lluvia, nieve, niebla y tormenta
  en SVG puro.
- **Efectos especiales de fondo:** lluvia, nieve, niebla y destellos de
  tormenta según el clima actual.
- **Fondo dinámico:** cambia entre amanecer, día, atardecer y noche.
- **PWA con atajos:** accesos directos a cada pestaña desde el ícono en el
  escritorio.

---

## 📱 Interfaz

La app tiene cuatro pestañas:

### 🏠 Hoy
- Hero con temperatura actual, sensación térmica, viento, humedad y presión.
- Comparación con la media histórica del mes.
- Resumen textual del día generado a partir de los datos.
- Gráfico del sol con posición en tiempo real y fase lunar.
- Alertas activas (heladas, ráfagas fuertes, lluvia intensa, calor extremo).
- Tarjeta de riesgo de incendio (índice 0-100).
- Tira horizontal con las próximas 24 horas (hora, icono, temp,
  precipitación y probabilidad de lluvia).
- Comparación del valle: centro, Mallín Ahogado y Lago Puelo.
- Actividades del valle (podar, río, montaña, heladas, nieve en cordón).
- "Sabías que…" con dato curioso del día (25 datos rotativos).

### 📅 7 días
- Lista compacta con los próximos 7 días:
  - Icono animado del cielo
  - Temperaturas máx/mín
  - Precipitación y probabilidad de lluvia
  - Viento y ráfagas
  - Índice UV máximo
  - Horario de salida y puesta del sol
  - Punto de color con el nivel de riesgo de incendio
- Al tocar un día se abre un modal con:
  - Hero del día (icono, descripción, máx/mín)
  - Grilla 2×N de stats: precipitación, cota de nieve, viento máx, ráfagas,
    humedad media, visibilidad, punto de rocío, fase lunar, UV, nubosidad,
    incendio
  - **Alerta visual** cuando la cota de nieve baja de 350 m
  - Resumen textual
  - Gráfico del sol
  - Comparación con la media histórica del mes
  - Tabla hora por hora: hora, temperatura, precipitación (con probabilidad)
    y viento (dirección + ráfaga)

### 📚 Memoria
- **Buscar por fecha:** consulta cualquier día desde 1940 hasta ayer. Se
  cachea para uso offline.
- **Explorar por año:** selector 1940–2025 con:
  - Temperatura media del año y precipitación total
  - Anomalía respecto al promedio 1940–2024
  - Ranking ("fue el 5° año más cálido del registro")
  - Gráfico de 12 columnas dobles (referencia vs. año) para temperatura y
    precipitación
  - Estacionalidad con precipitación acumulada por estación
- **Tendencia de precipitación:** sparkline con selector de rango, línea de
  promedio, tooltips interactivos y clasificación por categoría.
- **Precipitación mensual:** comparación año vs. promedio, con máximos y
  mínimos históricos de cada mes.

### 🔥 Emergencia Ígnea
- **Focos de calor:** detecciones satelitales de NASA FIRMS (VIIRS) en las
  últimas 24 h en un radio de ~100 km.
- **Marcadores escalados por FRP:** el tamaño y color indican la intensidad
  del fuego (Débil → Muy intenso).
- **Mapa interactivo (Leaflet):** tiles de OpenStreetMap, marcador de
  referencia de El Bolsón, botón de recentrar.
- **Capa de antigüedad del fuego (WMS):** colorea los focos según el tiempo
  desde la detección (0-6h, 6-12h, 12-24h, 24h+).
- **Capa de viento:** grilla 5×5 de flechas que muestran dirección y
  velocidad del viento pronosticado.
- **Reporte SNMF:** descarga el informe mensual del Servicio Nacional de
  Manejo del Fuego, incluye sección Regional Patagonia. Se guarda en
  IndexedDB y se puede ver dentro de la app.

---

## 🧱 Stack técnico

- **HTML5 + CSS3 + JavaScript vanilla** — sin frameworks, sin dependencias
  externas.
- **Service Worker** para caché offline.
- **IndexedDB** para datos históricos, pronóstico cacheado, reporte SNMF y
  observaciones.
- **localStorage** para preferencias.
- **SVG inline** para iconos animados y el gráfico del sol.
- **CSS puro** para todas las visualizaciones (sin Canvas, sin Chart.js).
- **Leaflet** (cargado localmente) para el mapa interactivo.

**No usa** ninguna librería externa fuera de Leaflet. Todo lo demás es código
propio.

---

## 📂 Estructura del proyecto

```
clima/
├── index.html                    App principal
├── manifest.json                 Configuración PWA
├── sw.js                         Service Worker (caché offline)
├── CHANGELOG.md                  Historial de versiones
├── README.md                     Este archivo
├── css/
│   └── styles.css                Todos los estilos
├── js/
│   ├── storage.js                Envoltorio de IndexedDB y localStorage
│   ├── sun.js                    Cálculo astronómico + gráfico SVG del sol
│   ├── fire.js                   Índice de riesgo de incendio (0-100)
│   ├── sky.js                    Iconos SVG animados del cielo
│   ├── alerts.js                 Alertas y actividades del valle
│   ├── initial-forecast.js       Generador de pronóstico inicial offline
│   ├── data-fetcher.js           Descarga desde Open-Meteo
│   ├── fire-emergency.js         Módulo de emergencia ígnea (FIRMS + mapa)
│   └── app.js                    Lógica principal y render
├── data/
│   ├── climate-baseline.json     Medias mensuales, récords y microclimas
│   └── historical.json           Serie anual 1940-2025 + detalle mensual
├── leaflet/
│   ├── leaflet.js                Librería de mapas (local, no CDN)
│   └── leaflet.css
└── icons/
    ├── icon-192.png              Icono normal 192x192
    ├── icon-512.png              Icono normal 512x512
    ├── icon-maskable-192.png     Icono maskable 192x192
    └── icon-maskable-512.png     Icono maskable 512x512
```

---

## 🌐 Fuentes de datos y créditos

### Open-Meteo
- **Uso:** pronóstico horario de 7 días, datos históricos diarios desde 1940,
  datos mensuales por año, viento en grilla.
- **Sitio:** https://open-meteo.com/
- **Licencia:** CC-BY 4.0, uso libre incluido comercial.
- **Atribución:** requerida en la documentación.
- **Costos:** gratuito, sin API key.

### NASA FIRMS
- **Uso:** detecciones satelitales de focos de calor, servicio WMS de
  antigüedad del fuego.
- **Sitio:** https://firms.modaps.eosdis.nasa.gov/
- **Licencia:** dominio público (NASA).
- **Atribución:** requerida.
- **Costos:** gratuito, requiere API key gratuita.

### Servicio Nacional de Manejo del Fuego (SNMF)
- **Uso:** reporte mensual de peligro de incendios de vegetación.
- **Sitio:** https://www.argentina.gob.ar/ambiente/fuego
- **Licencia:** documentos públicos del Estado argentino.
- **Costos:** gratuito.

### OpenStreetMap
- **Uso:** tiles del mapa interactivo.
- **Sitio:** https://www.openstreetmap.org/
- **Licencia:** ODbL (Open Database License).
- **Atribución:** requerida, aparece en el mapa como "© OpenStreetMap".
- **Costos:** gratuito para uso moderado.

### Leaflet
- **Uso:** librería de mapas interactivos.
- **Sitio:** https://leafletjs.com/
- **Licencia:** BSD 2-Clause.
- **Atribución:** requerida (se incluye en `leaflet/leaflet.js`).
- **Costos:** gratuito.

### Servicio Meteorológico Nacional (SMN)
- **Uso:** datos de referencia para calibrar la línea base climática.
- **Sitio:** https://www.smn.gob.ar/
- **Licencia:** datos abiertos.
- **Costos:** gratuito.

### INTA
- **Uso:** estadísticas climáticas regionales.
- **Sitio:** https://inta.gob.ar/
- **Licencia:** datos abiertos.
- **Costos:** gratuito.

---

## 🚀 Instalación y uso

### Como PWA (uso normal)

1. Abrí la app en el navegador de tu celular (Chrome recomendado en Android).
2. Menú ⋮ → **"Instalar app"** o **"Agregar a pantalla de inicio"**.
3. Listo. Tenés un ícono en el escritorio que funciona como app nativa.

En Android, manteniendo presionado el ícono, aparecen atajos directos a
**Hoy**, **7 días**, **Microclimas** (legacy) y **Memoria**.

### Como desarrollador

Servir con cualquier servidor HTTP (los Service Workers requieren `http://` o
`https://`):

```bash
cd clima
python3 -m http.server 8080
```

Abrir en el navegador: `http://localhost:8080`

Para desplegar en GitHub Pages:

1. Subir el repo a GitHub.
2. Settings → Pages → Source: `main` branch, `/ (root)`.
3. Esperar 1-2 minutos.
4. La app queda disponible en `https://[usuario].github.io/[repo]/`.

---

## ⚙️ Configuración

### API key de NASA FIRMS

La app necesita una API key gratuita de NASA FIRMS para consultar los focos
de calor. Se obtiene en:

```
https://firms.modaps.eosdis.nasa.gov/api/map_key/
```

Una vez obtenida, editá el archivo `js/fire-emergency.js` y reemplazá:

```javascript
const FIRMS_MAP_KEY = 'TU_API_KEY_AQUI';
```

por tu clave real:

```javascript
const FIRMS_MAP_KEY = 'abcdef1234567890';
```

**Nota:** la API key está en texto plano en el código porque la app es
estática. Si el repositorio es público, cualquier persona puede verla. En la
práctica esto raramente es un problema porque FIRMS tiene límites altos de
uso y la key se puede regenerar. **Se asume el riesgo de exposición pública.**

### Actualizar datos históricos

El archivo `data/historical.json` contiene la serie 1940–2025. Cuando salga
el año 2026 completo, se puede actualizar:

1. Consultar Open-Meteo Archive para el nuevo año:

```
https://archive-api.open-meteo.com/v1/archive?latitude=-41.96&longitude=-71.53&start_date=2026-01-01&end_date=2026-12-31&daily=temperature_2m_mean,precipitation_sum&timezone=America/Argentina/Salta
```

2. Calcular el promedio anual y el total de precipitación.
3. Agregar los 12 valores mensuales al objeto `monthly_recent`.
4. Actualizar los campos `hasta` y los arrays `anios_tm` y `anios_p`.

### Modo recuperación

Si algo se corrompe (datos viejos, Service Worker roto, caché inconsistente),
agregar `?reset=1` a la URL:

```
https://[usuario].github.io/[repo]/index.html?reset=1
```

Borra IndexedDB, localStorage, Service Worker y todas las cachés. Recarga
limpio.

### Bump del Service Worker

Cada vez que cambies archivos cacheados, incrementá la versión en `sw.js`:

```javascript
const CACHE = 'bolson-clima-1.19.1';
```

Sin esto, el navegador va a seguir sirviendo los archivos viejos desde caché.

---

## 📊 Datos que muestra

### Pronóstico (7 días, horario)
- Temperatura a 2 m
- Sensación térmica
- Humedad relativa
- Punto de rocío
- Precipitación y probabilidad
- Nubosidad
- Visibilidad
- Viento (velocidad + dirección + ráfagas)
- Presión a nivel del mar
- Código WMO del clima
- Índice UV
- Cota de nieve (freezing level height)

### Memoria climática
- Serie anual 1940–2025
- Detalle mensual 1940–2025
- Medias mensuales normales (1940–2024)
- Récords locales (máx/mín histórica, precipitación máxima)

### Emergencia ígnea
- Focos de calor (últimas 24 h, radio ~100 km)
- FRP (Fire Radiative Power) de cada foco
- Confianza de la detección
- Satélite que la detectó
- Antigüedad del fuego (0-6h, 6-12h, 12-24h, 24h+)
- Viento pronosticado en grilla 5×5
- Reporte mensual del SNMF

### Cálculos offline
- **Fase lunar:** a partir de la fecha (algoritmo simple).
- **Salida/puesta de sol:** cálculo astronómico con ecuación del tiempo.
- **Riesgo de incendio:** índice 0-100 a partir de temperatura, humedad,
  viento y precipitación.
- **Generador de pronóstico:** ruido determinístico por fecha sobre la línea
  base climática.
- **Cota de nieve estimada:** a partir de la temperatura media y el gradiente
  térmico vertical (0,65°C por 100 m).

---

## 🐛 Problemas conocidos

- **Firefox Android no muestra los atajos PWA** en el long-press del ícono.
  Es una limitación del navegador; en Chrome Android sí funcionan.
- **Los efectos especiales consumen batería** si están activos mucho tiempo.
  Se pueden desactivar comentando la llamada a `actualizarEfectos()` en
  `app.js`.
- **El reporte SNMF puede fallar por CORS** en algunos navegadores o
  conexiones. Si la descarga no funciona, se puede abrir el PDF directamente
  desde el navegador.
- **La capa STA de FIRMS no está disponible** en la API pública. El filtro
  de focos no vegetales no se pudo implementar.
- **La API key de FIRMS está expuesta** en el código. Se asume el riesgo.

---

## 📅 Historial de versiones

Ver el archivo [CHANGELOG.md](./CHANGELOG.md) para el detalle completo de
todas las versiones. La app usa **semver** (X.Y.Z) a partir de la versión
1.0.0.

**Última versión estable:** `1.19.0` (v38) · 8 de octubre de 2025.

---

## 📄 Licencia

Uso personal. Los datos climáticos y de incendios provienen de fuentes
públicas (Open-Meteo, NASA, SNMF, INTA, SMN) con sus respectivas licencias.

El código de la app es de libre uso y modificación.

---

## 👥 Créditos

Proyecto desarrollado para uso personal en El Bolsón, Río Negro, Argentina.

Agradecimientos a:
- **Open-Meteo** por proveer datos meteorológicos gratuitos sin API key.
- **NASA FIRMS** por las detecciones satelitales de focos de calor.
- **Servicio Nacional de Manejo del Fuego** por los reportes mensuales.
- **OpenStreetMap** por los tiles del mapa.
- **Leaflet** por la librería de mapas.
- **INTA y SMN** por los datos climáticos regionales.

---

## 🎯 Roadmap

Ideas pendientes para futuras versiones:

- [ ] Indicador de peligro de incendio diario basado en datos locales
- [ ] Alertas automáticas por proximidad de focos
- [ ] Compartir foco por WhatsApp con formato predefinido
- [ ] Modo claro / oscuro con toggle manual
- [ ] Pronóstico extendido a 14 días
- [ ] Exportar/importar datos (backup en JSON)
- [ ] Gráfico de actividad diaria (últimos 7 días)
- [ ] Historial real de los últimos 5 días (comparar pronóstico vs. realidad)
- [ ] Vista "modo campo" para leer al sol
- [ ] `favicon.ico` para navegadores desktop

---

**Estado actual:** funcional, estable, 100% offline para pronóstico y memoria
climática. La sección de emergencia ígnea requiere internet para actualizarse
pero cachea los últimos datos disponibles.