// Cálculo astronómico de salida/puesta de sol (offline, sin API)
const Sun = (() => {
  function times(date, lat, lon, tz = -3) {
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    const y = date.getFullYear();
    const start = new Date(Date.UTC(y, 0, 0));
    const N = Math.floor((Date.UTC(y, date.getMonth(), date.getDate()) - start) / 86400000);

    const decl = 23.45 * Math.sin(rad * 360 / 365 * (284 + N));
    const latRad = lat * rad;
    const declRad = decl * rad;

    const cosH = -Math.tan(latRad) * Math.tan(declRad);
    if (cosH > 1)  return { polarNight: true };
    if (cosH < -1) return { polarDay: true };

    const H = Math.acos(cosH) * deg;
    const halfDay = H / 15;

    const B = rad * 360 / 364 * (N - 81);
    const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

    const solarNoon = 12 - lon / 15 - EoT / 60 + tz;

    return {
      sunrise: solarNoon - halfDay,
      sunset:  solarNoon + halfDay,
      solarNoon,
      dayLength: halfDay * 2,
      declination: decl
    };
  }

  function fmt(h) {
    if (h == null || isNaN(h)) return '—';
    let hh = Math.floor(h);
    let mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh += 1; mm = 0; }
    hh = ((hh % 24) + 24) % 24;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  function dayLengthFmt(hours) {
    if (hours == null) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  // ===== Gráfico del sol (SVG tipo meteored) =====
  function graph(sol, opts = {}) {
    const W = 300;
    const H = opts.compact ? 130 : 150;
    const padX = 32;
    const horizonte = H - (opts.compact ? 28 : 34);
    const arcoAlto = horizonte - (opts.compact ? 22 : 28);

    if (sol.polarDay || sol.polarNight) {
      return `<div class="sun-graph-empty">
        ${sol.polarDay ? '☀️ Sol de medianoche' : '🌙 Noche polar'}
      </div>`;
    }

    const sr = sol.sunrise;
    const ss = sol.sunset;
    const dur = ss - sr;

    const ahora = opts.ahora || new Date();
    const ahoraH = ahora.getHours() + ahora.getMinutes() / 60;
    const esHoy = opts.esHoy !== false;
    const dentroDelDia = ahoraH >= sr && ahoraH <= ss;
    const progreso = dentroDelDia ? (ahoraH - sr) / dur : null;

    function punto(t) {
      const x = padX + (W - 2 * padX) * t;
      const y = horizonte - arcoAlto * Math.sin(Math.PI * t);
      return { x, y };
    }

    // Arco completo (punteado)
    const puntos = [];
    for (let i = 0; i <= 80; i++) puntos.push(punto(i / 80));
    const arcoD = puntos
      .map((p, i) => (i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
      .join(' ');

    // Arco recorrido (sólido, naranja)
    let arcoRecorrido = '';
    if (esHoy && progreso !== null && progreso > 0.01) {
      const puntosRec = [];
      const pasos = Math.max(3, Math.round(progreso * 80));
      for (let i = 0; i <= pasos; i++) {
        puntosRec.push(punto((i / pasos) * progreso));
      }
      arcoRecorrido = puntosRec
        .map((p, i) => (i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
        .join(' ');
    }

    const pS = punto(0);
    const pN = punto(0.5);
    const pE = punto(1);

    // Rayos del sol
    function rayos(cx, cy, r1, r2) {
      let s = '';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const x1 = (cx + Math.cos(a) * r1).toFixed(1);
        const y1 = (cy + Math.sin(a) * r1).toFixed(1);
        const x2 = (cx + Math.cos(a) * r2).toFixed(1);
        const y2 = (cy + Math.sin(a) * r2).toFixed(1);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd54f" stroke-width="1.4" stroke-linecap="round"/>`;
      }
      return s;
    }

    // Sol actual
    let solMarker = '';
    if (esHoy && progreso !== null) {
      const p = punto(progreso);
      const rSol = opts.compact ? 8 : 10;
      const rHalo = rSol * 1.6;
      solMarker = `
        <circle cx="${p.x}" cy="${p.y}" r="${rHalo}" fill="url(#sunGradHero)" opacity="0.25"/>
        <circle cx="${p.x}" cy="${p.y}" r="${rSol}" fill="url(#sunGradHero)"/>
        <g>
          <animateTransform attributeName="transform" type="rotate"
            from="0 ${p.x} ${p.y}" to="360 ${p.x} ${p.y}"
            dur="24s" repeatCount="indefinite"/>
          ${rayos(p.x, p.y, rSol + 2, rSol + 7)}
        </g>
      `;
    }

    // Marca de mediodía (texto chico)
    const mediodiaLabel = opts.compact
      ? ''
      : `<text x="${pN.x}" y="${pN.y - 6}" text-anchor="middle" fill="#8fa8ba"
            font-size="9" font-family="sans-serif" opacity="0.7">mediodía</text>`;

    return `
      <svg viewBox="0 0 ${W} ${H}" class="sun-graph" xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="xMidYMid meet" role="img" aria-label="Trayectoria del sol">
        <defs>
          <radialGradient id="sunGradHero">
            <stop offset="0%" stop-color="#fff5b8"/>
            <stop offset="55%" stop-color="#ffd54f"/>
            <stop offset="100%" stop-color="#f4a261"/>
          </radialGradient>
          <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#f4a261"/>
            <stop offset="50%" stop-color="#ffd54f"/>
            <stop offset="100%" stop-color="#f4a261"/>
          </linearGradient>
        </defs>

        <!-- Horizonte -->
        <line x1="${padX - 10}" y1="${horizonte}" x2="${W - padX + 10}" y2="${horizonte}"
              stroke="#8fa8ba" stroke-width="1" stroke-dasharray="4,3" opacity="0.35"/>

        <!-- Trayectoria completa punteada -->
        <path d="${arcoD}" fill="none" stroke="#8fa8ba" stroke-width="1.2"
              stroke-dasharray="3,3" opacity="0.3"/>

        <!-- Arco recorrido sólido -->
        ${arcoRecorrido ? `<path d="${arcoRecorrido}" fill="none"
            stroke="url(#arcGrad)" stroke-width="2.5" stroke-linecap="round"/>` : ''}

        <!-- Marcas de amanecer / mediodía / atardecer -->
        <circle cx="${pS.x}" cy="${pS.y}" r="3" fill="#f4a261"/>
        <circle cx="${pN.x}" cy="${pN.y}" r="2" fill="#f4a261" opacity="0.55"/>
        <circle cx="${pE.x}" cy="${pE.y}" r="3" fill="#f4a261"/>

        ${mediodiaLabel}

        ${solMarker}
      </svg>
    `;
  }

  // ===== Widget completo (gráfico + etiquetas) =====
  function widget(sol, opts = {}) {
    const esHoy = opts.esHoy !== false;
    const ahora = opts.ahora || new Date();
    const luna = opts.luna;

    if (sol.polarDay || sol.polarNight) {
      return `<div class="sun-widget">
        <div class="sun-graph-empty">
          ${sol.polarDay ? '☀️ Sol de medianoche' : '🌙 Noche polar'}
        </div>
      </div>`;
    }

    const svg = graph(sol, { ahora, esHoy, compact: opts.compact });
    const lunaHTML = (luna && opts.mostrarLuna)
      ? `<div class="sun-widget-luna">${luna.icon} ${luna.nombre}</div>`
      : '';

    return `<div class="sun-widget ${opts.compact ? 'compact' : ''}">
      ${svg}
      <div class="sun-widget-labels">
        <div class="swl-item">
          <span class="swl-val">${fmt(sol.sunrise)}</span>
          <span class="swl-lbl">🌅 Amanecer</span>
        </div>
        <div class="swl-item">
          <span class="swl-val">${dayLengthFmt(sol.dayLength)}</span>
          <span class="swl-lbl">☀️ Duración</span>
        </div>
        <div class="swl-item">
          <span class="swl-val">${fmt(sol.sunset)}</span>
          <span class="swl-lbl">🌇 Atardecer</span>
        </div>
      </div>
      ${lunaHTML}
    </div>`;
  }

  return { times, fmt, dayLengthFmt, graph, widget };
})();