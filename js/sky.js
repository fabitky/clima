// Iconos SVG animados del cielo según código WMO.
// Las animaciones viven en css/styles.css con clases .sky-*
const Sky = (() => {

  function defs(id) {
    return `<defs>
      <radialGradient id="sunGrad-${id}">
        <stop offset="0%" stop-color="#ffe082"/>
        <stop offset="60%" stop-color="#ffd54f"/>
        <stop offset="100%" stop-color="#f4a261"/>
      </radialGradient>
    </defs>`;
  }

  function sun(id, cx = 32, cy = 32, r = 12) {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const x1 = (cx + Math.cos(a) * (r + 3)).toFixed(1);
      const y1 = (cy + Math.sin(a) * (r + 3)).toFixed(1);
      const x2 = (cx + Math.cos(a) * (r + 9)).toFixed(1);
      const y2 = (cy + Math.sin(a) * (r + 9)).toFixed(1);
      rays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd54f" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    return `<g class="sky-sun" style="transform-origin:${cx}px ${cy}px">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sunGrad-${id})"/>
      <g class="sky-rays">${rays}</g>
    </g>`;
  }

  function cloud(cx = 32, cy = 32, scale = 1) {
    return `<g transform="translate(${cx},${cy}) scale(${scale})">
      <g class="sky-cloud">
        <ellipse cx="-2" cy="4" rx="18" ry="8" fill="#b8cdd8"/>
        <circle cx="-9" cy="0" r="8" fill="#e0ecf2"/>
        <circle cx="0" cy="-5" r="10" fill="#f0f6fa"/>
        <circle cx="10" cy="0" r="8" fill="#d8e4ea"/>
      </g>
    </g>`;
  }

  function rainDrops(count = 4) {
    let drops = '';
    for (let i = 0; i < count; i++) {
      const x = 22 + i * 6;
      drops += `<line x1="${x}" y1="42" x2="${x - 2}" y2="52" stroke="#62b6cb" stroke-width="1.8" stroke-linecap="round" class="sky-drop" style="animation-delay:${(i * 0.18).toFixed(2)}s"/>`;
    }
    return `<g class="sky-rain">${drops}</g>`;
  }

  function snowFlakes(count = 5) {
    let flakes = '';
    for (let i = 0; i < count; i++) {
      const x = 20 + i * 6;
      flakes += `<circle cx="${x}" cy="44" r="1.8" fill="#e0ecf2" class="sky-flake" style="animation-delay:${(i * 0.35).toFixed(2)}s"/>`;
    }
    return `<g class="sky-snow">${flakes}</g>`;
  }

  function lightning() {
    return `<polyline points="32,38 27,48 33,48 29,58" fill="none" stroke="#ffd54f" stroke-width="2" stroke-linejoin="round" class="sky-bolt"/>`;
  }

  function fog() {
    return `<g class="sky-fog">
      <line x1="12" y1="28" x2="52" y2="28" stroke="#8fa8ba" stroke-width="2" stroke-linecap="round"/>
      <line x1="16" y1="36" x2="48" y2="36" stroke="#8fa8ba" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="44" x2="52" y2="44" stroke="#8fa8ba" stroke-width="2" stroke-linecap="round"/>
    </g>`;
  }

  let uid = 0;

  function icon(code, size = 40) {
    const id = 'sky' + (++uid);
    const open = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="sky-svg">`;
    let body = '';

    if (code === 0) {
      body = sun(id);
    } else if (code === 1) {
      body = sun(id, 24, 24, 10);
    } else if (code === 2) {
      body = sun(id, 22, 24, 9) + cloud(36, 38, 0.75);
    } else if (code === 3) {
      body = cloud(28, 32, 0.8) + cloud(40, 38, 0.65);
    } else if (code === 45 || code === 48) {
      body = cloud(32, 26, 0.7) + fog();
    } else if (code >= 51 && code <= 57) {
      body = cloud(32, 26, 0.85) + rainDrops(3);
    } else if (code >= 61 && code <= 67) {
      body = cloud(32, 26, 0.9) + rainDrops(5);
    } else if (code >= 71 && code <= 77) {
      body = cloud(32, 26, 0.9) + snowFlakes(5);
    } else if (code >= 80 && code <= 82) {
      body = cloud(32, 26, 0.9) + rainDrops(6);
    } else if (code >= 85 && code <= 86) {
      body = cloud(32, 26, 0.9) + snowFlakes(4) + rainDrops(2);
    } else if (code >= 95) {
      body = cloud(32, 24, 0.95) + lightning() + rainDrops(3);
    } else {
      body = cloud(32, 32, 0.9);
    }

    return open + defs(id) + body + '</svg>';
  }

  return { icon };
})();