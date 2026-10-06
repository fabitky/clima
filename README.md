# 🌦️ El Bolsón Clima Local

App web progresiva (PWA) de pronóstico del tiempo y memoria climática para El Bolsón, Río Negro, Argentina. Funciona **100% offline**, sin depender de conexión constante ni APIs de pago.

Diseñada exclusivamente para uso en celulares Android, instalable desde el navegador.

---

## ✨ Características principales

- **100% offline:** todos los datos se guardan en `IndexedDB`. Funciona sin conexión desde el primer uso.
- **Sin API key, sin costos:** usa Open-Meteo (gratuita) y datasets abiertos del SMN.
- **Tres microclimas del valle:** El Bolsón centro, Mallín Ahogado y Lago Puelo.
- **Pronóstico + memoria climática:** combina predicción operativa con la serie histórica 1940–2025.
- **Gráfico del sol tipo meteored:** arco SVG con posición animada del sol y horas del día.
- **Iconos del cielo animados:** sol, nubes, lluvia, nieve, niebla y tormenta en SVG puro.
- **Efectos especiales de fondo:** lluvia, nieve, niebla y destellos de tormenta según el clima actual.
- **Fondo dinámico según la hora:** cambia entre amanecer, día, atardecer y noche.
- **PWA con atajos:** accesos directos a cada pestaña desde el ícono en el escritorio.

---

## 📱 Interfaz

La app tiene cuatro pestañas:

### 🏠 Hoy
- Hero con temperatura actual, sensación térmica, viento, humedad y presión.
- Comparación con la media histórica del mes.
- Resumen textual del día ("Fresco, con lluvias y viento moderado del Oeste…").
- Gráfico del sol con posición en tiempo real y fase lunar.
- Alertas activas (heladas, ráfagas fuertes, lluvia intensa, calor extremo).
- Tarjeta de riesgo de incendio (índice 0–100 con color según nivel).
- Tira horizontal con las próximas 24 horas (hora, icono, temp, precipitación).
- Actividades del valle (podar, río, montaña, riesgo de heladas, nieve en cordón).
- "💡 Sabías que…" con dato curioso del día (25 datos rotativos).

### 📅 7 días
- Lista compacta con los próximos 7 días:
  - Icono animado del cielo
  - Temperaturas máx/mín
  - Precipitación (mm)
  - Viento y ráfagas (km/h)
  - Índice UV máximo
  - Horario de salida y puesta del sol
  - Punto de color con el nivel de riesgo de incendio
- Al tocar un día se abre un **modal de detalle** con:
  - Hero del día (icono, descripción, máx/mín)
  - Grilla 2×N de stats: precipitación, cota de nieve, viento máx, ráfagas, humedad media, visibilidad, punto de rocío, fase lunar, UV, nubosidad, incendio.
  - Resumen textual.
  - Gráfico del sol.
  - Comparación con la media histórica del mes.
  - Tabla hora por hora: hora, temperatura, precipitación (con probabilidad) y viento (dirección + ráfaga).

### 🗺️ Microclimas
- Comparación entre los 3 puntos del valle con barras horizontales:
  - Temperatura máxima / mínima
  - Precipitación total
  - Viento máximo

### 📚 Memoria
- **Buscar por fecha:** consulta cualquier día desde 1940 hasta ayer. Se cachea para uso offline.
- **Explorar por año:** selector 1940–2025 con:
  - Temperatura media del año y precipitación total
  - Anomalía respecto al promedio 1940–2024
  - Ranking ("fue el 5° año más cálido del registro")
  - Gráfico de 12 columnas dobles (referencia vs. año)
- **Tendencia anual:** sparkline de 86 barritas mostrando el calentamiento del valle.
- **Precipitación mensual típica:** 12 barras con la media mensual.
- **Récords locales:** temperatura máxima/mínima histórica, precipitación máxima diaria, mes más cálido/frío, precipitación anual promedio.

---

## 🧱 Stack técnico

- **HTML5 + CSS3 + JavaScript vanilla** (sin frameworks, sin dependencias externas).
- **Service Worker** para caché y funcionamiento offline.
- **IndexedDB** para datos históricos, pronóstico cacheado y observaciones.
- **localStorage** para preferencias.
- **SVG inline** para iconos animados y el gráfico del sol.
- **CSS puro** para todas las visualizaciones (sin Canvas, sin Chart.js).

**No usa** ninguna librería externa. Todo es código propio.

---

## 📂 Estructura del proyecto

```
el-bolson-clima/
├── index.html                    App principal
├── manifest.json                 Configuración PWA (nombre, iconos, atajos)
├── sw.js                         Service Worker (caché offline)
├── css/
│   └── styles.css                Todos los estilos
├── js/
│   ├── storage.js                Envoltorio de IndexedDB y localStorage
│   ├── sun.js                    Cálculo astronómico + gráfico SVG del sol
│   ├── fire.js                   Índice de riesgo de incendio (0–100)
│   ├── sky.js                    Iconos SVG animados del cielo
│   ├── alerts.js                 Alertas y actividades del valle
│   ├── initial-forecast.js       Generador de pronóstico inicial offline
│   ├── data-fetcher.js           Descarga desde Open-Meteo (opcional)
│   └── app.js                    Lógica principal y render
└── data/
    ├── climate-baseline.json     Medias mensuales, récords y microclimas
    └── historical.json           Serie anual 1940–2025 + detalle mensual 2015+
```

---

## 🌐 Fuentes de datos

| Fuente | Qué aporta | Acceso |
|---|---|---|
| **Open-Meteo Forecast** | Pronóstico horario 7 días (temp, viento, precip, UV, cota de nieve, etc.) | Gratuito, sin API key |
| **Open-Meteo Archive** | Datos históricos diarios desde 1940 | Gratuito, sin API key |
| **SMN – El Bolsón AERO** | Serie 1980–2012 (usada para calibrar la línea base) | Datos abiertos |
| **INTA / CONICET** | Estadísticas climáticas regionales | Datos abiertos |

### Cómo funciona sin conexión

1. **Primera instalación:** la app viene con datos precargados (`climate-baseline.json` + `historical.json`).
2. **Sin datos de pronóstico:** genera un pronóstico plausible usando la línea base + ruido determinístico por fecha (`initial-forecast.js`).
3. **Con internet (opcional):** al tocar ⟳, descarga datos reales de Open-Meteo y los guarda en IndexedDB.
4. **Sin internet después:** sigue funcionando con los datos guardados, mostrando "última actualización: [fecha]".

---

## 🚀 Instalación y uso

### Como PWA (uso normal)

1. Abrí la app en el navegador de tu celular (Firefox o Chrome en Android).
2. Menú ⋮ → **"Instalar"** o **"Agregar a pantalla de inicio"**.
3. Listo. Tenés un ícono en el escritorio que funciona como app nativa.

En Android, manteniendo presionado el ícono, aparecen atajos directos a **Hoy**, **7 días**, **Microclimas** y **Memoria**.

### Como desarrollador

Servir con cualquier servidor HTTP (los Service Workers requieren `http://` o `https://`):

```bash
cd el-bolson-clima
python3 -m http.server 8080
```

Abrir en el navegador: `http://localhost:8080`

---

## 🔧 Desarrollo

### Actualizar datos históricos

Editá `data/historical.json` para agregar años nuevos. Estructura:

```json
{
  "desde": 1940,
  "hasta": 2025,
  "anios_tm": [9.1, 8.9, ...],
  "anios_p": [920, 880, ...],
  "monthly_recent": {
    "2024": [19.4, 18.6, ...]
  }
}
```

- `anios_tm`: temperaturas medias anuales (un valor por año desde `desde` hasta `hasta`)
- `anios_p`: precipitaciones anuales en mm (un valor por año)
- `monthly_recent`: detalle mensual (12 valores por año, solo desde 2015)

### Actualizar la línea base climática

Editá `data/climate-baseline.json` para ajustar medias mensuales, récords o microclimas.

### Modo recuperación

Si algo se corrompe (datos viejos, SW roto, caché inconsistente):

```
index.html?reset=1
```

Borra IndexedDB, localStorage, Service Worker y todas las cachés. Recarga limpio.

### Bump del Service Worker

Cada vez que cambies archivos cacheados, incrementá la versión en `sw.js`:

```js
const CACHE = 'bolson-clima-v15';  // subir el número
```

Sin esto, el navegador seguirá sirviendo los archivos viejos desde caché.

---

## 🎨 Diseño

- **Paleta:** azules oscuros para el fondo, cian como acento, naranja para datos cálidos.
- **Tipografía:** fuente del sistema (`-apple-system`, `Segoe UI`, `Roboto`).
- **Mobile-first:** todo está pensado para pantallas de celular en vertical.
- **Fondo dinámico:** cambia entre 4 gradientes según la hora calculada por `Sun.times()`.
- **Iconos:** SVG inline animados con CSS (`@keyframes`).
- **Sin Canvas:** todas las visualizaciones (sparklines, barras, gráfico del sol) son CSS puro o SVG.

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
- Detalle mensual 2015–2025
- Medias mensuales normales (1940–2024)
- Récords locales (máx/mín histórica, precipitación máxima)

### Cálculos offline
- **Fase lunar:** a partir de la fecha (sin API).
- **Salida/puesta de sol:** cálculo astronómico con ecuación del tiempo.
- **Riesgo de incendio:** índice 0–100 a partir de temperatura, humedad, viento y precipitación.
- **Generador de pronóstico:** ruido determinístico por fecha sobre la línea base.

---

## 🐛 Problemas conocidos

- **Firefox Android no muestra los atajos PWA** en el long-press del ícono. Es una limitación del navegador; en Chrome Android sí funcionan.
- **Los efectos especiales consumen batería** si están activos mucho tiempo. Se pueden desactivar comentando la llamada a `actualizarEfectos()` en `app.js`.

---

## 📅 Historial de versiones

| Versión | Cambios principales |
|---|---|
| v1 | Prototipo inicial. Pronóstico 7 días con datos precargados. |
| v2 | Generador de pronóstico offline. Alertas y actividades del valle. |
| v3 | Modal de detalle por día. Explorador de años. |
| v4 | Gráficos con Canvas. Búsqueda de bugs. |
| v5 | Tabla horaria reemplaza a los gráficos del modal. |
| v6 | Cota de nieve, UV, nubosidad, visibilidad, punto de rocío. |
| v7 | Resumen textual del día. Fase lunar. |
| v8 | Rediseño de "7 días". Búsqueda histórica por fecha. Gráfico del sol. Riesgo de incendio. Iconos SVG animados. |
| v9 | Eliminación de Canvas. Visualizaciones CSS puras (sparkline, barras, micro chart). |
| v10 | PWA shortcuts. "Sabías que". UV en 7 días. Fondo dinámico por hora. |
| v11 | Gráfico del sol tipo meteored con posición animada. |
| v12 | Efectos especiales (lluvia, nieve, niebla, tormenta). Stats del modal en badges compactos. |
| v13 | Fix del bloqueo por `weather-fx`. Manejo de errores robusto. Modo `?reset=1`. |
| v14 | Stats del modal con icono + etiqueta + valor en grilla alineada. |

---

## 📄 Licencia

Uso personal. Los datos climáticos provienen de fuentes públicas (Open-Meteo, SMN, INTA).

---

## 👥 Créditos

Proyecto desarrollado para uso personal en El Bolsón, Río Negro.

Datos climáticos:
- [Open-Meteo](https://open-meteo.com/) — pronóstico e histórico, gratuitos
- [SMN](https://www.smn.gob.ar/) — Servicio Meteorológico Nacional
- [INTA](https://inta.gob.ar/) — Instituto Nacional de Tecnología Agropecuaria

---

**Estado actual:** funcional, estable, 100% offline. Última versión: **v14**.