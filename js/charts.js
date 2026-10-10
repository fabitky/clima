const Charts = (() => {

  // Prepara canvas. Devuelve null si el canvas no es medible (oculto).
  function prep(canvas) {
    const dpr = window.devicePixelRatio || 1;

    // IMPORTANTE: limpiar estilos inline previos antes de medir.
    // Si en un render anterior (canvas oculto) quedaron width:0px,
    // hay que borrarlos para que getBoundingClientRect mida bien.
    canvas.style.width = '';
    canvas.style.height = '';

    const attrH = parseInt(canvas.getAttribute('height')) || 180;
    const rect = canvas.getBoundingClientRect();
    let w = rect.width;

    // Fallback: si el canvas está oculto (padre display:none), medir el padre.
    if (w === 0 && canvas.parentElement) {
      const pw = canvas.parentElement.getBoundingClientRect().width;
      if (pw > 0) w = pw - 32; // restar padding aproximado de .card
    }

    // Si todavía es 0 (todo el tab está oculto), no dibujar.
    if (w === 0) return null;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(attrH * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = attrH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h: attrH };
  }

  function drawGrid(ctx, pad, w, h, innerW, innerH, min, max, unidad = '°') {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (innerH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#8fa8ba';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const val = max - ((max - min) / 4) * i;
      ctx.fillText(Math.round(val) + unidad, pad.l - 6, y + 3);
    }
  }

  function lineChart(canvas, opts) {
    const p = prep(canvas);
    if (!p) return;
    const { ctx, w, h } = p;
    const pad = { l: 34, r: 10, t: 14, b: 22 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const data = opts.data;
    if (!data || !data.length) return;

    const vals = data.map(d => d.y);
    const min = opts.min !== undefined ? opts.min : Math.min(...vals) - 2;
    const max = opts.max !== undefined ? opts.max : Math.max(...vals) + 2;
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, pad, w, h, innerW, innerH, min, max, opts.unidad || '°');

    ctx.strokeStyle = opts.color || '#62b6cb';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad.l + (innerW / (data.length - 1)) * i;
      const y = pad.t + innerH - ((d.y - min) / range) * innerH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.lineTo(pad.l + innerW, pad.t + innerH);
    ctx.lineTo(pad.l, pad.t + innerH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + innerH);
    grad.addColorStop(0, (opts.color || '#62b6cb') + '55');
    grad.addColorStop(1, (opts.color || '#62b6cb') + '00');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = opts.color || '#62b6cb';
    data.forEach((d, i) => {
      const x = pad.l + (innerW / (data.length - 1)) * i;
      const y = pad.t + innerH - ((d.y - min) / range) * innerH;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#8fa8ba';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % step === 0) {
        const x = pad.l + (innerW / (data.length - 1)) * i;
        ctx.fillText(d.x, x, h - 6);
      }
    });
  }

  function multiLine(canvas, series, opts = {}) {
    const p = prep(canvas);
    if (!p) return;
    const { ctx, w, h } = p;
    const pad = { l: 34, r: 10, t: 18, b: 22 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const all = series.flatMap(s => s.data.map(d => d.y));
    if (!all.length) return;

    const min = opts.min !== undefined ? opts.min : Math.min(...all) - 1;
    const max = opts.max !== undefined ? opts.max : Math.max(...all) + 1;
    const range = max - min || 1;
    const maxLen = Math.max(...series.map(s => s.data.length));

    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, pad, w, h, innerW, innerH, min, max, opts.unidad || '°');

    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.data.forEach((d, i) => {
        const x = pad.l + (innerW / Math.max(1, maxLen - 1)) * i;
        const y = pad.t + innerH - ((d.y - min) / range) * innerH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    ctx.font = '10px -apple-system, sans-serif';
    let lx = pad.l;
    series.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, 4, 8, 8);
      ctx.fillStyle = '#8fa8ba';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, lx + 12, 11);
      lx += ctx.measureText(s.label).width + 26;
    });

    const ref = series.reduce((a, b) => a.data.length >= b.data.length ? a : b);
    ctx.fillStyle = '#8fa8ba';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(ref.data.length / 6));
    ref.data.forEach((d, i) => {
      if (i % step === 0) {
        const x = pad.l + (innerW / Math.max(1, maxLen - 1)) * i;
        ctx.fillText(d.x, x, h - 6);
      }
    });
  }

  function bars(canvas, data, color = '#62b6cb') {
    const p = prep(canvas);
    if (!p) return;
    const { ctx, w, h } = p;
    const pad = { l: 34, r: 10, t: 14, b: 22 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    if (!data || !data.length) return;

    const maxRaw = Math.max(...data.map(d => d.y));
    const max = maxRaw > 0 ? maxRaw * 1.15 : 1;

    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, pad, w, h, innerW, innerH, 0, max, '');

    const slot = innerW / data.length;
    const bw = slot * 0.7;
    data.forEach((d, i) => {
      const x = pad.l + slot * i + (slot - bw) / 2;
      const bh = (d.y / max) * innerH;
      const y = pad.t + innerH - bh;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, bw, bh);
    });

    ctx.fillStyle = '#8fa8ba';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 8));
    data.forEach((d, i) => {
      if (i % step === 0) {
        const x = pad.l + slot * i + slot / 2;
        ctx.fillText(d.x, x, h - 6);
      }
    });
  }

  return { lineChart, multiLine, bars };
})();