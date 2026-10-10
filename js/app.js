const App = (() => {
  let baseline = null;
  let historical = null;
  let forecastActual = null;
  let fxElement = null;

  const SABIAS = [
    'El Bolsón tiene un microclima único: protegido por los cerros Piltriquitrón y Lindo, recibe menos viento que otras zonas de la Patagonia.',
    'El mes más lluvioso del año es junio, con unos 192 mm en promedio.',
    'El mes más seco es febrero, con apenas 31 mm promedio.',
    'La precipitación anual promedio es de 956 mm —casi el doble que Buenos Aires.',
    'La temperatura media anual ronda los 10°C. Rara vez baja de -10°C o sube de 35°C.',
    'El récord de frío en el valle fue de -14°C en julio de 1995.',
    'El récord de calor fue de 38.5°C en febrero de 2024.',
    'El verano 2024 fue el más cálido registrado, con 21.7°C promedio en enero.',
    'Los vientos predominantes vienen del oeste y noroeste, encajonados por el valle.',
    'El Bolsón es famoso por sus "cuatro estaciones en un día": podés empezar con sol y terminar con lluvia y viento en pocas horas.',
    'La nieve puede llegar al valle entre mayo y septiembre, aunque rara vez acumula más de unos centímetros.',
    'El lago Puelo, al sur, modera las temperaturas de su entorno: suele ser 1-2°C más templado que el centro.',
    'Mallín Ahogado, al norte, es típicamente 0.5-1°C más frío que el centro por su mayor altitud.',
    'El período libre de heladas en el valle dura aproximadamente 5 meses, de noviembre a marzo.',
    'Las heladas tardías de noviembre son el principal riesgo para los cultivos de la zona.',
    'El bosque andino-patagónico que rodea El Bolsón genera un microclima más húmedo que la estepa al este.',
    'La diferencia de temperatura entre el día y la noche puede superar los 15°C en verano.',
    'En invierno, la cota de nieve suele bajar a 800-1200 m, cubriendo los cerros que rodean el valle.',
    'El viento blanco —nieve levantada por viento fuerte— es un fenómeno típico de las zonas altas cercanas.',
    'El viento zonda, cálido y seco, puede hacer subir la temperatura 10°C en pocas horas.',
    'La humedad relativa promedio en el valle es alta, entre 60 y 75%.',
    'El sol en El Bolsón puede ser intenso: en verano el índice UV llega a 11 (extremo) en días despejados.',
    'El arco iris es frecuente por la combinación de sol y lluvias breves de la región.',
    'La niebla matinal es común en otoño, especialmente cerca del río Quemquemtreu.',
    'El clima del valle permite cultivos como lúpulo, frutas finas y aromáticas, típicos de la zona.'
  ];

  function mostrarError(msg) {
    const el = document.getElementById('app-error');
    if (!el) return;
    el.textContent = '⚠️ ' + msg;
    el.style.display = 'block';
  }
  function ocultarError() {
    const el = document.getElementById('app-error');
    if (el) el.style.display = 'none';
  }

  async function modoReset() {
    try {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('bolson-clima');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
      try { localStorage.clear(); } catch {}
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      location.replace(location.pathname);
    } catch (e) {
      location.replace(location.pathname);
    }
  }

  async function cargarBaseline() {
    const r = await fetch('data/climate-baseline.json');
    baseline = await r.json();
  }
  async function cargarHistorical() {
    if (historical) return historical;
    try {
      const r = await fetch('data/historical.json');
      historical = await r.json();
    } catch { historical = null; }
    return historical;
  }

  function mediaHistoricaMes(mes) {
    if (!baseline) return null;
    const n = baseline.normales_mensuales.find(x => x.mes === mes);
    return n ? n.t_mean : null;
  }

  function resumenDia(dia, horas) {
    const tMedia = (dia.t_max + dia.t_min) / 2;
    let tempTxt;
    if (tMedia >= 25) tempTxt = 'Caluroso';
    else if (tMedia >= 18) tempTxt = 'Templado';
    else if (tMedia >= 10) tempTxt = 'Fresco';
    else if (tMedia >= 3) tempTxt = 'Frío';
    else tempTxt = 'Muy frío';

    const precipTotal = horas.reduce((s, h) => s + h.precip, 0);
    let precipTxt;
    if (precipTotal > 20) precipTxt = 'con lluvias intensas';
    else if (precipTotal > 5) precipTxt = 'con lluvias';
    else if (precipTotal > 0.5) precipTxt = 'con lloviznas';
    else precipTxt = 'sin precipitaciones';

    const rachaMax = Math.max(...horas.map(h => h.racha));
    let vientoTxt;
    if (rachaMax >= 80) vientoTxt = 'ráfagas muy fuertes';
    else if (rachaMax >= 60) vientoTxt = 'ráfagas fuertes';
    else if (rachaMax >= 40) vientoTxt = 'viento moderado';
    else vientoTxt = 'viento leve';

    const dirs = horas.map(h => h.vientoDir).filter(d => d != null);
    let dirTxt = '';
    if (dirs.length) {
      const prom = dirs.reduce((a, b) => a + b, 0) / dirs.length;
      dirTxt = ` del <strong>${DataFetcher.gradosADireccion(prom)}</strong>`;
    }

    let resumen = `${tempTxt}, ${precipTxt} y ${vientoTxt}${dirTxt}.`;
    if (dia.cotaNieve && dia.cotaNieve < 1300) {
      resumen += ` Nieve en altura a partir de los <strong>${dia.cotaNieve} m</strong>.`;
    }
    return resumen;
  }

  function actualizarFondo() {
    try {
      const ahora = new Date();
      const sol = Sun.times(ahora, -41.96, -71.53, -3);
      const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
      let clase;
      if (sol.polarDay) {
        clase = 'bg-day';
      } else if (sol.polarNight) {
        clase = 'bg-night';
      } else {
        const sr = sol.sunrise;
        const ss = sol.sunset;
        if (horaActual < sr - 1 || horaActual > ss + 1) clase = 'bg-night';
        else if (horaActual < sr + 1) clase = 'bg-dawn';
        else if (horaActual < ss - 1) clase = 'bg-day';
        else clase = 'bg-dusk';
      }
      document.body.classList.remove('bg-dawn', 'bg-day', 'bg-dusk', 'bg-night');
      document.body.classList.add(clase);
    } catch (e) {}
  }

  function tipoEfecto(code) {
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
    if (code === 45 || code === 48) return 'fog';
    return 'none';
  }

  function destruirEfectos() {
    if (fxElement && fxElement.parentNode) {
      fxElement.parentNode.removeChild(fxElement);
    }
    fxElement = null;
  }

  function actualizarEfectos() {
    try {
      if (!forecastActual) return;
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const h = forecastActual.hourly.find(x => new Date(x.t).getHours() === horaActual)
        || forecastActual.hourly[0];
      const tipo = tipoEfecto(h.code);

      if (tipo === 'none') {
        destruirEfectos();
        return;
      }
      if (fxElement && fxElement.dataset.tipo === tipo) return;

      destruirEfectos();
      fxElement = document.createElement('div');
      fxElement.className = 'weather-fx';
      fxElement.setAttribute('aria-hidden', 'true');
      fxElement.dataset.tipo = tipo;

      if (tipo === 'rain' || tipo === 'storm') {
        const n = tipo === 'storm' ? 55 : 40;
        for (let i = 0; i < n; i++) {
          const d = document.createElement('div');
          d.className = 'drop';
          d.style.left = Math.random() * 100 + '%';
          d.style.animationDuration = (0.7 + Math.random() * 0.9).toFixed(2) + 's';
          d.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
          d.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);
          fxElement.appendChild(d);
        }
        if (tipo === 'storm') {
          const f = document.createElement('div');
          f.className = 'flash';
          fxElement.appendChild(f);
        }
      } else if (tipo === 'snow') {
        for (let i = 0; i < 30; i++) {
          const f = document.createElement('div');
          f.className = 'flake';
          f.style.left = Math.random() * 100 + '%';
          f.style.animationDuration = (5 + Math.random() * 6).toFixed(2) + 's';
          f.style.animationDelay = (Math.random() * 8).toFixed(2) + 's';
          const size = (2 + Math.random() * 3).toFixed(1);
          f.style.width = size + 'px';
          f.style.height = size + 'px';
          fxElement.appendChild(f);
        }
      } else if (tipo === 'fog') {
        const l = document.createElement('div');
        l.className = 'fog-layer';
        fxElement.appendChild(l);
      }

      document.body.insertBefore(fxElement, document.body.firstChild);
    } catch (e) {}
  }

  function renderSabias() {
    try {
      const hoy = new Date();
      const inicio = new Date(hoy.getFullYear(), 0, 0);
      const doy = Math.floor((hoy - inicio) / 86400000);
      const fact = SABIAS[doy % SABIAS.length];
      document.getElementById('sabias-card').innerHTML = `
        <div class="sabias-header">💡 Sabías que…</div>
        <div class="sabias-text">${fact}</div>
      `;
    } catch (e) {}
  }

  function renderHoy() {
    try {
      if (!forecastActual) {
        document.getElementById('desc-actual').textContent = 'Sin datos. Toca ⟳ para actualizar.';
        return;
      }
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const h = forecastActual.hourly.find(x => new Date(x.t).getHours() === horaActual) || forecastActual.hourly[0];

      document.getElementById('temp-actual').textContent = Math.round(h.temp);
      document.getElementById('desc-actual').textContent = DataFetcher.wmoToDesc(h.code);
      document.getElementById('hero-icon').innerHTML = Sky.icon(h.code, 70);
      document.getElementById('sensacion').textContent = Math.round(h.sens) + '°';
      document.getElementById('viento').textContent = Math.round(h.viento) + ' km/h';
      document.getElementById('humedad').textContent = h.hum + '%';
      document.getElementById('presion').textContent = Math.round(h.presion) + ' hPa';

      const media = mediaHistoricaMes(new Date().getMonth() + 1);
      if (media) {
        const diff = h.temp - media;
        const signo = diff >= 0 ? '+' : '';
        const clase = Math.abs(diff) < 1.5 ? 'Normal para la fecha'
          : diff > 0 ? 'Por encima de lo normal' : 'Por debajo de lo normal';
        const fuente = forecastActual.fuente === 'generado-local'
          ? ' · <em>estimación offline</em>' : '';
        document.getElementById('comparacion-hoy').innerHTML =
          `Media histórica de hoy: <strong>${media.toFixed(1)}°C</strong> · Actual: <strong>${h.temp.toFixed(1)}°C</strong> (${signo}${diff.toFixed(1)}°C) — ${clase}${fuente}`;
      }

      const hoy = forecastActual.daily[0];
      const horasHoy = forecastActual.hourly.filter(x => x.t.startsWith(hoy.fecha));
      document.getElementById('resumen-hoy').innerHTML = resumenDia(hoy, horasHoy);

      const btnDetalle = document.getElementById('btn-detalle-hoy');
      if (btnDetalle) {
        btnDetalle.onclick = () => abrirDetalleDia(0);
      }

      try {
        const sol = Sun.times(new Date(), -41.96, -71.53, -3);
        const luna = DataFetcher.moonPhaseInfo(new Date());
        document.getElementById('hero-sun').innerHTML = Sun.widget(sol, {
          ahora: new Date(), esHoy: true, luna, mostrarLuna: true, compact: true
        });
      } catch (e) {
        document.getElementById('hero-sun').innerHTML = '';
      }

      const alertas = Alerts.evaluar(forecastActual);
      document.getElementById('alertas-container').innerHTML = alertas.map(a =>
        `<div class="alerta ${a.tipo}">${a.texto}</div>`
      ).join('');

      const fire = Fire.riskForDay(horasHoy);
      if (fire) {
        document.getElementById('fire-card').innerHTML = `
          <div class="fire-row">
            <span class="fire-emoji">🔥</span>
            <div class="fire-info">
              <span class="fire-label">Riesgo de incendio</span>
              <span class="fire-level" style="color:${fire.color}">${fire.nivel}</span>
            </div>
            <div class="fire-score">${fire.score}<small>/100</small></div>
          </div>
          <div class="fire-bar"><div class="fire-bar-fill" style="width:${fire.score}%;background:${fire.color}"></div></div>
        `;
      }

      renderStrip24h(forecastActual.hourly.slice(horaActual, horaActual + 24));
      renderMicroclimas();

      const acts = Alerts.actividades(forecastActual, 0);
      document.getElementById('actividades').innerHTML = acts.map(a => `
        <div class="actividad">
          <span class="nombre">${a.nombre}</span>
          <span class="estado ${a.estado}">${a.label}</span>
        </div>`).join('');

      renderSabias();
      actualizarEfectos();
    } catch (e) {
      mostrarError('Error al renderizar "Hoy": ' + (e.message || e));
    }
  }

  function renderStrip24h(horas) {
    const cont = document.getElementById('strip-24h');
    const ahora = new Date();
    const horaActual = ahora.getHours();
    cont.innerHTML = horas.map(h => {
      const hr = new Date(h.t).getHours();
      const horaStr = String(hr).padStart(2, '0') + 'h';
      const esAhora = hr === horaActual && new Date(h.t).toDateString() === ahora.toDateString();
      const precip = h.precip >= 0.1 ? h.precip.toFixed(1) + 'mm' : '';
      const prob = h.precipProb != null && h.precipProb >= 20 ? h.precipProb + '%' : '';
      return `<div class="hourly-card ${esAhora ? 'now' : ''}">
        <span class="hc-hora">${horaStr}</span>
        <span class="hc-sky">${Sky.icon(h.code, 32)}</span>
        <span class="hc-temp">${Math.round(h.temp)}°</span>
        <span class="hc-precip ${precip ? '' : 'zero'}">${precip}</span>
        <span class="hc-prob ${prob ? '' : 'zero'}">${prob || '—'}</span>
      </div>`;
    }).join('');
  }

  function renderPronostico() {
    try {
      if (!forecastActual) return;
      const cont = document.getElementById('lista-7d');

      cont.innerHTML = forecastActual.daily.map((d, i) => {
        const fecha = new Date(d.fecha + 'T12:00:00');
        const nombre = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
          : fecha.toLocaleDateString('es-AR', { weekday: 'short' });
        const dia = String(fecha.getDate()).padStart(2, '0') + '/' + String(fecha.getMonth() + 1).padStart(2, '0');

        const sol = Sun.times(fecha, -41.96, -71.53, -3);
        const horasDia = forecastActual.hourly.filter(x => x.t.startsWith(d.fecha));
        const fire = Fire.riskForDay(horasDia);

        const sr = sol.polarDay ? '--:--' : Sun.fmt(sol.sunrise);
        const ss = sol.polarDay ? '--:--' : Sun.fmt(sol.sunset);
        const precip = d.precip > 0 ? d.precip.toFixed(1) : '0';
        const viento = Math.round(d.viento_max);
        const racha = Math.round(d.racha_max);
        const uv = d.uv_max != null ? Math.round(d.uv_max) : '—';
        const probMax = d.precipProb != null ? d.precipProb : null;
        const probTxt = probMax != null && probMax >= 20 ? probMax + '%' : '';
        const fireDot = fire ? `<span class="wr-fire-dot" style="background:${fire.color}" title="Incendio: ${fire.nivel}"></span>` : '';

        return `<div class="week-row" data-dia="${i}">
          <div class="week-day">
            <span class="wr-dname">${nombre}</span>
            <span class="wr-ddate">${dia}</span>
          </div>
          <div class="wr-sky">${Sky.icon(d.code, 40)}</div>
          <div class="wr-temps">
            <span class="wr-tmax">${Math.round(d.t_max)}°</span>
            <span class="wr-tmin">${Math.round(d.t_min)}°</span>
          </div>
          <div class="wr-info">
            <span class="wr-i">💧<b>${precip}</b></span>
            <span class="wr-i">🌧️<b>${probTxt || '—'}</b></span>
            <span class="wr-i">💨<b>${viento}</b></span>
            <span class="wr-i">💨<b>R:${racha}</b></span>
            <span class="wr-i">☀️<b>${uv}</b></span>
            <span class="wr-i">🌅<b>${sr}</b></span>
            <span class="wr-i">🌇<b>${ss}</b></span>
            <span class="wr-i">${fireDot}</span>
          </div>
        </div>`;
      }).join('');

      cont.querySelectorAll('.week-row').forEach(el => {
        el.onclick = () => abrirDetalleDia(Number(el.dataset.dia));
      });
    } catch (e) {
      mostrarError('Error en "7 días": ' + (e.message || e));
    }
  }

  function filaHoraria(h, esHoraActual) {
    const hora = String(new Date(h.t).getHours()).padStart(2, '0') + 'h';
    const t = h.temp.toFixed(1) + '°';
    const tienePrecip = h.precip >= 0.1;
    const prob = h.precipProb != null && h.precipProb >= 20 && !tienePrecip
      ? `<span class="prob">${h.precipProb}%</span>` : '';
    const p = tienePrecip ? h.precip.toFixed(1) + ' mm' : '—';
    const flecha = DataFetcher.gradosAFlecha(h.vientoDir);
    const dir = DataFetcher.gradosADireccion(h.vientoDir);
    const v = Math.round(h.viento);
    const r = Math.round(h.racha);
    return `<div class="hourly-row ${esHoraActual ? 'now' : ''}">
      <span class="hour">${hora}</span>
      <span class="temp">${t}</span>
      <span class="precip ${tienePrecip ? '' : 'zero'}">${p}${prob}</span>
      <span class="wind"><span class="dir">${flecha} ${dir}</span> <span class="speed">${v}</span><span class="gust">R:${r}</span></span>
    </div>`;
  }

  // statItem: acepta una clase extra opcional para destacar la tarjeta
  function statItem(icon, label, value, extraClass = '') {
    return `<div class="stat-item ${extraClass}">
      <span class="si-icon">${icon}</span>
      <div class="si-body">
        <span class="si-lbl">${label}</span>
        <span class="si-val">${value}</span>
      </div>
    </div>`;
  }

  function abrirDetalleDia(index) {
    try {
      if (!forecastActual || !forecastActual.daily[index]) return;
      const dia = forecastActual.daily[index];
      const fecha = new Date(dia.fecha + 'T12:00:00');
      const mes = fecha.getMonth() + 1;
      const media = mediaHistoricaMes(mes);
      const horas = forecastActual.hourly.filter(h => h.t.startsWith(dia.fecha));

      const nombreDia = fecha.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      const tempMax = Math.max(...horas.map(h => h.temp));
      const tempMin = Math.min(...horas.map(h => h.temp));
      const precipTotal = horas.reduce((s, h) => s + h.precip, 0);
      const vientoMax = Math.max(...horas.map(h => h.viento));
      const rachaMax = Math.max(...horas.map(h => h.racha));
      const uvMax = Math.max(...horas.map(h => h.uv || 0));
      const nubosidadMedia = Math.round(horas.reduce((s, h) => s + (h.cloud || 0), 0) / horas.length);
      const humedadMedia = Math.round(horas.reduce((s, h) => s + (h.hum || 0), 0) / horas.length);

      const visMedias = horas.map(h => h.vis).filter(v => v != null);
      const visMedia = visMedias.length
        ? (visMedias.reduce((a, b) => a + b, 0) / visMedias.length) / 1000
        : null;

      const rocios = horas.map(h => h.dew).filter(v => v != null);
      const rocioMedio = rocios.length
        ? rocios.reduce((a, b) => a + b, 0) / rocios.length
        : null;

      const cotas = horas.map(h => h.cotaNieve).filter(v => v != null);
      const cotaMedia = cotas.length ? Math.round(cotas.reduce((a, b) => a + b, 0) / cotas.length) : null;

      const faseLunar = DataFetcher.moonPhaseInfo(fecha);
      const sol = Sun.times(fecha, -41.96, -71.53, -3);
      const fire = Fire.riskForDay(horas);

      let comparativaHTML = '';
      if (media) {
        const diff = ((dia.t_max + dia.t_min) / 2) - media;
        const signo = diff >= 0 ? '+' : '';
        const clase = Math.abs(diff) < 1.5 ? 'Normal para la época'
          : diff > 0 ? 'Más cálido de lo normal' : 'Más frío de lo normal';
        comparativaHTML = `<div class="modal-comparativa">
          Media histórica del mes: <strong>${media.toFixed(1)}°C</strong>.
          Este día promedia <strong>${(((dia.t_max + dia.t_min) / 2)).toFixed(1)}°C</strong>
          (${signo}${diff.toFixed(1)}°C) — ${clase}.
        </div>`;
      }

      const acts = Alerts.actividades(forecastActual, index);
      const actsHTML = acts.map(a => `
        <div class="actividad">
          <span class="nombre">${a.nombre}</span>
          <span class="estado ${a.estado}">${a.label}</span>
        </div>`).join('');

      const ahora = new Date();
      const esHoy = dia.fecha === ahora.toISOString().slice(0, 10);
      const horaActual = ahora.getHours();

      const filas = horas.map(h => {
        const esHoraActual = esHoy && new Date(h.t).getHours() === horaActual;
        return filaHoraria(h, esHoraActual);
      }).join('');

      const resumen = resumenDia(dia, horas);

      let fireStatHTML = '';
      if (fire) {
        fireStatHTML = `<div class="stat-item">
          <span class="si-icon">🔥</span>
          <div class="si-body">
            <span class="si-lbl">Incendio</span>
            <span class="si-val fire-row"><span class="dot" style="background:${fire.color}"></span>${fire.nivel}</span>
          </div>
        </div>`;
      }

      // ===== DETECCIÓN DE COTA DE NIEVE BAJA =====
      // Si la cota media es menor a 350 m s.n.m., hay riesgo de nieve
      // prácticamente al nivel del valle (El Bolsón está a ~300 m).
      const cotaEsBaja = cotaMedia != null && cotaMedia < 350;
      const cotaValorHTML = cotaMedia != null
        ? `${cotaMedia} m${cotaEsBaja ? ' ⚠️' : ''}`
        : '—';

      const statsHTML = [
        statItem('🌧️', 'Precipitación', precipTotal > 0 ? precipTotal.toFixed(1) + ' mm' : '—'),
        statItem(
          '❄️',
          cotaEsBaja ? '¡Nieve en el valle!' : 'Cota nieve',
          cotaValorHTML,
          cotaEsBaja ? 'stat-alerta' : ''
        ),
        statItem('💨', 'Viento máx', vientoMax + ' km/h'),
        statItem('🌀', 'Ráfagas máx', rachaMax + ' km/h'),
        statItem('💧', 'Humedad media', humedadMedia + '%'),
        statItem('👁️', 'Visibilidad', visMedia != null ? visMedia.toFixed(0) + ' km' : '—'),
        statItem('🌡️', 'Punto rocío', rocioMedio != null ? rocioMedio.toFixed(1) + '°C' : '—'),
        statItem(faseLunar.icon, 'Fase lunar', faseLunar.nombre),
        uvMax > 0 ? statItem('☀️', 'Índice UV', uvMax.toFixed(1)) : '',
        statItem('☁️', 'Nubosidad', nubosidadMedia + '%'),
        fireStatHTML
      ].filter(Boolean).join('');

      let sunWidgetHTML = '';
      try {
        sunWidgetHTML = Sun.widget(sol, {
          ahora: new Date(), esHoy: esHoy, luna: faseLunar, mostrarLuna: false
        });
      } catch (e) { sunWidgetHTML = ''; }

      document.getElementById('modal-body').innerHTML = `
        <div class="modal-header">
          <div class="fecha">${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}</div>
          <div class="fecha-sub">Día ${index + 1} del pronóstico</div>
        </div>

        <div class="modal-hero">
          <div class="icon">${Sky.icon(dia.code, 64)}</div>
          <div class="desc">
            <div class="nombre">${DataFetcher.wmoToDesc(dia.code)}</div>
            <div class="temps">
              ${Math.round(tempMax)}°
              <span class="min">${Math.round(tempMin)}°</span>
            </div>
          </div>
        </div>

        <div class="modal-stats">${statsHTML}</div>

        <div class="resumen-dia">${resumen}</div>

        ${sunWidgetHTML}

        ${comparativaHTML}

        <div class="modal-seccion">
          <h3>Detalle hora por hora</h3>
          <div class="hourly-list">
            <div class="hourly-row header">
              <span style="text-align:left">Hora</span>
              <span>Temp</span>
              <span>Precip</span>
              <span style="text-align:right">Viento</span>
            </div>
            ${filas}
          </div>
        </div>

        <div class="modal-seccion">
          <h3>Actividades para este día</h3>
          <div class="actividades">${actsHTML}</div>
        </div>
      `;

      const modal = document.getElementById('modal-dia');
      modal.classList.remove('hidden');
      document.getElementById('modal-content').scrollTop = 0;
      document.body.style.overflow = 'hidden';
    } catch (e) {
      mostrarError('Error al abrir el detalle: ' + (e.message || e));
    }
  }

  function cerrarModal() {
    document.getElementById('modal-dia').classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function renderMicroclimas() {
    try {
      const puntos = ['centro', 'mallin_ahogado', 'lago_puelo'];
      const datos = [];
      for (const p of puntos) {
        const f = await Storage.get('forecast', 'forecast_' + p);
        if (f) datos.push(f);
      }
      const cont = document.getElementById('micro-chart');
      if (!cont) return;
      if (!datos.length) {
        cont.innerHTML = '<p class="muted">Sin datos. Actualizá primero.</p>';
        return;
      }

      const nombreBonito = (k) => k.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

      const filas = datos.map(d => {
        const dia = d.daily[0];
        const horas = d.hourly.filter(h => h.t.startsWith(dia.fecha));
        const tmax = Math.max(...horas.map(h => h.temp));
        const tmin = Math.min(...horas.map(h => h.temp));
        const precip = horas.reduce((s, h) => s + h.precip, 0);
        const viento = Math.max(...horas.map(h => h.viento));
        return { key: d.punto, nombre: nombreBonito(d.punto), tmax, tmin, precip, viento };
      });

      const maxTmax = Math.max(...filas.map(f => f.tmax));
      const minTmin = Math.min(...filas.map(f => f.tmin));
      const maxPrecip = Math.max(...filas.map(f => f.precip), 1);
      const maxViento = Math.max(...filas.map(f => f.viento), 1);
      const tRange = Math.max(1, maxTmax - minTmin + 1);

      const barraT = (f) => {
        const ancho = ((f.tmax - minTmin + 1) / tRange) * 100;
        return `<div class="mc-row">
          <span class="mc-name">${f.nombre}</span>
          <div class="mc-track"><div class="mc-fill" style="width:${ancho}%;background:linear-gradient(90deg,#62b6cb,#f4a261)"></div></div>
          <span class="mc-val">${Math.round(f.tmax)}° / ${Math.round(f.tmin)}°</span>
        </div>`;
      };
      const barraP = (f) => {
        const ancho = maxPrecip > 0 ? (f.precip / maxPrecip) * 100 : 0;
        return `<div class="mc-row">
          <span class="mc-name">${f.nombre}</span>
          <div class="mc-track"><div class="mc-fill" style="width:${Math.max(ancho, f.precip > 0 ? 4 : 0)}%;background:linear-gradient(90deg,#4a9bb5,#7dd3fc)"></div></div>
          <span class="mc-val">${f.precip.toFixed(1)} mm</span>
        </div>`;
      };
      const barraV = (f) => {
        const ancho = (f.viento / maxViento) * 100;
        return `<div class="mc-row">
          <span class="mc-name">${f.nombre}</span>
          <div class="mc-track"><div class="mc-fill" style="width:${ancho}%;background:linear-gradient(90deg,#f4a261,#e76f51)"></div></div>
          <span class="mc-val">${Math.round(f.viento)} km/h</span>
        </div>`;
      };

      cont.innerHTML = `
        <div class="mc-group">
          <div class="mc-group-title">🌡️ Temperatura del día <span class="unit">(máx / mín)</span></div>
          ${filas.map(barraT).join('')}
        </div>
        <div class="mc-group">
          <div class="mc-group-title">💧 Precipitación total <span class="unit">(mm)</span></div>
          ${filas.map(barraP).join('')}
        </div>
        <div class="mc-group">
          <div class="mc-group-title">💨 Viento máximo <span class="unit">(km/h)</span></div>
          ${filas.map(barraV).join('')}
        </div>
      `;
    } catch (e) {
      console.error('Error en Microclimas:', e);
    }
  }

  const INFO_TEXTS = {
    hist: {
      titulo: '🔍 Buscar por fecha',
      html: `<p>Consultá el clima real que hizo en El Bolsón en cualquier día desde 1940 hasta ayer.</p>
        <ul>
          <li><strong>Primera vez:</strong> consulta la base de datos de Open-Meteo (necesita internet).</li>
          <li><strong>Después:</strong> queda guardado en tu celular y funciona sin conexión.</li>
        </ul>
        <p>Se muestran <strong>todos los datos disponibles</strong>: temperaturas, sensación térmica, precipitación total, horas de lluvia, nieve, viento, ráfagas, dirección dominante, radiación solar, evapotranspiración, salida y puesta del sol.</p>`
    },
    anio: {
      titulo: '📊 Explorar por año',
      html: `<p>Mirá el resumen climático de cualquier año entre 1940 y 2025.</p>
        <ul>
          <li><strong>Datos anuales:</strong> temperatura media y precipitación total del año, con la anomalía respecto al promedio 1940–2024.</li>
          <li><strong>Detalle mensual:</strong> disponible para todos los años del registro.</li>
          <li><strong>Estacionalidad:</strong> precipitación acumulada por estación (verano, otoño, invierno, primavera).</li>
        </ul>`
    },
    tendencia: {
      titulo: '📈 Tendencia de precipitación',
      html: `<p>Muestra cómo cambió la precipitación anual en El Bolsón a lo largo del tiempo.</p>
        <ul>
          <li>Cada barrita es un año. Altura proporcional a la precipitación total.</li>
          <li>Color <strong>celeste</strong>: años por encima del promedio (más lluviosos).</li>
          <li>Color <strong>marrón</strong>: años por debajo (más secos).</li>
        </ul>
        <p>Usá el selector de rango para enfocarte en un período específico. Tocá una barra para ver el año y valor exacto.</p>`
    },
    mensual: {
      titulo: '💧 Precipitación mensual',
      html: `<p>Muestra cuánto llueve en promedio cada mes del año en El Bolsón.</p>
        <ul>
          <li>Barras grises: promedio 1940–2024.</li>
          <li>Barras de color: el año que elijas para comparar.</li>
          <li>Tabla inferior: incluye <strong>máximos y mínimos históricos</strong> de cada mes.</li>
        </ul>`
    }
  };

  function abrirInfo(key) {
    const info = INFO_TEXTS[key];
    if (!info) return;
    document.getElementById('modal-info-body').innerHTML = `
      <h3>${info.titulo}</h3>
      ${info.html}
    `;
    document.getElementById('modal-info').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function cerrarInfo() {
    document.getElementById('modal-info').classList.add('hidden');
    document.body.style.overflow = '';
  }
  function initInfoButtons() {
    document.querySelectorAll('.info-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        abrirInfo(btn.dataset.info);
      };
    });
    document.getElementById('modal-info-close').onclick = cerrarInfo;
    document.getElementById('modal-info').onclick = (e) => {
      if (e.target.id === 'modal-info') cerrarInfo();
    };
  }

  const ESTACIONES = {
    verano:    { nombre: 'Verano',    icon: '☀️', meses: [11, 0, 1] },
    otonio:    { nombre: 'Otoño',     icon: '🍂', meses: [2, 3, 4] },
    invierno:  { nombre: 'Invierno',  icon: '❄️', meses: [5, 6, 7] },
    primavera: { nombre: 'Primavera', icon: '🌸', meses: [8, 9, 10] }
  };

  function precipEstacional(precipMensual) {
    if (!precipMensual || precipMensual.length !== 12) return null;
    const vals = precipMensual.map(v => v != null ? v : 0);
    return {
      verano:    vals[11] + vals[0] + vals[1],
      otonio:    vals[2] + vals[3] + vals[4],
      invierno:  vals[5] + vals[6] + vals[7],
      primavera: vals[8] + vals[9] + vals[10]
    };
  }

  async function buscarHistorial(fechaStr) {
    const cont = document.getElementById('hist-resultado');
    if (!fechaStr) return;
    cont.innerHTML = '<p class="muted" style="margin-top:10px">Buscando…</p>';

    try {
      let cached = await Storage.get('historical', 'day_' + fechaStr);
      if (cached && cached.t_max != null) {
        renderHistorial(cached);
        return;
      }

      const data = await DataFetcher.fetchHistorico('centro', fechaStr);
      data.id = 'day_' + fechaStr;
      await Storage.put('historical', data);
      renderHistorial(data);
    } catch (e) {
      cont.innerHTML = '<p class="muted" style="margin-top:10px">No se pudo obtener. Verificá tu conexión.</p>';
    }
  }

  function fmtHora(isoStr) {
    if (!isoStr) return '—';
    const m = isoStr.match(/T(\d{2}):(\d{2})/);
    return m ? m[1] + ':' + m[2] : '—';
  }
  function fmtDuracion(segundos) {
    if (segundos == null) return '—';
    const h = Math.floor(segundos / 3600);
    const min = Math.round((segundos % 3600) / 60);
    return h + 'h ' + min + 'm';
  }

  function renderHistorial(data) {
    const fecha = new Date(data.fecha + 'T12:00:00');
    const nombre = fecha.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const media = mediaHistoricaMes(fecha.getMonth() + 1);
    const diff = (data.t_mean != null && media) ? data.t_mean - media : null;
    const sol = Sun.times(fecha, -41.96, -71.53, -3);

    const flecha = data.viento_dir != null ? DataFetcher.gradosAFlecha(data.viento_dir) : '';
    const dir = data.viento_dir != null ? DataFetcher.gradosADireccion(data.viento_dir) : '—';

    document.getElementById('hist-resultado').innerHTML = `
      <div class="hist-card">
        <div class="hist-fecha">${nombre}</div>
        <div class="hist-hero">
          <span class="hist-icon">${Sky.icon(data.code, 56)}</span>
          <div class="hist-temps">
            <div><span class="lbl">Máx</span> <b>${data.t_max != null ? data.t_max.toFixed(1) + '°C' : '—'}</b></div>
            <div><span class="lbl">Mín</span> <b>${data.t_min != null ? data.t_min.toFixed(1) + '°C' : '—'}</b></div>
            <div><span class="lbl">Media</span> <b>${data.t_mean != null ? data.t_mean.toFixed(1) + '°C' : '—'}</b></div>
          </div>
        </div>
        <div class="hist-grid">
          <div class="hist-item">
            <span class="lbl">Precipitación</span>
            <b>${data.precip != null ? data.precip.toFixed(1) + ' mm' : '—'}</b>
            ${data.precip_horas != null ? `<span class="lbl" style="text-transform:none;margin-top:2px">${data.precip_horas} h de lluvia</span>` : ''}
          </div>
          <div class="hist-item">
            <span class="lbl">Nieve</span>
            <b>${data.snow != null ? data.snow.toFixed(1) + ' cm' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Sensación máx</span>
            <b>${data.sens_max != null ? data.sens_max.toFixed(1) + '°C' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Sensación mín</span>
            <b>${data.sens_min != null ? data.sens_min.toFixed(1) + '°C' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Viento máx</span>
            <b>${data.viento_max != null ? Math.round(data.viento_max) + ' km/h' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Ráfagas máx</span>
            <b>${data.racha_max != null ? Math.round(data.racha_max) + ' km/h' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Dirección viento</span>
            <b>${flecha} ${dir}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Radiación solar</span>
            <b>${data.radiacion != null ? data.radiacion.toFixed(1) + ' MJ/m²' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Evapotranspiración</span>
            <b>${data.et0 != null ? data.et0.toFixed(2) + ' mm' : '—'}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Salida sol</span>
            <b>${fmtHora(data.sunrise) || Sun.fmt(sol.sunrise)}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Puesta sol</span>
            <b>${fmtHora(data.sunset) || Sun.fmt(sol.sunset)}</b>
          </div>
          <div class="hist-item">
            <span class="lbl">Duración del día</span>
            <b>${data.daylight != null ? fmtDuracion(data.daylight) : Sun.dayLengthFmt(sol.dayLength)}</b>
          </div>
        </div>
        ${diff != null ? `<div class="hist-diff ${diff >= 0 ? 'up' : 'down'}">
          ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}°C respecto a la media histórica del mes (${media.toFixed(1)}°C)
        </div>` : ''}
      </div>
    `;
  }

  async function renderMemoria() {
    try {
      if (!baseline) return;
      const hist = await cargarHistorical();
      if (!hist) return;

      const sel = document.getElementById('sel-anio');
      if (!sel.options.length) {
        for (let y = hist.hasta; y >= hist.desde; y--) {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y;
          sel.appendChild(opt);
        }
        sel.value = hist.hasta;
        sel.onchange = () => renderAnio(Number(sel.value));
      }
      await renderAnio(Number(sel.value));

      const selRango = document.getElementById('sel-rango');
      if (!selRango.dataset.wired) {
        selRango.dataset.wired = '1';
        selRango.onchange = () => renderPrecipTendencia(hist, selRango.value);
      }
      renderPrecipTendencia(hist, selRango.value);

      const selMensual = document.getElementById('sel-anio-mensual');
      if (!selMensual.dataset.wired) {
        selMensual.dataset.wired = '1';
        for (let y = hist.hasta; y >= hist.desde; y--) {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y;
          selMensual.appendChild(opt);
        }
        selMensual.onchange = () => renderMensual(Number(selMensual.value));
      }
      if (!selMensual.value) selMensual.value = hist.hasta;
      await renderMensual(Number(selMensual.value));
    } catch (e) {
      mostrarError('Error en Memoria: ' + (e.message || e));
    }
  }

  async function obtenerMensual(year, hist) {
    const local = hist.monthly_recent[String(year)];
    if (local && local.temp && local.precip && local.temp.length === 12) {
      return { year, temp: local.temp, precip: local.precip, fuente: 'local' };
    }
    const cached = await Storage.get('historical', 'year_' + year);
    if (cached && cached.temp && cached.temp.length === 12) return cached;
    const data = await DataFetcher.fetchYearMonthly('centro', year);
    data.id = 'year_' + year;
    await Storage.put('historical', data);
    return data;
  }

  async function renderAnio(year) {
    const hist = historical;
    if (!hist) return;
    const i = year - hist.desde;
    const tm = hist.anios_tm[i];
    const p = hist.anios_p[i];

    const refTm = hist.anios_tm.reduce((a, b) => a + b, 0) / hist.anios_tm.length;
    const refP = hist.anios_p.reduce((a, b) => a + b, 0) / hist.anios_p.length;
    const diffT = tm - refTm;
    const diffP = p - refP;

    const sortedTm = [...hist.anios_tm].sort((a, b) => b - a);
    const rankCalido = sortedTm.indexOf(tm) + 1;
    const rankFrio = hist.anios_tm.length - rankCalido + 1;

    document.getElementById('anio-info').innerHTML = `
      <div class="info-item">
        <span class="lbl">Temperatura media</span>
        <span class="valor">${tm.toFixed(1)}°C</span>
        <span class="sub ${diffT >= 0 ? 'up' : 'down'}">
          ${diffT >= 0 ? '+' : ''}${diffT.toFixed(1)}° vs promedio
        </span>
      </div>
      <div class="info-item">
        <span class="lbl">Precipitación total</span>
        <span class="valor">${p} mm</span>
        <span class="sub ${diffP >= 0 ? 'up' : 'down'}">
          ${diffP >= 0 ? '+' : ''}${diffP.toFixed(0)} mm vs promedio
        </span>
      </div>
    `;

    let rankingTxt = '';
    if (rankCalido === 1) rankingTxt = 'Fue el <strong>año más cálido</strong> del registro.';
    else if (rankFrio === 1) rankingTxt = 'Fue el <strong>año más frío</strong> del registro.';
    else if (rankCalido <= 5) rankingTxt = `Fue el <strong>${rankCalido}° año más cálido</strong> del registro.`;
    else if (rankFrio <= 5) rankingTxt = `Fue el <strong>${rankFrio}° año más frío</strong> del registro.`;
    else rankingTxt = `Ocupa el puesto <strong>${rankCalido}°</strong> entre los más cálidos (de ${hist.anios_tm.length} años).`;

    const aviso = document.getElementById('anio-aviso');
    const tempChart = document.getElementById('anio-temp-chart');
    const tempLegend = document.getElementById('anio-temp-legend');
    const precipChart = document.getElementById('anio-precip-chart');
    const precipLegend = document.getElementById('anio-precip-legend');
    const estacionesCont = document.getElementById('anio-estaciones');

    aviso.classList.remove('hidden');
    aviso.innerHTML = `Consultando datos mensuales de <strong>${year}</strong>…`;
    tempChart.innerHTML = '';
    tempLegend.innerHTML = '';
    precipChart.innerHTML = '';
    precipLegend.innerHTML = '';
    estacionesCont.innerHTML = '';
    document.getElementById('anio-comparativa').innerHTML = rankingTxt;

    let dataMensual = null;
    let error = null;
    try {
      dataMensual = await obtenerMensual(year, hist);
    } catch (e) {
      error = e.message || 'Error de conexión';
    }

    if (!dataMensual) {
      aviso.innerHTML = `<strong>Sin datos mensuales para ${year}.</strong> No se pudo obtener (${error}).`;
      return;
    }

    aviso.classList.add('hidden');

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const refMes = baseline.normales_mensuales.map(n => n.t_mean);
    const refMesP = baseline.normales_mensuales.map(n => n.precip_mm);
    const yearTemp = dataMensual.temp;
    const yearPrecip = dataMensual.precip;

    const todosT = [...refMes, ...yearTemp.filter(v => v != null)];
    const minT = Math.min(...todosT) - 1;
    const maxT = Math.max(...todosT) + 1;
    const rangeT = maxT - minT || 1;

    tempChart.innerHTML = meses.map((m, k) => {
      const hRef = ((refMes[k] - minT) / rangeT) * 100;
      const val = yearTemp[k];
      const hYear = val != null ? ((val - minT) / rangeT) * 100 : 0;
      return `<div class="bp-col">
        <div class="bp-bars">
          <div class="bp-bar ref" style="height:${hRef}%"></div>
          <div class="bp-bar year" style="height:${hYear}%"></div>
        </div>
        <span class="bp-lbl">${m}</span>
      </div>`;
    }).join('');

    tempLegend.innerHTML = `
      <div class="lg-item"><span class="lg-dot" style="background:#8fa8ba;opacity:.55"></span> Referencia 1940–2024</div>
      <div class="lg-item"><span class="lg-dot" style="background:#f4a261"></span> ${year}</div>
    `;

    const todosP = [...refMesP, ...yearPrecip.filter(v => v != null)];
    const maxP = Math.max(...todosP) * 1.1 || 1;
    const rangeP = maxP || 1;

    precipChart.innerHTML = meses.map((m, k) => {
      const hRef = (refMesP[k] / rangeP) * 100;
      const val = yearPrecip[k];
      const hYear = val != null ? (val / rangeP) * 100 : 0;
      return `<div class="bp-col">
        <div class="bp-bars">
          <div class="bp-bar ref" style="height:${hRef}%"></div>
          <div class="bp-bar year" style="height:${hYear}%;background:linear-gradient(180deg,#4a9bb5,#7dd3fc)"></div>
        </div>
        <span class="bp-lbl">${m}</span>
      </div>`;
    }).join('');

    precipLegend.innerHTML = `
      <div class="lg-item"><span class="lg-dot" style="background:#8fa8ba;opacity:.55"></span> Promedio 1940–2024</div>
      <div class="lg-item"><span class="lg-dot" style="background:#4a9bb5"></span> ${year}</div>
    `;

    const estAnio = precipEstacional(yearPrecip);
    const añosConDetalle = Object.keys(hist.monthly_recent).map(Number);
    const sumas = { verano: 0, otonio: 0, invierno: 0, primavera: 0 };
    let cuenta = 0;
    añosConDetalle.forEach(y => {
      const est = precipEstacional(hist.monthly_recent[String(y)].precip);
      if (est) {
        sumas.verano += est.verano;
        sumas.otonio += est.otonio;
        sumas.invierno += est.invierno;
        sumas.primavera += est.primavera;
        cuenta++;
      }
    });
    const promEst = cuenta > 0 ? {
      verano: sumas.verano / cuenta,
      otonio: sumas.otonio / cuenta,
      invierno: sumas.invierno / cuenta,
      primavera: sumas.primavera / cuenta
    } : null;

    estacionesCont.innerHTML = Object.entries(ESTACIONES).map(([key, est]) => {
      const val = estAnio ? estAnio[key] : null;
      const prom = promEst ? promEst[key] : null;
      let subHTML = '';
      if (val != null && prom != null) {
        const dif = val - prom;
        subHTML = `<span class="est-sub ${dif >= 0 ? 'up' : 'down'}">${dif >= 0 ? '+' : ''}${dif.toFixed(0)} mm vs promedio</span>`;
      }
      return `<div class="estacion-item">
        <span class="est-icon">${est.icon}</span>
        <span class="est-nombre">${est.nombre}</span>
        <span class="est-valor">${val != null ? Math.round(val) + ' mm' : '—'}</span>
        ${subHTML}
      </div>`;
    }).join('');
  }

  function renderPrecipTendencia(hist, rango) {
    const [desde, hasta] = rango.split('-').map(Number);
    const idxDesde = Math.max(0, desde - hist.desde);
    const idxHasta = Math.min(hist.anios_p.length - 1, hasta - hist.desde);

    const valores = [];
    const años = [];
    for (let i = idxDesde; i <= idxHasta; i++) {
      const v = hist.anios_p[i];
      if (v != null && !isNaN(v)) { valores.push(v); años.push(hist.desde + i); }
    }
    if (!valores.length) return;

    const prom = valores.reduce((a, b) => a + b, 0) / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const idxMin = valores.indexOf(min);
    const idxMax = valores.indexOf(max);
    const añoMin = años[idxMin];
    const añoMax = años[idxMax];

    document.getElementById('precip-resumen').innerHTML = `
      <div class="pr-item">
        <span class="pr-lbl">Promedio</span>
        <span class="pr-val">${Math.round(prom)}</span>
        <span class="pr-sub">mm/año</span>
      </div>
      <div class="pr-item max">
        <span class="pr-lbl">Más lluvioso</span>
        <span class="pr-val">${max}</span>
        <span class="pr-sub">${añoMax}</span>
      </div>
      <div class="pr-item min">
        <span class="pr-lbl">Más seco</span>
        <span class="pr-val">${min}</span>
        <span class="pr-sub">${añoMin}</span>
      </div>
    `;

    const visMin = min - 20;
    const visMax = max + 20;
    const range = visMax - visMin || 1;

    const cont = document.getElementById('precip-chart');
    cont.innerHTML = valores.map((v, i) => {
      const pct = Math.max(8, ((v - visMin) / range) * 100);
      const año = años[i];
      let clase = 'normal';
      if (v > prom * 1.10) clase = 'lluvioso';
      else if (v < prom * 0.90) clase = 'seco';
      const esExtremo = (i === idxMin || i === idxMax || i === 0 || i === valores.length - 1);
      const mostrarValor = esExtremo && valores.length <= 40;
      const dataAttrs = `data-idx="${i}" data-año="${año}" data-val="${v}"`;
      return `<div class="p-bar ${clase} ${esExtremo ? 'extremo' : ''}"
                style="height:${pct}%"
                ${dataAttrs}>
        ${mostrarValor ? `<span class="p-val">${v}</span>` : ''}
      </div>`;
    }).join('');

    const line = document.getElementById('precip-promedio-line');
    const chartHeight = 130;
    const topPad = 22;
    const usableHeight = chartHeight - topPad - 4;
    const promPct = ((prom - visMin) / range) * 100;
    const lineTop = topPad + (usableHeight * (1 - promPct / 100));
    line.style.display = 'block';
    line.style.top = lineTop + 'px';
    document.getElementById('promedio-lbl').textContent = `Prom ${Math.round(prom)} mm`;

    const paso = Math.ceil(años.length / 5);
    const marcas = [];
    for (let i = 0; i < años.length; i += paso) marcas.push(años[i]);
    if (marcas[marcas.length - 1] !== años[años.length - 1]) marcas.push(años[años.length - 1]);
    document.getElementById('precip-axis').innerHTML =
      marcas.map(m => `<span>${m}</span>`).join('');

    const tooltip = document.getElementById('precip-tooltip');
    const wrap = document.querySelector('.precip-chart-wrap');

    cont.querySelectorAll('.p-bar').forEach(bar => {
      const handler = (e) => {
        e.stopPropagation();
        cont.querySelectorAll('.p-bar.active').forEach(b => b.classList.remove('active'));
        bar.classList.add('active');
        const val = parseInt(bar.dataset.val, 10);
        const año = bar.dataset.año;
        const dif = val - prom;
        const difTxt = dif >= 0 ? `+${Math.round(dif)} mm vs promedio` : `${Math.round(dif)} mm vs promedio`;
        const difClase = dif >= 0 ? 'up' : 'down';
        tooltip.innerHTML = `
          <span class="tt-año">${año}</span><span class="tt-val">${val} mm</span>
          <span class="tt-dif ${difClase}">${difTxt}</span>
        `;
        tooltip.classList.remove('hidden');
        const barRect = bar.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const left = barRect.left - wrapRect.left + barRect.width / 2;
        const top = barRect.top - wrapRect.top;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        clearTimeout(handler._t);
        handler._t = setTimeout(() => {
          tooltip.classList.add('hidden');
          bar.classList.remove('active');
        }, 3000);
      };
      bar.addEventListener('click', handler);
      bar.addEventListener('touchstart', handler, { passive: true });
    });

    const ocultarTooltip = () => {
      tooltip.classList.add('hidden');
      cont.querySelectorAll('.p-bar.active').forEach(b => b.classList.remove('active'));
    };
    document.addEventListener('click', ocultarTooltip, { once: true });
    window.addEventListener('scroll', ocultarTooltip, { once: true, passive: true });

    const primeros10 = valores.slice(0, Math.min(10, valores.length));
    const ultimos10 = valores.slice(-Math.min(10, valores.length));
    const promIni = primeros10.reduce((a, b) => a + b, 0) / primeros10.length;
    const promFin = ultimos10.reduce((a, b) => a + b, 0) / ultimos10.length;
    const dif = promFin - promIni;

    let tendencia, icono;
    if (Math.abs(dif) < 50) { tendencia = 'se mantiene <strong>estable</strong>'; icono = '➡️'; }
    else if (dif > 0) { tendencia = 'está <strong>aumentando</strong>'; icono = '📈'; }
    else { tendencia = 'está <strong>disminuyendo</strong>'; icono = '📉'; }

    const añosSecos = valores.filter(v => v < prom * 0.90).length;
    const añosLluviosos = valores.filter(v => v > prom * 1.10).length;
    const añosNormales = valores.length - añosSecos - añosLluviosos;

    document.getElementById('precip-tendencia-texto').innerHTML = `
      <p style="margin-bottom:10px">
        ${icono} En el período <strong>${desde}–${hasta}</strong>, la precipitación anual en El Bolsón ${tendencia}.
      </p>
      <div>
        <span class="dato">🔵 Años lluviosos <b>${añosLluviosos}</b></span>
        <span class="dato">⚪ Años normales <b>${añosNormales}</b></span>
        <span class="dato">🟤 Años secos <b>${añosSecos}</b></span>
      </div>
      <p style="margin-top:10px;font-size:12px">
        Promedio del período: <strong>${Math.round(prom)} mm/año</strong>.
        Rango: de <strong>${min} mm</strong> (${añoMin}) a <strong>${max} mm</strong> (${añoMax}).
      </p>
    `;
  }

  async function renderMensual(year) {
    const hist = historical;
    if (!hist || !year) return;

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const normales = baseline.normales_mensuales;
    const promedios = normales.map(n => n.precip_mm);
    const maxHist = normales.map(n => n.precip_max_hist || n.precip_mm);
    const minHist = normales.map(n => n.precip_min_hist || 0);

    const chart = document.getElementById('mensual-chart');
    const legend = document.getElementById('mensual-legend');
    const tabla = document.getElementById('mensual-tabla');

    chart.innerHTML = '<p class="muted" style="text-align:center;padding:20px 0">Consultando año ' + year + '…</p>';
    legend.innerHTML = '';
    tabla.innerHTML = '';

    let dataMensual = null;
    try {
      dataMensual = await obtenerMensual(year, hist);
    } catch (e) {}

    if (!dataMensual) {
      chart.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0">No se pudo obtener el año ${year}.</p>`;
      return;
    }

    const valoresAño = dataMensual.precip;

    const todos = [...promedios, ...maxHist, ...valoresAño.filter(v => v != null)];
    const maxAll = Math.max(...todos) * 1.05 || 1;
    const range = maxAll;

    chart.innerHTML = meses.map((m, k) => {
      const hProm = (promedios[k] / range) * 100;
      const val = valoresAño[k];
      const hYear = val != null ? (val / range) * 100 : 0;
      return `<div class="bp-col">
        <div class="bp-bars">
          <div class="bp-bar ref" style="height:${hProm}%"></div>
          <div class="bp-bar year" style="height:${hYear}%;background:linear-gradient(180deg,#4a9bb5,#7dd3fc)"></div>
        </div>
        <span class="bp-lbl">${m}</span>
      </div>`;
    }).join('');

    legend.innerHTML = `
      <div class="lg-item"><span class="lg-dot" style="background:#8fa8ba;opacity:.55"></span> Promedio 1940–2024</div>
      <div class="lg-item"><span class="lg-dot" style="background:#4a9bb5"></span> ${year}</div>
    `;

    const filas = meses.map((m, k) => {
      const valAño = valoresAño[k];
      return `<tr>
        <td>${m}</td>
        <td>${promedios[k]} mm</td>
        <td>${valAño != null ? Math.round(valAño) + ' mm' : '—'}</td>
        <td>${maxHist[k]} mm</td>
        <td>${minHist[k]} mm</td>
      </tr>`;
    }).join('');

    tabla.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Promedio</th>
            <th>${year}</th>
            <th>Máx hist</th>
            <th>Mín hist</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    `;
  }

  function activarTabPorNombre(nombre) {
    const btn = document.querySelector(`.tab[data-tab="${nombre}"]`);
    if (!btn) return false;
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + nombre).classList.add('active');
    return true;
  }
  function renderTabActivo() {
    const tab = document.querySelector('.tab.active')?.dataset.tab;
    if (tab === 'hoy') renderHoy();
    else if (tab === 'pronostico') renderPronostico();
    else if (tab === 'memoria') renderMemoria();
  }
  function initTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.onclick = () => {
        activarTabPorNombre(btn.dataset.tab);
        renderTabActivo();
      };
    });
  }

  async function cargarForecastGuardado() {
    forecastActual = await Storage.get('forecast', 'forecast_centro');
    const ok = forecastActual
      && forecastActual.hourly
      && forecastActual.hourly[0]
      && forecastActual.hourly[0].vientoDir !== undefined
      && forecastActual.hourly[0].uv !== undefined;
    if (!ok) {
      const puntos = ['centro', 'mallin_ahogado', 'lago_puelo'];
      await InitialForecast.generarYGuardarTodos(baseline, puntos);
      forecastActual = await Storage.get('forecast', 'forecast_centro');
    }
  }

  function actualizarEstadoSync() {
    const el = document.getElementById('sync-status');
    if (!forecastActual) { el.textContent = 'Sin datos'; return; }
    const ts = forecastActual.actualizado;
    const diffH = (Date.now() - ts) / 3600000;
    const esGenerado = forecastActual.fuente === 'generado-local';
    if (esGenerado) {
      el.textContent = 'Estimación local · tocá ⟳ para actualizar con Open-Meteo';
      return;
    }
    if (diffH < 1) el.textContent = 'Fuente: Open-Meteo · actualizado hace menos de 1 h';
    else if (diffH < 24) el.textContent = `Fuente: Open-Meteo · actualizado hace ${Math.round(diffH)} h`;
    else el.textContent = `Fuente: Open-Meteo · última actualización: ${new Date(ts).toLocaleDateString('es-AR')}`;
  }

  async function onUpdate() {
    const btn = document.getElementById('btn-update');
    btn.classList.add('spinning');
    document.getElementById('sync-status').textContent = 'Actualizando…';
    try {
      const r = await DataFetcher.actualizarTodo();
      const ok = Object.values(r).filter(x => x === 'ok').length;
      if (ok === 0) throw new Error('Sin conexión');
      await cargarForecastGuardado();
      renderTabActivo();
      actualizarEstadoSync();
      ocultarError();
    } catch (e) {
      document.getElementById('sync-status').textContent =
        'Sin conexión — usando datos guardados';
      setTimeout(actualizarEstadoSync, 2500);
    } finally {
      btn.classList.remove('spinning');
    }
  }

  async function init() {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('reset') === '1') {
        await modoReset();
        return;
      }

      await Storage.init();
      await cargarBaseline();

      actualizarFondo();
      setInterval(actualizarFondo, 5 * 60 * 1000);

      initTabs();
      initInfoButtons();

      const tabParam = params.get('tab');
      if (tabParam && ['hoy', 'pronostico', 'memoria', 'emergencia'].includes(tabParam)) {
        activarTabPorNombre(tabParam);
      }

      document.getElementById('btn-update').onclick = onUpdate;
      document.getElementById('modal-close-btn').onclick = cerrarModal;
      document.getElementById('modal-dia').onclick = (e) => {
        if (e.target.id === 'modal-dia') cerrarModal();
      };

      const histInput = document.getElementById('hist-fecha');
      histInput.max = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      document.getElementById('hist-btn').onclick = () => buscarHistorial(histInput.value);
      histInput.onchange = () => {
        if (histInput.value) buscarHistorial(histInput.value);
      };

      await cargarForecastGuardado();
      renderTabActivo();
      actualizarEstadoSync();

      setInterval(actualizarEfectos, 5 * 60 * 1000);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    } catch (e) {
      mostrarError('Error al iniciar: ' + (e.message || e));
      document.getElementById('sync-status').textContent = 'Error al iniciar la app';
    }
  }

  return { init, renderMicroclimas, renderMemoria, abrirDetalleDia, cerrarModal };
})();

document.addEventListener('DOMContentLoaded', App.init);