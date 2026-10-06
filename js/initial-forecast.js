// Generador de pronóstico inicial 100% offline.
// Usa la línea base climática + ruido determinístico por fecha.
const InitialForecast = (() => {

  function seededNoise(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function ruido(seed, amplitud = 1) {
    return (seededNoise(seed) - 0.5) * 2 * amplitud;
  }

  function generar(baseline, puntoKey, dias = 7) {
    const punto = baseline.microclimas[puntoKey] || baseline.microclimas.centro;
    const altValle = punto.alt || 300;
    const ahora = new Date();
    const daily = [];
    const hourly = [];

    for (let d = 0; d < dias; d++) {
      const fecha = new Date(ahora);
      fecha.setDate(fecha.getDate() + d);
      fecha.setHours(0, 0, 0, 0);

      const mes = fecha.getMonth() + 1;
      const normal = baseline.normales_mensuales.find(n => n.mes === mes);
      const seed = fecha.getFullYear() * 10000 + mes * 100 + fecha.getDate();

      const n1 = ruido(seed, 1) * 0.7 + ruido(seed - 1, 1) * 0.3;
      const n2 = ruido(seed + 500, 1) * 0.7 + ruido(seed + 499, 1) * 0.3;
      const n3 = ruido(seed + 1000, 1) * 0.7 + ruido(seed + 999, 1) * 0.3;

      const factor = punto.factor_temp || 0;

      const t_max = normal.t_max + factor + n1 * 3.5;
      const t_min = normal.t_min + factor + n2 * 2.5;

      const precipBase = normal.precip_mm / Math.max(1, normal.dias_lluvia);
      const precipDia = Math.max(0, precipBase * (0.4 + Math.abs(n3) * 1.6));

      const vientoMax = 12 + Math.abs(n2) * 30;
      const rachaMax = vientoMax + 6 + Math.abs(n3) * 18;

      // Cota de nieve aproximada: nivel del valle + (temp media / 0.0065)
      const tMedia = (t_max + t_min) / 2;
      const cotaNieve = Math.round(altValle + Math.max(0, tMedia) / 0.0065 + ruido(seed + 800, 1) * 200);

      // UV máximo aproximado por mes (41°S, cielo despejado)
      const uvMaxMes = [11, 10, 7, 4, 2, 1.5, 1.5, 2, 4, 6, 9, 11][mes - 1];

      let code;
      if (precipDia < 0.5) {
        code = n1 > 0.3 ? 1 : (n1 > -0.3 ? 2 : 3);
      } else if (precipDia < 3) {
        code = 51;
      } else if (precipDia < 10) {
        code = t_min < 1 ? 71 : 61;
      } else {
        code = t_min < 1 ? 73 : 63;
      }

      // Nubosidad aproximada por código
      const cloudBase = [0, 20, 50, 90, 60, 80, 95, 90, 100, 85, 100][
        code === 0 ? 0 : code <= 2 ? code : code <= 3 ? 3 : code <= 48 ? 4 :
        code <= 55 ? 5 : code <= 67 ? 6 : code <= 77 ? 7 : code <= 82 ? 8 :
        code <= 86 ? 9 : 10
      ] || 50;

      // Precipitación: probabilidad estimada
      const precipProb = precipDia > 0.5 ? Math.min(95, Math.round(30 + precipDia * 8)) :
                         (n3 > 0.4 ? 25 : 10);

      daily.push({
        fecha: fecha.toISOString().slice(0, 10),
        t_max: Math.round(t_max * 10) / 10,
        t_min: Math.round(t_min * 10) / 10,
        precip: Math.round(precipDia * 10) / 10,
        precipProb,
        viento_max: Math.round(vientoMax),
        racha_max: Math.round(rachaMax),
        uv_max: uvMaxMes,
        code,
        cotaNieve
      });

      const dirBase = 240 + ruido(seed + 600, 1) * 80;

      for (let h = 0; h < 24; h++) {
        const bell = 0.5 - 0.5 * Math.cos(2 * Math.PI * (h - 3) / 24);
        const hSeed = seed * 24 + h;
        const hNoise = ruido(hSeed, 1) * 1.2;
        const temp = t_min + (t_max - t_min) * bell + hNoise;
        const sens = temp - vientoMax * 0.06;
        const hum = Math.round(58 + (1 - bell) * 32 + ruido(hSeed + 200, 1) * 5);
        const dew = Math.round((temp - (100 - hum) / 5) * 10) / 10;
        const precipH = precipDia > 1
          ? (ruido(hSeed + 300, 1) > 0 ? precipDia / 8 : 0)
          : 0;
        const viento = vientoMax * (0.5 + 0.6 * bell);
        const racha = viento * 1.35;
        const presion = 1014 + ruido(hSeed + 400, 1) * 6;
        const vientoDir = ((dirBase + ruido(hSeed + 700, 1) * 60) % 360 + 360) % 360;
        const cotaH = Math.round(altValle + Math.max(0, temp) / 0.0065 + ruido(hSeed + 900, 1) * 150);

        // UV horario: campana entre 7h y 19h
        const uvHora = uvMaxMes * Math.max(0, Math.sin(Math.PI * (h - 6) / 12)) * (1 - cloudBase / 150);

        // Visibilidad: reducida con niebla/lluvia
        let vis = 30000;
        if (code >= 45 && code <= 48) vis = 800;
        else if (precipH > 0) vis = 12000;
        else if (cloudBase > 70) vis = 22000;

        const dt = new Date(fecha);
        dt.setHours(h);
        const tStr = dt.getFullYear() + '-' +
          String(dt.getMonth() + 1).padStart(2, '0') + '-' +
          String(dt.getDate()).padStart(2, '0') + 'T' +
          String(dt.getHours()).padStart(2, '0') + ':00';

        hourly.push({
          t: tStr,
          temp: Math.round(temp * 10) / 10,
          sens: Math.round(sens * 10) / 10,
          hum,
          dew,
          precip: Math.round(precipH * 10) / 10,
          precipProb: precipH > 0 ? Math.min(95, Math.round(precipProb + ruido(hSeed + 350, 1) * 10)) : Math.round(precipProb * 0.6),
          cloud: cloudBase,
          vis,
          viento: Math.round(viento),
          vientoDir: Math.round(vientoDir),
          racha: Math.round(racha),
          presion: Math.round(presion),
          code,
          uv: Math.round(Math.max(0, uvHora) * 10) / 10,
          cotaNieve: cotaH
        });
      }
    }

    return {
      id: 'forecast_' + puntoKey,
      punto: puntoKey,
      actualizado: Date.now(),
      timezone: 'America/Argentina/Salta',
      fuente: 'generado-local',
      hourly,
      daily
    };
  }

  async function generarYGuardarTodos(baseline, puntos) {
    for (const p of puntos) {
      const f = generar(baseline, p, 7);
      await Storage.put('forecast', f);
    }
  }

  return { generar, generarYGuardarTodos };
})();