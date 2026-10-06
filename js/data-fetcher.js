const DataFetcher = (() => {
  const PUNTOS = {
    centro:        { lat: -41.96, lon: -71.53, alt: 300 },
    mallin_ahogado:{ lat: -41.90, lon: -71.55, alt: 380 },
    lago_puelo:    { lat: -42.05, lon: -71.61, alt: 220 }
  };

  function buildForecastURL(lat, lon) {
    const p = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      hourly: [
        'temperature_2m', 'relative_humidity_2m', 'dew_point_2m',
        'apparent_temperature', 'precipitation', 'precipitation_probability',
        'cloud_cover', 'visibility', 'wind_speed_10m', 'wind_direction_10m',
        'wind_gusts_10m', 'pressure_msl', 'weather_code',
        'uv_index', 'freezing_level_height'
      ].join(','),
      daily: [
        'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
        'precipitation_probability_max', 'wind_speed_10m_max',
        'wind_gusts_10m_max', 'uv_index_max', 'weather_code'
      ].join(','),
      timezone: 'America/Argentina/Salta',
      forecast_days: '7'
    });
    return `https://api.open-meteo.com/v1/forecast?${p}`;
  }

  function buildArchiveURL(lat, lon, startDate, endDate) {
    const p = new URLSearchParams({
      latitude: lat, longitude: lon,
      start_date: startDate, end_date: endDate,
      daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum',
      timezone: 'America/Argentina/Salta'
    });
    return `https://archive-api.open-meteo.com/v1/archive?${p}`;
  }

  function wmoToIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌧️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌡️';
  }

  function wmoToDesc(code) {
    const m = {
      0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',
      45:'Niebla',48:'Niebla con escarcha',
      51:'Llovizna débil',53:'Llovizna',55:'Llovizna intensa',
      61:'Lluvia débil',63:'Lluvia',65:'Lluvia fuerte',
      71:'Nieve débil',73:'Nieve',75:'Nieve fuerte',
      80:'Chaparrones',81:'Chaparrones fuertes',82:'Chaparrones torrenciales',
      95:'Tormenta',96:'Tormenta con granizo',99:'Tormenta fuerte'
    };
    return m[code] || 'Variable';
  }

  function gradosADireccion(deg) {
    if (deg === null || deg === undefined || isNaN(deg)) return '—';
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return dirs[idx];
  }

  function gradosAFlecha(deg) {
    if (deg === null || deg === undefined || isNaN(deg)) return '';
    const flechas = ['↓','↙','←','↖','↑','↗','→','↘'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return flechas[idx];
  }

  function cotaNieveDesc(m) {
    if (m == null) return '';
    if (m < 700)  return 'nieve en el valle';
    if (m < 1300) return 'nieve en cerros bajos';
    if (m < 1800) return 'nieve en cerros medios';
    if (m < 2400) return 'nieve solo en altura';
    return 'sin nieve en la zona';
  }

  // Fase lunar — cálculo offline (sin API)
  function moonPhaseInfo(date) {
    const newMoon = Date.UTC(2000, 0, 6, 18, 14);
    const synodic = 29.530588853;
    const days = (date.getTime() - newMoon) / 86400000;
    const p = ((days % synodic) + synodic) % synodic / synodic; // 0..1
    const pct = Math.round(p * 100);
    if (p < 0.03 || p >= 0.97) return { icon: '🌑', nombre: 'Luna nueva', pct };
    if (p < 0.22) return { icon: '🌒', nombre: 'Creciente', pct };
    if (p < 0.28) return { icon: '🌓', nombre: 'Cuarto creciente', pct };
    if (p < 0.47) return { icon: '🌔', nombre: 'Gibosa creciente', pct };
    if (p < 0.53) return { icon: '🌕', nombre: 'Luna llena', pct };
    if (p < 0.72) return { icon: '🌖', nombre: 'Gibosa menguante', pct };
    if (p < 0.78) return { icon: '🌗', nombre: 'Cuarto menguante', pct };
    return { icon: '🌘', nombre: 'Menguante', pct };
  }

  async function fetchForecast(puntoKey = 'centro') {
    const p = PUNTOS[puntoKey];
    const url = buildForecastURL(p.lat, p.lon);
    const r = await fetch(url);
    if (!r.ok) throw new Error('Error de red');
    const j = await r.json();
    return normalizeForecast(j, puntoKey);
  }

  function normalizeForecast(j, puntoKey) {
    const h = j.hourly;
    const d = j.daily;
    const hourly = h.time.map((t, i) => ({
      t,
      temp: h.temperature_2m[i],
      sens: h.apparent_temperature[i],
      hum: h.relative_humidity_2m[i],
      dew: h.dew_point_2m ? h.dew_point_2m[i] : null,
      precip: h.precipitation[i],
      precipProb: h.precipitation_probability ? h.precipitation_probability[i] : null,
      cloud: h.cloud_cover ? h.cloud_cover[i] : null,
      vis: h.visibility ? h.visibility[i] : null,
      viento: h.wind_speed_10m[i],
      vientoDir: h.wind_direction_10m ? h.wind_direction_10m[i] : null,
      racha: h.wind_gusts_10m[i],
      presion: h.pressure_msl[i],
      code: h.weather_code[i],
      uv: h.uv_index ? h.uv_index[i] : null,
      cotaNieve: h.freezing_level_height ? h.freezing_level_height[i] : null
    }));
    const daily = d.time.map((t, i) => {
      const horasDia = hourly.filter(x => x.t.startsWith(t));
      const cotas = horasDia.map(x => x.cotaNieve).filter(v => v != null);
      const cotaMedia = cotas.length ? Math.round(cotas.reduce((a,b) => a+b, 0) / cotas.length) : null;
      return {
        fecha: t,
        t_max: d.temperature_2m_max[i],
        t_min: d.temperature_2m_min[i],
        precip: d.precipitation_sum[i],
        precipProb: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
        viento_max: d.wind_speed_10m_max[i],
        racha_max: d.wind_gusts_10m_max[i],
        uv_max: d.uv_index_max ? d.uv_index_max[i] : null,
        code: d.weather_code[i],
        cotaNieve: cotaMedia
      };
    });
    return {
      id: 'forecast_' + puntoKey,
      punto: puntoKey,
      actualizado: Date.now(),
      timezone: j.timezone,
      hourly, daily
    };
  }

  async function actualizarTodo() {
    const results = {};
    for (const k of Object.keys(PUNTOS)) {
      try {
        const f = await fetchForecast(k);
        await Storage.put('forecast', f);
        results[k] = 'ok';
      } catch (e) {
        results[k] = 'error';
      }
    }
    Storage.prefs.set('ultima_actualizacion', Date.now());
    return results;
  }

  return {
    fetchForecast, actualizarTodo,
    wmoToIcon, wmoToDesc, gradosADireccion, gradosAFlecha,
    cotaNieveDesc, moonPhaseInfo,
    PUNTOS
  };
})();