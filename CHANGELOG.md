# 📋 Changelog · El Bolsón Clima Local

Historial completo de versiones. A partir de la v38 se adopta el formato
**semver** (`MAYOR.MENOR.PARCHE`). Cada versión semver mantiene entre
paréntesis la referencia al número anterior (vXX) para trazabilidad.

## 📐 Reglas semver aplicadas

- **MAYOR** (X.0.0): cambio que rompe compatibilidad. Cambio de formato de
  datos, migración de IndexedDB, reestructuración de pestañas.
- **MENOR** (X.Y.0): funcionalidad nueva sin romper nada.
- **PARCHE** (X.Y.Z): corrección de bugs, ajustes visuales, reorganizaciones.

Los intentos fallidos (v21-v28) no consumen número semver porque no llegaron
a ser releases estables.

---

## 1.19.0 (v38) · 2025-10-08
**Alerta visual de cota de nieve baja**

- Detalle por día: si la cota de nieve media es menor a **350 m s.n.m.**, la
  tarjeta se destaca con fondo anaranjado, texto "¡Nieve en el valle!",
  emoji ⚠️ y animación pulsante.
- Nuevo bloque CSS `.stat-item.stat-alerta` con animación `pulse-alerta`.
- Función `statItem()` ahora acepta un cuarto parámetro opcional para clases.

---

## 1.18.1 (v37) · 2025-10-08
**Mover el bloque Reporte SNMF al final**

- El bloque "Reporte SNMF" pasó de estar entre el mapa y la lista de focos a
  estar **después de la lista de focos**, al final de la pestaña Emergencia.
- Cambio solo en `index.html`. Sin tocar CSS ni JS.

---

## 1.18.0 (v36) · 2025-10-08
**Reporte SNMF integrado en la pestaña Emergencia**

- Nuevo bloque "Reporte SNMF" en la pestaña Emergencia.
- Descarga el informe mensual del SNMF (incluye sección Regional Patagonia).
- Detección automática del mes esperado (mes anterior al actual).
- Intenta 3 URLs alternativas del sitio del gobierno.
- Barra de progreso con MB descargados durante la descarga.
- Guardado del PDF como Blob en IndexedDB (store `historical`, clave `snmf_YYYY-MM`).
- Visor embebido con `<iframe>` y botón de apertura externa como fallback.
- Botón "Borrar" con confirmación para liberar espacio.
- **Nota:** la descarga puede fallar por CORS. Pendiente test con mejor conexión.

---

## 1.17.1 (v35) · 2025-10-08
**Microclimas integrado en "Hoy"**

- Se eliminó la pestaña "Microclimas" como pestaña independiente.
- El bloque "Comparación del valle" ahora aparece dentro de la pestaña "Hoy",
  justo después de "Próximas 24 horas" y antes de "Actividades del valle".
- `renderMicroclimas()` sigue existiendo; ahora se llama desde `renderHoy()`.
- La app queda con 4 pestañas: Hoy, 7 días, Memoria, 🔥 Emergencia.

---

## 1.17.0 (v34) · 2025-10-08
**Viento sobre el mapa (Fase 7G)**

- Nueva capa "Viento" en el mapa de la pestaña Emergencia.
- Consulta Open-Meteo con 25 puntos en grilla sobre el área del mapa (5×5).
- Cada punto se dibuja como una flecha rotada según la dirección del viento.
- Color según velocidad: verde (<10), amarillo (10-25), naranja (25-45), rojo (>45).
- Tamaño de la flecha crece con la velocidad.
- Popup por punto con velocidad exacta y dirección meteorológica.
- Leyenda activable debajo del mapa.
- Botón `💨 Viento` con estado activo/inactivo, puede combinarse con la capa de antigüedad.

---

## 1.16.0 (v33) · 2025-10-08
**Capa WMS de antigüedad del fuego (Fase 3)**

- Nueva capa WMS sobre el mapa usando el servicio público de NASA FIRMS.
- Los focos se colorean según el tiempo desde la detección:
  0-6h, 6-12h, 12-24h, 24h+.
- Botón `🕒 Antigüedad` para activar/desactivar la capa.
- Endpoint: `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/time_since_detection_4/`.

---

## 1.15.0 (v32) · 2025-10-07
**Marcadores escalados por FRP (Fase 1)**

- Los círculos del mapa escalan de 6 a 22 px según el FRP (Fire Radiative Power).
- Los marcadores de la lista crecen de 30 a 42 px según el FRP.
- Clasificación por intensidad:
  - **Débil** (<5 MW) · Verde
  - **Moderado** (5-20 MW) · Amarillo
  - **Intenso** (20-50 MW) · Naranja
  - **Muy intenso** (>50 MW) · Rojo
- Nuevo badge de intensidad en cada item de la lista.
- Resumen superior muestra también el "Más intenso" con su FRP.
- Leyenda de escala FRP arriba del mapa.
- Popup extendido con explicación del significado del FRP.

---

## 1.14.0 (v31) · 2025-10-07
**Mapa interactivo con Leaflet local (Fase 3 emergencia)**

- Leaflet descargado localmente en `leaflet/leaflet.js` y `leaflet/leaflet.css`
  (no se carga desde CDN).
- Carga diferida: Leaflet solo se carga cuando abrís la pestaña Emergencia.
- Fallback robusto: si Leaflet falla, la lista sigue funcionando.
- Mapa con tiles de OpenStreetMap, filtro CSS para tema oscuro.
- Botón de recentrar en El Bolsón.
- Marcador de referencia del centro.
- Los focos se dibujan como círculos SVG con borde según confianza y relleno
  según intensidad.
- Al tocar un item de la lista, el mapa se centra en ese foco.

---

## 1.13.1 (v30) · 2025-10-07
**Emergencia Ígnea sin contactos ni recomendaciones**

- Se eliminaron los bloques "Contactos de emergencia" y "Recomendaciones" de
  la pestaña Emergencia.
- Solo quedan: resumen, mapa y lista de focos.

---

## 1.13.0 (v29) · 2025-10-07
**Emergencia Ígnea v1 (sin mapa)**

- Nueva pestaña "🔥 Emergencia" con integración a NASA FIRMS.
- Archivo nuevo `js/fire-emergency.js` autocontenido (no toca `app.js`).
- Consulta el CSV de FIRMS con VIIRS Suomi-NPP en un bounding box de ~100 km.
- Lista de focos con distancia desde El Bolsón, dirección, fecha, satélite,
  confianza y FRP.
- Resumen superior con 3 tarjetas: focos detectados, más cercano, más reciente.
- Caché de 30 minutos para no saturar la API.

---

## 1.12.3 (v26) · 2025-10-07
**Reversión al estado estable**

- Se revirtió todo lo relacionado con el aeródromo (Ogimet, NCEI, METAR, proxies).
- Se restauró el estado anterior a la v21 (la app funcionaba bien).
- Decisión: no usar datos del aeródromo por problemas de CORS/HTTP/HTTPS.

---

## 1.12.2 (v20) · 2025-10-07
**Fuente de datos en el header**

- El header ahora muestra "Fuente: Open-Meteo" en lugar de "Datos reales".
- Texto de estado: "Estimación local · tocá ⟳ para actualizar con Open-Meteo".

---

## 1.12.1 (v19) · 2025-10-06
**Datos históricos completos 1940-2025**

- El archivo `historical.json` ahora incluye detalle mensual para **todos los
  años desde 1940 hasta 2025** (86 años × 12 meses).
- Antes solo tenía detalle real para 2015-2025; los años anteriores se
  estimaban online.
- Se agregó la estructura `monthly_recent[año] = { temp: [...], precip: [...] }`.

---

## 1.12.0 (v18) · 2025-10-06
**Rediseño de la sección Memoria**

- **Bloque 1 (Buscar por fecha):** ahora trae más datos del archive —
  sensación térmica máx/mín, horas de lluvia, nieve, dirección del viento,
  radiación solar, evapotranspiración, duración del día.
- **Bloque 2 (Explorar por año):** eliminada la "invención" de datos. Ahora
  consulta Open-Meteo si el año no está en el dataset local.
- **Bloque 3:** reemplazado el sparkline de temperatura por uno de
  **precipitación** con selector de rango (1940-2025, 1980-2025, etc.).
- **Bloque 4:** nueva comparación año vs. promedio + máximos y mínimos
  históricos por mes.
- **Bloque 5 (Récords locales):** eliminado por falta de funcionalidad.
- Nuevo botón ℹ️ en cada bloque con modal explicativo.

---

## 1.11.1 (v17) · 2025-10-06
**Fix del gráfico de tendencia de precipitación**

- El sparkline ahora incluye:
  - 3 tarjetas de resumen (promedio, más lluvioso, más seco).
  - Línea horizontal de promedio con etiqueta.
  - Valores visibles en barras extremas.
  - Barras clicables con tooltip (año + valor + diferencia).
  - Colores por categoría: celeste lluvioso, gris normal, marrón seco.

---

## 1.11.0 (v16) · 2025-10-06
**Rediseño inicial de la sección Memoria**

- Se agregó el bloque "Buscar por fecha" que consulta Open-Meteo Archive.
- Se agregó el bloque "Explorar por año" con selector.
- Se agregó "Tendencia anual desde 1940" con sparkline de 86 barritas.
- Se agregó "Precipitación mensual típica".

---

## 1.10.0 (v15) · 2025-10-06
**Probabilidad de lluvia + acceso al detalle**

- La tira de 24 horas ahora muestra el **% de probabilidad de precipitación**
  debajo de la precipitación real (si ≥ 20%).
- Nuevo botón **"Ver detalle completo del día →"** en el hero de "Hoy".
- Abre el mismo modal que en "7 días" con el día 0 (hoy).

---

## 1.9.2 (v14) · 2025-10-06
**Stats del modal con icono + etiqueta + valor**

- Se reemplazaron los badges compactos por una grilla 2×N de stat-cards.
- Cada stat tiene: icono a la izquierda, etiqueta arriba y valor abajo.
- Todos alineados en columnas, misma altura.

---

## 1.9.1 (v13) · 2025-10-05
**Fix del bloqueo por `weather-fx`**

- El `<div id="weather-fx">` ya no está en el HTML. Se crea dinámicamente
  desde JS solo cuando hay un efecto real (lluvia/nieve/niebla/tormenta).
- Se agregó try/catch robusto en `init()` y cada `render*()`.
- Modo recuperación con `?reset=1` en la URL.

---

## 1.9.0 (v12) · 2025-10-05
**Efectos especiales + stats compactos**

- Nuevos efectos visuales de fondo: lluvia, nieve, niebla, tormenta.
- Los badges del modal se compactaron en una sola fila.
- Se agregaron nuevos datos: UV, nubosidad, incendio.

---

## 1.8.0 (v11) · 2025-10-05
**Gráfico del sol tipo meteored**

- El widget del sol ahora es un arco SVG con posición animada.
- Muestra salida, duración del día y puesta con etiquetas.
- De noche: arco punteado sin sol pero con horas visibles.
- Se usa tanto en el hero de "Hoy" como en el modal del día.

---

## 1.7.0 (v10) · 2025-10-05
**PWA shortcuts + Sabías que + UV + fondo dinámico**

- **Atajos PWA:** al mantener presionado el ícono en Android aparecen 4 atajos.
- **"Sabías que…":** tarjeta con 25 datos curiosos del valle, rota cada día.
- **UV en 7 días:** cada fila muestra el UV máximo del día.
- **Fondo dinámico:** cambia según la hora real (amanecer, día, atardecer, noche).

---

## 1.6.1 (v9) · 2025-10-04
**Eliminación de Canvas**

- Se eliminaron todas las visualizaciones con Canvas por problemas de
  deformación al scrollear en móvil.
- Se reemplazaron por CSS puro: tira horizontal de tarjetas, barras CSS,
  sparklines CSS.

---

## 1.6.0 (v8) · 2025-10-04
**Rediseño de "7 días" + búsqueda histórica + sol + incendio + SVG**

- **Rediseño de "7 días":** lista compacta con icono SVG animado del cielo,
  temperaturas, precipitación, viento, ráfagas, UV, salida/puesta sol y punto
  de riesgo de incendio.
- **Búsqueda por fecha:** consulta Open-Meteo Archive para cualquier día
  desde 1940. Se guarda en IndexedDB.
- **Gráfico del sol:** cálculo astronómico completo.
- **Riesgo de incendio:** índice 0-100 calculado localmente.
- **Iconos SVG animados:** sol con rayos rotando, nubes moviéndose, gotas de
  lluvia cayendo, copos de nieve, niebla ondulante, rayo parpadeante.

---

## 1.5.0 (v7) · 2025-10-04
**Resumen textual + fase lunar**

- Nuevo resumen textual del día generado a partir de los datos.
- Se agregó la fase lunar (cálculo offline, sin API).

---

## 1.4.0 (v6) · 2025-10-04
**Nuevos datos: cota de nieve, UV, nubosidad, visibilidad, punto de rocío**

- Se agregaron esos 5 parámetros a la descarga de Open-Meteo y al generador
  offline.
- Se agregó la columna de ráfagas a la tabla horaria.

---

## 1.3.1 (v5) · 2025-10-04
**Tabla horaria en el modal**

- El modal de detalle por día reemplazó los gráficos por una tabla con:
  hora, temperatura, precipitación y viento (dirección + ráfaga).
- Corrección del modal: eliminado el "drag handle" y el botón ✕ duplicado.
- Eliminada la pestaña de observaciones.

---

## 1.3.0 (v4) · 2025-10-04
**Gráficos con Canvas + bugs**

- Primer intento de gráficos con Canvas API.
- Se agregó el detalle por día con gráficos interactivos (temp, precip, viento).
- Bug conocido: los gráficos se deformaban al scrollear. Se resolvió en v9.

---

## 1.2.0 (v3) · 2025-10-04
**Modal de detalle + explorador de años**

- Nuevo modal de detalle por día (al tocar cualquier día en "7 días").
- Nueva sección "Explorar por año" con selector 1940-2025.
- Gráficos de año vs. referencia.

---

## 1.1.0 (v2) · 2025-10-04
**Generador offline + alertas + actividades**

- Nuevo archivo `js/initial-forecast.js`: generador de pronóstico 100% offline
  basado en ruido determinístico sobre la línea base.
- Alertas locales: helada, viento fuerte, lluvia intensa, calor extremo.
- Actividades del valle: podar, río, montaña, heladas, nieve en cordón.

---

## 1.0.0 (v1) · 2025-10-03
**Prototipo inicial**

- App HTML+CSS+JS con 4 pestañas: Hoy, 7 días, Microclimas, Memoria.
- Pronóstico 7 días con datos precargados.
- Comparación con media histórica mensual.
- Panel de microclimas (centro, Mallín Ahogado, Lago Puelo).
- PWA básica con Service Worker.
- Fuentes: Open-Meteo (pronóstico) + datos locales en JSON.

---

## ❌ Intentos fallidos (documentados para no repetir)

Estos intentos no llegaron a ser releases estables y no consumieron número
semver. Quedan documentados para evitar repetir los mismos caminos.

1. **Integración con Ogimet** (entre 1.12.2 y 1.12.3): solo HTTP, bloqueado
   por HTTPS. GitHub Pages sirve por HTTPS y el navegador bloquea el fetch
   por mixed content.
2. **NOAA NCEI GSOD** (mismo período): sin CORS habilitado.
3. **CORS proxy público** (mismo período): proxies caídos o saturados
   (allorigins, corsproxy.io, codetabs).
4. **Cloudflare Worker** (mismo período): se decidió no crear un proxy propio.
5. **METAR de aviationweather.gov** (mismo período): solo da últimas 24h,
   no histórico.
6. **Leaflet desde CDN** (entre 1.12.3 y 1.13.0): cargaba mal y rompía la app.
   La solución fue descargar Leaflet localmente.
7. **Filtro STA de FIRMS** (post 1.17.0): la capa no está disponible en la
   API pública, solo en el visor web de FIRMS.

---

## 🧭 Resumen por etapas semver

| Etapa | Versiones | Enfoque |
|---|---|---|
| Prototipo | 1.0.0 → 1.1.0 | Estructura básica + offline |
| Expansión | 1.2.0 → 1.6.0 | Datos nuevos, modal, búsqueda histórica |
| Estabilización | 1.6.1 → 1.9.2 | Fix de bugs, mejoras visuales |
| Interacción | 1.10.0 → 1.12.3 | Detalle de día, memoria rediseñada |
| Emergencia Ígnea | 1.13.0 → 1.17.0 | NASA FIRMS + mapa + capas |
| Cierre | 1.17.1 → 1.19.0 | Microclimas integrado, SNMF, alerta cota |

---

## 📦 Estructura final del proyecto
